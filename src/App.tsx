import React, { lazy, Suspense, useEffect, useState } from 'react';
import { CrmProvider, useCrm } from './context/CrmContext';
import { NavigationModule, UserItem } from './types';
import { LoginPage } from './components/auth/LoginPage';
import { ChangePasswordPage } from './components/auth/ChangePasswordPage';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { ToastContainer } from './components/common/ToastContainer';
import { UserPreferences, UserPreferencesModal } from './components/common/UserPreferencesModal';

// Module Views
const DashboardView = lazy(() => import('./components/modules/DashboardView').then((module) => ({ default: module.DashboardView })));
const ActivitiesView = lazy(() => import('./components/modules/ActivitiesView').then((module) => ({ default: module.ActivitiesView })));
const OpportunitiesView = lazy(() => import('./components/modules/OpportunitiesView').then((module) => ({ default: module.OpportunitiesView })));
const RequestsView = lazy(() => import('./components/modules/RequestsView').then((module) => ({ default: module.RequestsView })));
const ProposalsView = lazy(() => import('./components/modules/ProposalsView').then((module) => ({ default: module.ProposalsView })));
const OrdersView = lazy(() => import('./components/modules/OrdersView').then((module) => ({ default: module.OrdersView })));
const ContractsView = lazy(() => import('./components/modules/ContractsView').then((module) => ({ default: module.ContractsView })));
const GuaranteeLettersView = lazy(() => import('./components/modules/GuaranteeLettersView').then((module) => ({ default: module.GuaranteeLettersView })));
const ActivityReportsView = lazy(() => import('./components/modules/ActivityReportsView').then((module) => ({ default: module.ActivityReportsView })));
const ProposalReportsView = lazy(() => import('./components/modules/ProposalReportsView').then((module) => ({ default: module.ProposalReportsView })));
const UsersView = lazy(() => import('./components/modules/UsersView').then((module) => ({ default: module.UsersView })));
const CustomersView = lazy(() => import('./components/modules/CustomersView').then((module) => ({ default: module.CustomersView })));
const StakeholdersView = lazy(() => import('./components/modules/StakeholdersView').then((module) => ({ default: module.StakeholdersView })));
const ProductsView = lazy(() => import('./components/modules/ProductsView').then((module) => ({ default: module.ProductsView })));
const AuditLogsView = lazy(() => import('./components/modules/AuditLogsView').then((module) => ({ default: module.AuditLogsView })));
import { applyTheme, getStoredTheme } from './utils/theme';
import { changePassword as changeApiPassword, getCurrentUser, login, logout } from './utils/api';

const MainLayout: React.FC<{ authenticatedUser: UserItem; onLogout: () => void }> = ({ authenticatedUser, onLogout }) => {
  const { currentModule, setCurrentModule, setCurrentUser } = useCrm();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);

  useEffect(() => {
    setCurrentUser(authenticatedUser);
    try {
      const stored = localStorage.getItem(`issd_crm_preferences_${authenticatedUser.email.toLowerCase()}`);
      const preferences = stored ? JSON.parse(stored) as { compactTables?: boolean } : {};
      document.documentElement.dataset.tableDensity = preferences.compactTables ? 'compact' : 'comfortable';
    } catch {
      document.documentElement.dataset.tableDensity = 'comfortable';
    }
  }, [authenticatedUser, setCurrentUser]);

  useEffect(() => {
    const nextPath = `/${currentModule}`;
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath);
    }
  }, [currentModule]);

  useEffect(() => {
    const handlePopState = () => {
      const modulePath = window.location.pathname.replace(/^\/+|\/+$/g, '') || 'dashboard';
      const validModules: NavigationModule[] = [
        'dashboard', 'activities', 'opportunities', 'requests', 'proposals', 'orders', 'contracts',
        'activity-reports', 'proposal-reports', 'users', 'customers', 'products', 'guarantees',
        'audit-logs', 'stakeholders',
      ];
      if (validModules.includes(modulePath as NavigationModule)) {
        setCurrentModule(modulePath as NavigationModule);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [authenticatedUser, setCurrentUser]);

  const renderModule = () => {
    switch (currentModule) {
      case 'dashboard':
        return <DashboardView />;
      case 'activities':
        return <ActivitiesView />;
      case 'opportunities':
        return <OpportunitiesView />;
      case 'requests':
        return <RequestsView />;
      case 'proposals':
        return <ProposalsView />;
      case 'orders':
        return <OrdersView />;
      case 'contracts':
        return <ContractsView />;
      case 'guarantees':
        return <GuaranteeLettersView />;
      case 'activity-reports':
      case 'activity_reports' as string:
        return <ActivityReportsView />;
      case 'proposal-reports':
      case 'proposal_reports' as string:
        return <ProposalReportsView />;
      case 'users':
        return <UsersView />;
      case 'customers':
        return <CustomersView />;
      case 'stakeholders':
        return <StakeholdersView />;
      case 'products':
        return <ProductsView />;
      case 'audit-logs':
        return <AuditLogsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800 overflow-hidden antialiased selection:bg-indigo-600 selection:text-white">
      {/* Left Navigation Sidebar */}
      <Sidebar
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onExpandedChange={setIsSidebarExpanded}
      />

      {/* Main App Canvas */}
      <div className={`flex-1 flex flex-col min-w-0 overflow-hidden transition-[padding] duration-200 ${isSidebarExpanded ? 'lg:pl-64' : 'lg:pl-20'}`}>
        {/* Top Header */}
        <Header
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onOpenSettings={() => setIsPreferencesOpen(true)}
          onLogout={onLogout}
        />

        {/* Dynamic Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-50/50">
          <div className="max-w-7xl mx-auto space-y-6">
            <Suspense fallback={<div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500">Modül yükleniyor...</div>}>
              {renderModule()}
            </Suspense>
          </div>
        </main>
      </div>

      {/* Global Toast Notifications */}
      <ToastContainer />
      <UserPreferencesModal
        isOpen={isPreferencesOpen}
        onClose={() => setIsPreferencesOpen(false)}
        user={authenticatedUser}
        onSaved={(preferences: UserPreferences) => {
          document.documentElement.dataset.tableDensity = preferences.compactTables ? 'compact' : 'comfortable';
          window.dispatchEvent(new CustomEvent('crm-preferences-changed'));
        }}
      />
    </div>
  );
};

function AuthenticatedApp() {
  const { currentUser: authenticatedUser, login, logout, updatePassword, isAuthenticated } = useCrm();

  useEffect(() => {
    applyTheme(getStoredTheme());
  }, []);

  const handleLogin = async (email: string, password: string, rememberMe: boolean) => {
    await login(email, password, rememberMe);
  };

  const handleLogout = async () => {
    await logout();
  };

  const handlePasswordChanged = async (password: string) => {
    await updatePassword(password);
  };

  if (!authenticatedUser || !isAuthenticated || !authenticatedUser.id) {
    return <LoginPage onLogin={handleLogin} />;
  }

  if (authenticatedUser.mustChangePassword) {
    return <ChangePasswordPage user={authenticatedUser} onChanged={handlePasswordChanged} />;
  }

  return <MainLayout authenticatedUser={authenticatedUser} onLogout={handleLogout} />;
}

export function App() {
  return (
    <CrmProvider>
      <AuthenticatedApp />
    </CrmProvider>
  );
}

export default App;
