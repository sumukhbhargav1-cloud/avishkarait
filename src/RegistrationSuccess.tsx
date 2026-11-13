'use client';

import { useEffect, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface RegistrationSuccessProps {
  passphrase: string;
  onAcknowledge: () => void;
}

export default function RegistrationSuccess({ passphrase, onAcknowledge }: RegistrationSuccessProps) {
  const [copySuccess, setCopySuccess] = useState(false);
  const router = useRouter();

  const handleCopy = () => {
    navigator.clipboard.writeText(passphrase).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    });
  };

  const handleSaveAcknowledgement = () => {
    setSaved(true);
    onAcknowledge();
    // Navigate to login page so session can be established with passphrase
    setTimeout(() => {
      router.replace('/login');
    }, 500);
  };

  const [saved, setSaved] = useState(false);

  return (
    <section className="section register-section">
      <div className="register-intro">
        <span className="eyebrow">
          <span className="eyebrow-line"/> REGISTRATION CONFIRMED
        </span>
        <h2>Your account has been created</h2>
        <p>A participant account has been registered successfully.</p>
      </div>

      <div className="passphrase-display">
        <h3>Your passphrase</h3>
        <p className="passphrase-text">
          {passphrase}
        </p>
        <button
          className="button button-red"
          onClick={handleCopy}
          disabled={copySuccess}
        >
          {copySuccess ? 'Copied!' : 'Copy passphrase'} <ArrowUpRight size={12} />
        </button>
        <p className="passphrase-instructions">
          Save this passphrase securely. You will need it to log in to the participant portal.
        </p>
      </div>

      <div className="save-acknowledgement">
        <div className="acknowledgement-text">
          I acknowledge and confirm that I have safely saved the passphrase above.
        </div>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={saved}
            onChange={(e) => setSaved(e.target.checked)}
            disabled={copySuccess}
          />
          <span>I have saved the passphrase securely</span>
        </label>
      </div>

      <div className="success-actions">
        <button
          className="button button-red"
          onClick={handleCopy}
          disabled={copySuccess}
        >
          {copySuccess ? 'Copied!' : 'Copy passphrase'}
        </button>
        <button
          className="button outline"
          onClick={handleSaveAcknowledgement}
          disabled={copySuccess || !saved}
        >
          {saved ? 'Acknowledged' : 'Acknowledge and continue'}
        </button>
      </div>
    </section>
  );
}