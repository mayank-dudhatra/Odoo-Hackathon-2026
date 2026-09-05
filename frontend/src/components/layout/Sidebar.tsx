import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Users,
  Building2,
  Briefcase,
  Layers,
  Shield,
  KeyRound,
  UserCheck,
  FileText,
  Clock,
  CalendarCheck,
  Calendar,
  Sliders,
  Calculator,
  DollarSign,
  History,
  Receipt,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { checkPermission, role, user } = useAuth();
  const isAdmin = role === 'Admin';
  const hasEmployeeProfile = Boolean(user?.employee_id);

  // 1. Organization & HR
  const employeeNavItems = [
    {
      name: 'All Employees',
      path: '/employees',
      icon: <UserCheck className="w-[18px] h-[18px]" />,
      visible: isAdmin || (role !== 'Employee' && checkPermission('EMPLOYEES', 'READ')),
    },
    {
      name: 'My Profile',
      path: user?.employee_id ? `/employees/${user.employee_id}` : '/employees',
      icon: <UserCheck className="w-[18px] h-[18px]" />,
      visible: role === 'Employee' || (hasEmployeeProfile && !isAdmin && role !== 'HR Manager'),
    },
    {
      name: 'Departments',
      path: '/departments',
      icon: <Building2 className="w-[18px] h-[18px]" />,
      visible: isAdmin || checkPermission('DEPARTMENTS', 'READ'),
    },
    {
      name: 'Positions',
      path: '/positions',
      icon: <Briefcase className="w-[18px] h-[18px]" />,
      visible: isAdmin || checkPermission('POSITIONS', 'READ'),
    },
    {
      name: 'Employee Types',
      path: '/employee-types',
      icon: <Layers className="w-[18px] h-[18px]" />,
      visible: isAdmin || checkPermission('EMPLOYEE_TYPES', 'READ'),
    },
  ];

  // 2. Contracts & Schedules (Phase 3)
  const contractNavItems = [
    {
      name: 'Contracts',
      path: '/contracts',
      icon: <FileText className="w-[18px] h-[18px]" />,
      visible: isAdmin || checkPermission('CONTRACTS', 'READ'),
    },
    {
      name: 'Working Schedules',
      path: '/working-schedules',
      icon: <Clock className="w-[18px] h-[18px]" />,
      visible: isAdmin || checkPermission('WORKING_SCHEDULES', 'READ'),
    },
  ];

  // 3. Attendance (Phase 4)
  const attendanceNavItems = [
    {
      name: 'Attendance',
      path: '/attendance',
      icon: <CalendarCheck className="w-[18px] h-[18px]" />,
      visible: isAdmin || (role !== 'Employee' && checkPermission('ATTENDANCE', 'READ')),
    },
    {
      name: 'My Attendance',
      path: '/my-attendance',
      icon: <Clock className="w-[18px] h-[18px]" />,
      visible: hasEmployeeProfile || role === 'Employee',
    },
    {
      name: 'Attendance Policies',
      path: '/attendance-policies',
      icon: <ShieldCheck className="w-[18px] h-[18px]" />,
      visible: isAdmin || checkPermission('ATTENDANCE_POLICIES', 'READ'),
    },
  ];

  // 4. Time Off (Phase 5)
  const timeOffNavItems = [
    {
      name: 'Time Off & Leaves',
      path: '/time-off',
      icon: <Calendar className="w-[18px] h-[18px]" />,
      visible: isAdmin || checkPermission('LEAVE_REQUESTS', 'READ') || hasEmployeeProfile,
    },
  ];

  // 5. Salary Configuration (Phase 6)
  const salaryNavItems = [
    {
      name: 'Salary Structures',
      path: '/salary-structures',
      icon: <Sliders className="w-[18px] h-[18px]" />,
      visible: isAdmin || checkPermission('SALARY_STRUCTURES', 'READ'),
    },
    {
      name: 'Salary Rules',
      path: '/salary-rules',
      icon: <Calculator className="w-[18px] h-[18px]" />,
      visible: isAdmin || checkPermission('SALARY_RULES', 'READ'),
    },
  ];

  // 6. Payroll & Payslips (Phases 7 & 8)
  const payrollNavItems = [
    {
      name: 'Payroll Runs',
      path: '/payroll/payruns',
      icon: <DollarSign className="w-[18px] h-[18px]" />,
      visible: isAdmin || checkPermission('PAYRUNS', 'READ'),
    },
    {
      name: 'Payroll History',
      path: '/payroll/history',
      icon: <History className="w-[18px] h-[18px]" />,
      visible: isAdmin || checkPermission('PAYRUNS', 'READ'),
    },
    {
      name: 'Payslips',
      path: '/payslips',
      icon: <Receipt className="w-[18px] h-[18px]" />,
      visible: isAdmin || checkPermission('PAYSLIPS', 'READ') || hasEmployeeProfile,
    },
  ];

  // 7. Administration (Phase 1)
  const adminNavItems = [
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

  const sections = [
    { title: 'Organization & HR', items: employeeNavItems.filter((i) => i.visible) },
    { title: 'Contracts & Shift Schedules', items: contractNavItems.filter((i) => i.visible) },
    { title: 'Attendance', items: attendanceNavItems.filter((i) => i.visible) },
    { title: 'Time Off & Leaves', items: timeOffNavItems.filter((i) => i.visible) },
    { title: 'Salary Configuration', items: salaryNavItems.filter((i) => i.visible) },
    { title: 'Payroll & Payslips', items: payrollNavItems.filter((i) => i.visible) },
    { title: 'Administration', items: adminNavItems.filter((i) => i.visible) },
  ].filter((sec) => sec.items.length > 0);

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
        <div className="h-16 flex items-center justify-between px-6 border-b border-[#E2E8F0] shrink-0">
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

        {/* Navigation Sections */}
        <div className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
          {sections.map((sec) => (
            <div key={sec.title}>
              <div className="px-3 pb-1.5">
                <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">
                  {sec.title}
                </p>
              </div>
              <nav className="space-y-0.5">
                {sec.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => {
                      if (window.innerWidth < 1024) onClose();
                    }}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
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
            </div>
          ))}
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-[#E2E8F0] bg-[#F8FAFC] shrink-0">
          <div className="flex items-center justify-between text-xs text-[#64748B]">
            <span className="font-medium text-[11px]">PeoplePay360 System</span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-semibold text-[10px]">
              Phases 1–8 Active
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};
export default Sidebar;
