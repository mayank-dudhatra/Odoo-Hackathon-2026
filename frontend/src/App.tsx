import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { LoginPage } from './pages/auth/LoginPage';
import { UsersPage } from './pages/users/UsersPage';
import { RolesPage } from './pages/roles/RolesPage';
import { PermissionsPage } from './pages/permissions/PermissionsPage';
import { DepartmentsPage } from './pages/departments/DepartmentsPage';
import { PositionsPage } from './pages/positions/PositionsPage';
import { EmployeeTypesPage } from './pages/employee-types/EmployeeTypesPage';
import { EmployeesPage } from './pages/employees/EmployeesPage';
import { EmployeeDetailPage } from './pages/employees/EmployeeDetailPage';
import { EmployeeFormPage } from './pages/employees/EmployeeFormPage';
import { ForbiddenPage } from './pages/error/ForbiddenPage';
import { NotFoundPage } from './pages/error/NotFoundPage';

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
            <Route index element={<Navigate to="/employees" replace />} />

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
