import { useEffect, useState } from 'react';
import api from '../../Services/api';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/Navbar';
import { useNavigate } from 'react-router-dom';
import {
  Users, Loader, Search, ArrowLeft, Filter, X,
  Mail, Phone, Calendar, Shield, ChevronLeft, ChevronRight, AlertCircle
} from 'lucide-react';

const SkeletonRow = () => (
  <tr className="animate-pulse">
    <td className="px-6 py-4">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
        <div className="h-4 w-24 bg-gray-200 rounded"></div>
      </div>
    </td>
    <td className="px-6 py-4"><div className="h-4 w-44 bg-gray-200 rounded"></div></td>
    <td className="px-6 py-4"><div className="h-4 w-24 bg-gray-200 rounded"></div></td>
    <td className="px-6 py-4"><div className="h-6 w-16 bg-gray-200 rounded-full"></div></td>
    <td className="px-6 py-4"><div className="h-4 w-20 bg-gray-200 rounded"></div></td>
  </tr>
);

const AllUsers = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsers = async () => {
      setError(null);
      try {
        const { data } = await api.get('/all-users');
        setUsers(data);
        setFilteredUsers(data);
      } catch (err) {
        console.error(err);
        if (err.response?.status === 401) {
          logout();
          navigate('/login');
        } else if (err.code === 'ERR_NETWORK') {
          setError('Cannot connect to backend server. Please ensure the backend is running on port 5000.');
        } else {
          setError(err.message || 'Failed to load users');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  // Filtering logic (search + role/verification)
  useEffect(() => {
    let filtered = users;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(user =>
        user.name?.toLowerCase().includes(term) ||
        user.email?.toLowerCase().includes(term) ||
        user.phone?.includes(term)
      );
    }

    if (roleFilter === 'verified') {
      filtered = filtered.filter(user => user.isEmailVerified === true || user.isEmailVerified === "true");
    } else if (roleFilter === 'unverified') {
      filtered = filtered.filter(user => !user.isEmailVerified || user.isEmailVerified === "false" || user.isEmailVerified === false);
    } else if (roleFilter === 'superadmin') {
      filtered = filtered.filter(user => user.role === 'superadmin');
    } else if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    setFilteredUsers(filtered);
    setCurrentPage(1);
  }, [searchTerm, roleFilter, users]);

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const resetFilters = () => {
    setSearchTerm('');
    setRoleFilter('all');
  };

  // "user" role hata diya dropdown se
  const dynamicRoles = [...new Set(users.map(u => u.role).filter(Boolean))]
    .filter(role => role !== 'superadmin' && role !== 'user');

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 pt-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">All Users</h1>
              <p className="text-gray-500 mt-1">Manage registered users</p>
            </div>
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl text-slate-700 hover:bg-white shadow-sm transition"
            >
              <ArrowLeft size={18} />
              Back
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
              <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={20} />
              <div>
                <p className="text-red-700 font-medium">Connection Error</p>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Stats Card */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/40 shadow-sm p-5 mb-6 flex flex-wrap justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-indigo-100 rounded-2xl flex items-center justify-center shadow-inner">
                <Users size={24} className="text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Total Users</p>
                <p className="text-2xl font-bold text-gray-800">{users.length.toLocaleString()}</p>
              </div>
            </div>
            <div className="text-sm text-gray-500 bg-slate-50 px-4 py-1.5 rounded-full border border-slate-100">
              {filteredUsers.length} matching
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-white/60 shadow-sm p-5 mb-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 text-slate-600">
                <Filter size={20} />
                <span className="text-sm font-semibold">Filters</span>
              </div>

              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search by name, email or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 transition"
                />
              </div>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 transition min-w-[160px]"
              >
                <option value="all">All Roles</option>
                <option value="superadmin">Superadmin</option>
                <option value="verified">Verified Users</option>
                <option value="unverified">Unverified Users</option>
                {dynamicRoles.map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>

              <button
                onClick={resetFilters}
                className="flex items-center gap-1.5 px-4 py-2.5 text-sm text-rose-600 bg-white border border-gray-200 rounded-xl hover:bg-rose-50 hover:border-rose-200 transition"
              >
                <X size={16} /> Reset
              </button>
            </div>
          </div>

          {/* Users Table – Card Style */}
          <div className="overflow-hidden">
            {loading && users.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <table className="min-w-full border-separate border-spacing-y-3">
                  <thead>
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider bg-slate-50/80 rounded-tl-xl">👤 Name</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider bg-slate-50/80"><Mail size={14} className="inline mr-1" /> Email</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider bg-slate-50/80"><Phone size={14} className="inline mr-1" /> Phone</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider bg-slate-50/80"><Shield size={14} className="inline mr-1" /> Role</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider bg-slate-50/80 rounded-tr-xl"><Calendar size={14} className="inline mr-1" /> Registered</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}
                  </tbody>
                </table>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-16 text-center">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No users found</p>
              </div>
            ) : (
              <div className="bg-gray-50/50 rounded-2xl p-4 border border-gray-100 shadow-sm">
                <table className="min-w-full border-separate border-spacing-y-3">
                  <thead>
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider bg-transparent">👤 Name</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider bg-transparent"><Mail size={14} className="inline mr-1" /> Email</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider bg-transparent"><Phone size={14} className="inline mr-1" /> Phone</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider bg-transparent"><Shield size={14} className="inline mr-1" /> Role</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider bg-transparent"><Calendar size={14} className="inline mr-1" /> Registered</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedUsers.map((user) => {
                      const isVerified = !!user.isEmailVerified;
                      return (
                        <tr
                          key={user._id}
                          className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 group"
                        >
                          <td className="px-6 py-4 text-sm font-medium text-slate-800 rounded-l-xl">
                            <div className="flex items-center gap-3">
                              <div className="relative flex-shrink-0">
                                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-xs font-bold text-slate-600 uppercase">
                                  {(user.name || 'U').charAt(0)}
                                </div>
                                <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                                  isVerified ? 'bg-green-500' : 'bg-red-500'
                                }`}></span>
                              </div>
                              <span className="font-semibold">{user.name || '—'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600 break-all">{user.email}</td>
                          <td className="px-6 py-4 text-sm text-slate-600">{user.phone || '—'}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium shadow-sm ${
                              user.role === 'admin'
                                ? 'bg-purple-100 text-purple-700'
                                : user.role === 'superadmin'
                                ? 'bg-amber-100 text-amber-700'
                                : isVerified
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {user.role || 'user'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500 whitespace-nowrap rounded-r-xl">
                            {user.createdAt
                              ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                              : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {totalPages > 1 && (
                  <div className="flex justify-between items-center mt-6 px-2">
                    <div className="text-sm text-slate-500">
                      Page {currentPage} of {totalPages} · {filteredUsers.length} users
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(p-1, 1))}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      {[...Array(totalPages)].map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentPage(i+1)}
                          className={`min-w-[36px] h-9 px-2 rounded-lg text-sm font-medium transition ${
                            currentPage === i+1
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {i+1}
                        </button>
                      ))}
                      <button
                        onClick={() => setCurrentPage(p => Math.min(p+1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default AllUsers;