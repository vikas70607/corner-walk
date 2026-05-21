import React, { useState, useCallback } from 'react';
import './ClaimPage.css';

/* ── Translations ─────────────────────────────────────────── */
const T = {
  en: {
    subtitle:     'Open Mic Night',
    title:        'Corner Walk',
    schedule:     'Sat & Sun',
    time:         '6 PM onwards',
    freeLabel:    'FREE Chips & Drink for you!',
    s1Label:      'Follow Us',
    s2Label:      'Get Code',
    s1Heading:    'Follow us on Instagram',
    s1Sub:        'Unlock your free snacks',
    s1Desc:       'Open Instagram, follow our page, then tap the button below.',
    s1BtnOpen:    'Open Instagram',
    s1BtnClaim:   "I've Followed — Get My Code",
    s1BtnLoading: 'Generating…',
    limitTitle:   'All codes claimed',
    limitHint:    'Please visit the snacks desk directly',
    errorRetry:   'Something went wrong — tap to retry',
    returnBadge:  'Welcome back!',
    returnHint:   'You already have your code',
    codeLabel:    'YOUR UNIQUE CODE',
    codeHint:     'Show this code to our staff at the snacks desk',
    copyBtn:      'Copy Code',
    copied:       'Copied!',
    s2Reminder:   'Not followed yet?',
    langBtn:      'हिंदी में देखें',
    poweredBy:    'Corner Walk · Open Mic',
  },
  hi: {
    subtitle:     'ओपन माइक नाइट',
    title:        'कॉर्नर वॉक',
    schedule:     'शनि & रवि',
    time:         'शाम 6 बजे से',
    freeLabel:    'आपके लिए मुफ्त चिप्स और ड्रिंक!',
    s1Label:      'फॉलो करें',
    s2Label:      'कोड लें',
    s1Heading:    'इंस्टाग्राम पर फॉलो करें',
    s1Sub:        'मुफ्त स्नैक्स अनलॉक करें',
    s1Desc:       'इंस्टाग्राम खोलें, हमारा पेज फॉलो करें, फिर नीचे का बटन दबाएं।',
    s1BtnOpen:    'इंस्टाग्राम खोलें',
    s1BtnClaim:   'फॉलो कर लिया — कोड लें',
    s1BtnLoading: 'कोड बन रहा है…',
    limitTitle:   'सभी कोड क्लेम हो गए',
    limitHint:    'कृपया सीधे स्नैक्स डेस्क पर जाएं',
    errorRetry:   'कुछ गलत हुआ — दोबारा टैप करें',
    returnBadge:  'वापसी पर स्वागत है!',
    returnHint:   'आपका कोड पहले से है',
    codeLabel:    'आपका यूनिक कोड',
    codeHint:     'यह कोड स्नैक्स डेस्क पर स्टाफ को दिखाएं',
    copyBtn:      'कोड कॉपी करें',
    copied:       'कॉपी हो गया!',
    s2Reminder:   'अभी तक फॉलो नहीं किया?',
    langBtn:      'View in English',
    poweredBy:    'Corner Walk · Open Mic',
  },
};

const INSTA_URL = 'https://www.instagram.com/cornerwalk.noida';

/* ── Icons ────────────────────────────────────────────────── */
const IconInstagram = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
  </svg>
);

const IconArrow = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);

const IconCopy = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
  </svg>
);

const IconCheck = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

/* ── Component ────────────────────────────────────────────── */
export default function ClaimPage() {
  const [lang, setLang]               = useState(() => localStorage.getItem('cw_lang') || 'en');
  const [savedCode]                   = useState(() => localStorage.getItem('cw_code'));
  const [claimedCode, setClaimedCode] = useState(null);
  const [step, setStep]               = useState(() => localStorage.getItem('cw_code') ? 2 : 1);
  const [uiState, setUiState]         = useState('idle'); // idle | loading | error | limit
  const [copied, setCopied]           = useState(false);
  const [instaOpened, setInstaOpened] = useState(false);

  const t          = T[lang];
  const isHindi    = lang === 'hi';
  const activeCode = claimedCode || savedCode;

  const toggleLang = () => {
    const next = lang === 'en' ? 'hi' : 'en';
    setLang(next);
    localStorage.setItem('cw_lang', next);
  };

  const claimCode = useCallback(async () => {
    setUiState('loading');
    try {
      const res  = await fetch('/api/claim', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      const data = await res.json();
      if (res.status === 403 || data.error === 'limit_reached') { setUiState('limit'); return; }
      if (!res.ok || !data.code)                                  { setUiState('error'); return; }
      localStorage.setItem('cw_code', data.code);
      setClaimedCode(data.code);
      setUiState('idle');
      setStep(2);
    } catch {
      setUiState('error');
    }
  }, []);

  const copyCode = async () => {
    try { await navigator.clipboard.writeText(activeCode); }
    catch {
      const el = document.createElement('textarea');
      el.value = activeCode;
      document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <div className={`cp-root${isHindi ? ' hindi' : ''}`}>

      {/* HERO */}
      <div className="cp-hero">
        <div className="cp-hero-grain" />
        <div className="cp-hero-circle cp-hero-circle--tl" />
        <div className="cp-hero-circle cp-hero-circle--br" />
        <div className="cp-hero-inner">
          <img src="/logo.jpg" alt="Corner Walk" className="cp-logo anim-fade-up" />
          <div className="cp-hero-text anim-fade-up">
            <span className="cp-badge">{t.subtitle}</span>
            {step === 2 && activeCode
              ? <p className="cp-hero-return">{t.returnHint}</p>
              : <h1 className="cp-hero-title">{t.title}</h1>
            }
            <div className="cp-pills">
              <span className="cp-pill"><span>📅</span>{t.schedule}</span>
              <span className="cp-pill"><span>🕕</span>{t.time}</span>
            </div>
          </div>
        </div>
        <div className="cp-wave">
          <svg viewBox="0 0 375 56" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 56 L0 28 Q93.75 0 187.5 18 Q281.25 36 375 8 L375 56 Z" fill="white" />
          </svg>
        </div>
      </div>

      {/* BODY */}
      <div className="cp-body">

        {/* Step indicator */}
        <div className="cp-stepper">
          <div className={`cp-step-node${step === 1 ? ' active' : ' done'}`}>
            <div className="cp-step-dot">{step > 1 ? <IconCheck /> : '1'}</div>
            <span>{t.s1Label}</span>
          </div>
          <div className={`cp-step-track${step === 2 ? ' done' : ''}`} />
          <div className={`cp-step-node${step === 2 ? ' active' : ''}`}>
            <div className="cp-step-dot">2</div>
            <span>{t.s2Label}</span>
          </div>
        </div>

        {/* STEP 1 */}
        {step === 1 && (
          <div className="cp-step1 anim-fade-up">

            <div className="cp-snack-banner">
              <span className="cp-snack-emoji">🍟</span>
              <p className="cp-snack-label">{t.freeLabel}</p>
              <span className="cp-snack-emoji">🥤</span>
            </div>

            <div className="cp-insta-card">
              <div className="cp-insta-card-top">
                <div className="cp-insta-icon-wrap"><IconInstagram /></div>
                <div>
                  <h2 className="cp-insta-heading">{t.s1Heading}</h2>
                  <p className="cp-insta-sub">{t.s1Sub}</p>
                </div>
              </div>
              <p className="cp-insta-desc">{t.s1Desc}</p>
              <a
                href={INSTA_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="cp-insta-open-btn"
                onClick={() => setInstaOpened(true)}
              >
                <IconInstagram />
                <span>{t.s1BtnOpen}</span>
                <span className="cp-insta-handle">@cornerwalk.noida ↗</span>
              </a>
            </div>

            {instaOpened && <div className="cp-cta">
              {uiState === 'limit' ? (
                <div className="cp-limit-box">
                  <span className="cp-limit-emoji">😔</span>
                  <p className="cp-limit-title">{t.limitTitle}</p>
                  <p className="cp-limit-hint">{t.limitHint}</p>
                </div>
              ) : (
                <button
                  className={`cp-claim-btn${uiState === 'loading' ? ' cp-claim-btn--loading' : ''}${uiState === 'error' ? ' cp-claim-btn--error' : ''}`}
                  onClick={claimCode}
                  disabled={uiState === 'loading'}
                >
                  {uiState === 'loading' ? (
                    <><span className="cp-spinner" />{t.s1BtnLoading}</>
                  ) : uiState === 'error' ? (
                    t.errorRetry
                  ) : (
                    <><span>{t.s1BtnClaim}</span><IconArrow /></>
                  )}
                </button>
              )}
            </div>}
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && activeCode && (
          <div className="cp-step2 anim-fade-up">
            <div className="cp-code-card anim-pop">
              <p className="cp-code-label">{t.codeLabel}</p>
              <div className="cp-code-digits">{activeCode}</div>
              <p className="cp-code-hint">{t.codeHint}</p>
              <button className={`cp-copy-btn${copied ? ' copied' : ''}`} onClick={copyCode}>
                {copied ? <IconCheck /> : <IconCopy />}
                <span>{copied ? t.copied : t.copyBtn}</span>
              </button>
            </div>

            <div className="cp-reminder-card">
              <p className="cp-reminder-label">{t.s2Reminder}</p>
              <a href={INSTA_URL} target="_blank" rel="noopener noreferrer" className="cp-reminder-insta">
                <IconInstagram />
                <span>@cornerwalk.noida ↗</span>
              </a>
            </div>
          </div>
        )}

        {/* Language toggle */}
        <div className="cp-lang">
          <button className="cp-lang-btn" onClick={toggleLang}>{t.langBtn}</button>
        </div>
        <p className="cp-footer">{t.poweredBy}</p>
      </div>
    </div>
  );
}
