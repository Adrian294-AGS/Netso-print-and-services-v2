import React from 'react';
import {
  RequestOrder,
  PaymentTransaction,
  FontSizeLevel,
} from '../../../types';
import { AdminPaymentsTab } from '../AdminOperationsTabs';

interface PaymentManagementProps {
  requests: RequestOrder[];
  payments: PaymentTransaction[];
  onSelectOrder: (order: RequestOrder) => void;
  onReviewPayment: (paymentId: string, status: 'verified' | 'flagged') => void;
  onRecordPayment: (orderId: string, amount: number) => void;
  highContrastMode: boolean;
  fontSizeLevel: FontSizeLevel;
}

export function PaymentManagement(props: PaymentManagementProps) {
  return <AdminPaymentsTab {...props} />;
}

export default PaymentManagement;
