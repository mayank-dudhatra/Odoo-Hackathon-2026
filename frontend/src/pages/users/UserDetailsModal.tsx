import React from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { getStatusBadgeVariant } from '../../utils/status';
import type { User } from '../../types/users';
import { Mail, Calendar, Shield, Briefcase, Hash } from 'lucide-react';

interface UserDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

export const UserDetailsModal: React.FC<UserDetailsModalProps> = ({ isOpen, onClose, user }) => {
  if (!user) return null;

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'Never';
    try {
      return new Date(dateStr).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="User Information"
      description={`System ID: #${user.user_id}`}
      maxWidth="md"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="space-y-4 text-sm">
        {/* User Identity Header */}
        <div className="flex items-center gap-3 p-3.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
          <div className="w-12 h-12 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] text-[#2563EB] flex items-center justify-center font-bold text-base shrink-0">
            {user.username.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-base font-semibold text-[#0F172A] truncate">
                {user.username}
              </h4>
              <Badge variant={getStatusBadgeVariant(user.status)}>
                {user.status}
              </Badge>
            </div>
            <p className="text-xs text-[#64748B] flex items-center gap-1.5 mt-0.5 truncate">
              <Mail className="w-3.5 h-3.5 shrink-0" />
              <span>{user.email}</span>
            </p>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="p-3 bg-white border border-[#E2E8F0] rounded-lg">
            <span className="text-xs text-[#64748B] font-medium flex items-center gap-1.5 mb-1">
              <Shield className="w-3.5 h-3.5 text-[#2563EB]" />
              Assigned Role
            </span>
            <span className="font-semibold text-[#0F172A]">
              {user.role_name || 'No Role'}
            </span>
          </div>

          <div className="p-3 bg-white border border-[#E2E8F0] rounded-lg">
            <span className="text-xs text-[#64748B] font-medium flex items-center gap-1.5 mb-1">
              <Briefcase className="w-3.5 h-3.5 text-[#0284C7]" />
              Employee Profile
            </span>
            <span className="font-semibold text-[#0F172A]">
              {user.employee_code ? (
                `${user.employee_code} ${user.first_name ? `(${user.first_name} ${user.last_name || ''})` : ''}`
              ) : (
                <span className="text-[#94A3B8] font-normal italic">Unlinked</span>
              )}
            </span>
          </div>

          <div className="p-3 bg-white border border-[#E2E8F0] rounded-lg">
            <span className="text-xs text-[#64748B] font-medium flex items-center gap-1.5 mb-1">
              <Calendar className="w-3.5 h-3.5 text-[#16A34A]" />
              Last Login
            </span>
            <span className="text-xs text-[#0F172A] font-medium">
              {formatDate(user.last_login_at)}
            </span>
          </div>

          <div className="p-3 bg-white border border-[#E2E8F0] rounded-lg">
            <span className="text-xs text-[#64748B] font-medium flex items-center gap-1.5 mb-1">
              <Hash className="w-3.5 h-3.5 text-[#64748B]" />
              Created On
            </span>
            <span className="text-xs text-[#0F172A] font-medium">
              {formatDate(user.created_at)}
            </span>
          </div>
        </div>
      </div>
    </Modal>
  );
};
