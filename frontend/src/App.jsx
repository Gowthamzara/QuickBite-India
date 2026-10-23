import React, { useEffect, useMemo, useRef, useState } from 'react';
import { findRecipes, getIngredients } from './services/api.js';

const commonIngredients = ['rice', 'egg', 'onion', 'tomato', 'potato', 'chicken', 'paneer', 'bread', 'milk', 'yogurt', 'dal', 'capsicum', 'carrot', 'peas', 'spinach', 'coriander', 'green chilli', 'garlic', 'ginger'];
const pretty = (value) => value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

function IngredientPicker({ value, onChange, suggestions }) {
  const [text, setText] = useState('');
  const inputRef = useRef(null);
  const options = useMemo(() => suggestions.filter((item) => item.toLowerCase().includes(text.trim().toLowerCase()) && !value.includes(item)).slice(0, 7), [suggestions, text, value]);
  function add(item) {
    const clean = item.trim().replace(/\s+/g, ' ');
    if (clean && !value.some((entry) => entry.toLowerCase() === clean.toLowerCase())) onChange([...value, clean]);
    setText('');
  }
  function handleKeyDown(event) {
    if (event.key === 'Enter' || event.key === ',') { event.preventDefault(); add(text); }
    if (event.key === 'Backspace' && !text && value.length) onChange(value.slice(0, -1));
  }
  return <div className="picker-wrap">
    <div className="ingredient-box" onClick={() => inputRef.current?.focus()}>
      {value.map((item) => <span className="chip" key={item}>{item}<button type="button" aria-label={`Remove ${item}`} onClick={() => onChange(value.filter((entry) => entry !== item))}>×</button></span>)}
      <input ref={inputRef} aria-label="Add an ingredient" value={text} onChange={(event) => setText(event.target.value)} onKeyDown={handleKeyDown} placeholder={value.length ? 'Add another…' : 'Type an ingredient and press Enter'} />
    </div>
    {text.trim() && <div className="suggestions" role="listbox" aria-label="Ingredient suggestions">
      {options.map((item) => <button type="button" role="option" key={item} onClick={() => add(item)}>{item}</button>)}
      {!options.some((item) => item.toLowerCase() === text.trim().toLowerCase()) && <button type="button" onClick={() => add(text)}>Add “{text.trim()}”</button>}
    </div>}
    <div className="quick-add" aria-label="Common ingredients">{commonIngredients.filter((item) => !value.some((chosen) => chosen.toLowerCase() === item)).slice(0, 9).map((item) => <button type="button" key={item} onClick={() => add(item)}>+ {item}</button>)}</div>
  </div>;
}

function RecipeCard({ item, onOpen }) {
  const recipe = item.recipe;
  return <article className="recipe-card">
    <div className="recipe-card-top"><span className="tag">{pretty(recipe.cuisine)}</span><span className="match">{Math.round(item.ingredient_coverage * 100)}% ingredient match</span></div>
    <h3>{recipe.name}</h3><p className="description">{recipe.description}</p>
    <div className="recipe-stats"><span>◷ {recipe.prep_time_minutes + recipe.cook_time_minutes} min</span><span>₹{recipe.estimated_cost_per_serving} / serving</span><span>{recipe.difficulty}</span></div>
    <p className="why"><strong>Why it fits:</strong> {item.reason}</p>
    {item.missing_ingredients.length > 0 && <p className="missing"><strong>Still needed:</strong> {item.missing_ingredients.join(', ')}</p>}
    <button className="text-button" onClick={() => onOpen(item)}>View recipe <span aria-hidden="true">→</span></button>
  </article>;
}

function RecipeDialog({ item, onClose }) {
  useEffect(() => {
    function onKey(event) { if (event.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  if (!item) return null;
  const { recipe } = item;
  return <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
      <button className="close-button" onClick={onClose} aria-label="Close recipe">×</button>
      <span className="eyebrow">{pretty(recipe.cuisine)} · {recipe.difficulty}</span><h2 id="dialog-title">{recipe.name}</h2><p>{recipe.description}</p>
      <div className="recipe-stats"><span>◷ {recipe.prep_time_minutes + recipe.cook_time_minutes} min</span><span>₹{recipe.estimated_cost_per_serving} / serving</span></div>
      <h3>Ingredients</h3><ul className="ingredient-list">{recipe.ingredients.map((ingredient) => <li key={ingredient}><span>{ingredient}</span><small>{item.matched_ingredients.includes(ingredient) ? 'In your kitchen' : 'Needed'}</small></li>)}</ul>
      {recipe.pantry_staples.length > 0 && <p className="pantry-note">Pantry staples assumed: {recipe.pantry_staples.join(', ')}.</p>}
      <h3>How to make it</h3><ol className="steps">{recipe.instructions.map((step, index) => <li key={`${index}-${step}`}>{step}</li>)}</ol>
      <p className="why"><strong>Why we picked it:</strong> {item.reason}</p>
    </section>
  </div>;
}

export default function App() {
  const [ingredients, setIngredients] = useState([]);
  const [suggestions, setSuggestions] = useState(commonIngredients);
  const [time, setTime] = useState('20');
  const [diet, setDiet] = useState('eggitarian');
  const [budget, setBudget] = useState('100');
  const [cuisine, setCuisine] = useState('any');
  const [results, setResults] = useState(null);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { getIngredients().then((data) => setSuggestions([...new Set([...commonIngredients, ...data.ingredients])])).catch(() => {}); }, []);

  async function submit(event) {
    event.preventDefault();
    if (!ingredients.length) { setError('Add at least one ingredient to get started.'); return; }
    if (!budget || Number(budget) <= 0) { setError('Enter a budget greater than ₹0.'); return; }
    setLoading(true); setError(''); setResults(null);
    try {
      const data = await findRecipes({ ingredients, max_time_minutes: Number(time), dietary_preference: diet, max_budget_inr: Number(budget), cuisine });
      setResults(data);
    } catch (err) { setError(`${err.message} Check that the FastAPI backend is running.`); }
    finally { setLoading(false); }
  }

  return <div className="app-shell">
    <header className="site-header"><a className="brand" href="#top" aria-label="QuickBite India home"><span className="brand-mark">Q</span><span>QuickBite <em>India</em></span></a><a href="#how-it-works" className="header-link">How it works</a></header>
    <main id="top">
      <section className="hero"><div className="hero-copy"><span className="eyebrow">Quick ideas for low-energy days</span><h1>Feeling too tired to cook? <span>Dinner, made easy.</span></h1><p>Long day at work or classes? Tell us what’s in your kitchen and we’ll suggest an easy dish that fits your time, taste and budget.</p></div><div className="hero-note" aria-hidden="true"><span className="hero-note-kicker">QUICKBITE INDIA</span><svg className="hero-logo-art" viewBox="0 0 100 100"><path className="steam" d="M37 31c-6-7 5-9 0-16M51 29c-6-7 5-9 0-16M65 31c-6-7 5-9 0-16"/><path className="bowl" d="M19 48h62c-3 21-14 33-31 33S22 69 19 48Z"/><path className="bowl-rim" d="M14 46h72"/><path className="bowl-detail" d="M33 59c5 6 11 9 17 9s12-3 17-9"/><path className="leaf" d="M72 34c10-12 21-8 18-7-1 10-9 16-19 12"/><path className="leaf-line" d="m72 39 13-10"/></svg><small>Less effort. More flavor.</small></div></section>
      <form className="finder-panel" onSubmit={submit}>
        <div className="section-heading"><span className="step-number">01</span><div><h2>What’s in your kitchen?</h2><p>Pick a few ingredients to start. You can type anything.</p></div></div>
        <IngredientPicker value={ingredients} onChange={setIngredients} suggestions={suggestions} />
        <div className="form-divider" />
        <div className="section-heading"><span className="step-number">02</span><div><h2>Make it fit your day</h2><p>We’ll only show recipes within these limits.</p></div></div>
        <div className="filters-grid">
          <label className="field"><span>Ready in</span><select value={time} onChange={(event) => setTime(event.target.value)}>{['10', '20', '30', '45'].map((v) => <option key={v} value={v}>{v} minutes</option>)}</select></label>
          <label className="field"><span>Food preference</span><select value={diet} onChange={(event) => setDiet(event.target.value)}><option value="vegetarian">Vegetarian (no eggs)</option><option value="eggitarian">Vegetarian with eggs</option><option value="non_vegetarian">Non-vegetarian</option></select></label>
          <label className="field"><span>Budget per serving</span><div className="budget-input"><span>₹</span><input type="number" min="1" max="10000" step="1" value={budget} onChange={(event) => setBudget(event.target.value)} aria-label="Maximum budget in rupees per serving" /></div></label>
          <label className="field"><span>Cuisine <small>optional</small></span><select value={cuisine} onChange={(event) => setCuisine(event.target.value)}><option value="any">Any cuisine</option><option value="south_indian">South Indian</option><option value="north_indian">North Indian</option><option value="indo_chinese">Indo-Chinese</option></select></label>
        </div>
        <button className="submit-button" type="submit" disabled={loading}>{loading ? <><span className="spinner" /> Finding ideas…</> : <>Find My Recipes <span aria-hidden="true">→</span></>}</button>
        {error && <p className="error-message" role="alert">{error}</p>}
      </form>

      <section className="results-section" aria-live="polite">
        {results && <>
          <div className="results-heading"><div><span className="eyebrow">Your kitchen, your possibilities</span><h2>{results.total_matches ? 'Here’s what you can make' : 'Let’s try a different mix'}</h2></div>{results.total_matches > 0 && <span className="result-count">{results.total_matches} {results.total_matches === 1 ? 'recipe' : 'recipes'}</span>}</div>
          {!results.total_matches ? <div className="empty-state"><span className="empty-icon">⌕</span><p>{results.message}</p><small>Your dietary preference is always respected.</small></div> : <><p className="results-subtitle">{results.message} Staples like salt and oil are assumed available.</p><div className="recipe-grid">{results.matches.map((item) => <RecipeCard key={item.recipe.id} item={item} onOpen={setSelected} />)}</div></>}
        </>}
        {!results && !loading && <div className="starter-note"><span>✳</span><p>Good things can come from the simplest ingredients.<br /><small>Add what you have and let’s find your next favourite.</small></p></div>}
      </section>
      <section id="how-it-works" className="how-section"><span className="eyebrow">Simple and transparent</span><h2>How QuickBite picks recipes</h2><p>Diet, total cooking time and budget are checked first. Recipes that pass are ranked by how many main ingredients you already have. Matching is rule-based, so every recommendation comes with a clear reason.</p></section>
    </main>
    <footer className="site-footer"><span className="brand small"><span className="brand-mark">Q</span><span>QuickBite <em>India</em></span></span><p>Cooking times and costs are estimates; actual results and prices vary by kitchen and location.</p></footer>
    <RecipeDialog item={selected} onClose={() => setSelected(null)} />
  </div>;
}
