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
  onVerifyPayment: (orderId: string) => void;
  onRecordPayment: (orderId: string, amount: number) => void;
  highContrastMode: boolean;
  fontSizeLevel: FontSizeLevel;
}

export function PaymentManagement(props: PaymentManagementProps) {
  return <AdminPaymentsTab {...props} />;
}

export default PaymentManagement;
