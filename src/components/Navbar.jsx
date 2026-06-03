import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';
import { LogOut, LayoutList, CreditCard, Users } from 'lucide-react';

const Navbar = () => {
  const { logout } = useAuth();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  const isActive = (path) => location.pathname === path;

  const navLinks = [
    { to: '/admin/leads', label: 'Leads', icon: LayoutList },
    { to: '/admin/paid-clients', label: 'Paid Clients', icon: CreditCard },
    { to: '/admin/all-users', label: 'All Users', icon: Users },
    { to: '/admin/blogs', label: 'Blogs', icon: LayoutList },
  ];

  return (
    <nav className="sticky top-0 z-[9999] bg-white/80 backdrop-blur-xl border-b border-white/20 shadow-lg mt-0 py-2">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 ">
        <div className="flex justify-between items-center h-16 md:h-20">

          {/* Brand */}
          <button
            onClick={() => (window.location.href = '/')}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <div className="flex flex-col text-left">
              <span className="text-sm font-semibold text-slate-700 tracking-tight">
                Admin Portal
              </span>
              <span className="text-[11px] font-medium text-slate-400 -mt-0.5">
                Marketing Panel
              </span>
            </div>
          </button>

          {/* Nav Links */}
          <div className="flex items-center gap-2 md:gap-4 bg-white/40 backdrop-blur-sm rounded-2xl p-1 shadow-inner">
            {navLinks.map(({ to, label, icon: Icon }) => (
              <button
                key={to}
                onClick={() => (window.location.href = to)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive(to)
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                    : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-600'
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-all duration-200 font-medium text-sm border border-rose-200 shadow-sm hover:shadow-md"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Logout</span>
          </button>

        </div>
      </div>
    </nav>
  );
};

export default Navbar;