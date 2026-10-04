import React from 'react';
import {
  CustomerRecord,
  FontSizeLevel,
} from '../../../types';
import { AdminCustomersAndMessages } from '../AdminOperationsTabs';

interface CustomerManagementProps {
  customers: CustomerRecord[];
  onSelectCustomer: (customer: CustomerRecord) => void;
  highContrastMode: boolean;
  fontSizeLevel: FontSizeLevel;
}

export function CustomerManagement({
  customers,
  onSelectCustomer,
  highContrastMode,
  fontSizeLevel,
}: CustomerManagementProps) {
  return (
    <AdminCustomersAndMessages
      mode="customers"
      customers={customers}
      threads={[]}
      selectedThreadId=""
      onSelectThread={() => {}}
      onSendAdminReply={() => {}}
      onSelectCustomer={onSelectCustomer}
      onOpenLogout={() => {}}
      highContrastMode={highContrastMode}
      fontSizeLevel={fontSizeLevel}
    />
  );
}

export default CustomerManagement;
