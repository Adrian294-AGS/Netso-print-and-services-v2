export type FontSizeLevel = 'reduced' | 'compact' | 'normal' | 'large' | 'xlarge';
export type FontFamilyMode = 'modern' | 'lexend';

export interface ServiceItem {
  id: string;
  name: string;
  category: 'Document' | 'Photo & ID' | 'Large Format' | 'Signage' | 'Merch & Gifts' | 'Marketing';
  iconName: string;
  basePrice: number;
  unit: string;
  description: string;
  popularFor: string;
  turnaround: string;
}

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  ext: string;
  file?: File;
  previewUrl?: string;
}

export type OrderStatus =
  | 'Unpaid Balance'
  | 'In Pre-Press'
  | 'In Production'
  | 'Ready for Pickup'
  | 'Completed'
  | 'Cancelled';

export interface RequestOrder {
  id: string;
  customerId: string;
  customerName: string;
  customerUsername: string;
  customerPhone: string;
  customerEmail: string;
  service: string;
  category: string;
  specs?: {
    paperSize?: string;
    pages?: number;
    copies?: number;
    colorMode?: 'Black & White' | 'Colored';
    finish?: string;
  };
  date: string;
  amount: number;
  paidAmount: number;
  unpaidAmount: number;
  status: OrderStatus;
  progressStage: number; // 1: Order Placed, 2: Pre-Press & Layout, 3: Printing Stage, 4: Ready for Pickup / Completed
  notes: string;
  paymentMethod?: 'GCash' | 'GCash QR' | 'Cash on Pickup';
  gcashRefNo?: string;
  paymongoId?: string;
  paidAt?: string;
  paymentVerified?: boolean;
  files: UploadedFile[];
}

export interface CustomerRecord {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  username: string;
  email: string;
  mobileNumber: string;
  street: string;
  barangay: string;
  municipality: string;
  province: string;
  zipCode: string;
  totalRequests: number;
  totalSpent: number;
  outstandingBalance: number;
  status: 'Active' | 'VIP' | 'Flagged';
  joinedDate: string;
  lastActive: string;
}

export interface PaymentTransaction {
  paymentId: string;
  id: string;
  requestId: string;
  customerName: string;
  customerPhone: string;
  amount: number;
  paymentType: 'Full Payment' | '50% Down Payment' | 'Balance Settlement';
  method: 'GCash' | 'GCash QR' | 'Cash on Pickup';
  gcashRefNo: string;
  paymongoId: string;
  date: string;
  time: string;
  status: 'Verified' | 'Pending' | 'Pending Review' | 'Flagged' | 'Failed' | 'Refunded';
  provider?: string | null;
}

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  time: string;
  isStaff: boolean;
}

export interface MessageThread {
  id: string;
  requestId: string;
  customerName: string;
  customerUsername: string;
  serviceName: string;
  status: 'UNREAD' | 'Replied' | 'Closed';
  lastUpdated: string;
  messages: ChatMessage[];
}

export type UserLogCategory =
  | 'Authentication'
  | 'Order Management'
  | 'GCash Payment'
  | 'File Artwork'
  | 'Staff Chat'
  | 'Account / System';

export interface UserLogEntry {
  id: string;
  timestamp: string;
  date: string;
  actorName: string;
  actorUsername: string;
  actorRole: 'Customer' | 'Admin' | 'Operator' | 'System';
  category: UserLogCategory;
  action: string;
  details: string;
  targetId?: string;
  ipAddress: string;
  device: string;
  status: 'Success' | 'Verified' | 'Warning';
}
