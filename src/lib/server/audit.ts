import 'server-only';

import type { NextRequest } from 'next/server';
import type { SessionUser } from './auth';
import { AuditLogModel } from './mongo-models';
import { connectMongoDB } from './mongodb';
import { publishRealtimeEvent } from './realtime';

interface AuditEvent {
  category: string;
  action: string;
  details?: string;
  targetId?: string;
  status?: 'Success' | 'Verified' | 'Warning' | 'Failed';
}

function displayRole(role: SessionUser['role']): string {
  if (role === 'customer') return 'Customer';
  if (role === 'lead_admin') return 'Admin';
  return 'Operator';
}

export async function recordAuditEvent(
  request: NextRequest,
  user: SessionUser,
  event: AuditEvent,
): Promise<void> {
  try {
    await connectMongoDB();
    await AuditLogModel.create({
      actorId: user.id,
      actorName: user.name,
      actorUsername: user.username,
      actorRole: displayRole(user.role),
      category: event.category,
      action: event.action,
      details: event.details ?? '',
      targetId: event.targetId ?? null,
      ipAddress:
        (request.headers.get('x-real-ip') ??
          request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
          null)?.slice(0, 45) ?? null,
      device: request.headers.get('user-agent')?.slice(0, 255) ?? null,
      status: event.status ?? 'Success',
    });
    publishRealtimeEvent({ topic: 'logs', targetRoles: ['lead_admin'] });
  } catch (error) {
    console.error('Unable to persist audit event:', error);
  }
}
