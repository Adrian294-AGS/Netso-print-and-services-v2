import 'server-only';

export type RealtimeTopic = 'orders' | 'payments' | 'messages' | 'services' | 'logs';

export interface RealtimeEvent {
  topic: RealtimeTopic;
  orderId?: string;
  targetUserIds?: string[];
  targetRoles?: string[];
  notification?: {
    text: string;
    category: 'Order' | 'Payment' | 'Message' | 'Service';
  };
}

declare global {
  var __NETSO_REALTIME_PUBLISH__: ((event: RealtimeEvent) => void) | undefined;
}

export function publishRealtimeEvent(event: RealtimeEvent): void {
  globalThis.__NETSO_REALTIME_PUBLISH__?.(event);
}
