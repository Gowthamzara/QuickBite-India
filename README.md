# QuickBite India

QuickBite India is a small full-stack recipe finder. Enter ingredients you already have, choose a dietary preference, time limit, budget and optional cuisine, then get recipes that meet every selected limit. The MVP uses curated local JSON data and transparent rules; it does not call an AI service or an external recipe API.

Recipe costs and timings are rough India-focused estimates, not live prices or guarantees. Check ingredients and cooking doneness yourself, especially for meat and allergies.

Times are hands-on estimates for the recipe as written. Rice stir-fries and lemon/tomato/curd rice assume cooked rice is ready; dosa and idli recipes assume prepared fermented batter. Those base preparations are called out in the recipe descriptions and ingredient lists.

## How the pieces fit together

The React app runs in the browser and uses the Fetch API to send your preferences to FastAPI. FastAPI validates the request with Pydantic, loads records from `backend/app/recipes.json`, applies the recommendation rules, and returns JSON. Vite serves the frontend during development; Uvicorn serves the Python API.

React components and hooks manage the form, loading state, results and selected recipe. Vite provides the local development server and builds the frontend files for deployment. FastAPI defines the HTTP endpoints and generates API documentation; Uvicorn runs the FastAPI application locally.

## Project structure

```text
quickbites project/
├── backend/
│   ├── app/
│   │   ├── main.py             # FastAPI routes and local CORS settings
│   │   ├── models.py           # Pydantic request/response validation
│   │   ├── recommender.py      # Filtering, normalization and ranking
│   │   └── recipes.json        # Curated recipe data (31 records)
│   ├── tests/
│   │   └── test_recommender.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── services/api.js     # Fetch calls to FastAPI
│   │   ├── App.jsx             # Form, cards and recipe detail view
│   │   └── index.css
│   ├── .env.example
│   ├── index.html
│   └── package.json
└── .gitignore
```

## Run locally on Windows with VS Code

Install Python 3.10 or newer and Node.js 18 or newer. Open this folder in VS Code. The commands below use PowerShell and create a virtual environment inside `backend`.

### Terminal 1: backend

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

The API runs at `http://localhost:8000`. Interactive API docs are at `http://localhost:8000/docs`; health check is `http://localhost:8000/api/health`.

### Terminal 2: frontend

```powershell
cd frontend
Copy-Item .env.example .env
npm install
npm run dev
```

Open the URL printed by Vite, usually `http://localhost:5173`. `VITE_API_BASE_URL` defaults to `http://localhost:8000`; to change it, edit `frontend/.env` and restart Vite. The backend allows the standard Vite localhost origins.

## Run backend tests

With the backend virtual environment activated:

```powershell
cd backend
python -m pytest -q
```

The tests cover API validation, ingredient aliases, dietary rules, time and budget filters, match ranking, empty results, and required recipe fields.

## Recommendation rules

1. Ingredient names are trimmed and lowercased. A small explicit alias map handles common forms such as `tomatoes` → `tomato`, `eggs` → `egg`, and `dahi` → `yogurt`; unrelated names are never matched by substring.
2. Diet, total prep plus cook time, budget and (if selected) cuisine are mandatory filters. A vegetarian request never includes egg or meat recipes. “Vegetarian with eggs” includes egg and vegetarian recipes, but never meat or fish. Non-vegetarian can include all recipe types.
3. Pantry staples listed on each record (salt, oil and basic spices) are assumed to be available and do not count as matches or missing ingredients. All other listed ingredients are compared exactly after normalization.
4. Remaining recipes sort by ingredient coverage, then fewer missing ingredients, then shorter total time, and a stable ID tie-break. Each card explains why it passed the filters and reports ingredients on hand and still needed.

No eligible match produces a suggestion to relax a time, budget or cuisine filter. Dietary restrictions are never relaxed automatically.

## Add a recipe

Add one object to `backend/app/recipes.json` with the same fields as existing records. Use a unique `id`; choose `diet_type` from `vegetarian`, `egg`, or `non_vegetarian`; choose a cuisine from `south_indian`, `north_indian`, or `indo_chinese`. Put ingredients that users should match in `ingredients`, and list assumed staples separately in `pantry_staples`. Keep `prep_time_minutes` and `cook_time_minutes` consistent with the instructions, and label the per-serving cost as an estimate. The API response model validates the record shape.

## Troubleshooting

- **`py` or `python` is not recognized:** install Python from python.org and enable the launcher/PATH option, then restart VS Code. On some systems use `python` instead of `py` to create the virtual environment.
- **PowerShell blocks activation:** run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once, or activate using the command prompt's `.venv\Scripts\activate.bat`.
- **`npm` is not recognized:** install Node.js LTS, reopen VS Code, and confirm `node --version` and `npm --version`.
- **Port already in use:** stop the other server or run Uvicorn with `--port 8001`; if changed, set `VITE_API_BASE_URL=http://localhost:8001` and restart Vite. If Vite selects a different frontend port, add that exact localhost origin to the `allow_origins` list in `backend/app/main.py`.
- **CORS or network error:** start the backend and frontend separately, check the API URL in `frontend/.env`, and use `localhost` consistently. The development API allows `localhost:5173` and `127.0.0.1:5173`.
- **No recommendations:** increase the time or budget, or choose Any cuisine. Ingredient overlap affects ranking; it does not override mandatory preference filters.

## Push to GitHub

Create an empty GitHub repository, then from this project directory:

```powershell
git init
git add .
git commit -m "Build QuickBite India recipe finder"
git branch -M main
git remote add origin https://github.com/YOUR-USER/quickbite-india.git
git push -u origin main
```

Replace the example remote with your repository URL. `.gitignore` excludes virtual environments, dependency folders and local `.env` files.

## Future improvements

The current MVP intentionally has no accounts, database, shopping lists, nutrition claims, analytics, monetization or hosting configuration. Possible next steps include a database adapter, saved recipes, more regional data, shopping lists, verified nutrition data, SEO-friendly detail pages, and free hosting. Review data quality and privacy requirements before making it a public service.
