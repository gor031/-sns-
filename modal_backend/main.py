import modal
import io
import os
from fastapi import Response, UploadFile, File, Form
from typing import List

# 모달 앱 정의
app = modal.App("cardnews-ai-backend")

# AI 실행 환경 설정 (GPU 서버에 설치될 패키지들)
def download_models():
    from diffusers import StableDiffusionInpaintPipeline
    import torch
    
    # Inpaint 모델 미리 다운로드
    StableDiffusionInpaintPipeline.from_pretrained(
        "runwayml/stable-diffusion-inpainting",
        torch_dtype=torch.float16,
    )
    
    # SAM 체크포인트는 setup에서 볼륨으로 관리하므로 여기서는 생략하거나 추가 가능

image = (
    modal.Image.debian_slim(python_version="3.10")
    .apt_install("libgl1-mesa-glx", "libglib2.0-0")
    .pip_install(
        "torch",
        "torchvision",
        "diffusers",
        "transformers",
        "opencv-python",
        "accelerate",
        "segment-anything",
        "fastapi[standard]",
        "python-multipart",
        "numpy",
        "Pillow",
        "requests"
    )
    .run_function(download_models)
)

# 모델 가중치를 저장할 볼륨 (매번 다운로드하지 않게 함)
volume = modal.Volume.from_name("ai-models-cache", create_if_missing=True)
CACHE_DIR = "/cache"

@app.cls(
    gpu="t4",  # 가성비 T4 GPU 사용
    image=image,
    volumes={CACHE_DIR: volume},
    timeout=600
)
class ImageProcessor:
    @modal.enter()
    def setup(self):
        import torch
        from diffusers import StableDiffusionInpaintPipeline
        from segment_anything import sam_model_registry, SamPredictor
        import requests

        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        
        # 1. SAM 모델 로드
        sam_checkpoint = f"{CACHE_DIR}/sam_vit_h_4b8939.pth"
        if not os.path.exists(sam_checkpoint):
            print("Downloading SAM checkpoint...")
            url = "https://dl.fbaipublicfiles.com/segment_anything/sam_vit_h_4b8939.pth"
            r = requests.get(url)
            with open(sam_checkpoint, "wb") as f:
                f.write(r.content)
            volume.commit()

        sam = sam_model_registry["vit_h"](checkpoint=sam_checkpoint)
        sam.to(device=self.device)
        self.predictor = SamPredictor(sam)

        # 2. Inpainting 모델 로드 (배경 채우기)
        self.inpaint_pipe = StableDiffusionInpaintPipeline.from_pretrained(
            "runwayml/stable-diffusion-inpainting",
            torch_dtype=torch.float16 if self.device == "cuda" else torch.float32,
            revision="fp16" if self.device == "cuda" else "main",
        ).to(self.device)
        
        print("Models loaded successfully!")

    @modal.fastapi_endpoint(method="POST")
    async def extract(self, file: UploadFile = File(...)):
        import numpy as np
        from PIL import Image
        import cv2
        import base64

        # 이미지 읽기
        contents = await file.read()
        image_pil = Image.open(io.BytesIO(contents)).convert("RGB")
        image_np = np.array(image_pil)

        # 1. SAM으로 전체 객체 세그멘테이션 (여기서는 단순화해서 중앙 객체나 자동 감지 사용)
        # 실제로는 사용자가 클릭한 좌표를 받거나, 모든 객체를 다 따는 로직이 필요함.
        # 일단은 가장 큰 객체 하나를 따는 예시로 구현.
        self.predictor.set_image(image_np)
        
        # 중앙 좌표를 힌트로 주어 메인 피사체 탐지
        h, w = image_np.shape[:2]
        input_point = np.array([[w // 2, h // 2]])
        input_label = np.array([1])
        
        masks, scores, logits = self.predictor.predict(
            point_coords=input_point,
            point_labels=input_label,
            multimask_output=True,
        )
        
        # 가장 점수 높은 마스크 선택
        mask = masks[np.argmax(scores)] # (H, W)
        
        # 2. 피사체 추출 (투명 PNG)
        mask_uint8 = (mask * 255).astype(np.uint8)
        # 알파 채널 추가
        fg_np = cv2.cvtColor(image_np, cv2.COLOR_RGB2RGBA)
        fg_np[:, :, 3] = mask_uint8
        
        fg_pil = Image.fromarray(fg_np)
        fg_buffer = io.BytesIO()
        fg_pil.save(fg_buffer, format="PNG")
        fg_base64 = base64.b64encode(fg_buffer.getvalue()).decode()

        # 3. 배경 채우기 (Inpainting)
        # 마스크를 살짝 확장해서 경계선을 더 깔끔하게 처리
        kernel = np.ones((10, 10), np.uint8)
        dilated_mask = cv2.dilate(mask_uint8, kernel, iterations=1)
        mask_pil = Image.fromarray(dilated_mask)

        # SD Inpainting 실행
        bg_pil = self.inpaint_pipe(
            prompt="clean background, high quality, seamless",
            negative_prompt="deformed, ugly, bad anatomy",
            image=image_pil,
            mask_image=mask_pil,
            num_inference_steps=20
        ).images[0]

        bg_buffer = io.BytesIO()
        bg_pil.save(bg_buffer, format="JPEG")
        bg_base64 = base64.b64encode(bg_buffer.getvalue()).decode()

        # 결과 반환
        return {
            "background": f"data:image/jpeg;base64,{bg_base64}",
            "elements": [
                {
                    "id": "element_1",
                    "image": f"data:image/png;base64,{fg_base64}",
                    "top": 0,
                    "left": 0,
                    "width": w,
                    "height": h
                }
            ]
        }

    @modal.fastapi_endpoint(method="GET")
    def status(self):
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
