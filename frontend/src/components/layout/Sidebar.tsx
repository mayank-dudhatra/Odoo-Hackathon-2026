import React from 'react';
import { NavLink } from 'react-router-dom';
import { Users, Shield, KeyRound, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { checkPermission, role } = useAuth();
  const isAdmin = role === 'Admin';

  const navItems = [
    {
      name: 'Users',
      path: '/users',
      icon: <Users className="w-[18px] h-[18px]" />,
      visible: isAdmin || checkPermission('USERS', 'READ'),
    },
    {
      name: 'Roles',
      path: '/roles',
      icon: <Shield className="w-[18px] h-[18px]" />,
      visible: isAdmin || checkPermission('ROLES', 'READ'),
    },
    {
      name: 'Permissions',
      path: '/permissions',
      icon: <KeyRound className="w-[18px] h-[18px]" />,
      visible: isAdmin || checkPermission('ROLES', 'READ') || checkPermission('USERS', 'READ'),
    },
  ];

  const visibleNavItems = navItems.filter((item) => item.visible);

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-xs lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-white border-r border-[#E2E8F0] flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#2563EB] flex items-center justify-center text-white font-bold text-base shadow-xs">
              P
            </div>
            <div>
              <span className="font-bold text-base text-[#0F172A] tracking-tight">PeoplePay</span>
              <span className="font-bold text-base text-[#2563EB]">360</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="lg:hidden p-1 rounded-md text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section Label */}
        <div className="px-6 pt-5 pb-2">
          <p className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider">
            Administration
          </p>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => {
                if (window.innerWidth < 1024) onClose();
              }}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'bg-[#EFF6FF] text-[#2563EB] font-semibold'
                    : 'text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A]'
                }`
              }
            >
              {item.icon}
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer info */}
        <div className="p-4 border-t border-[#E2E8F0] bg-[#F8FAFC]">
          <div className="flex items-center justify-between text-xs text-[#64748B]">
            <span>Phase 1 RBAC</span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium text-[10px]">
              Active
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};
