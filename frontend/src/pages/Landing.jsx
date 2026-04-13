import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  BriefcaseBusiness,
  Check,
  Lock,
  MessageSquare,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';

const CONTACT_EMAIL = 'hello@sharez.co.za';

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
      @keyframes stance-blob {
        0%   { transform: translate(0,0) scale(1); }
        33%  { transform: translate(4%, -3%) scale(1.08); }
        66%  { transform: translate(-3%, 4%) scale(0.95); }
        100% { transform: translate(0,0) scale(1); }
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
    `}</style>
  );
}

// ============================================================
//  GRADIENT MESH (hero background)
// ============================================================
function GradientMesh() {
  const blobs = [
    { c: '#A78BFA', x: '8%',  y: '18%', s: 540, dur: 22 },
    { c: '#7EE8D2', x: '78%', y: '12%', s: 520, dur: 28 },
    { c: '#FFD37A', x: '62%', y: '68%', s: 460, dur: 25 },
    { c: '#FB7185', x: '16%', y: '72%', s: 420, dur: 30 },
    { c: '#635BFF', x: '48%', y: '36%', s: 600, dur: 26 },
  ];
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 0,
        maskImage: 'linear-gradient(180deg, #000 0%, #000 70%, transparent 100%)',
      }}
    >
      {blobs.map((b, i) => (
        <div key={i}
          style={{
            position: 'absolute',
            left: b.x, top: b.y,
            width: b.s, height: b.s,
            borderRadius: '50%',
            background: `radial-gradient(circle at 50% 50%, ${b.c} 0%, transparent 60%)`,
            opacity: 0.45,
            filter: 'blur(60px)',
            transform: 'translate(-50%,-50%)',
            animation: `stance-blob ${b.dur}s ease-in-out infinite`,
            animationDelay: `${i * -3}s`,
          }}
        />
      ))}
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
function Sparkline({ points, color = T.pos, width = 80, height = 28, strokeWidth = 1.8, animated = false }) {
  const max = Math.max(...points), min = Math.min(...points);
  const range = max - min || 1;
  const stepX = width / (points.length - 1);
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${(i * stepX).toFixed(1)},${(height - ((p - min) / range) * height).toFixed(1)}`).join(' ');
  return (
    <svg width={width} height={height} className={animated ? 'stance-spark' : undefined}>
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
    { t: 'NPN',  n: 'Naspers',   alloc: 22.8, chg:  2.3, color: '#635BFF', spark: [4,5,4.2,5.1,5.4,5.2,5.8,6.1,6.4] },
    { t: 'CPI',  n: 'Capitec',   alloc: 18.4, chg:  1.1, color: '#7EE8D2', spark: [3,3.2,3.1,3.4,3.3,3.5,3.6,3.5,3.7] },
    { t: 'MTN',  n: 'MTN Group', alloc: 15.2, chg: -0.8, color: '#FFD37A', spark: [4.5,4.3,4.4,4.2,4.1,4.3,4.1,4.0,4.1] },
    { t: 'AAPL', n: 'Apple',     alloc: 12.7, chg:  0.6, color: '#FB7185', spark: [3,3.1,3.3,3.2,3.4,3.5,3.6,3.7,3.8] },
    { t: 'SHP',  n: 'Shoprite',  alloc:  9.1, chg:  0.4, color: '#A78BFA', spark: [3.5,3.6,3.5,3.7,3.8,3.7,3.9,4.0,4.0] },
  ];

  return (
    <MockFrame className={floating ? 'stance-float' : undefined}>
      {/* header strip */}
      <div style={{ padding: '20px 24px', borderBottom: `1px solid ${T.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Avatar initials="TM" color="#635BFF" size={44} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: T.ink }}>Thabo Mokoena</span>
              <BadgeCheck size={15} style={{ color: T.accent }} fill={T.accentSoft} />
            </div>
            <span style={{ fontSize: 13, color: T.ink3, fontFamily: FONT_MONO }}>@thabom · Verified portfolio</span>
          </div>
        </div>
        <button style={{
          padding: '8px 16px', borderRadius: 999,
          backgroundColor: T.ink, color: '#FFFFFF',
          fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
        }}>Follow</button>
      </div>

      {/* value row */}
      <div style={{ padding: '24px 24px 0 24px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 }}>
        <div>
          <div style={{ fontSize: 12, color: T.ink3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Portfolio value</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: T.ink, fontFamily: FONT_MONO, letterSpacing: '-0.02em' }}>R 312,847</div>
          <div style={{ fontSize: 13, color: T.pos, fontFamily: FONT_MONO, marginTop: 4 }}>+R 12,409  ·  +4.1% this month</div>
        </div>
        <div className="stance-spark">
          <Sparkline points={[10,11,10.5,12,11.8,12.6,12.4,13.2,13.6,14.1,13.8,14.6]} width={140} height={44} strokeWidth={2} color={T.pos} />
        </div>
      </div>

      {/* allocation donut + legend */}
      <div style={{ padding: '24px 24px', display: 'grid', gridTemplateColumns: '150px 1fr', gap: 28, alignItems: 'center' }}>
        <DonutAllocation slices={holdings.map(h => ({ pct: h.alloc, color: h.color }))} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px' }}>
          {holdings.map(h => (
            <div key={h.t} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: h.color, flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontFamily: FONT_MONO, fontWeight: 600, color: T.ink }}>{h.t}</span>
              <span style={{ fontSize: 13, fontFamily: FONT_MONO, color: T.ink3, marginLeft: 'auto' }}>{h.alloc}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* holdings list */}
      <div style={{ borderTop: `1px solid ${T.line}` }}>
        <div style={{ padding: '12px 24px', fontSize: 12, color: T.ink3, textTransform: 'uppercase', letterSpacing: '0.06em', backgroundColor: T.bg2 }}>Top holdings</div>
        {holdings.slice(0, 4).map((h, i) => (
          <div key={h.t} style={{
            padding: '14px 24px', display: 'grid',
            gridTemplateColumns: '40px 1fr 90px 80px 70px',
            alignItems: 'center', gap: 14,
            borderTop: i === 0 ? 'none' : `1px solid ${T.lineSoft}`,
          }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: h.color + '22', color: h.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT_MONO, fontSize: 11, fontWeight: 700 }}>
              {h.t.slice(0,3)}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>{h.n}</div>
              <div style={{ fontSize: 12, color: T.ink3, fontFamily: FONT_MONO }}>{h.t}</div>
            </div>
            <Sparkline points={h.spark} color={h.chg >= 0 ? T.pos : T.neg} width={80} height={22} />
            <div style={{ fontSize: 13, fontFamily: FONT_MONO, color: T.ink, textAlign: 'right', fontWeight: 600 }}>{h.alloc}%</div>
            <div style={{ fontSize: 13, fontFamily: FONT_MONO, color: h.chg >= 0 ? T.pos : T.neg, textAlign: 'right' }}>{h.chg >= 0 ? '+' : ''}{h.chg}%</div>
          </div>
        ))}
      </div>
    </MockFrame>
  );
}

function FeedMock() {
  return (
    <div style={{ display: 'grid', gap: 16, fontFamily: FONT_SANS }}>
      {/* Note card */}
      <MockFrame>
        <div style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <Avatar initials="LS" color="#FB7185" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>Lebo Sithole</div>
              <div style={{ fontSize: 12, color: T.ink3, fontFamily: FONT_MONO }}>@lebos · 2h</div>
            </div>
            <StockChip ticker="NPN" change={2.3} />
          </div>
          <p style={{ fontSize: 15, lineHeight: 1.55, color: T.ink, margin: 0, marginBottom: 14 }}>
            Thinking about trimming Naspers here. P/E expansion has outpaced earnings growth two quarters running — and Tencent exposure isn't the safety net it used to be.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 13, color: T.ink3 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>♡ 12</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><MessageSquare size={14} /> 3</span>
            <span style={{ marginLeft: 'auto', fontSize: 12, fontFamily: FONT_MONO }}>Thesis</span>
          </div>
        </div>
      </MockFrame>

      {/* Buy transaction card */}
      <MockFrame>
        <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <Avatar initials="NK" color="#635BFF" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, color: T.ink, marginBottom: 4 }}>
              <span style={{ fontWeight: 600 }}>Nolwazi K.</span> bought <span style={{ fontWeight: 600 }}>Capitec</span>
            </div>
            <div style={{ fontSize: 12, color: T.ink3, fontFamily: FONT_MONO }}>R 4,200 · 3 shares · 2.1% of portfolio</div>
          </div>
          <div style={{
            padding: '10px 14px', borderRadius: 12,
            backgroundColor: T.bg2, border: `1px solid ${T.line}`,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{ fontFamily: FONT_MONO, fontSize: 13, fontWeight: 700, color: T.ink }}>CPI</span>
            <Sparkline points={[3,3.1,3,3.3,3.4,3.3,3.5,3.6]} width={56} height={22} color={T.pos} />
            <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: T.pos }}>+1.1%</span>
          </div>
        </div>
      </MockFrame>

      {/* Thesis card */}
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
          <p style={{ fontSize: 13, lineHeight: 1.55, color: T.ink2, margin: 0 }}>
            Fintech ARPU is finally the driver of the story. Call vol declines matter less than the 400-basis-point shift in revenue mix I'm seeing…
          </p>
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
            <div style={{ fontSize: 24, fontWeight: 700, color: T.ink, fontFamily: FONT_MONO, letterSpacing: '-0.02em' }}>R 3,241.50</div>
            <div style={{ fontSize: 13, color: T.pos, fontFamily: FONT_MONO }}>+R 72.80  ·  +2.3%</div>
          </div>
        </div>
        <div style={{ marginTop: 14 }} className="stance-spark">
          <Sparkline points={[30,31,29,32,31,33,34,33,35,34,36,37,36,38,37,39,40,41]} width={520} height={56} strokeWidth={2} color={T.accent} />
        </div>
      </div>

      {/* AI Summary */}
      <div style={{ padding: '20px 24px', backgroundColor: T.bg2, borderBottom: `1px solid ${T.line}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: `linear-gradient(135deg, ${T.accent}, #A78BFA)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Sparkles size={14} style={{ color: '#FFFFFF' }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: T.ink, letterSpacing: '-0.005em' }}>AI Summary</span>
          <span style={{ fontSize: 11, color: T.ink3, fontFamily: FONT_MONO, marginLeft: 'auto' }}>Updated 2m ago</span>
        </div>
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 8 }}>
          {[
            'Fintech revenue grew 41% YoY; now 18% of group revenue vs. 11% a year ago.',
            'Tencent discount narrowed to 42% after buyback acceleration in Q3.',
            'Classifieds unit reached profitability ahead of guidance.',
          ].map((b, i) => (
            <li key={i} style={{ display: 'flex', gap: 10, fontSize: 14, lineHeight: 1.5, color: T.ink2 }}>
              <Check size={16} style={{ color: T.accent, flexShrink: 0, marginTop: 2 }} />
              {b}
            </li>
          ))}
        </ul>
      </div>

      {/* Community strip */}
      <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex' }}>
          {['#635BFF','#FB7185','#7EE8D2','#FFD37A','#A78BFA'].map((c,i) => (
            <div key={i} style={{
              width: 28, height: 28, borderRadius: '50%',
              backgroundColor: c, border: '2px solid #FFFFFF',
              marginLeft: i === 0 ? 0 : -8,
            }} />
          ))}
        </div>
        <div>
          <div style={{ fontSize: 13, color: T.ink, fontWeight: 600 }}>12 members hold this</div>
          <div style={{ fontSize: 12, color: T.ink3, fontFamily: FONT_MONO }}>Avg allocation 6.2%  ·  64% bullish</div>
        </div>
      </div>
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
//  NAV
// ============================================================
function Nav({ onStart }) {
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 50,
      backgroundColor: 'rgba(255,255,255,0.82)',
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
          <span style={{ fontSize: 18, fontWeight: 700, color: T.ink, letterSpacing: '-0.015em' }}>Stance</span>
        </a>

        <nav style={{ display: 'flex', alignItems: 'center', gap: 28 }} className="hidden md:flex">
          <a href="#portfolio"  className="stance-link" style={{ fontSize: 14, fontWeight: 500 }}>Portfolio</a>
          <a href="#feed"       className="stance-link" style={{ fontSize: 14, fontWeight: 500 }}>Feed</a>
          <a href="#ai"         className="stance-link" style={{ fontSize: 14, fontWeight: 500 }}>AI context</a>
          <a href="#notes"      className="stance-link" style={{ fontSize: 14, fontWeight: 500 }}>Notes</a>
          <a href="#model"      className="stance-link" style={{ fontSize: 14, fontWeight: 500 }}>How it works</a>
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
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
    const subject = `Stance launch interest - ${interestType}`;
    const body = [
      'Hi Stance,',
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
      'Sent from the Stance concept site.',
    ].join('\n');
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setLaunchMessage(`Your email app should open now. If not, message ${CONTACT_EMAIL} directly.`);
  };

  return (
    <div style={{ backgroundColor: T.bg, color: T.ink, fontFamily: FONT_SANS }}>
      <GlobalStyles />
      <Nav />

      {/* ============ HERO ============ */}
      <section id="top" style={{ position: 'relative', overflow: 'hidden' }}>
        <GradientMesh />
        <div style={{ position: 'relative', maxWidth: 1200, margin: '0 auto', padding: '100px 24px 64px', textAlign: 'center' }} className="stance-reveal">
          <div style={{ marginBottom: 24 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '6px 14px', borderRadius: 999,
              backgroundColor: 'rgba(255,255,255,0.7)',
              border: `1px solid ${T.line}`,
              fontSize: 13, color: T.ink2, fontWeight: 500,
              backdropFilter: 'blur(8px)',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: T.pos }} />
              Early concept · South Africa first
            </span>
          </div>
          <h1 style={{
            fontSize: 'clamp(44px, 7.2vw, 84px)',
            fontWeight: 700, lineHeight: 1.03, letterSpacing: '-0.035em',
            color: T.ink, margin: 0, marginBottom: 24,
          }}>
            The social network<br />for people who<br />
            <span style={{ background: `linear-gradient(120deg, ${T.accent}, #A78BFA, #FB7185)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>actually invest.</span>
          </h1>
          <p style={{
            fontSize: 'clamp(17px, 1.6vw, 21px)', lineHeight: 1.55,
            color: T.ink2, maxWidth: 620, margin: '0 auto 36px',
          }}>
            See real portfolios, real theses, and real conviction — not screenshots, not hot takes. Stance is where South African investors show their hand.
          </p>
          <div style={{ display: 'inline-flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
            <PrimaryCTA href="#launch">Get early access</PrimaryCTA>
            <GhostCTA href="#portfolio">See the concept</GhostCTA>
          </div>
        </div>

        {/* Hero product artifact */}
        <div style={{ position: 'relative', maxWidth: 1080, margin: '0 auto', padding: '0 24px 80px' }}>
          <div className="stance-float">
            <PortfolioMock />
          </div>
        </div>
      </section>

      {/* ============ TICKER ============ */}
      <TickerStrip />

      {/* ============ PORTFOLIO SECTION ============ */}
      <section id="portfolio" style={{ padding: '140px 24px', backgroundColor: T.bg }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }} className="stance-two-col">
          <div>
            <SectionHead
              eyebrow="Portfolios"
              title="A profile built on positions, not posts."
              body="Sync once and every holding, weighting, and move shows up verified. No screenshots. No selective memory. The portfolio is the profile."
            />
            <div style={{ marginTop: 36, display: 'grid', gap: 18 }}>
              {[
                'Verified holdings and live weightings',
                'Performance signals in monthly and all-time views',
                'A credibility badge so conviction can be weighed',
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
      <section id="feed" style={{ padding: '140px 24px', backgroundColor: '#F6F9FF' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
          <div style={{ order: 2 }}><FeedMock /></div>
          <div style={{ order: 1 }}>
            <SectionHead
              eyebrow="Feed"
              title="What happens when everyone shows their hand."
              body="A feed of real trades, notes tied to real positions, and theses from real portfolios. Nothing anonymous. Nothing unverifiable."
            />
            <div style={{ marginTop: 36, display: 'grid', gap: 18 }}>
              {[
                'Trades, notes, and theses — tied to portfolios you can open',
                'Free to browse, premium to go deeper with Vault creators',
                'Built for conviction, not engagement farming',
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
      <section id="ai" style={{ padding: '140px 24px', backgroundColor: T.bg }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
          <div>
            <SectionHead
              eyebrow="AI context"
              title="Every stock, explained in three bullets."
              body="Price charts are table stakes. Stance pairs each stock with an AI synthesis of what matters right now — plus community conviction signals you won't find on Bloomberg."
            />
            <div style={{ marginTop: 36, display: 'grid', gap: 18 }}>
              {[
                'Plain-language summaries of what changed this quarter',
                'Community allocation and sentiment at a glance',
                'Deep links into member theses and notes',
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

      {/* ============ NOTES SECTION (mint band) ============ */}
      <section id="notes" style={{ padding: '140px 24px', backgroundColor: '#F0FAF5' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
          <div style={{ order: 2 }}><NoteMock /></div>
          <div style={{ order: 1 }}>
            <SectionHead
              eyebrow="Notes & threads"
              title="Where the actual conversation lives."
              body="Every note sits beside the portfolio that wrote it. Every reply is traceable. This is how investing discussion should have looked the whole time."
            />
            <div style={{ marginTop: 36, display: 'grid', gap: 18 }}>
              {[
                'Notes tied to stocks, theses, and specific positions',
                'Threaded replies from other verified investors',
                'Saveable, quotable, and actually useful on revisit',
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
      <section id="audience" style={{ padding: '140px 24px', backgroundColor: T.bg }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <SectionHead
            eyebrow="Who it's for"
            title="Built for three kinds of people."
            align="center"
            maxWidth={720}
          />
          <div style={{ marginTop: 72, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32 }}>
            {[
              {
                icon: Users,
                label: 'Members',
                title: 'Finally, a feed worth opening.',
                body: 'See verified portfolios, not subtweets. Build conviction by learning from people who show their full position, not just the winners.',
              },
              {
                icon: Sparkles,
                label: 'Creators',
                title: 'An audience built on trust.',
                body: 'Your portfolio is your portfolio. Your track record is your track record. Build a free audience, convert them into Vault subscribers.',
              },
              {
                icon: BriefcaseBusiness,
                label: 'Partners',
                title: 'Reach investors who actually invest.',
                body: 'Verified retail, organised by conviction theme. Partner programmes that don\'t depend on the randomness of ad targeting.',
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

      {/* ============ MODEL ============ */}
      <section id="model" style={{ padding: '120px 24px 140px', backgroundColor: T.bg2 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <SectionHead
            eyebrow="Business model"
            title="Three revenue surfaces, one network."
            align="center"
            maxWidth={700}
          />
          <div style={{ marginTop: 64, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 40 }}>
            {[
              { icon: Lock, title: 'Vault subscriptions', body: 'Creators monetise depth. Members subscribe to the portfolios and theses they value most.' },
              { icon: BriefcaseBusiness, title: 'Platform partnerships', body: 'Verified retail investing audiences for financial brands, without ad-targeting randomness.' },
              { icon: Sparkles, title: 'Premium tooling', body: 'Advanced analytics, comparisons, and investor intelligence as an upgrade on top of the network.' },
            ].map((m) => {
              const Icon = m.icon;
              return (
                <div key={m.title}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    backgroundColor: T.bg, border: `1px solid ${T.line}`,
                    color: T.accent,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 20,
                  }}>
                    <Icon size={18} strokeWidth={2} />
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 600, color: T.ink, marginBottom: 8, letterSpacing: '-0.01em' }}>{m.title}</div>
                  <p style={{ fontSize: 15, lineHeight: 1.6, color: T.ink2, margin: 0 }}>{m.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============ LAUNCH CTA (dark band) ============ */}
      <section id="launch" style={{ padding: '120px 24px', backgroundColor: T.navy, position: 'relative', overflow: 'hidden' }}>
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
            Drop your email and we'll include you in the first round of invites. No spam, no drip sequences — just launch.
          </p>

          <form onSubmit={openLaunchEmail} style={{
            backgroundColor: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.14)',
            borderRadius: 20, padding: 24,
            backdropFilter: 'blur(12px)',
            display: 'grid', gap: 14,
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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
      <footer style={{ backgroundColor: T.bg, borderTop: `1px solid ${T.line}`, padding: '64px 24px 40px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 48, marginBottom: 56 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: `linear-gradient(135deg, ${T.accent}, #A78BFA)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <TrendingUp size={15} style={{ color: '#FFFFFF' }} strokeWidth={2.6} />
                </div>
                <span style={{ fontSize: 18, fontWeight: 700, color: T.ink, letterSpacing: '-0.015em' }}>Stance</span>
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: T.ink3, margin: 0, maxWidth: 260 }}>
                The social network for people who actually invest. South Africa first.
              </p>
            </div>
            {[
              { h: 'Product', items: ['Portfolio', 'Feed', 'AI context', 'Notes', 'Vault'] },
              { h: 'Company', items: ['About', 'Blog', 'Careers', 'Press'] },
              { h: 'Resources', items: ['Guides', 'Docs', 'Community', 'Partners'] },
              { h: 'Legal', items: ['Privacy', 'Terms', 'Security', 'Compliance'] },
            ].map((col) => (
              <div key={col.h}>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, marginBottom: 16, letterSpacing: '-0.005em' }}>{col.h}</div>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
                  {col.items.map((it) => (
                    <li key={it}><a href="#" className="stance-link" style={{ fontSize: 14 }}>{it}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div style={{
            paddingTop: 28, borderTop: `1px solid ${T.line}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: 13, color: T.ink3 }}>© {new Date().getFullYear()} Stance. Concept site — not financial advice.</span>
            <span style={{ fontSize: 13, color: T.ink3, fontFamily: FONT_MONO }}>hello@sharez.co.za</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
