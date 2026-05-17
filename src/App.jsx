import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Layout from './components/layout/Layout';
import Dashboard from './pages/dashboard/Dashboard';
import DataInput from './pages/dashboard/DataInput';
import LstmProcess from './pages/dashboard/LstmProcess';
import Report from './pages/dashboard/Report';
import Profile from './pages/dashboard/Profile';
import Landing from './pages/Landing';
import Features from './pages/Features';
import CustomCursor from './components/ui/CustomCursor';
import PageLoader from './components/common/PageLoader';

function AppContent({ user, setUser }) {
  const location = useLocation();
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    // Hanya tampilkan loader global jika navigasi ke halaman LUAR dashboard
    if (!location.pathname.startsWith('/dashboard')) {
      setIsNavigating(true);
      const timer = setTimeout(() => {
        setIsNavigating(false);
      }, 800);
      return () => clearTimeout(timer);
    } else {
      setIsNavigating(false);
    }
  }, [location.pathname]);

  return (
    <>
      <CustomCursor />
      <AnimatePresence mode="wait">
        {isNavigating && <PageLoader key="global-loader" />}
      </AnimatePresence>
      
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Landing />} />
        <Route path="/features" element={<Features />} />
        <Route path="/login" element={!user ? <Login setUser={setUser} /> : <Navigate to="/dashboard" />} />
        <Route path="/register" element={!user ? <Register /> : <Navigate to="/dashboard" />} />
        
        <Route path="/dashboard" element={user ? <Layout user={user} setUser={setUser} /> : <Navigate to="/login" />}>
          <Route index element={<Dashboard />} />
          <Route path="data-input" element={<DataInput />} />
          <Route path="lstm-process" element={<LstmProcess />} />
          <Route path="report" element={<Report />} />
          <Route path="profile" element={<Profile user={user} setUser={setUser} />} />
        </Route>
      </Routes>
    </>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');
    
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
    
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  if (loading) return <PageLoader />;

  return (
    <Router>
      <AppContent user={user} setUser={setUser} />
    </Router>
  );
}

export default App;