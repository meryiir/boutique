import sharp from 'sharp';

export const categories={
  tops:'Haut', 'top-layers':'Couche intermédiaire',outerwear:'Vêtement extérieur',bottoms:'Pantalon',
  dresses:'Robe / ensemble',underwear:'Sous-vêtement',feet:'Chaussures',headwear:'Couvre-chef',
  neckwear:'Écharpe / collier',bags:'Sac','wristwear-single':'Montre / bracelet'
};
export function fail(message,status=400) {
  const error=new Error(message);error.status=status;throw error;
}
export function textField(value) {
  if(typeof value!=='string'||!value.trim()||value.length>100)fail('Identifiant ou libellé invalide.');
  return value.trim();
}
export function choosePiece(current,piece) {
  const next={...current};
  if(piece.category==='dresses')for(const category of ['tops','top-layers','bottoms'])delete next[category];
  if(['tops','top-layers','bottoms'].includes(piece.category))delete next.dresses;
  next[piece.category]=piece.id;
  return next;
}
export async function checkPhoto(bytes,declarations={}) {
  const image=sharp(bytes,{limitInputPixels:20000000,failOn:'error'});
  const metadata=await image.metadata();
  if(!['png','jpeg','webp'].includes(metadata.format)||metadata.pages>1)fail('Photo PNG, JPEG ou WebP fixe requise.');
  if(metadata.width<256||metadata.height<256)fail('Photo trop petite, au moins 256 pixels sur chaque côté.');
  const warnings=[];
  if(Math.min(metadata.width,metadata.height)<768)warnings.push('Définition limitée pour inspecter les détails.');
  if(declarations.hanger!=='absent')warnings.push(declarations.hanger==='present'?'Cintre déclaré présent, risque de transfert.':'Présence de cintre à vérifier visuellement.');
  if(declarations.background!=='plain')warnings.push('Fond à contrôler, une photo produit sur fond uni est préférable.');
  if(declarations.framing!=='complete')warnings.push('Vérifier que les manches, jambes et bords du vêtement sont entièrement visibles.');
  // This is a technical check and declarations, not semantic hanger detection.
  await image.stats();
  return {mime:'image/'+(metadata.format==='jpeg'?'jpeg':metadata.format),width:metadata.width,height:metadata.height,warnings,declarations};
}
