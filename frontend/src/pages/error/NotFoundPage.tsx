import React from 'react';
import { HelpCircle, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { useNavigate } from 'react-router-dom';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-full bg-[#F1F5F9] border border-[#E2E8F0] flex items-center justify-center text-[#64748B] mb-4">
        <HelpCircle className="w-8 h-8" />
      </div>
      <h2 className="text-2xl font-bold text-[#0F172A] tracking-tight mb-2">
        Page Not Found (404)
      </h2>
      <p className="text-sm text-[#475569] max-w-md mb-6 leading-relaxed">
        The page you are looking for does not exist or has been moved.
      </p>
      <Button
        variant="primary"
        onClick={() => navigate('/users')}
        leftIcon={<ArrowLeft className="w-4 h-4" />}
      >
        Go to Application
      </Button>
    </div>
  );
};
