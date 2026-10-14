import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  Search,
  Lock,
  FileText,
  Wallet,
  Paperclip,
  MessageSquare,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Activity,
  Download,
  Check,
  User,
} from 'lucide-react';
import {
  UserLogEntry,
  UserLogCategory,
  FontSizeLevel,
} from '../../types/portal';

interface AdminUserLogsTabProps {
  logs: UserLogEntry[];
  highContrastMode: boolean;
  fontSizeLevel: FontSizeLevel;
}

export function AdminUserLogsTab({
  logs,
  highContrastMode,
  fontSizeLevel,
}: AdminUserLogsTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'All' | 'Customer' | 'Admin' | 'Operator'>('All');
  const [categoryFilter, setCategoryFilter] = useState<'All' | UserLogCategory>('All');
  const [exported, setExported] = useState(false);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesRole = roleFilter === 'All' || log.actorRole === roleFilter;
      const matchesCategory = categoryFilter === 'All' || log.category === categoryFilter;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        log.actorName.toLowerCase().includes(q) ||
        log.actorUsername.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q) ||
        (log.targetId && log.targetId.toLowerCase().includes(q)) ||
        log.ipAddress.toLowerCase().includes(q);
      return matchesRole && matchesCategory && matchesSearch;
    });
  }, [logs, roleFilter, categoryFilter, searchQuery]);

  const authEventsCount = useMemo(
    () => logs.filter((l) => l.category === 'Authentication').length,
    [logs]
  );
  const customerEventsCount = useMemo(
    () => logs.filter((l) => l.actorRole === 'Customer').length,
    [logs]
  );
  const adminEventsCount = useMemo(
    () => logs.filter((l) => l.actorRole === 'Admin' || l.actorRole === 'Operator').length,
    [logs]
  );

  const getCategoryIcon = (category: UserLogCategory) => {
    switch (category) {
      case 'Authentication':
        return Lock;
      case 'Order Management':
        return FileText;
      case 'GCash Payment':
        return Wallet;
      case 'File Artwork':
        return Paperclip;
      case 'Staff Chat':
        return MessageSquare;
      default:
        return ShieldCheck;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="border-b border-[#D4A017] pb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1
            className={`font-black ${
              highContrastMode ? 'text-white' : 'text-zinc-950'
            } ${
              fontSizeLevel === 'xlarge'
                ? 'text-2xl sm:text-3xl'
                : fontSizeLevel === 'reduced'
                ? 'text-lg sm:text-xl'
                : 'text-xl sm:text-2xl'
            }`}
          >
            User Logs & Security Audit Trail
          </h1>
          <p
            className={`font-medium mt-0.5 ${
              highContrastMode ? 'text-zinc-300' : 'text-zinc-600'
            } ${fontSizeLevel === 'xlarge' ? 'text-base' : 'text-xs sm:text-sm'}`}
          >
            Real-time audit log of customer sign-ins, admin actions, order status changes, and GCash payment verifications.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            const headers = [
              'Log ID',
              'Date',
              'Time',
              'Actor Name',
              'Username',
              'Role',
              'Category',
              'Action',
              'Target ID',
              'Details',
              'Device',
              'IP Address',
              'Status',
            ];
            const rows = filteredLogs.map((l) => [
              l.id,
              l.date,
              l.timestamp,
              `"${l.actorName.replace(/"/g, '""')}"`,
              l.actorUsername,
              l.actorRole,
              l.category,
              `"${l.action.replace(/"/g, '""')}"`,
              l.targetId || '',
              `"${l.details.replace(/"/g, '""')}"`,
              `"${l.device.replace(/"/g, '""')}"`,
              l.ipAddress,
              l.status,
            ]);
            const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `netso-audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            setExported(true);
            setTimeout(() => setExported(false), 1800);
          }}
          className="w-full sm:w-auto px-4 py-2 bg-[#121214] hover:bg-black text-[#D4A017] border border-[#D4A017] font-extrabold uppercase rounded-xl flex items-center justify-center gap-1.5 shadow-sm min-h-[38px] text-xs sm:text-sm shrink-0 cursor-pointer"
        >
          {exported ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400">Audit CSV Exported!</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4 shrink-0" />
              <span>Export User Logs</span>
            </>
          )}
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          className={`p-3.5 rounded-xl border border-t-4 border-t-[#D4A017] shadow-sm ${
            highContrastMode ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-950'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] sm:text-[11px] font-extrabold uppercase text-zinc-500">TOTAL LOG EVENTS</span>
            <Activity className="w-4 h-4 text-[#B8860B]" />
          </div>
          <span className="font-mono font-black text-xl sm:text-2xl block">{logs.length}</span>
          <span className="text-[11px] text-emerald-700 font-bold">● Live Session Tracking</span>
        </div>

        <div
          className={`p-3.5 rounded-xl border border-t-4 border-t-[#D4A017] shadow-sm ${
            highContrastMode ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-950'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] sm:text-[11px] font-extrabold uppercase text-zinc-500">USER SIGN-IN LOGS</span>
            <Lock className="w-4 h-4 text-blue-600" />
          </div>
          <span className="font-mono font-black text-xl sm:text-2xl block">{authEventsCount}</span>
          <span className="text-[11px] text-zinc-500 font-semibold">user / google oauth account</span>
        </div>

        <div
          className={`p-3.5 rounded-xl border border-t-4 border-t-[#D4A017] shadow-sm ${
            highContrastMode ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-950'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] sm:text-[11px] font-extrabold uppercase text-zinc-500">CUSTOMER ACTIONS</span>
            <User className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="font-mono font-black text-xl sm:text-2xl block">{customerEventsCount}</span>
          <span className="text-[11px] text-zinc-500 font-semibold">Orders, files & GCash</span>
        </div>

        <div
          className={`p-3.5 rounded-xl border border-t-4 border-t-[#D4A017] shadow-sm ${
            highContrastMode ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-950'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] sm:text-[11px] font-extrabold uppercase text-zinc-500">ADMIN & STAFF LOGS</span>
            <ShieldCheck className="w-4 h-4 text-[#B8860B]" />
          </div>
          <span className="font-mono font-black text-xl sm:text-2xl block">{adminEventsCount}</span>
          <span className="text-[11px] text-zinc-500 font-semibold">Queue & payment approvals</span>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="space-y-2.5">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search user logs by name, @username, Order ID (e.g. NETSO-90103), action, or IP address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full border pl-10 pr-3.5 py-2 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-[#D4A017] min-h-[40px] text-xs sm:text-sm ${
                highContrastMode
                  ? 'bg-zinc-900 border-zinc-600 text-white placeholder-zinc-400'
                  : 'bg-white border-zinc-300 text-zinc-950 placeholder-zinc-500'
              }`}
            />
          </div>

          {/* Role Filter */}
          <div className="flex items-center gap-1 bg-zinc-200/80 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-300 dark:border-zinc-700 shrink-0">
            {(['All', 'Customer', 'Admin', 'Operator'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRoleFilter(r)}
                className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                  roleFilter === r
                    ? 'bg-[#121214] text-[#D4A017] shadow-xs'
                    : 'text-zinc-700 dark:text-zinc-300 hover:text-black'
                }`}
              >
                {r === 'All' ? 'All Roles' : r}
              </button>
            ))}
          </div>
        </div>

        {/* Event Category Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {(
            [
              'All',
              'Authentication',
              'Order Management',
              'GCash Payment',
              'File Artwork',
              'Staff Chat',
            ] as const
          ).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1 rounded-lg font-bold whitespace-nowrap transition-all text-xs shrink-0 cursor-pointer ${
                categoryFilter === cat
                  ? 'bg-[#D4A017] text-black border border-black font-extrabold shadow-xs'
                  : highContrastMode
                  ? 'bg-zinc-900 text-white border border-zinc-700'
                  : 'bg-white text-zinc-700 border border-zinc-300 hover:border-zinc-400'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop Audit Table */}
      <div
        className={`hidden md:block rounded-2xl border overflow-hidden shadow-xs ${
          highContrastMode ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-300'
        }`}
      >
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[#121214] text-[#E6B222] border-b border-zinc-800 uppercase tracking-wider font-extrabold">
              <th className="py-3 px-3.5">Log ID & Time</th>
              <th className="py-3 px-3.5">User & Role</th>
              <th className="py-3 px-3.5">Category</th>
              <th className="py-3 px-3.5">Activity & Details</th>
              <th className="py-3 px-3.5">Device / IP</th>
              <th className="py-3 px-3.5 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {filteredLogs.map((log) => {
              const Icon = getCategoryIcon(log.category);
              return (
                <tr
                  key={log.id}
                  className={`transition-colors ${
                    highContrastMode ? 'hover:bg-zinc-800/70 text-white' : 'hover:bg-amber-50/40 text-zinc-900'
                  }`}
                >
                  <td className="py-3 px-3.5 align-top whitespace-nowrap">
                    <span className="font-mono font-black text-xs text-[#B8860B] block">{log.id}</span>
                    <span className="text-[11px] text-zinc-500 font-semibold flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      {log.timestamp} · {log.date}
                    </span>
                  </td>

                  <td className="py-3 px-3.5 align-top">
                    <div className="font-extrabold text-xs sm:text-sm">{log.actorName}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="font-mono text-[11px] text-zinc-500">@{log.actorUsername}</span>
                      <span
                        className={`px-1.5 py-0.2 text-[10px] font-black uppercase rounded ${
                          log.actorRole === 'Admin'
                            ? 'bg-[#121214] text-[#D4A017] border border-[#D4A017]'
                            : log.actorRole === 'Operator'
                            ? 'bg-blue-100 text-blue-900 border border-blue-300'
                            : 'bg-amber-100 text-amber-900 border border-amber-300'
                        }`}
                      >
                        {log.actorRole}
                      </span>
                    </div>
                  </td>

                  <td className="py-3 px-3.5 align-top whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 font-bold text-xs">
                      <Icon className="w-3.5 h-3.5 text-[#B8860B]" />
                      <span>{log.category}</span>
                    </span>
                  </td>

                  <td className="py-3 px-3.5 align-top max-w-md">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-xs sm:text-sm">{log.action}</span>
                      {log.targetId && (
                        <span className="font-mono font-bold text-[11px] px-1.5 py-0.2 bg-amber-100 text-black border border-[#D4A017] rounded">
                          {log.targetId}
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-xs mt-0.5 leading-relaxed ${
                        highContrastMode ? 'text-zinc-300' : 'text-zinc-600'
                      }`}
                    >
                      {log.details}
                    </p>
                  </td>

                  <td className="py-3 px-3.5 align-top whitespace-nowrap">
                    <span className="font-semibold text-xs block">{log.device}</span>
                    <span className="font-mono text-[11px] text-zinc-500">IP: {log.ipAddress}</span>
                  </td>

                  <td className="py-3 px-3.5 align-top text-right whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${
                        log.status === 'Verified' || log.status === 'Success'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-amber-100 text-amber-900 border-amber-300'
                      }`}
                    >
                      {log.status === 'Verified' || log.status === 'Success' ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <AlertTriangle className="w-3 h-3" />
                      )}
                      <span>{log.status}</span>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile & Tablet Cards for User Logs */}
      <div className="md:hidden space-y-2.5">
        {filteredLogs.map((log) => {
          const Icon = getCategoryIcon(log.category);
          return (
            <div
              key={log.id}
              className={`p-3.5 rounded-xl border space-y-2 shadow-xs ${
                highContrastMode ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-950'
              }`}
            >
              <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-black text-xs text-[#B8860B]">{log.id}</span>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-black uppercase rounded ${
                      log.actorRole === 'Admin'
                        ? 'bg-[#121214] text-[#D4A017]'
                        : 'bg-amber-100 text-amber-900 border border-amber-300'
                    }`}
                  >
                    {log.actorRole}
                  </span>
                </div>
                <span className="text-[11px] text-zinc-500 font-semibold">
                  {log.timestamp} · {log.date}
                </span>
              </div>

              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-extrabold text-sm block">{log.action}</span>
                  <span className="text-xs text-zinc-500 font-bold">
                    {log.actorName} (@{log.actorUsername})
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-100 text-zinc-800 text-[11px] font-bold border border-zinc-300">
                  <Icon className="w-3 h-3 text-[#B8860B]" />
                  <span>{log.category}</span>
                </span>
              </div>

              <p className="text-xs text-zinc-600 dark:text-zinc-300">{log.details}</p>

              <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1 border-t border-zinc-100">
                <span className="font-mono">{log.device} · {log.ipAddress}</span>
                {log.targetId && (
                  <span className="font-mono font-bold text-black bg-amber-100 px-1.5 py-0.2 rounded border border-[#D4A017]">
                    {log.targetId}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
