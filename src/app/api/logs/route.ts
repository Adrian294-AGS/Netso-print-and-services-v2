import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSession } from '@/lib/server/auth';
import { apiErrorResponse, ApiError, assertSameOrigin, readJson } from '@/lib/server/http';
import { AuditLogModel } from '@/lib/server/mongo-models';
import { connectMongoDB } from '@/lib/server/mongodb';

export const runtime = 'nodejs';

const logSchema = z.object({
  category: z.string().trim().min(1).max(50),
  action: z.string().trim().min(1).max(100),
  details: z.string().trim().max(5000).default(''),
  targetId: z.string().trim().max(100).optional(),
});

export async function GET(request: NextRequest) {
  try {
    await requireSession(request, ['lead_admin']);
    await connectMongoDB();
    const page = Math.max(1, Number(request.nextUrl.searchParams.get('page') || 1));
    const limit = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get('limit') || 50)));
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
          actorRole: doc.actorRole,
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

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const user = await requireSession(request);
    const parsed = logSchema.safeParse(await readJson(request));
    if (!parsed.success) throw new ApiError(400, 'Audit log entry is invalid.');
    await connectMongoDB();
    const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    const ip = request.headers.get('x-real-ip') ?? forwardedFor ?? null;
    const document = await AuditLogModel.create({
      actorId: user.id,
      actorName: user.name,
      actorUsername: user.username,
      actorRole: user.role,
      category: parsed.data.category,
      action: parsed.data.action,
      details: parsed.data.details,
      targetId: parsed.data.targetId ?? null,
      ipAddress: ip?.slice(0, 45) ?? null,
      device: request.headers.get('user-agent')?.slice(0, 255) ?? null,
      status: 'Success',
    });
    return NextResponse.json({ ok: true, id: String(document._id) }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
