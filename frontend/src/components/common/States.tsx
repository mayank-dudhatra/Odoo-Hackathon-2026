import React from 'react';
import { AlertCircle, FolderSearch, RefreshCw } from 'lucide-react';
import { Button } from './Button';

export interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  icon,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-12 h-12 rounded-full bg-[#F1F5F9] flex items-center justify-center text-[#64748B] mb-3">
        {icon || <FolderSearch className="w-6 h-6" />}
      </div>
      <h3 className="text-base font-semibold text-[#0F172A] mb-1">{title}</h3>
      {description && <p className="text-sm text-[#475569] max-w-sm mb-4">{description}</p>}
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export interface ErrorAlertProps {
  message: string;
  onRetry?: () => void;
  title?: string;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({
  message,
  onRetry,
  title = 'Failed to load data',
}) => {
  return (
    <div className="p-4 bg-[#FEE2E2] border border-[#FECACA] rounded-lg text-[#0F172A] flex items-start gap-3 my-2">
      <AlertCircle className="w-5 h-5 text-[#DC2626] shrink-0 mt-0.5" />
      <div className="flex-1">
        <h4 className="text-sm font-semibold text-[#DC2626]">{title}</h4>
        <p className="text-sm text-[#7F1D1D] mt-0.5">{message}</p>
      </div>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          className="border-[#F87171] text-[#991B1B] hover:bg-[#FEE2E2] shrink-0"
        >
          Retry
        </Button>
      )}
    </div>
  );
};

export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({ rows = 5, cols = 5 }) => {
  return (
    <div className="w-full animate-pulse">
      <div className="h-10 bg-[#F1F5F9] rounded-t-lg mb-2 border-b border-[#E2E8F0]" />
      {Array.from({ length: rows }).map((_, rIdx) => (
        <div key={rIdx} className="flex gap-4 py-3.5 px-4 border-b border-[#E2E8F0]">
          {Array.from({ length: cols }).map((_, cIdx) => (
            <div
              key={cIdx}
              className="h-4 bg-[#E2E8F0] rounded-sm"
              style={{ width: `${Math.max(40, 100 - (cIdx * 15))}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

export const CardSkeleton: React.FC = () => {
  return (
    <div className="p-5 bg-white border border-[#E2E8F0] rounded-lg shadow-xs animate-pulse flex flex-col gap-3">
      <div className="h-5 bg-[#E2E8F0] rounded-sm w-1/3" />
      <div className="h-4 bg-[#F1F5F9] rounded-sm w-2/3" />
      <div className="h-8 bg-[#F1F5F9] rounded-lg mt-2 w-full" />
    </div>
  );
};
