import { useEffect, useState } from 'react';
import api from '../../Services/api';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/Navbar';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Loader, Search, ArrowLeft, Filter, X, 
  Mail, Phone, Calendar, Shield, ChevronLeft, ChevronRight, AlertCircle 
} from 'lucide-react';

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

  // Filtering logic (search + role)
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
    if (roleFilter !== 'all') {
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

  const uniqueRoles = [...new Set(users.map(u => u.role).filter(Boolean))];

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
              className="flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm border border-slate-200 rounded-xl text-slate-700 hover:bg-white shadow-sm transition"
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
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/40 shadow-sm p-4 mb-6 flex flex-wrap justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                <Users size={20} className="text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Users</p>
                <p className="text-2xl font-bold text-gray-800">{users.length}</p>
              </div>
            </div>
            <div className="text-sm text-gray-400">
              {filteredUsers.length} users matching filters
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/50 shadow-sm p-5 mb-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 text-slate-600">
                <Filter size={18} />
                <span className="text-sm font-semibold">Filters</span>
              </div>
              <div className="relative max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search by name, email or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-300 w-64"
                />
              </div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-300"
              >
                <option value="all">All Roles</option>
                {uniqueRoles.map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
              <button
                onClick={resetFilters}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-rose-600 hover:bg-rose-50 rounded-lg transition"
              >
                <X size={14} /> Reset
              </button>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <Loader className="animate-spin text-indigo-500" size={40} />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-16">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No users found</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider border-r border-slate-100 min-w-[150px]">Name</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider border-r border-slate-100 min-w-[200px]">Email</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider border-r border-slate-100 min-w-[120px]">Phone</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider border-r border-slate-100 min-w-[100px]">Role</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider min-w-[120px]">Registered On</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {paginatedUsers.map((user, idx) => (
                        <tr key={user._id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 text-sm font-medium text-slate-800 border-r border-slate-100">
                            {user.name || '—'}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600 border-r border-slate-100 break-all">{user.email}</td>
                          <td className="px-6 py-4 text-sm text-slate-600 border-r border-slate-100">{user.phone || '—'}</td>
                          <td className="px-6 py-4 border-r border-slate-100">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {user.role || 'user'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500 whitespace-nowrap">
                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-2 py-4 border-t border-slate-100 bg-slate-50/50">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(p-1, 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    {[...Array(totalPages)].map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentPage(i+1)}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                          currentPage === i+1
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {i+1}
                      </button>
                    ))}
                    <button
                      onClick={() => setCurrentPage(p => Math.min(p+1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
                <div className="bg-slate-50/80 px-6 py-3 text-sm text-slate-500 border-t border-slate-100">
                  Showing {paginatedUsers.length} of {filteredUsers.length} users (page {currentPage} of {totalPages})
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default AllUsers;