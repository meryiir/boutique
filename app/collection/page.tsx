import { Suspense } from 'react';
import { Catalog } from '@/components/catalog/Catalog';
export const metadata={title:'La collection'};
export default function Collection(){return <main id="main"><Suspense fallback={<div className="section-pad"><h1>La collection.</h1><p>Préparation du vestiaire…</p></div>}><Catalog/></Suspense></main>;}
