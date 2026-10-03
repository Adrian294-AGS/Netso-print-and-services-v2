import React from 'react';
import { FontSizeLevel } from '../../../types';
import { AdminCustomersAndMessages } from '../AdminOperationsTabs';

interface AdminProfileProps {
  onOpenLogout: () => void;
  highContrastMode: boolean;
  fontSizeLevel: FontSizeLevel;
}

export function AdminProfile({
  onOpenLogout,
  highContrastMode,
  fontSizeLevel,
}: AdminProfileProps) {
  return (
    <AdminCustomersAndMessages
      mode="profile"
      customers={[]}
      threads={[]}
      selectedThreadId=""
      onSelectThread={() => {}}
      onSendAdminReply={() => {}}
      onSelectCustomer={() => {}}
      onOpenLogout={onOpenLogout}
      highContrastMode={highContrastMode}
      fontSizeLevel={fontSizeLevel}
    />
  );
}

export default AdminProfile;
