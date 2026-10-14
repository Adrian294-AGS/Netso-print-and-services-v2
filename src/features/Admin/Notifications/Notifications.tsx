import React from 'react';
import {
  CustomerRecord,
  MessageThread,
  FontSizeLevel,
} from '../../../types';
import { AdminCustomersAndMessages } from '../AdminOperationsTabs';

interface NotificationsProps {
  threads: MessageThread[];
  customers: CustomerRecord[];
  selectedThreadId: string;
  onSelectThread: (id: string) => void;
  onSendAdminReply: (threadId: string, text: string) => void;
  onStartCustomerConversation: (customerId: string, text: string) => Promise<MessageThread>;
  highContrastMode: boolean;
  fontSizeLevel: FontSizeLevel;
}

export function Notifications({
  threads,
  customers,
  selectedThreadId,
  onSelectThread,
  onSendAdminReply,
  onStartCustomerConversation,
  highContrastMode,
  fontSizeLevel,
}: NotificationsProps) {
  return (
    <AdminCustomersAndMessages
      mode="messages"
      customers={customers}
      threads={threads}
      selectedThreadId={selectedThreadId}
      onSelectThread={onSelectThread}
      onSendAdminReply={onSendAdminReply}
      onStartCustomerConversation={onStartCustomerConversation}
      onSelectCustomer={() => {}}
      onOpenLogout={() => {}}
      highContrastMode={highContrastMode}
      fontSizeLevel={fontSizeLevel}
    />
  );
}

export default Notifications;
