'use client';

import React, { useState, useMemo } from 'react';
import {
  LayoutGrid,
  FileText,
  Wallet,
  Users,
  MessageSquare,
  ShieldCheck,
  UserCheck,
  User,
  LogOut,
  X,
  Printer,
  Layers,
  BarChart3,
} from 'lucide-react';
import {
  RequestOrder,
  OrderStatus,
  CustomerRecord,
  PaymentTransaction,
  MessageThread,
  UserLogEntry,
  FontSizeLevel,
  StaffMember,
} from '../../types';
import type { AuthenticatedUser } from '../Authentication/Authentication';
import { Header } from '../../components/Header';
import { Sidebar } from '../../components/Sidebar';
import {
  AdminRequestDetailsModal,
  AdminCustomerDetailModal,
  AdminNotificationDrawer,
} from './AdminModals';
import { AdminDashboard } from './AdminDashboard/AdminDashboard';
import { OrderManagement } from './OrderManagement/OrderManagement';
import { ProductionQueue } from './ProductionQueue/ProductionQueue';
import { PaymentManagement } from './PaymentManagement/PaymentManagement';
import { CustomerManagement } from './CustomerManagement/CustomerManagement';
import { StaffManagement } from './StaffManagement/StaffManagement';
import { ServiceManagement } from './ServiceManagement/ServiceManagement';
import { Reports } from './Reports/Reports';
import { Notifications } from './Notifications/Notifications';
import { AdminProfile } from './AdminProfile/AdminProfile';

export type AdminTabId =
  | 'dashboard'
  | 'orders'
  | 'production'
  | 'payments'
  | 'customers'
  | 'staff'
  | 'logs'
  | 'services'
  | 'reports'
  | 'notifications'
  | 'profile';

interface AdminPortalProps {
  currentUser: AuthenticatedUser;
  requests: RequestOrder[];
  customers: CustomerRecord[];
  payments: PaymentTransaction[];
  threads: MessageThread[];
  userLogs: UserLogEntry[];
  notifications: Array<{ id: string; time: string; text: string; unread: boolean }>;
  setNotifications: React.Dispatch<React.SetStateAction<Array<{ id: string; time: string; text: string; unread: boolean }>>>;
  onUpdateOrderStatus: (
    orderId: string,
    newStatus: OrderStatus,
    newStage: number,
    adminNote?: string
  ) => void;
  onVerifyPayment: (orderId: string) => void;
  onRecordPayment: (orderId: string, amount: number) => void;
  onSendAdminReply: (threadId: string, text: string) => void;
  onCreateWalkInOrder: (
    customerName: string,
    customerPhone: string,
    service: string,
    amount: number,
    paidAmount: number,
    notes: string
  ) => void;
  onAddUserLog: (entry: Omit<UserLogEntry, 'id' | 'timestamp' | 'date'>) => void;
  fontSizeLevel: FontSizeLevel;
  setFontSizeLevel: (level: FontSizeLevel) => void;
  highContrastMode: boolean;
  setHighContrastMode: (val: boolean) => void;
  onLogout?: () => void;
  initialTab?: AdminTabId;
}

export function AdminPortal({
  currentUser,
  requests,
  customers,
  payments,
  threads,
  userLogs,
  notifications,
  setNotifications,
  onUpdateOrderStatus,
  onVerifyPayment,
  onRecordPayment,
  onSendAdminReply,
  onCreateWalkInOrder,
  onAddUserLog,
  fontSizeLevel,
  highContrastMode,
  onLogout,
  initialTab = 'dashboard',
}: AdminPortalProps) {
  const isLeadAdmin = currentUser.staffRole === 'lead_admin';
  const canReviewPayments =
    isLeadAdmin || currentUser.staffRole === 'front_desk_cashier';
  const canAccessTab = (tab: string) => {
    if (['customers', 'staff', 'services', 'reports', 'logs'].includes(tab)) return isLeadAdmin;
    if (tab === 'payments') return canReviewPayments;
    return true;
  };
  const [activeTab, setActiveTab] = useState<AdminTabId>(() =>
    canAccessTab(initialTab) ? initialTab : 'dashboard'
  );
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('All');
  const [activeOperator] = useState<StaffMember>(() => {
    const roleLabels: Record<string, StaffMember['role']> = {
      lead_admin: 'Lead Admin',
      print_operator: 'Print Operator',
      pre_press_artist: 'Pre-Press Artist',
      front_desk_cashier: 'Front Desk & Cashier',
    };
    return {
      id: currentUser.username?.toUpperCase() || currentUser.id || '',
      name: currentUser.name,
      username: currentUser.username || currentUser.identifier,
      role: roleLabels[currentUser.staffRole || ''] || 'Print Operator',
      email: currentUser.identifier,
      phone: '',
      shift: 'Not scheduled',
      status: 'Off Duty',
      assignedJobs: 0,
      completedToday: 0,
    };
  });
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<RequestOrder | null>(null);
  const [selectedCustomerForModal, setSelectedCustomerForModal] = useState<CustomerRecord | null>(
    null
  );
  const [selectedThreadId, setSelectedThreadId] = useState('');
  const activeThreadId = threads.some((thread) => thread.id === selectedThreadId)
    ? selectedThreadId
    : threads[0]?.id || '';

  const [isWalkInModalOpen, setIsWalkInModalOpen] = useState(false);
  const [walkInName, setWalkInName] = useState('');
  const [walkInPhone, setWalkInPhone] = useState('');
  const [walkInService, setWalkInService] = useState('');
  const [walkInAmount, setWalkInAmount] = useState(0);
  const [walkInPaid, setWalkInPaid] = useState(0);
  const [walkInNotes, setWalkInNotes] = useState('');

  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const stats = useMemo(() => {
    const pending = requests.filter(
      (r) => r.status === 'Unpaid Balance' || r.status === 'In Pre-Press'
    ).length;
    const processing = requests.filter((r) => r.status === 'In Production').length;
    const ready = requests.filter((r) => r.status === 'Ready for Pickup').length;
    const completed = requests.filter((r) => r.status === 'Completed').length;
    const unpaid = requests.filter((r) => r.unpaidAmount > 0).length;
    const unreadMsgs = threads.filter((t) => t.status === 'UNREAD').length;
    const unverifiedPayments = payments.filter(
      (payment) => payment.status === 'Pending Review'
    ).length;
    const totalUnpaidAmount = requests.reduce((sum, r) => sum + r.unpaidAmount, 0);
    return {
      totalRequests: requests.length,
      pending,
      processing,
      ready,
      completed,
      unpaid,
      unreadMsgs,
      unverifiedPayments,
      totalUnpaidAmount,
    };
  }, [requests, threads, payments]);

  const activeModalOrder = useMemo(() => {
    if (!selectedOrderForDetails) return null;
    return (
      requests.find((r) => r.id === selectedOrderForDetails.id) || selectedOrderForDetails
    );
  }, [requests, selectedOrderForDetails]);

  const handleNavigateTab = (tab: AdminTabId, filter?: string) => {
    if (filter) setOrderStatusFilter(filter);
    setActiveTab(tab);
  };

  const handleAdminLogout = () => {
    onAddUserLog({
      actorName: `${activeOperator.name} (${activeOperator.role})`,
      actorUsername: activeOperator.username,
      actorRole: activeOperator.role === 'Lead Admin' ? 'Admin' : 'Operator',
      category: 'Authentication',
      action: 'Admin Portal Sign-Out',
      details: `Operator ${activeOperator.name} ended active session.`,
      targetId: 'SESSION-ADM',
      ipAddress: '112.198.44.102',
      device: 'Admin Service Desk · Santiago City',
      status: 'Success',
    });
    setIsLogoutModalOpen(false);
    onLogout?.();
  };

  const handleWalkInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!walkInName.trim()) return;
    onCreateWalkInOrder(
      walkInName.trim(),
      walkInPhone.trim(),
      walkInService,
      walkInAmount,
      walkInPaid,
      walkInNotes
    );
    setWalkInName('');
    setIsWalkInModalOpen(false);
  };

  const operatorInitials = activeOperator.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2);

  const headerNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
    { id: 'orders', label: 'Service Requests', icon: FileText, badge: stats.unpaid },
    { id: 'production', label: 'Status Board', icon: Layers, badge: stats.processing },
    { id: 'payments', label: 'GCash Payments', icon: Wallet, badge: stats.unverifiedPayments },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'staff', label: 'Admin Operators', icon: UserCheck },
    { id: 'logs', label: 'User Logs', icon: ShieldCheck, badge: userLogs.length },
    { id: 'services', label: 'Services', icon: Printer },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'notifications', label: 'Staff Chat', icon: MessageSquare, badge: stats.unreadMsgs },
  ].filter((item) => canAccessTab(item.id));

  const sidebarItems = [
    {
      id: 'dashboard',
      label: 'Admin Dashboard',
      desc: 'Service KPIs & status overview',
      icon: LayoutGrid,
    },
    {
      id: 'orders',
      label: 'Service Requests',
      desc: 'tbl_print_order & status control',
      icon: FileText,
      badge: requests.length,
    },
    {
      id: 'production',
      label: 'Status Workflow Board',
      desc: '4-Stage service progress tracker',
      icon: Layers,
      badge: stats.processing,
    },
    {
      id: 'payments',
      label: 'GCash Payments',
      desc: 'GCash refs & customer balances',
      icon: Wallet,
      badge: stats.unverifiedPayments || undefined,
    },
    {
      id: 'customers',
      label: 'Customer Directory',
      desc: 'tbl_user accounts & spend',
      icon: Users,
    },
    {
      id: 'staff',
      label: 'Admin Operators',
      desc: 'Manage staff & operator roles',
      icon: UserCheck,
    },
    {
      id: 'logs',
      label: 'User Activity Logs',
      desc: 'Sign-ins & audit trail',
      icon: ShieldCheck,
      badge: userLogs.length,
    },
    {
      id: 'services',
      label: 'Service Catalog',
      desc: 'Service rates & turnaround',
      icon: Printer,
    },
    {
      id: 'reports',
      label: 'Financial Reports',
      desc: 'Revenue & service breakdown',
      icon: BarChart3,
    },
    {
      id: 'notifications',
      label: 'Staff Chat & Alerts',
      desc: 'Customer threads & inquiries',
      icon: MessageSquare,
      badge: stats.unreadMsgs || undefined,
    },
    {
      id: 'profile',
      label: 'Admin Profile',
      desc: 'Branch & operator settings',
      icon: User,
    },
  ].filter((item) => canAccessTab(item.id));

  return (
    <div
      className={`h-screen flex flex-col selection:bg-[#D4A017] selection:text-black overflow-hidden font-clarity-modern ${
        highContrastMode ? 'bg-black text-white' : 'bg-[#0D0D0E] text-[#F4F4F5]'
      }`}
    >
      {/* Shared Header Component (clean single-row header) */}
      <Header
        portalTitle="NETSO ADMIN"
        portalBadge="SERVICE MANAGEMENT"
        subtitle="Service Request Tracking, GCash Verification, Admin Operators & User Logs"
        navItems={headerNavItems}
        activeTab={activeTab}
        onSelectTab={(id) => setActiveTab(id as AdminTabId)}
        userInitials={operatorInitials}
        userName={activeOperator.name}
        userRoleLabel={activeOperator.role}
        onProfileClick={() => setActiveTab('profile')}
        onLogoutClick={() => setIsLogoutModalOpen(true)}
        primaryActionLabel="+ Walk-In Request"
        onPrimaryAction={() => setIsWalkInModalOpen(true)}
        unreadNotificationsCount={notifications.filter((n) => n.unread).length}
        onOpenNotifications={() => setIsNotifOpen(true)}
        highContrastMode={highContrastMode}
        fontSizeLevel={fontSizeLevel}
      />

      {/* Main Layout Body */}
      <div className="grid grid-cols-1 md:grid-cols-12 flex-1 min-h-0 overflow-hidden">
        {/* Shared Sidebar Component */}
        <Sidebar
          menuHeading="ADMINISTRATION MENU"
          items={sidebarItems}
          activeTab={activeTab}
          onSelectTab={(id) => setActiveTab(id as AdminTabId)}
          calloutBadge="GCASH LEDGER DESK"
          calloutTitle={`₱${stats.totalUnpaidAmount.toLocaleString()} Unpaid Balance`}
          calloutDesc={
            stats.unverifiedPayments > 0
              ? `${stats.unverifiedPayments} GCash reference(s) waiting for admin verification.`
              : 'All submitted GCash references are verified.'
          }
          calloutButtonLabel="Open Payment Ledger"
          onCalloutAction={() => setActiveTab('payments')}
          userInitials={operatorInitials}
          userName={`${activeOperator.name}`}
          userSubtitle={activeOperator.role}
          onProfileClick={() => setActiveTab('profile')}
          onLogoutClick={() => setIsLogoutModalOpen(true)}
          highContrastMode={highContrastMode}
          fontSizeLevel={fontSizeLevel}
        />

        {/* Main Content Area */}
        <main
          className={`col-span-12 md:col-span-8 lg:col-span-9 p-4 sm:p-6 overflow-y-auto pb-24 md:pb-8 ${
            highContrastMode ? 'bg-[#050505] text-white' : 'bg-[#F9FAFB] text-zinc-950'
          }`}
        >
          {activeTab === 'dashboard' && (
            <AdminDashboard
              requests={requests}
              userLogs={userLogs}
              stats={stats}
              onOpenWalkInModal={() => setIsWalkInModalOpen(true)}
              onNavigateTab={handleNavigateTab}
              onUpdateOrderStatus={onUpdateOrderStatus}
              onSelectOrder={(ord) => setSelectedOrderForDetails(ord)}
              highContrastMode={highContrastMode}
              fontSizeLevel={fontSizeLevel}
            />
          )}

          {activeTab === 'orders' && (
            <OrderManagement
              requests={requests}
              initialStatusFilter={orderStatusFilter}
              onOpenWalkInModal={() => setIsWalkInModalOpen(true)}
              onUpdateOrderStatus={onUpdateOrderStatus}
              onSelectOrder={(ord) => setSelectedOrderForDetails(ord)}
              highContrastMode={highContrastMode}
              fontSizeLevel={fontSizeLevel}
            />
          )}

          {activeTab === 'production' && (
            <ProductionQueue
              requests={requests}
              onUpdateOrderStatus={onUpdateOrderStatus}
              onSelectOrder={(ord) => setSelectedOrderForDetails(ord)}
              highContrastMode={highContrastMode}
              fontSizeLevel={fontSizeLevel}
            />
          )}

          {activeTab === 'payments' && (
            <PaymentManagement
              requests={requests}
              payments={payments}
              onSelectOrder={(ord) => setSelectedOrderForDetails(ord)}
              onVerifyPayment={onVerifyPayment}
              onRecordPayment={onRecordPayment}
              highContrastMode={highContrastMode}
              fontSizeLevel={fontSizeLevel}
            />
          )}

          {activeTab === 'customers' && (
            <CustomerManagement
              customers={customers}
              onSelectCustomer={(c) => setSelectedCustomerForModal(c)}
              highContrastMode={highContrastMode}
              fontSizeLevel={fontSizeLevel}
            />
          )}

          {(activeTab === 'staff' || activeTab === 'logs') && (
            <StaffManagement
              key={activeTab === 'logs' ? 'logs' : 'staff'}
              userLogs={userLogs}
              onAddUserLog={onAddUserLog}
              defaultSubView={activeTab === 'logs' ? 'logs' : 'roster'}
              activeOperator={activeOperator}
              highContrastMode={highContrastMode}
              fontSizeLevel={fontSizeLevel}
            />
          )}

          {activeTab === 'services' && (
            <ServiceManagement
              highContrastMode={highContrastMode}
              fontSizeLevel={fontSizeLevel}
            />
          )}

          {activeTab === 'reports' && (
            <Reports
              requests={requests}
              payments={payments}
              highContrastMode={highContrastMode}
              fontSizeLevel={fontSizeLevel}
            />
          )}

          {activeTab === 'notifications' && (
            <Notifications
              threads={threads}
              selectedThreadId={activeThreadId}
              onSelectThread={setSelectedThreadId}
              onSendAdminReply={onSendAdminReply}
              highContrastMode={highContrastMode}
              fontSizeLevel={fontSizeLevel}
            />
          )}

          {activeTab === 'profile' && (
            <AdminProfile
              onOpenLogout={() => setIsLogoutModalOpen(true)}
              highContrastMode={highContrastMode}
              fontSizeLevel={fontSizeLevel}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        className={`md:hidden fixed bottom-0 left-0 right-0 z-40 border-t flex items-center justify-around px-1 py-1.5 transition-colors shadow-lg ${
          highContrastMode ? 'bg-black border-amber-500' : 'bg-[#121214] border-zinc-800'
        }`}
        aria-label="Admin Mobile Bottom Navigation"
      >
        {[
          { id: 'dashboard', label: 'Home', icon: LayoutGrid },
          { id: 'orders', label: 'Requests', icon: FileText, badge: stats.unpaid },
          { id: 'payments', label: 'GCash', icon: Wallet },
          { id: 'staff', label: 'Operators', icon: UserCheck },
          { id: 'logs', label: 'Logs', icon: ShieldCheck },
          { id: 'notifications', label: 'Chat', icon: MessageSquare, badge: stats.unreadMsgs },
        ].filter((tab) => canAccessTab(tab.id)).map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as AdminTabId)}
              className={`flex-1 py-1 px-1 flex flex-col items-center justify-center gap-1 rounded-lg transition-all min-h-[48px] relative active:scale-95 ${
                isActive
                  ? 'text-[#D4A017] font-black'
                  : highContrastMode
                  ? 'text-zinc-300 hover:text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'text-[#D4A017]' : ''}`} />
                {tab.badge ? (
                  <span className="absolute -top-1.5 -right-2.5 px-1.5 py-0.2 text-[10px] font-black bg-red-600 text-white rounded-full">
                    {tab.badge}
                  </span>
                ) : null}
              </div>
              <span className="text-xs font-bold leading-none">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Modals & Drawers */}
      <AdminRequestDetailsModal
        order={activeModalOrder}
        onClose={() => setSelectedOrderForDetails(null)}
        onUpdateStatus={onUpdateOrderStatus}
        onVerifyPayment={onVerifyPayment}
        onRecordPayment={onRecordPayment}
        onMessageCustomer={(orderId) => {
          const found = threads.find((t) => t.requestId === orderId);
          if (found) setSelectedThreadId(found.id);
          setActiveTab('notifications');
        }}
        highContrastMode={highContrastMode}
        fontSizeLevel={fontSizeLevel}
      />

      <AdminCustomerDetailModal
        customer={selectedCustomerForModal}
        orders={requests}
        onClose={() => setSelectedCustomerForModal(null)}
        onSelectOrder={(ord) => setSelectedOrderForDetails(ord)}
        highContrastMode={highContrastMode}
      />

      <AdminNotificationDrawer
        isOpen={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
        notifications={notifications}
        onMarkAllRead={() => setNotifications((current) => current.map((notification) => ({ ...notification, unread: false })))}
      />

      {isWalkInModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-black rounded-t-2xl sm:rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl text-zinc-950 relative">
            <button
              type="button"
              onClick={() => setIsWalkInModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-black"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b border-[#D4A017] pb-3">
              <h3 className="font-black text-lg sm:text-xl">+ Log Walk-In Service Request</h3>
              <p className="text-sm text-zinc-600 font-medium mt-0.5">
                Creates a service request in tbl_print_order and logs the operator action in User Logs.
              </p>
            </div>

            <form onSubmit={handleWalkInSubmit} className="space-y-3.5 text-sm">
              <div>
                <label className="font-extrabold block mb-1">Walk-In Customer Name</label>
                <input
                  type="text"
                  required
                  placeholder="E.g., Elena Bautista"
                  value={walkInName}
                  onChange={(e) => setWalkInName(e.target.value)}
                  className="w-full border border-zinc-400 p-3 rounded-xl font-bold"
                />
              </div>
              <div>
                <label className="font-extrabold block mb-1">Mobile Number</label>
                <input
                  type="text"
                  value={walkInPhone}
                  onChange={(e) => setWalkInPhone(e.target.value)}
                  className="w-full border border-zinc-400 p-3 rounded-xl font-mono font-bold"
                />
              </div>
              <div>
                <label className="font-extrabold block mb-1">Service &amp; Specs</label>
                <input
                  type="text"
                  value={walkInService}
                  onChange={(e) => setWalkInService(e.target.value)}
                  className="w-full border border-zinc-400 p-3 rounded-xl font-bold"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold block mb-1">Total Amount (₱)</label>
                  <input
                    type="number"
                    min={1}
                    value={walkInAmount}
                    onChange={(e) => setWalkInAmount(Number(e.target.value) || 0)}
                    className="w-full border border-zinc-400 p-3 rounded-xl font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-extrabold block mb-1">Cash Received (pending staff verification) (₱)</label>
                  <input
                    type="number"
                    min={0}
                    value={walkInPaid}
                    onChange={(e) => setWalkInPaid(Number(e.target.value) || 0)}
                    className="w-full border border-zinc-400 p-3 rounded-xl font-mono font-bold"
                  />
                </div>
              </div>
              <div>
                <label className="font-extrabold block mb-1">Service Request Notes</label>
                <input
                  type="text"
                  value={walkInNotes}
                  onChange={(e) => setWalkInNotes(e.target.value)}
                  className="w-full border border-zinc-400 p-3 rounded-xl font-medium"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-[#D4A017] hover:bg-[#B8860B] text-black font-extrabold uppercase rounded-xl border border-black cursor-pointer text-sm sm:text-base"
              >
                Create Service Request &amp; Log Entry
              </button>
            </form>
          </div>
        </div>
      )}

      {isLogoutModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm sm:max-w-md p-6 rounded-t-2xl sm:rounded-2xl border bg-white border-zinc-300 text-zinc-950 shadow-2xl space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-red-100 text-red-600 border border-red-200 flex items-center justify-center shrink-0">
                <LogOut className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-lg">Log Out of Admin Portal?</h3>
                <p className="text-sm text-zinc-600 font-semibold mt-1">
                  Signed in as {activeOperator.name} ({activeOperator.role})
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsLogoutModalOpen(false)}
                className="px-4 py-2.5 border border-zinc-300 rounded-xl font-bold text-sm cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAdminLogout}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-xl text-sm flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Yes, Log Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPortal;
