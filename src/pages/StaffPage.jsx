import React, { useState, useEffect, useRef } from 'react';
import './StaffPage.css';

const IconRefresh = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 4v6h-6" />
    <path d="M1 20v-6h6" />
    <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
  </svg>
);

const IconCheck = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

const IconX = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

const IconWarn = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

function formatTime(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export default function StaffPage() {
  const [code, setCode]           = useState('');
  const [result, setResult]       = useState(null);
  const [checking, setChecking]   = useState(false);
  const [stats, setStats]         = useState({ maxCodes: 100, totalCodes: 0, usedCodes: 0 });
  const [newMax, setNewMax]       = useState('100');
  const [savingMax, setSavingMax] = useState(false);
  const [savedMax, setSavedMax]   = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { loadStats(); inputRef.current?.focus(); }, []);

  const loadStats = async () => {
    try {
      const res  = await fetch('/api/settings');
      const data = await res.json();
      setStats(data);
      setNewMax(String(data.maxCodes));
    } catch { /* silently fail */ }
  };

  const handleCodeChange = (e) => {
    // only uppercase alphanumeric, max 4 chars
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
    setCode(val);
    if (result) setResult(null);
  };

  const validate = async () => {
    const trimmed = code.trim();
    if (trimmed.length !== 4) return;
    setChecking(true);
    setResult(null);
    try {
      const res  = await fetch('/api/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: trimmed }),
      });
      const data = await res.json();
      setResult(data);
      if (data.status === 'valid') {
        setStats(s => ({ ...s, usedCodes: s.usedCodes + 1 }));
      }
    } catch {
      setResult({ status: 'error' });
    }
    setChecking(false);
  };

  const reset = () => {
    setCode('');
    setResult(null);
    inputRef.current?.focus();
  };

  const saveMax = async () => {
    const val = parseInt(newMax);
    if (isNaN(val) || val < 1) return;
    setSavingMax(true);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxCodes: val }),
      });
      setStats(s => ({ ...s, maxCodes: val }));
      setSavedMax(true);
      setTimeout(() => setSavedMax(false), 2500);
    } catch { /* silently fail */ }
    setSavingMax(false);
  };

  const issued  = stats.totalCodes;
  const used    = stats.usedCodes;
  const maxC    = stats.maxCodes;
  const pct     = maxC > 0 ? Math.min(100, Math.round((issued / maxC) * 100)) : 0;
  const remaining = Math.max(0, maxC - issued);

  return (
    <div className="sp-root">

      {/* ── HEADER ───────────────────────────────────────── */}
      <header className="sp-header">
        <div className="sp-header-inner">
          <img src="/logo.jpg" alt="Corner Walk" className="sp-logo" />
          <div className="sp-header-text">
            <span className="sp-header-eyebrow">Corner Walk</span>
            <h1 className="sp-header-title">Staff Portal</h1>
          </div>
          <button className="sp-refresh-btn" onClick={loadStats} title="Refresh stats">
            <IconRefresh />
          </button>
        </div>
      </header>

      {/* ── BODY ─────────────────────────────────────────── */}
      <main className="sp-body">

        {/* Validator card */}
        <div className="sp-card sp-validator-card">
          <p className="sp-card-label">Validate Code</p>

          <div className="sp-input-wrap">
            <input
              ref={inputRef}
              type="text"
              value={code}
              onChange={handleCodeChange}
              onKeyDown={e => e.key === 'Enter' && validate()}
              placeholder="A3K9"
              className={`sp-code-input${result ? ` sp-code-input--${result.status}` : ''}`}
              maxLength={4}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              inputMode="text"
              aria-label="Enter code"
            />
            <div className="sp-char-count">{code.length}/4</div>
          </div>

          <div className="sp-actions">
            <button
              className={`sp-validate-btn${checking ? ' sp-validate-btn--loading' : ''}`}
              onClick={validate}
              disabled={checking || code.length !== 4}
            >
              {checking
                ? <><span className="sp-spinner" />Checking…</>
                : 'Validate'}
            </button>
            {(result || code) && (
              <button className="sp-reset-btn" onClick={reset}>
                Clear
              </button>
            )}
          </div>

          {/* Result */}
          {result && (
            <div className={`sp-result sp-result--${result.status} anim-slide-down`}>
              <div className={`sp-result-icon-wrap sp-result-icon-wrap--${result.status}`}>
                {result.status === 'valid'   && <IconCheck />}
                {result.status === 'used'    && <IconWarn />}
                {result.status === 'invalid' && <IconX />}
                {result.status === 'error'   && '!'}
              </div>
              <div className="sp-result-body">
                {result.status === 'valid' && (
                  <>
                    <strong>Valid — Code Accepted ✓</strong>
                    <span>Snacks redeemed. Mark the code as used.</span>
                  </>
                )}
                {result.status === 'used' && (
                  <>
                    <strong>Already Claimed</strong>
                    <span>{result.usedAt ? `Used at ${formatTime(result.usedAt)}` : 'This code was already redeemed'}</span>
                  </>
                )}
                {result.status === 'invalid' && (
                  <>
                    <strong>Invalid Code</strong>
                    <span>This code does not exist in the system</span>
                  </>
                )}
                {result.status === 'error' && (
                  <>
                    <strong>Server Error</strong>
                    <span>Please try again in a moment</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Stats card */}
        <div className="sp-card sp-stats-card">
          <p className="sp-card-label">Live Stats</p>

          <div className="sp-stats-row">
            <div className="sp-stat">
              <span className="sp-stat-val sp-stat-val--red">{used}</span>
              <span className="sp-stat-lbl">Redeemed</span>
            </div>
            <div className="sp-stat-divider" />
            <div className="sp-stat">
              <span className="sp-stat-val">{issued}</span>
              <span className="sp-stat-lbl">Codes Issued</span>
            </div>
            <div className="sp-stat-divider" />
            <div className="sp-stat">
              <span className="sp-stat-val sp-stat-val--green">{remaining}</span>
              <span className="sp-stat-lbl">Remaining</span>
            </div>
          </div>

          <div className="sp-progress-wrap">
            <div className="sp-progress-bar">
              <div className="sp-progress-fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="sp-progress-labels">
              <span>{issued} of {maxC} issued</span>
              <span>{pct}%</span>
            </div>
          </div>
        </div>

        {/* Settings card */}
        <div className="sp-card sp-settings-card">
          <p className="sp-card-label">Settings</p>

          <div className="sp-setting-group">
            <label className="sp-setting-label" htmlFor="max-codes">
              Maximum Codes
            </label>
            <div className="sp-setting-row">
              <input
                id="max-codes"
                type="number"
                min="1"
                max="9999"
                value={newMax}
                onChange={e => setNewMax(e.target.value)}
                className="sp-setting-input"
                onKeyDown={e => e.key === 'Enter' && saveMax()}
              />
              <button
                className={`sp-save-btn${savedMax ? ' sp-save-btn--saved' : ''}`}
                onClick={saveMax}
                disabled={savingMax || savedMax}
              >
                {savedMax ? '✓ Saved' : savingMax ? '…' : 'Save'}
              </button>
            </div>
            <p className="sp-setting-hint">
              Once this limit is reached, no new codes can be claimed.
            </p>
          </div>
        </div>

      </main>
    </div>
  );
}
