import React, { useState, useEffect, useMemo } from 'react';
import { permissionsApi } from '../../api/permissions.api';
import type { Permission } from '../../types/rbac';
import { TableSkeleton, EmptyState, ErrorAlert } from '../../components/common/States';
import { Input } from '../../components/common/Input';
import { Badge } from '../../components/common/Badge';
import { ShieldCheck, Search, KeyRound } from 'lucide-react';

export const PermissionsPage: React.FC = () => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchPerms = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await permissionsApi.listPermissions();
        setPermissions(data);
      } catch (err: unknown) {
        const errorObj = err as { message?: string };
        setError(errorObj?.message || 'Failed to load system permissions.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPerms();
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, Permission[]>();

    permissions.forEach((p) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.module.toLowerCase().includes(q) ||
        p.action.toLowerCase().includes(q);

      if (matchesSearch) {
        const list = map.get(p.module) || [];
        list.push(p);
        map.set(p.module, list);
      }
    });

    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [permissions, search]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">
            System Permissions Registry
          </h2>
          <p className="text-xs sm:text-sm text-[#475569] mt-0.5">
            Full catalog of authoritative modules and actions registered in backend RBAC
          </p>
        </div>

        <div className="text-xs text-[#64748B] flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#16A34A]" />
          <span>Total registered: <strong className="text-[#0F172A]">{permissions.length}</strong></span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter permissions by module or action name (e.g. USERS, CREATE, ATTENDANCE)..."
          leftIcon={<Search className="w-4 h-4 text-[#94A3B8]" />}
          className="h-9.5 text-xs"
        />
      </div>

      {/* Content */}
      {error && <ErrorAlert message={error} />}

      {isLoading ? (
        <div className="bg-white p-6 rounded-xl border border-[#E2E8F0]">
          <TableSkeleton rows={8} cols={3} />
        </div>
      ) : grouped.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-6">
          <EmptyState
            title="No Permissions Found"
            description="No permissions match your search query."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {grouped.map(([moduleName, perms]) => (
            <div
              key={moduleName}
              className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center">
                      <KeyRound className="w-3.5 h-3.5" />
                    </div>
                    <h3 className="font-semibold text-sm text-[#0F172A] tracking-tight">
                      {moduleName}
                    </h3>
                  </div>
                  <span className="text-xs text-[#64748B] font-medium">
                    {perms.length} actions
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {perms.map((p) => (
                    <Badge key={p.permission_id} variant="neutral">
                      {p.action}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-2.5 border-t border-[#E2E8F0] text-[11px] text-[#94A3B8]">
                Module identifier: <code className="text-[#334155]">{moduleName}</code>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
