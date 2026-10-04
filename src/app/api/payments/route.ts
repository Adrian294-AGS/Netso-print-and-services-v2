import { INITIAL_PAYMENTS } from '../../../data/mockPortalData';
import { PaymentTransaction } from '../../../types/portal';

let paymentsStore: PaymentTransaction[] = [...INITIAL_PAYMENTS];

export async function GET() {
  return Response.json({
    ok: true,
    payments: paymentsStore,
    total: paymentsStore.length,
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const newTxn: PaymentTransaction = {
    id: body.id || `TXN-${Math.floor(8802 + Math.random() * 999)}`,
    requestId: body.requestId || 'NETSO-90105',
    customerName: body.customerName || 'Alexandrie Abon',
    customerPhone: body.customerPhone || '0917 123 4567',
    amount: Number(body.amount) || 0,
    paymentType: body.paymentType || 'Full Payment',
    method: 'GCash',
    gcashRefNo:
      body.gcashRefNo ||
      `GC-${Math.floor(1000 + Math.random() * 8999)}-${Math.floor(1000 + Math.random() * 8999)}-99`,
    paymongoId: body.paymongoId || `pay_${Math.random().toString(36).slice(2, 12)}`,
    date: new Date().toISOString().split('T')[0],
    time: 'Just now',
    status: body.status || 'Verified',
  };

  paymentsStore = [newTxn, ...paymentsStore];
  return Response.json({ ok: true, payment: newTxn }, { status: 201 });
}
