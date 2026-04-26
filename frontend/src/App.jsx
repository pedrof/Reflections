import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import './index.css';

import { useAuthStore } from './store/auth.store.js';
import AppLayout from './components/layout/AppLayout.jsx';
import Spinner from './components/ui/Spinner.jsx';

// Pages
import LoginPage from './pages/auth/LoginPage.jsx';
import DashboardPage from './pages/dashboard/DashboardPage.jsx';
import SetupPage from './pages/setup/SetupPage.jsx';
import AccomplishmentsPage from './pages/accomplishments/AccomplishmentsPage.jsx';
import NewAccomplishmentPage from './pages/accomplishments/NewAccomplishmentPage.jsx';
import AccomplishmentDetailPage from './pages/accomplishments/AccomplishmentDetailPage.jsx';
import WARPage from './pages/war/WARPage.jsx';
import CommsDashboardPage from './pages/comms/CommsDashboardPage.jsx';
import CommsAccomplishmentsPage from './pages/comms/CommsAccomplishmentsPage.jsx';
import CommsReportPage from './pages/comms/CommsReportPage.jsx';
import TeamPage from './pages/supervisor/TeamPage.jsx';
import TeamAccomplishmentsPage from './pages/supervisor/TeamAccomplishmentsPage.jsx';
import TenantsPage from './pages/admin/TenantsPage.jsx';
import UsersPage from './pages/admin/UsersPage.jsx';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

function RequireAuth() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-900">
        <Spinner size="lg" />
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  return <Outlet />;
}

function RequireRole({ roles }) {
  const { hasRole } = useAuthStore();
  const allowed = roles.some((r) => hasRole(r));
  if (!allowed) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

function AppInit({ children }) {
  const init = useAuthStore((s) => s.init);
  useEffect(() => { init(); }, [init]);
  return children;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppInit>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<RequireAuth />}>
              <Route element={<AppLayout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/setup/*" element={<SetupPage />} />
                <Route path="/accomplishments" element={<AccomplishmentsPage />} />
                <Route path="/accomplishments/new" element={<NewAccomplishmentPage />} />
                <Route path="/accomplishments/:id" element={<AccomplishmentDetailPage />} />
                <Route path="/war" element={<WARPage />} />

                <Route element={<RequireRole roles={['comms', 'supervisor', 'super_admin']} />}>
                  <Route path="/comms" element={<CommsDashboardPage />} />
                  <Route path="/comms/accomplishments" element={<CommsAccomplishmentsPage />} />
                  <Route path="/comms/report" element={<CommsReportPage />} />
                </Route>

                <Route element={<RequireRole roles={['supervisor', 'super_admin']} />}>
                  <Route path="/supervisor/team" element={<TeamPage />} />
                  <Route path="/supervisor/accomplishments" element={<TeamAccomplishmentsPage />} />
                </Route>

                <Route element={<RequireRole roles={['super_admin']} />}>
                  <Route path="/admin/tenants" element={<TenantsPage />} />
                  <Route path="/admin/users" element={<UsersPage />} />
                </Route>
              </Route>
            </Route>
          </Routes>
        </AppInit>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
