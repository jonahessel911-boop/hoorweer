import { useState, useCallback } from 'react';
import { copyToClipboard } from '../lib/format';

interface CopyFieldProps {
  label: string;
  value: string;
  href?: string;
}

export function CopyField({ label, value, href }: CopyFieldProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    copyToClipboard(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }, [value]);

  return (
    <div className="copy-field">
      <span className="copy-field-label">{label}</span>
      <div className="copy-field-row">
        {href ? (
          <a href={href} className="copy-field-value copy-field-link">
            {value}
          </a>
        ) : (
          <span className="copy-field-value">{value || '—'}</span>
        )}
        {value && (
          <button
            type="button"
            className="copy-field-btn"
            onClick={handleCopy}
            title="Kopieer"
            aria-label={`Kopieer ${label}`}
          >
            {copied ? (
              <span className="copy-field-copied">Gekopieerd!</span>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
