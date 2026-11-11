'use client';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { GarmentController } from '@/lib/garment-controller';
type Manifest = { width: number; height: number; columns: number; frameCount: number };
const images = new Map<string, Promise<HTMLImageElement>>();
const manifests = new Map<string, Promise<Manifest>>();
function loadAtlas(src: string) {
 if (!images.has(src)) {
  const image = new window.Image(); image.src = src;
  images.set(src, image.decode().then(() => image).catch(error => { images.delete(src); throw error; }));
 }
 return images.get(src)!;
}
function loadManifest(garment: string) {
 if (!manifests.has(garment)) manifests.set(garment, fetch(`/garments/${garment}/manifest.json`).then(response => {
  if (!response.ok) throw Error('Missing garment manifest'); return response.json();
 }));
 return manifests.get(garment)!;
}
export function GarmentViewer({ garment, active, visible = true, alt }: { garment: string; active: boolean; visible?: boolean; alt: string }) {
 const canvas = useRef<HTMLCanvasElement>(null), controller = useRef<GarmentController | null>(null);
 const raf = useRef(0), last = useRef(0);
 const [ready, setReady] = useState(false), [failed, setFailed] = useState(false), [reduced, setReduced] = useState(false);
 const [loadedVersion, setLoadedVersion] = useState(0);
 useEffect(() => {
  const media = matchMedia('(prefers-reduced-motion: reduce)'); setReduced(media.matches);
  const change = () => setReduced(media.matches); media.addEventListener('change', change);
  return () => media.removeEventListener('change', change);
 }, []);
 useEffect(() => {
  let cancelled = false; setReady(false); setFailed(false);
  if (visible) Promise.all([loadManifest(garment), loadAtlas(`/garments/${garment}/${matchMedia('(max-width: 700px)').matches ? 'atlas-mobile.webp' : 'atlas.webp'}`)]).then(([manifest, image]) => {
   if (cancelled) return;
   const rows = Math.ceil(manifest.frameCount / manifest.columns);
   const paint = (frame: number) => {
    const element = canvas.current, context = element?.getContext('2d');
    if (!element || !context) return;
    const width = image.naturalWidth / manifest.columns, height = image.naturalHeight / rows;
    context.clearRect(0, 0, 384, 448);
    context.drawImage(image, (frame % manifest.columns) * width, Math.floor(frame / manifest.columns) * height, width, height, 0, 0, 384, 448);
    element.dataset.frame = String(frame); element.dataset.frameCount = String(manifest.frameCount);
   };
   controller.current = new GarmentController({ frameCount: manifest.frameCount, durationMs: 560, returnDurationMs: 440, endpointWindow: .3, onFrame: paint });
   paint(0); setReady(true); setLoadedVersion(version => version + 1);
  }).catch(() => { if (!cancelled) setFailed(true); });
  return () => { cancelled = true; cancelAnimationFrame(raf.current); };
 }, [garment, visible]);
 useEffect(() => {
  const current = controller.current; if (!current || !ready) return;
  cancelAnimationFrame(raf.current); last.current = 0;
  current.setTarget(active ? 1 : 0, { immediate: reduced });
  if (!visible || document.hidden) return;
  const step = (time: number) => {
   const delta = last.current ? Math.min(50, time - last.current) : 16; last.current = time;
   if (current.step(delta)) raf.current = requestAnimationFrame(step);
  };
  raf.current = requestAnimationFrame(step); return () => cancelAnimationFrame(raf.current);
 }, [active, ready, reduced, visible, loadedVersion]);
 return <span className="garment-viewer" data-ready={ready} data-failed={failed}>
  <Image className={ready ? 'fallback hidden-fallback' : 'fallback'} src={`/garments/${garment}/${active && failed ? 'front' : 'profile'}.webp`} alt={alt} width={384} height={448} sizes="(max-width: 600px) 220px, 300px" />
  <canvas ref={canvas} width={384} height={448} aria-hidden="true" className={ready ? '' : 'hidden-canvas'} data-frame="0" />
  {failed && <span className="micro">Aperçu statique</span>}
 </span>;
}
