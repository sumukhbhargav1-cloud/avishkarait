'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

type MealType = 'breakfast' | 'lunch' | 'dinner';
export default function AdminMealsScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mealType, setMealType] = useState<MealType>('breakfast');
  const [qrValue, setQrValue] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [scannerState, setScannerState] = useState('Starting camera scanner…');
  const reading = useRef(false);
  const lastScanned = useRef('');
  async function checkIn(value: string) {
    if (busy || reading.current) return;
    reading.current = true;
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/meals/check-in', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ qrValue: value, mealType }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Check-in failed.');
      setMessage(`${result.teamName} checked in for ${result.mealType}.`);
      setQrValue('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Check-in failed.');
    } finally {
      setBusy(false);
      window.setTimeout(() => { reading.current = false; }, 1300);
    }
  }
  useEffect(() => {
    lastScanned.current = '';
    let active = true;
    let controls: { stop: () => void } | undefined;
    void import('@zxing/browser').then(({ BrowserMultiFormatReader }) => {
      if (!active || !videoRef.current) return;
      const reader = new BrowserMultiFormatReader();
      return reader.decodeFromConstraints({ video: { facingMode: { ideal: 'environment' } } }, videoRef.current, (result) => {
        if (result && !reading.current && result.getText() !== lastScanned.current) {
          lastScanned.current = result.getText();
          void checkIn(result.getText());
        }
      }).then((control) => { controls = control; if (active) setScannerState('Camera ready. Point it at a team QR code.'); });
    }).catch(() => { if (active) setScannerState('Camera unavailable. Enter the QR value manually below.'); });
    return () => { active = false; controls?.stop(); };
  }, [mealType]);
  return <main className="section portal-section"><div className="section-label"><span>AVISHKAR 2K26 / ADMINISTRATION</span><Link className="text-link" href="/admin">Back to admin</Link></div><div className="portal-heading"><div><span className="eyebrow">EVENT OPERATIONS</span><h1>MEAL<br/><span>CHECK-IN.</span></h1></div><Link className="button button-red" href="/admin/accommodation">Accommodation requests</Link></div><div className="meal-scanner-grid"><section className="portal-panel"><div className="section-label"><span>SCAN TEAM QR</span><label className="meal-select">MEAL<select value={mealType} onChange={(event) => { setMealType(event.target.value as MealType); setMessage(''); }}><option value="breakfast">Breakfast</option><option value="lunch">Lunch</option><option value="dinner">Dinner</option></select></label></div><video ref={videoRef} className="meal-camera" muted playsInline/><p>{scannerState}</p><form className="meal-manual" onSubmit={(event) => { event.preventDefault(); void checkIn(qrValue); }}><label>QR value<input value={qrValue} onChange={(event) => setQrValue(event.target.value)} placeholder="AV26MEAL:…" autoComplete="off"/></label><button className="button button-red" disabled={busy || !qrValue}>{busy ? 'Checking in…' : 'Verify meal'}</button></form>{message && <p role="status" className="meal-result">{message}</p>}</section><aside className="portal-panel"><span className="portal-label">HOW CHECK-IN WORKS</span><h2>One scan per team, per meal.</h2><p>Choose the meal and scan the team’s portal QR code. The scanner records the team, meal and India-local date. Duplicate scans for the same meal are rejected.</p><p>Camera access needs HTTPS (or localhost) and browser permission. The manual field is available as a fallback.</p></aside></div></main>;
}
