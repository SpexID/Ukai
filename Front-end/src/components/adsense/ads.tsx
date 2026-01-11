import { useEffect, useRef } from 'react';

export default function Adsense() {
  const adRef = useRef<HTMLModElement>(null);

  useEffect(() => {
    try {
      if (adRef.current && !adRef.current.getAttribute('data-ad-loaded')) {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        adRef.current.setAttribute('data-ad-loaded', 'true');
      }
    } catch (e) {
      console.error('Adsense Error:', e);
    }
  }, []);

  return (
 <ins
  className="adsbygoogle"
  style={{ 
    display: 'block',
    width: '100%',
    height: 'auto'
  }}
  data-ad-client="ca-pub-4651438489721406"
  data-ad-slot="8289852890"
  data-ad-format="auto"
  data-full-width-responsive="true"
  ref={adRef}
></ins>

  );
}
