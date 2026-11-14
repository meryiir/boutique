'use client';

import Image from 'next/image';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {createContext, useContext, useEffect, useRef, useState, type ReactNode} from 'react';
import {ArrowDownToLine, RotateCcw, RotateCw, X, ChevronDown} from 'lucide-react';
import type {Product} from '@/types/product';
import {products} from '@/data/products';
import {defaultFittingGender, findPreparedLook, type FittingGender, type FittingView} from '@/data/prepared-looks';
import {addToWardrobe, wardrobeSlots, type Wardrobe, type WardrobeSlot} from './wardrobe';

type FittingAction = (product: Product, color: number, source: HTMLElement, report?: (message:string)=>void) => void;
type Api = {tryOn:FittingAction; changeWornColor:(product:Product,color:number,source:HTMLElement,apply:()=>void)=>void; hasFullPreview:(product:Product,color:number)=>boolean};
const FittingContext = createContext<Api | null>(null);
export const useFitting = () => useContext(FittingContext);
const slotNames: Record<WardrobeSlot,string> = {top:'Haut', bottom:'Pantalon', outer:'Veste', full:'Robe / ensemble', bag:'Sac', scarf:'Écharpe'};
const views: FittingView[] = ['front','right','back','left'];
const viewNames: Record<FittingView,string> = {front:'Face',right:'Profil droit',back:'Dos',left:'Profil gauche'};
const unavailableReason = 'Aperçu indisponible pour cette variante et cette tenue. La génération automatique est en cours de validation et n’est pas activée dans la boutique.';

function standalonePreview(product:Product,color:number) {
  const gender=product.gender==='Mixte'?defaultFittingGender(product.id):product.gender;
  return !!findPreparedLook(gender,[{productId:product.id,color:product.colors[color].name}]);
}

type WorkspaceProps = {children:ReactNode; product?:Product; audience?:FittingGender; onEntryColor?:(index:number)=>void};

export function FittingWorkspace(props:WorkspaceProps) {
  const pathname=usePathname();
  return <FittingSession key={`${pathname}:${props.audience ?? ''}`} {...props}/>;
}

function FittingSession({children, product, audience, onEntryColor}: WorkspaceProps) {
  const initialGender=product ? product.gender==='Mixte' ? defaultFittingGender(product.id) : product.gender : audience ?? 'Femme';
  const [{gender,wardrobe}, setSession] = useState<{gender:FittingGender;wardrobe:Wardrobe}>({gender:initialGender,wardrobe:{}});
  const look = findPreparedLook(gender, Object.values(wardrobe));
  const [angle, setAngle] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const panel = useRef<HTMLElement>(null);
  const sequence = useRef(0);
  const flight = useRef<Animation | null>(null);
  const lastButton = useRef<HTMLElement | null>(null);
  const entryConsumed = useRef(false);
  const canRotate = !!look?.views && views.slice(1).every(view => !!look.views?.[view]);
  const view = canRotate ? views[angle] : 'front';
  const currentImage = look?.views?.[view] ?? look?.image ?? `/images/fitting/mannequin-${gender.toLowerCase()}.webp`;

  useEffect(() => {
    function endSession() {
      sequence.current++;
      flight.current?.cancel();
    }
    function restorePage(event:PageTransitionEvent) {
      if (!event.persisted) return;
      endSession();
      setSession({gender:initialGender,wardrobe:{}});
      setAngle(0);
      setBusy(false);
      setMessage('');
      setMobileOpen(false);
    }
    try {sessionStorage.removeItem('edit-wardrobes');} catch {}
    window.addEventListener('pagehide',endSession);
    window.addEventListener('pageshow',restorePage);
    return ()=> {
      endSession();
      window.removeEventListener('pagehide',endSession);
      window.removeEventListener('pageshow',restorePage);
    };
  }, [initialGender]);

  function proposal(p:Product, index:number) {
    const target = p.gender !== 'Mixte' ? p.gender : product || audience || Object.keys(wardrobe).length ? gender : defaultFittingGender(p.id);
    return {target, next:addToWardrobe(target===gender ? wardrobe : {}, p, p.colors[index].name)};
  }

  function reveal(source?:HTMLElement) {
    if (source) lastButton.current = source;
    setMobileOpen(true);
    if (window.matchMedia('(max-width:768px)').matches) {
      requestAnimationFrame(() => panel.current?.scrollIntoView({block:'start'}));
    }
  }

  async function prepare(target:FittingGender, next:Wardrobe, description:string, source?:HTMLElement, report:(message:string)=>void=setMessage) {
    const ticket = ++sequence.current;
    const origin = source?.getBoundingClientRect();
    flight.current?.cancel();
    setBusy(false);
    setMessage('');
    const nextLook = findPreparedLook(target,Object.values(next));
    if (Object.keys(next).length && !nextLook) {
      report(`${description} — aperçu photo indisponible pour cette combinaison. La tenue portée est conservée.`);
      return;
    }
    if (target === gender && nextLook?.id === look?.id) {report('');return;}
    setBusy(true);
    const image = new window.Image();
    image.src = nextLook?.image ?? `/images/fitting/mannequin-${target.toLowerCase()}.webp`;
    try {
      await image.decode();
      if (ticket !== sequence.current) return;
      const stage = panel.current?.querySelector('.fitting-stage')?.getBoundingClientRect();
      const thumbnail = source?.closest('.product-card, .product-detail')?.querySelector<HTMLImageElement>('.product-front, .gallery-image');
      if (stage && origin && thumbnail && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const moving = document.createElement('img');
        moving.src = thumbnail.currentSrc;
        moving.alt = '';
        moving.className = 'fitting-flight';
        Object.assign(moving.style,{left:`${origin.left}px`,top:`${origin.top}px`,width:'80px',height:'80px'});
        document.body.appendChild(moving);
        const animation = moving.animate([
          {transform:'translate(0,0)',opacity:.9},
          {transform:`translate(${stage.left+stage.width/2-origin.left-40}px,${stage.top+stage.height/3-origin.top}px) scale(.45)`,opacity:0},
        ],{duration:300,easing:'ease-out'});
        flight.current = animation;
        try {await animation.finished;} finally {moving.remove();}
      }
      if (ticket !== sequence.current) return;
      setAngle(0);
      setSession({gender:target,wardrobe:next});
      report('');
    } catch {
      if (ticket === sequence.current) report(`${description} — le visuel n’a pas pu être chargé. La tenue portée est conservée.`);
    } finally {
      if (ticket === sequence.current) setBusy(false);
    }
  }

  function tryOn(p:Product,index:number,source:HTMLElement,report?: (message:string)=>void) {
    const {target,next} = proposal(p,index);
    if (!report) reveal(source);
    void prepare(target,next,`${p.name} · ${p.colors[index].name}`,source,report ? message=>{
      report(message);
      if(!message) reveal(source);
    } : undefined);
  }

  function changeWornColor(p:Product,index:number,source:HTMLElement,apply:()=>void) {
    if (!Object.values(wardrobe).some(item => item.productId === p.id)) {
      sequence.current++;
      flight.current?.cancel();
      setBusy(false);
      setMessage('');
      apply();
      return;
    }
    const {target,next}=proposal(p,index);
    reveal(source);
    void prepare(target,next,`${p.name} · ${p.colors[index].name}`,source,message=>{
      setMessage(message);
      if (!message) apply();
    });
  }

  useEffect(()=>{
    if (!product || entryConsumed.current) return;
    const url=new URL(window.location.href);
    const requested=url.searchParams.get('essayer');
    if (requested===null) return;
    // Consume the link after mount so a reload starts a fresh session.
    const frame=requestAnimationFrame(()=>{
      entryConsumed.current=true;
      url.searchParams.delete('essayer');
      window.history.replaceState(null,'',url);
      const index=product.colors.findIndex(color=>color.name===requested);
      if (index<0) return;
      reveal();
      onEntryColor?.(index);
      void prepare(initialGender,addToWardrobe({},product,requested),`${product.name} · ${requested}`);
    });
    return ()=>cancelAnimationFrame(frame);
  });

  async function rotate() {
    if (!look || !canRotate) return;
    const ticket = ++sequence.current;
    const next = (angle + 1) % views.length;
    const image = new window.Image();
    image.src = look.views?.[views[next]] ?? look.image;
    setBusy(true);
    setMessage('');
    try {
      await image.decode();
      if (ticket === sequence.current) setAngle(next);
    } catch {
      if (ticket === sequence.current) setMessage('Cette vue n’a pas pu être chargée.');
    } finally {
      if (ticket === sequence.current) setBusy(false);
    }
  }

  return <FittingContext.Provider value={{tryOn,changeWornColor,hasFullPreview:(p,index)=>{
    const {target,next} = proposal(p,index);
    return !!findPreparedLook(target,Object.values(next));
  }}}>
    <div className={`fitting-layout ${product?'fitting-product-workspace':''}`}>
      <aside ref={panel} className="fitting-room" aria-label="Cabine d’essayage" data-mobile-open={mobileOpen} aria-busy={busy}>
        <div className="fitting-heading">
          <div><p className="eyebrow">LE STUDIO D’ESSAYAGE</p><h2>Votre <em>silhouette.</em></h2></div>
          <button type="button" className="icon-button fitting-mobile-toggle" aria-label={mobileOpen?'Réduire la cabine':'Ouvrir la cabine'} aria-expanded={mobileOpen} onClick={()=>{
            setMobileOpen(!mobileOpen);
            if (mobileOpen) lastButton.current?.focus();
          }}>{mobileOpen?<X size={19}/>:<ChevronDown size={19}/>}</button>
        </div>
        <div className="fitting-content">
          <div className="fitting-genders"><span className="fitting-fixed-gender">Mannequin {gender.toLowerCase()}</span></div>
          <div className="fitting-stage" data-gender={gender} data-prepared-look={look?.id ?? 'none'} data-view={view}>
            <div className="fitting-stage-grid"/>
            <Image key={currentImage} src={currentImage} alt={look ? `${look.alt}${canRotate?' — '+viewNames[view]:''}` : `Mannequin ${gender.toLowerCase()} d’origine, sans tenue affichée`} fill sizes="320px" loading="eager" unoptimized className={look?'fitting-prepared':'fitting-avatar'}/>
            {canRotate && <span className="fitting-floor-label micro">{viewNames[view]}</span>}
          </div>
          {canRotate && <button type="button" disabled={busy} className="fitting-rotate-icon" aria-label="Tourner le mannequin d’un quart de tour" onClick={rotate}><RotateCw size={19}/></button>}
          {message && <p role="status" className="fitting-photo-unavailable">{message}</p>}
          <p className="fitting-compact-help">Aperçus préparés disponibles pour certaines variantes et tenues. Génération automatique indisponible dans la boutique.</p>
          <ul className="fitting-items" aria-label="Articles portés">
            {wardrobeSlots.map(slot => {
              const item = wardrobe[slot];
              const p = products.find(candidate => candidate.id === item?.productId);
              if (!item || !p) return null;
              const remaining={...wardrobe};
              delete remaining[slot];
              const canRemove=!Object.keys(remaining).length || !!findPreparedLook(gender,Object.values(remaining));
              return <li key={slot} data-slot={slot}>
                <Link href={`/produit/${p.slug}`}><span>{p.name}</span><small>{slotNames[slot]} · {item.color}</small></Link>
                <button type="button" className="icon-button" disabled={!canRemove} title={canRemove?undefined:'Retrait indisponible, le visuel des articles restants manque. Vous pouvez réinitialiser la tenue.'} aria-label={`Retirer ${p.name} de la sélection`} onClick={()=>{
                  void prepare(gender,remaining,`Retrait de ${p.name}`);
                }}><X size={13}/></button>
              </li>;
            })}
          </ul>
          <button type="button" className="text-link fitting-reset" disabled={!Object.keys(wardrobe).length && !busy} onClick={()=>void prepare(gender,{},'Réinitialisation')}><RotateCcw size={13}/> Réinitialiser cette tenue</button>
          <details className="fitting-limit-details">
            <summary>À propos de l’aperçu</summary>
            <p className="fitting-disclosure">Les aperçus de la boutique sont préparés à l’avance. Seules les variantes et tenues disposant d’un visuel peuvent être essayées. La génération automatique est en cours de validation. {look?.differences.join(' ')} {!canRotate && 'Seule la vue de face est disponible. La rotation nécessite les deux profils et le dos de la même tenue sur ce mannequin.'}</p>
          </details>
        </div>
      </aside>
      <div className="fitting-catalog">{children}</div>
    </div>
  </FittingContext.Provider>;
}

export function fittingLink(product:Product,color=0) {
  return `/produit/${product.slug}?essayer=${encodeURIComponent(product.colors[color].name)}#product-try-on`;
}

export function TryOnButton({product,color}:{product:Product;color:number}) {
  const fitting = useFitting();
  const available = fitting ? fitting.hasFullPreview(product,color) : standalonePreview(product,color);
  if (!available) return <button type="button" className="card-try-on" disabled title={unavailableReason} aria-label={`Essayage indisponible — ${product.name}, ${product.colors[color].name}. ${unavailableReason}`}><ArrowDownToLine size={16}/><span>Essayage indisponible</span></button>;
  if (!fitting) return <Link className="card-try-on" href={fittingLink(product,color)} aria-label={`Essayer ${product.name} sur le mannequin`}><ArrowDownToLine size={16}/><span>Essayer</span></Link>;
  const label = 'Essayer';
  return <button type="button" className="card-try-on" aria-label={`${label} ${product.name}, ${product.colors[color].name}, pour la tenue`} onClick={event=>fitting.tryOn(product,color,event.currentTarget)}><ArrowDownToLine size={16}/><span>{label}</span></button>;
}

export function ProductTryOnButton({product,color,compact,onTryOn}:{product:Product;color:number;compact?:boolean;onTryOn?:()=>void}) {
  const fitting = useFitting();
  const [failure,setFailure] = useState<{color:number;message:string}>();
  const available = fitting ? fitting.hasFullPreview(product,color) : standalonePreview(product,color);
  if (!available) return <><button type="button" id={compact?undefined:'product-try-on'} className={`button outline full product-try-on ${compact?'quick-try-on':''}`} disabled>Essayage indisponible <ArrowDownToLine size={18}/></button><p className="fitting-photo-unavailable">{unavailableReason}</p></>;
  if (!fitting) return <Link className="button dark full quick-try-on" href={fittingLink(product,color)} onClick={onTryOn}>Essayer sur le mannequin <ArrowDownToLine size={18}/></Link>;
  const label = 'Essayer sur le mannequin';
  return <><button type="button" id={compact?undefined:'product-try-on'} className={`button outline full product-try-on ${compact?'quick-try-on':''}`} onClick={event=>{
    setFailure(undefined);
    fitting.tryOn(product,color,event.currentTarget,compact ? message=>{
      setFailure(message ? {color,message} : undefined);
      if(!message) onTryOn?.();
    } : undefined);
  }}><span>{label}</span><ArrowDownToLine size={18}/></button>{compact&&failure?.color===color&&<p role="alert" className="fitting-photo-unavailable">{failure.message}</p>}</>;
}
