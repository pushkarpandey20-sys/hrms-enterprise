import { Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Toaster } from './components/ui/toaster';
import { useAuthStore } from './stores/authStore';
import AppLayout from './components/layout/AppLayout';

// Auth pages
import LoginPage from './pages/auth/LoginPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';

// Dashboard
import DashboardPage from './pages/dashboard/DashboardPage';

// Employees
import EmployeeListPage from './pages/employees/EmployeeListPage';
import EmployeeDetailPage from './pages/employees/EmployeeDetailPage';
import EmployeeOnboardingPage from './pages/employees/EmployeeOnboardingPage';
import OrgChartPage from './pages/employees/OrgChartPage';

// Attendance
import AttendanceDashboardPage from './pages/attendance/AttendanceDashboardPage';
import AttendanceRegisterPage from './pages/attendance/AttendanceRegisterPage';
import MyAttendancePage from './pages/attendance/MyAttendancePage';
import AttendancePoliciesPage from './pages/attendance/AttendancePoliciesPage';

// Leave
import LeaveManagementPage from './pages/leave/LeaveManagementPage';
import LeaveCalendarPage from './pages/leave/LeaveCalendarPage';
import MyLeavesPage from './pages/leave/MyLeavesPage';

// Payroll
import PayrollDashboardPage from './pages/payroll/PayrollDashboardPage';
import PayrollRunPage from './pages/payroll/PayrollRunPage';
import MyPayslipsPage from './pages/payroll/MyPayslipsPage';

// Assets
import AssetListPage from './pages/assets/AssetListPage';
import AssetDetailPage from './pages/assets/AssetDetailPage';

// Reports
import ReportsDashboardPage from './pages/reports/ReportsDashboardPage';

// Settings
import SettingsPage from './pages/settings/SettingsPage';

// Enterprise modules
import RBACPage from './pages/rbac/RBACPage';
import RepairPage from './pages/repair/RepairPage';
import PerformancePage from './pages/performance/PerformancePage';
import HelpdeskPage from './pages/helpdesk/HelpdeskPage';
import OffboardingPage from './pages/offboarding/OffboardingPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <>
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            
            {/* Employees */}
            <Route path="employees" element={<EmployeeListPage />} />
            <Route path="employees/new" element={<EmployeeOnboardingPage />} />
            <Route path="employees/org-chart" element={<OrgChartPage />} />
            <Route path="employees/:id" element={<EmployeeDetailPage />} />
            
            {/* Attendance */}
            <Route path="attendance" element={<AttendanceDashboardPage />} />
            <Route path="attendance/register" element={<AttendanceRegisterPage />} />
            <Route path="attendance/my" element={<MyAttendancePage />} />
            <Route path="attendance/policies" element={<AttendancePoliciesPage />} />
            
            {/* Leave */}
            <Route path="leave" element={<LeaveManagementPage />} />
            <Route path="leave/calendar" element={<LeaveCalendarPage />} />
            <Route path="leave/my" element={<MyLeavesPage />} />
            
            {/* Payroll */}
            <Route path="payroll" element={<PayrollDashboardPage />} />
            <Route path="payroll/run" element={<PayrollRunPage />} />
            <Route path="payroll/my-payslips" element={<MyPayslipsPage />} />
            
            {/* Assets */}
            <Route path="assets" element={<AssetListPage />} />
            <Route path="assets/:id" element={<AssetDetailPage />} />
            
            {/* Reports */}
            <Route path="reports" element={<ReportsDashboardPage />} />
            
            {/* Settings */}
            <Route path="settings" element={<SettingsPage />} />

            {/* Enterprise modules */}
            <Route path="rbac" element={<RBACPage />} />
            <Route path="repair" element={<RepairPage />} />
            <Route path="performance" element={<PerformancePage />} />
            <Route path="helpdesk" element={<HelpdeskPage />} />
            <Route path="offboarding" element={<OffboardingPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AnimatePresence>
      <Toaster />
    </>
  );
}
