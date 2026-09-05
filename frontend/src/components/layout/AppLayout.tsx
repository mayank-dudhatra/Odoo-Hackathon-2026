import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuth } from '../../hooks/useAuth';
import { ChangePasswordModal } from '../auth/ChangePasswordModal';

export const AppLayout: React.FC = () => {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const getPageTitle = (path: string): string => {
    if (path.startsWith('/users')) return 'Users Management';
    if (path.startsWith('/roles')) return 'Roles & Permissions';
    if (path.startsWith('/permissions')) return 'System Permissions';
    return 'PeoplePay360';
  };

  const isPasswordChangeRequired = Boolean(user?.must_change_password);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-[#0F172A]">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <Header
          onMenuToggle={() => setSidebarOpen((prev) => !prev)}
          pageTitle={getPageTitle(location.pathname)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {isPasswordChangeRequired ? (
            <div className="py-12 flex flex-col items-center justify-center">
              <ChangePasswordModal
                isOpen={true}
                isForced={true}
              />
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  );
};
