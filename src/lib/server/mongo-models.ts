import 'server-only';

import mongoose, { Schema } from 'mongoose';

const messageSchema = new Schema(
  {
    senderId: { type: String, required: true },
    senderName: { type: String, required: true, maxlength: 150 },
    senderRole: { type: String, required: true },
    text: { type: String, required: true, maxlength: 5000 },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
);

const threadSchema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    customerId: { type: String, required: true, index: true },
    status: { type: String, enum: ['UNREAD', 'Replied', 'Closed'], default: 'UNREAD' },
    messages: { type: [messageSchema], default: [] },
  },
  { timestamps: true, versionKey: false, collection: 'message_threads' },
);

threadSchema.index({ customerId: 1, updatedAt: -1 });

const auditLogSchema = new Schema(
  {
    actorId: { type: String, default: null, index: true },
    actorName: { type: String, required: true, maxlength: 150 },
    actorUsername: { type: String, default: null, maxlength: 50 },
    actorRole: { type: String, required: true, maxlength: 32 },
    category: { type: String, required: true, maxlength: 50 },
    action: { type: String, required: true, maxlength: 100 },
    details: { type: String, default: '', maxlength: 5000 },
    targetId: { type: String, default: null, maxlength: 100 },
    ipAddress: { type: String, default: null, maxlength: 45 },
    device: { type: String, default: null, maxlength: 255 },
    status: { type: String, enum: ['Success', 'Verified', 'Warning', 'Failed'], default: 'Success' },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false, collection: 'audit_logs' },
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ category: 1, createdAt: -1 });

const authLimitSchema = new Schema(
  {
    _id: { type: String, required: true },
    count: { type: Number, required: true, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { versionKey: false, collection: 'auth_rate_limits' },
);

export const MessageThreadModel =
  mongoose.models.MessageThread ?? mongoose.model('MessageThread', threadSchema);
export const AuditLogModel =
  mongoose.models.AuditLog ?? mongoose.model('AuditLog', auditLogSchema);
export const AuthLimitModel =
  mongoose.models.AuthLimit ?? mongoose.model('AuthLimit', authLimitSchema);
