import React, { useState, useEffect } from 'react';
import {
  fetchAdminOverviewData,
  fetchAdminUsersList,
  updateAdminUserStatus,
  fetchAdminAuditLogs,
} from '../../services/firestoreService';
import {
  Users,
  UserCheck,
  Activity,
  UserPlus,
  Shield,
  Download,
  Copy,
  Check,
  RefreshCw,
  Search,
  Filter,
  AlertCircle,
  FileSpreadsheet,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { formatDisplayDate } from '../../utils/dateUtils';

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  totalUsage: number;
  totalTasksCreated: number;
  totalCompletedTasks: number;
  totalReportsGenerated: number;
}

interface AdminUserRow {
  id: string;
  email: string;
  displayName: string;
  role: 'user' | 'admin';
  status: 'active' | 'suspended';
  createdAt: string;
  lastActivityAt: string;
  usageCount: number;
  totalTasks: number;
  completedTasks: number;
  totalReports: number;
}

interface AuditLog {
  id: string;
  action: string;
  details: string;
  timestamp: string;
  email: string;
  displayName: string;
  role: string;
}

export const AdminDashboardView: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'admin' | 'user'>('all');
  const [copiedEmails, setCopiedEmails] = useState(false);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const fetchAdminData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [overviewData, usersData, logsData] = await Promise.all([
        fetchAdminOverviewData(),
        fetchAdminUsersList(),
        fetchAdminAuditLogs(),
      ]);
      setStats(overviewData || null);
      setUsers(usersData?.users || []);
      setAuditLogs(logsData?.logs || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load Super Admin data. Ensure you have admin privileges.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleToggleStatus = async (user: AdminUserRow) => {
    const newStatus = user.status === 'active' ? 'suspended' : 'active';
    setSubmittingId(user.id);
    try {
      await updateAdminUserStatus(user.id, newStatus);
      setUsers(prev =>
        prev.map(u => (u.id === user.id ? { ...u, status: newStatus } : u))
      );
    } catch (err: any) {
      alert(err.message || 'Failed to update user status.');
    } finally {
      setSubmittingId(null);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Email', 'Display Name', 'Role', 'Status', 'Joined Date', 'Last Active', 'Usage Count'];
    const rows = users.map(u => [
      u.email,
      `"${u.displayName.replace(/"/g, '""')}"`,
      u.role,
      u.status,
      u.createdAt,
      u.lastActivityAt,
      u.usageCount,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `self-reporting-users-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyEmailList = () => {
    const emailList = users.map(u => u.email).join(', ');
    navigator.clipboard.writeText(emailList);
    setCopiedEmails(true);
    setTimeout(() => setCopiedEmails(false), 2000);
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch =
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.displayName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === 'all' || u.role === filterRole;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Super Admin Header */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#E50914] text-white flex items-center justify-center shrink-0 shadow-xs shadow-[#E50914]/20">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-[#111111]">Super Admin Console</h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-[#E50914]/10 text-[#E50914] border border-[#E50914]/20 rounded-full">
                Protected Area
              </span>
            </div>
            <p className="text-xs text-[#4B5563] mt-0.5">
              Platform administration, user management, and verified real-time usage metrics.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={fetchAdminData}
            disabled={loading}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#4B5563] hover:text-[#111111] bg-neutral-100 hover:bg-neutral-200/70 rounded-md transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleCopyEmailList}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#111111] bg-white border border-[#E5E7EB] hover:bg-neutral-50 rounded-md transition-colors cursor-pointer"
          >
            {copiedEmails ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedEmails ? 'Copied Emails' : 'Copy Emails'}</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#111111] hover:bg-black rounded-md transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Access Error:</span> {error}
          </div>
        </div>
      )}

      {/* KPI Cards: 4 Key Real Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#4B5563] mb-1">
            <span className="font-medium">Total Users</span>
            <Users className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-[#111111] tabular-nums">
            {stats ? stats.totalUsers : '—'}
          </div>
          <div className="text-[11px] text-[#4B5563] mt-1">
            Registered customer accounts in database
          </div>
        </div>

        {/* Active Users */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#4B5563] mb-1">
            <span className="font-medium">Active Users (7d)</span>
            <UserCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-[#111111] tabular-nums">
            {stats ? stats.activeUsers : '—'}
          </div>
          <div className="text-[11px] text-[#4B5563] mt-1">
            Interacted within the past 7 days
          </div>
        </div>

        {/* Total Usage */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#4B5563] mb-1">
            <span className="font-medium">Total Usage</span>
            <Activity className="w-4 h-4 text-[#E50914]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[#111111] tabular-nums">
            {stats ? stats.totalUsage : '—'}
          </div>
          <div className="text-[11px] text-[#4B5563] mt-1">
            Completed tasks & generated reports
          </div>
        </div>

        {/* New Users */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#4B5563] mb-1">
            <span className="font-medium">New Users (30d)</span>
            <UserPlus className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-[#111111] tabular-nums">
            {stats ? stats.newUsers : '—'}
          </div>
          <div className="text-[11px] text-[#4B5563] mt-1">
            Registered within last 30 days
          </div>
        </div>
      </div>

      {/* User / Customer Management Table */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-xs overflow-hidden">
        {/* Table Filter Controls */}
        <div className="p-4 border-b border-[#E5E7EB] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-[#111111]">Registered Customer Accounts</h2>
            <p className="text-xs text-[#4B5563]">
              User emails collected securely for future product updates. Personal tasks remain isolated.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-[#4B5563] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search email or name..."
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-[#E5E7EB] rounded-md focus:outline-hidden focus:ring-1 focus:ring-[#111111]"
              />
            </div>

            {/* Role Filter */}
            <select
              value={filterRole}
              onChange={e => setFilterRole(e.target.value as any)}
              className="text-xs border border-[#E5E7EB] rounded-md px-2.5 py-1.5 bg-white text-[#111111] focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Roles</option>
              <option value="user">Users Only</option>
              <option value="admin">Admins Only</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#4B5563]">
            <thead className="bg-[#F3F4F6] text-[#111111] uppercase tracking-wider text-[10px] font-semibold border-b border-[#E5E7EB]">
              <tr>
                <th className="px-4 py-3">Customer / Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Joined Date</th>
                <th className="px-4 py-3">Last Active</th>
                <th className="px-4 py-3 text-center">Usage Count</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-xs text-[#4B5563]">
                    {loading ? 'Loading customer accounts...' : 'No users match the search criteria.'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-neutral-50/70 transition-colors">
                    {/* User Profile */}
                    <td className="px-4 py-3">
                      <div className="font-semibold text-[#111111]">{user.displayName}</div>
                      <div className="text-[11px] text-[#4B5563] font-mono select-all">
                        {user.email}
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3">
                      {user.role === 'admin' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#E50914] bg-[#E50914]/10 border border-[#E50914]/20 px-2 py-0.5 rounded-full uppercase">
                          <Shield className="w-2.5 h-2.5" />
                          Super Admin
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-[#4B5563] bg-neutral-100 px-2 py-0.5 rounded-full">
                          Standard User
                        </span>
                      )}
                    </td>

                    {/* Joined Date */}
                    <td className="px-4 py-3 font-mono text-[11px]">
                      {new Date(user.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>

                    {/* Last Active */}
                    <td className="px-4 py-3 font-mono text-[11px]">
                      {new Date(user.lastActivityAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}{' '}
                      <span className="text-neutral-400">
                        {new Date(user.lastActivityAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>

                    {/* Usage Count */}
                    <td className="px-4 py-3 text-center">
                      <span className="font-mono font-bold text-[#111111]">
                        {user.usageCount}
                      </span>
                      <span className="text-[10px] text-neutral-400 block">
                        ({user.completedTasks} tasks / {user.totalReports} reports)
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      {user.status === 'active' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                          <XCircle className="w-3 h-3 text-red-600" />
                          Suspended
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      {user.role !== 'admin' && (
                        <button
                          onClick={() => handleToggleStatus(user)}
                          disabled={submittingId === user.id}
                          className={`text-[11px] font-medium px-2.5 py-1 rounded transition-colors cursor-pointer ${
                            user.status === 'active'
                              ? 'text-red-700 hover:bg-red-50 border border-red-200'
                              : 'text-emerald-700 hover:bg-emerald-50 border border-emerald-200'
                          }`}
                        >
                          {submittingId === user.id ? 'Updating...' : user.status === 'active' ? 'Suspend' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-[#111111]">Recent Activity Signals</h3>
            <p className="text-xs text-[#4B5563]">
              Non-invasive operational activity logs recorded across user accounts.
            </p>
          </div>
          <Clock className="w-4 h-4 text-neutral-400" />
        </div>

        <div className="divide-y divide-[#E5E7EB] max-h-64 overflow-y-auto pr-1">
          {auditLogs.length === 0 ? (
            <div className="py-6 text-center text-xs text-[#4B5563]">
              No activity logs recorded yet.
            </div>
          ) : (
            auditLogs.slice(0, 25).map(log => (
              <div key={log.id} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-neutral-100 text-[#111111]">
                    {log.action}
                  </span>
                  <span className="text-[#111111]">{log.details}</span>
                  <span className="text-[11px] text-[#4B5563] font-mono">({log.email || 'System'})</span>
                </div>
                <div className="text-[10px] text-neutral-400 font-mono shrink-0">
                  {new Date(log.timestamp).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
