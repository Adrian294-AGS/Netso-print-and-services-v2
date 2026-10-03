'use client';

import React, { useState, useRef } from 'react';
import { X, Paperclip, Upload, FileText, Trash2 } from 'lucide-react';
import { SERVICES_LIST, CatalogServiceItem } from '../../data/services';
import { UploadedFile } from '../../types';

const ACCEPTED_EXTENSIONS = ['pdf', 'png', 'jpg', 'jpeg', 'ai', 'psd'];
const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg'];
const MAX_FILE_SIZE_MB = 100;

const getExtension = (fileName: string) => (fileName.split('.').pop() || '').toLowerCase();

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

interface RequestFormProps {
  isOpen: boolean;
  initialService?: CatalogServiceItem | null;
  onClose: () => void;
  onSubmitOrder: (
    service: CatalogServiceItem,
    qty: number,
    notes: string,
    files?: UploadedFile[],
    fileType?: string
  ) => void;
}

export function RequestForm({
  isOpen,
  initialService,
  onClose,
  onSubmitOrder,
}: RequestFormProps) {
  const [selectedService, setSelectedService] = useState<CatalogServiceItem>(
    initialService || SERVICES_LIST[0]
  );
  const [qty, setQty] = useState(1);
  const [fileType, setFileType] = useState('I have ready-to-print artwork file (PDF/PNG)');
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [notes, setNotes] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const addFiles = (incoming: File[]) => {
    const accepted: UploadedFile[] = [];
    incoming.forEach((file) => {
      const ext = getExtension(file.name);
      if (ACCEPTED_EXTENSIONS.includes(ext) && file.size <= MAX_FILE_SIZE_MB * 1024 * 1024) {
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
    if (accepted.length > 0) setFiles((prev) => [...prev, ...accepted]);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white border-2 border-zinc-900 rounded-2xl max-w-lg w-full p-5 sm:p-6 space-y-4 text-zinc-950 shadow-2xl max-h-[92vh] overflow-y-auto relative">
        <button
          type="button"
          onClick={onClose}
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
            <h3 className="font-black text-lg sm:text-xl text-zinc-950">+ Create New Print Order</h3>
            <p className="text-xs sm:text-sm text-zinc-600 font-medium mt-0.5">
              Instant cost calculation and immediate production queue placement.
            </p>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmitOrder(selectedService, qty, notes, files, fileType);
          }}
          className="space-y-4 text-sm"
        >
          <div>
            <label className="font-extrabold text-xs sm:text-sm text-zinc-900 block mb-1.5">
              Select Printing Service
            </label>
            <select
              value={selectedService.id}
              onChange={(e) => {
                const found = SERVICES_LIST.find((s) => s.id === e.target.value);
                if (found) setSelectedService(found);
              }}
              className="w-full border border-zinc-400 bg-white px-3.5 py-2.5 rounded-xl font-bold text-sm sm:text-base text-zinc-950 focus:outline-none focus:ring-2 focus:ring-[#D4A017]"
            >
              {SERVICES_LIST.map((s) => (
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
              value={qty}
              onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full border border-zinc-400 bg-white px-3.5 py-2.5 rounded-xl font-mono font-bold text-sm sm:text-base text-zinc-950 focus:outline-none focus:ring-2 focus:ring-[#D4A017]"
            />
          </div>

          <div>
            <label className="font-extrabold text-xs sm:text-sm text-zinc-900 block mb-1.5">
              Artwork / Layout Readiness
            </label>
            <select
              value={fileType}
              onChange={(e) => setFileType(e.target.value)}
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
            <label className="font-extrabold text-xs sm:text-sm text-zinc-900 flex items-center gap-1.5 mb-1.5">
              <Paperclip className="w-4 h-4 text-[#B8860B]" />
              <span>Upload Your Design Artwork (Optional)</span>
            </label>

            <div
              role="button"
              tabIndex={0}
              onClick={() => inputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  inputRef.current?.click();
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
              className={`cursor-pointer rounded-2xl border-2 border-dashed px-4 py-6 text-center transition-all min-h-[140px] flex flex-col items-center justify-center ${
                isDragging
                  ? 'border-[#B8860B] bg-[#FFF3C4]'
                  : 'border-zinc-400 bg-[#FFFDF7] hover:border-[#B8860B] hover:bg-amber-50/60'
              }`}
            >
              <div className="w-11 h-11 rounded-full bg-amber-100 text-[#B8860B] flex items-center justify-center mb-2">
                <Upload className="w-5 h-5" />
              </div>
              <p className="font-extrabold text-sm sm:text-base text-zinc-900">
                Drag &amp; drop design files or tap to browse
              </p>
              <span className="font-bold underline text-xs sm:text-sm text-[#B8860B] mt-0.5">
                Choose from device
              </span>
              <p className="mt-1.5 text-xs font-medium text-zinc-500">
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

            {files.length > 0 && (
              <ul className="space-y-2 mt-2">
                {files.map((f) => (
                  <li
                    key={f.id}
                    className="flex items-center gap-3 rounded-xl border border-zinc-300 bg-white p-3 text-zinc-900"
                  >
                    <FileText className="w-5 h-5 text-[#D4A017] shrink-0" />
                    <div className="min-w-0 flex-1 text-left">
                      <p className="font-bold truncate text-sm">{f.name}</p>
                      <p className="text-xs text-zinc-500">
                        {f.ext.toUpperCase()} · {formatBytes(f.size)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFiles((prev) => prev.filter((item) => item.id !== f.id))}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <label className="font-extrabold text-xs sm:text-sm text-zinc-900 block mb-1.5">
              Special Instructions / Dimensions
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
              ₱{(selectedService.basePrice * qty).toLocaleString()}
            </span>
          </div>

          <div className="flex items-center gap-2.5 pt-1">
            <button
              type="submit"
              className="flex-1 py-3 px-4 bg-[#D4A017] hover:bg-[#B8860B] text-black font-extrabold uppercase rounded-xl border border-black text-xs sm:text-sm cursor-pointer transition-colors shadow-xs"
            >
              SUBMIT &amp; PROCEED TO GCASH
            </button>
            <button
              type="button"
              onClick={onClose}
              className="py-3 px-5 bg-white hover:bg-zinc-100 text-zinc-900 font-extrabold uppercase rounded-xl border border-zinc-400 text-xs sm:text-sm cursor-pointer transition-colors"
            >
              CANCEL
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RequestForm;
