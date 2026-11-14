import type {FittingSelection} from '@/data/prepared-looks';
import type {Product} from '@/types/product';

export type WardrobeSlot = 'top' | 'bottom' | 'outer' | 'full' | 'bag' | 'scarf';
export type Wardrobe = Partial<Record<WardrobeSlot, FittingSelection>>;
export const wardrobeSlots: WardrobeSlot[] = ['top', 'bottom', 'outer', 'full', 'bag', 'scarf'];

export function wardrobeSlot(product: Product): WardrobeSlot {
  switch (product.category) {
    case 'Robes': case 'Ensembles': return 'full';
    case 'Pantalons': return 'bottom';
    case 'Vestes': return 'outer';
    case 'Accessoires': return product.id === 'edit-23' ? 'scarf' : 'bag';
    default: return 'top';
  }
}

export function addToWardrobe(wardrobe: Wardrobe, product: Product, color: string): Wardrobe {
  const next = {...wardrobe};
  const slot = wardrobeSlot(product);
  // A dress or coordinated set occupies both the top and bottom positions.
  if (slot === 'full') {
    delete next.top;
    delete next.bottom;
  }
  if (slot === 'top' || slot === 'bottom') delete next.full;
  next[slot] = {productId: product.id, color};
  return next;
}

