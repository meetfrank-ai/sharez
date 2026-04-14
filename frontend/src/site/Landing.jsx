import { useEffect, useRef, useState } from 'react';
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

const CONTACT_EMAIL = 'lynetteduplessis@meetfrank.ai';

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
      @media (min-width: 1440px) { .stance-sidenav { display: block; } }
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

      /* ============= MOBILE ============= */
      @media (max-width: 860px) {
        .sx-hero       { padding: 48px 20px 56px !important; }
        .sx-sec        { padding: 72px 20px !important; }
        .sx-sec-tight  { padding: 56px 20px !important; }
        .sx-sec-wide   { padding: 80px 20px 88px !important; }
        .sx-launch     { padding: 72px 20px !important; }

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
        fontSize: 'clamp(32px, 4.2vw, 52px)',
        fontWeight: 700, lineHeight: 1.08, letterSpacing: '-0.02em',
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

      {/* Allocation strip — what they own, at a glance */}
      <div style={{ padding: '20px 24px 22px', borderBottom: `1px solid ${T.line}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: T.ink3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Allocation</span>
          <span style={{ fontSize: 11, fontFamily: FONT_MONO, color: T.ink3 }}>5 positions</span>
        </div>
        <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden' }}>
          {holdings.map((h) => (
            <div key={h.t} style={{ backgroundColor: h.color, width: `${h.alloc * 1.8}%` }} />
          ))}
          <div style={{ backgroundColor: T.lineSoft, flex: 1 }} />
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
  { id: 'portfolio', label: 'Portfolio' },
  { id: 'feed',      label: 'Feed' },
  { id: 'ai',        label: 'AI context' },
  { id: 'notes',     label: 'Notes' },
  { id: 'launch',    label: 'Launch' },
];

function SideNav() {
  const [active, setActive] = useState('top');

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

  return (
    <nav
      aria-label="Page sections"
      className="stance-sidenav"
      style={{
        position: 'fixed',
        top: '50%',
        left: 24,
        transform: 'translateY(-50%)',
        zIndex: 40,
      }}
    >
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 18 }}>
        {SIDE_SECTIONS.map((s) => {
          const isActive = s.id === active;
          return (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 12,
                  textDecoration: 'none',
                  padding: '4px 0',
                }}
              >
                <span
                  style={{
                    width: isActive ? 10 : 6,
                    height: isActive ? 10 : 6,
                    borderRadius: '50%',
                    backgroundColor: isActive ? T.accent : '#D6DBE8',
                    boxShadow: isActive ? `0 0 0 4px ${T.accentSoft}` : 'none',
                    transition: 'all 220ms ease',
                    flexShrink: 0,
                    marginLeft: isActive ? -2 : 0,
                  }}
                />
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
  const [active, setActive] = useState(null);
  const [progress, setProgress] = useState(0);

  const links = [
    { id: 'portfolio', label: 'Portfolio' },
    { id: 'feed',      label: 'Feed' },
    { id: 'ai',        label: 'Stock context' },
    { id: 'discover',  label: 'Discover' },
    { id: 'how',       label: 'Getting started' },
  ];

  useEffect(() => {
    const ids = links.map((l) => l.id);
    const targets = ids.map((id) => document.getElementById(id)).filter(Boolean);
    if (!targets.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActive(visible[0].target.id);
        else setActive(null);
      },
      // Detect once a section's top enters the upper ~40% of viewport.
      { rootMargin: '-20% 0px -55% 0px', threshold: [0, 0.15, 0.3, 0.6, 1] }
    );
    targets.forEach((t) => observer.observe(t));
    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? window.scrollY / max : 0;
      setProgress(Math.min(Math.max(p, 0), 1));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
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

        <nav style={{ display: 'flex', alignItems: 'center', gap: 28 }} className="hidden md:flex">
          {links.map((l) => {
            const isActive = active === l.id;
            return (
              <a
                key={l.id}
                href={`#${l.id}`}
                style={{
                  position: 'relative',
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? T.ink : T.ink2,
                  textDecoration: 'none',
                  transition: 'color 180ms ease',
                  paddingBottom: 4,
                }}
              >
                {l.label}
              </a>
            );
          })}
        </nav>

        <div className="sx-nav-cta" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <a href="#launch" onClick={onStart} className="stance-cta" style={{
            padding: '8px 16px', borderRadius: 999,
            backgroundColor: T.ink, color: '#FFFFFF',
            fontSize: 13, fontWeight: 600, textDecoration: 'none',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
            Get early access <ArrowRight size={13} strokeWidth={2.6} />
          </a>
        </div>
      </div>

      {/* Scroll progress bar */}
      <div aria-hidden style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        height: 2, backgroundColor: T.lineSoft,
      }}>
        <div style={{
          height: '100%',
          width: `${progress * 100}%`,
          background: `linear-gradient(90deg, ${T.accent}, #A78BFA, #FB7185)`,
          transition: 'width 120ms linear',
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

  const openLaunchEmail = (event) => {
    event.preventDefault();
    if (!email.trim()) {
      setLaunchMessage('Add your email first so the launch note includes a reply address.');
      return;
    }
    const subject = `Sharez launch interest - ${interestType}`;
    const body = [
      'Hi Sharez,',
      '',
      'I would like updates on the launch.',
      '',
      `Name: ${name.trim() || 'Not provided'}`,
      `Email: ${email.trim()}`,
      `Interest: ${interestType}`,
      '',
      'What I am interested in:',
      note.trim() || 'Please keep me posted on launch plans and early access.',
      '',
      'Sent from the Sharez concept site.',
    ].join('\n');
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setLaunchMessage(`Your email app should open now. If not, message ${CONTACT_EMAIL} directly.`);
  };

  return (
    <div style={{ backgroundColor: T.bg, color: T.ink, fontFamily: FONT_SANS, overflowX: 'clip' }}>
      <GlobalStyles />
      <Nav />

      {/* ============ HERO ============ */}
      <section id="top" style={{ backgroundColor: '#FFFFFF' }}>
        <div className="sx-hero" style={{
          maxWidth: 1200, margin: '0 auto',
          padding: '64px 24px 72px',
          textAlign: 'center',
        }}>
          <div style={{ maxWidth: 780, margin: '0 auto' }} className="stance-reveal">
            <div style={{ marginBottom: 24 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '6px 14px', borderRadius: 999,
                backgroundColor: '#FFFFFF',
                border: `1px solid ${T.line}`,
                fontSize: 13, color: T.ink2, fontWeight: 500,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: T.pos }} />
                South Africa&rsquo;s first investing network
              </span>
            </div>
            <h1 style={{
              fontSize: 'clamp(44px, 6.4vw, 76px)',
              fontWeight: 700, lineHeight: 1.04, letterSpacing: '-0.035em',
              color: T.ink, margin: 0, marginBottom: 24,
            }}>
              See how people around you invest.
            </h1>
            <p style={{
              fontSize: 'clamp(18px, 1.6vw, 22px)', lineHeight: 1.4,
              color: T.ink, fontWeight: 500,
              maxWidth: 620, margin: '0 auto 20px',
            }}>
              Most investing content is opinion.<br />
              Sharez shows the position behind it.
            </p>
            <p style={{
              fontSize: 'clamp(16px, 1.4vw, 18px)', lineHeight: 1.6,
              color: T.ink2, maxWidth: 620, margin: '0 auto 36px',
            }}>
              Explore real portfolios, see the thinking behind them, and follow investors whose approach resonates with yours.
            </p>
            <div style={{ display: 'inline-flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
              <PrimaryCTA href="#launch">Get early access</PrimaryCTA>
            </div>
            <p style={{
              marginTop: 36, marginBottom: 0,
              fontSize: 14, letterSpacing: '0.04em',
              color: T.ink3, fontFamily: FONT_MONO,
            }}>
              See what people say. See what they own.
            </p>
          </div>
        </div>
      </section>

      {/* ============ TICKER ============ */}
      <TickerStrip />

      {/* ============ PORTFOLIO SECTION ============ */}
      <section id="portfolio" className="sx-sec" style={{ padding: '140px 24px', backgroundColor: T.bg }}>
        <div className="sx-grid-2" style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
          <div>
            <SectionHead
              eyebrow="Portfolio"
              title="Built on what you own."
              body="Every profile is a live portfolio showing real holdings and weightings."
            />
            <p style={{ marginTop: 20, marginBottom: 0, fontSize: 16, lineHeight: 1.55, color: T.ink, fontWeight: 500 }}>
              No curation. No hiding.
            </p>
            <div style={{ marginTop: 28, display: 'grid', gap: 18 }}>
              {[
                'Real positions, not opinions',
                'Clear view of allocation',
                'Performance that speaks for itself',
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
          <div style={{ order: 2 }}><FeedMock /></div>
          <div style={{ order: 1 }}>
            <SectionHead
              eyebrow="Feed"
              title="What happens when everyone shows their hand."
              body="A feed where every idea is backed by a real portfolio you can open."
            />
            <p style={{ marginTop: 20, marginBottom: 0, fontSize: 16, lineHeight: 1.55, color: T.ink, fontWeight: 500 }}>
              No anonymity. No empty takes.
            </p>
            <div style={{ marginTop: 28, display: 'grid', gap: 18 }}>
              {[
                'Every thesis linked to real positions',
                'Open the portfolio behind it',
                'Conviction over content',
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
          <div>
            <SectionHead
              eyebrow="Stock context"
              title="Understand any stock in seconds."
              body="Click any stock to see a clear snapshot of what is happening and how the community is positioned."
            />
            <p style={{ marginTop: 20, marginBottom: 0, fontSize: 16, lineHeight: 1.55, color: T.ink, fontWeight: 500 }}>
              No digging. No noise.
            </p>
            <div style={{ marginTop: 28, display: 'grid', gap: 18 }}>
              {[
                'What changed, in plain English',
                'Community allocation at a glance',
                'Direct access to related theses',
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
          <div style={{ order: 2 }}><DiscoverMock /></div>
          <div style={{ order: 1 }}>
            <SectionHead
              eyebrow="Discover"
              title="Find conviction worth following."
              body="Explore portfolios and go deeper into the ideas behind them."
            />
            <p style={{ marginTop: 20, marginBottom: 0, fontSize: 16, lineHeight: 1.55, color: T.ink, fontWeight: 500 }}>
              Not popularity. Track record.
            </p>
            <div style={{ marginTop: 28, display: 'grid', gap: 18 }}>
              {[
                'Discover investors by how they are positioned',
                'Access deeper theses and notes',
                'Follow ideas over time',
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
            title="For people who take investing seriously."
            align="center"
            maxWidth={760}
          />
          <div className="sx-grid-3" style={{ marginTop: 72, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32 }}>
            {[
              {
                icon: Users,
                label: 'Members',
                title: 'A feed worth opening.',
                body: 'See real portfolios, not cherry-picked wins. Learn from how people are actually positioned.',
              },
              {
                icon: Sparkles,
                label: 'Creators',
                title: 'Build an audience on trust.',
                body: 'Your portfolio speaks for you. Share your thinking and grow a following that values it.',
              },
              {
                icon: BriefcaseBusiness,
                label: 'Partners',
                title: 'Reach investors who actually invest.',
                body: 'Connect with a verified retail base, organised by how they are positioned.',
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
            eyebrow="Getting started"
            title="Three steps to see what's really in your circle's portfolios."
            align="center"
            maxWidth={760}
          />
          <div className="sx-grid-3" style={{
            marginTop: 72,
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 48,
            position: 'relative',
          }}>
            <div aria-hidden className="sx-how-connector" style={{
              position: 'absolute',
              top: 28, left: '16%', right: '16%',
              height: 1,
              background: `linear-gradient(90deg, transparent, ${T.line} 15%, ${T.line} 85%, transparent)`,
              zIndex: 0,
            }} />
            {[
              {
                n: '01',
                icon: Link2,
                title: 'Connect your portfolio',
                body: 'Link your brokerage account. Your holdings become your verified profile — no screenshots, no edits.',
              },
              {
                n: '02',
                icon: Search,
                title: 'Explore real portfolios',
                body: 'Browse what other investors actually hold, read the thinking behind each position, and see community sentiment on every stock.',
              },
              {
                n: '03',
                icon: UserPlus,
                title: 'Follow who resonates',
                body: "Follow investors whose approach aligns with yours. Their ideas and theses land in your feed.",
              },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.n} style={{ position: 'relative', zIndex: 1, textAlign: 'left' }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: 16,
                    backgroundColor: '#FFFFFF',
                    border: `1px solid ${T.line}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 24,
                    boxShadow: '0 4px 12px rgba(10,37,64,0.04)',
                  }}>
                    <Icon size={22} strokeWidth={2} style={{ color: T.accent }} />
                  </div>
                  <div style={{
                    fontFamily: FONT_MONO, fontSize: 12, fontWeight: 600,
                    color: T.ink3, letterSpacing: '0.1em',
                    marginBottom: 10,
                  }}>{s.n}</div>
                  <div style={{
                    fontSize: 20, fontWeight: 600, color: T.ink,
                    letterSpacing: '-0.015em', lineHeight: 1.25,
                    marginBottom: 10,
                  }}>{s.title}</div>
                  <p style={{
                    fontSize: 15, lineHeight: 1.6, color: T.ink2, margin: 0,
                  }}>{s.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============ BELIEF (closing statement) ============ */}
      <section id="why" className="sx-sec-wide" style={{ padding: '140px 24px 160px', backgroundColor: T.bg }}>
        <div style={{ maxWidth: 860, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ marginBottom: 28 }}>
            <Eyebrow>Why Sharez exists</Eyebrow>
          </div>
          <h2 style={{
            fontSize: 'clamp(32px, 4.6vw, 56px)',
            fontWeight: 700, lineHeight: 1.12, letterSpacing: '-0.025em',
            color: T.ink, margin: 0, marginBottom: 24,
          }}>
            Most investing content is opinion without context.<br />
            <span style={{
              background: `linear-gradient(120deg, ${T.accent}, #A78BFA, #FB7185)`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>Sharez flips that.</span>
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
            <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.04em', color: '#A78BFA', textTransform: 'uppercase' }}>Early access</span>
          </div>
          <h2 style={{
            fontSize: 'clamp(34px, 4.6vw, 56px)',
            fontWeight: 700, lineHeight: 1.08, letterSpacing: '-0.025em',
            color: '#FFFFFF', margin: 0, marginBottom: 18,
          }}>
            Get on the list before we open the doors.
          </h2>
          <p style={{ fontSize: 18, lineHeight: 1.55, color: 'rgba(255,255,255,0.72)', margin: 0, marginBottom: 40 }}>
            Drop your email and we'll include you in the first round of invites. No spam. Just launch.
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
            <button type="submit" className="stance-cta"
              style={{
                padding: '14px 22px', borderRadius: 12,
                background: `linear-gradient(135deg, ${T.accent}, #A78BFA)`,
                color: '#FFFFFF', border: 'none', cursor: 'pointer',
                fontSize: 15, fontWeight: 600, letterSpacing: '-0.005em',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 10px 30px rgba(99,91,255,0.35)',
              }}>
              Request early access <ArrowRight size={16} strokeWidth={2.4} />
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
