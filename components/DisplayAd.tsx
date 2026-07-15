import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>;
  }
}

const ADSENSE_CLIENT = 'ca-pub-5968986592421768';
const CARDNEWS_AD_SLOT = '7502566555';

type AdStatus = 'loading' | 'filled' | 'unfilled';

export function DisplayAd() {
  const adRef = useRef<HTMLModElement>(null);
  const requestedRef = useRef(false);
  const [status, setStatus] = useState<AdStatus>('loading');

  useEffect(() => {
    const adElement = adRef.current;
    if (!adElement) return;

    const updateStatus = () => {
      const nextStatus = adElement.getAttribute('data-ad-status');
      if (nextStatus === 'filled' || nextStatus === 'unfilled') setStatus(nextStatus);
    };
    const observer = new MutationObserver(updateStatus);
    observer.observe(adElement, { attributes: true, attributeFilter: ['data-ad-status'] });
    updateStatus();

    if (import.meta.env.PROD && !requestedRef.current) {
      requestedRef.current = true;
      try {
        window.adsbygoogle = window.adsbygoogle || [];
        window.adsbygoogle.push({});
      } catch (error) {
        console.error('AdSense display ad request failed', error);
      }
    }

    return () => observer.disconnect();
  }, []);

  return (
    <aside
      aria-label="광고"
      data-cardnews-ad
      data-slot-state={status}
      className={status === 'unfilled' ? 'hidden' : 'min-h-[100px] w-full overflow-hidden'}
    >
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={CARDNEWS_AD_SLOT}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}
