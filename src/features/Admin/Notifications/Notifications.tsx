import React from 'react';
import {
  CustomerRecord,
  MessageThread,
  RequestOrder,
  FontSizeLevel,
} from '../../../types';
import { AdminCustomersAndMessages } from '../AdminOperationsTabs';

interface NotificationsProps {
  threads: MessageThread[];
  customers: CustomerRecord[];
  requests: RequestOrder[];
  selectedThreadId: string;
  onSelectThread: (id: string) => void;
  onSendAdminReply: (threadId: string, text: string) => void;
  onMarkThreadRead: (threadId: string) => Promise<void>;
  onStartCustomerConversation: (customerId: string, text: string, orderId?: string) => Promise<MessageThread>;
  highContrastMode: boolean;
  fontSizeLevel: FontSizeLevel;
}

export function Notifications({
  threads,
  customers,
  requests,
  selectedThreadId,
  onSelectThread,
  onSendAdminReply,
  onMarkThreadRead,
  onStartCustomerConversation,
  highContrastMode,
  fontSizeLevel,
}: NotificationsProps) {
  return (
    <AdminCustomersAndMessages
      mode="messages"
      customers={customers}
      requests={requests}
      threads={threads}
      selectedThreadId={selectedThreadId}
      onSelectThread={onSelectThread}
      onSendAdminReply={onSendAdminReply}
      onMarkThreadRead={onMarkThreadRead}
      onStartCustomerConversation={onStartCustomerConversation}
      onSelectCustomer={() => {}}
      onOpenLogout={() => {}}
      highContrastMode={highContrastMode}
      fontSizeLevel={fontSizeLevel}
    />
  );
}

export default Notifications;
