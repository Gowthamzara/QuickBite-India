import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models import RecommendationRequest
from app.recommender import is_diet_compatible, load_recipes, normalize_ingredient, recommend

client = TestClient(app)


def request(**changes):
    data = {
        "ingredients": ["eggs", "rice", "onion", "tomato"],
        "max_time_minutes": 20,
        "dietary_preference": "eggitarian",
        "max_budget_inr": 100,
        "cuisine": "any",
    }
    data.update(changes)
    return RecommendationRequest(**data)


def test_valid_recommendation_request():
    response = client.post("/api/recommendations", json=request().model_dump())
    assert response.status_code == 200
    body = response.json()
    assert body["total_matches"] > 0
    assert any(item["recipe"]["id"] == "egg-fried-rice" for item in body["matches"])


def test_missing_or_empty_ingredients_rejected():
    for value in ([], ["  "]):
        data = request().model_dump()
        data["ingredients"] = value
        assert client.post("/api/recommendations", json=data).status_code == 422


def test_normalization_and_aliases():
    assert normalize_ingredient("  TOMATOES  ") == "tomato"
    assert normalize_ingredient("  Green   chillies ") == "green chilli"


def test_dietary_rules_are_strict():
    assert is_diet_compatible("vegetarian", "vegetarian")
    assert not is_diet_compatible("egg", "vegetarian")
    assert is_diet_compatible("egg", "eggitarian")
    assert not is_diet_compatible("non_vegetarian", "eggitarian")
    assert is_diet_compatible("non_vegetarian", "non_vegetarian")


def test_diet_request_results():
    vegetarian = recommend(request(dietary_preference="vegetarian"))
    assert all(m["recipe"]["diet_type"] == "vegetarian" for m in vegetarian["matches"])
    nonveg = recommend(request(dietary_preference="non_vegetarian", max_time_minutes=45, max_budget_inr=200))
    assert any(m["recipe"]["diet_type"] == "non_vegetarian" for m in nonveg["matches"])


def test_time_and_budget_filters():
    too_fast = recommend(request(max_time_minutes=10))
    assert all(m["recipe"]["prep_time_minutes"] + m["recipe"]["cook_time_minutes"] <= 10 for m in too_fast["matches"])
    low_budget = recommend(request(max_budget_inr=1))
    assert low_budget["matches"] == []


def test_matching_and_ranking():
    result = recommend(request(ingredients=["rice", " eggs ", "ONIONS", "tomatoes"]))
    fried_rice = next(m for m in result["matches"] if m["recipe"]["id"] == "egg-fried-rice")
    assert {"rice", "egg", "onion"}.issubset(fried_rice["matched_ingredients"])
    assert normalize_ingredient("tomatoes") == "tomato"
    assert result["matches"][0]["ingredient_coverage"] >= result["matches"][-1]["ingredient_coverage"]
    assert isinstance(fried_rice["reason"], str) and fried_rice["reason"]


def test_no_matching_recipes():
    result = recommend(request(ingredients=["water"], max_budget_inr=1))
    assert result["total_matches"] == 0
    assert "Try increasing" in result["message"]


@pytest.mark.parametrize("changes", [
    {"max_time_minutes": 5}, {"max_budget_inr": 0},
    {"dietary_preference": "vegan"}, {"cuisine": "italian"},
])
def test_invalid_values_rejected(changes):
    data = request().model_dump()
    data.update(changes)
    assert client.post("/api/recommendations", json=data).status_code == 422


def test_every_recipe_has_required_fields_and_30_records():
    recipes = load_recipes()
    required = {"id", "name", "description", "ingredients", "pantry_staples", "diet_type", "cuisine", "prep_time_minutes", "cook_time_minutes", "estimated_cost_per_serving", "difficulty", "instructions"}
    assert len(recipes) >= 30
    assert all(required <= recipe.keys() for recipe in recipes)
    assert all(recipe["instructions"] for recipe in recipes)
