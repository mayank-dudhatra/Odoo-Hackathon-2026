import React, { useState, useRef, useEffect } from 'react';
import { Menu, LogOut, ChevronDown, UserCheck } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Badge } from '../common/Badge';

interface HeaderProps {
  onMenuToggle: () => void;
  pageTitle?: string;
}

export const Header: React.FC<HeaderProps> = ({ onMenuToggle, pageTitle = 'PeoplePay360' }) => {
  const { user, role, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logout();
  };

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name.slice(0, 2).toUpperCase();
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  return (
    <header className="h-16 bg-white border-b border-[#E2E8F0] sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 lg:px-8">
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuToggle}
          className="lg:hidden p-2 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-[#0F172A] tracking-tight">
            {pageTitle}
          </h1>
        </div>
      </div>

      {/* Right: User Menu & Role */}
      <div className="flex items-center gap-3">
        {role && (
          <div className="hidden sm:block">
            <Badge variant={role === 'Admin' ? 'info' : 'neutral'}>
              {role}
            </Badge>
          </div>
        )}

        {/* User Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-[#F8FAFC] transition-colors cursor-pointer"
            aria-expanded={dropdownOpen}
            aria-haspopup="true"
          >
            <div className="w-8 h-8 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] text-[#2563EB] flex items-center justify-center font-semibold text-xs">
              {getInitials(user?.username, user?.email)}
            </div>
            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-semibold text-[#0F172A] leading-tight">
                {user?.username || 'User'}
              </span>
              <span className="text-[11px] text-[#64748B] leading-tight max-w-[150px] truncate">
                {user?.email || ''}
              </span>
            </div>
            <ChevronDown className="w-4 h-4 text-[#64748B]" />
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-1 w-56 bg-white rounded-lg border border-[#E2E8F0] shadow-md py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3.5 py-2 border-b border-[#E2E8F0]">
                <p className="text-xs font-medium text-[#0F172A] truncate">
                  {user?.username || 'Signed in'}
                </p>
                <p className="text-xs text-[#64748B] truncate">{user?.email}</p>
                <div className="mt-1.5 sm:hidden">
                  <Badge variant={role === 'Admin' ? 'info' : 'neutral'}>
                    {role || 'User'}
                  </Badge>
                </div>
              </div>

              <div className="py-1">
                <div className="px-3.5 py-1.5 text-xs text-[#64748B] flex items-center gap-2">
                  <UserCheck className="w-3.5 h-3.5 text-[#16A34A]" />
                  <span>Status: <strong className="text-[#0F172A]">{user?.status || 'Active'}</strong></span>
                </div>
              </div>

              <div className="border-t border-[#E2E8F0] pt-1">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full px-3.5 py-2 text-left text-xs font-medium text-[#DC2626] hover:bg-[#FEE2E2]/50 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
