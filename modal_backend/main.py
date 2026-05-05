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
    .apt_install("libgl1-mesa-glx", "libglib2.0-0", "libgomp1")
    .pip_install(
        "torch",
        "torchvision",
        "opencv-python",
        "segment-anything",
        "rembg[gpu]",
        "paddlepaddle-gpu",
        "paddleocr",
        "fastapi[standard]",
        "python-multipart",
        "numpy",
        "Pillow",
        "requests",
        "onnxruntime-gpu",
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
        from paddleocr import PaddleOCR
        import requests

        self.device = "cuda" if torch.cuda.is_available() else "cpu"

        # SAM 모델 다운로드 (캐시)
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

        # SAM 파라미터 최적화: points 줄여서 속도 향상, 임계값 조정
        self.mask_generator = SamAutomaticMaskGenerator(
            sam,
            points_per_side=16,           # 24 → 16 (4배 빠름)
            pred_iou_thresh=0.88,          # 품질 낮은 마스크 더 필터링
            stability_score_thresh=0.90,   # 안정성 기준 높임
            crop_n_layers=0,
            min_mask_region_area=1200,     # 너무 작은 조각 제거
        )

        # PaddleOCR: EasyOCR 대비 한글 정확도 높음
        self.ocr_reader = PaddleOCR(
            use_angle_cls=True,
            lang="korean",
            use_gpu=self.device == "cuda",
            show_log=False,
            det_model_dir=f"{CACHE_DIR}/paddleocr/det",
            rec_model_dir=f"{CACHE_DIR}/paddleocr/rec",
            cls_model_dir=f"{CACHE_DIR}/paddleocr/cls",
        )

        print("Models loaded successfully!")

    @modal.method()
    async def extract_logic(self, contents: bytes, mode: str = "object-extract"):
        import numpy as np
        from PIL import Image
        import cv2
        import base64
        import io
        from rembg import remove as rembg_remove

        def encode_pil(img, fmt="WEBP", quality=85):
            buffer = io.BytesIO()
            if fmt == "WEBP":
                img.save(buffer, format="WEBP", quality=quality, method=4)
                mime = "image/webp"
            elif fmt == "PNG":
                img.save(buffer, format="PNG", optimize=True)
                mime = "image/png"
            else:
                img.save(buffer, format=fmt)
                mime = f"image/{fmt.lower()}"
            return f"data:{mime};base64,{base64.b64encode(buffer.getvalue()).decode()}"

        def encode_rgba_png(rgba_np):
            """투명도가 있는 이미지는 반드시 PNG (WebP alpha 호환성 이슈 방지)"""
            pil = Image.fromarray(rgba_np)
            buffer = io.BytesIO()
            pil.save(buffer, format="PNG", optimize=True)
            return f"data:image/png;base64,{base64.b64encode(buffer.getvalue()).decode()}"

        def bbox_from_paddle_points(points):
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

        # ── bg-remove: rembg 사용 (SAM보다 훨씬 정확하고 빠름) ──
        if mode == "bg-remove":
            result_pil = rembg_remove(image_pil)  # RGBA 반환
            return {
                "version": 2,
                "mode": mode,
                "width": w,
                "height": h,
                "background": None,
                "elements": [{
                    "id": "subject_1",
                    "type": "image",
                    "image": encode_pil(result_pil, "PNG"),
                    "left": 0,
                    "top": 0,
                    "width": w,
                    "height": h,
                    "name": "피사체"
                }]
            }

        # ── object-extract ──
        layers = []
        removal_mask = np.zeros((h, w), dtype=np.uint8)

        # 1. PaddleOCR 텍스트 추출
        ocr_result = self.ocr_reader.ocr(image_np, cls=True)
        if ocr_result and ocr_result[0]:
            for index, line in enumerate(ocr_result[0]):
                points, (text, confidence) = line[0], line[1]
                # 신뢰도 기준 50%로 상향 (EasyOCR은 35%였음)
                if confidence < 0.50 or not text.strip():
                    continue
                x1, y1, x2, y2 = bbox_from_paddle_points(points)
                bw = max(1, x2 - x1)
                bh = max(1, y2 - y1)
                if bw * bh < 100:
                    continue

                text_mask = np.zeros((h, w), dtype=np.uint8)
                cv2.fillPoly(text_mask, [np.array(points, dtype=np.int32)], 255)
                removal_mask = cv2.dilate(
                    cv2.bitwise_or(removal_mask, text_mask),
                    np.ones((5, 5), np.uint8), iterations=1
                )

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

        # 2. 도형 추출 (Canny 임계값 상향으로 노이즈 감소)
        gray = cv2.cvtColor(image_np, cv2.COLOR_RGB2GRAY)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)     # 블러 먼저 적용해서 노이즈 제거
        edges = cv2.Canny(blurred, 60, 180)              # 40,120 → 60,180 (거짓양성 감소)
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        shape_count = 0
        occupied = removal_mask.copy()
        for contour in contours:
            area = cv2.contourArea(contour)
            if area < full_area * 0.003 or area > full_area * 0.50:
                continue
            x, y, bw, bh = cv2.boundingRect(contour)
            if bw < 30 or bh < 30:
                continue
            contour_mask = np.zeros((h, w), dtype=np.uint8)
            cv2.drawContours(contour_mask, [contour], -1, 255, -1)
            overlap = cv2.countNonZero(cv2.bitwise_and(contour_mask, occupied)) / max(1, cv2.countNonZero(contour_mask))
            if overlap > 0.20:
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
            removal_mask = cv2.bitwise_or(
                removal_mask,
                cv2.dilate(contour_mask, np.ones((5, 5), np.uint8), iterations=1)
            )
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

        # 3. SAM으로 복잡한 이미지 요소 추출
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
            if overlap > 0.30:
                continue

            x, y, bw, bh = [int(v) for v in item["bbox"]]
            if bw < 30 or bh < 30:
                continue

            alpha = cv2.GaussianBlur(mask_uint8, (5, 5), 0)  # 7,7 → 5,5 (경계 과도한 블러 감소)
            crop_rgb = image_np[y:y + bh, x:x + bw]
            crop_alpha = alpha[y:y + bh, x:x + bw]
            rgba = cv2.cvtColor(crop_rgb, cv2.COLOR_RGB2RGBA)
            rgba[:, :, 3] = crop_alpha

            image_count += 1
            used_mask = cv2.bitwise_or(used_mask, mask_uint8)
            removal_mask = cv2.bitwise_or(
                removal_mask,
                cv2.dilate(mask_uint8, np.ones((5, 5), np.uint8), iterations=1)  # 9,9 → 5,5
            )
            layers.append({
                "id": f"image_{image_count}",
                "type": "image",
                "image": encode_rgba_png(rgba),
                "left": x,
                "top": y,
                "width": bw,
                "height": bh,
                "name": "이미지 요소"
            })
            if image_count >= 20:
                break

        # z-index 정렬: 넓이 큰 것(배경에 가까운 것)이 아래로
        layers.sort(key=lambda item: (
            {"rect": 0, "circle": 0, "image": 1, "text": 2}.get(item["type"], 1),
            -(item["width"] * item["height"])  # 같은 타입 내에서 큰 것이 아래
        ))

        # 배경 복원: 추출된 객체 영역을 inpaint로 지워서 빈 배경 생성
        # 이렇게 해야 "뒤에 원본이 그대로 있어 보이는" 문제가 해결됨
        if cv2.countNonZero(removal_mask) > 0:
            bg_np = cv2.inpaint(image_np, removal_mask, inpaintRadius=7, flags=cv2.INPAINT_TELEA)
            background_pil = Image.fromarray(bg_np)
        else:
            background_pil = image_pil

        return {
            "version": 2,
            "mode": mode,
            "width": w,
            "height": h,
            "background": encode_pil(background_pil, "WEBP", quality=80),
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
