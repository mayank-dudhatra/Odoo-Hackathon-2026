import React from 'react';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'neutral', className = '' }) => {
  const variantStyles: Record<BadgeVariant, string> = {
    success: 'bg-[#DCFCE7] text-[#16A34A] border border-[#BBF7D0]',
    warning: 'bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]',
    danger: 'bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA]',
    info: 'bg-[#E0F2FE] text-[#0284C7] border border-[#BAE6FD]',
    neutral: 'bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-[6px] tracking-wide select-none ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
