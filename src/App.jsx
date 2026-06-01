// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/LoginPage';
import PrivateRoute from './assets/components/PrivateRoute';

// Admin Panel Pages
import AdminDashboard from './pages/panel/AdminDashboard';
import PaymentPage from './pages/panel/PaymentPage';      // All Leads
import PaidClients from './pages/panel/PaidClients';
import AllUsers from './pages/panel/AllUsers';
import BlogList from './pages/panel/BlogList';
import BlogEditor from './pages/panel/BlogEditor';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          <Route path="/login" element={<Login />} />

          {/* Protected Admin Routes */}
          <Route path="/dashboard" element={<PrivateRoute><AdminDashboard /></PrivateRoute>} />
          <Route path="/admin/leads" element={<PrivateRoute><PaymentPage /></PrivateRoute>} />
          <Route path="/admin/paid-clients" element={<PrivateRoute><PaidClients /></PrivateRoute>} />
          <Route path="/admin/all-users" element={<PrivateRoute><AllUsers /></PrivateRoute>} />

          {/* Blog Management */}
          <Route path="/admin/blogs" element={<PrivateRoute><BlogList /></PrivateRoute>} />
          <Route path="/admin/blog/new" element={<PrivateRoute><BlogEditor /></PrivateRoute>} />
          <Route path="/admin/blog/edit/:id" element={<PrivateRoute><BlogEditor /></PrivateRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;