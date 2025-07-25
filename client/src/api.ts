
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

// Test endpoint availability
async function testEndpoint(endpoint: string): Promise<boolean> {
  try {
    await apiRequest(endpoint);
    return true;
  } catch (error) {
    console.warn(`Endpoint ${endpoint} not available:`, error);
    return false;
  }
}

export async function getPrices(timePeriod?: 'hour' | 'day' | 'week', productType?: 'Gasoline' | 'Diesel') {
  const cacheKey = `prices-${timePeriod || 'week'}-${productType || 'all'}`;
  const cached = getCachedData(cacheKey);
  if (cached) {
    return { data: cached };
  }
  
  try {
    // Get user role to determine available endpoints
    const userData = localStorage.getItem('user_data');
    const userRole = userData ? JSON.parse(userData).role : null;
    
    let endpoint = '/prices';
    let useSimulation = false;
    
    // Try to use appropriate endpoint based on time period and user role
    if (timePeriod === 'day' && userRole === 'owner') {
      const ownerHistoricalAvailable = await testEndpoint('/owner/historical');
      if (ownerHistoricalAvailable) {
        endpoint = '/owner/historical';
      } else {
        console.warn('Owner historical endpoint not available, using simulation');
        useSimulation = true;
      }
    } else if (timePeriod === 'hour' && userRole === 'owner') {
      const ownerSpotAvailable = await testEndpoint('/owner/spot-prices');
      if (ownerSpotAvailable) {
        endpoint = '/owner/spot-prices';
      } else {
        console.warn('Owner spot prices endpoint not available, using simulation');
        useSimulation = true;
      }
    } else if (timePeriod !== 'week') {
      // For non-owners or when owner endpoints fail, simulate different time periods
      useSimulation = true;
    }
    
    console.log(`Fetching data from: ${endpoint} for timePeriod: ${timePeriod}, productType: ${productType}, simulation: ${useSimulation}`);
    
    const json = await apiRequest(endpoint);
    console.log('Raw API response structure:', {
      frequency: json?.response?.frequency,
      total: json?.response?.total,
      dataLength: json?.response?.data?.length,
      dateFormat: json?.response?.dateFormat,
      firstDataPoint: json?.response?.data?.[0]
    });
    
    let data = json?.response?.data || json?.data || json || [];
    let processedData = Array.isArray(data) ? data : [];
    
    // Simulate different time periods if needed
    if (useSimulation && timePeriod !== 'week') {
      processedData = simulateTimePeriod(processedData, timePeriod);
      console.log(`Simulated ${timePeriod} data:`, processedData.slice(0, 3));
    }
    
    // Filter by product type if specified
    let filteredData = processedData;
    if (productType) {
      filteredData = processedData.filter((item: any) => 
        item['product-name']?.toLowerCase()?.includes(productType.toLowerCase())
      );
      console.log(`Filtered data for ${productType}:`, filteredData.slice(0, 3));
    }
    
    setCachedData(cacheKey, filteredData);
    return { data: filteredData };
  } catch (error: any) {
    console.error('API request failed:', error);
    // If we have any cached data (even expired), return it as fallback
    const fallbackCache = cache.get(cacheKey);
    if (fallbackCache) {
      console.warn('Using expired cache due to API error:', error.message);
      return { data: fallbackCache.data };
    }
    throw error;
  }
}

// Simulate different time periods from weekly data
function simulateTimePeriod(weeklyData: any[], timePeriod: 'hour' | 'day' | 'week'): any[] {
  if (timePeriod === 'week' || !weeklyData.length) {
    return weeklyData;
  }
  
  const simulatedData: any[] = [];
  
  // Take the latest few weeks and simulate more granular data
  const recentWeeks = weeklyData.slice(0, 10);
  
  recentWeeks.forEach((weekItem, weekIndex) => {
    const basePrice = Number(weekItem.value);
    const basePeriod = weekItem.period;
    
    if (timePeriod === 'day') {
      // Generate 7 days for each week
      for (let day = 0; day < 7; day++) {
        const dayDate = new Date(basePeriod);
        dayDate.setDate(dayDate.getDate() + day);
        
        // Add some realistic price variation (±2%)
        const variation = (Math.random() - 0.5) * 0.04;
        const simulatedPrice = basePrice * (1 + variation);
        
        simulatedData.push({
          ...weekItem,
          value: simulatedPrice.toFixed(3),
          period: dayDate.toISOString().split('T')[0],
          'period-description': `Day ${day + 1} of week ${basePeriod}`,
          simulated: true
        });
      }
    } else if (timePeriod === 'hour') {
      // Generate 24 hours for the most recent day of each week
      const dayDate = new Date(basePeriod);
      for (let hour = 0; hour < 24; hour++) {
        const hourDate = new Date(dayDate);
        hourDate.setHours(hour);
        
        // Add hourly variation (±1%)
        const variation = (Math.random() - 0.5) * 0.02;
        const simulatedPrice = basePrice * (1 + variation);
        
        simulatedData.push({
          ...weekItem,
          value: simulatedPrice.toFixed(3),
          period: hourDate.toISOString(),
          'period-description': `Hour ${hour}:00 of ${basePeriod}`,
          simulated: true
        });
      }
    }
  });
  
  // Sort by period descending (newest first)
  return simulatedData.sort((a, b) => new Date(b.period).getTime() - new Date(a.period).getTime());
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
