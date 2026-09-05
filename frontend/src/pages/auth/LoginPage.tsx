import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Eye, EyeOff, Lock, Mail, AlertCircle } from 'lucide-react';

function getRoleHomePath(roleName?: string | null, employeeId?: number | null): string {
  if (!roleName) return '/employees';
  if (roleName === 'Admin') return '/users';
  if (roleName === 'HR Manager') return '/employees';
  if (roleName === 'Payroll Manager' || roleName === 'Payroll User') return '/payroll/payruns';
  if (roleName === 'Employee') return employeeId ? `/employees/${employeeId}` : '/time-off';
  return '/employees';
}

export const LoginPage: React.FC = () => {
  const { login, isAuthenticated, isLoading: authLoading, user } = useAuth();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errors, setErrors] = useState<{ identifier?: string; password?: string; general?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already authenticated, redirect to role home
  if (isAuthenticated && !authLoading) {
    const destination = getRoleHomePath(user?.role_name, user?.employee_id);
    return <Navigate to={destination} replace />;
  }

  const validate = (): boolean => {
    const newErrors: { identifier?: string; password?: string } = {};

    if (!identifier.trim()) {
      newErrors.identifier = 'Email or username is required';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      const loggedInUser = await login({
        identifier: identifier.trim(),
        password,
        remember_me: rememberMe,
      });

      const destination = getRoleHomePath(
        loggedInUser?.role_name || user?.role_name,
        loggedInUser?.employee_id || user?.employee_id
      );
      navigate(destination, { replace: true });
    } catch (err: unknown) {
      const errorObj = err as { message?: string; code?: string };
      let message = errorObj?.message || 'Login failed. Please check your credentials and try again.';

      if (errorObj?.code === 'ACCOUNT_DISABLED') {
        message = 'This account has been disabled. Please contact your system administrator.';
      } else if (errorObj?.code === 'ACCOUNT_NOT_ACTIVATED' || errorObj?.code === 'INVITED') {
        message = 'This account is pending activation. Please accept your email invitation.';
      }

      setErrors({ general: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#2563EB] text-white font-bold text-2xl shadow-xs mb-4">
          P
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-[#0F172A]">
          PeoplePay<span className="text-[#2563EB]">360</span>
        </h2>
        <p className="mt-1 text-sm text-[#475569]">
          Enterprise HR & Payroll Management
        </p>
      </div>

      {/* Login Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-xl border border-[#E2E8F0] shadow-sm">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-[#0F172A]">Sign in to your account</h3>
            <p className="text-xs text-[#64748B] mt-0.5">
              Enter your corporate credentials to access the workspace
            </p>
          </div>

          {/* General Error Banner */}
          {errors.general && (
            <div className="mb-5 p-3.5 bg-[#FEE2E2] border border-[#FECACA] rounded-lg flex items-start gap-2.5 text-xs text-[#DC2626]">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errors.general}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Identifier (Email / Username) */}
            <Input
              label="Email or Username"
              type="text"
              id="identifier"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="e.g. admin@peoplepay360.demo"
              error={errors.identifier}
              leftIcon={<Mail className="w-4 h-4" />}
              required
              autoComplete="username"
              autoFocus
            />

            {/* Password */}
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              error={errors.password}
              leftIcon={<Lock className="w-4 h-4" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 hover:text-[#0F172A] focus:outline-none cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              required
              autoComplete="current-password"
            />

            {/* Remember Me */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-[#2563EB] border-[#CBD5E1] rounded focus:ring-[#2563EB] cursor-pointer"
                />
                <span className="text-xs text-[#475569] font-medium">Keep me signed in</span>
              </label>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                className="w-full"
                isLoading={isSubmitting}
              >
                Sign In
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
