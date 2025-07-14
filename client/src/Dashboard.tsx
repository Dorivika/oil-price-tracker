import React, { useEffect, useState } from 'react';
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
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

// Modern dashboard styles
const styles = {
  appBg: {
    minHeight: '100vh',
    width: '100vw',
    background: 'linear-gradient(120deg, #e3e8ee 0%, #f8fafc 100%)',
    margin: 0,
    padding: 0,
  },
  header: {
    width: '100%',
    background: '#1a237e',
    color: '#fff',
    padding: '1.5rem 0',
    fontSize: 36,
    fontWeight: 900,
    textAlign: 'center',
    letterSpacing: 2,
    boxShadow: '0 2px 12px #0002',
    marginBottom: '2rem',
  },
  root: {
    width: '90vw',
    maxWidth: 1400,
    margin: '0 auto',
    background: 'linear-gradient(135deg, #f8fafc 0%, #e3e8ee 100%)',
    borderRadius: 18,
    boxShadow: '0 4px 32px #0002',
    padding: '2.5rem 2rem',
    fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
    color: '#222',
    minHeight: 'calc(100vh - 4rem)',
  },
  heading: {
    color: '#1a237e',
    marginBottom: 16,
    fontWeight: 800,
    fontSize: 32,
    letterSpacing: 1,
    textAlign: 'left',
  },
  summaryRow: {
    display: 'flex',
    gap: '2rem',
    marginBottom: '2.5rem',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  card: {
    flex: 1,
    minWidth: 220,
    background: 'linear-gradient(120deg, #fff 60%, #e3e8ee 100%)',
    borderRadius: 12,
    padding: '1.5rem 1rem',
    boxShadow: '0 2px 12px #0001',
    textAlign: 'center',
    margin: '0.5rem',
  },
  cardTitle: {
    margin: 0,
    fontWeight: 700,
    fontSize: 18,
    color: '#1976d2',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  cardValue: {
    fontSize: 32,
    fontWeight: 800,
    color: '#222',
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 15,
    color: '#555',
  },
  chartSection: {
    marginBottom: '2.5rem',
    background: '#fff',
    borderRadius: 12,
    padding: '1.5rem',
    boxShadow: '0 2px 8px #0001',
  },
  tableHeading: {
    color: '#1976d2',
    marginBottom: 12,
    fontWeight: 700,
    fontSize: 22,
    letterSpacing: 0.5,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 16,
    background: '#fff',
    borderRadius: 10,
    overflow: 'hidden',
    boxShadow: '0 1px 6px #0001',
  },
  th: {
    padding: '10px',
    background: '#1976d2',
    color: '#fff',
    fontWeight: 700,
    borderBottom: '2px solid #e3e8ee',
  },
  td: {
    padding: '10px',
    color: '#222',
    fontWeight: 500,
    borderBottom: '1px solid #e3e8ee',
  },
  trEven: {
    background: '#f5f7fa',
  },
  trOdd: {
    background: '#fff',
  },
  pagination: {
    marginTop: '1.5rem',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '1.5rem',
  },
  pageBtn: {
    padding: '10px 20px',
    borderRadius: 8,
    border: 'none',
    background: '#1976d2',
    color: '#fff',
    fontWeight: 700,
    fontSize: 16,
    cursor: 'pointer',
    boxShadow: '0 1px 4px #0001',
    transition: 'background 0.2s',
    outline: 'none',
  },
  pageBtnDisabled: {
    background: '#b0bec5',
    cursor: 'not-allowed',
  },
  pageInfo: {
    fontWeight: 700,
    fontSize: 16,
    color: '#222',
  },
};

const Dashboard: React.FC = () => {
  const [prices, setPrices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  // Auth state
  const [showAuth, setShowAuth] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [form, setForm] = useState({ email: '', password: '', role: 'trucker' });
  // Price alert state (moved up)
  const [alertForm, setAlertForm] = useState({ product: 'Diesel', area: '', threshold: '' });
  const [alertLoading, setAlertLoading] = useState(false);
  const [alertError, setAlertError] = useState<string | null>(null);
  const [alertSuccess, setAlertSuccess] = useState<string | null>(null);
  // Automated order state
  const [orderForm, setOrderForm] = useState({ product: 'Diesel', area: '', quantity: '', targetPrice: '' });
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
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
      .catch(err => {
        setError('Failed to fetch prices');
        setLoading(false);
      });
  }, [user]);

  if (loading) return <div>Loading prices...</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;
  // Auth modal
  if (showAuth) {
    return (
      <div style={{ ...styles.appBg, display: 'flex', alignItems: 'center', justifyContent: 'center' } as React.CSSProperties}>
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 16px #0002', padding: '2.5rem 2rem', minWidth: 340 }}>
          <h2 style={{ ...styles.heading, textAlign: 'center' }}>Oil Price Tracker</h2>
          <div style={{ marginBottom: 18, textAlign: 'center', color: '#1976d2', fontWeight: 700, fontSize: 18 }}>
            {authMode === 'login' ? 'Login' : 'Register'}
          </div>
          <form
            onSubmit={async e => {
              e.preventDefault();
              setAuthLoading(true);
              setAuthError(null);
              try {
                const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
                const res = await fetch(endpoint, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(form),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.message || 'Auth failed');
                setAuthToken(data.access_token);
                setUser(data.user);
                setShowAuth(false);
              } catch (err: any) {
                setAuthError(err.message);
              } finally {
                setAuthLoading(false);
              }
            }}
          >
            <input
              type="email"
              placeholder="Email"
              value={form.email}
              required
              style={{ width: '100%', padding: 10, marginBottom: 12, borderRadius: 8, border: '1px solid #b0bec5', fontSize: 16 }}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            />
            <input
              type="password"
              placeholder="Password"
              value={form.password}
              required
              style={{ width: '100%', padding: 10, marginBottom: 12, borderRadius: 8, border: '1px solid #b0bec5', fontSize: 16 }}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            />
            <select
              value={form.role}
              style={{ width: '100%', padding: 10, marginBottom: 18, borderRadius: 8, border: '1px solid #b0bec5', fontSize: 16 }}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
            >
              <option value="trucker">Trucker</option>
              <option value="owner">Truck Stop Owner</option>
            </select>
            {authError && <div style={{ color: 'red', marginBottom: 10 }}>{authError}</div>}
            <button
              type="submit"
              disabled={authLoading}
              style={{ ...styles.pageBtn, width: '100%', marginBottom: 10 }}
            >
              {authLoading ? 'Processing...' : (authMode === 'login' ? 'Login' : 'Register')}
            </button>
          </form>
          <div style={{ textAlign: 'center', marginTop: 8 }}>
            {authMode === 'login' ? (
              <span>Don&apos;t have an account?{' '}
                <button style={{ color: '#1976d2', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }} onClick={() => setAuthMode('register')}>Register</button>
              </span>
            ) : (
              <span>Already have an account?{' '}
                <button style={{ color: '#1976d2', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }} onClick={() => setAuthMode('login')}>Login</button>
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }
  // Defensive: fallback for empty or malformed data
  if (!Array.isArray(prices) || prices.length === 0) {
    return <div>No price data available.</div>;
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
    <div style={styles.appBg as React.CSSProperties}>
      <header style={styles.header as React.CSSProperties}>
        Oil Price Tracker Dashboard
        {user && (
          <div style={{ position: 'absolute', right: 30, top: 30, fontSize: 16, color: '#fff', fontWeight: 700 }}>
            {user.email} ({user.role})
            <button style={{ marginLeft: 16, background: '#d32f2f', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontWeight: 700, cursor: 'pointer' }} onClick={() => { clearAuthToken(); setUser(null); setShowAuth(true); }}>Logout</button>
          </div>
        )}
      </header>
      <main style={styles.root as React.CSSProperties}>
        {/* Price Alert Form */}
        <div style={{ marginBottom: '2.5rem', background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 2px 8px #0001', maxWidth: 500, marginLeft: 'auto', marginRight: 'auto' }}>
          <h3 style={{ color: '#1976d2', fontWeight: 700, fontSize: 20, marginBottom: 12 }}>Set Price Alert</h3>
          <form
            onSubmit={async e => {
              e.preventDefault();
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
          >
            <select
              value={alertForm.product}
              style={{ width: '100%', padding: 10, marginBottom: 12, borderRadius: 8, border: '1px solid #b0bec5', fontSize: 16 }}
              onChange={e => setAlertForm(f => ({ ...f, product: e.target.value }))}
            >
              <option value="Diesel">Diesel</option>
              <option value="Gasoline">Gasoline</option>
            </select>
            <input
              type="text"
              placeholder="Area (e.g. Midwest, National)"
              value={alertForm.area}
              required
              style={{ width: '100%', padding: 10, marginBottom: 12, borderRadius: 8, border: '1px solid #b0bec5', fontSize: 16 }}
              onChange={e => setAlertForm(f => ({ ...f, area: e.target.value }))}
            />
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="Price threshold ($/GAL)"
              value={alertForm.threshold}
              required
              style={{ width: '100%', padding: 10, marginBottom: 12, borderRadius: 8, border: '1px solid #b0bec5', fontSize: 16 }}
              onChange={e => setAlertForm(f => ({ ...f, threshold: e.target.value }))}
            />
            {alertError && <div style={{ color: 'red', marginBottom: 10 }}>{alertError}</div>}
            {alertSuccess && <div style={{ color: 'green', marginBottom: 10 }}>{alertSuccess}</div>}
            <button
              type="submit"
              disabled={alertLoading}
              style={{ ...styles.pageBtn, width: '100%' }}
            >
              {alertLoading ? 'Saving...' : 'Set Alert'}
            </button>
          </form>
        </div>
        {/* Automated Order Form */}
        <div style={{ marginBottom: '2.5rem', background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 2px 8px #0001', maxWidth: 500, marginLeft: 'auto', marginRight: 'auto' }}>
          <h3 style={{ color: '#1976d2', fontWeight: 700, fontSize: 20, marginBottom: 12 }}>Automated Order Placement</h3>
          <form
            onSubmit={async e => {
              e.preventDefault();
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
          >
            <select
              value={orderForm.product}
              style={{ width: '100%', padding: 10, marginBottom: 12, borderRadius: 8, border: '1px solid #b0bec5', fontSize: 16 }}
              onChange={e => setOrderForm(f => ({ ...f, product: e.target.value }))}
            >
              <option value="Diesel">Diesel</option>
              <option value="Gasoline">Gasoline</option>
            </select>
            <input
              type="text"
              placeholder="Area (e.g. Midwest, National)"
              value={orderForm.area}
              required
              style={{ width: '100%', padding: 10, marginBottom: 12, borderRadius: 8, border: '1px solid #b0bec5', fontSize: 16 }}
              onChange={e => setOrderForm(f => ({ ...f, area: e.target.value }))}
            />
            <input
              type="number"
              min="1"
              step="1"
              placeholder="Quantity (gallons)"
              value={orderForm.quantity}
              required
              style={{ width: '100%', padding: 10, marginBottom: 12, borderRadius: 8, border: '1px solid #b0bec5', fontSize: 16 }}
              onChange={e => setOrderForm(f => ({ ...f, quantity: e.target.value }))}
            />
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="Target price ($/GAL)"
              value={orderForm.targetPrice}
              required
              style={{ width: '100%', padding: 10, marginBottom: 12, borderRadius: 8, border: '1px solid #b0bec5', fontSize: 16 }}
              onChange={e => setOrderForm(f => ({ ...f, targetPrice: e.target.value }))}
            />
            {orderError && <div style={{ color: 'red', marginBottom: 10 }}>{orderError}</div>}
            {orderSuccess && <div style={{ color: 'green', marginBottom: 10 }}>{orderSuccess}</div>}
            <button
              type="submit"
              disabled={orderLoading}
              style={{ ...styles.pageBtn, width: '100%' }}
            >
              {orderLoading ? 'Placing...' : 'Set Up Automated Order'}
            </button>
          </form>
        </div>
        {/* ...existing code... */}
        <div style={styles.summaryRow as React.CSSProperties}>
          <div style={styles.card as React.CSSProperties}>
            <div style={{ ...styles.cardTitle, color: '#388e3c' }}>Latest Price</div>
            <div style={styles.cardValue}>{latest.value} $/GAL</div>
            <div style={styles.cardSub}>{latest.period} ({latest['area-name']})</div>
          </div>
          <div style={styles.card as React.CSSProperties}>
            <div style={styles.cardTitle}>Average Price</div>
            <div style={styles.cardValue}>{avgPrice} $/GAL</div>
          </div>
          <div style={styles.card as React.CSSProperties}>
            <div style={{ ...styles.cardTitle, color: '#d32f2f' }}>Min/Max</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>Min: <span style={{ color: '#388e3c' }}>{minPrice}</span> / Max: <span style={{ color: '#d32f2f' }}>{maxPrice}</span></div>
          </div>
        </div>
        <div style={styles.chartSection as React.CSSProperties}>
          <Line data={lineData} options={lineOptions} />
        </div>
        <div style={styles.tableHeading as React.CSSProperties}>Fuel Prices Table</div>
        <table style={styles.table as React.CSSProperties}>
          <thead>
            <tr>
              <th style={styles.th as React.CSSProperties}>Date</th>
              <th style={styles.th as React.CSSProperties}>Area</th>
              <th style={styles.th as React.CSSProperties}>Product</th>
              <th style={styles.th as React.CSSProperties}>Price ($/GAL)</th>
            </tr>
          </thead>
          <tbody>
            {paginatedPrices.map((item, idx) => (
              <tr key={idx} style={idx % 2 === 0 ? styles.trEven : styles.trOdd}>
                <td style={styles.td as React.CSSProperties}>{item.period}</td>
                <td style={styles.td as React.CSSProperties}>{item['area-name']}</td>
                <td style={styles.td as React.CSSProperties}>{item['product-name']}</td>
                <td style={{ ...(styles.td as React.CSSProperties), fontWeight: 700 }}>{item.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={styles.pagination as React.CSSProperties}>
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            style={{
              ...(styles.pageBtn as React.CSSProperties),
              ...(page === 1 ? (styles.pageBtnDisabled as React.CSSProperties) : {}),
            }}
          >
            Previous
          </button>
          <span style={styles.pageInfo as React.CSSProperties}>Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page === totalPages}
            style={{
              ...(styles.pageBtn as React.CSSProperties),
              ...(page === totalPages ? (styles.pageBtnDisabled as React.CSSProperties) : {}),
            }}
          >
            Next
          </button>
        </div>
      </main>
    </div>
  // ...existing code...
  );
};

export default Dashboard;
