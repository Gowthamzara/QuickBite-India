const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!response.ok) {
    let message = `Request failed (${response.status}).`;
    try {
      const body = await response.json();
      message = body.detail?.[0]?.msg || body.detail || message;
    } catch { /* Keep the readable status fallback. */ }
    throw new Error(message);
  }
  return response.json();
}

export const getIngredients = () => request('/api/ingredients');
export const findRecipes = (filters) => request('/api/recommendations', {
  method: 'POST', body: JSON.stringify(filters),
});
