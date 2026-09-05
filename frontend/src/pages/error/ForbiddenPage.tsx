import React from 'react';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { useNavigate } from 'react-router-dom';

export const ForbiddenPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-full bg-[#FEF3C7] border border-[#FDE68A] flex items-center justify-center text-[#D97706] mb-4">
        <ShieldAlert className="w-8 h-8" />
      </div>
      <h2 className="text-2xl font-bold text-[#0F172A] tracking-tight mb-2">
        Access Denied (403)
      </h2>
      <p className="text-sm text-[#475569] max-w-md mb-6 leading-relaxed">
        You do not have the required permissions to view or perform actions on this resource. Please contact your organization administrator if you require access.
      </p>
      <div className="flex gap-3">
        <Button
          variant="secondary"
          onClick={() => navigate(-1)}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          Go Back
        </Button>
        <Button
          variant="primary"
          onClick={() => navigate('/')}
        >
          Return to Allowed Section
        </Button>
      </div>
    </div>
  );
};
