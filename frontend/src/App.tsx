import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { LoginPage } from './pages/auth/LoginPage';
import { UsersPage } from './pages/users/UsersPage';
import { RolesPage } from './pages/roles/RolesPage';
import { PermissionsPage } from './pages/permissions/PermissionsPage';
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
            <Route index element={<Navigate to="/users" replace />} />
            
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
