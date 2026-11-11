'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
export function Modal({open,onClose,title,children,drawer=false}:{open:boolean;onClose:()=>void;title:string;children:ReactNode;drawer?:boolean}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const d=ref.current;if(!d)return;if(open&&!d.open)d.showModal();if(!open&&d.open)d.close();},[open]);
 useEffect(()=>{if(!open)return;const prev=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=prev;};},[open]);
 return <dialog className={`modal ${drawer?'drawer':''}`} ref={ref} onCancel={onClose} onClick={e=>{if(e.target===e.currentTarget){const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)onClose();}}} aria-label={title}><div className="modal-head"><span className="eyebrow">{title}</span><button className="icon-button" onClick={onClose} aria-label="Fermer"><X size={21}/></button></div>{open?children:null}</dialog>;
}

