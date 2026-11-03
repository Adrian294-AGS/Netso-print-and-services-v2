'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, Trash2, Edit3 } from 'lucide-react';
import { FontSizeLevel } from '../../../types';
import {
  describeOption,
  formatTiers,
  parseTiers,
  type PricingMode,
  type ServiceOption,
} from '@/lib/pricing';
import { ICON_NAMES, iconFor } from '@/lib/service-icons';

interface ServiceManagementProps {
  highContrastMode: boolean;
  fontSizeLevel: FontSizeLevel;
}

interface AdminService {
  id: string;
  name: string;
  category: string;
  iconName: string | null;
  basePrice: number;
  unit: string;
  description: string;
  popularFor: string;
  turnaround: string;
  available: boolean;
  options: ServiceOption[];
}

interface OptionForm {
  key: string;
  id?: string;
  label: string;
  note: string;
  pricingMode: PricingMode;
  unit: string;
  minQty: string;
  tiersText: string;
  available: boolean;
}

interface ServiceForm {
  id?: string;
  name: string;
  category: string;
  iconName: string;
  turnaround: string;
  popularFor: string;
  description: string;
  options: OptionForm[];
}

const CATEGORIES = ['Document', 'Photo & ID', 'Large Format', 'Signage', 'Merch & Gifts', 'Marketing'];
const UNIT_SUGGESTIONS = ['per pc', 'per set', 'per sheet', 'per sq.ft', 'per sq.in'];
const INPUT = 'border border-zinc-300 rounded-lg px-3 py-2 text-sm bg-white text-zinc-950';

export function ServiceManagement({
  highContrastMode,
  fontSizeLevel,
}: ServiceManagementProps) {
  const [services, setServices] = useState<AdminService[]>([]);
  const [form, setForm] = useState<ServiceForm | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const keyCounter = useRef(0);

  const nextKey = () => {
    keyCounter.current += 1;
    return `opt-${keyCounter.current}`;
  };

  const blankOption = (): OptionForm => ({
    key: nextKey(),
    label: '',
    note: '',
    pricingMode: 'tier',
    unit: 'per pc',
    minQty: '1',
    tiersText: '',
    available: true,
  });

  const optionToForm = (option: ServiceOption): OptionForm => ({
    key: nextKey(),
    id: option.id,
    label: option.label,
    note: option.note,
    pricingMode: option.pricingMode,
    unit: option.unit,
    minQty: String(option.minQty),
    tiersText: formatTiers(option.tiers),
    available: option.available,
  });

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/services');
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to load services.');
      setServices(result.services as AdminService[]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load services.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openAdd = () => {
    setError('');
    setForm({
      name: '',
      category: 'Document',
      iconName: 'Printer',
      turnaround: 'Same Day',
      popularFor: '',
      description: '',
      options: [blankOption()],
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openEdit = (service: AdminService) => {
    setError('');
    setForm({
      id: service.id,
      name: service.name,
      category: service.category,
      iconName: service.iconName ?? 'Printer',
      turnaround: service.turnaround,
      popularFor: service.popularFor,
      description: service.description,
      options: service.options.length ? service.options.map(optionToForm) : [blankOption()],
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const patchOption = (index: number, patch: Partial<OptionForm>) => {
    setForm((current) =>
      current
        ? {
            ...current,
            options: current.options.map((option, i) => (i === index ? { ...option, ...patch } : option)),
          }
        : current,
    );
  };

  const addOption = () => {
    setForm((current) => (current ? { ...current, options: [...current.options, blankOption()] } : current));
  };

  const removeOption = (index: number) => {
    setForm((current) =>
      current && current.options.length > 1
        ? { ...current, options: current.options.filter((_, i) => i !== index) }
        : current,
    );
  };

  const saveService = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form) return;
    setError('');
    const options = [];
    for (let index = 0; index < form.options.length; index += 1) {
      const option = form.options[index];
      const label = option.label.trim();
      if (!label) {
        setError(`Option ${index + 1} needs a name.`);
        return;
      }
      const tiers = parseTiers(option.tiersText);
      if (!tiers) {
        setError(`"${label}" has invalid prices. Use quantity:price pairs like 1:150, 6:100, or just one price.`);
        return;
      }
      const minQty = Number(option.minQty);
      if (!Number.isInteger(minQty) || minQty < 1) {
        setError(`"${label}" needs a whole-number minimum quantity of 1 or more.`);
        return;
      }
      if (!option.unit.trim()) {
        setError(`"${label}" needs a unit (for example per pc).`);
        return;
      }
      options.push({
        id: option.id,
        label,
        note: option.note.trim() || undefined,
        pricingMode: option.pricingMode,
        unit: option.unit.trim(),
        minQty,
        tiers,
        available: option.available,
      });
    }
    setSaving(true);
    try {
      const response = await fetch('/api/services', {
        method: form.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: form.id,
          name: form.name,
          category: form.category,
          iconName: form.iconName,
          turnaround: form.turnaround,
          popularFor: form.popularFor.trim() || undefined,
          description: form.description,
          options,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to save service.');
      setForm(null);
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save service.');
    } finally {
      setSaving(false);
    }
  };

  const deleteService = async (service: AdminService) => {
    if (!window.confirm(`Delete "${service.name}"? This cannot be undone.`)) return;
    setError('');
    try {
      const response = await fetch(`/api/services?id=${encodeURIComponent(service.id)}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to delete service.');
      setServices((prev) => prev.filter((item) => item.id !== service.id));
      if (form?.id === service.id) setForm(null);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete service.');
    }
  };

  const toggleAvailability = async (service: AdminService) => {
    setError('');
    try {
      const response = await fetch('/api/services', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: service.id, available: !service.available }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to save service changes.');
      setServices((prev) =>
        prev.map((item) => (item.id === service.id ? { ...item, available: !item.available } : item)),
      );
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Unable to save service changes.');
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="border-b border-[#D4A017] pb-3">
        <h1
          className={`font-black ${highContrastMode ? 'text-white' : 'text-zinc-950'} ${
            fontSizeLevel === 'xlarge'
              ? 'text-2xl sm:text-3xl'
              : fontSizeLevel === 'reduced'
              ? 'text-lg sm:text-xl'
              : 'text-xl sm:text-2xl'
          }`}
        >
          Service Catalog & Rate Management
        </h1>
        <p
          className={`font-medium mt-0.5 ${
            highContrastMode ? 'text-zinc-300' : 'text-zinc-600'
          } ${fontSizeLevel === 'xlarge' ? 'text-base' : 'text-xs sm:text-sm'}`}
        >
          Each service has options (sizes or packages). Every option has its own price tiers, minimum order, and unit, matching the shop rate sheets.
        </p>
      </div>

      <div>
        <button
          type="button"
          onClick={() => (form ? setForm(null) : openAdd())}
          className="px-4 py-2 bg-[#D4A017] text-black font-extrabold text-sm rounded-xl border border-black flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{form ? 'Close Editor' : 'Add Service'}</span>
        </button>
      </div>

      {form && (
        <form
          onSubmit={saveService}
          className="space-y-3 p-4 rounded-2xl border border-[#D4A017] bg-white text-zinc-950"
        >
          <h2 className="font-extrabold text-sm">{form.id ? 'Edit Service' : 'Add Service'}</h2>
          <datalist id="unit-suggestions">
            {UNIT_SUGGESTIONS.map((unit) => (
              <option key={unit} value={unit} />
            ))}
          </datalist>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              required
              maxLength={150}
              placeholder="Service name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={INPUT}
            />
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className={INPUT}
            >
              {CATEGORIES.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <input
              required
              maxLength={40}
              placeholder="Turnaround (e.g. Same Day)"
              value={form.turnaround}
              onChange={(e) => setForm({ ...form, turnaround: e.target.value })}
              className={INPUT}
            />
            <input
              maxLength={100}
              placeholder="Popular for (optional)"
              value={form.popularFor}
              onChange={(e) => setForm({ ...form, popularFor: e.target.value })}
              className={INPUT}
            />
            <select
              value={form.iconName}
              onChange={(e) => setForm({ ...form, iconName: e.target.value })}
              className={INPUT}
            >
              {ICON_NAMES.map((name) => (
                <option key={name} value={name}>
                  Icon: {name}
                </option>
              ))}
            </select>
            <textarea
              required
              maxLength={1000}
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className={`sm:col-span-2 ${INPUT}`}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm">Options, sizes and prices</h3>
              <button
                type="button"
                onClick={addOption}
                className="px-3 py-1.5 bg-zinc-100 hover:bg-amber-100 text-zinc-900 font-extrabold text-xs rounded-xl border border-zinc-300 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Option</span>
              </button>
            </div>
            <p className="text-xs text-zinc-600">
              Prices: type quantity:price pairs, for example 1:150, 6:100, 11:90 (6 or more pieces cost 100 each). One flat price can be typed as just 150. For per-area pricing, choose Per area and type the rate per sq.ft or sq.in.
            </p>
            {form.options.map((option, index) => (
              <div key={option.key} className="grid grid-cols-1 sm:grid-cols-6 gap-2 p-3 rounded-xl border border-zinc-200 bg-zinc-50">
                <input
                  required
                  maxLength={150}
                  placeholder="Option name (e.g. 3x4 ft)"
                  value={option.label}
                  onChange={(e) => patchOption(index, { label: e.target.value })}
                  className={`sm:col-span-3 ${INPUT}`}
                />
                <select
                  value={option.pricingMode}
                  onChange={(e) => {
                    const mode = e.target.value as PricingMode;
                    patchOption(index, {
                      pricingMode: mode,
                      unit: mode === 'area' && !option.unit.includes('sq') ? 'per sq.ft' : option.unit,
                    });
                  }}
                  className={`sm:col-span-3 ${INPUT}`}
                >
                  <option value="tier">Fixed / quantity price</option>
                  <option value="area">Per area (width x height)</option>
                </select>
                <input
                  required
                  list="unit-suggestions"
                  maxLength={40}
                  placeholder="Unit (per pc)"
                  value={option.unit}
                  onChange={(e) => patchOption(index, { unit: e.target.value })}
                  className={`sm:col-span-2 ${INPUT}`}
                />
                <input
                  required
                  type="number"
                  min={1}
                  step={1}
                  placeholder="Min qty"
                  value={option.minQty}
                  onChange={(e) => patchOption(index, { minQty: e.target.value })}
                  className={`sm:col-span-1 ${INPUT}`}
                />
                <input
                  required
                  placeholder={option.pricingMode === 'area' ? 'Rate (e.g. 1.75)' : 'Prices (e.g. 1:150, 6:100)'}
                  value={option.tiersText}
                  onChange={(e) => patchOption(index, { tiersText: e.target.value })}
                  className={`sm:col-span-3 ${INPUT}`}
                />
                <input
                  maxLength={255}
                  placeholder="Note shown to customers (optional)"
                  value={option.note}
                  onChange={(e) => patchOption(index, { note: e.target.value })}
                  className={`sm:col-span-4 ${INPUT}`}
                />
                <label className="sm:col-span-1 flex items-center gap-1.5 text-xs font-bold text-zinc-800">
                  <input
                    type="checkbox"
                    checked={option.available}
                    onChange={(e) => patchOption(index, { available: e.target.checked })}
                  />
                  Available
                </label>
                <button
                  type="button"
                  onClick={() => removeOption(index)}
                  disabled={form.options.length <= 1}
                  className="sm:col-span-1 px-2 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-800 font-extrabold text-xs border border-red-300 flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-[#D4A017] text-black font-extrabold text-sm rounded-xl border border-black cursor-pointer disabled:opacity-60"
            >
              {saving ? 'Saving...' : form.id ? 'Save Changes' : 'Save Service'}
            </button>
            <button
              type="button"
              onClick={() => setForm(null)}
              className="px-4 py-2 bg-zinc-100 text-zinc-900 font-extrabold text-sm rounded-xl border border-zinc-300 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {error && (
        <p role="alert" className="rounded-xl border border-red-400 bg-red-50 p-3 text-sm font-semibold text-red-800">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        {services.map((service) => {
          const Icon = iconFor(service.iconName);
          return (
            <div
              key={service.id}
              className={`p-4 rounded-2xl border space-y-3 flex flex-col justify-between shadow-xs ${
                highContrastMode
                  ? 'bg-zinc-900 border-zinc-700 text-white'
                  : 'bg-white border-zinc-300 text-zinc-950'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-300 text-[#B8860B] flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm sm:text-base leading-tight">{service.name}</h3>
                      <span className="text-xs text-zinc-500 font-semibold">
                        {service.category} · {service.turnaround}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void toggleAvailability(service)}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border cursor-pointer ${
                      service.available
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-red-100 text-red-800 border-red-300'
                    }`}
                  >
                    {service.available ? 'Accepting Orders' : 'Paused'}
                  </button>
                </div>
                <p className="text-xs text-zinc-600 leading-relaxed">{service.description}</p>

                {service.options.length > 0 ? (
                  <ul className="space-y-1 max-h-56 overflow-y-auto pr-1">
                    {service.options.map((option) => (
                      <li
                        key={option.id}
                        className={`text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5 border-b border-zinc-100 pb-1 ${
                          option.available ? '' : 'opacity-50'
                        }`}
                      >
                        <span className="font-bold">{option.label}</span>
                        <span className="font-mono font-black text-[#B8860B]">{describeOption(option)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs font-semibold text-amber-800">
                    No options yet. Edit this service to add sizes and prices.
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(service)}
                  className="px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-amber-100 text-zinc-900 font-extrabold text-xs border border-zinc-300 flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-[#B8860B]" />
                  <span>Edit Service &amp; Rates</span>
                </button>
                <button
                  type="button"
                  onClick={() => void deleteService(service)}
                  className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-800 font-extrabold text-xs border border-red-300 flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ServiceManagement;