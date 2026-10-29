import React, { useEffect, useState } from 'react';
import {
  Printer,
  Check,
  Plus,
  Trash2,
  Edit3,
} from 'lucide-react';
import { SERVICES_LIST, CatalogServiceItem } from '../../../data/services';
import { FontSizeLevel } from '../../../types';

interface ServiceManagementProps {
  highContrastMode: boolean;
  fontSizeLevel: FontSizeLevel;
}

export function ServiceManagement({
  highContrastMode,
  fontSizeLevel,
}: ServiceManagementProps) {
  const [services, setServices] = useState<CatalogServiceItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState<number>(0);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingDetailsId, setEditingDetailsId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    category: 'Document',
    basePrice: '',
    unit: '',
    description: '',
    popularFor: '',
    turnaround: '',
  });
  const [saving, setSaving] = useState(false);
  const [newService, setNewService] = useState({
    name: '',
    category: 'Document',
    basePrice: '',
    unit: 'per page',
    description: '',
    popularFor: '',
    turnaround: 'Same Day',
  });

  useEffect(() => {
    let active = true;
    void fetch('/api/services')
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Unable to load services.');
        const original = new Map(SERVICES_LIST.map((service) => [service.id, service]));
        const current = result.services.flatMap((service: {
          id: string;
          name: string;
          category: CatalogServiceItem['category'];
          basePrice: number;
          unit: string;
          description: string;
          popularFor: string;
          turnaround: string;
          available: boolean;
        }) => {
          const fallback = original.get(service.id);
          return [{ ...fallback, ...service, icon: fallback?.icon ?? Printer }];
        });
        if (active) setServices(current);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load services.');
      });
    return () => {
      active = false;
    };
  }, []);

  const updateService = async (id: string, update: { basePrice?: number; available?: boolean }) => {
    setError('');
    try {
      const response = await fetch('/api/services', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...update }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to save service changes.');
      setServices((prev) =>
        prev.map((service) => (service.id === id ? { ...service, ...update } : service))
      );
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Unable to save service changes.');
    }
  };

  const addService = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    const price = Number(newService.basePrice);
    if (!Number.isFinite(price) || price < 0) {
      setError('Enter a valid price.');
      return;
    }
    setSaving(true);
    try {
      const response = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newService.name,
          category: newService.category,
          basePrice: price,
          unit: newService.unit,
          description: newService.description,
          popularFor: newService.popularFor.trim() || undefined,
          turnaround: newService.turnaround,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to add service.');
      setServices((prev) => [
        ...prev,
        {
          id: result.id,
          name: newService.name.trim(),
          category: newService.category as CatalogServiceItem['category'],
          icon: Printer,
          basePrice: price,
          unit: newService.unit.trim(),
          description: newService.description.trim(),
          popularFor: newService.popularFor.trim(),
          turnaround: newService.turnaround.trim(),
          available: true,
        },
      ]);
      setNewService({
        name: '',
        category: 'Document',
        basePrice: '',
        unit: 'per page',
        description: '',
        popularFor: '',
        turnaround: 'Same Day',
      });
      setShowAddForm(false);
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : 'Unable to add service.');
    } finally {
      setSaving(false);
    }
  };

  const startEditDetails = (srv: CatalogServiceItem) => {
    setError('');
    setShowAddForm(false);
    setEditingDetailsId(srv.id);
    setEditForm({
      name: srv.name,
      category: srv.category,
      basePrice: String(srv.basePrice),
      unit: srv.unit,
      description: srv.description,
      popularFor: srv.popularFor,
      turnaround: srv.turnaround,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const saveEditedService = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingDetailsId) return;
    setError('');
    const price = Number(editForm.basePrice);
    if (!Number.isFinite(price) || price < 0) {
      setError('Enter a valid price.');
      return;
    }
    setSaving(true);
    try {
      const response = await fetch('/api/services', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingDetailsId,
          name: editForm.name,
          category: editForm.category,
          basePrice: price,
          unit: editForm.unit,
          description: editForm.description,
          popularFor: editForm.popularFor.trim(),
          turnaround: editForm.turnaround,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to save service details.');
      setServices((prev) =>
        prev.map((service) =>
          service.id === editingDetailsId
            ? {
                ...service,
                name: editForm.name.trim(),
                category: editForm.category as CatalogServiceItem['category'],
                basePrice: price,
                unit: editForm.unit.trim(),
                description: editForm.description.trim(),
                popularFor: editForm.popularFor.trim(),
                turnaround: editForm.turnaround.trim(),
              }
            : service
        )
      );
      setEditingDetailsId(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save service details.');
    } finally {
      setSaving(false);
    }
  };

  const deleteService = async (srv: CatalogServiceItem) => {
    if (!window.confirm(`Delete "${srv.name}"? This cannot be undone.`)) return;
    setError('');
    try {
      const response = await fetch(`/api/services?id=${encodeURIComponent(srv.id)}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to delete service.');
      setServices((prev) => prev.filter((item) => item.id !== srv.id));
      if (editingDetailsId === srv.id) setEditingDetailsId(null);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete service.');
    }
  };

  const handleSavePrice = (id: string) => {
    void updateService(id, { basePrice: tempPrice });
    setEditingId(null);
  };

  const toggleAvailability = (id: string) => {
    const service = services.find((item) => item.id === id);
    if (service) void updateService(id, { available: service.available === false });
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="border-b border-[#D4A017] pb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1
            className={`font-black ${
              highContrastMode ? 'text-white' : 'text-zinc-950'
            } ${
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
            Configure base unit pricing, estimated turnaround times, and service availability for customer orders.
          </p>
        </div>
      </div>

      <div>
        <button
          type="button"
          onClick={() => setShowAddForm((open) => !open)}
          className="px-4 py-2 bg-[#D4A017] text-black font-extrabold text-sm rounded-xl border border-black flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{showAddForm ? 'Cancel' : 'Add Service'}</span>
        </button>
      </div>

      {showAddForm && (
        <form
          onSubmit={addService}
          className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl border border-[#D4A017] bg-white text-zinc-950"
        >
          <input
            required
            maxLength={150}
            placeholder="Service name"
            value={newService.name}
            onChange={(e) => setNewService({ ...newService, name: e.target.value })}
            className="border border-zinc-300 rounded-lg px-3 py-2 text-sm"
          />
          <select
            value={newService.category}
            onChange={(e) => setNewService({ ...newService, category: e.target.value })}
            className="border border-zinc-300 rounded-lg px-3 py-2 text-sm bg-white"
          >
            {['Document', 'Photo & ID', 'Large Format', 'Signage', 'Merch & Gifts', 'Marketing'].map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <input
            required
            type="number"
            min={0}
            step="0.01"
            placeholder="Price (PHP)"
            value={newService.basePrice}
            onChange={(e) => setNewService({ ...newService, basePrice: e.target.value })}
            className="border border-zinc-300 rounded-lg px-3 py-2 text-sm"
          />
          <input
            required
            maxLength={40}
            placeholder="Unit (e.g. per page, per sq.ft)"
            value={newService.unit}
            onChange={(e) => setNewService({ ...newService, unit: e.target.value })}
            className="border border-zinc-300 rounded-lg px-3 py-2 text-sm"
          />
          <input
            required
            maxLength={40}
            placeholder="Turnaround (e.g. Same Day)"
            value={newService.turnaround}
            onChange={(e) => setNewService({ ...newService, turnaround: e.target.value })}
            className="border border-zinc-300 rounded-lg px-3 py-2 text-sm"
          />
          <input
            maxLength={100}
            placeholder="Popular for (optional)"
            value={newService.popularFor}
            onChange={(e) => setNewService({ ...newService, popularFor: e.target.value })}
            className="border border-zinc-300 rounded-lg px-3 py-2 text-sm"
          />
          <textarea
            required
            maxLength={1000}
            placeholder="Description"
            value={newService.description}
            onChange={(e) => setNewService({ ...newService, description: e.target.value })}
            className="sm:col-span-2 border border-zinc-300 rounded-lg px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={saving}
            className="sm:col-span-2 px-4 py-2 bg-[#D4A017] text-black font-extrabold text-sm rounded-xl border border-black cursor-pointer disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Service'}
          </button>
        </form>
      )}

      {editingDetailsId && (
        <form
          onSubmit={saveEditedService}
          className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl border border-[#D4A017] bg-white text-zinc-950"
        >
          <h2 className="sm:col-span-2 font-extrabold text-sm">Edit Service Details</h2>
          <input
            required
            maxLength={150}
            placeholder="Service name"
            value={editForm.name}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            className="border border-zinc-300 rounded-lg px-3 py-2 text-sm"
          />
          <select
            value={editForm.category}
            onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
            className="border border-zinc-300 rounded-lg px-3 py-2 text-sm bg-white"
          >
            {['Document', 'Photo & ID', 'Large Format', 'Signage', 'Merch & Gifts', 'Marketing'].map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <input
            required
            type="number"
            min={0}
            step="0.01"
            placeholder="Price (PHP)"
            value={editForm.basePrice}
            onChange={(e) => setEditForm({ ...editForm, basePrice: e.target.value })}
            className="border border-zinc-300 rounded-lg px-3 py-2 text-sm"
          />
          <input
            required
            maxLength={40}
            placeholder="Unit (e.g. per page, per sq.ft)"
            value={editForm.unit}
            onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
            className="border border-zinc-300 rounded-lg px-3 py-2 text-sm"
          />
          <input
            required
            maxLength={40}
            placeholder="Turnaround (e.g. Same Day)"
            value={editForm.turnaround}
            onChange={(e) => setEditForm({ ...editForm, turnaround: e.target.value })}
            className="border border-zinc-300 rounded-lg px-3 py-2 text-sm"
          />
          <input
            maxLength={100}
            placeholder="Popular for (optional)"
            value={editForm.popularFor}
            onChange={(e) => setEditForm({ ...editForm, popularFor: e.target.value })}
            className="border border-zinc-300 rounded-lg px-3 py-2 text-sm"
          />
          <textarea
            required
            maxLength={1000}
            placeholder="Description"
            value={editForm.description}
            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
            className="sm:col-span-2 border border-zinc-300 rounded-lg px-3 py-2 text-sm"
          />
          <div className="sm:col-span-2 flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-[#D4A017] text-black font-extrabold text-sm rounded-xl border border-black cursor-pointer disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={() => setEditingDetailsId(null)}
              className="px-4 py-2 bg-zinc-100 text-zinc-900 font-extrabold text-sm rounded-xl border border-zinc-300 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {error && <p role="alert" className="rounded-xl border border-red-400 bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {services.map((srv) => {
          const Icon = srv.icon || Printer;
          const isAvailable = srv.available !== false;
          return (
            <div
              key={srv.id}
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
                      <h3 className="font-extrabold text-sm sm:text-base leading-tight">
                        {srv.name}
                      </h3>
                      <span className="text-xs text-zinc-500 font-semibold">
                        {srv.category} · {srv.turnaround}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleAvailability(srv.id)}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border cursor-pointer ${
                      isAvailable
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-red-100 text-red-800 border-red-300'
                    }`}
                  >
                    {isAvailable ? 'Accepting Orders' : 'Paused'}
                  </button>
                </div>

                <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                  {srv.description}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => startEditDetails(srv)}
                  className="px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-amber-100 text-zinc-900 font-extrabold text-xs border border-zinc-300 flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-[#B8860B]" />
                  <span>Edit Details</span>
                </button>
                <button
                  type="button"
                  onClick={() => void deleteService(srv)}
                  className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-800 font-extrabold text-xs border border-red-300 flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>

              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2">
                {editingId === srv.id ? (
                  <div className="flex items-center gap-1.5 w-full">
                    <input
                      type="number"
                      min={1}
                      value={tempPrice}
                      onChange={(e) => setTempPrice(Number(e.target.value) || 1)}
                      className="w-24 border border-[#D4A017] rounded-lg px-2 py-1 font-mono font-bold text-xs text-zinc-950 bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => handleSavePrice(srv.id)}
                      className="px-3 py-1 bg-[#D4A017] text-black font-extrabold text-xs rounded-lg border border-black flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Save</span>
                    </button>
                  </div>
                ) : (
                  <>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-zinc-500 block">
                        Base Service Rate
                      </span>
                      <span className="font-mono font-black text-base text-[#B8860B]">
                        ₱{srv.basePrice}{' '}
                        <span className="text-xs font-sans text-zinc-500">{srv.unit}</span>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(srv.id);
                        setTempPrice(srv.basePrice);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-amber-100 text-zinc-900 font-extrabold text-xs border border-zinc-300 flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-[#B8860B]" />
                      <span>Edit Rate</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ServiceManagement;
