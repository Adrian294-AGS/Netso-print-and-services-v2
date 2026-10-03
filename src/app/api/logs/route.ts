import { INITIAL_USER_LOGS } from '../../../data/mockPortalData';
import { UserLogEntry } from '../../../types/portal';

let logsStore: UserLogEntry[] = [...INITIAL_USER_LOGS];

export async function GET() {
  return Response.json({
    ok: true,
    logs: logsStore,
    total: logsStore.length,
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const now = new Date();
  const newLog: UserLogEntry = {
    id: `LOG-${Math.floor(5013 + Math.random() * 4900)}`,
    timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    date: now.toISOString().split('T')[0],
    actorName: body.actorName || 'Portal User',
    actorUsername: body.actorUsername || 'portal_user',
    actorRole: body.actorRole || 'Customer',
    category: body.category || 'Authentication',
    action: body.action || 'Logged Portal Event',
    details: body.details || '',
    targetId: body.targetId,
    ipAddress: body.ipAddress || '112.198.44.102',
    device: body.device || 'Next.js Web Portal · Santiago City',
    status: body.status || 'Verified',
  };

  logsStore = [newLog, ...logsStore];
  return Response.json({ ok: true, log: newLog }, { status: 201 });
}
