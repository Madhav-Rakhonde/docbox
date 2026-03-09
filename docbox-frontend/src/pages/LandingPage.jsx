import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

/* ── Google Fonts ── */
const FONTS = `https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@400;500;600;700;800&display=swap`;

/* ── Design System CSS ── */
const CSS = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; overflow-x: hidden; }

:root {
  /* DocBox palette */
  --navy:    #0F172A;
  --navy2:   #1E293B;
  --navy3:   #0A1020;
  --slate:   #334155;
  --slate2:  #475569;
  --slate3:  #64748B;
  --muted:   #94A3B8;
  --border:  #E2E8F0;
  --border2: rgba(255,255,255,0.08);
  --canvas:  #F8F9FC;
  --white:   #FFFFFF;

  /* Indigo accent */
  --indigo:  #6366F1;
  --indigo2: #4F46E5;
  --indigo3: #818CF8;
  --indigo4: rgba(99,102,241,0.12);
  --indigo5: rgba(99,102,241,0.06);

  /* Semantic */
  --green:   #10B981;
  --green2:  rgba(16,185,129,0.12);
  --amber:   #F59E0B;
  --amber2:  rgba(245,158,11,0.12);
  --red:     #EF4444;
  --red2:    rgba(239,68,68,0.10);
  --blue:    #3B82F6;

  /* Typography */
  --serif:  'DM Serif Display', Georgia, serif;
  --sans:   'DM Sans', -apple-system, sans-serif;
}

body {
  background: var(--navy);
  color: rgba(238,242,255,0.9);
  font-family: var(--sans);
  -webkit-font-smoothing: antialiased;
  -webkit-tap-highlight-color: transparent;
  overflow-x: hidden;
}

/* ── Noise texture overlay ── */
body::after {
  content: ''; position: fixed; inset: 0; z-index: 9999; pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.022'/%3E%3C/svg%3E");
  opacity: 0.55;
}

/* ── Dot-grid background (DocBox AppLayout pattern) ── */
.db-mesh {
  position: fixed; inset: 0; z-index: 0; pointer-events: none;
  background-image: radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px);
  background-size: 28px 28px;
}
.db-mesh::before {
  content: ''; position: absolute; inset: 0;
  background: radial-gradient(ellipse 60% 50% at 20% 40%, rgba(99,102,241,0.18) 0%, transparent 70%),
              radial-gradient(ellipse 50% 40% at 80% 20%, rgba(129,140,248,0.12) 0%, transparent 60%),
              radial-gradient(ellipse 40% 60% at 60% 90%, rgba(16,185,129,0.06) 0%, transparent 70%);
}

#db-canvas { position: fixed; inset: 0; z-index: 0; pointer-events: none; }
.db-page { position: relative; z-index: 1; }
.db-cx { max-width: 1120px; margin: 0 auto; padding: 0 32px; }

/* ══════════════════ NAV ══════════════════ */
.db-nav {
  position: fixed; top: 0; left: 0; right: 0; z-index: 200;
  padding: 0 32px;
  transition: background 0.4s, border-color 0.4s;
}
.db-nav.scrolled {
  background: rgba(15,23,42,0.92);
  backdrop-filter: blur(20px) saturate(160%);
  -webkit-backdrop-filter: blur(20px) saturate(160%);
  border-bottom: 1px solid var(--border2);
}
.db-nav-row {
  max-width: 1120px; margin: 0 auto;
  display: flex; align-items: center; height: 68px; gap: 6px;
}

/* Logo mark — stacked document SVG */
.db-logo {
  display: flex; align-items: center; gap: 10px; margin-right: auto;
  cursor: pointer; text-decoration: none;
}
.db-logo-mark {
  width: 34px; height: 34px; position: relative; flex-shrink: 0;
}
.db-logo-text {
  font-family: var(--sans); font-weight: 800; font-size: 1.1rem;
  color: #F8FAFC; letter-spacing: -0.03em; line-height: 1;
}
.db-logo-text span { color: var(--indigo3); font-weight: 400; }
.db-logo-sub { font-size: 0.6rem; color: var(--muted); letter-spacing: 0.1em; text-transform: uppercase; margin-top: 1px; }

.db-nlinks { display: flex; gap: 2px; }
.db-nlink {
  background: none; border: none; cursor: pointer;
  font-family: var(--sans); font-size: 0.85rem; font-weight: 600;
  color: var(--muted); padding: 7px 13px; border-radius: 8px;
  transition: color 0.15s, background 0.15s;
}
.db-nlink:hover { color: #F1F5F9; background: rgba(255,255,255,0.05); }

.db-nbtn {
  background: none; border: 1px solid var(--border2);
  color: rgba(238,242,255,0.7); font-family: var(--sans);
  font-size: 0.85rem; font-weight: 700;
  padding: 8px 18px; border-radius: 9px; cursor: pointer;
  transition: all 0.18s;
}
.db-nbtn:hover { border-color: var(--indigo3); color: var(--indigo3); }

.db-nbtn2 {
  background: linear-gradient(135deg, var(--indigo), var(--indigo2));
  border: none; color: #fff;
  font-family: var(--sans); font-size: 0.85rem; font-weight: 700;
  padding: 9px 20px; border-radius: 9px; cursor: pointer; margin-left: 6px;
  box-shadow: 0 4px 14px rgba(99,102,241,0.35);
  transition: all 0.22s;
}
.db-nbtn2:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(99,102,241,0.5); }

/* Minimum touch targets for mobile */
button { min-height: 36px; }

/* ══════════════════ HERO ══════════════════ */
.db-hero {
  padding: 148px 32px 96px;
  min-height: 100vh;
  display: flex; align-items: center;
  position: relative; overflow: hidden;
}
.db-hero-inner {
  width: 100%; display: flex; flex-direction: column; align-items: center; text-align: center;
}

/* Subtle rings */
.db-ring {
  position: absolute; border-radius: 50%;
  border: 1px solid rgba(99,102,241,0.06);
  left: 50%; top: 50%; transform: translate(-50%, -50%);
  pointer-events: none;
}

.db-badge {
  display: inline-flex; align-items: center; gap: 8px;
  background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.22);
  border-radius: 100px; padding: 5px 14px 5px 8px; margin-bottom: 26px;
  font-size: 0.72rem; font-weight: 800; letter-spacing: 0.07em;
  text-transform: uppercase; color: var(--indigo3);
  opacity: 0; animation: db-up 0.65s 0.05s cubic-bezier(0.16,1,0.3,1) forwards;
}
.db-badge-dot {
  width: 22px; height: 22px; border-radius: 6px;
  background: linear-gradient(135deg, var(--indigo), var(--indigo3));
  display: flex; align-items: center; justify-content: center; font-size: 0.72rem;
}

.db-h1 {
  font-family: var(--serif); font-weight: 400;
  font-size: clamp(2.6rem, 5vw, 4.75rem);
  line-height: 1.07; letter-spacing: -0.02em;
  color: #F8FAFC; max-width: 760px; margin: 0 auto 20px;
  opacity: 0; animation: db-up 0.65s 0.14s cubic-bezier(0.16,1,0.3,1) forwards;
}
.db-h1 em {
  font-style: italic; color: var(--indigo3);
}
.db-h1 .db-grd {
  font-style: italic;
  background: linear-gradient(100deg, var(--indigo3) 0%, #a5b4fc 40%, var(--green) 100%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
}

.db-h-sub {
  font-size: 1.05rem; line-height: 1.78; color: rgba(238,242,255,0.6);
  max-width: 500px; margin: 0 auto 34px; font-weight: 400;
  opacity: 0; animation: db-up 0.65s 0.22s cubic-bezier(0.16,1,0.3,1) forwards;
}

/* CTA input row */
.db-capture-wrap {
  display: flex; flex-direction: column; align-items: center; gap: 14px; width: 100%;
  opacity: 0; animation: db-up 0.65s 0.3s cubic-bezier(0.16,1,0.3,1) forwards;
}
.db-cap-btn-solo {
  background: linear-gradient(135deg, var(--indigo), var(--indigo2));
  border: none; color: #fff;
  font-family: var(--sans); font-size: 1rem; font-weight: 800;
  padding: 16px 36px; border-radius: 12px; cursor: pointer;
  box-shadow: 0 8px 32px rgba(99,102,241,0.4);
  transition: transform 0.25s cubic-bezier(0.16,1,0.3,1), box-shadow 0.25s;
  letter-spacing: -0.01em;
}
.db-cap-btn-solo:hover {
  transform: translateY(-3px);
  box-shadow: 0 16px 48px rgba(99,102,241,0.55);
}

.db-h-micro {
  font-size: 0.76rem; color: var(--muted);
  display: flex; align-items: center; justify-content: center; gap: 16px; flex-wrap: wrap;
}
.db-hcheck { color: var(--green); margin-right: 3px; }

/* Trust pills */
.db-trow {
  display: flex; align-items: center; justify-content: center;
  gap: 8px; flex-wrap: wrap; margin-top: 38px; margin-bottom: 56px;
  opacity: 0; animation: db-up 0.65s 0.4s cubic-bezier(0.16,1,0.3,1) forwards;
}
.db-tp {
  display: flex; align-items: center; gap: 6px;
  background: rgba(255,255,255,0.04); border: 1px solid var(--border2); border-radius: 100px;
  padding: 6px 13px; font-size: 0.75rem; font-weight: 600; color: var(--muted);
}

/* Mockup */
.db-mock-wrap {
  max-width: 660px; width: 100%; margin: 0 auto; position: relative;
  opacity: 0; animation: db-up 0.85s 0.5s cubic-bezier(0.16,1,0.3,1) forwards;
}
.db-mock-wrap::before {
  content: ''; position: absolute; bottom: -50px; left: 50%; transform: translateX(-50%);
  width: 70%; height: 80px; pointer-events: none; filter: blur(24px);
  background: radial-gradient(ellipse, rgba(99,102,241,0.22) 0%, transparent 70%);
}
.db-mock {
  background: var(--navy2); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 18px; overflow: hidden;
  box-shadow: 0 48px 96px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05);
  animation: db-float 7s ease-in-out infinite;
}

/* Window bar */
.db-mbar {
  background: rgba(15,23,42,0.95); border-bottom: 1px solid rgba(255,255,255,0.06);
  padding: 12px 16px; display: flex; align-items: center; gap: 7px;
}
.db-mdot { width: 10px; height: 10px; border-radius: 50%; }
.db-mtitle { flex: 1; text-align: center; font-size: 0.73rem; color: var(--muted); font-weight: 600; letter-spacing: 0.03em; }

/* Sidebar strip */
.db-msplit { display: flex; }
.db-mbody { flex: 1; padding: 16px; }
.db-mshead { display: flex; align-items: center; justify-content: space-between; margin-bottom: 11px; }
.db-mshl { font-size: 0.83rem; font-weight: 700; color: #F1F5F9; }
.db-mshr { display: flex; align-items: center; gap: 5px; font-size: 0.69rem; color: var(--muted); }
.db-sdot { width: 6px; height: 6px; border-radius: 50%; background: var(--green); }

.db-drow {
  display: flex; align-items: center; gap: 10px; padding: 10px 11px;
  border-radius: 10px; background: rgba(15,23,42,0.6); border: 1px solid rgba(255,255,255,0.05);
  margin-bottom: 7px; transition: border-color 0.2s;
}
.db-drow:hover { border-color: rgba(99,102,241,0.25); }
.db-drow:last-child { margin-bottom: 0; }
.db-dico { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 0.88rem; flex-shrink: 0; }
.db-dn { font-size: 0.8rem; font-weight: 700; color: #F1F5F9; }
.db-ds { font-size: 0.67rem; color: var(--muted); margin-top: 1px; }
.db-dbadge { margin-left: auto; font-size: 0.62rem; font-weight: 800; padding: 3px 8px; border-radius: 5px; white-space: nowrap; }
.db-bok   { background: rgba(16,185,129,0.12); color: var(--green); }
.db-bwarn { background: rgba(239,68,68,0.1);   color: var(--red); }
.db-bnew  { background: rgba(99,102,241,0.12);  color: var(--indigo3); }
.db-binfo { background: rgba(245,158,11,0.12);  color: var(--amber); }

.db-mfoot {
  padding: 11px 16px; border-top: 1px solid rgba(255,255,255,0.05);
  display: flex; align-items: center; justify-content: space-between;
}
.db-mavs { display: flex; }
.db-mav {
  width: 24px; height: 24px; border-radius: 50%; border: 2px solid var(--navy2);
  display: flex; align-items: center; justify-content: center;
  font-size: 0.54rem; font-weight: 800; margin-left: -6px;
}
.db-mav:first-child { margin-left: 0; }

/* Floating chips */
/* ══════════════════ SECURITY STRIP ══════════════════ */
.db-sstrip {
  background: rgba(30,41,59,0.5);
  border-top: 1px solid rgba(255,255,255,0.06);
  border-bottom: 1px solid rgba(255,255,255,0.06);
  padding: 18px 32px;
}
.db-sstrip-in {
  max-width: 1120px; margin: 0 auto;
  display: flex; align-items: center; justify-content: center; gap: 28px; flex-wrap: wrap;
}
.db-sbadge { display: flex; align-items: center; gap: 7px; font-size: 0.77rem; font-weight: 700; color: var(--muted); }

/* ══════════════════ STATS ══════════════════ */
.db-stats { padding: 72px 32px; }
.db-stats-grid {
  max-width: 1120px; margin: 0 auto;
  display: grid; grid-template-columns: repeat(4, 1fr);
  border-radius: 18px; overflow: hidden;
  border: 1px solid rgba(255,255,255,0.08);
  background: linear-gradient(135deg, rgba(30,41,59,0.7), rgba(15,23,42,0.8));
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
}
.db-sc {
  padding: 36px 24px; text-align: center;
  border-right: 1px solid rgba(255,255,255,0.06); position: relative; overflow: hidden;
}
.db-sc:last-child { border-right: none; }
.db-sc::after {
  content: ''; position: absolute; top: 0; left: 50%; transform: translateX(-50%);
  width: 50%; height: 1px;
  background: linear-gradient(90deg, transparent, var(--indigo), transparent);
  opacity: 0; transition: opacity 0.3s;
}
.db-sc:hover::after { opacity: 1; }
.db-sn {
  font-family: var(--serif); font-weight: 400;
  font-size: 2.6rem; line-height: 1; letter-spacing: -0.03em;
  background: linear-gradient(135deg, #F8FAFC 30%, var(--indigo3));
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  margin-bottom: 6px;
}
.db-sl { font-size: 0.78rem; color: var(--muted); font-weight: 600; }

/* ══════════════════ SECTION HEADERS ══════════════════ */
.db-slabel {
  display: inline-block; font-size: 0.67rem; font-weight: 800;
  letter-spacing: 0.18em; text-transform: uppercase; color: var(--indigo3); margin-bottom: 12px;
}
.db-sh2 {
  font-family: var(--serif); font-weight: 400;
  font-size: clamp(1.9rem, 3.2vw, 2.8rem);
  line-height: 1.12; letter-spacing: -0.02em; color: #F8FAFC; margin-bottom: 14px;
}
.db-sh2 em { font-style: italic; color: var(--indigo3); }
.db-sp { font-size: 0.92rem; line-height: 1.82; color: rgba(238,242,255,0.55); max-width: 460px; }

/* ══════════════════ FEATURES ══════════════════ */
.db-fsec { padding: 96px 32px; }
.db-frow {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 64px; align-items: center; margin-bottom: 96px;
}
.db-frow:last-child { margin-bottom: 0; }
.db-frow.db-flip { direction: rtl; }
.db-frow.db-flip > * { direction: ltr; }

.db-fdesc { font-size: 0.91rem; line-height: 1.84; color: rgba(238,242,255,0.55); margin-bottom: 22px; }
.db-fbulls { list-style: none; display: flex; flex-direction: column; gap: 9px; }
.db-fbull {
  display: flex; align-items: flex-start; gap: 10px;
  font-size: 0.85rem; color: rgba(238,242,255,0.6); line-height: 1.6;
}
.db-fbull-ic {
  width: 18px; height: 18px; border-radius: 5px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.6rem; margin-top: 2px;
  background: rgba(99,102,241,0.14); color: var(--indigo3);
}

/* Feature visual panels */
.db-fvis {
  border-radius: 16px; overflow: hidden;
  border: 1px solid rgba(255,255,255,0.08);
  box-shadow: 0 28px 64px rgba(0,0,0,0.4);
  transition: transform 0.4s cubic-bezier(0.16,1,0.3,1);
  width: 100%;
}
.db-fvis:hover { transform: translateY(-6px); }
.db-fvh {
  background: rgba(15,23,42,0.95); padding: 12px 15px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  display: flex; align-items: center; gap: 7px;
}
.db-fvd { width: 9px; height: 9px; border-radius: 50%; }
.db-fvt { font-size: 0.72rem; color: var(--muted); font-weight: 600; margin-left: 3px; }
.db-fvb { background: rgba(15,23,42,0.85); padding: 16px; }

/* OCR result rows */
.db-kv { display: flex; justify-content: space-between; padding: 7px 0; border-bottom: 1px solid rgba(255,255,255,0.04); }
.db-kv:last-child { border-bottom: none; }
.db-kvk { font-size: 0.74rem; color: var(--muted); }
.db-kvv { font-size: 0.74rem; color: #F1F5F9; font-weight: 700; }

/* Expiry rows */
.db-er { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; border-radius: 10px; background: rgba(15,23,42,0.7); border: 1px solid rgba(255,255,255,0.05); margin-bottom: 7px; }
.db-erl { display: flex; align-items: center; gap: 9px; }
.db-erbar-w { flex: 1; margin: 0 12px; height: 3px; background: rgba(255,255,255,0.07); border-radius: 2px; overflow: hidden; }
.db-erbar { height: 100%; border-radius: 2px; }

/* Permission rows */
.db-acrow { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; border-radius: 10px; background: rgba(15,23,42,0.7); border: 1px solid rgba(255,255,255,0.05); margin-bottom: 7px; }
.db-acp { display: flex; align-items: center; gap: 9px; }
.db-acav { width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.66rem; font-weight: 800; }

/* Share box */
.db-shbox { background: rgba(15,23,42,0.7); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 12px; margin-bottom: 10px; }
.db-shlink { display: flex; align-items: center; gap: 8px; background: rgba(99,102,241,0.08); border: 1px solid rgba(99,102,241,0.18); border-radius: 8px; padding: 8px 10px; margin-bottom: 8px; }
.db-shlt { flex: 1; font-size: 0.71rem; color: var(--indigo3); font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.db-shcopy { background: linear-gradient(135deg, var(--indigo), var(--indigo2)); color: #fff; border: none; font-size: 0.68rem; font-weight: 800; padding: 5px 11px; border-radius: 6px; cursor: pointer; font-family: var(--sans); }
.db-shtag { font-size: 0.68rem; font-weight: 700; padding: 3px 8px; border-radius: 5px; background: rgba(255,255,255,0.04); color: var(--muted); border: 1px solid rgba(255,255,255,0.06); margin-right: 5px; display: inline-block; margin-bottom: 3px; }

/* ══════════════════ HOW IT WORKS ══════════════════ */
.db-hiw {
  padding: 96px 32px;
  background: rgba(15,23,42,0.5);
  border-top: 1px solid rgba(255,255,255,0.06);
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.db-hiw-in { max-width: 1120px; margin: 0 auto; }
.db-hiw-top { text-align: center; margin-bottom: 52px; }
.db-hiw-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.db-hcard {
  background: rgba(30,41,59,0.5); border: 1px solid rgba(255,255,255,0.07);
  border-radius: 14px; padding: 24px 20px; position: relative; overflow: hidden;
  transition: transform 0.3s, border-color 0.3s;
}
.db-hcard:hover { transform: translateY(-4px); border-color: rgba(99,102,241,0.3); }
.db-hcard::before {
  content: ''; position: absolute; inset: 0; border-radius: 14px;
  background: linear-gradient(135deg, rgba(99,102,241,0.04), transparent);
  opacity: 0; transition: opacity 0.3s;
}
.db-hcard:hover::before { opacity: 1; }
.db-hnum {
  font-family: var(--serif); font-size: 3rem; font-weight: 400;
  line-height: 1; color: rgba(99,102,241,0.1); margin-bottom: 16px;
  -webkit-text-stroke: 1px rgba(99,102,241,0.18);
}
.db-hico { font-size: 1.6rem; margin-bottom: 11px; }
.db-htitle { font-weight: 700; font-size: 0.91rem; color: #F1F5F9; margin-bottom: 6px; }
.db-hdesc { font-size: 0.79rem; line-height: 1.72; color: var(--muted); }

/* ══════════════════ MARQUEE ══════════════════ */
.db-mqs { padding: 60px 0; overflow: hidden; }
.db-mqs-in { max-width: 1120px; margin: 0 auto; padding: 0 32px; }
.db-mq-lbl { text-align: center; font-size: 0.67rem; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase; color: var(--muted); margin-bottom: 22px; }
.db-mq-outer { overflow: hidden; mask-image: linear-gradient(90deg, transparent, black 8%, black 92%, transparent); }
.db-mtrack { display: flex; gap: 8px; width: max-content; animation: db-mq 30s linear infinite; }
.db-mtrack:hover { animation-play-state: paused; }
.db-mpill {
  display: flex; align-items: center; gap: 7px;
  background: rgba(30,41,59,0.6); border: 1px solid rgba(255,255,255,0.08); border-radius: 100px;
  padding: 7px 15px; font-size: 0.8rem; font-weight: 600; color: rgba(238,242,255,0.55);
  white-space: nowrap; transition: all 0.2s; cursor: default;
}
.db-mpill:hover { border-color: rgba(99,102,241,0.35); color: rgba(238,242,255,0.85); }

/* ══════════════════ TESTIMONIALS ══════════════════ */
.db-ts { padding: 96px 32px; }
.db-ts-hd { text-align: center; margin-bottom: 14px; }
.db-rline { display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 44px; font-size: 0.84rem; color: rgba(238,242,255,0.55); }
.db-rstars { color: var(--amber); font-size: 0.92rem; letter-spacing: 2px; }
.db-tg { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.db-tcard {
  background: rgba(30,41,59,0.5); border: 1px solid rgba(255,255,255,0.07);
  border-radius: 16px; padding: 24px 22px; position: relative; overflow: hidden;
  transition: transform 0.3s cubic-bezier(0.16,1,0.3,1), border-color 0.3s;
}
.db-tcard::after {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(99,102,241,0.5), transparent);
  opacity: 0; transition: opacity 0.3s;
}
.db-tcard:hover { transform: translateY(-5px); border-color: rgba(99,102,241,0.2); }
.db-tcard:hover::after { opacity: 1; }
.db-tcst { color: var(--amber); font-size: 0.76rem; letter-spacing: 3px; margin-bottom: 11px; }
.db-tcq { font-size: 0.86rem; line-height: 1.78; color: rgba(238,242,255,0.55); font-style: italic; margin-bottom: 18px; }
.db-tcp { display: flex; align-items: center; gap: 10px; }
.db-tcav { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.86rem; flex-shrink: 0; }
.db-tcn { font-weight: 700; font-size: 0.84rem; color: #F1F5F9; }
.db-tcr { font-size: 0.7rem; color: var(--muted); margin-top: 2px; }

/* ══════════════════ FAQ ══════════════════ */
.db-fqs {
  padding: 96px 32px;
  background: rgba(15,23,42,0.5);
  border-top: 1px solid rgba(255,255,255,0.06);
}
.db-fq-in { max-width: 680px; margin: 0 auto; }
.db-fq-hd { text-align: center; margin-bottom: 44px; }
.db-fqitem { border-bottom: 1px solid rgba(255,255,255,0.06); }
.db-fqq { display: flex; align-items: center; justify-content: space-between; cursor: pointer; padding: 19px 0; gap: 14px; }
.db-fqqt { font-weight: 700; font-size: 0.91rem; color: #F1F5F9; }
.db-fqic {
  width: 26px; height: 26px; border-radius: 8px; flex-shrink: 0;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
  display: flex; align-items: center; justify-content: center;
  font-size: 0.85rem; color: var(--muted); transition: all 0.22s;
}
.db-fqic.db-op { background: var(--indigo4); border-color: rgba(99,102,241,0.3); color: var(--indigo3); transform: rotate(45deg); }
.db-fqa { overflow: hidden; max-height: 0; transition: max-height 0.35s ease, padding 0.35s; }
.db-fqa.db-op { max-height: 180px; padding-bottom: 16px; }
.db-fqat { font-size: 0.85rem; line-height: 1.8; color: rgba(238,242,255,0.55); }

/* ══════════════════ CTA ══════════════════ */
.db-ctas { padding: 72px 32px 96px; }
.db-ctabox {
  max-width: 1120px; margin: 0 auto; border-radius: 22px;
  padding: 80px 48px; text-align: center; position: relative; overflow: hidden;
  background: linear-gradient(145deg, rgba(30,41,59,0.8) 0%, rgba(15,23,42,0.95) 50%, rgba(30,41,59,0.8) 100%);
  border: 1px solid rgba(99,102,241,0.18);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), 0 40px 80px rgba(0,0,0,0.4);
}
.db-ctabox::before {
  content: ''; position: absolute; top: -60px; left: 50%; transform: translateX(-50%);
  width: 500px; height: 300px; pointer-events: none;
  background: radial-gradient(ellipse, rgba(99,102,241,0.14) 0%, rgba(16,185,129,0.04) 50%, transparent 70%);
}
/* Dot grid inside CTA */
.db-ctabox::after {
  content: ''; position: absolute; inset: 0; border-radius: 22px; pointer-events: none;
  background-image: radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px);
  background-size: 24px 24px;
}
.db-ctah {
  font-family: var(--serif); font-weight: 400;
  font-size: clamp(1.9rem, 3.8vw, 3.3rem);
  line-height: 1.1; letter-spacing: -0.02em; color: #F8FAFC;
  max-width: 560px; margin: 0 auto 16px; position: relative; z-index: 1;
}
.db-ctah em { font-style: italic; color: var(--indigo3); }
.db-ctap { font-size: 0.97rem; color: rgba(238,242,255,0.55); max-width: 400px; margin: 0 auto 32px; line-height: 1.78; position: relative; z-index: 1; }
.db-ctabtns { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; position: relative; z-index: 1; }
.db-ctab1 {
  background: linear-gradient(135deg, var(--indigo), var(--indigo2)); border: none; color: #fff;
  font-family: var(--sans); font-size: 0.95rem; font-weight: 700;
  padding: 13px 28px; border-radius: 11px; cursor: pointer;
  box-shadow: 0 6px 22px rgba(99,102,241,0.4); transition: all 0.22s;
}
.db-ctab1:hover { transform: translateY(-2px); box-shadow: 0 12px 36px rgba(99,102,241,0.5); }
.db-ctab2 {
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); color: rgba(238,242,255,0.8);
  font-family: var(--sans); font-size: 0.95rem; font-weight: 600;
  padding: 12px 24px; border-radius: 11px; cursor: pointer; transition: all 0.22s;
}
.db-ctab2:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.18); }

/* ══════════════════ FOOTER ══════════════════ */
.db-foot { border-top: 1px solid rgba(255,255,255,0.06); padding: 52px 32px 30px; }
.db-foot-grid { max-width: 1120px; margin: 0 auto; display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 40px; margin-bottom: 40px; }
.db-foot-brand p { font-size: 0.81rem; color: var(--muted); line-height: 1.72; margin-top: 10px; max-width: 230px; }
.db-fct { font-size: 0.68rem; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); margin-bottom: 14px; }
.db-fl { display: block; font-size: 0.81rem; color: var(--muted); background: none; border: none; cursor: pointer; padding: 0; text-align: left; margin-bottom: 9px; transition: color 0.15s; font-family: var(--sans); }
.db-fl:hover { color: #F1F5F9; }
.db-foot-bot { max-width: 1120px; margin: 0 auto; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.06); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; }
.db-fcopy { font-size: 0.74rem; color: rgba(255,255,255,0.22); }

/* ══════════════════ KEYFRAMES ══════════════════ */
@keyframes db-up { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
@keyframes db-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
@keyframes db-mq { from{transform:translateX(0)} to{transform:translateX(-50%)} }

/* Reveal on scroll */
.db-rv { opacity: 0; transform: translateY(26px); transition: opacity 0.55s ease, transform 0.55s ease; }
.db-rv.db-in { opacity: 1; transform: translateY(0); }
.db-d1{transition-delay:0.06s} .db-d2{transition-delay:0.12s} .db-d3{transition-delay:0.18s} .db-d4{transition-delay:0.24s}

/* ══════════════════ RESPONSIVE ══════════════════ */

/* ── Tablet (≤ 900px) ── */
@media(max-width:900px){
  .db-cx { padding:0 24px; }
  .db-nav { padding:0 24px; }

  /* Nav */
  .db-nlinks { display:none; }
  .db-nbtn { padding:7px 14px; font-size:0.82rem; }
  .db-nbtn2 { margin-left:0; padding:8px 16px; font-size:0.82rem; }

  /* Hero */
  .db-hero { padding:120px 24px 72px; min-height:auto; }
  .db-h1 { font-size:clamp(2.2rem,6vw,3.4rem); }
  .db-h-sub { font-size:0.97rem; max-width:100%; }
  .db-trow { gap:6px; margin-bottom:40px; }
  .db-tp { font-size:0.72rem; padding:5px 11px; }
  .db-mock-wrap { max-width:100%; }

  /* Security strip */
  .db-sstrip { padding:16px 24px; }
  .db-sstrip-in { gap:16px; }
  .db-sbadge { font-size:0.72rem; }

  /* Stats */
  .db-stats { padding:48px 24px; }
  .db-stats-grid { grid-template-columns:1fr 1fr; }
  .db-sc { border-right:none; border-bottom:1px solid rgba(255,255,255,0.06); }
  .db-sc:nth-child(odd) { border-right:1px solid rgba(255,255,255,0.06); }
  .db-sc:nth-last-child(-n+2) { border-bottom:none; }

  /* Features */
  .db-fsec { padding:64px 24px; }
  .db-frow { grid-template-columns:1fr; direction:ltr; gap:32px; margin-bottom:64px; }
  .db-frow.db-flip { direction:ltr; }
  .db-frow.db-flip > * { direction:ltr; }

  /* How it works */
  .db-hiw { padding:64px 24px; }
  .db-hiw-grid { grid-template-columns:1fr 1fr; }

  /* Testimonials */
  .db-ts { padding:64px 24px; }
  .db-tg { grid-template-columns:1fr; }

  /* FAQ */
  .db-fqs { padding:64px 24px; }

  /* CTA */
  .db-ctas { padding:48px 24px 72px; }
  .db-ctabox { padding:48px 24px; }
  .db-ctabtns { flex-direction:column; align-items:center; }
  .db-ctab1, .db-ctab2 { width:100%; max-width:320px; text-align:center; }

  /* Footer */
  .db-foot { padding:40px 24px 24px; }
  .db-foot-grid { grid-template-columns:1fr 1fr; gap:24px; margin-bottom:28px; }
}

/* ── Mobile (≤ 600px) ── */
@media(max-width:600px){
  .db-cx { padding:0 16px; }
  .db-nav { padding:0 16px; }
  .db-nav-row { height:60px; gap:8px; }

  /* Hide sign-in on very small screens, keep Get started */
  .db-nbtn { font-size:0.78rem; padding:6px 12px; border-radius:8px; }
  .db-nbtn2 { font-size:0.78rem; padding:7px 12px; margin-left:0; }

  /* Hero */
  .db-hero { padding:100px 16px 56px; }
  .db-h1 { font-size:clamp(1.9rem,8vw,2.6rem); line-height:1.1; }
  .db-h-sub { font-size:0.92rem; margin-bottom:28px; }
  .db-badge { font-size:0.66rem; padding:4px 12px 4px 7px; }
  .db-cap-btn-solo { font-size:0.93rem; padding:15px 28px; width:100%; max-width:340px; }
  .db-h-micro { font-size:0.72rem; gap:10px; }
  .db-trow { display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-top:28px; margin-bottom:36px; }
  .db-tp { font-size:0.71rem; padding:6px 10px; justify-content:flex-start; border-radius:10px; }

  /* Mockup — scale down, disable float animation on mobile */
  .db-mock-wrap { max-width:100%; }
  .db-mock { animation:none; border-radius:14px; }
  .db-mbar { padding:10px 14px; }
  .db-mdot { width:8px; height:8px; }
  .db-mbody { padding:12px; }
  .db-drow { padding:8px 9px; gap:8px; }
  .db-dico { width:28px; height:28px; font-size:0.8rem; }
  .db-dn { font-size:0.75rem; }
  .db-ds { font-size:0.63rem; }
  .db-dbadge { font-size:0.58rem; padding:2px 7px; }
  .db-mfoot { padding:9px 12px; }
  .db-mav { width:20px; height:20px; font-size:0.5rem; }

  /* Security strip — scroll horizontally */
  .db-sstrip { padding:14px 16px; overflow-x:auto; -webkit-overflow-scrolling:touch; }
  .db-sstrip-in { flex-wrap:nowrap; justify-content:flex-start; gap:20px; width:max-content; padding:0 4px; }

  /* Stats */
  .db-stats { padding:36px 16px; }
  .db-stats-grid { grid-template-columns:1fr 1fr; border-radius:14px; }
  .db-sn { font-size:2rem; }
  .db-sc { padding:26px 16px; }
  .db-sc:nth-child(odd) { border-right:1px solid rgba(255,255,255,0.06); }
  .db-sc:nth-last-child(-n+2) { border-bottom:none; }

  /* Features */
  .db-fsec { padding:48px 16px; }
  .db-frow { margin-bottom:48px; gap:24px; }
  .db-sh2 { font-size:clamp(1.6rem,6vw,2.2rem); }
  .db-fdesc { font-size:0.88rem; }
  .db-fbulls { gap:7px; }
  .db-fbull { font-size:0.82rem; }

  /* How it works */
  .db-hiw { padding:48px 16px; }
  .db-hiw-grid { grid-template-columns:1fr; gap:12px; }
  .db-hcard { padding:20px 16px; }
  .db-hnum { font-size:2.4rem; margin-bottom:12px; }

  /* Marquee */
  .db-mqs { padding:40px 0; }
  .db-mqs-in { padding:0 16px; }

  /* Testimonials */
  .db-ts { padding:48px 16px; }
  .db-tcard { padding:20px 18px; }
  .db-tcq { font-size:0.84rem; }

  /* FAQ */
  .db-fqs { padding:48px 16px; }
  .db-fqqt { font-size:0.88rem; }
  .db-fqat { font-size:0.83rem; }

  /* CTA */
  .db-ctas { padding:36px 16px 56px; }
  .db-ctabox { padding:40px 20px; border-radius:16px; }
  .db-ctah { font-size:clamp(1.6rem,6vw,2.4rem); }
  .db-ctap { font-size:0.9rem; }

  /* Footer */
  .db-foot { padding:36px 16px 20px; }
  .db-foot-grid { grid-template-columns:1fr; gap:20px; margin-bottom:20px; }
  .db-foot-brand p { max-width:100%; }
  .db-foot-bot { flex-direction:column; align-items:flex-start; gap:12px; }
}
@media(max-width:600px){
  .db-hiw-grid { grid-template-columns:1fr; }
  .db-stats-grid { grid-template-columns:1fr; }
  .db-h1 { font-size:2.3rem; }
  .db-foot-grid { grid-template-columns:1fr; }
  .db-cx { padding:0 20px; }
  .db-nav { padding:0 20px; }
  .db-hero { padding:130px 20px 72px; }
}
`;

/* ── Animated mesh canvas ── */
function MeshCanvas() {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext('2d');
    let raf, t = 0;
    const resize = () => { c.width = window.innerWidth; c.height = window.innerHeight; };
    resize(); window.addEventListener('resize', resize);
    // Indigo/navy/green orbs matching DocBox palette
    const pts = [
      {x:0.18,y:0.25,hue:238,r:0.4,s:0.00026},
      {x:0.82,y:0.18,hue:251,r:0.35,s:0.00034},
      {x:0.5,y:0.88,hue:220,r:0.42,s:0.00021},
      {x:0.06,y:0.72,hue:160,r:0.28,s:0.00048},
      {x:0.94,y:0.52,hue:245,r:0.25,s:0.0005},
    ];
    const draw = () => {
      ctx.clearRect(0,0,c.width,c.height);
      pts.forEach(p => {
        const x = (p.x + Math.sin(t*p.s*900+p.hue)*0.08) * c.width;
        const y = (p.y + Math.cos(t*p.s*700+p.hue)*0.07) * c.height;
        const r = p.r * Math.min(c.width, c.height);
        const g = ctx.createRadialGradient(x,y,0,x,y,r);
        g.addColorStop(0, `hsla(${p.hue},75%,62%,0.07)`);
        g.addColorStop(0.5,`hsla(${p.hue},75%,62%,0.018)`);
        g.addColorStop(1, `hsla(${p.hue},75%,62%,0)`);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
      });
      t += 16; raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas id="db-canvas" ref={ref}/>;
}

/* ── Scroll reveal ── */
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.db-rv');
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('db-in'); io.unobserve(e.target); } });
    }, { threshold: 0.1 });
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  });
}

/* ── LogoMark SVG ── */
const LogoMark = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <rect x="4" y="8" width="18" height="22" rx="3" fill="#6366F1" opacity="0.3"/>
    <rect x="7" y="5" width="18" height="22" rx="3" fill="#6366F1" opacity="0.6"/>
    <rect x="10" y="2" width="18" height="22" rx="3" fill="#6366F1"/>
    <rect x="14" y="8" width="9" height="1.8" rx="0.9" fill="white" opacity="0.9"/>
    <rect x="14" y="12" width="7" height="1.8" rx="0.9" fill="white" opacity="0.6"/>
    <rect x="14" y="16" width="8" height="1.8" rx="0.9" fill="white" opacity="0.6"/>
  </svg>
);

/* ── Data ── */
const DOCS = [
  {icon:'🪪',name:'Aadhaar Card',     sub:'Rajesh · Government ID',    badge:'Verified', bc:'db-bok',  bg:'rgba(16,185,129,0.1)'},
  {icon:'🛂',name:"Passport – Priya", sub:'Expires in 47 days ⚠️',   badge:'Expiring', bc:'db-bwarn',bg:'rgba(239,68,68,0.1)'},
  {icon:'💳',name:'PAN Card',         sub:'Permanent Account No.',      badge:'Secure',   bc:'db-bnew', bg:'rgba(99,102,241,0.1)'},
  {icon:'🎓',name:'B.Tech Degree',    sub:'Added 2 days ago',           badge:'New',      bc:'db-binfo',bg:'rgba(245,158,11,0.1)'},
];
const PILLS_RAW = ['🪪 Aadhaar Card','💳 PAN Card','🛂 Passport','🚗 Driving Licence','🗳️ Voter ID','📄 Income Certificate','🏠 Domicile Certificate','👶 Birth Certificate','💍 Marriage Certificate','🎓 Degree Certificate','🏥 Medical Reports','🏘️ Property Docs','🛡️ Insurance Papers','💵 ITR Documents'];
const TESTI = [
  {av:'R',name:'Rajesh Patil',  role:'Tax Dept., Pune Municipal Corp.', c:'#818CF8',bg:'rgba(129,140,248,0.1)',q:'"My daughter\'s admission needed 8 documents in 4 hours. I shared all of them with one DocBox link. Literally saved the admission."'},
  {av:'P',name:'Priya Mehta',   role:'Business Owner, Mumbai',           c:'#10B981',bg:'rgba(16,185,129,0.1)', q:'"6 family members across 3 cities. The permission system is so clean — everyone sees only what they need, nothing more."'},
  {av:'A',name:'Arjun Nair',    role:'Software Engineer, Bangalore',     c:'#34D399',bg:'rgba(52,211,153,0.1)', q:'"Expiry alert came 3 months before my passport expired. Renewed with zero stress. Without DocBox I\'d have completely missed it."'},
];
const FAQS = [
  {q:'Is my Aadhaar data safe?',a:'Yes. AES-256 encryption at rest, TLS 1.3 in transit. We never read or share your documents. DocBox is fully DPDP Act compliant.'},
  {q:'Can family members see all my documents?',a:'No. Every document has individual permission settings — View, Download, or Share. Nobody sees anything you haven\'t explicitly allowed.'},
  {q:'What if I lose my phone?',a:'Nothing is stored on your device. Sign in from any browser and your vault is exactly where you left it.'},
  {q:'Is DocBox DPDP Act compliant?',a:'Yes. India-region servers, full data deletion support, immutable audit log, and zero third-party data sharing.'},
  {q:'Can I use DocBox offline?',a:'Recently accessed documents are cached for offline viewing. Uploading and syncing require an internet connection.'},
];

/* ══════════════════ MAIN COMPONENT ══════════════════ */
export default function LandingPage() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [openFaq, setOpenFaq]   = useState(null);
  useReveal();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 48);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  useEffect(() => {
    const s = document.createElement('style');
    s.textContent = CSS; s.id = 'db-styles';
    document.head.appendChild(s);
    const l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = FONTS; l.id = 'db-fonts';
    document.head.appendChild(l);
    return () => {
      document.getElementById('db-styles')?.remove();
      document.getElementById('db-fonts')?.remove();
    };
  }, []);

  const goto = id => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  const PILLS = [...PILLS_RAW, ...PILLS_RAW];

  return (
    <>
      <MeshCanvas />
      <div className="db-mesh" />
      <div className="db-page">

        {/* ══ NAV ══ */}
        <nav className={`db-nav${scrolled ? ' scrolled' : ''}`}>
          <div className="db-nav-row">
            <div className="db-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <div className="db-logo-mark"><LogoMark size={34} /></div>
              <div>
                <div className="db-logo-text">Doc<span>Box</span></div>
                <div className="db-logo-sub">Document Manager</div>
              </div>
            </div>
            <div className="db-nlinks">
              {[['features','Features'],['how-it-works','How it works'],['docs','Documents'],['testimonials','Reviews'],['faq','FAQ']].map(([id, label]) => (
                <button key={id} className="db-nlink" onClick={() => goto(id)}>{label}</button>
              ))}
            </div>
            <button className="db-nbtn" onClick={() => navigate('/login')}>Sign in</button>
            <button className="db-nbtn2" onClick={() => navigate('/signup')}>Get started →</button>
          </div>
        </nav>

        {/* ══ HERO ══ */}
        <section className="db-hero">
          {[500,800,1100].map((s,i) => (
            <div key={s} className="db-ring" style={{width:s,height:s,opacity:0.4-i*0.1}} />
          ))}
          <div className="db-cx db-hero-inner">
            <div className="db-badge">
              <span className="db-badge-dot">🇮🇳</span>Built for Indian families
            </div>
            <h1 className="db-h1">
              Stop losing documents<br />in <span className="db-grd">WhatsApp groups.</span>
            </h1>
            <p className="db-h-sub">
              One secure vault for every Aadhaar, PAN, passport and certificate your family owns — with smart expiry alerts and one-tap sharing.
            </p>

            <div className="db-capture-wrap">
              <button className="db-cap-btn-solo" onClick={() => navigate('/signup')}>
                Create free vault — no card needed →
              </button>
              <div className="db-h-micro">
                <span><span className="db-hcheck">✦</span> No credit card</span>
                <span><span className="db-hcheck">✦</span> No app download</span>
                <span><span className="db-hcheck">✦</span> Works on any phone</span>
                <span><span className="db-hcheck">✦</span> Free forever plan</span>
              </div>
            </div>

            <div className="db-trow">
              {[['🔒','End-to-end encrypted'],['🇮🇳','India-hosted'],['✅','DPDP compliant'],['⚡','Reads in seconds'],['👨‍👩‍👧‍👦','2,400+ families']].map(([ic,lb]) => (
                <div key={lb} className="db-tp"><span>{ic}</span>{lb}</div>
              ))}
            </div>

            {/* Mockup */}
            <div className="db-mock-wrap">
              <div className="db-mock">
                <div className="db-mbar">
                  <div className="db-mdot" style={{background:'#FF5F57'}}/>
                  <div className="db-mdot" style={{background:'#FEBC2E'}}/>
                  <div className="db-mdot" style={{background:'#28C840'}}/>
                  <span className="db-mtitle">DocBox — Family Vault</span>
                </div>
                <div className="db-msplit">
                  <div className="db-mbody">
                    <div className="db-mshead">
                      <span className="db-mshl">All documents</span>
                      <div className="db-mshr"><div className="db-sdot"/>All synced</div>
                    </div>
                    {DOCS.map(d => (
                      <div key={d.name} className="db-drow">
                        <div className="db-dico" style={{background:d.bg}}>{d.icon}</div>
                        <div style={{flex:1,minWidth:0}}>
                          <div className="db-dn">{d.name}</div>
                          <div className="db-ds">{d.sub}</div>
                        </div>
                        <span className={`db-dbadge ${d.bc}`}>{d.badge}</span>
                      </div>
                    ))}
                    <div className="db-mfoot">
                      <div style={{display:'flex',alignItems:'center',gap:7}}>
                        <div className="db-mavs">
                          {[['#818CF8','rgba(129,140,248,0.12)','R'],['#10B981','rgba(16,185,129,0.12)','P'],['#34D399','rgba(52,211,153,0.12)','A'],['#F59E0B','rgba(245,158,11,0.12)','K']].map(([c,bg,l]) => (
                            <div key={l} className="db-mav" style={{background:bg,color:c}}>{l}</div>
                          ))}
                        </div>
                        <span style={{fontSize:'0.69rem',color:'var(--muted)'}}>4 members</span>
                      </div>
                      <span style={{fontSize:'0.69rem',color:'var(--muted)'}}>↑ Drop to upload</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══ SECURITY STRIP ══ */}
        <div className="db-sstrip db-rv">
          <div className="db-sstrip-in">
            {[['🔒','256-bit AES encryption'],['🛡️','Zero-knowledge architecture'],['🇮🇳','India-region servers'],['📜','DPDP Act compliant'],['🕵️','Immutable audit log']].map(([ic,lb]) => (
              <div key={lb} className="db-sbadge"><span style={{fontSize:'0.92rem'}}>{ic}</span>{lb}</div>
            ))}
          </div>
        </div>

        {/* ══ STATS ══ */}
        <section className="db-stats">
          <div className="db-stats-grid">
            {[['20+','Document types recognised','db-d1'],['2,400+','Families using DocBox','db-d2'],['5 GB','Free family storage','db-d3'],['4+','Indian languages','db-d4']].map(([n,l,d]) => (
              <div key={l} className={`db-sc db-rv ${d}`}>
                <div className="db-sn">{n}</div>
                <div className="db-sl">{l}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ══ FEATURES ══ */}
        <section className="db-fsec" id="features">
          <div className="db-cx">

            {/* 1 — Upload */}
            <div className="db-frow db-rv">
              <div className="db-ftxt">
                <div className="db-slabel">Smart Upload</div>
                <h2 className="db-sh2">Upload any photo,<br /><em>blurry or not</em></h2>
                <p className="db-fdesc">WhatsApp forwards, crumpled scans, phone camera shots at midnight. DocBox OCR reads every field across English, Hindi, Marathi and all major Indian languages — and classifies the document automatically.</p>
                <ul className="db-fbulls">
                  {['Reads blurry, low-res, compressed photos','Detects document type automatically','PDF, JPG, PNG, HEIC, WEBP supported','Available in 4+ Indian languages'].map(b => (
                    <li key={b} className="db-fbull"><span className="db-fbull-ic">✓</span>{b}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="db-fvis">
                  <div className="db-fvh">
                    <div className="db-fvd" style={{background:'#FF5F57'}}/><div className="db-fvd" style={{background:'#FEBC2E'}}/><div className="db-fvd" style={{background:'#28C840'}}/>
                    <span className="db-fvt">DocBox OCR · Processing…</span>
                  </div>
                  <div className="db-fvb">
                    <div style={{border:'2px dashed rgba(99,102,241,0.18)',borderRadius:10,padding:'16px 12px',textAlign:'center',marginBottom:12,background:'rgba(99,102,241,0.04)'}}>
                      <div style={{fontSize:'1.7rem',marginBottom:6}}>📤</div>
                      <div style={{fontSize:'0.78rem',color:'rgba(238,242,255,0.7)',fontWeight:700,marginBottom:3}}>Drop your document here</div>
                      <div style={{fontSize:'0.69rem',color:'var(--muted)'}}>Blurry WhatsApp photos work too</div>
                    </div>
                    {[['Document type','Aadhaar Card ✓'],['Name','Rajesh Kumar Patil'],['Aadhaar No.','•••• •••• 4321'],['Filed under','Rajesh → Govt. IDs']].map(([k,v]) => (
                      <div key={k} className="db-kv">
                        <span className="db-kvk">{k}</span>
                        <span className="db-kvv">{v}</span>
                      </div>
                    ))}
                    <div style={{marginTop:10,padding:'8px 12px',background:'rgba(16,185,129,0.08)',border:'1px solid rgba(16,185,129,0.2)',borderRadius:8,fontSize:'0.74rem',color:'#10B981',fontWeight:700}}>
                      ✓ Extracted and filed in 2.1 seconds
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 2 — Expiry */}
            <div className="db-frow db-flip db-rv">
              <div className="db-ftxt">
                <div className="db-slabel">Expiry Intelligence</div>
                <h2 className="db-sh2">90-day alerts.<br /><em>Never panic again.</em></h2>
                <p className="db-fdesc">DocBox reads expiry dates the moment you upload. You get alerts at 90, 30, and 7 days — enough time to renew without any last-minute scramble.</p>
                <ul className="db-fbulls">
                  {['Auto-detected on upload','Alerts at 90, 30 and 7 days','Passports, licences, visas, certificates','Push + email notifications'].map(b => (
                    <li key={b} className="db-fbull"><span className="db-fbull-ic">✓</span>{b}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="db-fvis">
                  <div className="db-fvh">
                    <div className="db-fvd" style={{background:'#FF5F57'}}/><div className="db-fvd" style={{background:'#FEBC2E'}}/><div className="db-fvd" style={{background:'#28C840'}}/>
                    <span className="db-fvt">Expiry tracker</span>
                  </div>
                  <div className="db-fvb">
                    {[
                      {icon:'🛂',name:"Priya's Passport",days:47,  pct:15, c:'#EF4444',gs:'rgba(239,68,68,0.3)'},
                      {icon:'🚗',name:'Driving Licence',  days:120, pct:45, c:'#F59E0B',gs:'rgba(245,158,11,0.3)'},
                      {icon:'🛡️',name:'Health Insurance', days:290, pct:80, c:'#10B981',gs:'rgba(16,185,129,0.3)'},
                      {icon:'🪪',name:'Aadhaar Card',     days:'Permanent',pct:100,c:'#6366F1',gs:'rgba(99,102,241,0.3)'},
                    ].map(d => (
                      <div key={d.name} className="db-er">
                        <div className="db-erl">
                          <span style={{fontSize:'0.86rem'}}>{d.icon}</span>
                          <div>
                            <div style={{fontSize:'0.78rem',fontWeight:700,color:'#F1F5F9'}}>{d.name}</div>
                            <div style={{fontSize:'0.67rem',color:'var(--muted)'}}>{typeof d.days==='number'?`${d.days} days left`:d.days}</div>
                          </div>
                        </div>
                        <div className="db-erbar-w"><div className="db-erbar" style={{width:`${d.pct}%`,background:d.c,boxShadow:`0 0 6px ${d.gs}`}}/></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 3 — Access */}
            <div className="db-frow db-rv">
              <div className="db-ftxt">
                <div className="db-slabel">Access Control</div>
                <h2 className="db-sh2">You decide<br /><em>who sees what.</em></h2>
                <p className="db-fdesc">View, Download, or Share — set permissions per document. Each family member sees exactly what you've allowed, nothing more.</p>
                <ul className="db-fbulls">
                  {['Per-document permission settings','View / Download / Share / No access','Instant permission changes','Complete audit trail of every access'].map(b => (
                    <li key={b} className="db-fbull"><span className="db-fbull-ic">✓</span>{b}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="db-fvis">
                  <div className="db-fvh">
                    <div className="db-fvd" style={{background:'#FF5F57'}}/><div className="db-fvd" style={{background:'#FEBC2E'}}/><div className="db-fvd" style={{background:'#28C840'}}/>
                    <span className="db-fvt">Access settings · Aadhaar Card</span>
                  </div>
                  <div className="db-fvb">
                    {[
                      {av:'P',c:'#10B981',bg:'rgba(16,185,129,0.1)', n:'Priya',rel:'Spouse',   perm:'View + Download',pc:'rgba(16,185,129,0.12)', pcl:'#10B981'},
                      {av:'A',c:'#818CF8',bg:'rgba(129,140,248,0.1)',n:'Arjun',rel:'Son',      perm:'View only',       pc:'rgba(99,102,241,0.12)', pcl:'#818CF8'},
                      {av:'K',c:'#818CF8',bg:'rgba(129,140,248,0.1)',n:'Kavya',rel:'Daughter', perm:'View only',       pc:'rgba(99,102,241,0.12)', pcl:'#818CF8'},
                      {av:'M',c:'#EF4444',bg:'rgba(239,68,68,0.1)',  n:'Mom',  rel:'Parent',   perm:'No access',       pc:'rgba(239,68,68,0.1)',   pcl:'#EF4444'},
                    ].map(r => (
                      <div key={r.n} className="db-acrow">
                        <div className="db-acp">
                          <div className="db-acav" style={{background:r.bg,color:r.c}}>{r.av}</div>
                          <div>
                            <div style={{fontSize:'0.78rem',fontWeight:700,color:'#F1F5F9'}}>{r.n}</div>
                            <div style={{fontSize:'0.67rem',color:'var(--muted)'}}>{r.rel}</div>
                          </div>
                        </div>
                        <span style={{fontSize:'0.67rem',fontWeight:800,padding:'3px 9px',borderRadius:100,background:r.pc,color:r.pcl}}>{r.perm}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 4 — Share */}
            <div className="db-frow db-flip db-rv">
              <div className="db-ftxt">
                <div className="db-slabel">Instant Sharing</div>
                <h2 className="db-sh2">One link.<br /><em>No login needed.</em></h2>
                <p className="db-fdesc">Generate time-limited share links in one tap. The recipient needs no DocBox account — perfect for college admissions, government portals, bank KYC, and visa applications.</p>
                <ul className="db-fbulls">
                  {['Time-limited links (1hr to 7 days)','No recipient login required','Built for government portals & banks','One-time-view option'].map(b => (
                    <li key={b} className="db-fbull"><span className="db-fbull-ic">✓</span>{b}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="db-fvis">
                  <div className="db-fvh">
                    <div className="db-fvd" style={{background:'#FF5F57'}}/><div className="db-fvd" style={{background:'#FEBC2E'}}/><div className="db-fvd" style={{background:'#28C840'}}/>
                    <span className="db-fvt">Share · B.Tech Degree.pdf</span>
                  </div>
                  <div className="db-fvb">
                    <div className="db-shbox">
                      <div style={{fontSize:'0.74rem',color:'var(--muted)',fontWeight:600,marginBottom:8}}>Share link generated ✓</div>
                      <div className="db-shlink">
                        <span className="db-shlt">docbox.app/s/xK8mP2...</span>
                        <button className="db-shcopy">Copy</button>
                      </div>
                      <div><span className="db-shtag">⏱ Expires in 24h</span><span className="db-shtag">👁 View only</span><span className="db-shtag">🔒 No login</span></div>
                    </div>
                    <div style={{display:'flex',gap:6}}>
                      {['WhatsApp','Email','Copy link'].map(a => (
                        <div key={a} style={{flex:1,padding:'7px',background:'rgba(99,102,241,0.06)',border:'1px solid rgba(99,102,241,0.14)',borderRadius:8,fontSize:'0.72rem',fontWeight:700,color:'var(--indigo3)',textAlign:'center',cursor:'pointer'}}>{a}</div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══ HOW IT WORKS ══ */}
        <section className="db-hiw" id="how-it-works">
          <div className="db-hiw-in">
            <div className="db-hiw-top db-rv">
              <div className="db-slabel">Simple process</div>
              <h2 className="db-sh2" style={{maxWidth:480,margin:'0 auto 12px'}}>From chaos to organised<br />in 60 seconds</h2>
              <p className="db-sp" style={{margin:'0 auto',textAlign:'center'}}>Four steps. That's all it takes to go from a drawer full of documents to a perfectly organised family vault.</p>
            </div>
            <div className="db-hiw-grid">
              {[
                {num:'01',icon:'📤',title:'Upload once',       desc:'Any photo or PDF. Works with phone shots, WhatsApp forwards, and scanned docs.'},
                {num:'02',icon:'⚡',title:'Auto-organised',    desc:'OCR extracts every field, detects the type, and files it under the right member instantly.'},
                {num:'03',icon:'🔑',title:'Set permissions',  desc:'Choose exactly which family members can access, share, or download each document.'},
                {num:'04',icon:'🔍',title:'Find it in 3s',    desc:'Search by name, type, or member. Any document, any device, anywhere.'},
              ].map((s,i) => (
                <div key={s.num} className={`db-hcard db-rv db-d${i+1}`}>
                  <div className="db-hnum">{s.num}</div>
                  <div className="db-hico">{s.icon}</div>
                  <div className="db-htitle">{s.title}</div>
                  <div className="db-hdesc">{s.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══ MARQUEE ══ */}
        <section className="db-mqs" id="docs">
          <div className="db-mqs-in">
            <div className="db-mq-lbl db-rv">20+ document types · recognised automatically</div>
            <div className="db-mq-outer">
              <div className="db-mtrack">
                {PILLS.map((p,i) => <div key={i} className="db-mpill">{p}</div>)}
              </div>
            </div>
          </div>
        </section>

        {/* ══ TESTIMONIALS ══ */}
        <section className="db-ts" id="testimonials">
          <div className="db-cx">
            <div className="db-ts-hd db-rv">
              <div className="db-slabel">Real families</div>
              <h2 className="db-sh2" style={{maxWidth:440,margin:'0 auto 12px'}}>Trusted across India</h2>
            </div>
            <div className="db-rline db-rv">
              <span className="db-rstars">★★★★★</span>
              <span>4.8 · 847 families reviewed</span>
            </div>
            <div className="db-tg">
              {TESTI.map((t,i) => (
                <div key={t.name} className={`db-tcard db-rv db-d${i+1}`}>
                  <div className="db-tcst">★★★★★</div>
                  <p className="db-tcq">{t.q}</p>
                  <div className="db-tcp">
                    <div className="db-tcav" style={{background:t.bg,color:t.c}}>{t.av}</div>
                    <div><div className="db-tcn">{t.name}</div><div className="db-tcr">{t.role}</div></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══ FAQ ══ */}
        <section className="db-fqs" id="faq">
          <div className="db-fq-in">
            <div className="db-fq-hd db-rv">
              <div className="db-slabel">Questions</div>
              <h2 className="db-sh2" style={{maxWidth:400,margin:'0 auto'}}>Frequently asked</h2>
            </div>
            {FAQS.map((f,i) => (
              <div key={i} className="db-fqitem db-rv">
                <div className="db-fqq" onClick={() => setOpenFaq(openFaq===i ? null : i)}>
                  <span className="db-fqqt">{f.q}</span>
                  <span className={`db-fqic${openFaq===i?' db-op':''}`}>+</span>
                </div>
                <div className={`db-fqa${openFaq===i?' db-op':''}`}>
                  <p className="db-fqat">{f.a}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ══ CTA ══ */}
        <section className="db-ctas">
          <div className="db-ctabox db-rv">
            <h2 className="db-ctah">Your family deserves better<br />than a <em>WhatsApp group.</em></h2>
            <p className="db-ctap">Join 2,400+ Indian families who find every document they need, exactly when they need it.</p>
            <div className="db-ctabtns">
              <button className="db-ctab1" onClick={() => navigate('/signup')}>
                Create free vault — no card needed →
              </button>
              <button className="db-ctab2" onClick={() => goto('how-it-works')}>
                See how it works
              </button>
            </div>
          </div>
        </section>

        {/* ══ FOOTER ══ */}
        <footer className="db-foot">
          <div className="db-foot-grid">
            <div className="db-foot-brand">
              <div className="db-logo" style={{pointerEvents:'none'}}>
                <div className="db-logo-mark"><LogoMark size={28} /></div>
                <div className="db-logo-text">Doc<span>Box</span></div>
              </div>
              <p>Secure document management built for every Indian family. Every document, one vault, always at hand.</p>
            </div>
            <div>
              <div className="db-fct">Product</div>
              {['Features','How it works','Document types','Security','Changelog'].map(l => (
                <button key={l} className="db-fl">{l}</button>
              ))}
            </div>
            <div>
              <div className="db-fct">Company</div>
              {['About','Blog','Careers','Press','Contact us'].map(l => (
                <button key={l} className="db-fl">{l}</button>
              ))}
            </div>
            <div>
              <div className="db-fct">Legal</div>
              {['Privacy Policy','Terms of Service','DPDP Compliance','Cookie Policy'].map(l => (
                <button key={l} className="db-fl">{l}</button>
              ))}
            </div>
          </div>
          <div className="db-foot-bot">
            <span className="db-fcopy">© {new Date().getFullYear()} DocBox · Secure family document management for India</span>
            <div style={{display:'flex',gap:16}}>
              {['Privacy','Terms','Support'].map(l => (
                <button key={l} className="db-fl" style={{marginBottom:0}}>{l}</button>
              ))}
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}