import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import './TurnBanner.css';

interface TurnBannerProps {
  visible: boolean;
  message?: string;
}

export function TurnBanner({ visible, message = 'Your Turn!' }: TurnBannerProps) {
  const bannerRef = useRef<HTMLDivElement>(null);
  const shownRef = useRef(false);

  useEffect(() => {
    if (!visible || !bannerRef.current || shownRef.current) return;
    shownRef.current = true;

    const el = bannerRef.current;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      el.style.display = 'flex';
      setTimeout(() => { el.style.display = 'none'; }, 1500);
      return;
    }

    const tl = gsap.timeline();
    tl.set(el, { display: 'flex', y: -60, opacity: 0 });
    tl.to(el, { y: 0, opacity: 1, duration: 0.3, ease: 'power2.out' });
    tl.to(el, { y: -60, opacity: 0, duration: 0.3, ease: 'power2.in', delay: 1.5 });
    tl.set(el, { display: 'none' });

    return () => { tl.kill(); };
  }, [visible]);

  // Reset when visibility toggles off
  useEffect(() => {
    if (!visible) shownRef.current = false;
  }, [visible]);

  return (
    <div className="turn-banner" ref={bannerRef} style={{ display: 'none' }}>
      <span className="turn-banner-text">{message}</span>
    </div>
  );
}
