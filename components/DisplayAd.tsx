import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>;
  }
}

const ADSENSE_CLIENT = 'ca-pub-5968986592421768';
const CARDNEWS_AD_SLOT = '7502566555';
const ADSENSE_SCRIPT_ID = 'modu-ddokddak-adsense';
const FUNDING_CHOICES_SCRIPT_ID = 'modu-ddokddak-funding-choices';
const PRODUCTION_HOSTS = new Set(['card.rnrmk.xyz', 'www.card.rnrmk.xyz']);

type AdStatus = 'loading' | 'filled' | 'unfilled';

let adsenseLoader: Promise<void> | null = null;

const shouldRequestLiveAds = () => {
  if (!import.meta.env.PROD || !PRODUCTION_HOSTS.has(window.location.hostname.toLowerCase())) return false;
  if (navigator.webdriver) return false;
  return !/HeadlessChrome|Playwright/i.test(navigator.userAgent);
};

const loadFundingChoices = () => {
  if (document.getElementById(FUNDING_CHOICES_SCRIPT_ID)) return;

  const funding = document.createElement('script');
  funding.id = FUNDING_CHOICES_SCRIPT_ID;
  funding.async = true;
  funding.src = 'https://fundingchoicesmessages.google.com/i/pub-5968986592421768?ers=1';
  document.head.appendChild(funding);

  const signalGooglefcPresent = () => {
    if (window.frames['googlefcPresent']) return;
    if (!document.body) {
      window.setTimeout(signalGooglefcPresent, 0);
      return;
    }
    const iframe = document.createElement('iframe');
    iframe.name = 'googlefcPresent';
    iframe.hidden = true;
    iframe.setAttribute('aria-hidden', 'true');
    document.body.appendChild(iframe);
  };

  signalGooglefcPresent();
};

const loadAdSense = () => {
  if (adsenseLoader) return adsenseLoader;

  adsenseLoader = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(ADSENSE_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing?.dataset.loaded === 'true') {
      resolve();
      return;
    }

    const script = existing || document.createElement('script');
    script.id = ADSENSE_SCRIPT_ID;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
    script.addEventListener('load', () => {
      script.dataset.loaded = 'true';
      resolve();
    }, { once: true });
    script.addEventListener('error', () => reject(new Error('AdSense script failed to load')), { once: true });
    if (!existing) document.head.appendChild(script);
  });

  return adsenseLoader;
};

export function DisplayAd() {
  const adRef = useRef<HTMLModElement>(null);
  const requestedRef = useRef(false);
  const [status, setStatus] = useState<AdStatus>('loading');
  const adsEnabled = shouldRequestLiveAds();

  useEffect(() => {
    if (!adsEnabled) return;

    const adElement = adRef.current;
    if (!adElement) return;
    let cancelled = false;

    const updateStatus = () => {
      const nextStatus = adElement.getAttribute('data-ad-status');
      if (nextStatus === 'filled' || nextStatus === 'unfilled') setStatus(nextStatus);
    };
    const observer = new MutationObserver(updateStatus);
    observer.observe(adElement, { attributes: true, attributeFilter: ['data-ad-status'] });
    updateStatus();

    if (!requestedRef.current) {
      requestedRef.current = true;
      loadFundingChoices();
      loadAdSense().then(() => {
        if (cancelled) return;
        window.adsbygoogle = window.adsbygoogle || [];
        window.adsbygoogle.push({});
      }).catch((error) => {
        console.error('AdSense display ad request failed', error);
        setStatus('unfilled');
      });
    }

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [adsEnabled]);

  if (!adsEnabled) return null;

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
