import { useEffect, useState } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Navbar from "../../components/Navbar";
import { useNavigate } from 'react-router-dom';
import { Users, Loader, Search, ArrowLeft, Eye, X, DollarSign, Activity, CreditCard } from 'lucide-react';

const PaidClients = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSub, setSelectedSub] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [subsRes, usersRes] = await Promise.all([
          api.get('/subscriptions'),
          api.get('/all-users')
        ]);
        setSubscriptions(Array.isArray(subsRes.data) ? subsRes.data : []);
        setAllUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
      } catch (err) {
        if (err.response?.status === 401) {
          logout();
          navigate('/login');
        }
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Match subscription to user by email
  const getUserForSubscription = (sub) => {
    if (sub.userEmail) {
      return allUsers.find(u => u.email?.toLowerCase() === sub.userEmail.toLowerCase());
    }
    if (sub.userId) {
      const userIdStr = typeof sub.userId === 'object' ? sub.userId._id : sub.userId;
      return allUsers.find(u => u._id === userIdStr);
    }
    return null;
  };

  const getUserName = (sub) => {
    const user = getUserForSubscription(sub);
    if (user?.name) return user.name;
    if (sub.userName) return sub.userName;
    return sub.userEmail?.split('@')[0] || '—';
  };

  const getUserEmail = (sub) => {
    const user = getUserForSubscription(sub);
    return user?.email || sub.userEmail || '—';
  };

  const getUserPhone = (sub) => {
    const user = getUserForSubscription(sub);
    return user?.phone || '—';
  };

  const filtered = subscriptions.filter((sub) => {
    const searchLower = searchTerm.toLowerCase();
    const userName = getUserName(sub).toLowerCase();
    const userEmail = getUserEmail(sub).toLowerCase();
    const plan = (sub.planName || '').toLowerCase();
    return (
      userName.includes(searchLower) ||
      userEmail.includes(searchLower) ||
      plan.includes(searchLower)
    );
  });

  const getPeriod = (start, end) => {
    if (!start || !end) return 'N/A';
    const diff = new Date(end) - new Date(start);
    const days = diff / (1000 * 3600 * 24);
    if (days <= 31) return 'Monthly';
    if (days <= 365) return 'Yearly';
    return 'Custom';
  };

  const openModal = (sub) => {
    setSelectedSub(sub);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedSub(null);
  };

  // Derived stats (no extra API)
  const totalAmount = subscriptions.reduce((sum, sub) => sum + (sub.amount || 0), 0);
  const activeSubs = subscriptions.filter(sub => sub.status === 'active').length;

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 pt-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Paid Clients</h1>
              <p className="text-gray-500 mt-1">Subscriptions & user details</p>
            </div>
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl text-slate-700 hover:bg-white shadow-sm transition"
            >
              <ArrowLeft size={18} /> Back
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/40 shadow-sm p-5 flex items-center gap-4">
              <div className="h-12 w-12 bg-indigo-100 rounded-2xl flex items-center justify-center shadow-inner">
                <Users size={24} className="text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Total Clients</p>
                <p className="text-2xl font-bold text-gray-800">{subscriptions.length}</p>
              </div>
            </div>
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/40 shadow-sm p-5 flex items-center gap-4">
              <div className="h-12 w-12 bg-emerald-100 rounded-2xl flex items-center justify-center shadow-inner">
                <Activity size={24} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Active</p>
                <p className="text-2xl font-bold text-gray-800">{activeSubs}</p>
              </div>
            </div>
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/40 shadow-sm p-5 flex items-center gap-4">
              <div className="h-12 w-12 bg-amber-100 rounded-2xl flex items-center justify-center shadow-inner">
                <DollarSign size={24} className="text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-800">₹{totalAmount.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search by user name, email, plan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 shadow-sm transition"
              />
            </div>
          </div>

          {/* Subscriptions Table – Card Style */}
          <div className="bg-gray-50/50 rounded-2xl p-4 border border-gray-100 shadow-sm">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <Loader className="animate-spin text-indigo-500" size={40} />
              </div>
            ) : subscriptions.length === 0 ? (
              <div className="text-center py-16">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No subscriptions found.</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-gray-500">No matching subscriptions.</p>
              </div>
            ) : (
              <table className="min-w-full border-separate border-spacing-y-3">
                <thead>
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider bg-transparent">👤 User Name</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider bg-transparent">📧 Email</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider bg-transparent">📱 Phone</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider bg-transparent">📦 Plan</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider bg-transparent">💰 Amount</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider bg-transparent">📅 Expiry</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider bg-transparent">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((sub) => {
                    const isActive = sub.status === 'active';
                    return (
                      <tr
                        key={sub._id}
                        className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 group"
                      >
                        <td className="px-6 py-4 text-sm font-medium text-slate-800 rounded-l-xl">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-xs font-bold text-slate-600 uppercase">
                              {getUserName(sub).charAt(0)}
                            </div>
                            {getUserName(sub)}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 break-all">{getUserEmail(sub)}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{getUserPhone(sub)}</td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                            {sub.planName || '—'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-slate-800">
                          ₹{(sub.amount || 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {sub.endDate ? new Date(sub.endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                        </td>
                        <td className="px-6 py-4 rounded-r-xl">
                          <button
                            onClick={() => openModal(sub)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition text-xs font-medium"
                          >
                            <Eye size={14} /> View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            {!loading && filtered.length > 0 && (
              <div className="mt-4 text-sm text-slate-500 px-2">
                Showing {filtered.length} of {subscriptions.length} subscriptions
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal – fixed with high z-index */}
      {showModal && selectedSub && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto transform transition-all scale-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center rounded-t-2xl">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <CreditCard size={22} className="text-indigo-600" />
                Subscription Details
              </h2>
              <button
                onClick={closeModal}
                className="p-1.5 hover:bg-gray-100 rounded-full transition"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Modal body */}
            <div className="p-6 space-y-6">
              {/* User Info */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Users size={18} className="text-indigo-500" /> User Information
                </h3>
                <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Name</p>
                    <p className="font-medium text-gray-800">{getUserName(selectedSub)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Email</p>
                    <p className="font-medium text-gray-800 break-all">{getUserEmail(selectedSub)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Phone</p>
                    <p className="font-medium text-gray-800">{getUserPhone(selectedSub)}</p>
                  </div>
                </div>
              </div>

              {/* Subscription Info */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <CreditCard size={18} className="text-indigo-500" /> Subscription Info
                </h3>
                <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Plan</p>
                    <p className="font-medium text-gray-800">{selectedSub.planName || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Type</p>
                    <p className="font-medium text-gray-800">{selectedSub.type || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Amount</p>
                    <p className="font-semibold text-gray-800">₹{(selectedSub.amount || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Start Date</p>
                    <p className="font-medium text-gray-800">
                      {selectedSub.startDate ? new Date(selectedSub.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">End Date</p>
                    <p className="font-medium text-gray-800">
                      {selectedSub.endDate ? new Date(selectedSub.endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Period</p>
                    <p className="font-medium text-gray-800">{getPeriod(selectedSub.startDate, selectedSub.endDate)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Auto Renewal</p>
                    <p className="font-medium text-gray-800">{selectedSub.autoRenewal ? 'Yes' : 'No'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Payment Method</p>
                    <p className="font-medium text-gray-800">{selectedSub.paymentMethod || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Status</p>
                    <span className={`mt-1 inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      selectedSub.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {selectedSub.status || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end rounded-b-2xl">
              <button
                onClick={closeModal}
                className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-medium shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PaidClients;