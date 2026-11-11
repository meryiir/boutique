'use client';
import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Search, ShoppingBag, Menu, Heart, ArrowUpRight } from 'lucide-react';
import { useStore } from '@/components/cart/StoreProvider';
import { Modal } from './Modal';
export function Header(){const {count,setCartOpen,favorites}=useStore();const [menu,setMenu]=useState(false),[search,setSearch]=useState(false);const path=usePathname();return <>
 <div className="announcement">UN VESTIAIRE LIBRE. UNE ALLURE SINGULIÈRE.<span>CASABLANCA, MAROC ↗</span></div>
 <header className="header"><button className="icon-button mobile-menu" aria-label="Ouvrir le menu" onClick={()=>setMenu(true)}><Menu size={21}/></button><Link className="logo" href="/">MAISON ÉDIT<span aria-hidden="true">CONTEMPORARY WARDROBE</span></Link><nav className="desktop-nav" aria-label="Navigation principale"><Link aria-current={path==='/collection'?'page':undefined} href="/collection">La collection</Link><Link href="/#wardrobe">Le showroom<span className="nav-dot"/></Link><Link href="/#lookbook">Lookbook</Link><Link href="/maison">La Maison</Link></nav><div className="header-actions"><button aria-label="Rechercher" className="icon-button" onClick={()=>setSearch(true)}><Search size={19}/></button><Link className="icon-button favorites-link" href="/collection?favoris=1" aria-label={`Favoris (${favorites.length})`}><Heart size={19}/></Link><button className="bag-button" onClick={()=>setCartOpen(true)} aria-label={`Panier ${count} — Ouvrir le panier (${count})`}><ShoppingBag size={19}/><span className="bag-label">Panier</span><span aria-hidden="true" className="bag-count">{count}</span></button></div></header>
 <Modal open={menu} onClose={()=>setMenu(false)} title="MAISON ÉDIT" drawer><nav className="menu-links">{[['La collection','/collection'],['Le showroom','/#wardrobe'],['Lookbook','/#lookbook'],['La Maison','/maison'],['Mes favoris','/collection?favoris=1'],['Contact & informations','/informations']].map(([label,href])=><Link key={href} href={href} onClick={()=>setMenu(false)}>{label}<ArrowUpRight size={23}/></Link>)}</nav><p className="small muted">Édition 01 — Casablanca, Maroc</p></Modal>
 <Modal open={search} onClose={()=>setSearch(false)} title="Trouver votre prochaine pièce"><form className="search-form" action="/collection" onSubmit={()=>setSearch(false)}><label htmlFor="site-search">Que cherchez-vous ?</label><div className="search-field"><input autoFocus id="site-search" type="search" name="q" placeholder="Une chemise, une veste…" required/><button aria-label="Lancer la recherche"><ArrowUpRight/></button></div><p className="muted small">Explorez les matières, les coupes et les essentiels.</p></form></Modal>
 </>;}


