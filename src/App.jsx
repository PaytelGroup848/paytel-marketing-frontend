// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/LoginPage';
import PrivateRoute from './assets/components/PrivateRoute';

// Admin Panel Pages
import AdminDashboard from './pages/panel/AdminDashboard';
import PaymentPage from './pages/panel/PaymentPage';
import PaidClients from './pages/panel/PaidClients';
import AllUsers from './pages/panel/AllUsers';
import BlogList from './pages/panel/BlogList';
import BlogEditor from './pages/panel/BlogEditor';

/**
 * BlogEditorWrapper — forces a full unmount+remount of BlogEditor
 * every time the route changes (new vs edit, or edit one post vs another).
 *
 * Without this key, React keeps the same BlogEditor instance alive when
 * navigating between /admin/blog/new and /admin/blog/edit/:id because
 * both routes render the same component — so useEffect never re-runs
 * and the page appears frozen (only URL changes).
 */
const BlogEditorWrapper = () => {
  const location = useLocation();
  return <BlogEditor key={location.pathname} />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />

          {/* Protected Admin */}
          <Route path="/dashboard"          element={<PrivateRoute><AdminDashboard /></PrivateRoute>} />
          <Route path="/admin/leads"        element={<PrivateRoute><PaymentPage /></PrivateRoute>} />
          <Route path="/admin/paid-clients" element={<PrivateRoute><PaidClients /></PrivateRoute>} />
          <Route path="/admin/all-users"    element={<PrivateRoute><AllUsers /></PrivateRoute>} />

          {/* Blog Management — BlogEditorWrapper gives each route a unique key */}
          <Route path="/admin/blogs"             element={<PrivateRoute><BlogList /></PrivateRoute>} />
          <Route path="/admin/blog/new"          element={<PrivateRoute><BlogEditorWrapper /></PrivateRoute>} />
          <Route path="/admin/blog/edit/:id"     element={<PrivateRoute><BlogEditorWrapper /></PrivateRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;