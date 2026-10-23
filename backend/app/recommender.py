"""Transparent deterministic recipe filtering and ranking."""
import json
import re
from pathlib import Path

DATA_PATH = Path(__file__).with_name("recipes.json")
ALIASES = {
    "eggs": "egg", "tomatoes": "tomato", "onions": "onion",
    "potatoes": "potato", "chillies": "chilli", "chilies": "chilli",
    "green chillies": "green chilli", "capsicums": "capsicum",
    "bell pepper": "capsicum", "bell peppers": "capsicum",
    "chickpeas": "chickpea", "coriander leaves": "coriander",
    "cilantro": "coriander", "curd": "yogurt", "dahi": "yogurt",
    "yoghurt": "yogurt", "spring onions": "spring onion",
    "curry leaves": "curry leaf", "lentils": "dal", "pulses": "dal",
    "chicken pieces": "chicken", "chicken breast": "chicken",
}


def normalize_ingredient(value: str) -> str:
    """Normalize whitespace/case and a small explicit set of safe aliases."""
    normalized = re.sub(r"\s+", " ", value.strip().lower())
    return ALIASES.get(normalized, normalized)


def load_recipes() -> list[dict]:
    with DATA_PATH.open(encoding="utf-8") as recipe_file:
        return json.load(recipe_file)


def is_diet_compatible(diet: str, preference: str) -> bool:
    if preference == "vegetarian":
        return diet == "vegetarian"
    if preference == "eggitarian":
        return diet in {"vegetarian", "egg"}
    return True


def recommend(request, recipes: list[dict] | None = None) -> dict:
    recipes = recipes if recipes is not None else load_recipes()
    available = {normalize_ingredient(item) for item in request.ingredients}
    eligible = []
    for recipe in recipes:
        total_time = recipe["prep_time_minutes"] + recipe["cook_time_minutes"]
        if not is_diet_compatible(recipe["diet_type"], request.dietary_preference):
            continue
        if total_time > request.max_time_minutes:
            continue
        if recipe["estimated_cost_per_serving"] > request.max_budget_inr:
            continue
        if request.cuisine != "any" and recipe["cuisine"] != request.cuisine:
            continue

        # Staples (salt, oil and basic spices) are assumed available and excluded
        # from coverage/missing counts. All other listed ingredients are counted.
        required = [normalize_ingredient(item) for item in recipe["ingredients"]]
        matched = [item for item in required if item in available]
        missing = [item for item in required if item not in available]
        coverage = len(matched) / len(required) if required else 1.0
        cuisine_text = "any cuisine" if request.cuisine == "any" else request.cuisine.replace("_", " ")
        reason = (
            f"Fits your {total_time}-minute, ₹{recipe['estimated_cost_per_serving']:.0f} budget; "
            f"matches {len(matched)} of {len(required)} listed ingredients. "
            f"Diet and {cuisine_text} preference are compatible."
        )
        eligible.append({
            "recipe": recipe,
            "matched_ingredients": matched,
            "missing_ingredients": missing,
            "ingredient_coverage": round(coverage, 3),
            "reason": reason,
            "_rank": (coverage, -len(missing), -total_time, recipe["id"]),
        })
    eligible.sort(key=lambda item: item["_rank"], reverse=True)
    for item in eligible:
        del item["_rank"]
    message = (
        f"Found {len(eligible)} recipes that fit all your filters."
        if eligible else
        "No recipes fit all your filters. Try increasing your time or budget, or choose Any cuisine."
    )
    return {"matches": eligible, "total_matches": len(eligible), "message": message}
