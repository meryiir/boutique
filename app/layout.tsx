import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { StoreProvider } from '@/components/cart/StoreProvider';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CartDrawer } from '@/components/cart/CartDrawer';
import './globals.css';
const sans=localFont({src:[{path:'../public/fonts/Manrope-Regular.woff2',weight:'400',style:'normal'},{path:'../public/fonts/Manrope-SemiBold.woff2',weight:'600',style:'normal'}],variable:'--font-sans',display:'swap'});
const serif=localFont({src:'../public/fonts/CormorantGaramond.woff2',variable:'--font-serif',display:'swap'});
export const metadata: Metadata={title:{default:'MAISON ÉDIT — Contemporary wardrobe',template:'%s · MAISON ÉDIT'},description:'Un vestiaire contemporain, une allure singulière. Explorez la collection et le showroom interactif de MAISON ÉDIT, Casablanca. Démonstration sans commande réelle.',robots:{index:false,follow:false}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="fr" className={`${sans.variable} ${serif.variable}`}><body id="top"><StoreProvider><a className="skip-link" href="#main">Aller au contenu</a><Header/>{children}<Footer/><CartDrawer/></StoreProvider></body></html>;}

