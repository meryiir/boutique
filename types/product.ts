export type Color = { name: string; hex: string; image: string; back?: string; garment?: string };
export type Product = { id: string; slug: string; name: string; category: string; gender: 'Femme' | 'Homme' | 'Mixte'; collection: string; price: number; description: string; colors: Color[]; sizes: string[]; stock: number; composition: string; care: string; status: string; media: 'concept' | 'illustration'; variants: { color: string; size: string; stock: number }[] };
export type CartLine = { productId: string; color: string; size: string; quantity: number };
