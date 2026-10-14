'use client';

import React, { useEffect, useRef, useState } from 'react';
import type {
  RequestOrder,
  OrderStatus,
  CustomerRecord,
  PaymentTransaction,
  MessageThread,
  UserLogEntry,
  FontSizeLevel,
} from './types/portal';
import type { AuthenticatedUser } from './features/Authentication/Authentication';
import { AdminPortal } from './features/Admin/AdminPortal';
import { CustomerPortal } from './features/Customer/CustomerPortal';
import Authentication from './features/Authentication/Authentication';

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

type ApiResult<T> = { ok: boolean; error?: string } & T;
type RealtimeTopic = 'orders' | 'payments' | 'messages' | 'services' | 'logs';
type RealtimeNotification = {
  id: string;
  time: string;
  text: string;
  unread: boolean;
};

async function apiRequest<T>(url: string, options?: RequestInit): Promise<ApiResult<T>> {
  const response = await fetch(url, {
    ...options,
    credentials: 'same-origin',
    headers: {
      ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
      ...options?.headers,
    },
  });
  const result = (await response.json()) as ApiResult<T>;
  if (!response.ok || !result.ok) throw new Error(result.error || 'The request could not be completed.');
  return result;
}

export default function App({ customerTab, adminTab }: AppProps = {}) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [fontSizeLevel, setFontSizeLevel] = useState<FontSizeLevel>('large');
  const [highContrastMode, setHighContrastMode] = useState(false);
  const [requests, setRequests] = useState<RequestOrder[]>([]);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [userLogs, setUserLogs] = useState<UserLogEntry[]>([]);
  const [userLogsTotal, setUserLogsTotal] = useState(0);
  const [userLogsPage, setUserLogsPage] = useState(1);
  const [userLogsLoading, setUserLogsLoading] = useState(false);
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);
  const [liveNotice, setLiveNotice] = useState('');
  const [serviceRevision, setServiceRevision] = useState(0);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadAuditLogs = async (page: number) => {
    setUserLogsLoading(true);
    try {
      const result = await apiRequest<{
        logs: UserLogEntry[];
        total: number;
        page: number;
      }>(`/api/logs?page=${page}&limit=50`);
      setUserLogs(result.logs);
      setUserLogsTotal(result.total);
      setUserLogsPage(result.page);
    } finally {
      setUserLogsLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    void apiRequest<{ user: AuthenticatedUser | null }>('/api/auth/me')
      .then(({ user: currentUser }) => {
        if (active) setUser(currentUser);
      })
      .catch((error: unknown) => {
        console.error('Unable to restore session:', error);
      })
      .finally(() => {
        if (active) setAuthChecked(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const load = async () => {
      try {
        const ordersResult = await apiRequest<{ orders: RequestOrder[] }>('/api/orders');
        if (!active) return;
        setRequests(ordersResult.orders);

        if (user.role === 'admin' || user.role === 'staff') {
          const canReviewPayments =
            user.staffRole === 'lead_admin' || user.staffRole === 'front_desk_cashier';
          const [paymentResult, threadResult, customerResult] = await Promise.all([
            canReviewPayments
              ? apiRequest<{ payments: PaymentTransaction[] }>('/api/payments')
              : Promise.resolve({ ok: true, payments: [] as PaymentTransaction[] }),
            apiRequest<{ threads: MessageThread[] }>('/api/messages'),
            user.role === 'admin'
              ? apiRequest<{ customers: CustomerRecord[] }>('/api/customers')
              : Promise.resolve({ ok: true, customers: [] as CustomerRecord[] }),
          ]);
          if (!active) return;
          setPayments(paymentResult.payments);
          setThreads(threadResult.threads);
          setCustomers(customerResult.customers);
          if (user.staffRole === 'lead_admin') {
            await loadAuditLogs(1);
          }
        }
      } catch (error) {
        console.error('Unable to load persistent portal data:', error);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let disposed = false;
    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectDelay = 1000;

    const refreshForEvent = async (topic: RealtimeTopic) => {
      try {
        const tasks: Promise<void>[] = [];
        if (topic !== 'logs') {
          tasks.push(
            apiRequest<{ orders: RequestOrder[] }>('/api/orders').then(({ orders: next }) => {
              setRequests(next);
            }),
          );
        }
        if (user.staffRole === 'lead_admin' && topic === 'logs') {
          tasks.push(loadAuditLogs(1));
        }
        if (
          (user.staffRole === 'lead_admin' || user.staffRole === 'front_desk_cashier') &&
          (topic === 'payments' || topic === 'orders')
        ) {
          tasks.push(
            apiRequest<{ payments: PaymentTransaction[] }>('/api/payments').then(({ payments: next }) => {
              setPayments(next);
            }),
          );
        }
        if (user.role !== 'customer' && (topic === 'messages' || topic === 'orders')) {
          tasks.push(
            apiRequest<{ threads: MessageThread[] }>('/api/messages').then(({ threads: next }) => {
              setThreads(next);
            }),
          );
        }
        if (user.role === 'admin' && topic === 'services') {
          tasks.push(
            apiRequest<{ customers: CustomerRecord[] }>('/api/customers').then(({ customers: next }) => {
              setCustomers(next);
            }),
          );
        }
        await Promise.all(tasks);
      } catch (error) {
        console.error(`Unable to refresh ${topic} after realtime event:`, error);
      }
    };

    const connect = () => {
      if (disposed) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      socket = new WebSocket(`${protocol}//${window.location.host}/realtime`);
      socket.onopen = () => {
        reconnectDelay = 1000;
        void refreshForEvent('orders');
        if (user.role !== 'customer') void refreshForEvent('messages');
        if (user.staffRole === 'lead_admin' || user.staffRole === 'front_desk_cashier') {
          void refreshForEvent('payments');
        }
      };
      socket.onmessage = (message) => {
        let event: {
          type?: string;
          topic?: RealtimeTopic;
          notification?: { text: string; category: string };
        };
        try {
          event = JSON.parse(String(message.data));
        } catch (error) {
          console.error('Received an invalid realtime event:', error);
          return;
        }
        if (
          event.type !== 'invalidate' ||
          !event.topic ||
          !['orders', 'payments', 'messages', 'services', 'logs'].includes(event.topic)
        ) {
          return;
        }
        void refreshForEvent(event.topic);
        if (event.topic === 'services') setServiceRevision((revision) => revision + 1);
        if (event.notification?.text) {
          const notification = {
            id: `${Date.now()}-${Math.random()}`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            text: event.notification.text,
            unread: true,
          };
          setNotifications((current) => [notification, ...current].slice(0, 50));
          setLiveNotice(event.notification.text);
          if (noticeTimer.current) clearTimeout(noticeTimer.current);
          noticeTimer.current = setTimeout(() => setLiveNotice(''), 5000);
        }
      };
      socket.onclose = () => {
        if (disposed) return;
        reconnectTimer = setTimeout(connect, reconnectDelay);
        reconnectDelay = Math.min(reconnectDelay * 2, 30000);
      };
      socket.onerror = () => socket?.close();
    };

    connect();
    return () => {
      disposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
      socket?.close();
    };
  }, [user]);

  const refreshOrders = async () => {
    const result = await apiRequest<{ orders: RequestOrder[] }>('/api/orders');
    setRequests(result.orders);
  };

  const handleUserLogsPageChange = (page: number) => {
    void loadAuditLogs(page).catch((error: unknown) => {
      console.error('Unable to load audit log page:', error);
      window.alert(error instanceof Error ? error.message : 'Unable to load audit logs.');
    });
  };

  const handleUpdateOrderStatus = async (
    orderId: string,
    newStatus: OrderStatus,
    newStage: number,
    adminNote?: string,
  ) => {
    try {
      await apiRequest('/api/orders', {
        method: 'PATCH',
        body: JSON.stringify({ orderId, status: newStatus, progressStage: newStage, adminNote }),
      });
      await refreshOrders();
    } catch (error) {
      console.error('Unable to update order status:', error);
      window.alert(
        error instanceof Error ? error.message : 'Unable to update the order status.',
      );
    }
  };

  const handleReviewPayment = async (
    paymentId: string,
    status: 'verified' | 'flagged',
  ) => {
    try {
      await apiRequest('/api/payments', {
        method: 'PATCH',
        body: JSON.stringify({ paymentId, status }),
      });
      await Promise.all([refreshOrders(), refreshPayments()]);
    } catch (error) {
      console.error('Unable to review payment transaction:', error);
      window.alert(error instanceof Error ? error.message : 'Unable to review this payment.');
    }
  };

  const refreshPayments = async () => {
    const result = await apiRequest<{ payments: PaymentTransaction[] }>('/api/payments');
    setPayments(result.payments);
  };

  const handleRecordPayment = async (orderId: string, amount: number) => {
    try {
      await apiRequest('/api/payments', {
        method: 'POST',
        body: JSON.stringify({
          requestId: orderId,
          amount,
          paymentType: 'Balance Settlement',
          method: 'Cash on Pickup',
        }),
      });
      await Promise.all([refreshOrders(), refreshPayments()]);
    } catch (error) {
      console.error('Unable to record payment:', error);
      window.alert(error instanceof Error ? error.message : 'Unable to record this payment.');
    }
  };

  const handleSendAdminReply = async (threadId: string, text: string) => {
    const targetThread = threads.find((thread) => thread.id === threadId);
    if (!targetThread) return;
    try {
      await apiRequest('/api/messages', {
        method: 'POST',
        body: JSON.stringify({ orderId: targetThread.requestId, text }),
      });
      const result = await apiRequest<{ threads: MessageThread[] }>('/api/messages');
      setThreads(result.threads);
    } catch (error) {
      console.error('Unable to send staff reply:', error);
    }
  };

  const handleCreateWalkInOrder = async (
    customerName: string,
    customerPhone: string,
    service: string,
    amount: number,
    paidAmount: number,
    notes: string,
  ) => {
    try {
      await apiRequest('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          walkIn: true,
          customerName,
          customerPhone,
          service: service.replace(/\s*\([^)]*\)\s*$/, ''),
          amount,
          paidAmount,
          notes,
        }),
      });
      await Promise.all([refreshOrders(), refreshPayments()]);
    } catch (error) {
      console.error('Unable to create walk-in order:', error);
    }
  };

  const handleAuthenticated = (authenticatedUser: AuthenticatedUser) => {
    setNotifications([]);
    setUser(authenticatedUser);
  };

  const handleLogout = () => {
    void apiRequest('/api/auth/logout', { method: 'POST' })
      .catch((error: unknown) => console.error('Unable to end session:', error))
      .finally(() => {
        setUser(null);
        setRequests([]);
        setPayments([]);
        setCustomers([]);
        setThreads([]);
        setUserLogs([]);
        setUserLogsTotal(0);
        setUserLogsPage(1);
        setNotifications([]);
      });
  };

  if (!authChecked) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-neutral-950 text-neutral-200">
        Checking your secure session…
      </main>
    );
  }

  if (!user) return <Authentication onAuthenticated={handleAuthenticated} />;

  if (user.role === 'customer') {
    return (
      <>
        {liveNotice && <RealtimeToast message={liveNotice} onClose={() => setLiveNotice('')} />}
        <CustomerPortal
          currentUser={{
            id: user.id,
            name: user.name,
            username: user.username ?? user.identifier.split('@')[0] ?? user.identifier,
            email: user.identifier,
          }}
          initialTab={customerTab || 'dashboard'}
          serviceRevision={serviceRevision}
          requests={requests}
          setRequests={setRequests}
          fontSizeLevel={fontSizeLevel}
          setFontSizeLevel={setFontSizeLevel}
          highContrastMode={highContrastMode}
          setHighContrastMode={setHighContrastMode}
          onLogout={handleLogout}
        />
      </>
    );
  }

  return (
    <>
      {liveNotice && <RealtimeToast message={liveNotice} onClose={() => setLiveNotice('')} />}
      <AdminPortal
        currentUser={user}
        requests={requests}
        customers={customers}
        payments={payments}
        threads={threads}
        userLogs={userLogs}
        userLogsTotal={userLogsTotal}
        userLogsPage={userLogsPage}
        userLogsLoading={userLogsLoading}
        onUserLogsPageChange={handleUserLogsPageChange}
        notifications={notifications}
        setNotifications={setNotifications}
        initialTab={adminTab || 'dashboard'}
        onUpdateOrderStatus={handleUpdateOrderStatus}
        onReviewPayment={handleReviewPayment}
        onRecordPayment={handleRecordPayment}
        onSendAdminReply={handleSendAdminReply}
        onCreateWalkInOrder={handleCreateWalkInOrder}
        fontSizeLevel={fontSizeLevel}
        setFontSizeLevel={setFontSizeLevel}
        highContrastMode={highContrastMode}
        setHighContrastMode={setHighContrastMode}
        onLogout={handleLogout}
      />
    </>
  );
}

function RealtimeToast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div role="status" className="fixed right-4 top-4 z-[100] flex max-w-sm items-start gap-3 rounded-xl border border-amber-400 bg-neutral-950 px-4 py-3 text-sm font-semibold text-white shadow-2xl">
      <span>{message}</span>
      <button type="button" onClick={onClose} className="shrink-0 text-amber-300" aria-label="Dismiss notification">
        ×
      </button>
    </div>
  );
}
