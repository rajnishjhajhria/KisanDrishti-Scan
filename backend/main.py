import io, os, time, uuid, logging, json
import re
from pathlib import Path
from contextlib import asynccontextmanager
from typing import Optional
import requests
 
from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import torch, torch.nn as nn
from torchvision import models, transforms
from torchvision.models import efficientnet_b4
from dotenv import load_dotenv
 
BASE_DIR = Path(__file__).resolve().parent.parent
SAVED_MODELS_DIR = BASE_DIR / "saved_models"

load_dotenv(BASE_DIR / ".env", override=True)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
 
# ── SambaNova config (OpenAI-compatible API) ─────────
sambanova_api_key = os.getenv("SAMBANOVA_API_KEY")
sambanova_model = os.getenv("SAMBANOVA_MODEL", "gemma-3-12b-it")
sambanova_base_url = os.getenv("SAMBANOVA_BASE_URL", "https://api.sambanova.ai/v1")
 
# ── Image transforms ──────────────────────────────────
disease_tf = transforms.Compose([
    transforms.Resize((224, 224)), transforms.ToTensor(),
    transforms.Normalize([0.485,0.456,0.406],[0.229,0.224,0.225])
])
quality_tf = transforms.Compose([
    transforms.Resize((380, 380)), transforms.ToTensor(),
    transforms.Normalize([0.485,0.456,0.406],[0.229,0.224,0.225])
])
 
# ── Grade metadata ────────────────────────────────────
GRADE_META = {
    0: {"label":"Grade A","label_hi":"श्रेणी अ","description":"Premium quality"},
    1: {"label":"Grade B","label_hi":"श्रेणी ब","description":"Good quality"},
    2: {"label":"Grade C","label_hi":"श्रेणी स","description":"Processing grade"},
    3: {"label":"Reject", "label_hi":"अस्वीकार","description":"Not suitable"},
}
 
# ── Global model state ───────────────────────────────
disease_model = quality_model = None
disease_classes = quality_classes = []
 
def load_models():
    global disease_model, disease_classes, quality_model, quality_classes
    dp = SAVED_MODELS_DIR / "disease_model.pth"
    if dp.exists():
        ckpt = torch.load(dp, map_location="cpu")
        disease_classes = ckpt["class_names"]
        m = models.resnet50(weights=None)
        m.fc = nn.Sequential(
            nn.Dropout(0.5), nn.Linear(2048,512), nn.ReLU(),
            nn.Dropout(0.3), nn.Linear(512, len(disease_classes))
        )
        m.load_state_dict(ckpt["model_state_dict"]); m.eval()
        disease_model = m
        logger.info(f"Disease model loaded: {len(disease_classes)} classes")
    qp = SAVED_MODELS_DIR / "quality_model.pth"
    if qp.exists():
        ckpt = torch.load(qp, map_location="cpu")
        quality_classes = ckpt["class_names"]
        m = efficientnet_b4(weights=None)
        in_f = m.classifier[1].in_features
        m.classifier = nn.Sequential(
            nn.Dropout(0.4), nn.Linear(in_f,256), nn.SiLU(),
            nn.Dropout(0.3), nn.Linear(256, len(quality_classes))
        )
        m.load_state_dict(ckpt["model_state_dict"]); m.eval()
        quality_model = m
        logger.info(f"Quality model loaded: {len(quality_classes)} grades")
 
@asynccontextmanager
async def lifespan(app):
    load_models()
    logger.info("KisanDrishti Scan ready!")
    yield
 
app = FastAPI(title="KisanDrishti Scan", version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"],
    allow_methods=["*"], allow_headers=["*"])
 
# ── PyTorch inference ────────────────────────────────
def run_disease(image: Image.Image, crop_hint=None):
    tensor = disease_tf(image).unsqueeze(0)
    with torch.no_grad():
        probs = torch.softmax(disease_model(tensor), dim=1)[0]
    if crop_hint:
        for i, cls in enumerate(disease_classes):
            if crop_hint.lower() in cls.lower(): probs[i] *= 6.0
        probs = probs / probs.sum()
    top5_idx = probs.topk(5).indices.tolist()
    top5_probs = probs.topk(5).values.tolist()
    top_class = disease_classes[top5_idx[0]]
    parts = top_class.split("___")
    crop_type = parts[0].replace("_"," ") if len(parts)>1 else "Unknown"
    disease   = parts[1].replace("_"," ") if len(parts)>1 else top_class
    top5 = []
    for i, p in zip(top5_idx, top5_probs):
        cls = disease_classes[i]; pts = cls.split("___")
        top5.append({"class": pts[-1].replace("_"," ") if len(pts)>1 else cls,
            "crop": pts[0].replace("_"," ") if len(pts)>1 else "Unknown",
            "confidence": float(p)})
    return {
        "disease_class": disease, "crop_type": crop_type,
        "is_healthy": "healthy" in top_class.lower(),
        "confidence": float(top5_probs[0]), "top5": top5
    }
 
def run_quality(image: Image.Image):
    tensor = quality_tf(image).unsqueeze(0)
    with torch.no_grad():
        probs = torch.softmax(quality_model(tensor), dim=1)[0].tolist()
    grade_idx = int(probs.index(max(probs)))
    meta = GRADE_META.get(grade_idx, GRADE_META[3])
    return {
        "grade": meta["label"], "grade_hi": meta["label_hi"],
        "grade_index": grade_idx, "confidence": float(max(probs)),
        "all_grades": [{**GRADE_META.get(i, GRADE_META[3]), "confidence": float(p)}
                       for i, p in enumerate(probs)]
    }


def parse_json_response(text: str) -> dict:
    clean = text.strip().replace("```json", "").replace("```", "").strip()
    try:
        return json.loads(clean)
    except json.JSONDecodeError:
        match = re.search(r"\{[\s\S]*\}", clean)
        if match:
            return json.loads(match.group(0))
        raise
 
# ── Claude AI enrichment ─────────────────────────────
def enrich_with_claude(disease_result: dict, quality_result: dict | None) -> dict:
    if not sambanova_api_key:
        raise RuntimeError("SAMBANOVA_API_KEY is not configured")

    disease_name = disease_result["disease_class"]
    crop = disease_result["crop_type"]
    confidence = disease_result["confidence"]
    is_healthy = disease_result["is_healthy"]
    grade = quality_result["grade"] if quality_result else "N/A"
 
    prompt = f"""Crop scan result from ML model:
- Crop: {crop}
- Disease: {disease_name}
- Healthy: {is_healthy}
- Confidence: {confidence*100:.0f}%
- Quality Grade: {grade}
 
Respond ONLY with JSON (no markdown):
{{
  "disease_hindi": "Hindi name of disease",
  "crop_hindi": "Hindi name of crop",
  "severity": "low|medium|high|none",
  "pathogen": "scientific pathogen name",
  "symptoms_summary": "1 sentence in simple English",
  "treatment": ["step 1", "step 2", "step 3"],
  "treatment_hindi": ["step 1 in Hindi", "step 2 in Hindi"],
  "prevention": ["tip 1", "tip 2"],
  "market_advice": "1 sentence based on quality grade",
  "urgency": "low|moderate|high",
  "farmer_note": "Simple friendly note for Indian farmer in 1 sentence"
}}"""
 
    headers = {
        "Authorization": f"Bearer {sambanova_api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": sambanova_model,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.2,
        "max_tokens": 800,
    }

    resp = requests.post(
        f"{sambanova_base_url}/chat/completions",
        headers=headers,
        json=payload,
        timeout=45,
    )
    if resp.status_code >= 400:
        raise RuntimeError(f"SambaNova error {resp.status_code}: {resp.text}")

    data = resp.json()
    text = data["choices"][0]["message"]["content"].strip()
    return parse_json_response(text)
 
# ── Routes ───────────────────────────────────────────
@app.get("/")
async def root():
    return {
        "name": "KisanDrishti Scan",
        "disease_model": disease_model is not None,
        "quality_model": quality_model is not None,
        "claude": bool(sambanova_api_key),
        "claude_provider": "sambanova",
        "claude_model": sambanova_model,
    }
 
@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": float(time.time())}
 
@app.post("/analyze")
async def analyze(
    file: UploadFile = File(...),
    crop_hint: Optional[str] = Form(None),
    use_claude: bool = Form(True)
):
    if disease_model is None:
        raise HTTPException(503, "Disease model not loaded")
    if file.content_type not in {"image/jpeg","image/png","image/webp"}:
        raise HTTPException(400, f"Unsupported type: {file.content_type}")
    image_bytes = await file.read()
    if len(image_bytes) > 10*1024*1024:
        raise HTTPException(400, "Max 10MB")
    try:
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    except:
        raise HTTPException(400, "Invalid image")
 
    t0 = time.time()
    request_id = str(uuid.uuid4())[:8]
 
    # Run PyTorch disease detection
    disease_result = run_disease(image, crop_hint)
 
    # Run quality grading if model is loaded
    quality_result = None
    if quality_model:
        try:
            quality_result = run_quality(image)
        except Exception as e:
            logger.warning(f"Quality model error: {e}")
 
    # Enrich with Claude AI
    claude_data = None
    claude_error = None
    if use_claude:
        try:
            claude_data = enrich_with_claude(disease_result, quality_result)
        except Exception as e:
            claude_error = str(e)
            logger.warning(f"Claude enrichment failed: {e}")
 
    total_ms = round((time.time() - t0) * 1000, 2)
    logger.info(f"[{request_id}] {disease_result['disease_class']} ({disease_result['confidence']*100:.1f}%) {total_ms}ms")
 
    return {
        "request_id": request_id,
        "total_ms": total_ms,
        "disease": disease_result,
        "quality": quality_result,
        "claude": claude_data,
        "claude_error": claude_error,
        "models_used": {
            "disease_pytorch": True,
            "quality_pytorch": quality_model is not None,
            "claude_ai": claude_data is not None
        }
    }
 
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
 
