import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { EmployeeDashboard } from './EmployeeDashboard';
import { HrManagerDashboard } from './HrManagerDashboard';
import { PayrollUserDashboard } from './PayrollUserDashboard';
import { PayrollManagerDashboard } from './PayrollManagerDashboard';
import { AdminDashboard } from './AdminDashboard';

export const DashboardPage: React.FC = () => {
  const { role, user } = useAuth();

  switch (role) {
    case 'Employee':
      return <EmployeeDashboard />;
    case 'HR Manager':
      return <HrManagerDashboard />;
    case 'Payroll User':
      return <PayrollUserDashboard />;
    case 'Payroll Manager':
      return <PayrollManagerDashboard />;
    case 'Admin':
      return <AdminDashboard />;
    default:
      if (user?.employee_id) {
        return <EmployeeDashboard />;
      }
      return <AdminDashboard />;
  }
};
