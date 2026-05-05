import modal
import io
import os
from fastapi import Response, UploadFile, File, FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = modal.App("cardnews-ai-backend-v2")

web_app = FastAPI()

web_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

image = (
    modal.Image.debian_slim(python_version="3.10")
    .apt_install("libgl1-mesa-glx", "libglib2.0-0")
    .pip_install(
        "torch",
        "torchvision",
        "opencv-python",
        "segment-anything",
        "easyocr",
        "fastapi[standard]",
        "python-multipart",
        "numpy",
        "Pillow",
        "requests"
    )
)

volume = modal.Volume.from_name("ai-models-cache", create_if_missing=True)
CACHE_DIR = "/cache"

@app.cls(
    gpu="t4",
    image=image,
    volumes={CACHE_DIR: volume},
    timeout=600
)
class ImageProcessor:
    @modal.enter()
    def setup(self):
        import torch
        from segment_anything import SamAutomaticMaskGenerator, SamPredictor, sam_model_registry
        import easyocr
        import requests

        self.device = "cuda" if torch.cuda.is_available() else "cpu"

        sam_checkpoint = f"{CACHE_DIR}/sam_vit_b_01ec64.pth"
        if not os.path.exists(sam_checkpoint):
            print("Downloading SAM checkpoint...")
            url = "https://dl.fbaipublicfiles.com/segment_anything/sam_vit_b_01ec64.pth"
            r = requests.get(url, timeout=120)
            r.raise_for_status()
            with open(sam_checkpoint, "wb") as f:
                f.write(r.content)
            volume.commit()

        sam = sam_model_registry["vit_b"](checkpoint=sam_checkpoint)
        sam.to(device=self.device)
        self.predictor = SamPredictor(sam)
        self.mask_generator = SamAutomaticMaskGenerator(
            sam,
            points_per_side=24,
            pred_iou_thresh=0.86,
            stability_score_thresh=0.88,
            crop_n_layers=0,
            min_mask_region_area=900,
        )
        self.ocr_reader = easyocr.Reader(
            ["ko", "en"],
            gpu=self.device == "cuda",
            model_storage_directory=f"{CACHE_DIR}/easyocr",
            user_network_directory=f"{CACHE_DIR}/easyocr",
        )
        
        print("Models loaded successfully!")

    @modal.method()
    async def extract_logic(self, contents: bytes, mode: str = "object-extract"):
        import numpy as np
        from PIL import Image
        import cv2
        import base64
        import io

        def encode_pil(img, fmt="PNG"):
            buffer = io.BytesIO()
            img.save(buffer, format=fmt)
            mime = "image/png" if fmt == "PNG" else "image/jpeg"
            return f"data:{mime};base64,{base64.b64encode(buffer.getvalue()).decode()}"

        def bbox_from_points(points):
            xs = [p[0] for p in points]
            ys = [p[1] for p in points]
            return int(min(xs)), int(min(ys)), int(max(xs)), int(max(ys))

        def median_color(img_np, mask):
            pixels = img_np[mask > 0]
            if len(pixels) == 0:
                return "#111827"
            color = np.median(pixels, axis=0).astype(int)
            return f"#{color[0]:02x}{color[1]:02x}{color[2]:02x}"

        image_pil = Image.open(io.BytesIO(contents)).convert("RGB")
        image_np = np.array(image_pil)
        h, w = image_np.shape[:2]
        full_area = w * h

        if mode == "bg-remove":
            self.predictor.set_image(image_np)
            input_point = np.array([[w // 2, h // 2]])
            input_label = np.array([1])
            masks, scores, _ = self.predictor.predict(
                point_coords=input_point,
                point_labels=input_label,
                multimask_output=True,
            )
            mask_uint8 = (masks[np.argmax(scores)] * 255).astype(np.uint8)
            rgba = cv2.cvtColor(image_np, cv2.COLOR_RGB2RGBA)
            rgba[:, :, 3] = mask_uint8
            return {
                "version": 2,
                "mode": mode,
                "width": w,
                "height": h,
                "background": None,
                "elements": [{
                    "id": "subject_1",
                    "type": "image",
                    "image": encode_pil(Image.fromarray(rgba), "PNG"),
                    "left": 0,
                    "top": 0,
                    "width": w,
                    "height": h,
                    "name": "피사체"
                }]
            }

        layers = []
        removal_mask = np.zeros((h, w), dtype=np.uint8)

        # 1. OCR text layers become real Fabric textboxes.
        ocr_results = self.ocr_reader.readtext(image_np, detail=1, paragraph=False)
        for index, (points, text, confidence) in enumerate(ocr_results):
            if confidence < 0.35 or not text.strip():
                continue
            x1, y1, x2, y2 = bbox_from_points(points)
            bw = max(1, x2 - x1)
            bh = max(1, y2 - y1)
            if bw * bh < 80:
                continue

            text_mask = np.zeros((h, w), dtype=np.uint8)
            cv2.fillPoly(text_mask, [np.array(points, dtype=np.int32)], 255)
            removal_mask = cv2.dilate(cv2.bitwise_or(removal_mask, text_mask), np.ones((5, 5), np.uint8), iterations=1)

            layers.append({
                "id": f"text_{index + 1}",
                "type": "text",
                "text": text.strip(),
                "left": x1,
                "top": y1,
                "width": bw,
                "height": bh,
                "fontSize": max(12, int(bh * 0.78)),
                "fill": median_color(image_np, text_mask),
                "fontWeight": "bold" if bh > 42 else "normal",
                "textAlign": "center",
                "name": "텍스트"
            })

        # 2. Simple vector-like filled shapes are returned as Fabric shapes.
        gray = cv2.cvtColor(image_np, cv2.COLOR_RGB2GRAY)
        edges = cv2.Canny(gray, 40, 120)
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        shape_count = 0
        occupied = removal_mask.copy()
        for contour in contours:
            area = cv2.contourArea(contour)
            if area < full_area * 0.002 or area > full_area * 0.55:
                continue
            x, y, bw, bh = cv2.boundingRect(contour)
            if bw < 24 or bh < 24:
                continue
            contour_mask = np.zeros((h, w), dtype=np.uint8)
            cv2.drawContours(contour_mask, [contour], -1, 255, -1)
            overlap = cv2.countNonZero(cv2.bitwise_and(contour_mask, occupied)) / max(1, cv2.countNonZero(contour_mask))
            if overlap > 0.25:
                continue

            approx = cv2.approxPolyDP(contour, 0.03 * cv2.arcLength(contour, True), True)
            fill = median_color(image_np, contour_mask)
            shape_type = None
            if len(approx) == 4:
                shape_type = "rect"
            else:
                perimeter = cv2.arcLength(contour, True)
                circularity = 4 * np.pi * area / max(1, perimeter * perimeter)
                if circularity > 0.72 and abs(bw - bh) / max(bw, bh) < 0.25:
                    shape_type = "circle"

            if not shape_type:
                continue

            shape_count += 1
            occupied = cv2.bitwise_or(occupied, contour_mask)
            removal_mask = cv2.bitwise_or(removal_mask, cv2.dilate(contour_mask, np.ones((5, 5), np.uint8), iterations=1))
            layers.append({
                "id": f"shape_{shape_count}",
                "type": shape_type,
                "left": int(x),
                "top": int(y),
                "width": int(bw),
                "height": int(bh),
                "fill": fill,
                "opacity": 1,
                "name": "도형"
            })

        # 3. Complex visual elements become transparent image layers.
        sam_masks = self.mask_generator.generate(image_np)
        sam_masks = sorted(sam_masks, key=lambda item: item["area"], reverse=True)
        used_mask = occupied.copy()
        image_count = 0
        for item in sam_masks:
            area = int(item["area"])
            if area < full_area * 0.004 or area > full_area * 0.55:
                continue
            mask_uint8 = item["segmentation"].astype(np.uint8) * 255
            overlap = cv2.countNonZero(cv2.bitwise_and(mask_uint8, used_mask)) / max(1, cv2.countNonZero(mask_uint8))
            if overlap > 0.35:
                continue

            x, y, bw, bh = [int(v) for v in item["bbox"]]
            if bw < 24 or bh < 24:
                continue

            # 테두리를 더 부드럽게 처리하기 위해 블러 크기 조정 및 마스크 임계값 적용
            alpha = cv2.GaussianBlur(mask_uint8, (7, 7), 0)
            
            # 원본에서 직접 크롭
            crop_rgb = image_np[y:y + bh, x:x + bw]
            crop_alpha = alpha[y:y + bh, x:x + bw]
            
            # 투명도 적용된 RGBA 생성
            rgba = cv2.cvtColor(crop_rgb, cv2.COLOR_RGB2RGBA)
            rgba[:, :, 3] = crop_alpha

            image_count += 1
            used_mask = cv2.bitwise_or(used_mask, mask_uint8)
            # 제거 마스크는 조금 더 넓게 잡아 배경 복원 시 유리하게 함
            removal_mask = cv2.bitwise_or(removal_mask, cv2.dilate(mask_uint8, np.ones((9, 9), np.uint8), iterations=1))
            layers.append({
                "id": f"image_{image_count}",
                "type": "image",
                "image": encode_pil(Image.fromarray(rgba), "PNG"),
                "left": x,
                "top": y,
                "width": bw,
                "height": bh,
                "name": "이미지 요소"
            })
            if image_count >= 24:
                break

        layers.sort(key=lambda item: {"rect": 1, "circle": 1, "image": 2, "text": 3}.get(item["type"], 2))
        return {
            "version": 2,
            "mode": mode,
            "width": w,
            "height": h,
            "background": encode_pil(image_pil, "PNG"),
            "elements": layers,
            "stats": {
                "texts": len([x for x in layers if x["type"] == "text"]),
                "shapes": len([x for x in layers if x["type"] in ("rect", "circle")]),
                "images": len([x for x in layers if x["type"] == "image"]),
            }
        }

@web_app.post("/extract")
async def extract(file: UploadFile = File(...), mode: str = "object-extract"):
    contents = await file.read()
    processor = ImageProcessor()
    return await processor.extract_logic.remote.aio(contents, mode)

@web_app.get("/")
def status():
    return Response(
        content="""
        <html>
            <head>
                <title>Design Studio AI Backend</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0f172a; color: white; }
                    .card { background: #1e293b; padding: 2rem; border-radius: 1rem; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3); text-align: center; border: 1px solid #334155; }
                    h1 { margin: 0; color: #38bdf8; }
                    p { color: #94a3b8; margin-top: 0.5rem; }
                    .status { display: inline-block; margin-top: 1rem; padding: 0.25rem 0.75rem; background: #065f46; color: #34d399; border-radius: 9999px; font-size: 0.875rem; font-weight: bold; }
                </style>
            </head>
            <body>
                <div class="card">
                    <h1>✨ AI Backend Active</h1>
                    <p>This is an API endpoint for Design Studio Pro.</p>
                    <div class="status">● Running on T4 GPU</div>
                </div>
            </body>
        </html>
        """,
        media_type="text/html"
    )

@app.function(image=image, volumes={CACHE_DIR: volume})
@modal.asgi_app()
def fastapi_app():
    return web_app
