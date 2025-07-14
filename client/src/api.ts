
const API_BASE = '/api';

let authToken: string | null = null;

export function setAuthToken(token: string) {
  authToken = token;
}

export function clearAuthToken() {
  authToken = null;
}

export async function getPrices() {
  const headers: Record<string, string> = {};
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }
  
  const res = await fetch(`${API_BASE}/prices`, { headers });
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
