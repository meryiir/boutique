'use client';
import {useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {buildFigure,disposeFigure} from './models';
import type {Wardrobe} from '../wardrobe';
import type {FittingGender} from '@/data/prepared-looks';

export default function Mannequin3D({gender,wardrobe,quarterTurns}:{gender:FittingGender;wardrobe:Wardrobe;quarterTurns:number}){
 const host=useRef<HTMLDivElement>(null),api=useRef<{scene:THREE.Scene;figure:THREE.Group;render:()=>void;camera:THREE.PerspectiveCamera;controls:OrbitControls}|null>(null);
 const [failed,setFailed]=useState(false),[ready,setReady]=useState(false),[attempt,setAttempt]=useState(0);
 const current=useRef({gender,wardrobe});current.current={gender,wardrobe};const rotationFrame=useRef(0),rotationTarget=useRef<number|null>(null),appliedTurns=useRef(0);
 useEffect(()=>{
  const el=host.current;if(!el)return;let renderer:THREE.WebGLRenderer|undefined,controls:OrbitControls|undefined,observer:ResizeObserver|undefined,scene:THREE.Scene|undefined;let disposed=false;let detach=()=>{};
  setFailed(false);setReady(false);
  try{
   renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.75));renderer.setClearColor('#e5e0d5');renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.45;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
   renderer.domElement.setAttribute('aria-label','Mannequin 3D. Glissez pour tourner, pincez ou utilisez la molette pour zoomer. Flèches du clavier pour tourner.');renderer.domElement.setAttribute('role','img');renderer.domElement.tabIndex=0;el.appendChild(renderer.domElement);
   scene=new THREE.Scene();const camera=new THREE.PerspectiveCamera(36,1,.05,30);camera.position.set(0,.98,3.2);
   controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,.91,0);controls.enablePan=false;controls.enableDamping=false;controls.minDistance=1.7;controls.maxDistance=5;controls.minPolarAngle=.40;controls.maxPolarAngle=2.25;controls.zoomSpeed=.65;controls.rotateSpeed=.7;controls.update();
   scene.add(new THREE.HemisphereLight('#fff7e8','#807765',2.5));const key=new THREE.DirectionalLight('#fff4df',3.2);key.position.set(2.5,4,4);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-1.2;key.shadow.camera.right=1.2;key.shadow.camera.top=2;key.shadow.camera.bottom=-.1;key.shadow.bias=-.0003;scene.add(key);
   const rim=new THREE.DirectionalLight('#e9eeff',2);rim.position.set(-3,2,-2);scene.add(rim);
   const floor=new THREE.Mesh(new THREE.CircleGeometry(.7,64),new THREE.MeshStandardMaterial({color:'#d5cfbf',roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=.014;floor.receiveShadow=true;scene.add(floor);
   const figure=buildFigure(current.current.gender,current.current.wardrobe);scene.add(figure);
   const draw=()=>{if(!disposed&&renderer&&scene)renderer.render(scene,camera);};api.current={scene,figure,camera,controls,render:draw};
   const resize=()=>{const rect=el.getBoundingClientRect();if(rect.width<=0||rect.height<=0)return;renderer!.setSize(rect.width,rect.height,false);camera.aspect=rect.width/rect.height;camera.updateProjectionMatrix();draw();};observer=new ResizeObserver(resize);observer.observe(el);resize();
   const handleChange=()=>{draw();el.dataset.angle=String(Math.round(controls!.getAzimuthalAngle()*180/Math.PI));};controls.addEventListener('change',handleChange);controls.addEventListener('start',()=>{cancelAnimationFrame(rotationFrame.current);rotationTarget.current=null;});
   const handleKey=(event:KeyboardEvent)=>{if(!['ArrowLeft','ArrowRight','Home','+','-'].includes(event.key))return;event.preventDefault();cancelAnimationFrame(rotationFrame.current);rotationTarget.current=null;const angle=controls!.getAzimuthalAngle()+(event.key==='ArrowLeft'?-.25:event.key==='ArrowRight'?.25:0),radius=camera.position.distanceTo(controls!.target);if(event.key==='Home')camera.position.set(0,.98,3.2);else if(event.key==='+'||event.key==='-'){camera.position.sub(controls!.target).multiplyScalar(event.key==='+'?.9:1.1).add(controls!.target);}else camera.position.set(Math.sin(angle)*radius,.98,Math.cos(angle)*radius);controls!.update();draw();};renderer.domElement.addEventListener('keydown',handleKey);
   const lost=(event:Event)=>{event.preventDefault();setFailed(true);setReady(false);};renderer.domElement.addEventListener('webglcontextlost',lost);detach=()=>{renderer?.domElement.removeEventListener('webglcontextlost',lost);renderer?.domElement.removeEventListener('keydown',handleKey);};
   el.dataset.angle='0';setReady(true);draw();
  }catch{setFailed(true);}
  return()=>{disposed=true;cancelAnimationFrame(rotationFrame.current);detach();observer?.disconnect();controls?.dispose();if(api.current){disposeFigure(api.current.figure);api.current=null;}if(scene)scene.traverse(obj=>{if(obj instanceof THREE.Mesh&&obj.geometry.type==='CircleGeometry'){obj.geometry.dispose();(obj.material as THREE.Material).dispose();}});renderer?.dispose();renderer?.forceContextLoss();if(renderer?.domElement.parentNode===el)el.removeChild(renderer.domElement);};
 },[attempt]);
 useEffect(()=>{const state=api.current;if(!state)return;state.scene.remove(state.figure);disposeFigure(state.figure);state.figure=buildFigure(gender,wardrobe);state.scene.add(state.figure);state.render();},[gender,wardrobe,ready]);
 useEffect(()=>{
  const state=api.current;
  if(!ready||!state||quarterTurns===appliedTurns.current)return;
  const {camera,controls,render}=state;
  const startAngle=controls.getAzimuthalAngle();
  const circle=2*Math.PI;
  const pending=rotationTarget.current===null?0:((rotationTarget.current-startAngle)%circle+circle)%circle;
  const delta=pending+(quarterTurns-appliedTurns.current)*Math.PI/2;
  appliedTurns.current=quarterTurns;
  rotationTarget.current=startAngle+delta;
  const radius=camera.position.distanceTo(controls.target);
  const initialY=camera.position.y;
  const duration=matchMedia('(prefers-reduced-motion: reduce)').matches?0:300;
  const start=performance.now();
  function rotate(time:number){
   const progress=duration?Math.min(1,(time-start)/duration):1;
   const angle=startAngle+delta*(1-(1-progress)**3);
   camera.position.set(Math.sin(angle)*radius,initialY,Math.cos(angle)*radius);
   controls.update();
   render();
   if(progress<1)rotationFrame.current=requestAnimationFrame(rotate);
   else rotationTarget.current=null;
  }
  rotationFrame.current=requestAnimationFrame(rotate);
  return ()=>cancelAnimationFrame(rotationFrame.current);
 },[quarterTurns,ready]);
 return <div ref={host} className="mannequin-three" data-ready={ready&&!failed} data-gender={gender} data-items={Object.values(wardrobe).map(x=>x.productId).join(',')} data-colors={Object.values(wardrobe).map(x=>x.color).join(',')}>
  {!ready&&!failed&&<p className="three-loading" role="status">Préparation du mannequin 3D…</p>}
  {failed&&<div className="three-fallback" role="alert"><p>Le rendu 3D est indisponible sur ce navigateur. Votre sélection est conservée.</p><button type="button" className="text-link" onClick={()=>setAttempt(value=>value+1)}>Réessayer</button></div>}
 </div>;
}
