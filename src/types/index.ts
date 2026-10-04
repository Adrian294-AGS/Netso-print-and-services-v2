export type Tab =
  | 'dashboard'
  | 'services'
  | 'requests'
  | 'messages'
  | 'payments'
  | 'profile';

export type RequestStatus =
  | 'Pending'
  | 'Confirmed'
  | 'Printing'
  | 'Ready'
  | 'Completed'
  | 'Cancelled';

export type PaymentType = 'Full Payment' | '50% Deposit';

export interface Service {
  id: number;
  name: string;
  description: string;
  price: number;
  icon: string;
}

export interface PrintRequest {
  id: string;
  service: string;
  description: string;
  amount: number;
  paid: number;
  balance: number;
  status: RequestStatus;
  date: string;
  quantity: number;
}

export interface Message {
  id: number;
  sender: 'customer' | 'staff';
  message: string;
  time: string;
}

export * from './portal';

export interface StaffMember {
  id: string;
  name: string;
  username: string;
  role: 'Lead Admin' | 'Print Operator' | 'Pre-Press Artist' | 'Front Desk & Cashier';
  email: string;
  phone: string;
  shift: string;
  status: 'Online' | 'In Production' | 'Off Duty';
  assignedJobs: number;
  completedToday: number;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'order' | 'payment' | 'chat' | 'system';
  unread: boolean;
  targetId?: string;
}
