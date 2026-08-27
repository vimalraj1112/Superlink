import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import Sites from './pages/Sites';
import SiteDetail from './pages/SiteDetail';
import Isps from './pages/Isps';
import IspDetail from './pages/IspDetail';
import Tickets from './pages/Tickets';
import TicketDetail from './pages/TicketDetail';
import Payments from './pages/Payments';
import PaymentDetail from './pages/PaymentDetail';
import PaymentForm from './pages/PaymentForm';
import GisMap from './pages/GisMap';
import Settings from './pages/Settings';
import ImportExport from './pages/ImportExport';
import Profile from './pages/Profile';
import Users from './pages/Users';
import Quotations from './pages/Quotations';
import QuotationDetail from './pages/QuotationDetail';
import QuotationEdit from './pages/QuotationEdit';
import Layout from './components/layout/Layout';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function PrivateRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route element={<Layout />}>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="customers" element={<Customers />} />
        <Route path="customers/new" element={<Customers />} />
        <Route path="customers/:id" element={<CustomerDetail />} />
        <Route path="customers/:id/edit" element={<Customers />} />
        <Route path="sites" element={<Sites />} />
        <Route path="sites/new" element={<Sites />} />
        <Route path="sites/:id" element={<SiteDetail />} />
        <Route path="sites/:id/edit" element={<Sites />} />
        <Route path="isps" element={<Isps />} />
        <Route path="isps/new" element={<Isps />} />
        <Route path="isps/:id" element={<IspDetail />} />
        <Route path="isps/:id/edit" element={<Isps />} />
        <Route path="tickets" element={<Tickets />} />
        <Route path="tickets/new" element={<Tickets />} />
        <Route path="tickets/:id" element={<TicketDetail />} />
        <Route path="tickets/:id/edit" element={<Tickets />} />
        <Route path="payments" element={<Payments />} />
        <Route path="payments/:id" element={<PaymentDetail />} />
        <Route path="payments/new" element={<PaymentForm />} />
        <Route path="payments/:id/edit" element={<PaymentForm />} />
        <Route path="gis" element={<GisMap />} />
        <Route path="settings" element={<Settings />} />
        <Route path="import-export" element={<ImportExport />} />
        <Route path="profile" element={<Profile />} />
        <Route path="users" element={<Users />} />
        <Route path="quotations" element={<Quotations />} />
        <Route path="quotations/new" element={<QuotationEdit />} />
        <Route path="quotations/:id" element={<QuotationDetail />} />
        <Route path="quotations/:id/edit" element={<QuotationEdit />} />
      </Route>
    </Routes>
  );
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SocketProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/*" element={<PrivateRoutes />} />
            </Routes>
            <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
          </SocketProvider>
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}

export default AppRoutes;