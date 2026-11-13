"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";

type TurnstileOptions = {
  sitekey: string;
  action: string;
  theme: "light";
  callback: (token: string) => void;
  "expired-callback": () => void;
  "error-callback": () => void;
};

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: TurnstileOptions) => string;
      remove: (widgetId: string) => void;
    };
  }
}

export function TurnstileChallenge({ siteKey, onToken }: { siteKey: string; onToken: (token: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [scriptFailed, setScriptFailed] = useState(false);
  const receiveToken = useCallback((token: string) => onToken(token), [onToken]);

  useEffect(() => {
    const container = containerRef.current;
    if (!scriptReady || !container || !window.turnstile) return;
    const widgetId = window.turnstile.render(container, {
      sitekey: siteKey,
      action: "registration",
      theme: "light",
      callback: receiveToken,
      "expired-callback": () => receiveToken(""),
      "error-callback": () => receiveToken(""),
    });
    return () => window.turnstile?.remove(widgetId);
  }, [receiveToken, scriptReady, siteKey]);

  return (
    <div className="turnstile-block">
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={() => { setScriptFailed(false); setScriptReady(true); }}
        onError={() => { setScriptFailed(true); setScriptReady(false); receiveToken(""); }}
      />
      <div ref={containerRef} />
      <p className="field-hint" role="status">{scriptFailed ? "The anti-spam check could not load. Refresh the page and try again." : "Complete the anti-spam verification to submit."}</p>
    </div>
  );
}
