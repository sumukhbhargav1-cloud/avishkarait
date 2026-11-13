'use client';

import { useEffect, useRef, useState } from 'react';

type TurnstileOptions = {
  sitekey: string;
  callback: (token: string) => void;
  'expired-callback': () => void;
  'error-callback': () => void;
  theme?: 'light' | 'dark' | 'auto';
};

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: TurnstileOptions) => string;
      remove: (widgetId: string) => void;
    };
  }
}

type Props = {
  onToken: (token: string) => void;
};

const SCRIPT_ID = 'cloudflare-turnstile-script';
const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

export default function TurnstileCaptcha({ onToken }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (!siteKey) {
      setError('CAPTCHA is not configured. Please contact the event organisers.');
      return;
    }

    let cancelled = false;
    const renderWidget = () => {
      if (cancelled || !containerRef.current || !window.turnstile || widgetIdRef.current) return;
      try {
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme: 'auto',
          callback: (token) => {
            setError('');
            onToken(token);
          },
          'expired-callback': () => {
            onToken('');
            setError('Verification expired. Please complete the CAPTCHA again.');
          },
          'error-callback': () => {
            onToken('');
            setError('CAPTCHA could not be verified. Please retry.');
          },
        });
      } catch {
        setError('CAPTCHA could not be loaded. Refresh the page and try again.');
      }
    };

    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (window.turnstile) {
      renderWidget();
    } else if (existing) {
      existing.addEventListener('load', renderWidget);
      existing.addEventListener('error', () => setError('CAPTCHA could not be loaded.'));
    } else {
      const script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.src = SCRIPT_URL;
      script.async = true;
      script.defer = true;
      script.onload = renderWidget;
      script.onerror = () => setError('CAPTCHA could not be loaded. Check your connection and retry.');
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [onToken]);

  return (
    <div className="turnstile-captcha" aria-label="Bot verification">
      <div ref={containerRef} />
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
  );
}
