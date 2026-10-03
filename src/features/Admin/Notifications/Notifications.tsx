import React from 'react';
import {
  MessageThread,
  FontSizeLevel,
} from '../../../types';
import { AdminCustomersAndMessages } from '../AdminOperationsTabs';

interface NotificationsProps {
  threads: MessageThread[];
  selectedThreadId: string;
  onSelectThread: (id: string) => void;
  onSendAdminReply: (threadId: string, text: string) => void;
  highContrastMode: boolean;
  fontSizeLevel: FontSizeLevel;
}

export function Notifications({
  threads,
  selectedThreadId,
  onSelectThread,
  onSendAdminReply,
  highContrastMode,
  fontSizeLevel,
}: NotificationsProps) {
  return (
    <AdminCustomersAndMessages
      mode="messages"
      customers={[]}
      threads={threads}
      selectedThreadId={selectedThreadId}
      onSelectThread={onSelectThread}
      onSendAdminReply={onSendAdminReply}
      onSelectCustomer={() => {}}
      onOpenLogout={() => {}}
      highContrastMode={highContrastMode}
      fontSizeLevel={fontSizeLevel}
    />
  );
}

export default Notifications;
