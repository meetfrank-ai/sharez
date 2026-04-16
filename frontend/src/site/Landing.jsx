import { useEffect, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  BriefcaseBusiness,
  Check,
  Link2,
  Lock,
  MessageSquare,
  Search,
  Sparkles,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react';

// ============================================================
//  DESIGN TOKENS (Stripe-inspired)
// ============================================================
const T = {
  ink:       '#0A2540',
  ink2:      '#425466',
  ink3:      '#697386',
  line:      '#E3E8EE',
  lineSoft:  '#F0F3F7',
  bg:        '#FFFFFF',
  bg2:       '#F6F9FC',
  accent:    '#635BFF',
  accentSoft:'#EEEBFF',
  pos:       '#00A27A',
  neg:       '#E25C3B',
  navy:      '#0A2540',
};

const FONT_SANS = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const FONT_DISPLAY = "'Space Grotesk', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const FONT_MONO = "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace";

// ============================================================
//  INLINE GLOBAL STYLES (keyframes + helpers used in-page)
// ============================================================
function GlobalStyles() {
  return (
    <style>{`
      @keyframes stance-ribbon {
        0%, 100% { transform: translate(0, 0) rotate(0deg); }
        33%      { transform: translate(-8px, 10px) rotate(-0.5deg); }
        66%      { transform: translate(6px, -6px) rotate(0.4deg); }
      }
      .stance-ribbon-grp {
        animation: stance-ribbon 32s ease-in-out infinite;
        transform-origin: 70% 30%;
      }
      @keyframes stance-float {
        0%,100% { transform: translateY(0); }
        50%     { transform: translateY(-10px); }
      }
      @keyframes stance-hero-side {
        0%,100% { transform: translateY(0); }
        50%     { transform: translateY(-6px); }
      }
      .stance-hero-left  { animation: stance-hero-side 10s ease-in-out infinite; animation-delay: -2s; }
      .stance-hero-right { animation: stance-hero-side 11s ease-in-out infinite; }
      @keyframes stance-ticker {
        0%   { transform: translateX(0); }
        100% { transform: translateX(-50%); }
      }
      @keyframes stance-spark {
        from { stroke-dashoffset: 400; }
        to   { stroke-dashoffset: 0; }
      }
      @keyframes stance-reveal {
        from { opacity: 0; transform: translateY(16px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes stance-sticker-bob {
        0%, 100% { transform: translate3d(0, 0, 0) rotate(var(--sticker-rotate)); }
        50% { transform: translate3d(0, calc(var(--sticker-drift) * -1), 0) rotate(var(--sticker-rotate)); }
      }
      .stance-reveal { animation: stance-reveal 0.8s ease-out both; }
      .stance-float  { animation: stance-float 6s ease-in-out infinite; }
      .stance-spark path { stroke-dasharray: 400; animation: stance-spark 2.2s ease-out both; }
      .stance-ticker-track { animation: stance-ticker 50s linear infinite; }
      .stance-link { color: ${T.ink2}; text-decoration: none; transition: color 150ms ease; }
      .stance-link:hover { color: ${T.accent}; }
      .stance-cta:hover { transform: translateY(-1px); box-shadow: 0 18px 40px rgba(99,91,255,0.32); }
      .stance-cta { transition: transform 150ms ease, box-shadow 150ms ease; }
      .stance-ghost:hover { color: ${T.accent}; }
      .stance-ghost { transition: color 150ms ease; }
      .stance-input::placeholder { color: ${T.ink3}; }

      /* SideNav: only render when viewport has space for a gutter */
      .stance-sidenav { display: none; }
      @media (min-width: 1180px) { .stance-sidenav { display: block; } }
      .stance-sidenav a .label {
        opacity: 0;
        transform: translateX(-6px);
        transition: opacity 220ms ease, transform 220ms ease;
        pointer-events: none;
        white-space: nowrap;
      }
      .stance-sidenav a:hover .label,
      .stance-sidenav a .label.is-active {
        opacity: 1;
        transform: translateX(0);
      }

      /* Desktop header nav links — shown only on wider screens */
      .sx-nav-links { display: none; }
      @media (min-width: 861px) {
        .sx-nav-links { display: flex; }
      }

      /* ============= MOBILE ============= */
      @media (max-width: 860px) {
        .sx-hero       { padding: 40px 20px 8px !important; }
        .sx-sec        { padding: 56px 20px !important; }
        .sx-sec-tight  { padding: 56px 20px !important; }
        .sx-sec-wide   { padding: 64px 20px 72px !important; }
        .sx-launch     { padding: 64px 20px !important; }
        .sx-emoji      { display: none !important; }

        .sx-grid-2, .sx-grid-3 {
          grid-template-columns: 1fr !important;
          gap: 40px !important;
        }
        .sx-grid-3 { gap: 24px !important; }
        .sx-grid-3 > * { margin-bottom: 0 !important; }
        .sx-form-2 { grid-template-columns: 1fr !important; }
        .sx-how-connector { display: none !important; }
        .sx-section-head { max-width: 100% !important; }

        /* give MockFrame and its contents a chance to breathe */
        .sx-mock-pad { padding-left: 16px !important; padding-right: 16px !important; }
        .sx-port-row { grid-template-columns: 36px 1fr 60px 48px !important; gap: 10px !important; }
        .sx-disc-row { grid-template-columns: 40px 1fr auto !important; gap: 12px !important; padding: 18px 18px !important; }
        .sx-nav-cta  { display: none !important; }
        .sx-hero-side { display: none !important; }
        .sx-hero-composite { height: auto !important; margin-top: 32px !important; }
        .sx-hero-composite > div:last-child { position: static !important; left: auto !important; transform: none !important; width: 100% !important; max-width: 360px !important; margin: 0 auto !important; }
        .sx-step-card { transform: none !important; }
        .sx-hero-reveal .sx-sticker-hero { top: -18px !important; right: -4px !important; width: 48px !important; height: 48px !important; font-size: 26px !important; }
      }
    `}</style>
  );
}

// ============================================================
//  HERO RIBBON (Stripe-style flowing SVG artifact)
// ============================================================
function HeroRibbon() {
  // Deterministic strand set — each strand is a slight perturbation of
  // the base S-curve so stacking ~90 creates a silk-like texture.
  const N = 90;
  const strands = Array.from({ length: N }, (_, i) => {
    const t = i / (N - 1);               // 0..1 across the fabric
    const ox = (t - 0.5) * 180;          // horizontal spread across the top
    const oy = i * 1.2;                  // vertical stagger
    // Peak opacity/width in the middle of the bundle, taper at edges.
    const bell = 1 - Math.abs(t - 0.5) * 2;
    return {
      ox, oy,
      w: 0.4 + bell * 1.4,
      op: 0.06 + bell * 0.55,
    };
  });

  return (
    <div aria-hidden style={{
      position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0,
    }}>
      <svg
        viewBox="0 0 900 1000"
        preserveAspectRatio="xMaxYMin slice"
        style={{
          position: 'absolute', top: 0, right: 0,
          width: '68%', height: '135%',
          minWidth: 680,
        }}
      >
        <defs>
          <linearGradient id="ribbonGrad" x1="85%" y1="0%" x2="10%" y2="100%">
            <stop offset="0%"   stopColor="#FB7185" />
            <stop offset="22%"  stopColor="#F472B6" />
            <stop offset="48%"  stopColor="#C084FC" />
            <stop offset="70%"  stopColor="#7C3AED" />
            <stop offset="88%"  stopColor="#635BFF" />
            <stop offset="100%" stopColor="#60A5FA" />
          </linearGradient>
          <radialGradient id="ribbonFade" cx="100%" cy="0%" r="115%">
            <stop offset="0%"  stopColor="#FFFFFF" stopOpacity="1" />
            <stop offset="55%" stopColor="#FFFFFF" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>
          <mask id="ribbonMask">
            <rect width="100%" height="100%" fill="url(#ribbonFade)" />
          </mask>
        </defs>
        <g mask="url(#ribbonMask)" className="stance-ribbon-grp">
          {strands.map((s, i) => (
            <path
              key={i}
              d={`M ${760 + s.ox} ${-50 + s.oy}
                  C ${520 + s.ox * 0.65} ${200 + s.oy * 0.8},
                    ${380 + s.ox * 0.45} ${480 + s.oy * 0.6},
                    ${240 + s.ox * 0.3}  ${720 + s.oy * 0.4}
                  S ${60  + s.ox * 0.2}  ${950 + s.oy * 0.2},
                    ${-90 + s.ox * 0.15} ${1100}`}
              stroke="url(#ribbonGrad)"
              strokeWidth={s.w}
              strokeLinecap="round"
              fill="none"
              opacity={s.op}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}

// ============================================================
//  PRIMITIVES
// ============================================================
function Eyebrow({ children, color = T.accent }) {
  return (
    <span style={{
      fontSize: 13, fontWeight: 600, letterSpacing: '0.04em',
      color, textTransform: 'uppercase',
    }}>{children}</span>
  );
}

function SectionHead({ eyebrow, title, body, align = 'left', maxWidth = 620 }) {
  return (
    <div style={{ maxWidth, textAlign: align, margin: align === 'center' ? '0 auto' : undefined }}>
      {eyebrow && <div style={{ marginBottom: 18 }}><Eyebrow>{eyebrow}</Eyebrow></div>}
      <h2 style={{
        fontFamily: FONT_DISPLAY,
        fontSize: 'clamp(32px, 4.2vw, 52px)',
        fontWeight: 700, lineHeight: 1.02, letterSpacing: '-0.04em',
        color: T.ink, margin: 0, marginBottom: 20,
      }}>{title}</h2>
      {body && (
        <p style={{
          fontSize: 19, lineHeight: 1.55, color: T.ink2, margin: 0,
        }}>{body}</p>
      )}
    </div>
  );
}

function PrimaryCTA({ children, onClick, href, type = 'button' }) {
  const Tag = href ? 'a' : 'button';
  return (
    <Tag
      {...(href ? { href } : { type, onClick })}
      className="stance-cta"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        backgroundColor: T.accent, color: '#FFFFFF',
        padding: '14px 22px', borderRadius: 999,
        fontSize: 15, fontWeight: 600, letterSpacing: '-0.005em',
        border: 'none', cursor: 'pointer', textDecoration: 'none',
        boxShadow: '0 10px 30px rgba(99,91,255,0.28)',
      }}
    >
      {children} <ArrowRight size={16} strokeWidth={2.4} />
    </Tag>
  );
}

function GhostCTA({ children, href = '#' }) {
  return (
    <a href={href} className="stance-ghost"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        color: T.ink, fontSize: 15, fontWeight: 600,
        textDecoration: 'none', padding: '14px 4px',
      }}
    >
      {children} <ArrowRight size={15} strokeWidth={2.4} />
    </a>
  );
}

// ============================================================
//  TINY CHARTS / ATOMS
// ============================================================
function Sparkline({ points, color = T.pos, width = 80, height = 28, strokeWidth = 1.8, animated = false, responsive = false }) {
  const max = Math.max(...points), min = Math.min(...points);
  const range = max - min || 1;
  const stepX = width / (points.length - 1);
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${(i * stepX).toFixed(1)},${(height - ((p - min) / range) * height).toFixed(1)}`).join(' ');
  const svgProps = responsive
    ? { width: '100%', height, viewBox: `0 0 ${width} ${height}`, preserveAspectRatio: 'none', style: { display: 'block' } }
    : { width, height };
  return (
    <svg {...svgProps} className={animated ? 'stance-spark' : undefined}>
      <path d={path} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DonutAllocation({ slices, size = 150, thickness = 22 }) {
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={T.lineSoft} strokeWidth={thickness} />
      {slices.map((s, i) => {
        const len = (s.pct / 100) * c;
        const el = (
          <circle key={i}
            cx={size/2} cy={size/2} r={r}
            fill="none" stroke={s.color} strokeWidth={thickness}
            strokeDasharray={`${len} ${c - len}`}
            strokeDashoffset={-acc}
          />
        );
        acc += len;
        return el;
      })}
    </svg>
  );
}

function Avatar({ initials, color, size = 32 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      backgroundColor: color, color: '#FFFFFF',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.4, fontWeight: 600, flexShrink: 0,
      fontFamily: FONT_SANS,
    }}>{initials}</div>
  );
}

function PositionTag({ ticker, label }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 10px', borderRadius: 999,
      backgroundColor: T.accentSoft, border: `1px solid ${T.accentSoft}`,
      fontFamily: FONT_MONO, fontSize: 12, fontWeight: 600,
      color: T.accent,
    }}>
      {ticker}
      <span style={{ color: T.ink2, fontWeight: 500, fontSize: 11 }}>· {label}</span>
    </span>
  );
}

function EmojiSticker({ emoji, size = 58, top, left, right, bottom, rotate = -8, drift = 8, delay = '0s', duration = '7.5s' }) {
  return (
    <div
      aria-hidden
      className="sx-emoji"
      style={{
        position: 'absolute',
        top, left, right, bottom,
        zIndex: 10,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
        width: size, height: size,
        borderRadius: '50%',
        backgroundColor: '#FFFFFF',
        border: `1px solid ${T.line}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: Math.round(size * 0.54),
        boxShadow: '0 16px 30px rgba(10,37,64,0.12), 0 4px 10px rgba(10,37,64,0.05)',
        transform: `rotate(${rotate}deg)`,
        '--sticker-rotate': `${rotate}deg`,
        '--sticker-drift': `${drift}px`,
        animation: `stance-sticker-bob ${duration} ease-in-out ${delay} infinite`,
      }}
    >
      {emoji}
      </div>
    </div>
  );
}

function StockChip({ ticker, change }) {
  const positive = change >= 0;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 10px', borderRadius: 999,
      backgroundColor: T.bg2, border: `1px solid ${T.line}`,
      fontFamily: FONT_MONO, fontSize: 12, fontWeight: 600,
      color: T.ink,
    }}>
      {ticker}
      <span style={{ color: positive ? T.pos : T.neg, fontWeight: 500 }}>
        {positive ? '+' : ''}{change.toFixed(1)}%
      </span>
    </span>
  );
}

// ============================================================
//  PRODUCT MOCKS
// ============================================================
const CARD_SHADOW = '0 30px 80px -20px rgba(10,37,64,0.18), 0 12px 32px -12px rgba(10,37,64,0.08)';

function MockFrame({ children, style, className }) {
  return (
    <div className={className} style={{
      backgroundColor: '#FFFFFF',
      border: `1px solid ${T.line}`,
      borderRadius: 20,
      boxShadow: CARD_SHADOW,
      overflow: 'hidden',
      fontFamily: FONT_SANS,
      ...style,
    }}>{children}</div>
  );
}

function PortfolioMock({ floating = false }) {
  const holdings = [
    { t: 'NPN',  n: 'Naspers',   sector: 'Technology', alloc: 22.8, color: '#635BFF' },
    { t: 'CPI',  n: 'Capitec',   sector: 'Financials', alloc: 18.4, color: '#7EE8D2' },
    { t: 'MTN',  n: 'MTN Group', sector: 'Telecom',    alloc: 15.2, color: '#FFD37A' },
    { t: 'AAPL', n: 'Apple',     sector: 'Technology', alloc: 12.7, color: '#FB7185' },
    { t: 'SHP',  n: 'Shoprite',  sector: 'Consumer',   alloc:  9.1, color: '#A78BFA' },
  ];

  return (
    <MockFrame className={floating ? 'stance-float' : undefined}>
      {/* identity header */}
      <div style={{ padding: '20px 24px', borderBottom: `1px solid ${T.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Avatar initials="TM" color="#635BFF" size={44} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: T.ink }}>Thabo Mokoena</span>
              <BadgeCheck size={15} style={{ color: T.accent }} fill={T.accentSoft} />
            </div>
            <span style={{ fontSize: 13, color: T.ink3, fontFamily: FONT_MONO }}>@thabom · Long-only, mostly JSE</span>
          </div>
        </div>
        <button style={{
          padding: '8px 16px', borderRadius: 999,
          backgroundColor: T.ink, color: '#FFFFFF',
          fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
        }}>Follow</button>
      </div>

      {/* Allocation donut — what they own, at a glance */}
      <div style={{ padding: '24px 24px 26px', borderBottom: `1px solid ${T.line}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: T.ink3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Allocation</span>
          <span style={{ fontSize: 11, fontFamily: FONT_MONO, color: T.ink3 }}>{holdings.length} positions</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '156px 1fr', gap: 24, alignItems: 'center' }}>
          <div style={{ position: 'relative', width: 156, height: 156, justifySelf: 'center' }}>
            <DonutAllocation slices={holdings.map((h) => ({ pct: h.alloc, color: h.color }))} size={156} thickness={20} />
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: T.ink, fontFamily: FONT_MONO, letterSpacing: '-0.02em', lineHeight: 1 }}>{holdings.length}</div>
              <div style={{ fontSize: 10, color: T.ink3, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>Positions</div>
            </div>
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {holdings.map((h) => (
              <div key={h.t} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: h.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontFamily: FONT_MONO, fontWeight: 600, color: T.ink }}>{h.t}</span>
                <span style={{ fontSize: 12, fontFamily: FONT_MONO, color: T.ink3, marginLeft: 'auto' }}>{h.alloc}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Holdings list — position + attached thinking on first row */}
      <div>
        {holdings.map((h, i) => (
          <div key={h.t}>
            <div className="sx-port-row" style={{
              padding: '16px 24px',
              display: 'grid',
              gridTemplateColumns: '40px 1fr 120px 56px',
              alignItems: 'center', gap: 14,
              borderTop: i === 0 ? 'none' : `1px solid ${T.lineSoft}`,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                backgroundColor: h.color + '22', color: h.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: FONT_MONO, fontSize: 11, fontWeight: 700,
              }}>
                {h.t.slice(0,3)}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>{h.n}</div>
                <div style={{ fontSize: 12, color: T.ink3, fontFamily: FONT_MONO }}>{h.t} · {h.sector}</div>
              </div>
              <div style={{
                height: 6, borderRadius: 3,
                backgroundColor: T.lineSoft,
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${(h.alloc / 22.8) * 100}%`,
                  height: '100%',
                  backgroundColor: h.color,
                }} />
              </div>
              <div style={{ fontSize: 13, fontFamily: FONT_MONO, color: T.ink, textAlign: 'right', fontWeight: 600 }}>{h.alloc}%</div>
            </div>

            {/* Attached note on the top holding — this is the whole point */}
            {i === 0 && (
              <div style={{
                margin: '0 24px 16px 64px',
                padding: '12px 14px',
                borderRadius: 10,
                backgroundColor: T.bg2,
                borderLeft: `3px solid ${T.accent}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: T.accent, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Note</span>
                  <span style={{ fontSize: 11, color: T.ink3, fontFamily: FONT_MONO }}>2h ago</span>
                </div>
                <p style={{ fontSize: 13, lineHeight: 1.55, color: T.ink, margin: 0 }}>
                  &ldquo;P/E expansion has outpaced earnings growth two quarters running. Thinking about trimming.&rdquo;
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </MockFrame>
  );
}

function FeedMock() {
  return (
    <div style={{ display: 'grid', gap: 16, fontFamily: FONT_SANS }}>
      {/* Note card with position context + threaded replies */}
      <MockFrame>
        <div style={{ padding: '18px 20px', borderBottom: `1px solid ${T.lineSoft}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <Avatar initials="LS" color="#FB7185" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>Lebo Sithole</div>
              <div style={{ fontSize: 12, color: T.ink3, fontFamily: FONT_MONO }}>@lebos · 2h</div>
            </div>
            <PositionTag ticker="NPN" label="Top holding" />
          </div>
          <p style={{ fontSize: 15, lineHeight: 1.55, color: T.ink, margin: 0, marginBottom: 12 }}>
            Thinking about trimming Naspers here. P/E expansion has outpaced earnings growth two quarters running — and Tencent exposure isn't the safety net it used to be.
          </p>
          {/* Position context — the whole point of the product */}
          <a href="#portfolio" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 10px', borderRadius: 8,
            backgroundColor: T.bg2, border: `1px solid ${T.line}`,
            fontSize: 12, color: T.ink2, textDecoration: 'none',
            marginBottom: 14,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#635BFF' }} />
            <span><strong style={{ color: T.ink, fontWeight: 600 }}>Naspers · 22.8% of portfolio</strong></span>
            <span style={{ color: T.ink3, fontFamily: FONT_MONO, fontSize: 11 }}>View portfolio →</span>
          </a>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 13, color: T.ink3 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>♡ 12</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><MessageSquare size={14} /> 2</span>
          </div>
        </div>
        {/* Replies — framed as discourse, not comments */}
        <div style={{ padding: '14px 20px 18px', display: 'grid', gap: 12 }}>
          <div style={{ fontSize: 11, color: T.ink3, fontFamily: FONT_MONO, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Replying to Lebo
          </div>
          {[
            { a: 'JM', c: '#FB7185', n: 'Jordan M.', t: '1h', body: 'Agree on the P/E — but the classifieds unit is finally profitable. Changes the story?' },
            { a: 'PR', c: '#635BFF', n: 'Priya R.',  t: '22m', body: 'I trimmed 15% last week on the same logic. No regrets.' },
          ].map((r, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, paddingLeft: 14, borderLeft: `2px solid ${T.lineSoft}` }}>
              <Avatar initials={r.a} color={r.c} size={24} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: T.ink }}>{r.n}</span>
                  <span style={{ fontSize: 11, color: T.ink3, fontFamily: FONT_MONO }}>{r.t}</span>
                </div>
                <p style={{ fontSize: 13, lineHeight: 1.5, color: T.ink2, margin: 0 }}>{r.body}</p>
              </div>
            </div>
          ))}
        </div>
      </MockFrame>

      {/* Positioning update card (was buy transaction) */}
      <MockFrame>
        <div style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <Avatar initials="NK" color="#635BFF" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: T.ink3, marginBottom: 2 }}>
                <span style={{ color: T.ink, fontWeight: 600 }}>Nolwazi K.</span> added to Capitec
              </div>
              <div style={{ fontSize: 11, color: T.ink3, fontFamily: FONT_MONO }}>@nolwazik · 3h</div>
            </div>
          </div>
          {/* New allocation bar */}
          <div style={{
            padding: '12px 14px', borderRadius: 10,
            backgroundColor: T.bg2, border: `1px solid ${T.line}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>Capitec now 4.3% of portfolio</span>
              <span style={{ fontSize: 11, color: T.ink3, fontFamily: FONT_MONO }}>was 2.1%</span>
            </div>
            <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: T.lineSoft }}>
              <div style={{ width: '21%', backgroundColor: '#7EE8D2' }} />
              <div style={{ width: '22%', background: `repeating-linear-gradient(-45deg, #7EE8D2 0 4px, #7EE8D2aa 4px 8px)` }} />
            </div>
            <div style={{ fontSize: 11, color: T.ink3, marginTop: 6, fontFamily: FONT_MONO }}>
              2.1% previous · +2.2% added
            </div>
          </div>
        </div>
      </MockFrame>

      {/* Thesis card with position context */}
      <MockFrame>
        <div style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <Avatar initials="SJ" color="#7EE8D2" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: T.ink3 }}>
                <span style={{ color: T.ink, fontWeight: 600 }}>Sipho J.</span> published a thesis
              </div>
              <div style={{ fontSize: 11, color: T.ink3, fontFamily: FONT_MONO }}>5h · 4 min read</div>
            </div>
            <span style={{ fontSize: 11, fontFamily: FONT_MONO, padding: '4px 8px', borderRadius: 6, backgroundColor: T.accentSoft, color: T.accent, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Vault</span>
          </div>
          <div style={{ fontSize: 17, fontWeight: 600, color: T.ink, marginBottom: 6, letterSpacing: '-0.01em' }}>
            Why MTN is a decade story, not a quarter one
          </div>
          <p style={{ fontSize: 13, lineHeight: 1.55, color: T.ink2, margin: 0, marginBottom: 12 }}>
            Fintech ARPU is finally the driver of the story. Call vol declines matter less than the 400-basis-point shift in revenue mix I'm seeing…
          </p>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '5px 10px', borderRadius: 8,
            backgroundColor: T.bg2, border: `1px solid ${T.line}`,
            fontSize: 12, color: T.ink2,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#FFD37A' }} />
            <strong style={{ color: T.ink, fontWeight: 600 }}>MTN · 15.2% of portfolio</strong>
          </div>
        </div>
      </MockFrame>
    </div>
  );
}

function StockMock() {
  return (
    <MockFrame>
      {/* header */}
      <div style={{ padding: '22px 24px', borderBottom: `1px solid ${T.line}` }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{ fontFamily: FONT_MONO, fontSize: 13, fontWeight: 700, color: T.ink, padding: '3px 8px', backgroundColor: T.accentSoft, borderRadius: 6 }}>NPN</span>
              <span style={{ fontSize: 12, fontFamily: FONT_MONO, color: T.ink3 }}>JSE · Technology</span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 600, color: T.ink, letterSpacing: '-0.01em' }}>Naspers Ltd.</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 22, fontWeight: 600, color: T.ink, fontFamily: FONT_MONO, letterSpacing: '-0.015em' }}>R 3,241.50</div>
            <div style={{ fontSize: 12, color: T.ink3, fontFamily: FONT_MONO }}>+R 72.80  ·  +2.3%</div>
          </div>
        </div>
        {/* muted chart — context, not the main event */}
        <div style={{ marginTop: 12, opacity: 0.45, maxWidth: '100%', overflow: 'hidden' }}>
          <Sparkline points={[30,31,29,32,31,33,34,33,35,34,36,37,36,38,37,39,40,41]} width={520} height={40} strokeWidth={1.4} color={T.ink2} responsive />
        </div>
      </div>

      {/* What changed — editorial, not AI-gimmicky */}
      <div style={{ padding: '20px 24px', backgroundColor: T.bg2, borderBottom: `1px solid ${T.line}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: T.pos, boxShadow: `0 0 0 3px ${T.pos}22` }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: T.pos, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Updated just now</span>
          </span>
          <span style={{ fontSize: 15, fontWeight: 700, color: T.ink, letterSpacing: '-0.01em', marginLeft: 'auto' }}>What changed</span>
        </div>
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 10 }}>
          {[
            'Fintech revenue grew 41% YoY; now 18% of group revenue vs. 11% a year ago.',
            'Tencent discount narrowed to 42% after buyback acceleration in Q3.',
            'Classifieds unit reached profitability ahead of guidance.',
          ].map((b, i) => (
            <li key={i} style={{ display: 'flex', gap: 10, fontSize: 14, lineHeight: 1.55, color: T.ink }}>
              <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: T.accent, flexShrink: 0, marginTop: 4, fontWeight: 700 }}>0{i + 1}</span>
              {b}
            </li>
          ))}
        </ul>
      </div>

      {/* Community layer — flipped hierarchy: insight headline, names underneath */}
      <div style={{ padding: '20px 24px' }}>
        <div style={{ fontSize: 18, fontWeight: 600, color: T.ink, marginBottom: 8, letterSpacing: '-0.01em' }}>
          64% bullish · Avg allocation 6.2%
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex' }}>
            {['#635BFF','#FB7185','#7EE8D2','#FFD37A','#A78BFA'].map((c, i) => (
              <div key={i} style={{
                width: 24, height: 24, borderRadius: '50%',
                backgroundColor: c, border: '2px solid #FFFFFF',
                marginLeft: i === 0 ? 0 : -8,
              }} />
            ))}
          </div>
          <div style={{ fontSize: 13, color: T.ink2 }}>
            Held by <span style={{ color: T.ink, fontWeight: 500 }}>Amanda</span>, <span style={{ color: T.ink, fontWeight: 500 }}>Thabo</span>, <span style={{ color: T.ink, fontWeight: 500 }}>Priya</span>
            <span style={{ color: T.ink3 }}> · 9 others</span>
          </div>
        </div>
      </div>
    </MockFrame>
  );
}

function DiscoverMock() {
  const creators = [
    {
      initials: 'AP', name: 'Amanda Pillay', color: '#7EE8D2',
      bio: 'SA banking & fintech specialist',
      alloc: [
        { c: '#635BFF', w: 38, label: 'SA banks' },
        { c: '#7EE8D2', w: 24, label: 'Fintech' },
        { c: '#FFD37A', w: 16, label: 'Insurance' },
        { c: '#FB7185', w: 12, label: 'Retail' },
        { c: '#A78BFA', w: 10, label: 'Cash' },
      ],
      top: 'NPN · CPI · SBK',
      latest: 'Why SA banks re-rate in 2027',
      meta: '18 theses · 2 years active',
    },
    {
      initials: 'TM', name: 'Thabo Mokoena', color: '#635BFF',
      bio: 'Long-only, mostly JSE mid-caps',
      alloc: [
        { c: '#FB7185', w: 32, label: 'Mid-caps' },
        { c: '#A78BFA', w: 22, label: 'Industrials' },
        { c: '#635BFF', w: 18, label: 'Tech' },
        { c: '#7EE8D2', w: 16, label: 'Financials' },
        { c: '#FFD37A', w: 12, label: 'Consumer' },
      ],
      top: 'MTN · SHP · BVT',
      latest: 'Quiet compounders I\'m holding for a decade',
      meta: '6 theses · 18 months active',
    },
    {
      initials: 'PR', name: 'Priya R.', color: '#A78BFA',
      bio: 'US tech, concentrated positions',
      alloc: [
        { c: '#7EE8D2', w: 42, label: 'US tech' },
        { c: '#635BFF', w: 28, label: 'Semis' },
        { c: '#FFD37A', w: 18, label: 'AI' },
        { c: '#FB7185', w: 12, label: 'Cash' },
      ],
      top: 'NVDA · MSFT · AAPL',
      latest: 'The case for NVDA at current multiples',
      meta: '11 theses · 3 years active',
    },
  ];

  return (
    <MockFrame>
      <div style={{ padding: '18px 24px', borderBottom: `1px solid ${T.line}` }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: T.ink3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Creators</div>
      </div>
      {creators.map((c, i) => (
        <div
          key={c.name}
          className="sx-disc-row"
          style={{
            padding: '20px 24px',
            display: 'grid',
            gridTemplateColumns: '44px 1fr auto',
            gap: 14,
            alignItems: 'flex-start',
            borderTop: i === 0 ? 'none' : `1px solid ${T.lineSoft}`,
          }}
        >
          <Avatar initials={c.initials} color={c.color} size={44} />
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: T.ink }}>{c.name}</span>
              <BadgeCheck size={13} style={{ color: T.accent }} fill={T.accentSoft} />
            </div>
            <div style={{ fontSize: 12, color: T.ink3, marginBottom: 10 }}>{c.bio}</div>
            {/* allocation bar with meaning */}
            <div style={{ display: 'flex', height: 5, borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
              {c.alloc.map((a, ai) => (
                <div key={ai} style={{ backgroundColor: a.c, width: `${a.w}%` }} />
              ))}
            </div>
            <div style={{ fontSize: 11, color: T.ink3, fontFamily: FONT_MONO, marginBottom: 10 }}>
              {c.alloc.slice(0, 3).map(a => a.label).join(' · ')}
            </div>
            {/* top positions */}
            <div style={{ fontSize: 13, color: T.ink2, marginBottom: 4 }}>
              <span style={{ color: T.ink3 }}>Top positions: </span>
              <span style={{ fontFamily: FONT_MONO, fontWeight: 600, color: T.ink }}>{c.top}</span>
            </div>
            {/* latest thesis — direct link to thinking */}
            <div style={{ fontSize: 13, color: T.ink2, marginBottom: 8 }}>
              <span style={{ color: T.ink3 }}>Latest: </span>
              <span style={{ color: T.ink, fontWeight: 500 }}>&ldquo;{c.latest}&rdquo;</span>
            </div>
            <div style={{ fontSize: 11, fontFamily: FONT_MONO, color: T.ink3 }}>{c.meta}</div>
          </div>
          <button style={{
            padding: '8px 16px', borderRadius: 999,
            backgroundColor: T.ink, color: '#FFFFFF',
            fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
            fontFamily: FONT_SANS,
          }}>Follow</button>
        </div>
      ))}
    </MockFrame>
  );
}

// ============================================================
//  HERO GLIMPSE MOCKS (compact variants for the 3-card composite)
// ============================================================
function PortfolioGlimpse() {
  return (
    <MockFrame>
      <div style={{ padding: '14px 16px', borderBottom: `1px solid ${T.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <Avatar initials="TM" color="#635BFF" size={34} />
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>Thabo Mokoena</span>
              <BadgeCheck size={12} style={{ color: T.accent }} fill={T.accentSoft} />
            </div>
            <span style={{ fontSize: 11, color: T.ink3, fontFamily: FONT_MONO }}>@thabom · Long-only, SA</span>
          </div>
        </div>
        <button style={{
          padding: '5px 12px', borderRadius: 999,
          backgroundColor: T.ink, color: '#FFFFFF',
          fontSize: 11, fontWeight: 600, border: 'none', flexShrink: 0,
        }}>Follow</button>
      </div>
      <div style={{ padding: '14px 16px', borderBottom: `1px solid ${T.line}` }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: T.ink3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Allocation · 5 positions</div>
        <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ backgroundColor: '#635BFF', width: '23%' }} />
          <div style={{ backgroundColor: '#7EE8D2', width: '18%' }} />
          <div style={{ backgroundColor: '#FFD37A', width: '15%' }} />
          <div style={{ backgroundColor: '#FB7185', width: '13%' }} />
          <div style={{ backgroundColor: '#A78BFA', width: '9%' }} />
          <div style={{ backgroundColor: T.lineSoft, flex: 1 }} />
        </div>
      </div>
      {[
        { t: 'NPN', n: 'Naspers', alloc: 22.8, color: '#635BFF', noted: true },
        { t: 'CPI', n: 'Capitec', alloc: 18.4, color: '#7EE8D2' },
      ].map((h, i) => (
        <div key={h.t}>
          <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: '30px 1fr 44px', alignItems: 'center', gap: 10, borderTop: i === 0 ? 'none' : `1px solid ${T.lineSoft}` }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: h.color + '22', color: h.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT_MONO, fontSize: 10, fontWeight: 700 }}>{h.t}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{h.n}</div>
            <div style={{ fontSize: 12, fontFamily: FONT_MONO, color: T.ink, textAlign: 'right', fontWeight: 600 }}>{h.alloc}%</div>
          </div>
          {h.noted && (
            <div style={{ margin: '0 16px 14px 52px', padding: '10px 12px', borderRadius: 8, backgroundColor: T.bg2, borderLeft: `3px solid ${T.accent}` }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: T.accent, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Note · 2h</div>
              <p style={{ fontSize: 12, lineHeight: 1.5, color: T.ink, margin: 0 }}>
                &ldquo;Thinking about trimming here. P/E outpaced earnings two quarters.&rdquo;
              </p>
            </div>
          )}
        </div>
      ))}
    </MockFrame>
  );
}

function FeedGlimpse() {
  return (
    <MockFrame>
      <div style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <Avatar initials="LS" color="#FB7185" size={30} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.ink }}>Lebo Sithole</div>
            <div style={{ fontSize: 10, color: T.ink3, fontFamily: FONT_MONO }}>@lebos · 2h</div>
          </div>
        </div>
        <p style={{ fontSize: 13, lineHeight: 1.5, color: T.ink, margin: 0, marginBottom: 10 }}>
          Thinking about trimming Naspers. P/E outpaced earnings two quarters.
        </p>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '4px 10px', borderRadius: 8,
          backgroundColor: T.bg2, border: `1px solid ${T.line}`,
          fontSize: 11,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: '#635BFF' }} />
          <strong style={{ color: T.ink, fontWeight: 600 }}>NPN · 22.8%</strong>
        </div>
      </div>
    </MockFrame>
  );
}

function StockGlimpse() {
  return (
    <MockFrame>
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontFamily: FONT_MONO, fontSize: 11, fontWeight: 700, color: T.ink, padding: '2px 6px', backgroundColor: T.accentSoft, borderRadius: 4 }}>NPN</span>
          <span style={{ fontSize: 10, fontFamily: FONT_MONO, color: T.ink3 }}>Technology</span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, fontFamily: FONT_MONO }}>R 3,241</div>
          <div style={{ fontSize: 10, color: T.ink3, fontFamily: FONT_MONO }}>+2.3%</div>
        </div>
      </div>
      <div style={{ padding: '12px 16px', backgroundColor: T.bg2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: T.pos }} />
          <span style={{ fontSize: 9, fontWeight: 700, color: T.pos, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Just updated</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: T.ink, marginLeft: 'auto' }}>What changed</span>
        </div>
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 6 }}>
          {[
            'Fintech revenue +41% YoY; now 18% of group.',
            'Tencent discount narrowed to 42%.',
          ].map((b, i) => (
            <li key={i} style={{ display: 'flex', gap: 8, fontSize: 12, lineHeight: 1.4, color: T.ink }}>
              <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: T.accent, flexShrink: 0, marginTop: 2, fontWeight: 700 }}>0{i + 1}</span>
              {b}
            </li>
          ))}
        </ul>
      </div>
      <div style={{ padding: '10px 16px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, marginBottom: 4 }}>64% bullish · Avg 6.2%</div>
        <div style={{ fontSize: 11, color: T.ink3 }}>Held by Amanda, Thabo · 10 others</div>
      </div>
    </MockFrame>
  );
}

function HeroComposite() {
  return (
    <div className="sx-hero-composite" style={{
      position: 'relative',
      margin: '56px auto 0',
      maxWidth: 980,
      height: 540,
    }}>
      <div className="sx-hero-side stance-hero-left" style={{
        position: 'absolute',
        top: 60, left: '2%', zIndex: 1,
        width: 280,
      }}>
        <div style={{ transform: 'rotate(-5deg)' }}><FeedGlimpse /></div>
      </div>
      <div className="sx-hero-side stance-hero-right" style={{
        position: 'absolute',
        top: 30, right: '2%', zIndex: 2,
        width: 320,
      }}>
        <div style={{ transform: 'rotate(4deg)' }}><StockGlimpse /></div>
      </div>
      <div style={{
        position: 'absolute',
        top: 0, left: '50%', transform: 'translateX(-50%)',
        zIndex: 3,
        width: 420,
      }}>
        <div className="stance-float" style={{ position: 'relative' }}>
          <PortfolioGlimpse />
        </div>
      </div>
    </div>
  );
}

function NoteMock() {
  return (
    <MockFrame>
      {/* main note */}
      <div style={{ padding: '22px 24px', borderBottom: `1px solid ${T.lineSoft}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <Avatar initials="AP" color="#7EE8D2" size={40} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: T.ink }}>Amanda Pillay</span>
              <BadgeCheck size={13} style={{ color: T.accent }} fill={T.accentSoft} />
            </div>
            <div style={{ fontSize: 12, color: T.ink3, fontFamily: FONT_MONO }}>@apillay · 4h</div>
          </div>
          <StockChip ticker="CPI" change={1.1} />
        </div>
        <p style={{ fontSize: 16, lineHeight: 1.6, color: T.ink, margin: 0 }}>
          Added 12% to Capitec after results. Unsecured lending book looks cleaner than FNB's equivalent, and cost-to-income is still trending down. The AvaFin integration is quietly the biggest catalyst nobody's pricing in yet.
        </p>
      </div>

      {/* replies */}
      <div style={{ padding: '16px 24px 20px', display: 'grid', gap: 14 }}>
        {[
          { a: 'JM', c: '#FB7185', n: 'Jordan M.', t: '1h', body: 'Agree on AvaFin — but retail deposit growth flattens the story. Have you looked at NIM sensitivity?' },
          { a: 'PR', c: '#635BFF', n: 'Priya R.',  t: '22m', body: 'I sold half my CPI into the results run-up. Your case is making me reconsider the exit.' },
        ].map((r, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, paddingLeft: 16, borderLeft: `2px solid ${T.lineSoft}` }}>
            <Avatar initials={r.a} color={r.c} size={28} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{r.n}</span>
                <span style={{ fontSize: 11, color: T.ink3, fontFamily: FONT_MONO }}>{r.t}</span>
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.55, color: T.ink2, margin: 0 }}>{r.body}</p>
            </div>
          </div>
        ))}
      </div>
    </MockFrame>
  );
}

// ============================================================
//  TICKER STRIP (scrolling)
// ============================================================
function TickerStrip() {
  const tickers = [
    { t: 'NPN',  p: '3 241.50', c:  2.3 },
    { t: 'CPI',  p: '2 890.00', c:  1.1 },
    { t: 'MTN',  p: '98.20',    c: -0.8 },
    { t: 'SHP',  p: '278.40',   c:  0.4 },
    { t: 'SBK',  p: '214.10',   c:  0.9 },
    { t: 'AAPL', p: '178.32',   c:  0.8 },
    { t: 'TSLA', p: '244.10',   c: -1.4 },
    { t: 'MSFT', p: '418.50',   c:  0.6 },
    { t: 'NVDA', p: '901.12',   c:  3.1 },
    { t: 'AGL',  p: '621.00',   c: -0.3 },
    { t: 'ABG',  p: '192.80',   c:  0.5 },
    { t: 'SOL',  p: '128.90',   c:  1.7 },
  ];
  const Row = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 40, flexShrink: 0, paddingRight: 40 }}>
      {tickers.map((x, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, whiteSpace: 'nowrap' }}>
          <span style={{ fontFamily: FONT_MONO, fontSize: 13, fontWeight: 700, color: T.ink }}>{x.t}</span>
          <span style={{ fontFamily: FONT_MONO, fontSize: 13, color: T.ink2 }}>{x.p}</span>
          <span style={{ fontFamily: FONT_MONO, fontSize: 13, color: x.c >= 0 ? T.pos : T.neg }}>
            {x.c >= 0 ? '+' : ''}{x.c}%
          </span>
        </div>
      ))}
    </div>
  );
  return (
    <div style={{
      borderTop: `1px solid ${T.line}`, borderBottom: `1px solid ${T.line}`,
      backgroundColor: T.bg, overflow: 'hidden',
      maskImage: 'linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)',
    }}>
      <div className="stance-ticker-track" style={{ display: 'flex', padding: '14px 0' }}>
        <Row /><Row />
      </div>
    </div>
  );
}

// ============================================================
//  SIDE SCROLL INDICATOR
// ============================================================
const SIDE_SECTIONS = [
  { id: 'top',       label: 'Intro' },
  { id: 'portfolio', label: 'Portfolios' },
  { id: 'feed',      label: 'Notes' },
  { id: 'ai',        label: 'Stock AI' },
  { id: 'discover',  label: 'People' },
  { id: 'why',       label: 'Why now' },
  { id: 'launch',    label: 'Contact' },
];
const SIDE_NAV_HEIGHT = 320;

function SideNav() {
  const [active, setActive] = useState('top');
  const [positions, setPositions] = useState(() =>
    Object.fromEntries(SIDE_SECTIONS.map((section, index) => [section.id, index / Math.max(SIDE_SECTIONS.length - 1, 1)]))
  );

  useEffect(() => {
    const targets = SIDE_SECTIONS
      .map((s) => document.getElementById(s.id))
      .filter(Boolean);
    if (!targets.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-40% 0px -50% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] }
    );

    targets.forEach((t) => observer.observe(t));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const updatePositions = () => {
      const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      const nextPositions = Object.fromEntries(
        SIDE_SECTIONS.map((section, index) => {
          const node = document.getElementById(section.id);
          if (!node) {
            return [section.id, index / Math.max(SIDE_SECTIONS.length - 1, 1)];
          }
          const pageTop = node.getBoundingClientRect().top + window.scrollY;
          const ratio = Math.min(Math.max(pageTop / maxScroll, 0), 1);
          return [section.id, ratio];
        })
      );
      setPositions(nextPositions);
    };

    updatePositions();
    window.addEventListener('resize', updatePositions);
    return () => window.removeEventListener('resize', updatePositions);
  }, []);

  return (
    <nav
      aria-label="Page sections"
      className="stance-sidenav"
      style={{
        position: 'fixed',
        top: '50%',
        right: 24,
        transform: 'translateY(-50%)',
        zIndex: 40,
      }}
    >
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, position: 'relative', height: SIDE_NAV_HEIGHT }}>
        {SIDE_SECTIONS.map((s) => {
          const isActive = s.id === active;
          const ratio = positions[s.id] ?? 0;
          const top = 10 + ratio * (SIDE_NAV_HEIGHT - 20);
          return (
            <li
              key={s.id}
              style={{
                position: 'absolute',
                right: 0,
                top,
                transform: 'translateY(-50%)',
              }}
            >
              <a
                href={`#${s.id}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: 12,
                  textDecoration: 'none',
                  padding: 0,
                }}
              >
                <span
                  className={`label${isActive ? ' is-active' : ''}`}
                  style={{
                    fontSize: 11,
                    fontWeight: isActive ? 700 : 500,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: isActive ? T.ink : T.ink2,
                  }}
                >
                  {s.label}
                </span>
                <span
                  style={{
                    width: isActive ? 10 : 8,
                    height: isActive ? 10 : 8,
                    borderRadius: '50%',
                    backgroundColor: isActive ? T.accent : '#D6DBE8',
                    boxShadow: isActive ? `0 0 0 4px ${T.accentSoft}` : 'none',
                    transition: 'all 220ms ease',
                    flexShrink: 0,
                  }}
                />
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// ============================================================
//  NAV
// ============================================================
function Nav({ onStart }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let rafId = null;
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const next = max > 0 ? window.scrollY / max : 0;
      setProgress(Math.min(Math.max(next, 0), 1));
      rafId = null;
    };
    const onScroll = () => {
      if (rafId == null) rafId = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 50,
      backgroundColor: 'rgba(255,255,255,0.86)',
      backdropFilter: 'saturate(180%) blur(12px)',
      borderBottom: `1px solid ${T.lineSoft}`,
    }}>
      <div style={{
        maxWidth: 1200, margin: '0 auto', padding: '16px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24,
      }}>
        <a href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: `linear-gradient(135deg, ${T.accent}, #A78BFA)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <TrendingUp size={15} style={{ color: '#FFFFFF' }} strokeWidth={2.6} />
          </div>
          <span style={{ fontSize: 18, fontWeight: 700, color: T.ink, letterSpacing: '-0.015em' }}>Sharez</span>
        </a>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <a href="#launch" onClick={onStart} className="stance-cta" style={{
            padding: '8px 16px', borderRadius: 999,
            backgroundColor: T.ink, color: '#FFFFFF',
            fontSize: 13, fontWeight: 600, textDecoration: 'none',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
            Get in touch <ArrowRight size={13} strokeWidth={2.6} />
          </a>
        </div>
      </div>

      <div aria-hidden style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: 2,
        backgroundColor: T.lineSoft,
      }}>
        <div style={{
          height: '100%',
          width: `${progress * 100}%`,
          background: `linear-gradient(90deg, ${T.accent}, #A78BFA, #FB7185)`,
          willChange: 'width',
        }} />
      </div>
    </header>
  );
}

// ============================================================
//  MAIN
// ============================================================
export default function Landing() {
  const [interestType, setInterestType] = useState('Investor');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [launchMessage, setLaunchMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const openLaunchEmail = async (event) => {
    event.preventDefault();
    if (!email.trim()) {
      setLaunchMessage('Add your email first so the launch note includes a reply address.');
      return;
    }
    setIsSending(true);
    setLaunchMessage('');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          interest_type: interestType,
          message: note.trim(),
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.detail || 'Something went wrong while sending your message.');
      }

      setLaunchMessage('Message sent. We will get back to you soon.');
      setName('');
      setEmail('');
      setNote('');
      setInterestType('Investor');
    } catch (error) {
      setLaunchMessage(error.message || 'Something went wrong while sending your message.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div style={{ backgroundColor: T.bg, color: T.ink, fontFamily: FONT_SANS, overflowX: 'clip' }}>
      <GlobalStyles />
      <Nav />

      {/* ============ HERO ============ */}
      <section id="top" style={{ backgroundColor: '#FFFFFF' }}>
        <div className="sx-hero" style={{
          maxWidth: 1200, margin: '0 auto',
          padding: '64px 24px 16px',
          textAlign: 'center',
        }}>
          <div style={{ maxWidth: 780, margin: '0 auto', position: 'relative' }} className="stance-reveal">
            <EmojiSticker emoji="👀" size={60} top={-10} right={-10} rotate={8} drift={8} delay="-1.4s" duration="8.2s" />
            <div style={{ marginBottom: 24 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '6px 14px', borderRadius: 999,
                backgroundColor: '#FFFFFF',
                border: `1px solid ${T.line}`,
                fontSize: 13, color: T.ink2, fontWeight: 500,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: T.pos }} />
                South Africa&rsquo;s first investing social network
              </span>
            </div>
            <h1 style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 'clamp(34px, 7.2vw, 76px)',
              fontWeight: 700, lineHeight: 1.04, letterSpacing: '-0.035em',
              color: T.ink, margin: 0, marginBottom: 24,
            }}>
              See how people around you invest.
            </h1>
            <p style={{
              fontSize: 'clamp(16px, 1.4vw, 18px)', lineHeight: 1.6,
              color: T.ink2, maxWidth: 620, margin: '0 auto 28px',
            }}>
              Explore real portfolios, see the thinking behind them, and follow investors whose approach resonates with yours.
            </p>
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: 10,
              justifyContent: 'center', marginBottom: 36,
            }}>
              {[
                { e: '👀', t: 'See what people own' },
                { e: '💬', t: 'Read what they think' },
                { e: '🤝', t: 'Follow who resonates' },
              ].map((f) => (
                <span key={f.t} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '9px 16px', borderRadius: 999,
                  backgroundColor: T.bg2, border: `1px solid ${T.line}`,
                  fontSize: 14, fontWeight: 500, color: T.ink,
                }}>
                  <span style={{ fontSize: 16 }}>{f.e}</span>
                  {f.t}
                </span>
              ))}
            </div>
            <div style={{ display: 'inline-flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
              <PrimaryCTA href="#launch">Get in touch</PrimaryCTA>
            </div>
          </div>
          <HeroComposite />
        </div>
      </section>

      {/* ============ TICKER ============ */}
      <TickerStrip />

      {/* ============ PORTFOLIO SECTION ============ */}
      <section id="portfolio" className="sx-sec" style={{ padding: '140px 24px', backgroundColor: T.bg }}>
        <div className="sx-grid-2" style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <SectionHead
              eyebrow="Portfolios"
              title="See what people own."
              body="Every profile on Sharez is a verified portfolio — holdings and weightings imported from the member's brokerage, not posted as a screenshot."
            />
            <p style={{ marginTop: 20, marginBottom: 0, fontSize: 16, lineHeight: 1.55, color: T.ink, fontWeight: 500 }}>
              The portfolio is the profile.
            </p>
            <div style={{ marginTop: 28, display: 'grid', gap: 18 }}>
              {[
                'See real holdings and weightings',
                'See how someone is actually allocated',
                'See performance over time',
              ].map((t, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <Check size={18} style={{ color: T.accent, marginTop: 4, flexShrink: 0 }} />
                  <span style={{ fontSize: 16, color: T.ink2, lineHeight: 1.55 }}>{t}</span>
                </div>
              ))}
            </div>
          </div>
          <div><PortfolioMock /></div>
        </div>
      </section>

      {/* ============ FEED SECTION (tinted band) ============ */}
      <section id="feed" className="sx-sec" style={{ padding: '140px 24px', backgroundColor: '#F6F9FF' }}>
        <div className="sx-grid-2" style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
          <div><FeedMock /></div>
          <div style={{ position: 'relative' }}>
            <SectionHead
              eyebrow="Notes"
              title="See what people say."
              body="Notes are short posts on any topic. Each one is tied to the author's verified portfolio, so readers can see the position behind the opinion."
            />
            <p style={{ marginTop: 20, marginBottom: 0, fontSize: 16, lineHeight: 1.55, color: T.ink, fontWeight: 500 }}>
              Every author has a portfolio behind them.
            </p>
            <div style={{ marginTop: 28, display: 'grid', gap: 18 }}>
              {[
                'Real people behind the opinions',
                'Open the portfolio behind the note',
                'See conviction, not just commentary',
              ].map((t, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <Check size={18} style={{ color: T.accent, marginTop: 4, flexShrink: 0 }} />
                  <span style={{ fontSize: 16, color: T.ink2, lineHeight: 1.55 }}>{t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============ AI SECTION ============ */}
      <section id="ai" className="sx-sec" style={{ padding: '140px 24px', backgroundColor: T.bg }}>
        <div className="sx-grid-2" style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <SectionHead
              eyebrow="Stocks"
              title="See any stock in context."
              body="Every stock has a page with a price summary, a short brief on what's changed recently, and how members of the community are positioned."
            />
            <div style={{ marginTop: 28, display: 'grid', gap: 18 }}>
              {[
                'What changed, in plain English',
                'Member and market sentiment at a glance',
                'Go deeper into related notes and theses',
              ].map((t, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <Check size={18} style={{ color: T.accent, marginTop: 4, flexShrink: 0 }} />
                  <span style={{ fontSize: 16, color: T.ink2, lineHeight: 1.55 }}>{t}</span>
                </div>
              ))}
            </div>
          </div>
          <div><StockMock /></div>
        </div>
      </section>

      {/* ============ DISCOVER SECTION (mint band) ============ */}
      <section id="discover" className="sx-sec" style={{ padding: '140px 24px', backgroundColor: '#F0FAF5' }}>
        <div className="sx-grid-2" style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
          <div><DiscoverMock /></div>
          <div style={{ position: 'relative' }}>
            <SectionHead
              eyebrow="Discover"
              title="Follow investors whose style matches yours."
              body="Browse members by allocation, sector focus, or tenure. Follow accounts whose approach matches yours — their positions and notes appear in your feed."
            />
            <p style={{ marginTop: 20, marginBottom: 0, fontSize: 16, lineHeight: 1.55, color: T.ink, fontWeight: 500 }}>
              Follow conviction, not popularity.
            </p>
            <div style={{ marginTop: 28, display: 'grid', gap: 18 }}>
              {[
                'Discover people by how they invest',
                'Go deeper into notes and theses',
                'Follow ideas and portfolios over time',
              ].map((t, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <Check size={18} style={{ color: T.accent, marginTop: 4, flexShrink: 0 }} />
                  <span style={{ fontSize: 16, color: T.ink2, lineHeight: 1.55 }}>{t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============ AUDIENCE ============ */}
      <section id="audience" className="sx-sec" style={{ padding: '140px 24px', backgroundColor: T.bg }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <SectionHead
            eyebrow="Who it's for"
            title="For DIY investors who want to learn, connect, and grow."
            align="center"
            maxWidth={760}
          />
          <div className="sx-grid-3" style={{ marginTop: 72, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
            {[
              {
                icon: TrendingUp,
                label: 'Long-term',
                title: 'Long-term wealth builders.',
                body: 'People building conviction over time, not chasing the latest hype.',
              },
              {
                icon: Sparkles,
                label: 'Learning',
                title: 'People who want to learn.',
                body: 'Learn by seeing real portfolios, real notes, and real thinking.',
              },
              {
                icon: Users,
                label: 'Community',
                title: 'People looking for their people.',
                body: 'Follow people whose style, views, and approach resonate with you.',
              },
              {
                icon: MessageSquare,
                label: 'Proof',
                title: 'People who want proof behind the opinions.',
                body: 'See what people say, and see what they actually own.',
              },
            ].map((c) => {
              const Icon = c.icon;
              return (
                <div key={c.label} style={{ padding: 32, borderRadius: 20, border: `1px solid ${T.line}`, backgroundColor: T.bg }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    backgroundColor: T.accentSoft, color: T.accent,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 20,
                  }}>
                    <Icon size={22} strokeWidth={2} />
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.accent, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>{c.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 600, color: T.ink, marginBottom: 12, letterSpacing: '-0.015em', lineHeight: 1.2 }}>{c.title}</div>
                  <p style={{ fontSize: 15, lineHeight: 1.6, color: T.ink2, margin: 0 }}>{c.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section id="how" className="sx-sec-tight" style={{ padding: '120px 24px', backgroundColor: T.bg2 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <SectionHead
            eyebrow="How it works"
            title="Connect. Explore. Follow."
            align="center"
            maxWidth={760}
          />
          <div className="sx-grid-3" style={{
            marginTop: 64,
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 24,
          }}>
            {[
              {
                n: '01',
                emoji: '🔗',
                tint: '#EEF2FF',
                border: '#DDE3FF',
                rotate: -1,
                title: 'Connect your portfolio',
                body: 'Securely connect your brokerage. Your holdings become your verified profile — no screenshots, no edits.',
              },
              {
                n: '02',
                emoji: '🔍',
                tint: '#FCE7F3',
                border: '#F9CEE3',
                rotate: 1.2,
                title: 'See what people own',
                body: 'Browse real portfolios, read the thinking behind each position, and see how the community is positioned on any stock.',
              },
              {
                n: '03',
                emoji: '🤝',
                tint: '#DCFCE7',
                border: '#BBF7D0',
                rotate: -1,
                title: 'Find your people',
                body: "Follow investors whose approach aligns with yours. Their ideas and theses land in your feed.",
              },
            ].map((s) => (
              <div key={s.n} className="sx-step-card" style={{
                padding: 28,
                borderRadius: 24,
                backgroundColor: s.tint,
                border: `1px solid ${s.border}`,
                position: 'relative',
                transform: `rotate(${s.rotate}deg)`,
                boxShadow: '0 10px 30px rgba(10,37,64,0.05)',
                textAlign: 'left',
              }}>
                <span style={{
                  position: 'absolute', top: 20, right: 22,
                  fontSize: 12, fontWeight: 700, color: T.ink3,
                  fontFamily: FONT_MONO, letterSpacing: '0.1em',
                }}>{s.n}</span>
                <div style={{ fontSize: 46, lineHeight: 1, marginBottom: 20 }}>{s.emoji}</div>
                <div style={{
                  fontSize: 20, fontWeight: 600, color: T.ink,
                  letterSpacing: '-0.015em', lineHeight: 1.25,
                  marginBottom: 10,
                }}>{s.title}</div>
                <p style={{
                  fontSize: 15, lineHeight: 1.6, color: T.ink2, margin: 0,
                }}>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ BELIEF (closing statement) ============ */}
      <section id="why" className="sx-sec-wide" style={{ padding: '140px 24px 160px', backgroundColor: T.bg }}>
        <div style={{ maxWidth: 860, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ marginBottom: 28 }}>
            <Eyebrow>Why now</Eyebrow>
          </div>
          <h2 style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 'clamp(32px, 4.6vw, 56px)',
            fontWeight: 700, lineHeight: 1.12, letterSpacing: '-0.025em',
            color: T.ink, margin: 0, marginBottom: 24,
          }}>
            See what people say.<br />
            <span style={{
              background: `linear-gradient(120deg, ${T.accent}, #A78BFA, #FB7185)`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>See what they own.</span>
          </h2>
          <p style={{
            fontSize: 'clamp(17px, 1.5vw, 20px)', lineHeight: 1.55,
            color: T.ink2, margin: 0, maxWidth: 640, marginLeft: 'auto', marginRight: 'auto',
          }}>
            Every idea is tied to a real portfolio, so you can weigh conviction honestly, follow what resonates, and build your own picture over time.
          </p>
        </div>
      </section>

      {/* ============ LAUNCH CTA (dark band) ============ */}
      <section id="launch" className="sx-launch" style={{ padding: '120px 24px', backgroundColor: T.navy, position: 'relative', overflow: 'hidden' }}>
        <div aria-hidden style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(circle at 20% 30%, rgba(99,91,255,0.35) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(167,139,250,0.25) 0%, transparent 50%)`,
        }} />
        <div style={{ position: 'relative', maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ marginBottom: 18 }}>
            <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.04em', color: '#A78BFA', textTransform: 'uppercase' }}>Contact</span>
          </div>
          <h2 style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 'clamp(34px, 4.6vw, 56px)',
            fontWeight: 700, lineHeight: 1.08, letterSpacing: '-0.025em',
            color: '#FFFFFF', margin: 0, marginBottom: 18,
          }}>
            Want to shape this early?
          </h2>
          <p style={{ fontSize: 18, lineHeight: 1.55, color: 'rgba(255,255,255,0.72)', margin: 0, marginBottom: 40 }}>
            Leave your email and a short note, and we will get back to you directly.
          </p>

          <form onSubmit={openLaunchEmail} style={{
            backgroundColor: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.14)',
            borderRadius: 20, padding: 24,
            backdropFilter: 'blur(12px)',
            display: 'grid', gap: 14,
          }}>
            <div className="sx-form-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <input
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="stance-input"
                style={{
                  padding: '14px 16px', borderRadius: 12,
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.14)',
                  color: '#FFFFFF', fontSize: 15,
                  fontFamily: FONT_SANS, outline: 'none',
                }}
              />
              <input
                type="email" required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="stance-input"
                style={{
                  padding: '14px 16px', borderRadius: 12,
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.14)',
                  color: '#FFFFFF', fontSize: 15,
                  fontFamily: FONT_SANS, outline: 'none',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['Investor','Creator','Partner'].map(opt => (
                <button key={opt} type="button" onClick={() => setInterestType(opt)}
                  style={{
                    padding: '8px 14px', borderRadius: 999,
                    backgroundColor: interestType === opt ? T.accent : 'rgba(255,255,255,0.06)',
                    border: `1px solid ${interestType === opt ? T.accent : 'rgba(255,255,255,0.14)'}`,
                    color: interestType === opt ? '#FFFFFF' : 'rgba(255,255,255,0.82)',
                    fontSize: 13, fontWeight: 500, cursor: 'pointer',
                    fontFamily: FONT_SANS,
                  }}>{opt}</button>
              ))}
            </div>
            <textarea
              rows={3}
              placeholder="Anything you want us to know? (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="stance-input"
              style={{
                padding: '14px 16px', borderRadius: 12,
                backgroundColor: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.14)',
                color: '#FFFFFF', fontSize: 15,
                fontFamily: FONT_SANS, outline: 'none',
                resize: 'vertical',
              }}
            />
            <button type="submit" className="stance-cta" disabled={isSending}
              style={{
                padding: '14px 22px', borderRadius: 12,
                background: `linear-gradient(135deg, ${T.accent}, #A78BFA)`,
                color: '#FFFFFF', border: 'none', cursor: isSending ? 'default' : 'pointer',
                fontSize: 15, fontWeight: 600, letterSpacing: '-0.005em',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 10px 30px rgba(99,91,255,0.35)',
                opacity: isSending ? 0.72 : 1,
              }}>
              {isSending ? 'Sending...' : 'Send message'} <ArrowRight size={16} strokeWidth={2.4} />
            </button>
            {launchMessage && (
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.72)', textAlign: 'center' }}>{launchMessage}</div>
            )}
          </form>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer style={{ backgroundColor: T.bg, borderTop: `1px solid ${T.line}`, padding: '56px 24px 48px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: `linear-gradient(135deg, ${T.accent}, #A78BFA)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <TrendingUp size={15} style={{ color: '#FFFFFF' }} strokeWidth={2.6} />
            </div>
            <span style={{ fontSize: 18, fontWeight: 700, color: T.ink, letterSpacing: '-0.015em' }}>Sharez</span>
          </div>
          <p style={{ fontSize: 15, lineHeight: 1.55, color: T.ink2, margin: 0, maxWidth: 540, marginLeft: 'auto', marginRight: 'auto' }}>
            See how people around you invest.
          </p>
        </div>
      </footer>
    </div>
  );
}
