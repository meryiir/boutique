'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, MoveHorizontal, ArrowUpRight } from 'lucide-react';
import { GarmentViewer } from './GarmentViewer';
import { products } from '@/data/products';
import { money } from '@/data/brand';

const rack = products.filter(p => p.collection === 'Édition Hoodie').map(p => ({
  index: products.findIndex(item => item.id === p.id), garment: p.colors[0].garment!,
}));
export function InteractiveClothingRack() {
  const router = useRouter();
  const [active, setActive] = useState(-1);
  const [selected, setSelected] = useState(0);
  const [visible, setVisible] = useState(false);
  const [mobile, setMobile] = useState(false);
  const section = useRef<HTMLElement>(null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => {
    const media = matchMedia('(max-width: 700px)');
    setMobile(media.matches);
    const change = () => { setMobile(media.matches); setActive(-1); };
    media.addEventListener('change', change);
    const observer = new IntersectionObserver(entries => setVisible(entries[0].isIntersecting), { rootMargin: '150px' });
    if (section.current) observer.observe(section.current);
    return () => { media.removeEventListener('change', change); observer.disconnect(); };
  }, []);
  function choose(i: number, scroll = false) {
    const index = (i + rack.length) % rack.length;
    setSelected(index); setActive(index);
    if (scroll) buttons.current[index]?.scrollIntoView({
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      block: 'nearest', inline: 'center',
    });
  }
  const product = products[rack[selected].index];
  return <section id="wardrobe" className="wardrobe section-pad" ref={section}>
    <div className="section-heading">
      <div><p className="eyebrow"><span className="small-square" />LE SHOWROOM INTERACTIF</p><h2>Explore the <em>wardrobe.</em></h2></div>
      <p className="rack-hint"><MoveHorizontal size={19} />{mobile ? 'Touchez une pièce pour l’explorer.' : 'Survolez une pièce pour la découvrir.'}<span>Un vestiaire qui prend vie, entre vos mains.</span></p>
    </div>
    <div className="rack-scroll"><div className="rack-stage photoreal-rack" onPointerLeave={e => { if (e.pointerType === 'mouse') setActive(-1); }}>
      <div className="rack-rail" aria-hidden="true" /><div className="rack-upright left" aria-hidden="true" /><div className="rack-upright right" aria-hidden="true" />
      {rack.map((item, i) => {
        const p = products[item.index];
        const shift = active < 0 || i === active ? 0 : (i < active ? -1 : 1) * (mobile ? 30 : 50);
        return <button key={`${item.garment}-${i}`} ref={el => { buttons.current[i] = el; }}
          className={`rack-garment ${active === i ? 'active' : ''}`}
          style={{ left: `calc(100px + (100% - 200px) * ${(i + .5) / rack.length})`, transform: `translateX(calc(-50% + ${shift}px))`, zIndex: active === i ? 5 : 1 }}
          aria-label={`0${i + 1} — Explorer ${p.name}`} aria-pressed={active === i}
          onPointerEnter={e => { if (e.pointerType === 'mouse') choose(i); }} onFocus={() => choose(i)}
          onClick={() => { if (mobile) choose(i); else router.push(`/produit/${p.slug}`); }}
          onKeyDown={e => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
              e.preventDefault(); const n = (i + (e.key === 'ArrowRight' ? 1 : -1) + rack.length) % rack.length;
              choose(n, true); buttons.current[n]?.focus({ preventScroll: true });
            }
            if (e.key === 'Escape') setActive(-1);
          }}>
          <span className="hanger-wire" aria-hidden="true" />
          <GarmentViewer garment={item.garment} active={active === i} visible={visible} alt={`${p.name}, pièce suspendue`} />
          <span className="rack-number" aria-hidden="true">0{i + 1}</span>
        </button>;
      })}<div className="rack-floor" aria-hidden="true" />
    </div></div>
    <div className="rack-caption">
      <div className="rack-info" aria-live="polite"><span className="micro">0{selected + 1} / 0{rack.length}</span><div><h3>{product.name}</h3><p className="small muted">{money(product.price)}<span className="dot-separator">·</span>{product.category}</p></div></div>
      <div className="rack-controls"><button className="circle-button" onClick={() => choose(selected - 1, true)} aria-label="Pièce précédente"><ArrowLeft size={17} /></button><button className="circle-button" onClick={() => choose(selected + 1, true)} aria-label="Pièce suivante"><ArrowRight size={17} /></button><Link className="text-link" href={`/produit/${product.slug}`}>Découvrir la pièce <ArrowUpRight size={17} /></Link></div>
    </div>
    <p className="rack-footnote">Édition Hoodie : 8 créations distinctes, du molleton sculptural aux textures délavées. Visuels de mode générés pour cette collection de démonstration. <Link href="/informations#credits">Crédits de l’expérience ↗</Link></p>
  </section>;
}
