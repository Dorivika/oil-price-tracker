
const API_BASE = 'http://localhost:8000';

export async function getPrices() {
  const res = await fetch(`${API_BASE}/prices`);
  const json = await res.json();
  let data: any[] = [];
  if (Array.isArray(json?.response?.data)) {
    data = json.response.data;
  } else if (Array.isArray(json?.data)) {
    data = json.data;
  } else if (Array.isArray(json)) {
    data = json;
  }
  return { data };
}
