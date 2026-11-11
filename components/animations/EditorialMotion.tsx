'use client';
import { useEffect } from 'react';

export function EditorialMotion() {
  useEffect(() => {
    let disposed = false;
    let revert = () => {};
    // The campaign can paint before the scroll-animation engine is requested.
    const timer = window.setTimeout(async () => {
      const [{ default: gsap }, { ScrollTrigger }] = await Promise.all([
        import('gsap'), import('gsap/ScrollTrigger'),
      ]);
      if (disposed) return;
      gsap.registerPlugin(ScrollTrigger);
      const mm = gsap.matchMedia();
      revert = () => mm.revert();
      mm.add({ desktop: '(min-width: 769px)', mobile: '(max-width: 768px)', reduce: '(prefers-reduced-motion: reduce)' }, context => {
        if (context.conditions?.reduce) return;
        const mobile = context.conditions?.mobile;
        gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach(el => {
          gsap.fromTo(el, { opacity: 0, y: mobile ? 18 : 36 }, {
            opacity: 1, y: 0, duration: .8, ease: 'power2.out',
            scrollTrigger: { trigger: el, start: 'top 94%', once: true }, clearProps: 'all',
          });
        });
        // Keep the portrait's head and shoes inside the frame during parallax.
        gsap.to('.hero-photo', { yPercent: mobile ? 1 : 2, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
        gsap.fromTo('.story-product', { opacity: 0, x: 30, rotation: 5 }, { opacity: 1, x: 0, rotation: 0, ease: 'power2.out', scrollTrigger: { trigger: '.story', start: 'top 35%', end: 'bottom 80%', scrub: true } });
        gsap.to('.story-image-one', { opacity: 0, ease: 'none', scrollTrigger: { trigger: '.story', start: 'top 55%', end: 'bottom 65%', scrub: true } });
        gsap.fromTo('.story-image-two', { scale: 1.08 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.story', start: 'top bottom', end: 'bottom top', scrub: true } });
        gsap.fromTo('.story-title', { x: mobile ? -8 : -30 }, { x: mobile ? 8 : 30, ease: 'none', scrollTrigger: { trigger: '.story', start: 'top bottom', end: 'bottom top', scrub: true } });
        if (!mobile) {
          const track = document.querySelector<HTMLElement>('.lookbook-track');
          if (track) gsap.to(track, { x: () => -Math.max(0, track.scrollWidth - track.clientWidth), ease: 'none', scrollTrigger: { trigger: '.lookbook', start: 'top 15%', end: 'bottom 60%', scrub: 1, invalidateOnRefresh: true } });
        }
      });
    }, 1000);
    return () => { disposed = true; clearTimeout(timer); revert(); };
  }, []);
  return null;
}
