import { notFound } from 'next/navigation';
import { getProduct, products } from '@/data/products';
import { ProductDetail } from '@/components/product/ProductDetail';
export function generateStaticParams(){return products.map(p=>({slug:p.slug}));}
export async function generateMetadata({params}:{params:Promise<{slug:string}>}){const p=getProduct((await params).slug);return {title:p?.name||'Pièce introuvable'};}
export default async function ProductPage({params}:{params:Promise<{slug:string}>}){const p=getProduct((await params).slug);if(!p)notFound();return <main id="main"><ProductDetail product={p}/></main>;}
