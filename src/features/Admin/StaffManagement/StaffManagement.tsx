import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Clock,
  Phone,
  Mail,
  Activity,
  PlusCircle,
  X,
} from 'lucide-react';
import {
  StaffMember,
  UserLogEntry,
  FontSizeLevel,
} from '../../../types';
import { AdminUserLogsTab } from '../AdminUserLogsTab';

interface StaffManagementProps {
  userLogs: UserLogEntry[];
  onAddUserLog?: (entry: Omit<UserLogEntry, 'id' | 'timestamp' | 'date'>) => void;
  defaultSubView?: 'roster' | 'logs';
  activeOperator?: StaffMember;
  highContrastMode: boolean;
  fontSizeLevel: FontSizeLevel;
}

export function StaffManagement({
  userLogs,
  onAddUserLog,
  defaultSubView = 'roster',
  activeOperator,
  highContrastMode,
  fontSizeLevel,
}: StaffManagementProps) {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [subView, setSubView] = useState<'roster' | 'logs'>(defaultSubView);
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const [isAddOperatorOpen, setIsAddOperatorOpen] = useState(false);

  // New Operator Form — strictly uses StaffMember['role'] from src/types/index.ts
  const [newOpName, setNewOpName] = useState('');
  const [newOpUsername, setNewOpUsername] = useState('');
  const [newOpRole, setNewOpRole] = useState<StaffMember['role']>('Print Operator');
  const [newOpEmail, setNewOpEmail] = useState('');
  const [newOpPhone, setNewOpPhone] = useState('');
  const [newOpPassword, setNewOpPassword] = useState('');
  const [newOpShift, setNewOpShift] = useState('8:00 AM - 5:00 PM');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch('/api/staff')
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Unable to load staff accounts.');
        if (active) setStaffList(result.staff);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load staff accounts.');
      });
    return () => {
      active = false;
    };
  }, []);

  const toggleShiftStatus = async (staff: StaffMember) => {
    const nextStatus: StaffMember['status'] =
      staff.status === 'Online'
        ? 'In Production'
        : staff.status === 'In Production'
          ? 'Off Duty'
          : 'Online';
    setError('');
    try {
      const response = await fetch('/api/staff', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: staff.id, status: nextStatus }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to update staff status.');
      setStaffList((previous) =>
        previous.map((item) => item.id === staff.id ? { ...item, status: nextStatus } : item)
      );
      onAddUserLog?.({
        actorName: activeOperator?.name ?? '',
        actorUsername: activeOperator?.username ?? '',
        actorRole: 'Admin',
        category: 'Account / System',
        action: `Updated Operator Status -> ${nextStatus}`,
        details: `Changed shift availability of ${staff.name} (@${staff.username}) to ${nextStatus}.`,
        targetId: staff.id,
        ipAddress: '',
        device: '',
        status: 'Verified',
      });
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Unable to update staff status.');
    }
  };

  const to24HourTime = (value: string) => {
    const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return null;
    let hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours < 1 || hours > 12 || minutes > 59) return null;
    if (match[3].toUpperCase() === 'PM' && hours !== 12) hours += 12;
    if (match[3].toUpperCase() === 'AM' && hours === 12) hours = 0;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  const handleAddOperatorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const [start, end] = newOpShift.split(/\s+-\s+/);
    const shiftStart = start ? to24HourTime(start) : null;
    const shiftEnd = end ? to24HourTime(end) : null;
    if (!shiftStart || !shiftEnd) {
      setError('Enter the shift as a start and end time, for example 8:00 AM - 5:00 PM.');
      return;
    }
    setError('');
    setIsSaving(true);
    try {
      const response = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newOpName,
          username: newOpUsername,
          email: newOpEmail,
          phone: newOpPhone,
          password: newOpPassword,
          role: newOpRole,
          shiftStart,
          shiftEnd,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to create staff account.');
      const createdOp = result.staff as StaffMember;
      setStaffList((previous) => [createdOp, ...previous]);
      onAddUserLog?.({
        actorName: activeOperator?.name ?? '',
        actorUsername: activeOperator?.username ?? '',
        actorRole: 'Admin',
        category: 'Account / System',
        action: 'Added New Admin/Staff Operator',
        details: `Registered ${createdOp.name} (@${createdOp.username}) as ${createdOp.role}.`,
        targetId: createdOp.id,
        ipAddress: '',
        device: '',
        status: 'Verified',
      });
      setNewOpName('');
      setNewOpUsername('');
      setNewOpEmail('');
      setNewOpPhone('');
      setNewOpPassword('');
      setIsAddOperatorOpen(false);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Unable to create staff account.');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredStaff = staffList.filter((s) =>
    roleFilter === 'All' ? true : s.role === roleFilter
  );

  const onlineCount = staffList.filter((s) => s.status !== 'Off Duty').length;
  const totalAssigned = staffList.reduce((sum, s) => sum + s.assignedJobs, 0);
  const totalCompletedToday = staffList.reduce((sum, s) => sum + s.completedToday, 0);

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Top Mode Switcher: Admin Operators vs User Activity Logs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#121214] p-3 sm:p-4 rounded-2xl border border-zinc-800 text-white shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-[#D4A017]/20 border border-[#D4A017] text-[#E6B222] flex items-center justify-center shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="font-extrabold text-sm sm:text-base block">
              Admin Operators & User Activity Audit Logs
            </span>
            <span className="text-xs text-zinc-400">
              Manage admin/staff operator accounts, role assignments, and real-time service system logs
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-zinc-700">
            <button
              type="button"
              onClick={() => setSubView('roster')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                subView === 'roster'
                  ? 'bg-[#D4A017] text-black shadow-xs'
                  : 'text-zinc-300 hover:text-white'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Admin Operators ({staffList.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setSubView('logs')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                subView === 'logs'
                  ? 'bg-[#D4A017] text-black shadow-xs'
                  : 'text-zinc-300 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>User Activity Logs ({userLogs.length})</span>
            </button>
          </div>

          {subView === 'roster' && (
            <button
              type="button"
              onClick={() => setIsAddOperatorOpen(true)}
              className="px-3.5 py-2 bg-[#D4A017] hover:bg-[#E6B222] text-black font-extrabold text-xs uppercase rounded-xl border border-black flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ Add Operator</span>
            </button>
          )}
        </div>
      </div>

      {subView === 'logs' ? (
        <AdminUserLogsTab
          logs={userLogs}
          highContrastMode={highContrastMode}
          fontSizeLevel={fontSizeLevel}
        />
      ) : (
        <div className="space-y-4">
          {error && <p role="alert" className="rounded-xl border border-red-400 bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p>}
          {/* 4 Operator KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div
              className={`p-3.5 rounded-xl border border-t-4 border-t-[#D4A017] shadow-xs ${
                highContrastMode ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-950'
              }`}
            >
              <span className="text-[10px] sm:text-[11px] font-extrabold uppercase text-zinc-500 block">
                TOTAL ADMIN OPERATORS
              </span>
              <span className="font-mono font-black text-xl sm:text-2xl block mt-1">
                {staffList.length}
              </span>
              <span className="text-[11px] font-semibold text-zinc-500">
                Service management accounts
              </span>
            </div>

            <div
              className={`p-3.5 rounded-xl border border-t-4 border-t-emerald-600 shadow-xs ${
                highContrastMode ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-950'
              }`}
            >
              <span className="text-[10px] sm:text-[11px] font-extrabold uppercase text-emerald-700 block">
                ON DUTY NOW
              </span>
              <span className="font-mono font-black text-xl sm:text-2xl text-emerald-700 block mt-1">
                {onlineCount} / {staffList.length}
              </span>
              <span className="text-[11px] font-bold text-emerald-700">
                ● Active on shift
              </span>
            </div>

            <div
              className={`p-3.5 rounded-xl border border-t-4 border-t-blue-600 shadow-xs ${
                highContrastMode ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-950'
              }`}
            >
              <span className="text-[10px] sm:text-[11px] font-extrabold uppercase text-blue-700 block">
                ASSIGNED REQUESTS
              </span>
              <span className="font-mono font-black text-xl sm:text-2xl text-blue-700 block mt-1">
                {totalAssigned}
              </span>
              <span className="text-[11px] font-semibold text-zinc-500">
                Active service orders
              </span>
            </div>

            <div
              className={`p-3.5 rounded-xl border border-t-4 border-t-amber-500 shadow-xs ${
                highContrastMode ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-950'
              }`}
            >
              <span className="text-[10px] sm:text-[11px] font-extrabold uppercase text-amber-700 block">
                FULFILLED TODAY
              </span>
              <span className="font-mono font-black text-xl sm:text-2xl text-[#B8860B] block mt-1">
                {totalCompletedToday}
              </span>
              <span className="text-[11px] font-semibold text-zinc-500">
                Completed service requests
              </span>
            </div>
          </div>

          {/* Role Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {[
              'All',
              'Lead Admin',
              'Print Operator',
              'Pre-Press Artist',
              'Front Desk & Cashier',
            ].map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => setRoleFilter(role)}
                className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition-all text-xs shrink-0 cursor-pointer ${
                  roleFilter === role
                    ? 'bg-zinc-950 text-[#D4A017] border border-zinc-950 shadow ring-1 ring-amber-400'
                    : highContrastMode
                    ? 'bg-zinc-900 text-white border border-zinc-700'
                    : 'bg-white text-zinc-700 border border-zinc-300 hover:border-zinc-400'
                }`}
              >
                {role === 'All' ? `All Operators (${staffList.length})` : role}
              </button>
            ))}
          </div>

          {/* Operator Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {filteredStaff.map((stf) => {
              const isCurrentOperator = activeOperator?.id === stf.id;
              return (
                <div
                  key={stf.id}
                  className={`p-4 rounded-2xl border space-y-3 shadow-xs transition-all ${
                    isCurrentOperator
                      ? 'ring-2 ring-[#D4A017] border-[#D4A017] bg-amber-50/20'
                      : highContrastMode
                      ? 'bg-zinc-900 border-zinc-700 text-white'
                      : 'bg-white border-zinc-300 text-zinc-950'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2.5">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-[#121214] text-[#D4A017] border border-[#D4A017] font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                        {stf.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-extrabold text-sm sm:text-base">{stf.name}</h3>
                          <span className="font-mono text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-100 text-black border border-[#D4A017]">
                            {stf.id}
                          </span>
                          {isCurrentOperator && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#121214] text-[#D4A017] border border-[#D4A017]">
                              Active Session
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-mono text-zinc-500 block mt-0.5">
                          @{stf.username} · <strong className="text-[#B8860B]">{stf.role}</strong>
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => void toggleShiftStatus(stf)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold border cursor-pointer shrink-0 ${
                        stf.status === 'Online'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : stf.status === 'In Production'
                          ? 'bg-amber-100 text-amber-900 border-amber-300'
                          : 'bg-zinc-200 text-zinc-700 border-zinc-300'
                      }`}
                      title="Click to cycle operator status"
                    >
                      ● {stf.status}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300 font-semibold">
                      <Phone className="w-3.5 h-3.5 text-[#B8860B] shrink-0" />
                      <span className="font-mono">{stf.phone}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300 font-semibold">
                      <Clock className="w-3.5 h-3.5 text-[#B8860B] shrink-0" />
                      <span>{stf.shift}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300 font-semibold sm:col-span-2">
                      <Mail className="w-3.5 h-3.5 text-[#B8860B] shrink-0" />
                      <span className="font-mono truncate">{stf.email}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 text-zinc-950 text-xs">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase text-zinc-500 block">
                        Assigned Requests
                      </span>
                      <span className="font-mono font-black text-sm">
                        {stf.assignedJobs} Active Orders
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-extrabold uppercase text-zinc-500 block">
                        Fulfilled Today
                      </span>
                      <span className="font-mono font-black text-sm text-emerald-700">
                        {stf.completedToday} Completed
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    {isCurrentOperator && (
                      <span className="flex-1 text-xs font-extrabold uppercase text-emerald-800">
                        Current signed-in operator
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => setSubView('logs')}
                      className="py-2 px-3 rounded-xl font-bold text-xs border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                    >
                      View Audit Logs
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add New Operator Modal */}
      {isAddOperatorOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-black rounded-t-2xl sm:rounded-2xl max-w-md w-full p-5 space-y-3.5 shadow-2xl text-zinc-950 relative">
            <button
              type="button"
              onClick={() => setIsAddOperatorOpen(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-black"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b border-[#D4A017] pb-2.5">
              <h3 className="font-black text-lg">+ Add Admin / Staff Operator</h3>
              <p className="text-xs text-zinc-600 font-medium">
                Register an operator account for service management, order verification & customer support.
              </p>
            </div>

            <form onSubmit={handleAddOperatorSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-extrabold block mb-1">Operator Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="E.g., Paolo Reyes"
                  value={newOpName}
                  onChange={(e) => setNewOpName(e.target.value)}
                  className="w-full border border-zinc-400 p-2.5 rounded-xl font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-extrabold block mb-1">Username</label>
                  <input
                    type="text"
                    required
                    placeholder="staff_paolo"
                    value={newOpUsername}
                    onChange={(e) => setNewOpUsername(e.target.value)}
                    className="w-full border border-zinc-400 p-2.5 rounded-xl font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-extrabold block mb-1">Operator Role</label>
                  <select
                    value={newOpRole}
                    onChange={(e) => setNewOpRole(e.target.value as StaffMember['role'])}
                    className="w-full border border-zinc-400 p-2.5 rounded-xl font-bold bg-white"
                  >
                    <option value="Lead Admin">Lead Admin</option>
                    <option value="Print Operator">Print Operator</option>
                    <option value="Pre-Press Artist">Pre-Press Artist</option>
                    <option value="Front Desk & Cashier">Front Desk & Cashier</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-extrabold block mb-1">Mobile Number</label>
                  <input
                    type="text"
                    required
                    value={newOpPhone}
                    onChange={(e) => setNewOpPhone(e.target.value)}
                    className="w-full border border-zinc-400 p-2.5 rounded-xl font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-extrabold block mb-1">Shift Schedule</label>
                  <input
                    type="text"
                    value={newOpShift}
                    onChange={(e) => setNewOpShift(e.target.value)}
                    className="w-full border border-zinc-400 p-2.5 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-extrabold block mb-1">Work Email</label>
                <input
                  type="email"
                  required
                  placeholder="operator@netsoprints.com"
                  value={newOpEmail}
                  onChange={(e) => setNewOpEmail(e.target.value)}
                  className="w-full border border-zinc-400 p-2.5 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="font-extrabold block mb-1">Temporary Password (minimum 12 characters)</label>
                <input
                  type="password"
                  required
                  minLength={12}
                  maxLength={128}
                  autoComplete="new-password"
                  value={newOpPassword}
                  onChange={(e) => setNewOpPassword(e.target.value)}
                  className="w-full border border-zinc-400 p-2.5 rounded-xl font-mono"
                />
              </div>

              {error && <p role="alert" className="text-sm font-semibold text-red-700">{error}</p>}
              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-2.5 bg-[#D4A017] hover:bg-[#B8860B] text-black font-extrabold uppercase rounded-xl border border-black cursor-pointer"
              >
                {isSaving ? 'Creating Account…' : 'Register Operator & Log Event'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default StaffManagement;
