import { useEffect, useState, useCallback, useMemo } from 'react';
import { getPrices, setAuthToken, clearAuthToken, createAlert, createOrder } from './api';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  AlertTriangle, 
  ShoppingCart, 
  LogOut, 
  User, 
  ChevronLeft, 
  ChevronRight,
  BarChart3,
  Bell,
  Filter,
  Download,
  RefreshCw,
  Fuel,
  MapPin,
  Calendar,
  Activity,
  Mail,
  Lock,
  LogIn,
  UserPlus
} from 'lucide-react';
import { motion } from 'framer-motion';


ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

// Night mode hook
function useDarkMode() {
  const [dark, setDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });
  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [dark]);
  return [dark, setDark] as const;
}


const Dashboard: React.FC = () => {
  const [dark, setDark] = useDarkMode();
  const [prices, setPrices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Auth states
  const [user, setUser] = useState<{ name?: string; email: string; role: string } | null>(null);
  const [, setShowAuth] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '', role: 'trucker' });
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  
  // Alert states
  const [alertForm, setAlertForm] = useState({ product: '', area: '', threshold: '' });
  const [alertLoading, setAlertLoading] = useState(false);
  const [alertError, setAlertError] = useState<string | null>(null);
  const [alertSuccess, setAlertSuccess] = useState<string | null>(null);
  
  // Order states
  const [orderForm, setOrderForm] = useState({ product: '', area: '', quantity: '', targetPrice: '', location: '' });
  const [orders, setOrders] = useState<any[]>([]);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Check for existing auth token on component mount
  useEffect(() => {
    const validateToken = async () => {
      const token = localStorage.getItem('auth_token');
      const userData = localStorage.getItem('user_data');
      
      if (token && userData) {
        try {
          // Test if token is valid by making a simple API call
          const res = await fetch('/api/prices', {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (res.ok) {
            const parsed = JSON.parse(userData);
            setUser(parsed);
            setAuthToken(token);
            setShowAuth(false);
          } else {
            // Token is invalid, clear it
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user_data');
            clearAuthToken();
          }
        } catch (error) {
          // Network error or invalid token
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user_data');
          clearAuthToken();
        }
      }
    };
    
    validateToken();
  }, []);

  // Helper function to store auth data
  const storeAuthData = useCallback((token: string, email: string, role: string) => {
    localStorage.setItem('auth_token', token);
    const name = authForm.name || '';
    localStorage.setItem('user_data', JSON.stringify({ name, email, role }));
    setAuthToken(token);
    setUser({ name, email, role });
    setShowAuth(false);
  }, []);

  // Auth handler
  const handleAuth = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    
    try {
      if (authMode === 'register') {
        // Register user
        const registerRes = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            name: authForm.name, 
            email: authForm.email, 
            password: authForm.password, 
            role: authForm.role 
          }),
        });
        
        const registerData = await registerRes.json();
        if (!registerRes.ok) throw new Error(registerData.detail || 'Registration failed');
        
        // Auto-login after registration
        const loginRes = await fetch('/api/auth/login/json', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: authForm.email, password: authForm.password }),
        });
        
        const loginData = await loginRes.json();
        if (!loginRes.ok) throw new Error(loginData.detail || 'Login failed');
        
        storeAuthData(loginData.access_token, authForm.email, authForm.role);
      } else {
        // Login flow
        const res = await fetch('/api/auth/login/json', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: authForm.email, password: authForm.password }),
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Authentication failed');
        
        storeAuthData(data.access_token, authForm.email, data.user?.role || authForm.role);
      }
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  }, [authMode, authForm, storeAuthData]);

  // Alert submission handler
  const handleAlertSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setAlertLoading(true);
    setAlertError(null);
    setAlertSuccess(null);
    
    try {
      await createAlert({
        product: alertForm.product,
        area: alertForm.area,
        threshold: parseFloat(alertForm.threshold),
      });
      
      setAlertSuccess('Alert saved!');
      setAlertForm({ product: '', area: '', threshold: '' });
    } catch (err: any) {
      setAlertError(err.message);
    } finally {
      setAlertLoading(false);
    }
  }, [user, alertForm]);

  // Order submission handler
  const handleOrderSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    // Basic validation
    if (!orderForm.product || !orderForm.area || !orderForm.quantity || !orderForm.targetPrice || !orderForm.location) {
      setOrderError('All fields are required.');
      return;
    }
    if (isNaN(Number(orderForm.quantity)) || Number(orderForm.quantity) <= 0) {
      setOrderError('Quantity must be a positive number.');
      return;
    }
    if (isNaN(Number(orderForm.targetPrice)) || Number(orderForm.targetPrice) <= 0) {
      setOrderError('Target price must be a positive number.');
      return;
    }
    setOrderLoading(true);
    setOrderError(null);
    setOrderSuccess(null);
    try {
      await createOrder({
        product: orderForm.product,
        area: orderForm.area,
        quantity: parseInt(orderForm.quantity),
        target_price: parseFloat(orderForm.targetPrice),
        location: orderForm.location,
      });
      setOrderSuccess('Order setup successful! You will be notified when price hits your target.');
      setOrderForm({ product: '', area: '', quantity: '', targetPrice: '', location: '' });
      // Refresh order history
      fetchOrders();
    } catch (err: any) {
      setOrderError(err.message);
    } finally {
      setOrderLoading(false);
    }
  }, [user, orderForm]);

  // Fetch order history for owner
  const fetchOrders = useCallback(async () => {
    if (!user || user.role !== 'owner') return;
    try {
      const res = await fetch('/api/orders', {
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
      });
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      setOrders([]);
    }
  }, [user]);

  useEffect(() => {
    if (user && user.role === 'owner') {
      fetchOrders();
    }
  }, [user, fetchOrders]);

  // Fetch prices when user changes
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    const fetchPrices = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getPrices();
        const apiData = res.data || [];
        setPrices(Array.isArray(apiData) ? apiData : []);
      } catch (err: any) {
        console.error('Failed to fetch prices:', err);
        if (err.message.includes('503') || err.message.includes('Service')) {
          setError('EIA service is temporarily unavailable. Trying to use cached data...');
        } else if (err.message.includes('429') || err.message.includes('rate limit')) {
          setError('Rate limit exceeded. Please wait a moment and refresh.');
        } else {
          setError('Failed to fetch prices. Please check your connection and try again.');
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchPrices();
  }, [user]);

  // Refresh function - moved before early returns to fix hook order
  const refreshPrices = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getPrices();
      const apiData = res.data || [];
      setPrices(Array.isArray(apiData) ? apiData : []);
    } catch (err: any) {
      console.error('Failed to refresh prices:', err);
      if (err.message.includes('503') || err.message.includes('Service')) {
        setError('EIA service is temporarily unavailable. Please try again in a few minutes.');
      } else if (err.message.includes('429') || err.message.includes('rate limit')) {
        setError('Rate limit exceeded. Please wait a moment before refreshing.');
      } else {
        setError('Failed to fetch prices. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Memoized calculations for better performance - moved before early returns
  const { paginatedPrices, totalPages, chartData, stats } = useMemo(() => {
    if (!Array.isArray(prices) || prices.length === 0) {
      return {
        paginatedPrices: [],
        totalPages: 0,
        chartData: { labels: [], datasets: [] },
        stats: { latest: { value: '-', period: '-', 'area-name': '-' }, minPrice: '-', maxPrice: '-', avgPrice: '-' }
      };
    }

    // Pagination
    const totalPages = Math.ceil(prices.length / pageSize);
    const paginatedPrices = prices.slice((page - 1) * pageSize, page * pageSize);

    // Chart data (last 50 prices)
    const chartPrices = prices.slice(0, 50).reverse();
    const chartData = {
      labels: chartPrices.map((item) => item?.period ?? ''),
      datasets: [{
        label: 'Price ($/GAL)',
        data: chartPrices.map((item) => Number(item?.value ?? 0)),
        borderColor: '#007bff',
        backgroundColor: 'rgba(0,123,255,0.1)',
        tension: 0.2,
        pointRadius: 2,
      }],
    };

    // Stats calculation
    const latest = prices[0];
    const numericPrices = prices.map((p) => Number(p?.value ?? 0)).filter(p => p > 0);
    const minPrice = numericPrices.length > 0 ? Math.min(...numericPrices) : '-';
    const maxPrice = numericPrices.length > 0 ? Math.max(...numericPrices) : '-';
    const avgPrice = numericPrices.length > 0 
      ? (numericPrices.reduce((sum, p) => sum + p, 0) / numericPrices.length).toFixed(3)
      : '-';

    return {
      paginatedPrices,
      totalPages,
      chartData,
      stats: { latest, minPrice, maxPrice, avgPrice }
    };
  }, [prices, page, pageSize]);

  const lineOptions = useMemo(() => ({
    responsive: true,
    plugins: {
      legend: { display: true, position: 'top' as const },
      title: { display: true, text: 'Fuel Price Trend (Last 50 Weeks)' },
    },
    scales: {
      x: { title: { display: true, text: 'Date' } },
      y: { title: { display: true, text: 'Price ($/GAL)' } },
    },
  }), []);

  // Early returns after all hooks are defined
  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
      <div className="text-lg">Loading prices...</div>
    </div>
  );

  if (error && prices.length === 0) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
      <Card className="max-w-md p-6 text-center">
        <div className="text-destructive text-lg mb-4">{error}</div>
        <Button onClick={refreshPrices} disabled={loading} className="flex items-center gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Retrying...' : 'Try Again'}
        </Button>
      </Card>
    </div>
  );

  // If no user is logged in, show auth modal with a backdrop
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="mb-8">
            <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl inline-block mb-4">
              <Fuel className="h-12 w-12 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
              Oil Price Tracker
            </h1>
            <p className="text-slate-600 text-lg">Real-time fuel analytics for truckers and truck stop owners</p>
          </div>
          
          {/* Direct Auth Form (not in modal) */}
      <Card className="w-full max-w-md mx-auto shadow-xl bg-card text-card-foreground">
            <CardHeader className="bg-card text-card-foreground">
              <CardTitle className="text-center flex items-center justify-center gap-2">
                <div className="p-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg">
                  <User className="h-5 w-5 text-white" />
                </div>
                {authMode === 'login' ? 'Welcome Back' : 'Create Account'}
              </CardTitle>
              <CardDescription className="text-center">
                {authMode === 'login' 
                  ? 'Sign in to access your fuel price dashboard' 
                  : 'Join thousands of truckers and truck stop owners'
                }
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Toggle Buttons */}
              <div className="flex p-1 bg-slate-100 rounded-lg">
                <Button
                  type="button"
                  variant={authMode === 'login' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => { setAuthMode('login'); setAuthError(null); }}
                  className="flex-1"
                >
                  Login
                </Button>
                <Button
                  type="button"
                  variant={authMode === 'register' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => { setAuthMode('register'); setAuthError(null); }}
                  className="flex-1"
                >
                  Register
                </Button>
              </div>

              {/* Auth Form */}
              <form onSubmit={handleAuth} className="space-y-4">
                {authMode === 'register' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        type="text"
                        placeholder="Enter your full name"
                        value={authForm.name}
                        onChange={e => setAuthForm(f => ({ ...f, name: e.target.value }))}
                        required
                        className="pl-10"
                      />
                    </div>
                  </div>
                )}
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      type="email"
                      placeholder="Enter your email"
                      value={authForm.email}
                      onChange={e => setAuthForm(f => ({ ...f, email: e.target.value }))}
                      required
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      type="password"
                      placeholder="Enter your password"
                      value={authForm.password}
                      onChange={e => setAuthForm(f => ({ ...f, password: e.target.value }))}
                      required
                      className="pl-10"
                    />
                  </div>
                </div>
                
                {authMode === 'register' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Role</label>
                    <Select value={authForm.role} onValueChange={value => setAuthForm(f => ({ ...f, role: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your role" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-slate-200 shadow-lg">
                        <SelectItem value="trucker" className="bg-white hover:bg-slate-50">🚛 Trucker</SelectItem>
                        <SelectItem value="owner" className="bg-white hover:bg-slate-50">⛽ Truck Stop Owner</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {authError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm text-center flex items-center justify-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    {authError}
                  </div>
                )}
                
                <Button 
                  type="submit" 
                  disabled={authLoading}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  {authLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      {authMode === 'login' ? 'Signing in...' : 'Creating account...'}
                    </>
                  ) : (
                    <>
                      {authMode === 'login' ? (
                        <>
                          <LogIn className="h-4 w-4 mr-2" />
                          Sign In
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Create Account
                        </>
                      )}
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }


  // Show 'Coming Soon' for truckers (return early, before any price fetch logic)
  if (user && user.role === 'trucker') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Card className="max-w-md p-8 text-center shadow-xl bg-card text-card-foreground">
          <div className="flex flex-col items-center gap-4">
            <Fuel className="h-12 w-12 text-blue-500 mb-2" />
            <h2 className="text-3xl font-bold mb-2">Coming Soon</h2>
            <p className="text-lg text-slate-600 mb-4">The trucker dashboard is under construction.<br />Stay tuned for real-time gas prices, maps, and more!</p>
            <Button onClick={() => { clearAuthToken(); setUser(null); setShowAuth(true); }} variant="outline" className="mt-2">Logout</Button>
          </div>
        </Card>
      </div>
    );
  }

  // Defensive: fallback for empty or malformed data
  // Defensive: fallback for empty or malformed data
  if (user && user.role === 'trucker') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Card className="max-w-md p-8 text-center shadow-xl bg-card text-card-foreground">
          <div className="flex flex-col items-center gap-4">
            <Fuel className="h-12 w-12 text-blue-500 mb-2" />
            <h2 className="text-3xl font-bold mb-2">Coming Soon</h2>
            <p className="text-lg text-slate-600 mb-4">The trucker dashboard is under construction.<br />Stay tuned for real-time gas prices, maps, and more!</p>
            <Button onClick={() => { clearAuthToken(); setUser(null); setShowAuth(true); }} variant="outline" className="mt-2">Logout</Button>
          </div>
        </Card>
      </div>
    );
  }
  if (!Array.isArray(prices) || prices.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-lg">No price data available.</div>
      </div>
    );
  }

  // ...existing code...

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Modern Header */}
      <motion.header 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-white/80 backdrop-blur-lg border-b border-slate-200/50 sticky top-0 z-50"
      >
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl">
                <Fuel className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent dark:text-foreground">
                  Oil Price Tracker
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-300">Real-time fuel analytics dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                aria-label="Toggle night mode"
                onClick={() => setDark(d => !d)}
                className={
                  `rounded-full p-2 border border-slate-200/50 bg-white/80 dark:bg-slate-800 dark:border-slate-700 transition-colors shadow hover:bg-slate-100 dark:hover:bg-slate-700`
                }
                title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {dark ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m8.66-13.66l-.71.71M4.05 19.07l-.71.71M21 12h-1M4 12H3m16.66 5.66l-.71-.71M4.05 4.93l-.71-.71M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z" /></svg>
                )}
              </button>
              {user && (
                <>
                  <Card className="px-4 py-2 shadow-sm bg-card" style={{ color: '#000' }}>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="p-1.5 bg-blue-100 rounded-full">
                        <User className="h-3 w-3 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium" style={{ color: '#000' }}>{user.name || user.email}</p>
                        <p className="text-xs text-slate-500 capitalize">{user.role}</p>
                      </div>
                    </div>
                  </Card>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => { clearAuthToken(); setUser(null); setShowAuth(true); }}
                    className="flex items-center gap-2 hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-900/30 dark:hover:text-red-400 dark:hover:border-red-700"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </Button>
                </>
              )}
            </div>
          </div>
          {/* Analytics Controls */}
          <div className="flex flex-wrap gap-4 mt-6 items-center">
            <div>
              <label className="text-sm font-medium mr-2">Area:</label>
              <Select value={alertForm.area} onValueChange={value => setAlertForm(f => ({ ...f, area: value }))}>
                <SelectTrigger className="min-w-[160px]">
                  <SelectValue placeholder="East Coast" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-slate-200 shadow-lg">
                  <SelectItem value="East Coast" className="bg-white hover:bg-slate-50">East Coast</SelectItem>
                  <SelectItem value="National" className="bg-white hover:bg-slate-50">National</SelectItem>
                  <SelectItem value="Midwest" className="bg-white hover:bg-slate-50">Midwest</SelectItem>
                  <SelectItem value="California" className="bg-white hover:bg-slate-50">California</SelectItem>
                  <SelectItem value="Texas" className="bg-white hover:bg-slate-50">Texas</SelectItem>
                  <SelectItem value="Southeast" className="bg-white hover:bg-slate-50">Southeast</SelectItem>
                  <SelectItem value="Other" className="bg-white hover:bg-slate-50">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mr-2">History:</label>
              <Select value={String(pageSize)} onValueChange={value => setPageSize(Number(value))}>
                <SelectTrigger className="min-w-[120px]">
                  <SelectValue placeholder="7 days" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-slate-200 shadow-lg">
                  <SelectItem value="7" className="bg-white hover:bg-slate-50">7 days</SelectItem>
                  <SelectItem value="30" className="bg-white hover:bg-slate-50">30 days</SelectItem>
                  <SelectItem value="90" className="bg-white hover:bg-slate-50">90 days</SelectItem>
                  <SelectItem value="365" className="bg-white hover:bg-slate-50">1 year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>
      </motion.header>

      <main className="container mx-auto px-6 py-8 space-y-8">
        {/* Error Banner for API issues with cached data */}
        {error && prices.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-50 border border-amber-200 rounded-lg p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-800">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">Using cached data - {error}</span>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={refreshPrices}
                disabled={loading}
                className="text-amber-700 border-amber-300 hover:bg-amber-100"
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Retry
              </Button>
            </div>
          </motion.div>
        )}

        {/* Quick Actions Panel */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {/* Price Alert Form */}
          <Card className="shadow-lg border-slate-200/50 bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Bell className="h-4 w-4 text-amber-600" />
                </div>
                Price Alerts
              </CardTitle>
              <CardDescription>Get notified when fuel prices reach your target threshold</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Price Alert Form */}
                <form onSubmit={handleAlertSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Fuel Type</label>
                    <Select value={alertForm.product} onValueChange={value => setAlertForm(f => ({ ...f, product: value }))}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Select fuel type" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-slate-200 shadow-lg">
                        <SelectItem value="Diesel" className="bg-white hover:bg-slate-50">🚛 Diesel</SelectItem>
                        <SelectItem value="Gasoline" className="bg-white hover:bg-slate-50">⛽ Gasoline</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Area</label>
                    <Input
                      type="text"
                      placeholder="e.g., Midwest, National, California"
                      value={alertForm.area}
                      required
                      className="pl-10 bg-white/50"
                      onChange={e => setAlertForm(f => ({ ...f, area: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Threshold Price</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={alertForm.threshold}
                        required
                        className="pl-10 bg-white/50"
                        onChange={e => setAlertForm(f => ({ ...f, threshold: e.target.value }))}
                      />
                    </div>
                  </div>
                  {alertError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      {alertError}
                    </div>
                  )}
                  {alertSuccess && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm">
                      <div className="flex items-start gap-2">
                        <Activity className="h-4 w-4 mt-0.5" />
                        {alertSuccess}
                      </div>
                    </div>
                  )}
                  <Button type="submit" disabled={alertLoading} className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600">
                    {alertLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Setting up alert...
                      </>
                    ) : (
                      <>
                        <Bell className="h-4 w-4 mr-2" />
                        Set Alert
                      </>
                    )}
                  </Button>
                </form>
                {/* Automated Order Form */}
                <form onSubmit={handleOrderSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Fuel Type</label>
                      <Select value={orderForm.product} onValueChange={value => setOrderForm(f => ({ ...f, product: value }))}>
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="Select fuel" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border border-slate-200 shadow-lg">
                          <SelectItem value="Diesel" className="bg-white hover:bg-slate-50">🚛 Diesel</SelectItem>
                          <SelectItem value="Gasoline" className="bg-white hover:bg-slate-50">⛽ Gasoline</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Quantity (Gallons)</label>
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        placeholder="1000"
                        value={orderForm.quantity}
                        required
                        className="bg-white/50"
                        onChange={e => setOrderForm(f => ({ ...f, quantity: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Area</label>
                    <Input
                      type="text"
                      placeholder="e.g., Midwest, National, California"
                      value={orderForm.area}
                      required
                      className="pl-10 bg-white/50"
                      onChange={e => setOrderForm(f => ({ ...f, area: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Location</label>
                    <Input
                      type="text"
                      placeholder="e.g., address or city"
                      value={orderForm.location}
                      required
                      className="pl-10 bg-white/50"
                      onChange={e => setOrderForm(f => ({ ...f, location: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Target Price</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={orderForm.targetPrice}
                        required
                        className="pl-10 bg-white/50"
                        onChange={e => setOrderForm(f => ({ ...f, targetPrice: e.target.value }))}
                      />
                    </div>
                  </div>
                  {orderError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      {orderError}
                    </div>
                  )}
                  {orderSuccess && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm">
                      <div className="flex items-start gap-2">
                        <Activity className="h-4 w-4 mt-0.5" />
                        {orderSuccess}
                      </div>
                    </div>
                  )}
                  <Button type="submit" disabled={orderLoading} className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600">
                    {orderLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Setting up order...
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Set Up Automated Order
                      </>
                    )}
                  </Button>
                </form>
                {/* Order History Table */}
                <div className="md:col-span-2 mt-8">
                  <h3 className="text-lg font-semibold mb-2">Order History</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Area</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Target Price</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-slate-500">No orders found.</TableCell>
                        </TableRow>
                      ) : (
                        orders.map((order: any) => (
                          <TableRow key={order.id}>
                            <TableCell>{new Date(order.created_at).toLocaleString()}</TableCell>
                            <TableCell>{order.product}</TableCell>
                            <TableCell>{order.area}</TableCell>
                            <TableCell>{order.location}</TableCell>
                            <TableCell>{order.quantity}</TableCell>
                            <TableCell>${order.target_price}</TableCell>
                            <TableCell>{order.status}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats Dashboard */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
        <Card className="shadow-lg border-slate-200/50 bg-card text-card-foreground backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600 mb-1">Latest Price</p>
                  <p className="text-2xl font-bold text-green-900">${stats.latest.value}</p>
                  <p className="text-xs text-green-700 mt-1">per gallon</p>
                </div>
                <div className="p-3 bg-green-200/50 rounded-full">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-green-600">
                <Calendar className="h-3 w-3" />
                <span>{stats.latest.period}</span>
                <MapPin className="h-3 w-3 ml-2" />
                <span>{stats.latest['area-name']}</span>
              </div>
            </CardContent>
          </Card>

        <Card className="shadow-lg border-slate-200/50 bg-card text-card-foreground backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600 mb-1">Average Price</p>
                  <p className="text-2xl font-bold text-blue-900">${stats.avgPrice}</p>
                  <p className="text-xs text-blue-700 mt-1">per gallon</p>
                </div>
                <div className="p-3 bg-blue-200/50 rounded-full">
                  <BarChart3 className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div className="mt-3 text-xs text-blue-600">
                All-time average
              </div>
            </CardContent>
          </Card>

        <Card className="shadow-lg border-slate-200/50 bg-card text-card-foreground backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-600 mb-1">Highest Price</p>
                  <p className="text-2xl font-bold text-red-900">${stats.maxPrice}</p>
                  <p className="text-xs text-red-700 mt-1">per gallon</p>
                </div>
                <div className="p-3 bg-red-200/50 rounded-full">
                  <TrendingUp className="h-6 w-6 text-red-600" />
                </div>
              </div>
              <div className="mt-3 text-xs text-red-600">
                Peak price recorded
              </div>
            </CardContent>
          </Card>

        <Card className="shadow-lg border-slate-200/50 bg-card text-card-foreground backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-emerald-600 mb-1">Lowest Price</p>
                  <p className="text-2xl font-bold text-emerald-900">${stats.minPrice}</p>
                  <p className="text-xs text-emerald-700 mt-1">per gallon</p>
                </div>
                <div className="p-3 bg-emerald-200/50 rounded-full">
                  <TrendingDown className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
              <div className="mt-3 text-xs text-emerald-600">
                Best price recorded
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Price Chart */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
        <Card className="shadow-lg border-slate-200/50 bg-card text-card-foreground backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <BarChart3 className="h-5 w-5 text-blue-600" />
                    </div>
                    Fuel Price Trends
                  </CardTitle>
                  <CardDescription>Historical price movements over the last 50 weeks</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="bg-white/50">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="bg-white/50"
                    onClick={refreshPrices}
                    disabled={loading}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-80">
                <div style={{ width: '100%', height: '320px' }}>
                  <Line data={chartData} options={lineOptions} />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Data Table */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
        <Card className="shadow-lg border-slate-200/50 bg-card text-card-foreground backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <div className="p-2 bg-slate-100 rounded-lg">
                      <Filter className="h-5 w-5 text-slate-600" />
                    </div>
                    Fuel Prices Data
                  </CardTitle>
                  <CardDescription>Detailed breakdown of current fuel prices by region</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="bg-white/50">
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                  </Button>
                  <Button variant="outline" size="sm" className="bg-white/50">
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50">
                      <TableHead className="font-semibold text-slate-700">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Date
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          Area
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700">
                        <div className="flex items-center gap-2">
                          <Fuel className="h-4 w-4" />
                          Product
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Price ($/GAL)
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedPrices.map((item, idx) => (
                      <TableRow key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <TableCell className="font-medium text-slate-700">{item.period}</TableCell>
                        <TableCell className="text-slate-600">{item['area-name']}</TableCell>
                        <TableCell className="text-slate-600">{item['product-name']}</TableCell>
                        <TableCell className="font-semibold text-green-600">${item.value}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {/* Modern Pagination */}
              <div className="flex items-center justify-between p-6 border-t border-slate-200/50 bg-slate-50/30">
                <div className="text-sm text-slate-600">
                  Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, prices.length)} of {prices.length} results
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className="bg-white/50"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md text-sm font-medium">
                    Page {page} of {totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={page === totalPages}
                    className="bg-white/50"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
};

export default Dashboard;
