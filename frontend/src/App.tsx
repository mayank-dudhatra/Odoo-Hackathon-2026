import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';

function RoleHomeRedirect() {
  return <Navigate to="/dashboard" replace />;
}

// Dashboard Page
import { DashboardPage } from './pages/dashboard/DashboardPage';

// Profile Page
import { UserProfilePage } from './pages/profile/UserProfilePage';

// Phase 1 Pages
import { LoginPage } from './pages/auth/LoginPage';
import { UsersPage } from './pages/users/UsersPage';
import { UserDetailPage } from './pages/users/UserDetailPage';
import { RolesPage } from './pages/roles/RolesPage';
import { PermissionsPage } from './pages/permissions/PermissionsPage';
import { ForbiddenPage } from './pages/error/ForbiddenPage';
import { NotFoundPage } from './pages/error/NotFoundPage';

// Phase 2 Pages
import { DepartmentsPage } from './pages/departments/DepartmentsPage';
import { PositionsPage } from './pages/positions/PositionsPage';
import { EmployeeTypesPage } from './pages/employee-types/EmployeeTypesPage';
import { EmployeesPage } from './pages/employees/EmployeesPage';
import { EmployeeDetailPage } from './pages/employees/EmployeeDetailPage';
import { EmployeeFormPage } from './pages/employees/EmployeeFormPage';

// Phase 3 Pages
import { SchedulesPage } from './pages/schedules/SchedulesPage';
import { ContractsPage } from './pages/contracts/ContractsPage';
import { ContractDetailPage } from './pages/contracts/ContractDetailPage';

// Phase 4 Pages
import { AttendancePage } from './pages/attendance/AttendancePage';
import { MyAttendancePage } from './pages/attendance/MyAttendancePage';
import { AttendancePoliciesPage } from './pages/attendance/AttendancePoliciesPage';

// Phase 5 Pages
import { TimeOffPage } from './pages/time-off/TimeOffPage';

// Phase 6 Pages
import { SalaryStructuresPage } from './pages/salary/SalaryStructuresPage';
import { SalaryRulesPage } from './pages/salary/SalaryRulesPage';

// Phase 7 Pages
import { PayrunsPage } from './pages/payroll/PayrunsPage';
import { PayrunDetailPage } from './pages/payroll/PayrunDetailPage';
import { PayrollHistoryPage } from './pages/payroll/PayrollHistoryPage';

// Phase 8 Pages
import { PayslipsPage } from './pages/payslips/PayslipsPage';
import { PayslipDetailPage } from './pages/payslips/PayslipDetailPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Authentication Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Authenticated Application Shell */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<RoleHomeRedirect />} />

            {/* Role-Aware User Dashboard */}
            <Route path="/dashboard" element={<DashboardPage />} />

            {/* User Profile */}
            <Route path="/profile" element={<UserProfilePage />} />

            {/* Phase 2: Employee & Organization Routes */}
            <Route
              path="/employees"
              element={
                <ProtectedRoute requiredPermission={{ module: 'EMPLOYEES', action: 'READ' }}>
                  <EmployeesPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/employees/new"
              element={
                <ProtectedRoute requiredPermission={{ module: 'EMPLOYEES', action: 'CREATE' }}>
                  <EmployeeFormPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/employees/:id"
              element={
                <ProtectedRoute requiredPermission={{ module: 'EMPLOYEES', action: 'READ' }}>
                  <EmployeeDetailPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/employees/:id/edit"
              element={
                <ProtectedRoute requiredPermission={{ module: 'EMPLOYEES', action: 'UPDATE' }}>
                  <EmployeeFormPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/departments"
              element={
                <ProtectedRoute requiredPermission={{ module: 'DEPARTMENTS', action: 'READ' }}>
                  <DepartmentsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/positions"
              element={
                <ProtectedRoute requiredPermission={{ module: 'POSITIONS', action: 'READ' }}>
                  <PositionsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/employee-types"
              element={
                <ProtectedRoute requiredPermission={{ module: 'EMPLOYEE_TYPES', action: 'READ' }}>
                  <EmployeeTypesPage />
                </ProtectedRoute>
              }
            />

            {/* Phase 3: Contracts & Working Schedules */}
            <Route
              path="/working-schedules"
              element={
                <ProtectedRoute requiredPermission={{ module: 'WORKING_SCHEDULES', action: 'READ' }}>
                  <SchedulesPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/contracts"
              element={
                <ProtectedRoute requiredPermission={{ module: 'CONTRACTS', action: 'READ' }}>
                  <ContractsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/contracts/:id"
              element={
                <ProtectedRoute requiredPermission={{ module: 'CONTRACTS', action: 'READ' }}>
                  <ContractDetailPage />
                </ProtectedRoute>
              }
            />

            {/* Phase 4: Attendance */}
            <Route
              path="/attendance"
              element={
                <ProtectedRoute requiredPermission={{ module: 'ATTENDANCE', action: 'READ' }}>
                  <AttendancePage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/my-attendance"
              element={
                <ProtectedRoute>
                  <MyAttendancePage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/attendance-policies"
              element={
                <ProtectedRoute requiredPermission={{ module: 'ATTENDANCE_POLICIES', action: 'READ' }}>
                  <AttendancePoliciesPage />
                </ProtectedRoute>
              }
            />

            {/* Phase 5: Time Off / Leaves */}
            <Route
              path="/time-off"
              element={
                <ProtectedRoute>
                  <TimeOffPage />
                </ProtectedRoute>
              }
            />

            {/* Phase 6: Salary Structures & Rules */}
            <Route
              path="/salary-structures"
              element={
                <ProtectedRoute requiredPermission={{ module: 'SALARY_STRUCTURES', action: 'READ' }}>
                  <SalaryStructuresPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/salary-rules"
              element={
                <ProtectedRoute requiredPermission={{ module: 'SALARY_RULES', action: 'READ' }}>
                  <SalaryRulesPage />
                </ProtectedRoute>
              }
            />

            {/* Phase 7: Payroll / Payruns */}
            <Route
              path="/payroll/payruns"
              element={
                <ProtectedRoute requiredPermission={{ module: 'PAYRUNS', action: 'READ' }}>
                  <PayrunsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/payroll/payruns/:id"
              element={
                <ProtectedRoute requiredPermission={{ module: 'PAYRUNS', action: 'READ' }}>
                  <PayrunDetailPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/payroll/history"
              element={
                <ProtectedRoute requiredPermission={{ module: 'PAYRUNS', action: 'READ' }}>
                  <PayrollHistoryPage />
                </ProtectedRoute>
              }
            />

            {/* Phase 8: Payslips */}
            <Route
              path="/payslips"
              element={
                <ProtectedRoute>
                  <PayslipsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/payslips/:id"
              element={
                <ProtectedRoute>
                  <PayslipDetailPage />
                </ProtectedRoute>
              }
            />

            {/* Phase 1: Administration Routes */}
            <Route
              path="/users"
              element={
                <ProtectedRoute requiredPermission={{ module: 'USERS', action: 'READ' }}>
                  <UsersPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/users/:id"
              element={
                <ProtectedRoute requiredPermission={{ module: 'USERS', action: 'READ' }}>
                  <UserDetailPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/roles"
              element={
                <ProtectedRoute requiredPermission={{ module: 'ROLES', action: 'READ' }}>
                  <RolesPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/permissions"
              element={
                <ProtectedRoute>
                  <PermissionsPage />
                </ProtectedRoute>
              }
            />

            <Route path="/forbidden" element={<ForbiddenPage />} />
          </Route>

          {/* Catch-all 404 Route */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
