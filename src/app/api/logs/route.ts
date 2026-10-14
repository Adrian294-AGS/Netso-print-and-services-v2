import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/server/auth';
import { apiErrorResponse, ApiError } from '@/lib/server/http';
import { AuditLogModel } from '@/lib/server/mongo-models';
import { connectMongoDB } from '@/lib/server/mongodb';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    await requireSession(request, ['lead_admin']);
    await connectMongoDB();
    const rawPage = request.nextUrl.searchParams.get('page') ?? '1';
    const rawLimit = request.nextUrl.searchParams.get('limit') ?? '50';
    const page = /^\d+$/.test(rawPage) ? Number(rawPage) : 0;
    const requestedLimit = /^\d+$/.test(rawLimit) ? Number(rawLimit) : 0;
    if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(requestedLimit) || requestedLimit < 1) {
      throw new ApiError(400, 'Audit log page is invalid.');
    }
    const limit = Math.min(100, requestedLimit);
    const [docs, total] = await Promise.all([
      AuditLogModel.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      AuditLogModel.countDocuments(),
    ]);
    return NextResponse.json({
      ok: true,
      logs: docs.map((doc) => {
        const created = new Date(doc.createdAt);
        return {
          id: String(doc._id),
          timestamp: created.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }),
          date: created.toISOString().slice(0, 10),
          actorName: doc.actorName,
          actorUsername: doc.actorUsername ?? '',
          actorRole:
            doc.actorRole === 'customer' || doc.actorRole === 'Customer'
              ? 'Customer'
              : doc.actorRole === 'lead_admin' || doc.actorRole === 'Admin'
                ? 'Admin'
                : 'Operator',
          category: doc.category,
          action: doc.action,
          details: doc.details,
          targetId: doc.targetId ?? undefined,
          ipAddress: doc.ipAddress ?? '',
          device: doc.device ?? '',
          status: doc.status,
        };
      }),
      total,
      page,
      limit,
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
