import Link from 'next/link';
export default function NotFound(){return <main id="main" className="empty-state"><p className="eyebrow">404 / HORS DU VESTIAIRE</p><h1>Cette pièce nous échappe.</h1><p>Retrouvez votre chemin dans notre collection.</p><Link className="button dark" href="/collection">Explorer le vestiaire ↗</Link></main>;}
