import Navbar from "../../components/Navbar";
import { useEffect, useState } from 'react';
import api from '../../Services/api';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import {
  Users,
  CreditCard,
  TrendingUp,
  DollarSign,
  Calendar,
  Package,
  Loader,
  ArrowUp,
  ArrowDown,
  Eye,
  BarChart3,
  PieChart as PieChartIcon
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const AdminDashboard = () => {
  const [leads, setLeads] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [leadsRes, subsRes] = await Promise.all([
          api.get('/requests'),
          api.get('/subscriptions')
        ]);
        setLeads(leadsRes.data || []);
        setSubscriptions(subsRes.data || []);
      } catch (err) {
        if (err.response?.status === 401) {
          logout();
          navigate('/login');
        } else {
          setError('Failed to load dashboard data. Please refresh.');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const totalLeads = leads.length;
  const totalPaid = subscriptions.length;
  const conversionRate = totalLeads > 0 ? ((totalPaid / totalLeads) * 100).toFixed(1) : 0;
  const totalRevenue = subscriptions.reduce((sum, s) => sum + (s.paidAmount || 0), 0);

  // Simple trends (mock – you can replace with real month-over-month data)
  const leadTrend = totalLeads > 0 ? '+12%' : '0%';
  const paidTrend = totalPaid > 0 ? '+8%' : '0%';
  const revenueTrend = totalRevenue > 0 ? '+15%' : '0%';

  // Last 7 days leads
  const getLast7Days = () => {
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  };
  const leadsOverTime = getLast7Days().map(date => {
    const count = leads.filter(lead => lead.createdAt?.split('T')[0] === date).length;
    return { date, leads: count };
  });

  const productBreakdown = leads.reduce((acc, lead) => {
    const product = lead.product || 'Other';
    acc[product] = (acc[product] || 0) + 1;
    return acc;
  }, {});
  const productChartData = Object.entries(productBreakdown).map(([name, value]) => ({ name, value }));

  const recentLeads = [...leads]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  const recentPayments = [...subscriptions]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader className="animate-spin text-indigo-600" size={48} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-96 text-red-500">
        {error}
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
              Marketing Dashboard
            </h1>
            <p className="text-slate-500 mt-1">Key metrics and performance indicators</p>
          </div>

          {/* Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 p-6 border border-slate-100 hover:-translate-y-1">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-blue-50 rounded-xl">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex items-center gap-1 text-emerald-600 text-sm font-medium">
                  <ArrowUp size={14} />
                  <span>{leadTrend}</span>
                </div>
              </div>
              <p className="text-sm text-slate-500 font-medium">Total Leads</p>
              <p className="text-3xl font-bold text-slate-800 mt-1">{totalLeads}</p>
            </div>

            <div className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 p-6 border border-slate-100 hover:-translate-y-1">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-emerald-50 rounded-xl">
                  <CreditCard className="h-6 w-6 text-emerald-600" />
                </div>
                <div className="flex items-center gap-1 text-emerald-600 text-sm font-medium">
                  <ArrowUp size={14} />
                  <span>{paidTrend}</span>
                </div>
              </div>
              <p className="text-sm text-slate-500 font-medium">Paid Clients</p>
              <p className="text-3xl font-bold text-slate-800 mt-1">{totalPaid}</p>
            </div>

            <div className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 p-6 border border-slate-100 hover:-translate-y-1">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-purple-50 rounded-xl">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
                <div className="flex items-center gap-1 text-emerald-600 text-sm font-medium">
                  <ArrowUp size={14} />
                  <span>{conversionRate}%</span>
                </div>
              </div>
              <p className="text-sm text-slate-500 font-medium">Conversion Rate</p>
              <p className="text-3xl font-bold text-slate-800 mt-1">{conversionRate}%</p>
            </div>

            <div className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 p-6 border border-slate-100 hover:-translate-y-1">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-amber-50 rounded-xl">
                  <DollarSign className="h-6 w-6 text-amber-600" />
                </div>
                <div className="flex items-center gap-1 text-emerald-600 text-sm font-medium">
                  <ArrowUp size={14} />
                  <span>{revenueTrend}</span>
                </div>
              </div>
              <p className="text-sm text-slate-500 font-medium">Total Revenue</p>
              <p className="text-3xl font-bold text-slate-800 mt-1">₹{totalRevenue.toLocaleString()}</p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Line Chart */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <Calendar size={20} className="text-blue-500" />
                  Leads Over Last 7 Days
                </h3>
                <BarChart3 size={18} className="text-slate-400" />
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={leadsOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
                  <YAxis stroke="#9ca3af" fontSize={12} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Line type="monotone" dataKey="leads" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Pie Chart */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <Package size={20} className="text-emerald-500" />
                  Leads by Product Interest
                </h3>
                <PieChartIcon size={18} className="text-slate-400" />
              </div>
              {productChartData.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-slate-400">No data</div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={productChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {productChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Recent Leads Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 mb-8 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-slate-800">Recent Leads</h3>
              <Link to="/admin/leads" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
                View all <Eye size={14} />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {recentLeads.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-8 text-center text-slate-400">No leads yet</td>
                    </tr>
                  ) : (
                    recentLeads.map(lead => (
                      <tr key={lead._id} className="hover:bg-slate-50 transition">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800">{lead.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{lead.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium">{lead.product}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                          {new Date(lead.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminDashboard;