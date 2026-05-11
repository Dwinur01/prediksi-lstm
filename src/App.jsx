import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Layout from './components/layout/Layout';
import Dashboard from './pages/dashboard/Dashboard';
import DataInput from './pages/dashboard/DataInput';
import LstmProcess from './pages/dashboard/LstmProcess';
import Report from './pages/dashboard/Report';
import Profile from './pages/dashboard/Profile';

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
    
    // Inisialisasi tema dari localStorage
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-primary">Loading...</div>;

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!user ? <Login setUser={setUser} /> : <Navigate to="/" />} />
        <Route path="/register" element={!user ? <Register /> : <Navigate to="/" />} />
        
        <Route path="/" element={user ? <Layout user={user} setUser={setUser} /> : <Navigate to="/login" />}>
          <Route index element={<Dashboard />} />
          <Route path="data-input" element={<DataInput />} />
          <Route path="lstm-process" element={<LstmProcess />} />
          <Route path="report" element={<Report />} />
          <Route path="profile" element={<Profile user={user} setUser={setUser} />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;