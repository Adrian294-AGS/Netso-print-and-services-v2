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
} from 'lucide-react';
import { Service } from '../types';

export const services: Service[] = [
  {
    id: 1,
    name: 'Tarpaulin Banner',
    description: 'Heavy-duty outdoor event banners, birthday backdrops & billboard prints with metal eyelets.',
    price: 18,
    icon: 'FileText',
  },
  {
    id: 2,
    name: 'Sticker Printing & Decals',
    description: 'Waterproof vinyl, glossy/matte die-cut labels for product packaging, bottles & vehicles.',
    price: 25,
    icon: 'Sticker',
  },
  {
    id: 3,
    name: 'Rush ID Photos',
    description: 'Package includes 1x1, 2x2 & Passport size photos with formal attire edit & digital copy.',
    price: 80,
    icon: 'UserCheck',
  },
  {
    id: 4,
    name: 'Sintra Board Signages',
    description: '3mm / 5mm rigid waterproof board mounting for menu boards, exhibits & wall decor.',
    price: 120,
    icon: 'Layers',
  },
  {
    id: 5,
    name: 'Doc Printing & Xerox',
    description: 'High-speed black & white and full-color document printing for thesis, reports & legal forms.',
    price: 2,
    icon: 'Printer',
  },
  {
    id: 6,
    name: 'Photo Printing',
    description: 'Premium glossy or satin photo printouts in 4R, 5R, 8R, A4, and poster sizes.',
    price: 15,
    icon: 'Image',
  },
  {
    id: 7,
    name: 'PVC Cards & Lamination',
    description: 'Durable plastic school/company IDs, membership cards, and hot pouch paper lamination.',
    price: 50,
    icon: 'CreditCard',
  },
  {
    id: 8,
    name: 'Sublimation Mugs & Giveaways',
    description: 'Personalized ceramic white mugs, magic heat-change mugs, and tumblers with custom artwork.',
    price: 150,
    icon: 'Coffee',
  },
  {
    id: 9,
    name: 'Flyers & Marketing Brochures',
    description: 'Full-color promotional flyers, bi-fold/tri-fold brochures on glossy art paper.',
    price: 8,
    icon: 'Copy',
  },
];

export interface CatalogServiceItem {
  id: string;
  name: string;
  category: 'Document' | 'Photo & ID' | 'Large Format' | 'Signage' | 'Merch & Gifts' | 'Marketing';
  icon: any;
  basePrice: number;
  unit: string;
  description: string;
  popularFor: string;
  turnaround: string;
  available?: boolean;
}

export const SERVICES_LIST: CatalogServiceItem[] = [
  {
    id: 'tarpaulin',
    name: 'Tarpaulin Banner',
    category: 'Large Format',
    icon: FileText,
    basePrice: 18,
    unit: 'per sq.ft',
    description: 'Heavy-duty outdoor event banners, birthday backdrops & billboard prints with metal eyelets.',
    popularFor: 'Events & Business Signs',
    turnaround: 'Same Day',
    available: true,
  },
  {
    id: 'sticker',
    name: 'Sticker Printing & Decals',
    category: 'Large Format',
    icon: Sticker,
    basePrice: 25,
    unit: 'per sq.ft',
    description: 'Waterproof vinyl, glossy/matte die-cut labels for product packaging, bottles & vehicles.',
    popularFor: 'Products & Branding',
    turnaround: '24 Hours',
    available: true,
  },
  {
    id: 'rush-id',
    name: 'Rush ID Photos',
    category: 'Photo & ID',
    icon: UserCheck,
    basePrice: 80,
    unit: 'per set (6pcs)',
    description: 'Package includes 1x1, 2x2 & Passport size photos with formal attire edit & digital copy.',
    popularFor: 'Students & Applicants',
    turnaround: '15 Minutes',
    available: true,
  },
  {
    id: 'sintra',
    name: 'Sintra Board Signages',
    category: 'Signage',
    icon: Layers,
    basePrice: 120,
    unit: 'per sq.ft',
    description: '3mm / 5mm rigid waterproof board mounting for menu boards, exhibits & wall decor.',
    popularFor: 'Stores & Restaurants',
    turnaround: '1-2 Days',
    available: true,
  },
  {
    id: 'print',
    name: 'Doc Printing & Xerox',
    category: 'Document',
    icon: Printer,
    basePrice: 2,
    unit: 'per page',
    description: 'High-speed black & white and full-color document printing for thesis, reports & legal forms.',
    popularFor: 'Students & Offices',
    turnaround: 'Instant',
    available: true,
  },
  {
    id: 'photo',
    name: 'Photo Printing',
    category: 'Photo & ID',
    icon: Image,
    basePrice: 15,
    unit: 'per photo',
    description: 'Premium glossy or satin photo printouts in 4R, 5R, 8R, A4, and poster sizes.',
    popularFor: 'Memories & Framing',
    turnaround: 'Same Day',
    available: true,
  },
  {
    id: 'pvc-lamination',
    name: 'PVC Cards & Lamination',
    category: 'Photo & ID',
    icon: CreditCard,
    basePrice: 50,
    unit: 'per piece',
    description: 'Durable plastic school/company IDs, membership cards, and hot pouch paper lamination.',
    popularFor: 'Schools & Corporate',
    turnaround: '24 Hours',
    available: true,
  },
  {
    id: 'mugs',
    name: 'Sublimation Mugs & Giveaways',
    category: 'Merch & Gifts',
    icon: Coffee,
    basePrice: 150,
    unit: 'per mug',
    description: 'Personalized ceramic white mugs, magic heat-change mugs, and tumblers with custom artwork.',
    popularFor: 'Gifts & Souvenirs',
    turnaround: '1-2 Days',
    available: true,
  },
  {
    id: 'flyers',
    name: 'Flyers & Marketing Brochures',
    category: 'Marketing',
    icon: Copy,
    basePrice: 8,
    unit: 'per piece',
    description: 'Full-color promotional flyers, bi-fold/tri-fold brochures on glossy art paper.',
    popularFor: 'Promotions & Campaign',
    turnaround: '1-2 Days',
    available: true,
  },
];
