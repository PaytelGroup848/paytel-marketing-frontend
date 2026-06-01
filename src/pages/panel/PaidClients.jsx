import { useEffect, useState } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Navbar from "../../components/Navbar";
import { useNavigate } from 'react-router-dom';
import { Users, Loader, Search, ArrowLeft, Eye, X } from 'lucide-react';

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

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Paid Clients</h1>
              <p className="text-gray-500 mt-1">Subscriptions & user details</p>
            </div>
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition shadow-sm">
              <ArrowLeft size={18} /> Back
            </button>
          </div>

          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input type="text" placeholder="Search by user name, email, plan..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-xl text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex justify-center items-center h-64"><Loader className="animate-spin text-blue-500" size={40} /></div>
            ) : subscriptions.length === 0 ? (
              <div className="text-center py-16"><Users className="h-12 w-12 text-gray-300 mx-auto mb-3" /><p className="text-gray-500">No subscriptions found.</p></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16"><p className="text-gray-500">No matching subscriptions.</p></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-200 border-b border-gray-300">
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase border-r border-gray-300">User Name</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase border-r border-gray-300">Email</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase border-r border-gray-300">Phone</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase border-r border-gray-300">Plan</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase border-r border-gray-300">Amount (₹)</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase border-r border-gray-300">Expiry Date</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {filtered.map((sub, idx) => (
                      <tr key={sub._id} className={`hover:bg-gray-50 transition ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800 border-r border-gray-200">{getUserName(sub)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 border-r border-gray-200">{getUserEmail(sub)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 border-r border-gray-200">{getUserPhone(sub)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 border-r border-gray-200">{sub.planName || '—'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-800 border-r border-gray-200">₹{(sub.amount || 0).toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 border-r border-gray-200">{sub.endDate ? new Date(sub.endDate).toLocaleDateString() : 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap"><button onClick={() => openModal(sub)} className="flex items-center gap-1 px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition text-xs"><Eye size={14} /> View</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="bg-gray-50 px-6 py-3 text-sm text-gray-500 border-t border-gray-200">Showing {filtered.length} of {subscriptions.length} subscriptions</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && selectedSub && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">Subscription Details</h2>
              <button onClick={closeModal} className="p-1 hover:bg-gray-100 rounded-full"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">User Information</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <p><span className="font-medium">Name:</span> {getUserName(selectedSub)}</p>
                  <p><span className="font-medium">Email:</span> {getUserEmail(selectedSub)}</p>
                  <p><span className="font-medium">Phone:</span> {getUserPhone(selectedSub)}</p>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Subscription Info</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <p><span className="font-medium">Plan Name:</span> {selectedSub.planName || 'N/A'}</p>
                  <p><span className="font-medium">Type:</span> {selectedSub.type || 'N/A'}</p>
                  <p><span className="font-medium">Amount:</span> ₹{(selectedSub.amount || 0).toLocaleString()}</p>
                  <p><span className="font-medium">Start Date:</span> {selectedSub.startDate ? new Date(selectedSub.startDate).toLocaleString() : 'N/A'}</p>
                  <p><span className="font-medium">End Date:</span> {selectedSub.endDate ? new Date(selectedSub.endDate).toLocaleString() : 'N/A'}</p>
                  <p><span className="font-medium">Period:</span> {getPeriod(selectedSub.startDate, selectedSub.endDate)}</p>
                  <p><span className="font-medium">Auto Renewal:</span> {selectedSub.autoRenewal ? 'Yes' : 'No'}</p>
                  <p><span className="font-medium">Payment Method:</span> {selectedSub.paymentMethod || 'N/A'}</p>
                  <p><span className="font-medium">Status:</span> <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${selectedSub.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{selectedSub.status || 'active'}</span></p>
                </div>
              </div>
            </div>
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end">
              <button onClick={closeModal} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PaidClients;