import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, lazy, Suspense } from 'react';
import Layout from './components/layout/Layout';
import Entry from './pages/public/Entry';
import About from './pages/public/About';
import PageLoader from './components/common/PageLoader';

const Dashboard = lazy(() => import('./pages/dashboard/Dashboard'));
const DataInput = lazy(() => import('./pages/dashboard/DataInput'));
const LstmProcess = lazy(() => import('./pages/dashboard/LstmProcess'));
const Report = lazy(() => import('./pages/dashboard/Report'));
const Profile = lazy(() => import('./pages/dashboard/Profile'));

function App() {
  const [user, setUser] = useState(() => {
    try {
      const storedUser = localStorage.getItem('user');
      return storedUser && localStorage.getItem('token') ? JSON.parse(storedUser) : null;
    } catch { return null; } // data sesi rusak → anggap belum masuk
  });

  return (
    <Router>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={!user ? <Entry setUser={setUser} /> : <Navigate to="/dashboard" />} />
          <Route path="/login" element={!user ? <Entry setUser={setUser} /> : <Navigate to="/dashboard" />} />
          <Route path="/tentang" element={<About />} />
          <Route path="/features" element={<Navigate to="/tentang" replace />} />
          <Route path="/register" element={<Navigate to="/login" replace />} />
          <Route path="/dashboard" element={user ? <Layout user={user} setUser={setUser} /> : <Navigate to="/login" />}>
            <Route index element={<Dashboard />} />
            <Route path="data-input" element={<DataInput />} />
            <Route path="lstm-process" element={<LstmProcess />} />
            <Route path="report" element={<Report />} />
            <Route path="profile" element={<Profile user={user} setUser={setUser} />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
