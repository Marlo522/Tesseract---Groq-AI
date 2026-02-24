import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage    from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard    from './pages/Dashboard';
import ApplyPage    from './pages/ApplyPage';
import ResultPage   from './pages/ResultPage';

// Redirect to login if not authenticated
function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen text-gray-400">Loading...</div>;
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" />
      <BrowserRouter>
        <Routes>
          <Route path="/login"    element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/"         element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/apply"    element={<PrivateRoute><ApplyPage /></PrivateRoute>} />
          <Route path="/result/:id" element={<PrivateRoute><ResultPage /></PrivateRoute>} />
          <Route path="*"         element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}