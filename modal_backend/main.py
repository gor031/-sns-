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
    .apt_install("libgl1-mesa-glx", "libglib2.0-0", "libgomp1", "git")
    .pip_install(
        "torch", "torchvision",
        "transformers>=4.40.0",  # Grounding DINO
        "accelerate",
        "easyocr",
        "rembg", "onnxruntime",
        "fastapi[standard]", "python-multipart",
        "numpy", "Pillow", "requests",
    )
    # SAM 2
    .pip_install("git+https://github.com/facebookresearch/sam2.git")
    # opencv headless로 통일 (easyocr 충돌 방지)
    .run_commands("pip install opencv-python-headless --force-reinstall --quiet")
)

volume = modal.Volume.from_name("ai-models-cache", create_if_missing=True)
CACHE_DIR = "/cache"


@app.cls(
    gpu="t4",
    image=image,
    volumes={CACHE_DIR: volume},
    timeout=600,
)
class ImageProcessor:
    @modal.enter()
    def setup(self):
        import torch
        import easyocr

        # HuggingFace 모델 캐시 경로 설정
        os.environ["HF_HOME"] = f"{CACHE_DIR}/huggingface"
        os.environ["TRANSFORMERS_CACHE"] = f"{CACHE_DIR}/huggingface"

        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"Device: {self.device}")

        # ── Grounding DINO (transformers 경유, 별도 빌드 불필요) ──
        from transformers import AutoProcessor, AutoModelForZeroShotObjectDetection
        print("Loading Grounding DINO...")
        self.dino_processor = AutoProcessor.from_pretrained("IDEA-Research/grounding-dino-base")
        self.dino_model = AutoModelForZeroShotObjectDetection.from_pretrained(
            "IDEA-Research/grounding-dino-base"
        ).to(self.device)
        self.dino_model.eval()

        # ── SAM 2 (box prompt + 자동 마스크) ──
        from sam2.sam2_image_predictor import SAM2ImagePredictor
        from sam2.automatic_mask_generator import SAM2AutomaticMaskGenerator
        print("Loading SAM 2...")
        self.sam2 = SAM2ImagePredictor.from_pretrained("facebook/sam2.1-hiera-small")
        # 같은 모델 재활용 → 메모리 추가 없음
        self.sam2_auto = SAM2AutomaticMaskGenerator(
            self.sam2.model,
            points_per_side=16,       # 256 포인트 (32²=1024 대비 4배 빠름)
            pred_iou_thresh=0.82,
            stability_score_thresh=0.90,
            box_nms_thresh=0.7,
            min_mask_region_area=500,
        )

        # ── EasyOCR (텍스트 레이어) ──
        print("Loading EasyOCR...")
        self.ocr_reader = easyocr.Reader(
            ["ko", "en"],
            gpu=self.device == "cuda",
            model_storage_directory=f"{CACHE_DIR}/easyocr",
        )

        print("All models loaded!")

    @modal.method()
    async def extract_logic(self, contents: bytes, mode: str = "object-extract"):
        import numpy as np
        from PIL import Image
        import cv2
        import base64
        import io
        import torch
        from rembg import remove as rembg_remove

        # ── 유틸 ──
        def encode_pil(img, fmt="WEBP", quality=85):
            buf = io.BytesIO()
            if fmt == "WEBP":
                img.save(buf, format="WEBP", quality=quality, method=4)
                mime = "image/webp"
            else:
                img.save(buf, format="PNG", optimize=True)
                mime = "image/png"
            return f"data:{mime};base64,{base64.b64encode(buf.getvalue()).decode()}"

        def encode_rgba_png(rgba_np):
            buf = io.BytesIO()
            Image.fromarray(rgba_np).save(buf, format="PNG", optimize=True)
            return f"data:image/png;base64,{base64.b64encode(buf.getvalue()).decode()}"

        def bbox_from_points(points):
            xs, ys = [p[0] for p in points], [p[1] for p in points]
            return int(min(xs)), int(min(ys)), int(max(xs)), int(max(ys))

        def median_color(img_np, mask):
            pixels = img_np[mask > 0]
            if len(pixels) == 0:
                return "#111827"
            c = np.median(pixels, axis=0).astype(int)
            return f"#{c[0]:02x}{c[1]:02x}{c[2]:02x}"

        def mask_iou(m1, m2):
            inter = np.logical_and(m1, m2).sum()
            union = np.logical_or(m1, m2).sum()
            return inter / max(union, 1)

        def mask_overlap(m1, m2):
            inter = np.logical_and(m1, m2).sum()
            return inter / max(min(m1.sum(), m2.sum()), 1)

        def mask_bbox(mask_bool, pad=2):
            ys, xs = np.where(mask_bool)
            if len(xs) == 0 or len(ys) == 0:
                return None
            return (
                max(0, int(xs.min()) - pad),
                max(0, int(ys.min()) - pad),
                min(w, int(xs.max()) + 1 + pad),
                min(h, int(ys.max()) + 1 + pad),
            )

        def is_duplicate_mask(mask_bool, previous_masks):
            for prev in previous_masks:
                if mask_iou(mask_bool, prev) > 0.35 or mask_overlap(mask_bool, prev) > 0.82:
                    return True
            return False

        def looks_like_background_mask(mask_bool, bbox, area):
            x1, y1, x2, y2 = bbox
            bw, bh = max(1, x2 - x1), max(1, y2 - y1)
            bbox_area = bw * bh
            touches_edges = sum([x1 <= 2, y1 <= 2, x2 >= w - 2, y2 >= h - 2])
            fill_ratio = area / max(bbox_area, 1)
            # Large edge-touching sheets are usually backgrounds or broad regions, not editable objects.
            return area > full_area * 0.35 and touches_edges >= 2 and fill_ratio > 0.45

        def looks_like_noise_or_line(mask_bool, bbox, area):
            x1, y1, x2, y2 = bbox
            bw, bh = max(1, x2 - x1), max(1, y2 - y1)
            bbox_area = bw * bh
            fill_ratio = area / max(bbox_area, 1)
            long_side = max(bw, bh)
            short_side = min(bw, bh)
            aspect = long_side / max(short_side, 1)

            # SAM often returns anti-aliased edges, hairlines, text-shadow crumbs, or border fragments.
            if area < full_area * 0.0015 and (fill_ratio < 0.28 or aspect > 8):
                return True
            if short_side <= 5 and long_side > 24:
                return True
            if aspect > 14 and fill_ratio < 0.55:
                return True
            return False

        def rgb_luma(rgb):
            return 0.2126 * int(rgb[0]) + 0.7152 * int(rgb[1]) + 0.0722 * int(rgb[2])

        def rgba_from_rgb(rgb, alpha=0.45):
            r, g, b = [int(x) for x in rgb]
            return f"rgba({r},{g},{b},{alpha:.2f})"

        def detect_text_shadow(text_mask, bbox, font_size):
            x1, y1, x2, y2 = bbox
            shadow_pad = max(4, min(28, int(font_size * 0.55)))
            kernel = np.ones((shadow_pad, shadow_pad), np.uint8)
            outer = cv2.dilate(text_mask, kernel)
            inner = cv2.dilate(text_mask, np.ones((3, 3), np.uint8))
            ring = cv2.subtract(outer, inner)

            # Bias toward the common lower/right shadow area, but still allow centered glow.
            roi = np.zeros((h, w), dtype=np.uint8)
            roi[
                max(0, y1 - shadow_pad):min(h, y2 + shadow_pad),
                max(0, x1 - shadow_pad):min(w, x2 + shadow_pad)
            ] = 255
            ring = cv2.bitwise_and(ring, roi)

            ring_pixels = image_np[ring > 0]
            text_pixels = image_np[text_mask > 0]
            if len(ring_pixels) < 20 or len(text_pixels) < 20:
                return None, outer

            shadow_rgb = np.median(ring_pixels, axis=0).astype(int)
            text_rgb = np.median(text_pixels, axis=0).astype(int)
            contrast = abs(rgb_luma(shadow_rgb) - rgb_luma(text_rgb))
            if contrast < 18:
                return None, outer

            return {
                "color": rgba_from_rgb(shadow_rgb, 0.42),
                "blur": max(2, int(font_size * 0.12)),
                "offsetX": max(1, int(font_size * 0.06)),
                "offsetY": max(1, int(font_size * 0.08)),
            }, outer

        # ── 이미지 로드 ──
        image_pil = Image.open(io.BytesIO(contents)).convert("RGB")
        image_np = np.array(image_pil)
        h, w = image_np.shape[:2]
        full_area = w * h

        # ══════════════════════════════════════════
        # bg-remove: rembg (U2Net 기반, 빠르고 정확)
        # ══════════════════════════════════════════
        if mode == "bg-remove":
            result_pil = rembg_remove(image_pil)
            return {
                "version": 2, "mode": mode, "width": w, "height": h,
                "background": None,
                "elements": [{
                    "id": "subject_1", "type": "image",
                    "image": encode_pil(result_pil, "PNG"),
                    "left": 0, "top": 0, "width": w, "height": h,
                    "name": "피사체"
                }]
            }

        # ══════════════════════════════════════════
        # object-extract
        # 흐름: EasyOCR → Grounding DINO → SAM 2 → 원본픽셀 crop
        # ══════════════════════════════════════════
        layers = []
        removal_mask = np.zeros((h, w), dtype=np.uint8)
        used_masks = []  # IoU 중복 체크용

        # ── Step 1: EasyOCR 텍스트 추출 ──
        ocr_results = self.ocr_reader.readtext(image_np, detail=1, paragraph=False)
        for idx, (points, text, confidence) in enumerate(ocr_results):
            if confidence < 0.50 or not text.strip():
                continue
            x1, y1, x2, y2 = bbox_from_points(points)
            bw, bh = max(1, x2 - x1), max(1, y2 - y1)
            if bw * bh < 100:
                continue

            text_mask = np.zeros((h, w), dtype=np.uint8)
            cv2.fillPoly(text_mask, [np.array(points, dtype=np.int32)], 255)
            font_size = max(12, int(bh * 0.78))
            shadow, text_protection_mask = detect_text_shadow(
                text_mask,
                (x1, y1, x2, y2),
                font_size
            )
            removal_mask = cv2.bitwise_or(
                removal_mask,
                cv2.dilate(text_protection_mask, np.ones((5, 5), np.uint8))
            )
            used_masks.append(text_protection_mask > 0)

            text_layer = {
                "id": f"text_{idx + 1}", "type": "text",
                "text": text.strip(),
                "left": x1, "top": y1, "width": bw, "height": bh,
                "fontSize": font_size,
                "fill": median_color(image_np, text_mask),
                "fontWeight": "bold" if bh > 42 else "normal",
                "textAlign": "center", "name": "텍스트"
            }
            if shadow:
                text_layer["shadow"] = shadow
            layers.append(text_layer)

        # ── Step 2: Grounding DINO 객체 탐지 ──
        # 텍스트가 아닌 시각 요소들을 의미 단위로 탐지
        DINO_PROMPT = (
            "person . face . character . animal . product . package . bottle . cup . food . "
            "phone . laptop . book . document . card . logo . icon . symbol . sticker . emoji . "
            "illustration . photo . graphic . chart . diagram . badge . label . button . "
            "speech bubble . callout . arrow . line . divider . frame . box . rectangle . "
            "circle . triangle . star . shape . object . foreground element . design element ."
        )
        inputs = self.dino_processor(
            images=image_pil, text=DINO_PROMPT, return_tensors="pt"
        ).to(self.device)

        with torch.no_grad():
            outputs = self.dino_model(**inputs)

        # transformers 버전에 따라 파라미터명이 다름 → 수동 필터링으로 통일
        dino_results = self.dino_processor.post_process_grounded_object_detection(
            outputs,
            inputs.input_ids,
            target_sizes=[(h, w)]
        )

        all_boxes  = dino_results[0]["boxes"].cpu().numpy()
        all_scores = dino_results[0]["scores"].cpu().numpy()
        all_labels = dino_results[0]["labels"]

        # confidence를 조금 낮춰 작은 아이콘/장식 후보를 살리고, 뒤에서 SAM/중복 필터로 정리한다.
        keep = all_scores >= 0.16
        boxes_xyxy = all_boxes[keep]
        det_scores = all_scores[keep]
        det_labels = [all_labels[i] for i, k in enumerate(keep) if k]

        # DINO 중복 bbox 제거: bbox 레벨 NMS
        if len(boxes_xyxy) > 0:
            from torchvision.ops import nms as tv_nms
            keep_idx = tv_nms(
                torch.tensor(boxes_xyxy, dtype=torch.float32),
                torch.tensor(det_scores, dtype=torch.float32),
                iou_threshold=0.5
            ).numpy()
            boxes_xyxy = boxes_xyxy[keep_idx]
            det_scores = det_scores[keep_idx]
            det_labels = [det_labels[i] for i in keep_idx]

        # ── Step 3: SAM 2로 각 box → 정밀 마스크 → 원본 픽셀 crop ──
        image_count = 0

        if len(boxes_xyxy) > 0:
            # SAM 2 이미지 세팅 (한 번만)
            with torch.inference_mode():
                self.sam2.set_image(image_np)

            # 신뢰도 내림차순 정렬
            order = np.argsort(-det_scores)

            for i in order:
                box = boxes_xyxy[i]
                label = det_labels[i] if i < len(det_labels) else "요소"
                score = det_scores[i]

                x1, y1, x2, y2 = (
                    max(0, int(box[0])), max(0, int(box[1])),
                    min(w, int(box[2])), min(h, int(box[3]))
                )
                bw, bh = x2 - x1, y2 - y1
                if bw < 20 or bh < 20:
                    continue
                area = bw * bh
                # 너무 작거나 너무 큰 것 제외. 작은 아이콘은 0.08%까지 허용한다.
                if area < full_area * 0.0008 or area > full_area * 0.92:
                    continue

                # SAM 2: box prompt로 정밀 마스크 생성
                with torch.inference_mode():
                    if self.device == "cuda":
                        with torch.autocast("cuda", dtype=torch.bfloat16):
                            masks, _, _ = self.sam2.predict(
                                box=np.array([[x1, y1, x2, y2]]),
                                multimask_output=False
                            )
                    else:
                        masks, _, _ = self.sam2.predict(
                            box=np.array([[x1, y1, x2, y2]]),
                            multimask_output=False
                        )

                mask_bool = masks[0].astype(bool)  # (H, W)
                mask_area = int(mask_bool.sum())
                if mask_area < full_area * 0.0006 or mask_area > full_area * 0.92:
                    continue

                refined_bbox = mask_bbox(mask_bool, pad=3)
                if not refined_bbox:
                    continue
                x1, y1, x2, y2 = refined_bbox
                bw, bh = x2 - x1, y2 - y1
                if bw < 12 or bh < 12:
                    continue
                if looks_like_background_mask(mask_bool, refined_bbox, mask_area):
                    continue
                if looks_like_noise_or_line(mask_bool, refined_bbox, mask_area):
                    continue

                # 기존 마스크와 과하게 겹치면 중복 → 스킵
                if is_duplicate_mask(mask_bool, used_masks):
                    continue
                used_masks.append(mask_bool)

                # ★ 핵심: 재생성 없이 원본 픽셀을 마스크로 crop
                mask_uint8 = (mask_bool * 255).astype(np.uint8)
                alpha = cv2.GaussianBlur(mask_uint8, (5, 5), 0)

                crop_rgb = image_np[y1:y2, x1:x2].copy()
                crop_alpha = alpha[y1:y2, x1:x2]

                rgba = cv2.cvtColor(crop_rgb, cv2.COLOR_RGB2RGBA)
                rgba[:, :, 3] = crop_alpha

                removal_mask = cv2.bitwise_or(
                    removal_mask,
                    cv2.dilate(mask_uint8, np.ones((5, 5), np.uint8))
                )

                image_count += 1
                layers.append({
                    "id": f"image_{image_count}", "type": "image",
                    "image": encode_rgba_png(rgba),
                    "left": x1, "top": y1, "width": bw, "height": bh,
                    "name": str(label)
                })

                if image_count >= 24:
                    break

        # ── Step 4: SAM2 Auto Mask로 DINO 누락 영역 보완 ──
        if image_count < 24:
            print("Running SAM2 AutoMask for coverage 보완...")
            with torch.inference_mode():
                auto_masks = self.sam2_auto.generate(image_np)

            # 면적 큰 것부터 처리 (중요도 높은 요소 우선)
            auto_masks.sort(key=lambda x: x["area"], reverse=True)

            for am in auto_masks:
                if image_count >= 24:
                    break

                mask_bool = am["segmentation"]  # bool (H, W)
                area = int(am["area"])

                # 너무 작거나 너무 큰 것 제외. AutoMask는 작은 디자인 요소 보완용이다.
                if area < full_area * 0.0008 or area > full_area * 0.80:
                    continue

                refined_bbox = mask_bbox(mask_bool, pad=3)
                if not refined_bbox:
                    continue
                x1, y1, x2, y2 = refined_bbox
                bw, bh = x2 - x1, y2 - y1
                if bw < 12 or bh < 12:
                    continue
                if looks_like_background_mask(mask_bool, refined_bbox, area):
                    continue
                if looks_like_noise_or_line(mask_bool, refined_bbox, area):
                    continue

                pred_iou = float(am.get("predicted_iou", 1.0))
                stability = float(am.get("stability_score", 1.0))
                if pred_iou < 0.78 or stability < 0.86:
                    continue

                # 이미 처리된 마스크와 과하게 겹치면 스킵
                if is_duplicate_mask(mask_bool, used_masks):
                    continue
                used_masks.append(mask_bool)

                mask_uint8 = (mask_bool * 255).astype(np.uint8)
                alpha = cv2.GaussianBlur(mask_uint8, (5, 5), 0)

                crop_rgb = image_np[y1:y2, x1:x2].copy()
                crop_alpha = alpha[y1:y2, x1:x2]

                rgba = cv2.cvtColor(crop_rgb, cv2.COLOR_RGB2RGBA)
                rgba[:, :, 3] = crop_alpha

                removal_mask = cv2.bitwise_or(
                    removal_mask,
                    cv2.dilate(mask_uint8, np.ones((5, 5), np.uint8))
                )

                image_count += 1
                layers.append({
                    "id": f"image_{image_count}", "type": "image",
                    "image": encode_rgba_png(rgba),
                    "left": x1, "top": y1, "width": bw, "height": bh,
                    "name": "요소"
                })

        # ── z-index 정렬: 큰 것(배경)이 아래, 텍스트가 위 ──
        layers.sort(key=lambda item: (
            {"text": 2, "image": 1}.get(item["type"], 1),
            -(item["width"] * item["height"])
        ))

        # ── 배경 복원: 추출한 영역을 투명하게 처리 (진짜 구멍) ──
        bg_rgba = cv2.cvtColor(image_np, cv2.COLOR_RGB2RGBA)
        if cv2.countNonZero(removal_mask) > 0:
            # 가장자리 블러로 자연스러운 투명 경계
            soft_alpha = cv2.GaussianBlur(removal_mask, (7, 7), 0)
            bg_rgba[:, :, 3] = 255 - soft_alpha
        background_pil = Image.fromarray(bg_rgba)

        return {
            "version": 2, "mode": mode,
            "width": w, "height": h,
            "background": encode_pil(background_pil, "PNG"),
            "elements": layers,
            "stats": {
                "texts": len([x for x in layers if x["type"] == "text"]),
                "shapes": 0,
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
        <html><head><title>Design Studio AI Backend</title>
        <style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;
        height:100vh;margin:0;background:#0f172a;color:white;}
        .card{background:#1e293b;padding:2rem;border-radius:1rem;text-align:center;}
        h1{color:#38bdf8;}.status{margin-top:1rem;padding:.25rem .75rem;
        background:#065f46;color:#34d399;border-radius:9999px;}</style></head>
        <body><div class="card"><h1>✨ AI Backend Active</h1>
        <p>Grounding DINO + SAM 2 + EasyOCR</p>
        <div class="status">● T4 GPU</div></div></body></html>
        """,
        media_type="text/html"
    )


@app.function(image=image, volumes={CACHE_DIR: volume})
@modal.asgi_app()
def fastapi_app():
    return web_app
