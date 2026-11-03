export type PricingMode = 'tier' | 'area';

export interface PriceTier {
  minQty: number;
  price: number;
}

export interface ServiceOption {
  id: string;
  label: string;
  note: string;
  pricingMode: PricingMode;
  unit: string;
  minQty: number;
  tiers: PriceTier[];
  available: boolean;
}

export interface Quote {
  ok: boolean;
  error?: string;
  unitPrice: number;
  area?: number;
  total: number;
}

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function sortedTiers(tiers: PriceTier[]): PriceTier[] {
  return [...tiers].sort((a, b) => a.minQty - b.minQty);
}

export function tierPrice(option: Pick<ServiceOption, 'tiers'>, qty: number): number {
  const tiers = sortedTiers(option.tiers);
  let price = tiers[0]?.price ?? 0;
  for (const tier of tiers) {
    if (qty >= tier.minQty) price = tier.price;
  }
  return price;
}

export function computeQuote(
  option: ServiceOption,
  input: { qty: number; width?: number; height?: number },
): Quote {
  const qty = Math.floor(Number(input.qty));
  if (!Number.isFinite(qty) || qty < 1) {
    return { ok: false, error: 'Enter a valid quantity.', unitPrice: 0, total: 0 };
  }
  if (qty < option.minQty) {
    return {
      ok: false,
      error: `Minimum order for this option is ${option.minQty}.`,
      unitPrice: 0,
      total: 0,
    };
  }
  if (option.pricingMode === 'area') {
    const width = Number(input.width);
    const height = Number(input.height);
    if (!(width > 0) || !(height > 0)) {
      return { ok: false, error: 'Enter the width and height.', unitPrice: 0, total: 0 };
    }
    const unitPrice = sortedTiers(option.tiers)[0]?.price ?? 0;
    return {
      ok: true,
      unitPrice,
      area: round2(width * height),
      total: round2(width * height * unitPrice * qty),
    };
  }
  const unitPrice = tierPrice(option, qty);
  return { ok: true, unitPrice, total: round2(unitPrice * qty) };
}

export function startingFrom(options: ServiceOption[]): { price: number; unit: string } {
  const usable = options.filter((option) => option.available);
  const pool = usable.length ? usable : options;
  const tierOptions = pool.filter((option) => option.pricingMode === 'tier');
  const source = tierOptions.length ? tierOptions : pool;
  let best: { price: number; unit: string } | null = null;
  for (const option of source) {
    const price =
      option.pricingMode === 'area'
        ? sortedTiers(option.tiers)[0]?.price ?? 0
        : tierPrice(option, option.minQty);
    if (!best || price < best.price) best = { price, unit: option.unit };
  }
  return best ?? { price: 0, unit: 'per pc' };
}

export function describeOption(option: ServiceOption): string {
  const tiers = sortedTiers(option.tiers);
  let text: string;
  if (option.pricingMode === 'area' || tiers.length <= 1) {
    text = `₱${tiers[0]?.price ?? 0} ${option.unit}`;
  } else {
    text = tiers
      .map((tier, index) => {
        const next = tiers[index + 1];
        const range = next
          ? next.minQty - 1 === tier.minQty
            ? `${tier.minQty}`
            : `${tier.minQty}-${next.minQty - 1}`
          : `${tier.minQty}+`;
        return `${range} pcs ₱${tier.price}`;
      })
      .join(' · ');
  }
  return option.minQty > 1 ? `${text} · min ${option.minQty}` : text;
}

export function formatTiers(tiers: PriceTier[]): string {
  return sortedTiers(tiers)
    .map((tier) => `${tier.minQty}:${tier.price}`)
    .join(', ');
}

export function parseTiers(text: string): PriceTier[] | null {
  const parts = text
    .split(/[,\n;]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (!parts.length) return null;
  const tiers: PriceTier[] = [];
  for (const part of parts) {
    const pieces = part.split(':').map((piece) => piece.trim());
    if (pieces.length > 2 || pieces.some((piece) => piece === '')) return null;
    const minQty = pieces.length === 2 ? Number(pieces[0]) : 1;
    const price = Number(pieces.length === 2 ? pieces[1] : pieces[0]);
    if (!Number.isInteger(minQty) || minQty < 1 || !Number.isFinite(price) || price < 0) return null;
    tiers.push({ minQty, price });
  }
  const sorted = sortedTiers(tiers);
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i].minQty === sorted[i - 1].minQty) return null;
  }
  return sorted;
}