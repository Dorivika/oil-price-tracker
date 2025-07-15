
const API_BASE = '/api';

let authToken: string | null = null;

// Cache for API responses
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function getCachedData(key: string) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  cache.delete(key);
  return null;
}

function setCachedData(key: string, data: any) {
  cache.set(key, { data, timestamp: Date.now() });
}

export function setAuthToken(token: string) {
  authToken = token;
}

export function clearAuthToken() {
  authToken = null;
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user_data');
}

// Generic API request function with retry logic
async function apiRequest(endpoint: string, options: RequestInit = {}, retries = 2) {
  const token = authToken || localStorage.getItem('auth_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers as Record<string, string>,
  };
  
  if (token) {
    headers.Authorization = `Bearer ${token}`;
    if (!authToken) authToken = token;
  }
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
      });
      
      if (!res.ok) {
        if (res.status === 503 && attempt < retries) {
          // Service unavailable - retry after delay
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          continue;
        }
        
        const errorText = await res.text();
        let errorMessage;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.detail || errorData.message || res.statusText;
        } catch {
          errorMessage = res.statusText;
        }
        
        throw new Error(`${errorMessage}`);
      }
      
      return res.json();
    } catch (error: any) {
      if (attempt === retries) {
        throw error;
      }
      // Network error - retry after delay
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
}

export async function getPrices() {
  const cacheKey = 'prices';
  const cached = getCachedData(cacheKey);
  if (cached) {
    return { data: cached };
  }
  
  try {
    const json = await apiRequest('/prices');
    const data = json?.response?.data || json?.data || json || [];
    const processedData = Array.isArray(data) ? data : [];
    
    setCachedData(cacheKey, processedData);
    return { data: processedData };
  } catch (error: any) {
    // If we have any cached data (even expired), return it as fallback
    const fallbackCache = cache.get(cacheKey);
    if (fallbackCache) {
      console.warn('Using expired cache due to API error:', error.message);
      return { data: fallbackCache.data };
    }
    throw error;
  }
}

export async function createAlert(alertData: any) {
  return apiRequest('/alerts', {
    method: 'POST',
    body: JSON.stringify(alertData),
  });
}

export async function createOrder(orderData: any) {
  return apiRequest('/orders', {
    method: 'POST',
    body: JSON.stringify(orderData),
  });
}
