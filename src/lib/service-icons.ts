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
  type LucideIcon,
} from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  Printer,
  Copy,
  UserCheck,
  Sticker,
  Image,
  CreditCard,
  Layers,
  Coffee,
  FileText,
};

export const ICON_NAMES = Object.keys(ICONS);

export function iconFor(name?: string | null, fallback?: LucideIcon): LucideIcon {
  return (name && ICONS[name]) || fallback || Printer;
}