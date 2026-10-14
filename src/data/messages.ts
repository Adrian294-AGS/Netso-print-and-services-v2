import { INITIAL_THREADS } from './mockPortalData';
import { Message, MessageThread, ChatMessage } from '../types';

export const messages: Message[] = [
  {
    id: 1,
    sender: 'staff',
    message:
      'Hello Your Tarpaulin service request (NETSO-90103) has been confirmed and is currently being processed by our staff.',
    time: '10:15 AM',
  },
  {
    id: 2,
    sender: 'customer',
    message: 'Great! Can I pay the remaining ₱288 balance directly via GCash right now?',
    time: '10:18 AM',
  },
  {
    id: 3,
    sender: 'staff',
    message:
      'Yes, absolutely! Click "Pay via GCash" on your dashboard or request card anytime to settle it.',
    time: '10:20 AM',
  },
];

export const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-1',
    sender: 'NETSO Staff',
    text: 'Hello Alexandrie! Your Tarpaulin service request (NETSO-90103) has been confirmed and is currently being processed by our staff.',
    time: '10:15 AM',
    isStaff: true,
  },
  {
    id: 'msg-2',
    sender: 'You',
    text: 'Great! Can I pay the remaining ₱288 balance directly via GCash right now?',
    time: '10:18 AM',
    isStaff: false,
  },
  {
    id: 'msg-3',
    sender: 'NETSO Staff',
    text: 'Yes, absolutely! Click "Pay via GCash" on your dashboard or order card anytime to settle it.',
    time: '10:20 AM',
    isStaff: true,
  },
];

export const MESSAGE_THREADS: MessageThread[] = INITIAL_THREADS;
