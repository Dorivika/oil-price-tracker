import * as React from 'react';
import { useEffect, useState } from 'react';
import { getPrices, setAuthToken, clearAuthToken } from './api';
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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


const Dashboard: React.FC = () => {
  const [prices, setPrices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Auth states
  const [user, setUser] = useState<{ email: string; role: string } | null>(null);
  const [showAuth, setShowAuth] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authForm, setAuthForm] = useState({ email: '', password: '', role: 'trucker' });
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  
  // Alert states
  const [alertForm, setAlertForm] = useState({ product: '', area: '', threshold: '' });
  const [alertLoading, setAlertLoading] = useState(false);
  const [alertError, setAlertError] = useState<string | null>(null);
  const [alertSuccess, setAlertSuccess] = useState<string | null>(null);
  
  // Order states
  const [orderForm, setOrderForm] = useState({ product: '', area: '', quantity: '', targetPrice: '' });
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Check for existing auth token on component mount
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const userData = localStorage.getItem('user_data');
    if (token && userData) {
      setUser(JSON.parse(userData));
      setAuthToken(token);
      setShowAuth(false);
    }
  }, []);

  // Auth handler
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    
    try {
      const endpoint = authMode === 'login' ? '/api/auth/login/json' : '/api/auth/register';
      const body = authMode === 'login' 
        ? { email: authForm.email, password: authForm.password }
        : { email: authForm.email, password: authForm.password, role: authForm.role };
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Authentication failed');
      
      // Store token and user data
      localStorage.setItem('auth_token', data.access_token);
      localStorage.setItem('user_data', JSON.stringify({ email: authForm.email, role: authForm.role }));
      setAuthToken(data.access_token);
      setUser({ email: authForm.email, role: authForm.role });
      setShowAuth(false);
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getPrices()
      .then((res: any) => {
        // ...existing code...
        let apiData = [];
        if (res.data && typeof res.data === 'object' && !Array.isArray(res.data) && res.data.response && Array.isArray(res.data.response.data)) {
          apiData = res.data.response.data;
        } else if (res.data && typeof res.data === 'object' && !Array.isArray(res.data) && Array.isArray(res.data.data)) {
          apiData = res.data.data;
        } else if (Array.isArray(res.data)) {
          apiData = res.data;
        }
        setPrices(apiData);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to fetch prices');
        setLoading(false);
      });
  }, [user]);

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
      <div className="text-lg">Loading prices...</div>
    </div>
  );
  
  if (error) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
      <div className="text-destructive text-lg">{error}</div>
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
          <Card className="w-full max-w-md mx-auto shadow-xl">
            <CardHeader>
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
                      <SelectContent>
                        <SelectItem value="trucker">🚛 Trucker</SelectItem>
                        <SelectItem value="truck_stop_owner">⛽ Truck Stop Owner</SelectItem>
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

  // Defensive: fallback for empty or malformed data
  if (!Array.isArray(prices) || prices.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-lg">No price data available.</div>
      </div>
    );
  }

  // Pagination logic
  const totalPages = Math.ceil(prices.length / pageSize);
  const paginatedPrices = prices.slice((page - 1) * pageSize, page * pageSize);

  // Chart data (show last 50 prices)
  const chartData = prices.slice(0, 50).reverse();
  const lineData = {
    labels: chartData.map((item) => item?.period ?? ''),
    datasets: [
      {
        label: 'Price ($/GAL)',
        data: chartData.map((item) => Number(item?.value ?? 0)),
        borderColor: '#007bff',
        backgroundColor: 'rgba(0,123,255,0.1)',
        tension: 0.2,
        pointRadius: 2,
      },
    ],
  };
  const lineOptions = {
    responsive: true,
    plugins: {
      legend: { display: true, position: 'top' as const },
      title: { display: true, text: 'Fuel Price Trend (Last 50 Weeks)' },
    },
    scales: {
      x: { title: { display: true, text: 'Date' } },
      y: { title: { display: true, text: 'Price ($/GAL)' } },
    },
  };

  // Summary stats (defensive, declared only once)
  let latest: any = { value: '-', period: '-', 'area-name': '-' };
  let minPrice: string | number = '-';
  let maxPrice: string | number = '-';
  let avgPrice: string | number = '-';
  if (Array.isArray(prices) && prices.length > 0) {
    latest = prices[0];
    minPrice = Math.min(...prices.map((p) => Number(p?.value ?? 0)));
    maxPrice = Math.max(...prices.map((p) => Number(p?.value ?? 0)));
    avgPrice = (
      prices.reduce((sum, p) => sum + Number(p?.value ?? 0), 0) / prices.length
    ).toFixed(3);
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
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Oil Price Tracker
                </h1>
                <p className="text-sm text-slate-600">Real-time fuel analytics dashboard</p>
              </div>
            </div>
            {user && (
              <div className="flex items-center gap-4">
                <Card className="px-4 py-2 shadow-sm border-slate-200/50">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="p-1.5 bg-blue-100 rounded-full">
                      <User className="h-3 w-3 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{user.email}</p>
                      <p className="text-xs text-slate-500 capitalize">{user.role}</p>
                    </div>
                  </div>
                </Card>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => { clearAuthToken(); setUser(null); setShowAuth(true); }}
                  className="flex items-center gap-2 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </div>
            )}
          </div>
        </div>
      </motion.header>

      <main className="container mx-auto px-6 py-8 space-y-8">
        {/* Quick Actions Panel */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid md:grid-cols-2 gap-6"
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
              <form
                onSubmit={async e => {
                  e.preventDefault();
                  if (!user) return;
                  
                  const alert = {
                    email: user.email,
                    role: user.role,
                    product: alertForm.product,
                    area: alertForm.area,
                    threshold: alertForm.threshold,
                  };
                  setAlertLoading(true);
                  setAlertError(null);
                  try {
                    const res = await fetch('/api/alerts', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(alert),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.message || 'Failed to set alert');
                    setAlertSuccess('Alert saved!');
                  } catch (err: any) {
                    setAlertError(err.message);
                  } finally {
                    setAlertLoading(false);
                  }
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Fuel Type</label>
                  <Select value={alertForm.product} onValueChange={value => setAlertForm(f => ({ ...f, product: value }))}>
                    <SelectTrigger className="bg-white/50">
                      <SelectValue placeholder="Select fuel type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Diesel">🚛 Diesel</SelectItem>
                      <SelectItem value="Gasoline">⛽ Gasoline</SelectItem>
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
                    className="bg-white/50"
                    onChange={e => setAlertForm(f => ({ ...f, area: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Price Threshold</label>
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
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    {alertSuccess}
                  </div>
                )}
                
                <Button type="submit" disabled={alertLoading} className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600">
                  {alertLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Setting Alert...
                    </>
                  ) : (
                    <>
                      <Bell className="h-4 w-4 mr-2" />
                      Set Price Alert
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Automated Order Form */}
          <Card className="shadow-lg border-slate-200/50 bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="p-2 bg-green-100 rounded-lg">
                  <ShoppingCart className="h-4 w-4 text-green-600" />
                </div>
                Automated Orders
              </CardTitle>
              <CardDescription>Set up automatic fuel orders when prices hit your target</CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={async e => {
                  e.preventDefault();
                  if (!user) return;
                  
                  const order = {
                    email: user.email,
                    role: user.role,
                    product: orderForm.product,
                    area: orderForm.area,
                    quantity: orderForm.quantity,
                    targetPrice: orderForm.targetPrice,
                  };
                  setOrderLoading(true);
                  setOrderError(null);
                  try {
                    const res = await fetch('/api/orders', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(order),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.message || 'Failed to place order');
                    setOrderSuccess('Order setup successful! You will be notified and charged when price hits your target.');
                  } catch (err: any) {
                    setOrderError(err.message);
                  } finally {
                    setOrderLoading(false);
                  }
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Fuel Type</label>
                    <Select value={orderForm.product} onValueChange={value => setOrderForm(f => ({ ...f, product: value }))}>
                      <SelectTrigger className="bg-white/50">
                        <SelectValue placeholder="Select fuel" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Diesel">🚛 Diesel</SelectItem>
                        <SelectItem value="Gasoline">⛽ Gasoline</SelectItem>
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
                  <label className="text-sm font-medium text-slate-700">Location</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      type="text"
                      placeholder="e.g., Midwest, National, California"
                      value={orderForm.area}
                      required
                      className="pl-10 bg-white/50"
                      onChange={e => setOrderForm(f => ({ ...f, area: e.target.value }))}
                    />
                  </div>
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
          <Card className="shadow-lg border-slate-200/50 bg-gradient-to-br from-green-50 to-green-100/50 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600 mb-1">Latest Price</p>
                  <p className="text-2xl font-bold text-green-900">${latest.value}</p>
                  <p className="text-xs text-green-700 mt-1">per gallon</p>
                </div>
                <div className="p-3 bg-green-200/50 rounded-full">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-green-600">
                <Calendar className="h-3 w-3" />
                <span>{latest.period}</span>
                <MapPin className="h-3 w-3 ml-2" />
                <span>{latest['area-name']}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-slate-200/50 bg-gradient-to-br from-blue-50 to-blue-100/50 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600 mb-1">Average Price</p>
                  <p className="text-2xl font-bold text-blue-900">${avgPrice}</p>
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

          <Card className="shadow-lg border-slate-200/50 bg-gradient-to-br from-red-50 to-red-100/50 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-600 mb-1">Highest Price</p>
                  <p className="text-2xl font-bold text-red-900">${maxPrice}</p>
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

          <Card className="shadow-lg border-slate-200/50 bg-gradient-to-br from-emerald-50 to-emerald-100/50 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-emerald-600 mb-1">Lowest Price</p>
                  <p className="text-2xl font-bold text-emerald-900">${minPrice}</p>
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
          <Card className="shadow-lg border-slate-200/50 bg-white/80 backdrop-blur-sm">
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
                  <Button variant="outline" size="sm" className="bg-white/50">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-80">
                <Line data={lineData} options={lineOptions} />
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
          <Card className="shadow-lg border-slate-200/50 bg-white/80 backdrop-blur-sm">
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
