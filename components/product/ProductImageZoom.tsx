'use client';
import Image from 'next/image';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Minus, Plus, RotateCcw, Move } from 'lucide-react';

export function HoverProductImage({src,alt,onOpen}:{src:string;alt:string;onOpen:()=>void}) {
 const ref=useRef<HTMLButtonElement>(null),start=useRef({x:0,y:0}),moved=useRef(false);
 const [hover,setHover]=useState(false);
 return <button ref={ref} type="button" className="product-zoom-surface" data-zoomed={hover}
  aria-label="Placez la souris sur un détail pour zoomer automatiquement. Touchez pour explorer les détails."
  onPointerEnter={event=>{if(event.pointerType==='mouse')setHover(true);}}
  onPointerLeave={()=>setHover(false)}
  onPointerMove={event=>{
   if(Math.hypot(event.clientX-start.current.x,event.clientY-start.current.y)>12)moved.current=true;
   if(event.pointerType!=='mouse'||!ref.current)return;
   const box=ref.current.getBoundingClientRect();
   ref.current.style.setProperty('--zoom-x',`${(event.clientX-box.left)/box.width*100}%`);
   ref.current.style.setProperty('--zoom-y',`${(event.clientY-box.top)/box.height*100}%`);
  }}
  onPointerDown={event=>{start.current={x:event.clientX,y:event.clientY};moved.current=false;}}
  onClick={event=>{if(event.detail===0||!moved.current)onOpen();}}>
  <Image src={src} alt={alt} fill sizes="(max-width:768px) 100vw, 55vw" unoptimized priority className="gallery-image"/>
  <span className="photo-zoom-hint"><span className="hover-zoom-instruction">Placez la souris sur un détail pour zoomer automatiquement</span><span className="touch-zoom-instruction">Touchez pour explorer les détails</span></span>
 </button>;
}

export function ProductImageZoom({src,alt}:{src:string;alt:string}) {
 const [scale,setScale]=useState(1.5),[position,setPosition]=useState({x:0,y:0});
 const [mouseZoom,setMouseZoom]=useState(false);
 const stage=useRef<HTMLDivElement>(null),drag=useRef<{id:number;x:number;y:number;px:number;py:number}|null>(null);
 useEffect(()=>{
  const element=stage.current;if(!element)return;
  const observer=new ResizeObserver(()=>{
   const box=element.getBoundingClientRect(),maxX=box.width*(scale-1)/2,maxY=box.height*(scale-1)/2;
   setPosition(old=>({x:Math.max(-maxX,Math.min(maxX,old.x)),y:Math.max(-maxY,Math.min(maxY,old.y))}));
  });observer.observe(element);return()=>observer.disconnect();
 },[scale]);
 function changeScale(value:number){const next=Math.min(4,Math.max(1,value)),box=stage.current?.getBoundingClientRect();setScale(next);const maxX=(box?.width||0)*(next-1)/2,maxY=(box?.height||0)*(next-1)/2;setPosition(old=>({x:Math.max(-maxX,Math.min(maxX,old.x)),y:Math.max(-maxY,Math.min(maxY,old.y))}));}
 function clamp(x:number,y:number){const box=stage.current?.getBoundingClientRect();const maxX=(box?.width||0)*(scale-1)/2,maxY=(box?.height||0)*(scale-1)/2;setPosition({x:Math.max(-maxX,Math.min(maxX,x)),y:Math.max(-maxY,Math.min(maxY,y))});}
 function followMouse(event:React.PointerEvent<HTMLDivElement>){
  const box=event.currentTarget.getBoundingClientRect(),factor=2.5;
  setMouseZoom(true);
  setPosition({x:(.5-Math.max(0,Math.min(1,(event.clientX-box.left)/box.width)))*box.width*(factor-1),y:(.5-Math.max(0,Math.min(1,(event.clientY-box.top)/box.height)))*box.height*(factor-1)});
 }
 const imageStyle:CSSProperties={transform:`translate(${position.x}px,${position.y}px) scale(${mouseZoom?2.5:scale})`};
 return <div className="detail-zoom-viewer">
  <div className="detail-zoom-toolbar" role="group" aria-label="Réglage du zoom">
   <button type="button" className="icon-button" aria-label="Diminuer le zoom" disabled={scale<=1} onClick={()=>changeScale(scale-.5)}><Minus size={18}/></button>
   <label className="zoom-slider-label"><span className="sr-only">Grossissement de l’image</span><input type="range" min="1" max="4" step=".5" value={scale} onChange={event=>changeScale(Number(event.target.value))}/></label>
   <output aria-live="polite">{Math.round((mouseZoom?2.5:scale)*100)} %</output>
   <button type="button" className="icon-button" aria-label="Augmenter le zoom" disabled={scale>=4} onClick={()=>changeScale(scale+.5)}><Plus size={18}/></button>
   <button type="button" className="icon-button" aria-label="Réinitialiser le zoom" onClick={()=>{setScale(1);setPosition({x:0,y:0});}}><RotateCcw size={17}/></button>
  </div>
  <div ref={stage} className="zoom-image detail-zoom-stage" tabIndex={0} role="group" aria-label="Détails du vêtement. Survolez pour zoomer automatiquement. Au toucher, glissez pour explorer. Les flèches du clavier déplacent l’image."
   data-scale={mouseZoom?2.5:scale} data-mouse-zoom={mouseZoom}
   onPointerEnter={event=>{if(event.pointerType==='mouse')followMouse(event);}}
   onPointerLeave={()=>{setMouseZoom(false);setPosition({x:0,y:0});}}
   onPointerDown={event=>{if(event.pointerType==='mouse'||event.button!==0)return;drag.current={id:event.pointerId,x:event.clientX,y:event.clientY,px:position.x,py:position.y};try{event.currentTarget.setPointerCapture(event.pointerId);}catch{}}}
   onPointerMove={event=>{if(event.pointerType==='mouse'){followMouse(event);return;}const d=drag.current;if(d?.id===event.pointerId)clamp(d.px+event.clientX-d.x,d.py+event.clientY-d.y);}}
   onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}
   onKeyDown={event=>{
    setMouseZoom(false);
    const moves:Record<string,[number,number]>={ArrowLeft:[40,0],ArrowRight:[-40,0],ArrowUp:[0,40],ArrowDown:[0,-40]};
    if(moves[event.key]){event.preventDefault();const [x,y]=moves[event.key];clamp(position.x+x,position.y+y);}
    if(event.key==='+'||event.key==='='){event.preventDefault();changeScale(scale+.5);}
    if(event.key==='-'){event.preventDefault();changeScale(scale-.5);}
   }}>
   <Image src={src} alt={alt} fill sizes="(max-width:768px) 100vw, 1200px" unoptimized style={imageStyle} draggable={false}/>
  </div>
  <p className="zoom-help small muted"><Move size={14}/> <span><span className="hover-zoom-instruction">Placez la souris sur la zone à examiner : le zoom suit automatiquement votre mouvement. </span><span className="touch-zoom-instruction">Glissez pour explorer les matières et les finitions. </span>Commandes de zoom de 100 à 400 % disponibles.</span></p>
 </div>;
}
