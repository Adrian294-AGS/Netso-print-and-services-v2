'use client';

import React, { useState, useMemo, useRef } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Printer,
  Copy,
  UserCheck,
  Sticker,
  Image,
  CreditCard,
  Layers,
  Coffee,
  FileText,
  PlusCircle,
  User,
  MessageSquare,
  Sparkles,
  X,
  Search,
  LayoutGrid,
  Wallet,
  Check,
  Loader2,
  Upload,
  Trash2,
  LogOut,
  Lock,
  ShieldCheck,
  Paperclip,
  ArrowRight,
  Receipt,
  Download,
} from 'lucide-react';
import {
  RequestOrder,
  UploadedFile,
  FontSizeLevel,
} from '../../types/portal';
import { Header } from '../../components/Header';
import { Sidebar } from '../../components/Sidebar';

export type { FontSizeLevel } from '../../types/portal';
type CustomerTabId = 'dashboard' | 'services' | 'requests' | 'payments' | 'messages' | 'profile';

export interface CustomerServiceItem {
  id: string;
  name: string;
  category: 'Document' | 'Photo & ID' | 'Large Format' | 'Signage' | 'Merch & Gifts' | 'Marketing';
  icon: LucideIcon;
  basePrice: number;
  unit: string;
  description: string;
  popularFor: string;
  turnaround: string;
  available?: boolean;
}

const SERVICES_LIST: CustomerServiceItem[] = [
  {
    id: 'tarpaulin',
    name: 'Tarpaulin Banner',
    category: 'Large Format',
    icon: FileText,
    basePrice: 18,
    unit: 'per sq.ft',
    description:
      'Heavy-duty outdoor event banners, birthday backdrops & billboard prints with metal eyelets.',
    popularFor: 'Events & Business Signs',
    turnaround: 'Same Day',
  },
  {
    id: 'sticker',
    name: 'Sticker Printing & Decals',
    category: 'Large Format',
    icon: Sticker,
    basePrice: 25,
    unit: 'per sq.ft',
    description:
      'Waterproof vinyl, glossy/matte die-cut labels for product packaging, bottles & vehicles.',
    popularFor: 'Products & Branding',
    turnaround: '24 Hours',
  },
  {
    id: 'rush-id',
    name: 'Rush ID Photos',
    category: 'Photo & ID',
    icon: UserCheck,
    basePrice: 80,
    unit: 'per set (6pcs)',
    description:
      'Package includes 1x1, 2x2 & Passport size photos with formal attire edit & digital copy.',
    popularFor: 'Students & Applicants',
    turnaround: '15 Minutes',
  },
  {
    id: 'sintra',
    name: 'Sintra Board Signages',
    category: 'Signage',
    icon: Layers,
    basePrice: 120,
    unit: 'per sq.ft',
    description:
      '3mm / 5mm rigid waterproof board mounting for menu boards, exhibits & wall decor.',
    popularFor: 'Stores & Restaurants',
    turnaround: '1-2 Days',
  },
  {
    id: 'print',
    name: 'Doc Printing & Xerox',
    category: 'Document',
    icon: Printer,
    basePrice: 2,
    unit: 'per page',
    description:
      'High-speed black & white and full-color document printing for thesis, reports & legal forms.',
    popularFor: 'Students & Offices',
    turnaround: 'Instant',
  },
  {
    id: 'photo',
    name: 'Photo Printing',
    category: 'Photo & ID',
    icon: Image,
    basePrice: 15,
    unit: 'per photo',
    description:
      'Premium glossy or satin photo printouts in 4R, 5R, 8R, A4, and poster sizes.',
    popularFor: 'Memories & Framing',
    turnaround: 'Same Day',
  },
  {
    id: 'pvc-lamination',
    name: 'PVC Cards & Lamination',
    category: 'Photo & ID',
    icon: CreditCard,
    basePrice: 50,
    unit: 'per piece',
    description:
      'Durable plastic school/company IDs, membership cards, and hot pouch paper lamination.',
    popularFor: 'Schools & Corporate',
    turnaround: '24 Hours',
  },
  {
    id: 'mugs',
    name: 'Sublimation Mugs & Giveaways',
    category: 'Merch & Gifts',
    icon: Coffee,
    basePrice: 150,
    unit: 'per mug',
    description:
      'Personalized ceramic white mugs, magic heat-change mugs, and tumblers with custom artwork.',
    popularFor: 'Gifts & Souvenirs',
    turnaround: '1-2 Days',
  },
  {
    id: 'flyers',
    name: 'Flyers & Marketing Brochures',
    category: 'Marketing',
    icon: Copy,
    basePrice: 8,
    unit: 'per piece',
    description:
      'Full-color promotional flyers, bi-fold/tri-fold brochures on glossy art paper.',
    popularFor: 'Promotions & Campaign',
    turnaround: '1-2 Days',
  },
];

const ACCEPTED_EXTENSIONS = ['pdf', 'png', 'jpg', 'jpeg', 'ai', 'psd'];
const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg'];
const MAX_FILE_SIZE_MB = 100;

const getExtension = (fileName: string) => (fileName.split('.').pop() || '').toLowerCase();

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

interface FileUploaderProps {
  files: UploadedFile[];
  onChange: (files: UploadedFile[]) => void;
  theme?: 'light' | 'dark';
  fontSizeLevel?: FontSizeLevel;
}

function FileUploader({ files, onChange, theme = 'light' }: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const isDark = theme === 'dark';

  const addFiles = (incoming: File[]) => {
    const accepted: UploadedFile[] = [];
    const rejected: string[] = [];

    incoming.forEach((file) => {
      const ext = getExtension(file.name);
      const isDuplicate = [...files, ...accepted].some(
        (f) => f.name === file.name && f.size === file.size
      );

      if (!ACCEPTED_EXTENSIONS.includes(ext)) {
        rejected.push(`${file.name} — unsupported file type`);
      } else if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        rejected.push(`${file.name} — larger than ${MAX_FILE_SIZE_MB} MB`);
      } else if (isDuplicate) {
        rejected.push(`${file.name} — already added`);
      } else {
        accepted.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: file.name,
          size: file.size,
          ext,
          file,
          previewUrl: IMAGE_EXTENSIONS.includes(ext) ? URL.createObjectURL(file) : undefined,
        });
      }
    });

    setErrors(rejected);
    if (accepted.length > 0) onChange([...files, ...accepted]);
  };

  const removeFile = (id: string) => {
    const target = files.find((f) => f.id === id);
    if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
    setErrors([]);
    onChange(files.filter((f) => f.id !== id));
  };

  const openPicker = () => inputRef.current?.click();

  const zoneClass = isDark
    ? isDragging
      ? 'border-yellow-400 bg-yellow-400/15'
      : 'border-[#D4A017]/80 bg-[#050C1A] hover:border-yellow-400 hover:bg-[#09152B]'
    : isDragging
    ? 'border-[#B8860B] bg-[#FFF3C4]'
    : 'border-zinc-400 bg-[#FFFDF7] hover:border-[#B8860B] hover:bg-amber-50/60';

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        onClick={openPicker}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openPicker();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          addFiles(Array.from(e.dataTransfer.files));
        }}
        className={`cursor-pointer rounded-2xl border-2 border-dashed px-4 py-6 text-center transition-all min-h-[140px] flex flex-col items-center justify-center ${zoneClass}`}
      >
        <div
          className={`w-11 h-11 rounded-full flex items-center justify-center mb-2 ${
            isDark ? 'bg-amber-500/20 text-yellow-400' : 'bg-amber-100 text-[#B8860B]'
          }`}
        >
          <Upload className="w-5 h-5" />
        </div>
        <p className={`font-extrabold text-sm sm:text-base ${isDark ? 'text-white' : 'text-zinc-900'}`}>
          Drag &amp; drop design files or tap to browse
        </p>
        <span
          className={`font-bold underline text-xs sm:text-sm mt-0.5 ${
            isDark ? 'text-yellow-400' : 'text-[#B8860B]'
          }`}
        >
          Choose from device
        </span>
        <p className={`mt-1.5 text-xs font-medium ${isDark ? 'text-zinc-300' : 'text-zinc-500'}`}>
          PDF, PNG, JPG, AI, PSD · Up to {MAX_FILE_SIZE_MB} MB · Multiple files
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_EXTENSIONS.map((ext) => `.${ext}`).join(',')}
        className="hidden"
        onChange={(e) => {
          addFiles(Array.from(e.target.files || []));
          e.target.value = '';
        }}
      />

      {errors.length > 0 && (
        <div className="rounded-xl border-2 p-3 text-xs sm:text-sm font-semibold bg-red-50 border-red-400 text-red-900">
          {errors.map((msg, i) => (
            <div key={i}>{msg}</div>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((f) => (
            <li
              key={f.id}
              className={`flex items-center gap-3 rounded-xl border p-3 ${
                isDark
                  ? 'bg-[#0B1A33] border-blue-600/80 text-white'
                  : 'bg-white border-zinc-300 text-zinc-900'
              }`}
            >
              <FileText className="w-5 h-5 text-[#D4A017] shrink-0" />
              <div className="min-w-0 flex-1 text-left">
                <p className="font-bold truncate text-sm">{f.name}</p>
                <p className="text-xs opacity-75">
                  {f.ext.toUpperCase()} · {formatBytes(f.size)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeFile(f.id)}
                className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export interface CustomerPortalProps {
  currentUser: { id: string; name: string; username: string; email: string };
  serviceRevision?: number;
  messageRevision?: number;
  initialTab?: 'dashboard' | 'services' | 'requests' | 'payments' | 'messages' | 'profile';
  fontSizeLevel?: FontSizeLevel;
  setFontSizeLevel?: React.Dispatch<React.SetStateAction<FontSizeLevel>> | ((level: FontSizeLevel) => void);
  highContrastMode?: boolean;
  setHighContrastMode?: React.Dispatch<React.SetStateAction<boolean>> | ((val: boolean) => void);
  onLogout: () => void;
  requests: RequestOrder[];
  setRequests: React.Dispatch<React.SetStateAction<RequestOrder[]>>;
  onSwitchToAdminPortal?: () => void;
}

export function CustomerPortal({
  currentUser,
  serviceRevision = 0,
  messageRevision = 0,
  initialTab = 'dashboard',
  fontSizeLevel = 'large',
  highContrastMode = false,
  onLogout,
  requests: externalRequests,
  setRequests: externalSetRequests,
}: CustomerPortalProps) {
  const requests = externalRequests;
  const setRequests = externalSetRequests;

  const displayUserName = currentUser.name || currentUser.username || currentUser.email;
  const [serviceCatalog, setServiceCatalog] = useState<CustomerServiceItem[]>([]);
  const [activeTab, setActiveTab] = useState<CustomerTabId>(initialTab);
  const [requestStatusFilter, setRequestStatusFilter] = useState('All');
  const [deletingRequestId, setDeletingRequestId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedOrderForReceipt, setSelectedOrderForReceipt] = useState<RequestOrder | null>(null);
  const [receiptDownloaded, setReceiptDownloaded] = useState(false);

  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupFirstName, setSignupFirstName] = useState('');
  const [signupLastName, setSignupLastName] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupMobile, setSignupMobile] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [sessionUserName, setSessionUserName] = useState<string>('');

  // New Print Order Modal state
  const [isNewRequestModalOpen, setIsNewRequestModalOpen] = useState(false);
  const [selectedServiceForRequest, setSelectedServiceForRequest] =
    useState<CustomerServiceItem | null>(null);
  const [requestQty, setRequestQty] = useState<number>(1);
  const [requestFileType, setRequestFileType] = useState<string>(
    'I have ready-to-print artwork file (PDF/PNG)'
  );
  const [requestFiles, setRequestFiles] = useState<UploadedFile[]>([]);
  const [requestNotes, setRequestNotes] = useState<string>('');
  const [requestPaymentMethod, setRequestPaymentMethod] =
    useState<'GCash' | 'Cash on Pickup'>('Cash on Pickup');
  const [gcashEnabled, setGCashEnabled] = useState(false);

  // PayMongo-hosted GCash checkout state
  const [isGCashPaymentOpen, setIsGCashPaymentOpen] = useState(false);
  const [targetOrderForPayment, setTargetOrderForPayment] = useState<RequestOrder | null>(null);
  const [paymentStep, setPaymentStep] = useState<
    'upload' | 'select' | 'redirecting'
  >('select');
  const [paymentAmountType, setPaymentAmountType] = useState<'full' | 'downpayment'>('full');

  const [messageState, setMessageState] = useState<{
    orderId: string;
    messages: Array<{ sender: string; text: string; time: string; isStaff: boolean }>;
  }>({ orderId: '', messages: [] });
  const [newMessageInput, setNewMessageInput] = useState('');

  const customerRequests = useMemo(
    () =>
      requests.filter(
        (request) =>
          request.customerId === currentUser.id ||
          request.customerUsername === currentUser.username
      ),
    [requests, currentUser.id, currentUser.username]
  );
  const filteredCustomerRequests = useMemo(
    () =>
      requestStatusFilter === 'All'
        ? customerRequests
        : customerRequests.filter((request) => request.status === requestStatusFilter),
    [customerRequests, requestStatusFilter],
  );
  const messageOrderId = customerRequests[0]?.id || '';
  const messages = messageState.orderId === messageOrderId ? messageState.messages : [];

  React.useEffect(() => {
    let active = true;
    void fetch('/api/services')
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Unable to load services.');
        if (!Array.isArray(result.services)) return;
        const byId = new Map(SERVICES_LIST.map((service) => [service.id, service]));
        const fromApi = result.services.flatMap((service: {
          id: string;
          name: string;
          category: CustomerServiceItem['category'];
          basePrice: number;
          unit: string;
          description: string;
          popularFor: string;
          turnaround: string;
          available: boolean;
        }) => {
          const fallback = byId.get(service.id);
          return fallback
            ? [{ ...fallback, ...service, icon: fallback.icon }]
            : [];
        });
        if (active) setServiceCatalog(fromApi);
      })
      .catch((error: unknown) => console.error('Unable to load service catalog:', error));
    return () => {
      active = false;
    };
  }, [serviceRevision]);

  React.useEffect(() => {
    let active = true;
    void fetch('/api/payment-settings')
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || typeof result.gcashEnabled !== 'boolean') {
          throw new Error(result.error || 'Unable to load payment options.');
        }
        if (active) setGCashEnabled(result.gcashEnabled);
      })
      .catch((error: unknown) => {
        console.error('Unable to load payment options:', error);
      });
    return () => {
      active = false;
    };
  }, []);

  React.useEffect(() => {
    const orderId = customerRequests[0]?.id;
    let active = true;
    const endpoint = orderId
      ? `/api/messages?orderId=${encodeURIComponent(orderId)}`
      : '/api/messages';
    void fetch(endpoint)
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Unable to load messages.');
        if (active) {
          setMessageState({
            orderId: orderId ?? '',
            messages: (result.thread?.messages ?? []).map((message: {
              sender: string;
              text: string;
              time: string;
              isStaff: boolean;
            }) => ({ ...message, time: new Date(message.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })),
          });
        }
      })
      .catch((error: unknown) => console.error('Unable to load customer messages:', error));
    return () => {
      active = false;
    };
  }, [customerRequests, messageRevision]);

  const totalPaid = useMemo(
    () => customerRequests.reduce((sum, r) => sum + r.paidAmount, 0),
    [customerRequests]
  );
  const unpaidBalance = useMemo(
    () => customerRequests.reduce((sum, r) => sum + r.unpaidAmount, 0),
    [customerRequests]
  );
  const requestsWithBalance = useMemo(
    () => customerRequests.filter((r) => r.unpaidAmount > 0),
    [customerRequests]
  );

  const filteredServices = useMemo(() => {
    return serviceCatalog.filter((srv) => {
      if (srv.available === false) return false;
      const matchesCategory = selectedCategory === 'All' || srv.category === selectedCategory;
      const matchesSearch =
        srv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        srv.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        srv.popularFor.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [serviceCatalog, selectedCategory, searchQuery]);

  const handleOpenNewRequest = (service?: CustomerServiceItem) => {
    setSelectedServiceForRequest(service || serviceCatalog[0] || null);
    setRequestQty(1);
    setRequestPaymentMethod('Cash on Pickup');
    setRequestFileType('I have ready-to-print artwork file (PDF/PNG)');
    setRequestNotes('');
    setRequestFiles([]);
    setIsNewRequestModalOpen(true);
  };

  const handleCreateRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedServiceForRequest) return;

    try {
      const orderResponse = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service: selectedServiceForRequest.id,
          quantity: requestQty,
          paymentMethod: requestPaymentMethod,
          notes: requestNotes ? `${requestFileType} - ${requestNotes}` : requestFileType,
        }),
      });
      const orderResult = await orderResponse.json();
      if (!orderResponse.ok || !orderResult.order) {
        throw new Error(orderResult.error || 'Unable to create the order.');
      }
      const newReq = orderResult.order as RequestOrder;
      const uploaded: UploadedFile[] = [];
      const typeByExtension: Record<string, string> = {
        pdf: 'application/pdf',
        png: 'image/png',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        ai: 'application/postscript',
        psd: 'image/vnd.adobe.photoshop',
      };

      for (const file of requestFiles) {
        if (!file.file) throw new Error(`The selected file ${file.name} is no longer available. Select it again.`);
        const contentType = file.file.type || typeByExtension[file.ext];
        const signResponse = await fetch('/api/uploads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: newReq.id,
            fileName: file.name,
            contentType,
            size: file.size,
          }),
        });
        const signed = await signResponse.json();
        if (!signResponse.ok) throw new Error(signed.error || `Unable to prepare ${file.name} for upload.`);
        const uploadResponse = await fetch(signed.uploadUrl, {
          method: 'PUT',
          credentials: 'same-origin',
          headers: { 'Content-Type': contentType },
          body: file.file,
        });
        if (!uploadResponse.ok) throw new Error(`Cloud file upload failed for ${file.name}.`);
        const completeResponse = await fetch('/api/uploads/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-file-name': file.name },
          body: JSON.stringify({ orderId: newReq.id, key: signed.key }),
        });
        const completed = await completeResponse.json();
        if (!completeResponse.ok) throw new Error(completed.error || `Unable to attach ${file.name} to the order.`);
        uploaded.push(completed.file as UploadedFile);
      }

      const savedOrder = { ...newReq, files: uploaded };
      setRequests((previous) => [
        savedOrder,
        ...previous.filter((request) => request.id !== savedOrder.id),
      ]);
      setRequestFiles([]);
      setIsNewRequestModalOpen(false);
      if (requestPaymentMethod === 'GCash') {
        openGCashPayment(savedOrder);
      } else {
        setActiveTab('requests');
      }
    } catch (error) {
      console.error('Unable to submit print request:', error);
      window.alert(error instanceof Error ? error.message : 'Unable to submit the request.');
    }
  };

  const openGCashPayment = (order?: RequestOrder) => {
    if (!gcashEnabled) {
      window.alert('GCash payments are currently unavailable. Please use Cash on Pickup.');
      return;
    }
    const target = order || requestsWithBalance[0] || customerRequests[0];
    if (!target) return;
    setTargetOrderForPayment(target);
    setPaymentAmountType('full');
    setPaymentStep('select');
    setIsGCashPaymentOpen(true);
  };

  const handleDeleteRequest = async (order: RequestOrder) => {
    if (
      order.status !== 'Unpaid Balance' ||
      order.progressStage !== 1 ||
      order.paidAmount > 0 ||
      !window.confirm(`Permanently delete unpaid request ${order.id}? This cannot be undone.`)
    ) {
      return;
    }

    setDeletingRequestId(order.id);
    try {
      const response = await fetch('/api/orders', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        throw new Error(result.error || 'Unable to delete this request.');
      }
      setRequests((previous) => previous.filter((request) => request.id !== order.id));
      if (targetOrderForPayment?.id === order.id) {
        setIsGCashPaymentOpen(false);
        setTargetOrderForPayment(null);
      }
      if (selectedOrderForReceipt?.id === order.id) setSelectedOrderForReceipt(null);
      if (result.storageCleanupWarning) {
        window.alert(result.error || 'The request was deleted, but its stored files could not be removed.');
      }
    } catch (error) {
      console.error('Unable to delete service request:', error);
      window.alert(error instanceof Error ? error.message : 'Unable to delete this request.');
    } finally {
      setDeletingRequestId(null);
    }
  };

  const updateOrderFiles = (orderId: string, files: UploadedFile[]) => {
    if (files.length === targetOrderForPayment?.files.length) return;
    setTargetOrderForPayment((prev) => (prev && prev.id === orderId ? { ...prev, files } : prev));
  };

  const handleProceedToGCash = async () => {
    if (!targetOrderForPayment) return;

    const orderId = targetOrderForPayment.id;
    setPaymentStep('redirecting');
    try {
      const response = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: orderId,
          paymentType: paymentAmountType === 'full' ? 'Full Payment' : '50% Down Payment',
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to start GCash checkout.');
      if (typeof result.checkoutUrl !== 'string') {
        throw new Error('PayMongo did not return a checkout link. Please try again.');
      }
      const selectedPaymentType =
        paymentAmountType === 'full' ? 'Full Payment' : '50% Down Payment';
      if (
        result.reused &&
        result.payment &&
        result.payment.paymentType !== selectedPaymentType &&
        !window.confirm(
          `An existing ${result.payment.paymentType} checkout for ₱${Number(
            result.payment.amount,
          ).toLocaleString()} is still open. Continue with that checkout?`,
        )
      ) {
        setPaymentStep('select');
        return;
      }
      window.location.assign(result.checkoutUrl);
    } catch (error) {
      console.error('Unable to start PayMongo GCash checkout:', error);
      setPaymentStep('select');
      window.alert(error instanceof Error ? error.message : 'Unable to start GCash checkout.');
    }
  };

  const handleSendMessage = async () => {
    const orderId = customerRequests[0]?.id;
    if (!newMessageInput.trim()) return;
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...(orderId ? { orderId } : {}), text: newMessageInput.trim() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to send message.');
      setMessageState({
        orderId,
        messages: result.thread.messages.map((message: {
          sender: string;
          text: string;
          time: string;
          isStaff: boolean;
        }) => ({ ...message, time: new Date(message.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })),
      });
      setNewMessageInput('');
    } catch (error) {
      console.error('Unable to send message:', error);
      window.alert(error instanceof Error ? error.message : 'Unable to send message.');
    }
  };

  const confirmLogout = () => {
    setIsLogoutModalOpen(false);
    onLogout?.();
  };

  if (!isLoggedIn) {
    return (
      <div
        className={`min-h-screen flex flex-col selection:bg-[#D4A017] selection:text-black overflow-y-auto font-clarity-modern ${
          highContrastMode ? 'bg-black text-white' : 'bg-[#0D0D0E] text-[#F4F4F5]'
        }`}
      >
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <div
            className={`w-full max-w-md p-6 sm:p-8 rounded-2xl border shadow-2xl space-y-5 transition-all ${
              highContrastMode
                ? 'bg-zinc-950 border-amber-400 text-white'
                : 'bg-[#121214] border-zinc-800 text-zinc-100'
            }`}
          >
            <div className="text-center">
              <img
                src="/logo/netso-logo.jpg"
                alt="NETSO Prints Logo"
                className="w-16 h-16 rounded-2xl object-contain mx-auto mb-3 border border-zinc-700 shadow-md"
              />
              <div className="flex items-center justify-center gap-2 mb-1.5">
                <span className="font-black text-2xl tracking-tight text-white">NETSO PRINTS</span>
                <span className="bg-[#D4A017] text-black font-black text-xs px-2 py-0.5 rounded uppercase tracking-wider">
                  CUSTOMER PORTAL
                </span>
              </div>
              <p className="text-sm text-zinc-300 font-medium">
                {authMode === 'login'
                  ? 'Sign in to place service requests, track orders & pay via GCash'
                  : 'Create a customer account to request printing & advertising services'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 bg-black/50 p-1.5 rounded-xl border border-zinc-800">
              <button
                type="button"
                onClick={() => setAuthMode('login')}
                className={`py-2.5 rounded-lg text-sm font-extrabold uppercase transition-all cursor-pointer ${
                  authMode === 'login'
                    ? 'bg-[#D4A017] text-black shadow'
                    : 'text-zinc-300 hover:text-white'
                }`}
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('signup')}
                className={`py-2.5 rounded-lg text-sm font-extrabold uppercase transition-all cursor-pointer ${
                  authMode === 'signup'
                    ? 'bg-[#D4A017] text-black shadow'
                    : 'text-zinc-300 hover:text-white'
                }`}
              >
                Sign Up
              </button>
            </div>

            {authMode === 'login' ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setIsLoggingIn(true);
                  setTimeout(() => {
                    setIsLoggedIn(true);
                    setIsLoggingIn(false);
                    setActiveTab('dashboard');
                  }, 400);
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-extrabold uppercase tracking-wide text-zinc-200 mb-1.5">
                    Customer Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full bg-[#1C1C1F] border border-zinc-700 rounded-xl px-4 py-3 text-sm sm:text-base font-bold text-white focus:outline-none focus:ring-2 focus:ring-[#D4A017]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-extrabold uppercase tracking-wide text-zinc-200 mb-1.5">
                    Customer Password / PIN
                  </label>
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full bg-[#1C1C1F] border border-zinc-700 rounded-xl px-4 py-3 text-sm sm:text-base font-mono text-white focus:outline-none focus:ring-2 focus:ring-[#D4A017]"
                  />
                </div>

                <div className="p-3.5 rounded-xl border border-zinc-800 bg-[#161619] flex items-center gap-2.5 text-xs sm:text-sm">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span className="text-zinc-200">
                    Demo Account: <strong>Alexandrie Abon</strong> (alexandrieabon@gmail.com)
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full py-3.5 bg-gradient-to-r from-[#D4A017] to-[#B8860B] hover:from-[#E6B222] hover:to-[#C99718] text-black font-extrabold uppercase rounded-xl text-sm sm:text-base flex items-center justify-center gap-2 border border-amber-300 shadow-lg cursor-pointer"
                >
                  {isLoggingIn ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Signing In...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5" />
                      <span>Sign In to Customer Portal</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const fullName =
                    `${signupFirstName.trim()} ${signupLastName.trim()}`.trim() || 'New Customer';
                  setIsLoggingIn(true);
                  setTimeout(() => {
                    setSessionUserName(fullName);
                    setLoginEmail(signupEmail || 'customer@email.com');
                    setIsLoggedIn(true);
                    setIsLoggingIn(false);
                    setActiveTab('dashboard');
                  }, 450);
                }}
                className="space-y-3.5 text-sm"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-extrabold uppercase tracking-wide text-zinc-200 block mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Alexandrie"
                      value={signupFirstName}
                      onChange={(e) => setSignupFirstName(e.target.value)}
                      className="w-full bg-[#1C1C1F] border border-zinc-700 rounded-xl px-3.5 py-2.5 text-white font-bold focus:outline-none focus:ring-2 focus:ring-[#D4A017]"
                    />
                  </div>
                  <div>
                    <label className="font-extrabold uppercase tracking-wide text-zinc-200 block mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Abon"
                      value={signupLastName}
                      onChange={(e) => setSignupLastName(e.target.value)}
                      className="w-full bg-[#1C1C1F] border border-zinc-700 rounded-xl px-3.5 py-2.5 text-white font-bold focus:outline-none focus:ring-2 focus:ring-[#D4A017]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-extrabold uppercase tracking-wide text-zinc-200 block mb-1">
                      Username
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="alex_abon"
                      value={signupUsername}
                      onChange={(e) => setSignupUsername(e.target.value)}
                      className="w-full bg-[#1C1C1F] border border-zinc-700 rounded-xl px-3.5 py-2.5 text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#D4A017]"
                    />
                  </div>
                  <div>
                    <label className="font-extrabold uppercase tracking-wide text-zinc-200 block mb-1">
                      GCash Mobile No.
                    </label>
                    <input
                      type="text"
                      required
                      value={signupMobile}
                      onChange={(e) => setSignupMobile(e.target.value)}
                      className="w-full bg-[#1C1C1F] border border-zinc-700 rounded-xl px-3.5 py-2.5 text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#D4A017]"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-extrabold uppercase tracking-wide text-zinc-200 block mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="you@email.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    className="w-full bg-[#1C1C1F] border border-zinc-700 rounded-xl px-3.5 py-2.5 text-white font-bold focus:outline-none focus:ring-2 focus:ring-[#D4A017]"
                  />
                </div>

                <div>
                  <label className="font-extrabold uppercase tracking-wide text-zinc-200 block mb-1">
                    Create Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    className="w-full bg-[#1C1C1F] border border-zinc-700 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:ring-2 focus:ring-[#D4A017]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full py-3.5 bg-gradient-to-r from-[#D4A017] to-[#B8860B] hover:from-[#E6B222] hover:to-[#C99718] text-black font-extrabold uppercase rounded-xl text-sm sm:text-base flex items-center justify-center gap-2 border border-amber-300 shadow-lg cursor-pointer"
                >
                  {isLoggingIn ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-5 h-5" />
                      <span>Create Account &amp; Enter Portal</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  const activeDisplayName = sessionUserName || displayUserName;
  const userInitials = activeDisplayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const headerNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
    { id: 'services', label: 'Service Catalog', icon: Printer },
    { id: 'requests', label: 'My Requests', icon: FileText, badge: requestsWithBalance.length },
    { id: 'payments', label: 'GCash Payments', icon: Wallet },
    { id: 'messages', label: 'Chat Staff', icon: MessageSquare },
  ];

  const sidebarItems = [
    {
      id: 'dashboard',
      label: 'Dashboard Overview',
      icon: LayoutGrid,
      desc: 'Balance, stats & quick requests',
    },
    {
      id: 'services',
      label: 'Service Catalog',
      icon: Printer,
      desc: 'Tarps, stickers, IDs & signage',
    },
    {
      id: 'requests',
      label: 'My Service Requests',
      icon: FileText,
      badge: requestsWithBalance.length || undefined,
      desc: 'Track status stages & files',
    },
    {
      id: 'payments',
      label: 'GCash Payments',
      icon: Wallet,
      desc: '50% deposit & balance settlement',
    },
    {
      id: 'messages',
      label: 'Staff Live Chat',
      icon: MessageSquare,
      desc: 'Inquiries & design proofs',
    },
    {
      id: 'profile',
      label: 'Client Profile',
      icon: User,
      desc: 'Account & delivery details',
    },
  ];

  const checkoutBaseAmount = targetOrderForPayment
    ? targetOrderForPayment.unpaidAmount > 0
      ? targetOrderForPayment.unpaidAmount
      : targetOrderForPayment.amount
    : 0;

  return (
    <div
      className={`h-screen flex flex-col selection:bg-[#D4A017] selection:text-black overflow-hidden font-clarity-modern ${
        highContrastMode ? 'bg-black text-white' : 'bg-[#0D0D0E] text-[#F4F4F5]'
      }`}
    >
      <Header
        portalTitle="NETSO PRINTS"
        portalBadge="CUSTOMER PORTAL"
        subtitle="Commercial Digital Printing, Signage & Service Request Portal"
        navItems={headerNavItems}
        activeTab={activeTab}
        onSelectTab={(id) => setActiveTab(id as CustomerTabId)}
        userInitials={userInitials}
        userName={activeDisplayName}
        userRoleLabel="Verified Client"
        onProfileClick={() => setActiveTab('profile')}
        onLogoutClick={() => setIsLogoutModalOpen(true)}
        primaryActionLabel="+ New Print Request"
        onPrimaryAction={() => handleOpenNewRequest()}
        highContrastMode={highContrastMode}
        fontSizeLevel={fontSizeLevel}
      />

      {/* Main Body */}
      <div className="grid grid-cols-1 md:grid-cols-12 flex-1 min-h-0 overflow-hidden">
        <Sidebar
          menuHeading="NAVIGATION MENU"
          items={sidebarItems}
          activeTab={activeTab}
          onSelectTab={(id) => setActiveTab(id as CustomerTabId)}
          calloutBadge={gcashEnabled ? 'GCASH SETTLEMENT' : 'CASH ON PICKUP'}
          calloutTitle={gcashEnabled ? 'Pay Balance Anytime' : 'GCash Unavailable'}
          calloutDesc={
            !gcashEnabled
              ? 'GCash is not enabled yet. Choose Cash on Pickup for new orders.'
              : unpaidBalance > 0
              ? `You have ₱${unpaidBalance.toLocaleString()} remaining balance. Submit a GCash reference for staff review.`
              : 'All your active orders are settled.'
          }
          calloutButtonLabel={gcashEnabled ? 'Pay Balance Now' : 'GCash Disabled'}
          onCalloutAction={() => openGCashPayment()}
          userInitials={userInitials}
          userName={activeDisplayName}
          userSubtitle="Verified Customer"
          onProfileClick={() => setActiveTab('profile')}
          onLogoutClick={() => setIsLogoutModalOpen(true)}
          highContrastMode={highContrastMode}
          fontSizeLevel={fontSizeLevel}
        />

        <main
          className={`col-span-12 md:col-span-8 lg:col-span-9 p-4 sm:p-6 overflow-y-auto pb-24 md:pb-8 ${
            highContrastMode ? 'bg-[#050505] text-white' : 'bg-[#F9FAFB] text-zinc-950'
          }`}
        >
          {activeTab === 'dashboard' && (
            <div className="space-y-5 sm:space-y-6">
              <div className="bg-[#111113] text-white p-5 sm:p-6 rounded-2xl border border-zinc-800 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-4 max-w-2xl">
                  <img
                    src="/logo/netso-logo.jpg"
                    alt="NETSO Prints & Ads Logo"
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-contain shrink-0 border-2 border-[#D4A017]/70 bg-[#0A0A0C] p-1 shadow-lg"
                  />
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 bg-[#D4A017]/20 border border-[#D4A017]/50 px-3 py-1 rounded-full text-xs sm:text-sm font-extrabold text-[#E6B222]">
                      <Sparkles className="w-4 h-4" />
                      <span>Commercial &amp; Rush Digital Printing</span>
                    </div>
                    <h1 className="font-extrabold text-white text-xl sm:text-2xl lg:text-3xl">
                      Welcome Back, {activeDisplayName.split(' ')[0]}!
                    </h1>
                    <p className="text-zinc-200 text-sm sm:text-base leading-relaxed">
                      Monitor your service request status, calculate instant project rates, or pay remaining balances directly via <strong>GCash</strong>.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenNewRequest()}
                  className="px-5 py-3 bg-gradient-to-r from-[#D4A017] to-[#B8860B] text-black font-extrabold uppercase rounded-xl flex items-center gap-2 text-sm sm:text-base border border-amber-300 cursor-pointer shrink-0 shadow-md"
                >
                  <PlusCircle className="w-5 h-5" />
                  <span>+ Create Print Request</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-xl border bg-white border-zinc-300 text-zinc-950 shadow-xs">
                  <span className="text-xs sm:text-sm font-extrabold uppercase text-zinc-600 block">
                    TOTAL PAID
                  </span>
                  <span className="font-mono font-extrabold text-2xl sm:text-3xl block mt-1.5">
                    ₱{totalPaid.toLocaleString()}
                  </span>
                  <span className="text-emerald-700 font-bold text-xs sm:text-sm mt-1.5 block">
                    ✓ Settled &amp; verified print orders
                  </span>
                </div>
                <div className="p-5 rounded-xl border bg-red-50/80 border-red-400 text-zinc-950 shadow-xs">
                  <span className="text-xs sm:text-sm font-extrabold uppercase text-red-600 block">
                    UNPAID BALANCE
                  </span>
                  <span className="font-mono font-extrabold text-2xl sm:text-3xl text-red-600 block mt-1.5">
                    ₱{unpaidBalance.toLocaleString()}
                  </span>
                  <span className="text-red-700 font-bold text-xs sm:text-sm mt-1.5 block">
                    Requires settlement before pickup
                  </span>
                </div>
                <div className="p-5 rounded-xl border bg-white border-amber-400 text-zinc-950 shadow-xs">
                  <span className="text-xs sm:text-sm font-extrabold uppercase text-zinc-600 block">
                    ORDERS WITH BALANCE
                  </span>
                  <span className="font-mono font-extrabold text-2xl sm:text-3xl block mt-1.5">
                    {requestsWithBalance.length}
                  </span>
                  <span className="text-zinc-600 font-semibold text-xs sm:text-sm mt-1.5 block">
                    Active requests in processing
                  </span>
                </div>
              </div>

              {unpaidBalance > 0 && gcashEnabled && (
                <div className="p-5 rounded-2xl border bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 border-blue-400 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-blue-600 border border-blue-300 flex items-center justify-center shrink-0">
                      <Wallet className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-base sm:text-lg">
                        Pay Outstanding Balance via GCash
                      </h3>
                      <p className="text-blue-100 text-sm sm:text-base mt-0.5">
                        You have an outstanding balance of{' '}
                        <strong className="text-yellow-300 font-mono">₱{unpaidBalance}</strong>.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => openGCashPayment()}
                    className="px-5 py-3 bg-[#E6B222] hover:bg-[#D4A017] text-black font-extrabold uppercase rounded-xl border border-black text-sm sm:text-base shrink-0 cursor-pointer"
                  >
                    PAY VIA GCASH (₱{unpaidBalance})
                  </button>
                </div>
              )}

              <div className="space-y-3">
                <h2 className="font-extrabold uppercase tracking-wider text-sm sm:text-base text-zinc-900">
                  Recent Orders Stage Tracker (Live Synced with Admin)
                </h2>
                {customerRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-5 rounded-xl border bg-white border-zinc-300 text-zinc-950 space-y-3 shadow-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 pb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono font-bold text-xs sm:text-sm bg-amber-100 px-2.5 py-1 border border-[#D4A017] rounded-lg">
                          {req.id}
                        </span>
                        <span className="font-extrabold text-base sm:text-lg">{req.service}</span>
                      </div>
                      <span className="px-3 py-1 text-xs sm:text-sm font-extrabold rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                        {req.status}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-zinc-600">
                      Payment method: {req.paymentMethod ?? 'Not specified'}
                    </p>
                    <div className="w-full bg-zinc-200 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-[#D4A017] via-amber-500 to-emerald-500 h-full transition-all duration-500"
                        style={{ width: `${(req.progressStage / 4) * 100}%` }}
                      />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm text-zinc-600 font-medium">
                      <span>Ordered on {req.date}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold">
                          Total: ₱{req.amount} · Paid: ₱{req.paidAmount} · Balance:{' '}
                          <strong
                            className={req.unpaidAmount > 0 ? 'text-red-600' : 'text-emerald-700'}
                          >
                            ₱{req.unpaidAmount}
                          </strong>
                        </span>
                        {req.unpaidAmount > 0 && gcashEnabled ? (
                          <button
                            type="button"
                            onClick={() => openGCashPayment(req)}
                            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs sm:text-sm rounded-lg cursor-pointer"
                          >
                            Pay via GCash
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setSelectedOrderForReceipt(req)}
                            className="px-3 py-1 border border-zinc-400 hover:bg-zinc-100 text-zinc-900 font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                            <span>Receipt</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'services' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div>
                  <h1 className="font-black text-xl sm:text-2xl text-zinc-950">
                    Printing &amp; Advertising Service Catalog
                  </h1>
                  <p className="text-sm sm:text-base text-zinc-600">
                    Select any service below to calculate an instant quote and submit your design files.
                  </p>
                </div>
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    placeholder="Search services..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-300 bg-white text-sm font-semibold text-zinc-950 focus:outline-none focus:ring-2 focus:ring-[#D4A017]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                {[
                  'All',
                  'Large Format',
                  'Photo & ID',
                  'Signage',
                  'Document',
                  'Merch & Gifts',
                  'Marketing',
                ].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap cursor-pointer transition-all ${
                      selectedCategory === cat
                        ? 'bg-zinc-950 text-[#D4A017] border border-zinc-950 shadow'
                        : 'bg-white text-zinc-700 border border-zinc-300 hover:border-zinc-400'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredServices.map((srv) => {
                  const Icon = srv.icon;
                  return (
                    <div
                      key={srv.id}
                      className="p-5 rounded-2xl border bg-white border-zinc-300 text-zinc-950 space-y-4 flex flex-col justify-between shadow-xs hover:shadow-md transition-all"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-300 text-[#B8860B] flex items-center justify-center">
                            <Icon className="w-6 h-6" />
                          </div>
                          <span className="bg-zinc-950 text-[#D4A017] font-mono font-black px-3 py-1.5 rounded-lg text-sm">
                            ₱{srv.basePrice} {srv.unit}
                          </span>
                        </div>
                        <h3 className="font-extrabold text-lg mt-3">{srv.name}</h3>
                        <p className="text-sm text-zinc-600 mt-1 leading-relaxed">
                          {srv.description}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenNewRequest(srv)}
                        className="w-full py-3 bg-[#D4A017] hover:bg-[#B8860B] text-black font-extrabold uppercase rounded-xl border border-black text-sm cursor-pointer transition-colors"
                      >
                        Calculate Quote &amp; Order
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'requests' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h1 className="font-black text-xl sm:text-2xl text-zinc-950">
                    My Service Requests
                  </h1>
                  <p className="text-sm sm:text-base text-zinc-600">
                    Track your active orders, view payment status, and settle any remaining balances.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenNewRequest()}
                  className="px-4 py-2.5 bg-[#D4A017] hover:bg-[#B8860B] text-black font-extrabold uppercase rounded-xl border border-black text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>+ Create Print Order</span>
                </button>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <label htmlFor="request-status-filter" className="text-sm font-bold text-zinc-700">
                  Filter by status
                </label>
                <select
                  id="request-status-filter"
                  value={requestStatusFilter}
                  onChange={(event) => setRequestStatusFilter(event.target.value)}
                  className="w-full sm:w-auto min-w-48 px-3 py-2 rounded-lg border border-zinc-300 bg-white text-zinc-900 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A017]"
                >
                  <option value="All">All statuses</option>
                  <option value="Unpaid Balance">Awaiting Payment</option>
                  <option value="In Pre-Press">In Pre-Press</option>
                  <option value="In Production">In Production</option>
                  <option value="Ready for Pickup">Ready for Pickup</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
              {filteredCustomerRequests.length === 0 ? (
                <div className="p-5 rounded-2xl border border-zinc-300 bg-white text-zinc-600 text-sm">
                  {customerRequests.length === 0
                    ? 'You do not have any service requests yet.'
                    : 'No service requests match this status.'}
                </div>
              ) : filteredCustomerRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-5 rounded-2xl border bg-white border-zinc-300 text-zinc-950 space-y-3.5 shadow-xs"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-mono font-black text-sm bg-amber-100 px-3 py-1 border border-[#D4A017] rounded-lg">
                      {req.id}
                    </span>
                    <span className={`font-extrabold text-xs sm:text-sm px-3 py-1 rounded-full border ${
                      req.status === 'Unpaid Balance' && req.unpaidAmount === 0
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                        : req.status === 'Unpaid Balance'
                          ? 'bg-amber-50 border-amber-300'
                          : 'bg-amber-50 border-amber-300'
                    }`}>
                      {req.status === 'Unpaid Balance'
                        ? req.unpaidAmount === 0
                          ? 'Paid — Awaiting Confirmation'
                          : req.paymentMethod === 'Cash on Pickup'
                            ? 'Awaiting Confirmation — Pay at Pickup'
                            : 'Awaiting Payment'
                        : req.status}
                    </span>
                  </div>
                  <div className="font-extrabold text-base sm:text-lg">{req.service}</div>
                  <div className="text-sm font-mono">
                    Total: ₱{req.amount} · Paid: ₱{req.paidAmount} · Unpaid:{' '}
                    <strong className={req.unpaidAmount > 0 ? 'text-red-600' : 'text-emerald-700'}>
                      ₱{req.unpaidAmount}
                    </strong>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <span className="text-xs sm:text-sm text-zinc-500">{req.notes}</span>
                    <div className="flex flex-wrap items-center gap-2">
                      {req.unpaidAmount > 0 &&
                      req.status !== 'Cancelled' &&
                      gcashEnabled ? (
                        <button
                          type="button"
                          onClick={() => openGCashPayment(req)}
                          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm rounded-xl flex items-center gap-2 cursor-pointer"
                        >
                          <Wallet className="w-4 h-4" />
                          <span>Pay Remaining ₱{req.unpaidAmount} via GCash</span>
                        </button>
                      ) : req.status !== 'Cancelled' ? (
                        <button
                          type="button"
                          onClick={() => setSelectedOrderForReceipt(req)}
                          className="px-4 py-2 border border-zinc-400 hover:bg-zinc-100 text-zinc-900 font-bold text-xs sm:text-sm rounded-xl flex items-center gap-1.5 cursor-pointer"
                        >
                          <Receipt className="w-4 h-4" />
                          <span>View Official Receipt</span>
                        </button>
                      ) : null}
                      {req.status === 'Unpaid Balance' && req.progressStage === 1 && req.paidAmount === 0 && (
                        <button
                          type="button"
                          disabled={deletingRequestId === req.id}
                          onClick={() => void handleDeleteRequest(req)}
                          className="px-4 py-2 border border-red-300 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs sm:text-sm rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {deletingRequestId === req.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                          <span>{deletingRequestId === req.id ? 'Deleting...' : 'Delete Request'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl border bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 border-blue-400 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h2 className="font-extrabold text-lg sm:text-xl">
                    GCash Payments &amp; Balance Settlement
                  </h2>
                  {gcashEnabled ? (
                    <p className="text-sm text-blue-100 mt-1">
                      GCash payment is available through secure PayMongo checkout.
                    </p>
                  ) : (
                    <p className="text-sm text-blue-100 mt-1">
                      GCash is currently unavailable. Choose Cash on Pickup when placing a new order.
                    </p>
                  )}
                </div>
                {unpaidBalance > 0 && gcashEnabled && (
                  <button
                    type="button"
                    onClick={() => openGCashPayment()}
                    className="px-5 py-2.5 bg-[#E6B222] text-black font-extrabold uppercase rounded-xl border border-black text-sm cursor-pointer"
                  >
                    Pay Outstanding Balance (₱{unpaidBalance})
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {customerRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-5 rounded-xl border bg-white border-zinc-300 text-zinc-950 flex flex-wrap items-center justify-between gap-4 shadow-xs"
                  >
                    <div>
                      <span className="font-mono font-black text-xs sm:text-sm bg-amber-100 px-2.5 py-1 border border-[#D4A017] rounded">
                        {req.id}
                      </span>
                      <p className="font-extrabold text-base sm:text-lg mt-1.5">{req.service}</p>
                      <p className="text-xs font-semibold text-zinc-600">
                        Payment method: {req.paymentMethod ?? 'Not specified'}
                      </p>
                      <span className="text-xs sm:text-sm text-zinc-500 font-mono">
                        {req.paymentMethod === 'GCash'
                          ? `GCash Ref: ${req.gcashRefNo || 'Pending Checkout'}`
                          : req.paymentMethod === 'Cash on Pickup'
                            ? 'Cash is due at pickup'
                            : 'No payment reference'}
                      </span>
                    </div>
                    <div className="text-right space-y-1.5">
                      <div className="text-sm font-mono">
                        Paid: <strong className="text-emerald-700">₱{req.paidAmount}</strong> ·
                        Balance: <strong className="text-red-600">₱{req.unpaidAmount}</strong>
                      </div>
                      {req.unpaidAmount > 0 ? (
                        gcashEnabled ? (
                          <button
                            type="button"
                            onClick={() => openGCashPayment(req)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs sm:text-sm rounded-lg cursor-pointer"
                          >
                            Settle ₱{req.unpaidAmount} via GCash
                          </button>
                        ) : (
                          <span className="inline-block px-3 py-1 rounded-full text-xs sm:text-sm font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                            {req.paymentMethod === 'Cash on Pickup'
                              ? 'Cash due at pickup'
                              : 'Balance unpaid'}
                          </span>
                        )
                      ) : (
                        <span className="inline-block px-3 py-1 rounded-full text-xs sm:text-sm font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          ✓ Fully Paid
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'messages' && (
            <div className="border rounded-2xl p-5 bg-white border-zinc-300 h-[480px] flex flex-col justify-between shadow-xs">
              <div className="space-y-3.5 overflow-y-auto pr-1">
                {messages.length === 0 && (
                  <p className="rounded-xl border border-dashed border-zinc-300 p-4 text-center text-sm text-zinc-500">
                    {customerRequests.length
                      ? 'No messages in this order conversation yet. Send a message to contact staff.'
                      : 'No order needed. Send a message to start a conversation with NETSO staff.'}
                  </p>
                )}
                {messages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col max-w-[85%] ${
                      m.isStaff ? 'mr-auto' : 'ml-auto items-end'
                    }`}
                  >
                    <span className="text-xs text-zinc-500 mb-1 font-medium">
                      {m.sender} · {m.time}
                    </span>
                    <div
                      className={`p-3.5 rounded-xl text-sm sm:text-base leading-relaxed ${
                        m.isStaff
                          ? 'bg-zinc-950 text-white'
                          : 'bg-[#D4A017] text-black font-bold'
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                ))}
              </div>
              <div className="pt-3.5 border-t flex gap-2.5">
                <input
                  type="text"
                  value={newMessageInput}
                  onChange={(e) => setNewMessageInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type message regarding your order..."
                  className="flex-1 border border-zinc-300 rounded-xl px-4 py-2.5 text-sm sm:text-base font-semibold"
                />
                <button
                  type="button"
                  onClick={handleSendMessage}
                  className="px-5 py-2.5 bg-[#D4A017] text-black font-extrabold uppercase rounded-xl border border-black text-sm cursor-pointer"
                >
                  Send
                </button>
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="p-6 rounded-2xl border bg-white border-zinc-300 text-zinc-950 space-y-4 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-extrabold text-xl sm:text-2xl">{activeDisplayName}</h2>
                  <p className="text-sm sm:text-base text-zinc-600 mt-0.5">
                    Customer account · {currentUser.email}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsLogoutModalOpen(true)}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm rounded-xl cursor-pointer"
                >
                  Log Out
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav
        className={`md:hidden fixed bottom-0 left-0 right-0 z-40 border-t flex items-center justify-around px-1 py-1.5 transition-colors shadow-lg ${
          highContrastMode ? 'bg-black border-amber-500' : 'bg-[#121214] border-zinc-800'
        }`}
      >
        {[
          { id: 'dashboard', label: 'Home', icon: LayoutGrid },
          { id: 'services', label: 'Catalog', icon: Printer },
          { id: 'requests', label: 'Requests', icon: FileText, badge: requestsWithBalance.length },
          { id: 'payments', label: 'GCash', icon: Wallet },
          { id: 'messages', label: 'Chat', icon: MessageSquare },
          { id: 'profile', label: 'Profile', icon: User },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as CustomerTabId)}
              className={`flex-1 py-1 px-1 flex flex-col items-center justify-center gap-1 rounded-lg transition-all min-h-[48px] relative ${
                isActive ? 'text-[#D4A017] font-black' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {tab.badge ? (
                  <span className="absolute -top-1.5 -right-2.5 px-1.5 py-0.2 text-[10px] font-black bg-red-600 text-white rounded-full">
                    {tab.badge}
                  </span>
                ) : null}
              </div>
              <span className="text-xs font-bold leading-none">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Logout Confirmation Modal */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl border border-zinc-300 max-w-sm w-full shadow-2xl text-zinc-950 space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-red-100 text-red-600 border border-red-200 flex items-center justify-center shrink-0">
                <LogOut className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black">Confirm Logout</h3>
                <p className="text-zinc-600 text-sm font-medium mt-1">
                  Are you sure you want to log out of your NETSO Customer Portal session?
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsLogoutModalOpen(false)}
                className="px-4 py-2.5 border border-zinc-300 hover:bg-zinc-100 text-zinc-800 font-bold rounded-xl text-sm cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmLogout}
                className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm rounded-xl cursor-pointer"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* + Create New Print Order Modal */}
      {isNewRequestModalOpen && selectedServiceForRequest && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border-2 border-zinc-900 rounded-2xl max-w-lg w-full p-5 sm:p-6 space-y-4 text-zinc-950 shadow-2xl max-h-[92vh] overflow-y-auto relative">
            <button
              type="button"
              onClick={() => setIsNewRequestModalOpen(false)}
              className="absolute top-5 right-5 text-zinc-500 hover:text-black p-1 rounded-lg cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b-2 border-[#D4A017] pb-3 pr-8 flex items-center gap-3">
              <img
                src="/logo/netso-logo.jpg"
                alt="NETSO Prints & Ads Logo"
                className="w-12 h-12 rounded-xl object-contain shrink-0 border border-[#D4A017] bg-[#0A0A0C] p-0.5 shadow-sm"
              />
              <div>
                <h3 className="font-black text-lg sm:text-xl text-zinc-950">
                  + Create New Print Order
                </h3>
                <p className="text-xs sm:text-sm text-zinc-600 font-medium mt-0.5">
                  Pricing uses the active service catalog. Work begins after staff review.
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateRequestSubmit} className="space-y-4 text-sm">
              <div>
                <label className="font-extrabold text-xs sm:text-sm text-zinc-900 block mb-1.5">
                  Select Printing Service
                </label>
                <select
                  value={selectedServiceForRequest.id}
                  onChange={(e) => {
                    const found = serviceCatalog.find((s) => s.id === e.target.value);
                    if (found) setSelectedServiceForRequest(found);
                  }}
                  className="w-full border border-zinc-400 bg-white px-3.5 py-2.5 rounded-xl font-bold text-sm sm:text-base text-zinc-950 focus:outline-none focus:ring-2 focus:ring-[#D4A017]"
                >
                  {serviceCatalog.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — ₱{s.basePrice} ({s.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-extrabold text-xs sm:text-sm text-zinc-900 block mb-1.5">
                  Quantity / Copies
                </label>
                <input
                  type="number"
                  min={1}
                  value={requestQty}
                  onChange={(e) => setRequestQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full border border-zinc-400 bg-white px-3.5 py-2.5 rounded-xl font-mono font-bold text-sm sm:text-base text-zinc-950 focus:outline-none focus:ring-2 focus:ring-[#D4A017]"
                />
              </div>

              <div>
                <label className="font-extrabold text-xs sm:text-sm text-zinc-900 block mb-1.5">
                  Artwork / Layout Readiness
                </label>
                <select
                  value={requestFileType}
                  onChange={(e) => setRequestFileType(e.target.value)}
                  className="w-full border border-zinc-400 bg-white px-3.5 py-2.5 rounded-xl font-bold text-sm sm:text-base text-zinc-950 focus:outline-none focus:ring-2 focus:ring-[#D4A017]"
                >
                  <option value="I have ready-to-print artwork file (PDF/PNG)">
                    I have ready-to-print artwork file (PDF/PNG)
                  </option>
                  <option value="Need layout adjustment / text edit">
                    Need layout adjustment / text edit
                  </option>
                  <option value="Need full custom graphic design (+Layout Fee)">
                    Need full custom graphic design (+Layout Fee)
                  </option>
                </select>
              </div>

              <div>
                <label className="font-extrabold text-xs sm:text-sm text-zinc-900 block mb-1.5">
                  Payment Method
                </label>
                <select
                  value={requestPaymentMethod}
                  onChange={(e) =>
                    setRequestPaymentMethod(e.target.value as 'GCash' | 'Cash on Pickup')
                  }
                  className="w-full border border-zinc-400 bg-white px-3.5 py-2.5 rounded-xl font-bold text-sm sm:text-base text-zinc-950 focus:outline-none focus:ring-2 focus:ring-[#D4A017]"
                >
                  <option value="Cash on Pickup">Cash on Pickup</option>
                  {gcashEnabled && <option value="GCash">GCash</option>}
                </select>
                <p className="mt-1.5 text-xs text-zinc-600">
                  {requestPaymentMethod === 'Cash on Pickup'
                    ? 'The order can be confirmed before payment. Please settle the balance when you pick it up.'
                    : 'You will continue to secure PayMongo checkout after submitting your order.'}
                </p>
                {!gcashEnabled && (
                  <p className="mt-1 text-xs font-bold text-amber-800">
                    GCash is temporarily unavailable. You can still place orders with Cash on Pickup.
                  </p>
                )}
              </div>

              <div>
                <label className="font-extrabold text-xs sm:text-sm text-zinc-900 flex items-center gap-1.5 mb-1.5">
                  <Paperclip className="w-4 h-4 text-[#B8860B]" />
                  <span>Upload Your Design Artwork (Optional)</span>
                </label>
                <FileUploader
                  files={requestFiles}
                  onChange={setRequestFiles}
                  fontSizeLevel={fontSizeLevel}
                />
              </div>

              <div>
                <label className="font-extrabold text-xs sm:text-sm text-zinc-900 block mb-1.5">
                  Special Instructions / Dimensions
                </label>
                <textarea
                  rows={2}
                  value={requestNotes}
                  onChange={(e) => setRequestNotes(e.target.value)}
                  placeholder="E.g., Size (8x4ft), grommet placement on 4 corners, glossy laminate finish..."
                  className="w-full border border-zinc-400 bg-white px-3.5 py-2.5 rounded-xl font-medium text-sm text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#D4A017]"
                />
              </div>

              <div className="bg-[#FFFBEB] border border-[#D4A017] rounded-xl p-3.5 flex items-center justify-between">
                <div>
                  <span className="font-extrabold text-sm sm:text-base text-zinc-950 block">
                    Estimated Total Cost:
                  </span>
                  <span className="text-xs text-zinc-600 font-medium block">
                    Base Price × Quantity
                  </span>
                </div>
                <span className="font-mono font-black text-2xl sm:text-3xl text-[#B8860B]">
                  ₱{(selectedServiceForRequest.basePrice * requestQty).toLocaleString()}
                </span>
              </div>

              <div className="flex items-center gap-2.5 pt-1">
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 bg-[#D4A017] hover:bg-[#B8860B] text-black font-extrabold uppercase rounded-xl border border-black text-xs sm:text-sm cursor-pointer transition-colors shadow-xs"
                >
                  SUBMIT ORDER &amp; CONTINUE
                </button>
                <button
                  type="button"
                  onClick={() => setIsNewRequestModalOpen(false)}
                  className="py-3 px-5 bg-white hover:bg-zinc-100 text-zinc-900 font-extrabold uppercase rounded-xl border border-zinc-400 text-xs sm:text-sm cursor-pointer transition-colors"
                >
                  CANCEL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual GCash reference submission modal */}
      {isGCashPaymentOpen && targetOrderForPayment && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-[#071126] border border-blue-500/80 rounded-2xl max-w-md w-full p-5 sm:p-6 space-y-4 text-white shadow-[0_0_40px_rgba(37,99,235,0.25)]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-blue-800/80 pb-3.5">
              <div className="flex items-center gap-3">
                <img
                  src="/logo/netso-logo.jpg"
                  alt="NETSO Prints & Ads Logo"
                  className="w-11 h-11 rounded-xl object-contain shrink-0 border border-[#D4A017]/60 bg-[#0A0A0C] p-0.5 shadow-md"
                />
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 shadow-md">
                  <Wallet className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg text-white leading-tight">
                    Submit GCash Payment Reference
                  </h3>
                  <span className="text-xs text-blue-300 font-mono block mt-0.5">
                    NETSO Prints &amp; Ads · Staff review required
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsGCashPaymentOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg cursor-pointer"
                aria-label="Close payment submission"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step 1: Upload Design Artwork before Payment */}
            {paymentStep === 'upload' && (
              <div className="space-y-4">
                <div className="bg-[#0B1D3A] border border-blue-500/50 rounded-xl p-4 space-y-1">
                  <span className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-blue-300 block">
                    ORDER TO BE PAID:
                  </span>
                  <p className="font-extrabold text-base sm:text-lg text-white">
                    {targetOrderForPayment.service}
                  </p>
                  <p className="text-xs sm:text-sm text-zinc-300">
                    Order Reference:{' '}
                    <span className="font-mono font-bold text-yellow-400">
                      {targetOrderForPayment.id}
                    </span>
                  </p>
                </div>

                <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed">
                  Please attach your design files (PDF, PNG, JPG) before paying so our operator can
                  begin pre-press immediately upon confirmation.
                </p>

                <FileUploader
                  theme="dark"
                  fontSizeLevel={fontSizeLevel}
                  files={targetOrderForPayment.files}
                  onChange={(files) => updateOrderFiles(targetOrderForPayment.id, files)}
                />

                <button
                  type="button"
                  onClick={() => setPaymentStep('select')}
                  className={`w-full py-3.5 font-extrabold uppercase rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    targetOrderForPayment.files.length > 0
                      ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg'
                      : 'bg-zinc-700/80 hover:bg-zinc-600 text-zinc-200'
                  }`}
                >
                  <span>CONTINUE TO PAYMENT SELECTION</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Step 2: Select Payment Option */}
            {paymentStep === 'select' && (
              <div className="space-y-4">
                <div className="bg-[#0B1D3A] border border-blue-500/50 rounded-xl p-4 space-y-1">
                  <span className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-blue-300 block">
                    CONFIRMING ORDER:
                  </span>
                  <p className="font-extrabold text-base sm:text-lg text-white">
                    {targetOrderForPayment.service}
                  </p>
                  <p className="text-xs sm:text-sm text-zinc-300">
                    Order ID:{' '}
                    <span className="font-mono font-bold text-yellow-400">
                      {targetOrderForPayment.id}
                    </span>
                  </p>
                </div>

                <div>
                  <label className="font-extrabold text-xs sm:text-sm text-white block mb-2">
                    Choose Payment Option:
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentAmountType('full')}
                      className={`p-3.5 rounded-xl text-left transition-all cursor-pointer ${
                        paymentAmountType === 'full'
                          ? 'border-2 border-[#E6B222] bg-[#D4A017]/25 text-yellow-300 shadow-md'
                          : 'border border-blue-700/80 bg-[#0B1A33] text-white hover:border-blue-500'
                      }`}
                    >
                      <span
                        className={`text-[10px] sm:text-xs font-extrabold uppercase tracking-wider block ${
                          paymentAmountType === 'full' ? 'text-yellow-300' : 'text-zinc-300'
                        }`}
                      >
                        FULL SETTLEMENT
                      </span>
                      <span className="font-mono font-black text-lg sm:text-xl mt-1 block">
                        ₱{checkoutBaseAmount.toLocaleString()}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentAmountType('downpayment')}
                      className={`p-3.5 rounded-xl text-left transition-all cursor-pointer ${
                        paymentAmountType === 'downpayment'
                          ? 'border-2 border-[#E6B222] bg-[#D4A017]/25 text-yellow-300 shadow-md'
                          : 'border border-blue-700/80 bg-[#0B1A33] text-white hover:border-blue-500'
                      }`}
                    >
                      <span
                        className={`text-[10px] sm:text-xs font-extrabold uppercase tracking-wider block ${
                          paymentAmountType === 'downpayment' ? 'text-yellow-300' : 'text-zinc-300'
                        }`}
                      >
                        50% DEPOSIT
                      </span>
                      <span className="font-mono font-black text-lg sm:text-xl mt-1 block">
                        ₱{Math.ceil(checkoutBaseAmount / 2).toLocaleString()}
                      </span>
                    </button>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-blue-200">
                  You will be redirected to PayMongo to securely complete your GCash payment.
                </p>
                <button
                  type="button"
                  onClick={handleProceedToGCash}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold uppercase rounded-xl flex items-center justify-center gap-2 text-xs sm:text-sm shadow-lg cursor-pointer transition-all"
                >
                  <span>CONTINUE TO GCASH CHECKOUT</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Step 3: Redirecting to PayMongo */}
            {paymentStep === 'redirecting' && (
              <div className="py-8 text-center space-y-3">
                <Loader2 className="w-10 h-10 animate-spin mx-auto text-blue-400" />
                <h4 className="font-extrabold text-base sm:text-lg text-white">
                  Opening secure PayMongo GCash checkout...
                </h4>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Official Digital Receipt Modal */}
      {selectedOrderForReceipt && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-black rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl text-zinc-950 relative">
            <button
              type="button"
              onClick={() => setSelectedOrderForReceipt(null)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-black cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="text-center border-b pb-3 flex flex-col items-center">
              <img
                src="/logo/netso-logo.jpg"
                alt="NETSO Prints Logo"
                className="w-12 h-12 rounded-xl object-contain mb-2 border border-zinc-300"
              />
              <h3 className="font-black text-lg text-zinc-950">NETSO PRINTS &amp; ADS</h3>
              <p className="text-xs sm:text-sm text-zinc-600 font-semibold">
                Official Digital Service Receipt
              </p>
            </div>
            <div className="space-y-2.5 font-mono text-xs sm:text-sm">
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-zinc-600">Order ID:</span>
                <strong className="text-black">{selectedOrderForReceipt.id}</strong>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-zinc-600">Customer:</span>
                <span className="font-bold">{selectedOrderForReceipt.customerName}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-zinc-600">Service:</span>
                <span className="font-bold text-right">{selectedOrderForReceipt.service}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-zinc-600">Amount Paid:</span>
                <strong className="text-emerald-700">₱{selectedOrderForReceipt.paidAmount}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600">GCash Ref:</span>
                <span className="text-blue-800 font-bold">
                  {selectedOrderForReceipt.gcashRefNo || 'Settled'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setReceiptDownloaded(true);
                setTimeout(() => {
                  setReceiptDownloaded(false);
                  setSelectedOrderForReceipt(null);
                }, 1000);
              }}
              className="w-full py-3 bg-black text-white font-extrabold uppercase rounded-xl flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer"
            >
              {receiptDownloaded ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Receipt Saved!</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-[#D4A017]" />
                  <span>Download Official Receipt</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomerPortal;