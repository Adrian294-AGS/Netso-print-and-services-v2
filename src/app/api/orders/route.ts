import { INITIAL_REQUESTS } from '../../../data/mockPortalData';
import { RequestOrder, OrderStatus } from '../../../types/portal';

let ordersStore: RequestOrder[] = [...INITIAL_REQUESTS];

export async function GET() {
  return Response.json({
    ok: true,
    orders: ordersStore,
    total: ordersStore.length,
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const newOrder: RequestOrder = {
    id: body.id || `NETSO-${Math.floor(90105 + Math.random() * 899)}`,
    customerId: body.customerId || 'NET-9091',
    customerName: body.customerName || 'Walk-In Client',
    customerUsername: body.customerUsername || 'walk_in',
    customerPhone: body.customerPhone || '0917 000 0000',
    customerEmail: body.customerEmail || 'client@netsoprints.com',
    service: body.service || 'Tarpaulin Banner',
    category: body.category || 'Large Format',
    date: new Date().toISOString().split('T')[0],
    amount: Number(body.amount) || 0,
    paidAmount: Number(body.paidAmount) || 0,
    unpaidAmount: Math.max(0, (Number(body.amount) || 0) - (Number(body.paidAmount) || 0)),
    status: (body.status as OrderStatus) || 'Unpaid Balance',
    progressStage: Number(body.progressStage) || 1,
    notes: body.notes || '',
    paymentMethod: 'GCash',
    gcashRefNo: body.gcashRefNo,
    paymentVerified: Boolean(body.paymentVerified),
    files: Array.isArray(body.files) ? body.files : [],
  };

  ordersStore = [newOrder, ...ordersStore];
  return Response.json({ ok: true, order: newOrder }, { status: 201 });
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const { orderId, status, progressStage, adminNote } = body;

  ordersStore = ordersStore.map((ord) => {
    if (ord.id === orderId) {
      return {
        ...ord,
        status: (status as OrderStatus) || ord.status,
        progressStage: typeof progressStage === 'number' ? progressStage : ord.progressStage,
        notes: adminNote ? `${ord.notes} [Admin Note: ${adminNote}]` : ord.notes,
      };
    }
    return ord;
  });

  const updated = ordersStore.find((o) => o.id === orderId) || null;
  return Response.json({ ok: true, order: updated });
}
