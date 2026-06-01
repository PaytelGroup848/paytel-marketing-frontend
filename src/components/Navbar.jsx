import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { LogOut, UserCircle, CreditCard, LayoutList, Sparkles, Users } from 'lucide-react';

const Navbar = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-white/20 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 md:h-20">

          {/* Left side - Brand / Admin */}
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-slate-700 tracking-tight">Admin Portal</span>
              <span className="text-[11px] font-medium text-slate-400 -mt-0.5">Marketing Panel</span>
            </div>
          </div>

          {/* Center / Right side - Navigation Links */}
          <div className="flex items-center gap-2 md:gap-4 bg-white/40 backdrop-blur-sm rounded-2xl p-1 shadow-inner">
            <Link
              to="/admin/leads"
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${isActive('/admin/leads')
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-600'
                }`}
            >
              <LayoutList size={16} />
              Leads
            </Link>
            <Link
              to="/admin/paid-clients"
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${isActive('/admin/paid-clients')
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-600'
                }`}
            >
              <CreditCard size={16} />
              Paid Clients
            </Link>

            <Link
              to="/admin/all-users"
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${isActive('/admin/all-users')
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-600'
                }`}
            >
              < Users size={16} />
              All Users
            </Link>

            <Link
              to="/admin/blogs"
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${isActive('/admin/blogs')
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-600'
                }`}
            >
              < Users size={16} />
              Blogs
            </Link>


          </div>

          {/* Right side - Logout Button */}
          <div className="flex items-center">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-all duration-200 font-medium text-sm border border-rose-200 shadow-sm hover:shadow-md"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;