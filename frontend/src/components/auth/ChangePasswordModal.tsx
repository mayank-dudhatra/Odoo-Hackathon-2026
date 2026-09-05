import React, { useState } from 'react';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle2, ShieldAlert, LogOut } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { useNavigate } from 'react-router-dom';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose?: () => void;
  isForced?: boolean;
  initialCurrentPassword?: string;
  onSuccess?: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  isForced = false,
  initialCurrentPassword = '',
  onSuccess,
}) => {
  const { changePassword, logout, user } = useAuth();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState(initialCurrentPassword);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!currentPassword) {
      setErrorMessage('Current password is required.');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword === currentPassword) {
      setErrorMessage('New password must be different from your current password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('New password and confirm password do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });

      setSuccessMessage('Password changed successfully! Redirecting to dashboard...');
      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        } else if (onClose) {
          onClose();
        }
      }, 1000);
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setErrorMessage(errorObj?.message || 'Failed to update password. Please check your current password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs transition-opacity"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="fixed inset-0"
        onClick={() => {
          if (!isForced && onClose) onClose();
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-md bg-white rounded-xl border border-[#E2E8F0] shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isForced ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
              {isForced ? <ShieldAlert className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#0F172A]">
                {isForced ? 'Change Temporary Password' : 'Change Password'}
              </h3>
              <p className="text-xs text-[#64748B]">
                {isForced
                  ? 'You must set a permanent password before accessing your dashboard.'
                  : `Update credentials for ${user?.email || 'your account'}`}
              </p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {isForced && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <span>
                Your account was set up with a temporary password. Choose a strong new password to activate full dashboard access.
              </span>
            </div>
          )}

          {errorMessage && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Current Password */}
            <div>
              <Input
                label={isForced ? 'Temporary / Current Password' : 'Current Password'}
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                required
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="text-slate-400 hover:text-slate-600 focus:outline-none"
                    tabIndex={-1}
                  >
                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />
            </div>

            {/* New Password */}
            <div>
              <Input
                label="New Password"
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                required
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="text-slate-400 hover:text-slate-600 focus:outline-none"
                    tabIndex={-1}
                  >
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />
            </div>

            {/* Confirm New Password */}
            <div>
              <Input
                label="Confirm New Password"
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                required
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="text-slate-400 hover:text-slate-600 focus:outline-none"
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />
            </div>

            {/* Actions */}
            <div className="pt-2 flex flex-col gap-2">
              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmitting}
                className="w-full justify-center"
              >
                {isForced ? 'Update Password & Access Dashboard' : 'Update Password'}
              </Button>

              {!isForced && onClose && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="w-full justify-center"
                >
                  Cancel
                </Button>
              )}

              {isForced && (
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="mt-2 text-xs text-[#64748B] hover:text-[#0F172A] flex items-center justify-center gap-1.5 transition-colors cursor-pointer py-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Switch account or Sign out</span>
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
