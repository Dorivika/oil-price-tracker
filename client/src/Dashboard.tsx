import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Vite provides import.meta.env globally, no need for custom interfaces

// Fix Leaflet icon issue
import icon from 'leaflet/dist/images/marker-icon.png';
// @ts-ignore
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

// Types
interface User {
  id: string;
  name: string;
  email: string;
  role: 'trucker' | 'owner';
}

interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

interface PriceItem {
  period: string;
  value: string | number;
  'area-name': string;
  'product-name': string;
  duoarea: string;
  product: string;
}

interface Alert {
  id: string;
  product: string;
  area: string;
  threshold: number;
  created_at: string;
}

interface Order {
  id: string;
  product: string;
  area: string;
  quantity: number;
  target_price: number;
  location?: string;
  status: string;
  created_at: string;
}

// API Client
// Make sure to use the FastAPI backend URL for all API calls
class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor() {
    // Use FastAPI backend URL, not frontend dev server
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    this.token = localStorage.getItem('token');
    console.log('ApiClient constructor - token from localStorage:', this.token ? 'Token found' : 'No token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    // Always get the latest token from localStorage
    this.token = localStorage.getItem('token');
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...options.headers,
    };

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers,
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error(`Invalid JSON response: ${text}`);
    }

    if (!response.ok) {
      throw new Error(data.detail || `API Error: ${response.status}`);
    }

    return data;
  }

  // Auth methods
  async login(email: string, password: string): Promise<AuthResponse> {
    // Use form data for FastAPI /auth/login endpoint
    const formData = new FormData();
    formData.append('username', email); // Backend expects 'username' field for email
    formData.append('password', password);
    
    const response = await fetch(`${this.baseURL}/auth/login`, {
      method: 'POST',
      body: formData,
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error(`Invalid JSON response: ${text}`);
    }

    if (!response.ok) {
      throw new Error(data.detail || `API Error: ${response.status}`);
    }

    console.log('Login successful, token received:', data.access_token ? 'Token present' : 'No token');
    this.setToken(data.access_token);
    console.log('Token set in localStorage:', localStorage.getItem('token') ? 'Token stored' : 'No token stored');
    return data;
  }

  async register(name: string, email: string, password: string, role: string): Promise<User> {
    return this.request<User>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role }),
    });
  }

  // Data methods
  async getPrices() {
    return this.request('/prices');
  }

  async createAlert(product: string, area: string, threshold: number): Promise<Alert> {
    return this.request<Alert>('/alerts', {
      method: 'POST',
      body: JSON.stringify({ product, area, threshold }),
    });
  }

  async getAlerts(): Promise<Alert[]> {
    // GET /alerts
    console.log('Getting alerts with token:', this.token ? 'Token present' : 'No token');
    return this.request<Alert[]>('/alerts', { method: 'GET' });
  }

  async deleteAlert(alertId: string): Promise<void> {
    // DELETE /alerts/{alertId}
    await this.request(`/alerts/${alertId}`, { method: 'DELETE' });
  }

  async createOrder(product: string, area: string, quantity: number, target_price: number, location?: string): Promise<Order> {
    // POST /orders
    return this.request<Order>('/orders', {
      method: 'POST',
      body: JSON.stringify({ product, area, quantity, target_price, location }),
    });
  }

  async getOrders(): Promise<Order[]> {
    // GET /orders
    return this.request<Order[]>('/orders', { method: 'GET' });
  }

  async createPaymentIntent(amount: number) {
    return this.request('/payments/create-intent', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  }
}

const apiClient = new ApiClient();

// Styles
const styles = {
  appBg: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    margin: 0,
    padding: 0,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    background: 'rgba(0, 0, 0, 0.2)',
    backdropFilter: 'blur(10px)',
    color: '#fff',
    padding: '1.5rem 2rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.1)',
  },
  container: {
    maxWidth: '1400px',
    margin: '2rem auto',
    padding: '0 2rem',
  },
  card: {
    background: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '16px',
    padding: '2rem',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
    marginBottom: '2rem',
  },
  button: {
    padding: '0.75rem 1.5rem',
    borderRadius: '8px',
    border: 'none',
    background: '#667eea',
    color: '#fff',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '1rem',
    transition: 'all 0.2s',
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    marginBottom: '1rem',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    fontSize: '1rem',
  },
  select: {
    width: '100%',
    padding: '0.75rem',
    marginBottom: '1rem',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    fontSize: '1rem',
    background: '#fff',
  },
};

// Auth Modal Component
const AuthModal: React.FC<{ onSuccess: (user: User) => void }> = ({ onSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'trucker',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'login') {
        const response = await apiClient.login(form.email, form.password);
        onSuccess(response.user);
      } else {
        await apiClient.register(form.name, form.email, form.password, form.role);
        // Auto-login after registration
        const response = await apiClient.login(form.email, form.password);
        onSuccess(response.user);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ ...styles.appBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={styles.card}>
        <h2 style={{ textAlign: 'center', marginBottom: '2rem', color: '#1a202c' }}>
          Oil Price Tracker
        </h2>
        <form onSubmit={handleSubmit} style={{ minWidth: '320px' }}>
          {mode === 'register' && (
            <input
              type="text"
              placeholder="Name"
              required
              style={styles.input}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          )}
          <input
            type="email"
            placeholder="Email"
            required
            style={styles.input}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            type="password"
            placeholder="Password (min 6 characters)"
            required
            minLength={6}
            style={styles.input}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          {mode === 'register' && (
            <select
              style={styles.select}
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="trucker">Trucker</option>
              <option value="owner">Truck Stop Owner</option>
            </select>
          )}
          {error && (
            <div style={{ color: '#e53e3e', marginBottom: '1rem', textAlign: 'center' }}>
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{ ...styles.button, width: '100%', marginBottom: '1rem' }}
          >
            {loading ? 'Processing...' : mode === 'login' ? 'Login' : 'Register'}
          </button>
        </form>
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            style={{ background: 'none', border: 'none', color: '#667eea', cursor: 'pointer' }}
          >
            {mode === 'login' ? "Don't have an account? Register" : 'Already have an account? Login'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Main Dashboard Component
// All hooks must be called unconditionally at the top level of the component
const Dashboard: React.FC = () => {
  // Hooks at top level
  const [user, setUser] = useState<User | null>(null);
  const [prices, setPrices] = useState<PriceItem[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [alertForm, setAlertForm] = useState({ product: 'Diesel', area: '', threshold: '' });
  const [orderForm, setOrderForm] = useState({ product: 'Diesel', area: '', quantity: '', targetPrice: '' });

  // Chart and table hooks
  const latestPrice = prices[0] || { value: 0, period: '-', 'area-name': '-' };
  const priceValues = prices.map(p => parseFloat(String(p.value))).filter(v => !isNaN(v));
  const avgPrice = priceValues.length ? (priceValues.reduce((a, b) => a + b, 0) / priceValues.length).toFixed(3) : '0';
  const minPrice = priceValues.length ? Math.min(...priceValues).toFixed(3) : '0';
  const maxPrice = priceValues.length ? Math.max(...priceValues).toFixed(3) : '0';
  const totalPages = Math.ceil(prices.length / pageSize);
  const paginatedPrices = prices.slice((page - 1) * pageSize, page * pageSize);
  const lineData = useMemo(() => {
    const chartData = prices.slice(0, 50).reverse();
    return {
      labels: chartData.map(item => item.period),
      datasets: [
        {
          label: 'Price ($/GAL)',
          data: chartData.map(item => parseFloat(String(item.value))),
          borderColor: '#667eea',
          backgroundColor: 'rgba(102, 126, 234, 0.1)',
          tension: 0.4,
        },
      ],
    };
  }, [prices]);
  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
      },
    },
    scales: {
      x: {
        display: true,
      },
      y: {
        display: true,
      },
    },
  }), []);
  const areaCoordinates: { [key: string]: [number, number] } = {
    'East Coast': [38.9072, -77.0369],
    'Midwest': [41.8781, -87.6298],
    'Gulf Coast': [29.7604, -95.3698],
    'Rocky Mountain': [39.7392, -104.9903],
    'West Coast': [34.0522, -118.2437],
    'U.S.': [39.8283, -98.5795],
    'New England': [42.3601, -71.0589],
    'Central Atlantic': [40.7128, -74.0060],
    'Lower Atlantic': [33.7490, -84.3880],
  };
  const pricesByArea = prices.reduce((acc, price) => {
    const area = price['area-name'];
    if (!acc[area]) {
      acc[area] = [];
    }
    acc[area].push(price);
    return acc;
  }, {} as { [key: string]: PriceItem[] });

  // Effects
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    }
  }, [user]);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      try {
        const pricesDataRaw = await apiClient.getPrices();
        type PricesApiResponse = { response?: { data?: PriceItem[] }, data?: PriceItem[] };
        const pricesData = pricesDataRaw as PricesApiResponse;
        let apiData: PriceItem[] = [];
        if (pricesData?.response?.data) {
          apiData = pricesData.response.data || [];
        } else if (pricesData?.data) {
          apiData = pricesData.data || [];
        }
        setPrices(apiData);
      } catch (error) {
        console.error('Failed to load prices:', error);
        setPrices([]);
      }
      try {
        const alertsData = await apiClient.getAlerts();
        setAlerts(alertsData);
      } catch (error) {
        console.error('Failed to load alerts:', error);
        setAlerts([]);
      }
      try {
        const ordersData = await apiClient.getOrders();
        setOrders(ordersData);
      } catch (error) {
        console.error('Failed to load orders:', error);
        setOrders([]);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handlers
  const handleLogout = () => {
    apiClient.setToken(null);
    setUser(null);
  };
  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.createAlert(alertForm.product, alertForm.area, parseFloat(alertForm.threshold));
      setAlertForm({ product: 'Diesel', area: '', threshold: '' });
      loadData();
    } catch (error: any) {
      alert(error.message);
    }
  };
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.createOrder(
        orderForm.product,
        orderForm.area,
        parseInt(orderForm.quantity),
        parseFloat(orderForm.targetPrice)
      );
      setOrderForm({ product: 'Diesel', area: '', quantity: '', targetPrice: '' });
      loadData();
    } catch (error: any) {
      alert(error.message);
    }
  };

  // Conditional rendering
  if (!user) {
    return <AuthModal onSuccess={setUser} />;
  }
  if (loading) {
    return (
      <div style={{ ...styles.appBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#fff', fontSize: '1.5rem' }}>Loading...</div>
      </div>
    );
  }

  // ...existing code...
  return (
    <div style={styles.appBg}>
      {/* ...existing dashboard UI... */}
    </div>
  );
};

export default Dashboard;