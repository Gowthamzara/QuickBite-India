from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .models import Recipe, RecommendationRequest, RecommendationResponse
from .recommender import load_recipes, recommend

app = FastAPI(title="QuickBite India API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/ingredients")
def ingredients():
    all_ingredients = set()
    for recipe in load_recipes():
        all_ingredients.update(recipe["ingredients"])
        all_ingredients.update(recipe["pantry_staples"])
    return {"ingredients": sorted(all_ingredients)}


@app.get("/api/recipes", response_model=list[Recipe])
def recipes():
    return load_recipes()


@app.post("/api/recommendations", response_model=RecommendationResponse)
def recommendations(request: RecommendationRequest):
    return recommend(request)
