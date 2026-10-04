'use client';

import React, { useState, useEffect } from 'react';
import {
  RequestOrder,
  OrderStatus,
  CustomerRecord,
  PaymentTransaction,
  MessageThread,
  UserLogEntry,
  FontSizeLevel,
} from './types/portal';
import {
  INITIAL_REQUESTS,
  INITIAL_CUSTOMERS,
  INITIAL_PAYMENTS,
  INITIAL_THREADS,
  INITIAL_USER_LOGS,
} from './data/mockPortalData';
import { AdminPortal } from './features/Admin/AdminPortal';
import { CustomerPortal } from './features/Customer/CustomerPortal';
import Authentication, { type AuthenticatedUser } from './features/Authentication/Authentication';

export interface AppProps {
  initialRoute?: 'login' | 'customer' | 'admin';
  customerTab?: 'dashboard' | 'services' | 'requests' | 'payments' | 'messages' | 'profile';
  adminTab?:
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
}

export default function App({ initialRoute, customerTab, adminTab }: AppProps = {}) {
  const [user, setUser] = useState<AuthenticatedUser | null>(() => {
    if (initialRoute === 'customer') {
      return {
        name: 'Alexandrie Abon',
        identifier: 'alexandrieabon@gmail.com',
        role: 'customer',
      };
    }
    if (initialRoute === 'admin') {
      return {
        name: 'Renato C.',
        identifier: 'ADM-8001',
        role: 'admin',
      };
    }
    return null;
  });
  const [fontSizeLevel, setFontSizeLevel] = useState<FontSizeLevel>('large');
  const [highContrastMode, setHighContrastMode] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || initialRoute) return;
    const path = window.location.pathname.toLowerCase();
    if (path.startsWith('/customer')) {
      setUser({
        name: 'Alexandrie Abon',
        identifier: 'alexandrieabon@gmail.com',
        role: 'customer',
      });
    } else if (path.startsWith('/admin')) {
      setUser({
        name: 'Renato C.',
        identifier: 'ADM-8001',
        role: 'admin',
      });
    }
  }, [initialRoute]);

  const [requests, setRequests] = useState<RequestOrder[]>(INITIAL_REQUESTS);
  const [customers, setCustomers] = useState<CustomerRecord[]>(INITIAL_CUSTOMERS);
  const [payments, setPayments] = useState<PaymentTransaction[]>(INITIAL_PAYMENTS);
  const [threads, setThreads] = useState<MessageThread[]>(INITIAL_THREADS);
  const [userLogs, setUserLogs] = useState<UserLogEntry[]>(INITIAL_USER_LOGS);

  const handleAddUserLog = (entry: Omit<UserLogEntry, 'id' | 'timestamp' | 'date'>) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toISOString().split('T')[0];
    const newLog: UserLogEntry = {
      ...entry,
      id: `LOG-${Math.floor(5013 + Math.random() * 4900)}`,
      timestamp: timeStr,
      date: dateStr,
    };
    setUserLogs((prev) => [newLog, ...prev]);
  };

  const handleUpdateOrderStatus = (
    orderId: string,
    newStatus: OrderStatus,
    newStage: number,
    adminNote?: string
  ) => {
    setRequests((prev) =>
      prev.map((req) => {
        if (req.id === orderId) {
          return {
            ...req,
            status: newStatus,
            progressStage: newStage,
            notes: adminNote ? `${req.notes} [Admin Note: ${adminNote}]` : req.notes,
          };
        }
        return req;
      })
    );

    handleAddUserLog({
      actorName: 'Renato C. (Lead Admin)',
      actorUsername: 'admin_netso',
      actorRole: 'Admin',
      category: 'Order Management',
      action: `Updated Status → ${newStatus}`,
      details: `Changed order ${orderId} to Stage ${newStage} (${newStatus}).${
        adminNote ? ` Note: "${adminNote}"` : ''
      }`,
      targetId: orderId,
      ipAddress: '112.198.44.102',
      device: 'Workstation #1 · Santiago City',
      status: 'Verified',
    });
  };

  const handleVerifyPayment = (orderId: string) => {
    const target = requests.find((r) => r.id === orderId);
    setRequests((prev) =>
      prev.map((req) => (req.id === orderId ? { ...req, paymentVerified: true } : req))
    );
    setPayments((prev) =>
      prev.map((txn) => (txn.requestId === orderId ? { ...txn, status: 'Verified' } : txn))
    );

    handleAddUserLog({
      actorName: 'Renato C. (Lead Admin)',
      actorUsername: 'admin_netso',
      actorRole: 'Admin',
      category: 'GCash Payment',
      action: 'Verified GCash Payment Reference',
      details: `Verified GCash reference ${target?.gcashRefNo || ''} (₱${
        target?.paidAmount || 0
      }) for ${target?.customerName || 'Customer'}.`,
      targetId: orderId,
      ipAddress: '112.198.44.102',
      device: 'Workstation #1 · Santiago City',
      status: 'Verified',
    });
  };

  const handleRecordPayment = (orderId: string, amount: number) => {
    const target = requests.find((r) => r.id === orderId);
    const newRef = `GC-${Math.floor(1000 + Math.random() * 8999)}-${Math.floor(
      1000 + Math.random() * 8999
    )}-${Math.floor(10 + Math.random() * 89)}`;
    const newPaymongo = `pay_${Math.random().toString(36).slice(2, 12)}`;

    setRequests((prev) =>
      prev.map((req) => {
        if (req.id === orderId) {
          const newPaid = req.paidAmount + amount;
          const newUnpaid = Math.max(0, req.amount - newPaid);
          const nextStatus: OrderStatus =
            req.status === 'Unpaid Balance' ? 'In Production' : req.status;
          return {
            ...req,
            paidAmount: newPaid,
            unpaidAmount: newUnpaid,
            status: nextStatus,
            progressStage: req.progressStage === 1 ? 3 : req.progressStage,
            paymentMethod: 'GCash',
            gcashRefNo: req.gcashRefNo || newRef,
            paymongoId: req.paymongoId || newPaymongo,
            paymentVerified: true,
          };
        }
        return req;
      })
    );

    if (target) {
      setCustomers((prev) =>
        prev.map((c) =>
          c.username === target.customerUsername
            ? {
                ...c,
                totalSpent: c.totalSpent + amount,
                outstandingBalance: Math.max(0, c.outstandingBalance - amount),
              }
            : c
        )
      );

      const newTxn: PaymentTransaction = {
        id: `TXN-${Math.floor(8802 + Math.random() * 999)}`,
        requestId: orderId,
        customerName: target.customerName,
        customerPhone: target.customerPhone,
        amount,
        paymentType: 'Balance Settlement',
        method: 'GCash',
        gcashRefNo: newRef,
        paymongoId: newPaymongo,
        date: new Date().toISOString().split('T')[0],
        time: 'Just now',
        status: 'Verified',
      };
      setPayments((prev) => [newTxn, ...prev]);

      handleAddUserLog({
        actorName: 'Renato C. (Lead Admin)',
        actorUsername: 'admin_netso',
        actorRole: 'Admin',
        category: 'GCash Payment',
        action: 'Recorded GCash Balance Settlement',
        details: `Settled ₱${amount} balance for ${target.customerName} on ${orderId} (Ref: ${newRef}).`,
        targetId: orderId,
        ipAddress: '112.198.44.102',
        device: 'Workstation #1 · Santiago City',
        status: 'Verified',
      });
    }
  };

  const handleSendAdminReply = (threadId: string, text: string) => {
    const targetThread = threads.find((t) => t.id === threadId);
    setThreads((prev) =>
      prev.map((thr) => {
        if (thr.id === threadId) {
          return {
            ...thr,
            status: 'Replied',
            lastUpdated: 'Just now',
            messages: [
              ...thr.messages,
              {
                id: `m-${Date.now()}`,
                sender: 'NETSO Staff (Admin)',
                text,
                time: 'Just now',
                isStaff: true,
              },
            ],
          };
        }
        return thr;
      })
    );

    handleAddUserLog({
      actorName: 'Renato C. (Lead Admin)',
      actorUsername: 'admin_netso',
      actorRole: 'Admin',
      category: 'Staff Chat',
      action: 'Replied to Customer Inquiry',
      details: `Sent message to ${targetThread?.customerName || 'Customer'}: "${text}"`,
      targetId: targetThread?.requestId || threadId,
      ipAddress: '112.198.44.102',
      device: 'Workstation #1 · Santiago City',
      status: 'Success',
    });
  };

  const handleCreateWalkInOrder = (
    customerName: string,
    customerPhone: string,
    service: string,
    amount: number,
    paidAmount: number,
    notes: string
  ) => {
    const unpaidAmount = Math.max(0, amount - paidAmount);
    const newId = `NETSO-${Math.floor(90105 + Math.random() * 899)}`;
    const newRef = paidAmount > 0 ? `GC-${Math.floor(1000 + Math.random() * 8999)}-WALK` : undefined;
    const newOrder: RequestOrder = {
      id: newId,
      customerId: `NET-${Math.floor(9090 + Math.random() * 90)}`,
      customerName,
      customerUsername: customerName.toLowerCase().replace(/\s+/g, '_'),
      customerPhone,
      customerEmail: `${customerName.toLowerCase().replace(/\s+/g, '.')}@email.com`,
      service,
      category: 'Large Format',
      date: new Date().toISOString().split('T')[0],
      amount,
      paidAmount,
      unpaidAmount,
      status: unpaidAmount === 0 ? 'In Production' : paidAmount > 0 ? 'In Pre-Press' : 'Unpaid Balance',
      progressStage: unpaidAmount === 0 ? 3 : paidAmount > 0 ? 2 : 1,
      notes,
      paymentMethod: 'GCash',
      gcashRefNo: newRef,
      paymentVerified: paidAmount > 0,
      files: [],
    };

    setRequests((prev) => [newOrder, ...prev]);

    handleAddUserLog({
      actorName: 'Renato C. (Lead Admin)',
      actorUsername: 'admin_netso',
      actorRole: 'Admin',
      category: 'Order Management',
      action: 'Logged Walk-In Print Request',
      details: `Created walk-in order ${newId} (${service}) for ${customerName}. Total: ₱${amount}, Paid: ₱${paidAmount}.`,
      targetId: newId,
      ipAddress: '112.198.44.102',
      device: 'Workstation #1 · Santiago City',
      status: 'Verified',
    });
  };

  const handleAuthenticated = (authenticatedUser: AuthenticatedUser) => {
    setUser(authenticatedUser);
    handleAddUserLog({
      actorName: authenticatedUser.name,
      actorUsername: authenticatedUser.identifier,
      actorRole:
        authenticatedUser.role === 'admin'
          ? 'Admin'
          : authenticatedUser.role === 'staff'
          ? 'Operator'
          : 'Customer',
      category: 'Authentication',
      action: `${
        authenticatedUser.role === 'customer'
          ? 'Customer Portal'
          : authenticatedUser.role === 'staff'
          ? 'Staff Operator'
          : 'Shop Admin'
      } Sign-In`,
      details: `${authenticatedUser.name} (${authenticatedUser.identifier}) signed in as ${authenticatedUser.role.toUpperCase()}.`,
      targetId: authenticatedUser.identifier,
      ipAddress: '112.198.81.209',
      device: 'Web Portal · Santiago City',
      status: 'Verified',
    });
  };

  if (!user) {
    return <Authentication onAuthenticated={handleAuthenticated} />;
  }

  if (user.role === 'customer') {
    return (
      <CustomerPortal
        currentUser={{
          name: user.name,
          username: 'alex_abon',
          email: user.identifier,
        }}
        initialTab={customerTab || 'dashboard'}
        requests={requests}
        setRequests={setRequests}
        onAddUserLog={handleAddUserLog}
        fontSizeLevel={fontSizeLevel}
        setFontSizeLevel={setFontSizeLevel}
        highContrastMode={highContrastMode}
        setHighContrastMode={setHighContrastMode}
        onLogout={() => setUser(null)}
        onSwitchToAdminPortal={() =>
          setUser({ name: 'Renato C.', identifier: 'ADM-8001', role: 'admin' })
        }
      />
    );
  }

  return (
    <AdminPortal
      requests={requests}
      customers={customers}
      payments={payments}
      threads={threads}
      userLogs={userLogs}
      initialTab={adminTab || 'dashboard'}
      onUpdateOrderStatus={handleUpdateOrderStatus}
      onVerifyPayment={handleVerifyPayment}
      onRecordPayment={handleRecordPayment}
      onSendAdminReply={handleSendAdminReply}
      onCreateWalkInOrder={handleCreateWalkInOrder}
      onAddUserLog={handleAddUserLog}
      fontSizeLevel={fontSizeLevel}
      setFontSizeLevel={setFontSizeLevel}
      highContrastMode={highContrastMode}
      setHighContrastMode={setHighContrastMode}
      onLogout={() => setUser(null)}
      onSwitchToCustomerPortal={() =>
        setUser({
          name: 'Alexandrie Abon',
          identifier: 'alexandrieabon@gmail.com',
          role: 'customer',
        })
      }
    />
  );
}
