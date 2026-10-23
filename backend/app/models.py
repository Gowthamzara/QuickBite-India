from typing import Literal

from pydantic import BaseModel, Field, field_validator


DietPreference = Literal["vegetarian", "eggitarian", "non_vegetarian"]
CuisinePreference = Literal["any", "south_indian", "north_indian", "indo_chinese"]


class RecommendationRequest(BaseModel):
    ingredients: list[str] = Field(min_length=1, max_length=40)
    max_time_minutes: int = Field(ge=10, le=45)
    dietary_preference: DietPreference
    max_budget_inr: float = Field(gt=0, le=10000)
    cuisine: CuisinePreference = "any"

    @field_validator("ingredients")
    @classmethod
    def clean_ingredients(cls, items: list[str]) -> list[str]:
        cleaned = [item.strip() for item in items if isinstance(item, str) and item.strip()]
        if not cleaned:
            raise ValueError("Add at least one non-empty ingredient.")
        return cleaned


class Recipe(BaseModel):
    id: str
    name: str
    description: str
    ingredients: list[str]
    pantry_staples: list[str]
    diet_type: Literal["vegetarian", "egg", "non_vegetarian"]
    cuisine: Literal["south_indian", "north_indian", "indo_chinese"]
    prep_time_minutes: int = Field(ge=0)
    cook_time_minutes: int = Field(gt=0)
    estimated_cost_per_serving: float = Field(gt=0)
    difficulty: Literal["Easy", "Medium"]
    instructions: list[str] = Field(min_length=2)


class Recommendation(BaseModel):
    recipe: Recipe
    matched_ingredients: list[str]
    missing_ingredients: list[str]
    ingredient_coverage: float
    reason: str


class RecommendationResponse(BaseModel):
    matches: list[Recommendation]
    total_matches: int
    message: str
