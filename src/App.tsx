import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AppProvider } from '@/contexts/AppContext';
import { Toaster } from '@/components/ui/toaster';
import AgeVerificationWrapper from '@/components/AgeVerificationWrapper';
import Index from '@/pages/Index';
import Login from '@/pages/Login';
import AdminLogin from '@/pages/AdminLogin';
import Register from '@/pages/Register';
import Dashboard from '@/pages/Dashboard';
import Events from '@/pages/Events';
import EventsDimes from '@/pages/EventsDimes';
import EventsDimesOnly from '@/pages/EventsDimesOnly';
import Rate from '@/pages/Rate';
import RateGirls from '@/pages/RateGirls';
import Tip from '@/pages/Tip';
import TipGirls from '@/pages/TipGirls';
import Upgrade from '@/pages/Upgrade';
import AdminDashboard from '@/pages/AdminDashboard';
import TestLogin from '@/pages/TestLogin';
import NotFound from '@/pages/NotFound';
import './App.css';

function AppContent() {
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  const routes = (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<Login />} />
      <Route path="/adminlogin" element={<AdminLogin />} />
      <Route path="/test-login" element={<TestLogin />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/events" element={<Events />} />
      <Route path="/eventsdimes" element={<EventsDimes />} />
      <Route path="/events-dimes-only" element={<EventsDimesOnly />} />
      <Route path="/rate" element={<Rate />} />
      <Route path="/rate-girls" element={<RateGirls />} />
      <Route path="/tip" element={<Tip />} />
      <Route path="/tip-girls" element={<TipGirls />} />
      <Route path="/upgrade" element={<Upgrade />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );

  return (
    <div className="App">
      {isHomePage ? (
        <AgeVerificationWrapper>
          {routes}
        </AgeVerificationWrapper>
      ) : (
        routes
      )}
      <Toaster />
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <Router
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <AppContent />
      </Router>
    </AppProvider>
  );
}

export default App;