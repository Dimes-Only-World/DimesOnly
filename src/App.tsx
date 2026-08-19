import React from "react";
// App component - Dimes Only Network
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { AppProvider } from "@/contexts/AppContext";
import { Toaster } from "@/components/ui/toaster";
import AgeVerificationWrapper from "@/components/AgeVerificationWrapper";
import Index from "@/pages/Index";
import NewIndex from "@/pages/NewIndex";
import Login from "@/pages/Login";
import AdminLogin from "@/pages/AdminLogin";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import Events from "@/pages/Events";
import EventDetails from "@/pages/EventDetails";
import EventsDimes from "@/pages/EventsDimes";
import EventsDimesOnly from "@/pages/EventsDimesOnly";
import Rate from "@/pages/Rate";
import RateGirls from "@/pages/RateGirls";
import Rankings from "@/pages/Rankings";
import Tip from "@/pages/Tip";
import TipGirls from "@/pages/TipGirls";
import Upgrade from "@/pages/Upgrade";
import AdminDashboard from "@/pages/AdminDashboard";
import TestLogin from "@/pages/TestLogin";
import NotFound from "@/pages/NotFound";
import PaymentStatusHandler from "./components/PaymentStatusHandler";
import UpgradeDiamond from "./pages/UpgradeDiamond";
import Memberships from "./pages/Memberships";
import UpgradeSilverPlus from "./pages/UpgradeSilverPlus";
import UpgradeSilver from "./pages/UpgradeSilver";
import UpgradeGold from "./pages/UpgradeGold";
import UpgradeSilverSubscribe from "./pages/UpgradeSilverSubscribe";
import UpgradeDiamondMonthly from "./pages/UpgradeDiamondMonthly";
import DimesPage from "./pages/Dimes";
import Profile from "./pages/Profile";
import SubscriptionsDebug from "./pages/SubscriptionsDebug";
import Elite from "./pages/Elite";
import BusinessOwnerElite from "./pages/BusinessOwnerElite";
import ResetPassword from "./pages/ResetPassword";
import TipPayPalReturn from "./pages/TipPayPalReturn";
import EventPayPalReturn from "./pages/EventPayPalReturn";
import Jackpot from "./pages/Jackpot";
import Rentals from "./pages/Rentals";
import RentalDetails from "./pages/RentalDetails";
import MyBookings from "./pages/MyBookings";
import Feed from "./pages/Feed";
import FeedCreate from "./pages/FeedCreate";
import GARefTracker from "./components/GARefTracker";
import GlobalVideoDownloadBlocker from "./components/GlobalVideoDownloadBlocker";
import NotificationBell from "./components/NotificationBell";
import AddToHomeScreenPrompt from "./components/AddToHomeScreenPrompt";
import "./App.css";

// Error boundary to catch any rendering errors
class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("App render error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          minHeight: '100vh', 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: '#000',
          color: '#fff',
          padding: '20px',
          textAlign: 'center'
        }}>
          <h1 style={{ color: '#f97316', marginBottom: '10px' }}>Something went wrong</h1>
          <p>Please refresh the page to try again.</p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              backgroundColor: '#f97316',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Refresh Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppContent() {
  const location = useLocation();
  const isHomePage = location.pathname === "/" || location.pathname === "/failsafe";
  const hideNotificationBell = ["/", "/failsafe", "/login", "/register", "/adminlogin"].includes(
    location.pathname,
  );
  const showNotificationBell = location.pathname.startsWith("/dashboard");

  const routes = (
    <Routes>
      <Route path="/" element={<NewIndex />} />
      <Route path="/failsafe" element={<Index />} />
      <Route path="/login" element={<Login />} />
      <Route path="/adminlogin" element={<AdminLogin />} />
      <Route path="/test-login" element={<TestLogin />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={<Navigate to="/dashboard/profile" replace />} />
      <Route path="/dashboard/:tab" element={<Dashboard />} />
      <Route path="/events" element={<Events />} />
      <Route path="/event-details" element={<EventDetails />} />
      <Route path="/eventsdimes" element={<EventsDimes />} />
      <Route path="/events-dimes-only" element={<EventsDimesOnly />} />
      <Route path="/rate" element={<Rate />} />
      <Route path="/rate-girls" element={<RateGirls />} />
      <Route path="/rankings" element={<Rankings />} />
      <Route path="/tip" element={<Tip />} />
      <Route path="/tip-girls" element={<TipGirls />} />
      <Route path="/dimes" element={<DimesPage />} />
      <Route path="/upgrade" element={<Upgrade />} />
      <Route path="/upgrade-diamond" element={<UpgradeDiamond />} />
      <Route path="/memberships" element={<Memberships />} />
      <Route path="/upgrade-silver-plus" element={<UpgradeSilverPlus />} />
      <Route path="/upgrade-silver" element={<UpgradeSilver />} />
      <Route path="/upgrade-silver-subscribe" element={<UpgradeSilverSubscribe />} />
      <Route path="/upgrade-gold" element={<UpgradeGold />} />
      <Route path="/upgrade-diamond-monthly" element={<UpgradeDiamondMonthly />} />
      <Route path="/elite" element={<Elite />} />
      <Route path="/business-owner-elite" element={<BusinessOwnerElite />} />
      <Route path="/profile/:username" element={<Profile />} />
      <Route path="/payment-return" element={<PaymentStatusHandler />} />
      <Route path="/debug-subscription" element={<SubscriptionsDebug />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/tip-paypal-return" element={<TipPayPalReturn />} />
      <Route path="/event-payment-return" element={<EventPayPalReturn />} />
      <Route path="/jackpot" element={<Jackpot />} />
      <Route path="/rentals" element={<Rentals />} />
      <Route path="/rental" element={<Rentals />} />
      <Route path="/rentals/:id" element={<RentalDetails />} />
      <Route path="/my-bookings" element={<MyBookings />} />
      <Route path="/feed" element={<Feed />} />
      <Route path="/feed/create" element={<FeedCreate />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );

  return (
    <div className="App">
      <GARefTracker />
      <GlobalVideoDownloadBlocker />
      
      {showNotificationBell && (
        <NotificationBell className="fixed top-3 right-3 z-[60]" />
      )}
      {!hideNotificationBell && <AddToHomeScreenPrompt />}
      {isHomePage ? (
        <AgeVerificationWrapper>{routes}</AgeVerificationWrapper>
      ) : (
        routes
      )}
      <Toaster />
    </div>
  );
}

function App() {
  return (
    <AppErrorBoundary>
      <AppProvider>
        <Router
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <AppContent />
        </Router>
      </AppProvider>
    </AppErrorBoundary>
  );
}

export default App;
