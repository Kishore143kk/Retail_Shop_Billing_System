import React, { useState, useEffect } from 'react';
import { 
  Package, 
  IndianRupee, 
  FileText, 
  AlertTriangle,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Lightbulb,
  ShoppingCart
} from 'lucide-react';
import { motion } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { DashboardStats, Bill } from '../types';
import { GoogleGenAI } from "@google/genai";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentBills, setRecentBills] = useState<Bill[]>([]);
  const [allBills, setAllBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [prediction, setPrediction] = useState<string>('');
  const [topSelling, setTopSelling] = useState<{product_name: string, total_quantity: number}[]>([]);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, billsRes, topSellingRes] = await Promise.all([
          fetch('/api/stats'),
          fetch('/api/bills'),
          fetch('/api/top-selling')
        ]);
        const statsData = await statsRes.json();
        const billsData = await billsRes.json();
        const topSellingData = await topSellingRes.json();
        setStats(statsData);
        setAllBills(billsData.reverse()); // Ensure chronological if API gives desc
        setRecentBills(([] as Bill[]).concat(billsData).reverse().slice(0, 5));
        setTopSelling(topSellingData);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (recentBills.length > 0) {
      analyzeSales();
    }
  }, [recentBills]);

  const analyzeSales = async () => {
    setAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const salesData = recentBills.map(b => ({
        total: b.total_amount,
        date: b.date
      }));

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analyze these recent sales and provide:
1. A short prediction (max 20 words) about future sales trends.
2. 3 specific item suggestions that might sell well tomorrow.
Return the result in JSON format with keys "prediction" and "suggestions" (array of strings).
Sales data: ${JSON.stringify(salesData)}`,
        config: {
          responseMimeType: "application/json"
        }
      });

      const data = JSON.parse(response.text || "{}");
      setPrediction(data.prediction || "Sales are expected to remain steady based on current patterns.");
      setSuggestions(data.suggestions || ["Milk", "Bread", "Eggs"]);
    } catch (error) {
      console.error('AI Analysis error:', error);
      setPrediction("Unable to generate prediction at this time.");
      setSuggestions(["Milk", "Bread", "Snacks"]);
    } finally {
      setAnalyzing(false);
    }
  };

  const salesDataForChart = React.useMemo(() => {
    const dataMap: Record<string, number> = {};
    allBills.forEach(b => {
      const date = new Date(b.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dataMap[date] = (dataMap[date] || 0) + b.total_amount;
    });
    return Object.entries(dataMap).map(([date, amount]) => ({ name: date, amount }));
  }, [allBills]);

  if (loading) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  const statCards = [
    { 
      label: 'Total Products', 
      value: stats?.totalProducts || 0, 
      icon: Package, 
      color: 'blue',
      desc: 'Items in inventory',
      link: '/products'
    },
    { 
      label: "Today's Sales", 
      value: `₹${stats?.todaySales.toFixed(2) || '0.00'}`, 
      icon: IndianRupee, 
      color: 'green',
      desc: 'Revenue generated today',
      link: '/history'
    },
    { 
      label: 'Bills Generated', 
      value: stats?.totalBills || 0, 
      icon: FileText, 
      color: 'indigo',
      desc: 'Total transactions',
      link: '/history'
    },
    { 
      label: 'Low Stock', 
      value: stats?.lowStock || 0, 
      icon: AlertTriangle, 
      color: 'orange',
      desc: 'Items needing restock',
      link: '/products?filter=low-stock'
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
          <p className="text-slate-500">Welcome back! Here's what's happening today.</p>
        </div>
        {stats && stats.lowStock > 0 && (
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/products?filter=low-stock')}
            className="flex items-center gap-3 px-4 py-2 bg-orange-50 border border-orange-200 rounded-xl text-orange-700 shadow-sm hover:bg-orange-100 transition-all"
          >
            <div className="relative">
              <AlertTriangle className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
            </div>
            <div className="text-left">
              <p className="text-xs font-bold uppercase tracking-wider">Low Stock Alert</p>
              <p className="text-sm font-medium">{stats.lowStock} items need attention</p>
            </div>
            <ArrowRight className="w-4 h-4 ml-2" />
          </motion.button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, idx) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            onClick={() => card.link && navigate(card.link)}
            className={`p-6 rounded-2xl border shadow-sm hover:shadow-md transition-all cursor-pointer group ${
              card.label === 'Low Stock' && stats && stats.lowStock > 0 
                ? 'bg-orange-50 border-orange-200 ring-2 ring-orange-500/20' 
                : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl bg-${card.color}-50 text-${card.color}-600 group-hover:scale-110 transition-transform ${
                card.label === 'Low Stock' && stats && stats.lowStock > 0 ? 'bg-white shadow-sm' : ''
              }`}>
                <card.icon className="w-6 h-6" />
              </div>
            </div>
            <h3 className={`text-3xl font-bold ${
              card.label === 'Low Stock' && stats && stats.lowStock > 0 ? 'text-orange-700' : 'text-slate-900'
            }`}>{card.value}</h3>
            <p className="text-sm font-medium text-slate-600 mt-1">{card.label}</p>
            <p className="text-xs text-slate-400 mt-2">{card.desc}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Sales Analytics Chart */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Sales Analytics</h2>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesDataForChart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dx={-10} tickFormatter={(value) => `₹${value}`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => [`₹${value.toFixed(2)}`, 'Sales']}
                  />
                  <Area type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-900">Recent Bills</h2>
              <Link to="/history" className="text-blue-600 text-sm font-medium flex items-center gap-1 hover:underline">
                View All <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-semibold">Bill ID</th>
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold">Total Amount</th>
                  <th className="px-6 py-4 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentBills.map((bill) => (
                  <tr key={bill.id} className="hover:bg-slate-50 transition-all">
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">#BILL-{bill.id}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{new Date(bill.date).toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-900">₹{bill.total_amount.toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <Link 
                        to={`/invoice/${bill.id}`}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        View Invoice
                      </Link>
                    </td>
                  </tr>
                ))}
                {recentBills.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-slate-400">
                      No bills generated yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* End of lg:col-span-2 block */}
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-bold text-slate-900">AI Insights</h2>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <div className="flex items-center gap-2 text-blue-700 font-bold mb-1">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm">Sales Prediction</span>
                </div>
                {analyzing ? (
                  <div className="h-4 w-3/4 bg-blue-200 animate-pulse rounded mt-2"></div>
                ) : (
                  <p className="text-xs text-blue-600 leading-relaxed">
                    {prediction || "Analyze sales to get predictions."}
                  </p>
                )}
              </div>

              <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                <div className="flex items-center gap-2 text-amber-700 font-bold mb-3">
                  <Lightbulb className="w-4 h-4" />
                  <span className="text-sm">AI Suggestions</span>
                </div>
                {analyzing ? (
                  <div className="space-y-2">
                    <div className="h-3 w-full bg-amber-200 animate-pulse rounded"></div>
                    <div className="h-3 w-full bg-amber-200 animate-pulse rounded"></div>
                    <div className="h-3 w-full bg-amber-200 animate-pulse rounded"></div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {suggestions.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-amber-800 bg-white/50 p-2 rounded-lg">
                        <div className="w-1.5 h-1.5 bg-amber-400 rounded-full"></div>
                        {item}
                      </div>
                    ))}
                    {suggestions.length === 0 && (
                      <p className="text-xs text-amber-600 italic">No suggestions yet. Generate more bills to get insights.</p>
                    )}
                  </div>
                )}
              </div>

              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                <div className="flex items-center gap-2 text-emerald-700 font-bold mb-3">
                  <ShoppingCart className="w-4 h-4" />
                  <span className="text-sm">Top Selling Items</span>
                </div>
                <div className="space-y-2">
                  {topSelling.map((item, i) => (
                    <div key={i} className="flex justify-between items-center text-xs text-emerald-800 bg-white/50 p-2 rounded-lg">
                      <span className="font-medium">{item.product_name}</span>
                      <span className="bg-emerald-100 px-2 py-0.5 rounded-full text-[10px]">{item.total_quantity} sold</span>
                    </div>
                  ))}
                  {topSelling.length === 0 && (
                    <p className="text-xs text-emerald-600 italic">No sales data yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-2xl text-white shadow-lg shadow-blue-200">
            <h3 className="font-bold mb-2">Quick Tip</h3>
            <p className="text-blue-100 text-xs leading-relaxed">
              Keep an eye on the "Low Stock" section to ensure you never run out of popular items during peak hours.
            </p>
            <button 
              onClick={() => navigate('/billing')}
              className="mt-4 w-full py-2 bg-white text-blue-600 rounded-lg text-sm font-bold hover:bg-blue-50 transition-all"
            >
              Start Billing
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
