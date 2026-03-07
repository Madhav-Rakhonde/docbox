import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

/* ── Google Fonts ── */
const FONTS = `https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,700;0,9..144,900;1,9..144,700&family=DM+Sans:wght@400;500;600;700;800&display=swap`;

/* ── CSS ── */
const CSS = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; overflow-x: hidden; }

:root {
  --bg:    #060810;
  --bg2:   #0C0F1A;
  --bg3:   #121520;
  --bg4:   #181C2C;
  --edge:  rgba(255,255,255,0.06);
  --edge2: rgba(255,255,255,0.10);
  --edge3: rgba(255,255,255,0.18);
  --blue:  #4F7EFF;
  --blue2: #7BA3FF;
  --blue3: rgba(79,126,255,0.12);
  --teal:  #00E5C3;
  --teal2: rgba(0,229,195,0.1);
  --amber: #FFB547;
  --rose:  #FF6B8A;
  --jade:  #22D3A0;
  --snow:  #EEF2FF;
  --snow2: rgba(238,242,255,0.65);
  --snow3: rgba(238,242,255,0.35);
  --snow4: rgba(238,242,255,0.12);
}

body {
  background: var(--bg);
  color: var(--snow);
  font-family: 'DM Sans', sans-serif;
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
}

/* noise overlay */
body::after {
  content:''; position:fixed; inset:0; z-index:9999; pointer-events:none;
  background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.028'/%3E%3C/svg%3E");
  opacity:0.5;
}

#lb-mesh { position:fixed; inset:0; z-index:0; pointer-events:none; }
.lb-page { position:relative; z-index:1; }
.lb-cx { max-width:1140px; margin:0 auto; padding:0 32px; }

/* ─── NAV ─── */
.lb-nav {
  position:fixed; top:0; left:0; right:0; z-index:200;
  padding:0 32px;
  transition: background 0.4s, border-color 0.4s, backdrop-filter 0.4s;
}
.lb-nav.scrolled {
  background: rgba(6,8,16,0.88);
  backdrop-filter: blur(24px) saturate(180%);
  border-bottom: 1px solid var(--edge2);
}
.lb-nav-row {
  max-width:1140px; margin:0 auto;
  display:flex; align-items:center; height:68px; gap:8px;
}
.lb-logo {
  display:flex; align-items:center; gap:11px;
  font-weight:800; font-size:1.18rem;
  color:var(--snow); text-decoration:none;
  margin-right:auto; letter-spacing:-0.03em;
  cursor: pointer;
}
.lb-logo-gem {
  width:36px; height:36px; border-radius:10px;
  background:linear-gradient(135deg,#4F7EFF,#00E5C3);
  display:flex; align-items:center; justify-content:center;
  font-size:1rem;
  box-shadow: 0 0 24px rgba(79,126,255,0.45), 0 0 48px rgba(0,229,195,0.12);
}
.lb-nlinks { display:flex; gap:4px; }
.lb-nlink {
  background:none; border:none; cursor:pointer;
  font-family:'DM Sans',sans-serif; font-size:0.875rem; font-weight:600;
  color:var(--snow3); padding:7px 14px; border-radius:8px;
  transition:color 0.2s, background 0.2s;
}
.lb-nlink:hover { color:var(--snow); background:var(--snow4); }
.lb-nbtn {
  background:none; border:1px solid var(--edge2);
  color:var(--snow2); font-family:'DM Sans',sans-serif;
  font-size:0.875rem; font-weight:700;
  padding:8px 20px; border-radius:9px; cursor:pointer;
  transition:all 0.2s;
}
.lb-nbtn:hover { border-color:var(--blue2); color:var(--blue2); }
.lb-nbtn2 {
  background:linear-gradient(135deg,var(--blue),#3558D6); border:none; color:#fff;
  font-family:'DM Sans',sans-serif; font-size:0.875rem; font-weight:800;
  padding:9px 22px; border-radius:9px; cursor:pointer;
  transition:all 0.25s; margin-left:8px;
  box-shadow:0 4px 20px rgba(79,126,255,0.35);
}
.lb-nbtn2:hover { transform:translateY(-2px); box-shadow:0 10px 32px rgba(79,126,255,0.5); }

/* ─── HERO ─── */
.lb-hero {
  padding: 140px 32px 80px;
  text-align:center;
  position:relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
}
.lb-hero-inner {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.lb-hring {
  position:absolute; border-radius:50%;
  border:1px solid rgba(79,126,255,0.05);
  pointer-events:none;
  left:50%; top:50%; transform:translate(-50%,-50%);
}
.lb-h-badge {
  display:inline-flex; align-items:center; gap:8px;
  background:linear-gradient(135deg,rgba(79,126,255,0.1),rgba(0,229,195,0.06));
  border:1px solid rgba(79,126,255,0.2); border-radius:100px;
  padding:6px 16px 6px 10px; margin-bottom:28px;
  font-size:0.75rem; font-weight:800; letter-spacing:0.06em;
  text-transform:uppercase; color:var(--blue2);
  opacity:0; animation: lb-up 0.7s 0.05s cubic-bezier(0.16,1,0.3,1) forwards;
}
.lb-h-badge-dot {
  width:22px; height:22px; border-radius:6px;
  background:linear-gradient(135deg,var(--blue),var(--teal));
  display:flex; align-items:center; justify-content:center; font-size:0.7rem;
}
.lb-h1 {
  font-family:'Fraunces',serif; font-weight:900;
  font-size:clamp(2.8rem,5.5vw,5.2rem);
  line-height:1.04; letter-spacing:-0.03em;
  color:var(--snow); max-width:800px; margin:0 auto 22px;
  opacity:0; animation: lb-up 0.7s 0.15s cubic-bezier(0.16,1,0.3,1) forwards;
}
.lb-h1 .lb-grd {
  font-style:italic; font-weight:700;
  background:linear-gradient(90deg,var(--blue) 0%,var(--teal) 55%,var(--amber) 100%);
  background-size:200% auto;
  -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
  animation: lb-shimmer 5s linear infinite;
}
.lb-h-sub {
  font-size:1.05rem; line-height:1.8; color:var(--snow2);
  max-width:520px; margin:0 auto 36px; font-weight:400;
  opacity:0; animation: lb-up 0.7s 0.25s cubic-bezier(0.16,1,0.3,1) forwards;
}
.lb-capture-wrap {
  opacity:0; animation: lb-up 0.7s 0.32s cubic-bezier(0.16,1,0.3,1) forwards;
  display:flex; flex-direction:column; align-items:center; gap:12px; width:100%;
}
.lb-capture {
  display:flex; background:var(--bg3);
  border:1px solid var(--edge2); border-radius:14px; overflow:hidden;
  box-shadow:0 20px 60px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.03) inset;
  max-width: 460px; width: 100%;
}
.lb-cap-in {
  background:none; border:none; outline:none;
  font-family:'DM Sans',sans-serif; font-size:0.95rem; color:var(--snow);
  padding:14px 20px; flex:1; min-width:0;
}
.lb-cap-in::placeholder { color:var(--snow3); }
.lb-cap-btn {
  background:linear-gradient(135deg,var(--blue),#3558D6); border:none; color:#fff;
  font-family:'DM Sans',sans-serif; font-size:0.88rem; font-weight:800;
  padding:14px 22px; cursor:pointer; transition:background 0.25s; white-space:nowrap;
  flex-shrink:0;
}
.lb-cap-btn:hover { background:linear-gradient(135deg,var(--blue2),var(--blue)); }
.lb-h-micro {
  font-size:0.78rem; color:var(--snow3);
  display:flex; align-items:center; justify-content:center; gap:18px; flex-wrap:wrap;
}
.lb-h-micro .lb-check { color:var(--jade); margin-right:3px; }
.lb-trow {
  display:flex; align-items:center; justify-content:center;
  gap:8px; flex-wrap:wrap; margin-top:40px; margin-bottom:60px;
  opacity:0; animation: lb-up 0.7s 0.44s cubic-bezier(0.16,1,0.3,1) forwards;
}
.lb-tp {
  display:flex; align-items:center; gap:7px;
  background:var(--bg3); border:1px solid var(--edge2); border-radius:100px;
  padding:7px 14px; font-size:0.77rem; font-weight:600; color:var(--snow3);
}

/* MOCKUP */
.lb-mock-wrap {
  max-width:680px; width:100%; margin:0 auto; position:relative;
  opacity:0; animation: lb-up 0.9s 0.55s cubic-bezier(0.16,1,0.3,1) forwards;
}
.lb-mock-wrap::before {
  content:''; position:absolute; bottom:-40px; left:50%;
  transform:translateX(-50%); width:75%; height:60px;
  background:radial-gradient(ellipse,rgba(79,126,255,0.18) 0%,transparent 70%);
  pointer-events:none; filter:blur(18px);
}
.lb-mock {
  background:var(--bg2); border:1px solid var(--edge2); border-radius:20px;
  overflow:hidden;
  box-shadow:0 50px 100px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04) inset;
  animation: lb-float 7s ease-in-out infinite;
}
.lb-mbar {
  background:var(--bg3); border-bottom:1px solid var(--edge);
  padding:13px 18px; display:flex; align-items:center; gap:8px;
}
.lb-mdot { width:10px; height:10px; border-radius:50%; }
.lb-mtitle { flex:1; text-align:center; font-size:0.76rem; color:var(--snow3); font-weight:600; }
.lb-mbody { padding:18px; }
.lb-mshead { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
.lb-mshl { font-size:0.86rem; font-weight:800; color:var(--snow); }
.lb-mshr { display:flex; align-items:center; gap:6px; font-size:0.72rem; color:var(--snow3); }
.lb-sdot { width:6px; height:6px; border-radius:50%; background:var(--jade); }
.lb-drow {
  display:flex; align-items:center; gap:11px; padding:11px 12px;
  border-radius:11px; background:var(--bg3); border:1px solid var(--edge);
  margin-bottom:8px; transition:border-color 0.2s, transform 0.2s;
}
.lb-drow:hover { border-color:rgba(79,126,255,0.25); transform:translateX(3px); }
.lb-drow:last-child { margin-bottom:0; }
.lb-dico { width:34px; height:34px; border-radius:9px; display:flex; align-items:center; justify-content:center; font-size:0.9rem; flex-shrink:0; }
.lb-dn { font-size:0.82rem; font-weight:700; color:var(--snow); }
.lb-ds { font-size:0.68rem; color:var(--snow3); margin-top:1px; }
.lb-dbadge { margin-left:auto; font-size:0.64rem; font-weight:800; padding:3px 9px; border-radius:100px; white-space:nowrap; }
.lb-bok   { background:rgba(34,211,160,0.12); color:#22D3A0; }
.lb-bwarn { background:rgba(255,107,138,0.12); color:#FF6B8A; }
.lb-bnew  { background:rgba(0,229,195,0.12);   color:#00E5C3; }
.lb-binfo { background:rgba(255,181,71,0.12);  color:#FFB547; }
.lb-mfoot {
  padding:13px 18px; border-top:1px solid var(--edge);
  display:flex; align-items:center; justify-content:space-between;
}
.lb-mavs { display:flex; }
.lb-mav {
  width:26px; height:26px; border-radius:50%; border:2px solid var(--bg2);
  display:flex; align-items:center; justify-content:center;
  font-size:0.56rem; font-weight:900; margin-left:-7px;
}
.lb-mav:first-child { margin-left:0; }

/* floating chips */
.lb-chip {
  position:absolute; background:rgba(6,8,16,0.9); backdrop-filter:blur(20px);
  border:1px solid var(--edge2); border-radius:14px; padding:10px 14px;
  display:flex; align-items:center; gap:9px;
  box-shadow:0 12px 36px rgba(0,0,0,0.45);
  font-size:0.78rem; font-weight:700; color:var(--snow); white-space:nowrap;
  pointer-events:none;
}
.lb-chip1 { top:22px; right:-20px; animation: lb-ch1 5s ease-in-out infinite; }
.lb-chip2 { bottom:72px; left:-20px; animation: lb-ch2 6s ease-in-out infinite; }

/* ─── SECURITY STRIP ─── */
.lb-sstrip {
  background:var(--bg2);
  border-top:1px solid var(--edge); border-bottom:1px solid var(--edge);
  padding:20px 32px;
}
.lb-sstrip-in {
  max-width:1140px; margin:0 auto;
  display:flex; align-items:center; justify-content:center; gap:28px; flex-wrap:wrap;
}
.lb-sbadge {
  display:flex; align-items:center; gap:8px;
  font-size:0.78rem; font-weight:700; color:var(--snow3);
}

/* ─── STATS ─── */
.lb-stats { padding:72px 32px; }
.lb-sring {
  max-width:1140px; margin:0 auto;
  display:grid; grid-template-columns:repeat(4,1fr);
  border-radius:20px; overflow:hidden;
  border:1px solid var(--edge2);
  background:linear-gradient(135deg,var(--bg2),var(--bg3));
  box-shadow:0 24px 80px rgba(0,0,0,0.3);
}
.lb-sc {
  padding:36px 24px; text-align:center; border-right:1px solid var(--edge);
  position:relative; overflow:hidden;
}
.lb-sc:last-child { border-right:none; }
.lb-sc::before {
  content:''; position:absolute; top:0; left:50%; transform:translateX(-50%);
  width:60%; height:2px;
  background:linear-gradient(90deg,transparent,var(--blue),transparent);
  opacity:0; transition:opacity 0.3s;
}
.lb-sc:hover::before { opacity:1; }
.lb-sn {
  font-family:'Fraunces',serif; font-weight:900;
  font-size:2.8rem; line-height:1; letter-spacing:-0.04em;
  background:linear-gradient(135deg,var(--snow) 30%,var(--blue2));
  -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
  margin-bottom:6px;
}
.lb-sl { font-size:0.8rem; color:var(--snow3); font-weight:600; }

/* ─── SECTION LABELS ─── */
.lb-slabel {
  display:inline-block; font-size:0.68rem; font-weight:800;
  letter-spacing:0.16em; text-transform:uppercase; color:var(--teal); margin-bottom:14px;
}
.lb-sh2 {
  font-family:'Fraunces',serif; font-weight:900;
  font-size:clamp(2rem,3.5vw,3rem); line-height:1.1;
  letter-spacing:-0.03em; color:var(--snow); margin-bottom:14px;
}
.lb-sh2 em { font-style:italic; color:var(--blue2); }
.lb-sp { font-size:0.93rem; line-height:1.8; color:var(--snow2); max-width:480px; }

/* ─── FEATURES ─── */
.lb-fsec { padding:96px 32px; }
.lb-frow {
  display:grid; grid-template-columns:1fr 1fr;
  gap:60px; align-items:center; margin-bottom:88px;
}
.lb-frow:last-child { margin-bottom:0; }
.lb-frow.lb-flip { direction:rtl; }
.lb-frow.lb-flip > * { direction:ltr; }
.lb-ftxt .lb-sh2 { font-size:clamp(1.7rem,2.8vw,2.4rem); margin-bottom:12px; }
.lb-fdesc { font-size:0.92rem; line-height:1.82; color:var(--snow2); margin-bottom:24px; }
.lb-fbulls { list-style:none; display:flex; flex-direction:column; gap:9px; }
.lb-fbull {
  display:flex; align-items:flex-start; gap:10px;
  font-size:0.86rem; color:var(--snow2); line-height:1.6;
}
.lb-fbull-ic {
  width:19px; height:19px; border-radius:5px; flex-shrink:0;
  display:flex; align-items:center; justify-content:center;
  font-size:0.65rem; margin-top:2px;
  background:linear-gradient(135deg,var(--blue3),rgba(0,229,195,0.1)); color:var(--teal);
}
.lb-fvis {
  border-radius:18px; overflow:hidden;
  border:1px solid var(--edge2);
  box-shadow:0 28px 72px rgba(0,0,0,0.4);
  transition:transform 0.4s cubic-bezier(0.16,1,0.3,1);
}
.lb-fvis:hover { transform:translateY(-5px) rotate(-0.3deg); }
.lb-fvh {
  background:var(--bg3); padding:13px 17px;
  border-bottom:1px solid var(--edge);
  display:flex; align-items:center; gap:8px;
}
.lb-fvd { width:9px; height:9px; border-radius:50%; }
.lb-fvt { font-size:0.74rem; color:var(--snow3); font-weight:600; margin-left:4px; }
.lb-fvb { background:var(--bg2); padding:18px; }

/* expiry rows */
.lb-er {
  display:flex; align-items:center; justify-content:space-between;
  padding:11px 13px; border-radius:11px;
  background:var(--bg3); border:1px solid var(--edge); margin-bottom:7px;
}
.lb-erl { display:flex; align-items:center; gap:9px; }
.lb-erbar-w { flex:1; margin:0 12px; height:4px; background:var(--bg4); border-radius:2px; overflow:hidden; }
.lb-erbar { height:100%; border-radius:2px; }

/* access rows */
.lb-acrow {
  display:flex; align-items:center; justify-content:space-between;
  padding:11px 13px; border-radius:11px;
  background:var(--bg3); border:1px solid var(--edge); margin-bottom:7px;
}
.lb-acp { display:flex; align-items:center; gap:9px; }
.lb-acav { width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:0.68rem; font-weight:800; }

/* share box */
.lb-shbox { background:var(--bg3); border:1px solid var(--edge); border-radius:11px; padding:13px; margin-bottom:11px; }
.lb-shlink { display:flex; align-items:center; gap:9px; background:var(--bg4); border:1px solid var(--edge2); border-radius:8px; padding:9px 11px; margin-bottom:9px; }
.lb-shlt { flex:1; font-size:0.73rem; color:var(--blue2); font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.lb-shcopy { background:var(--blue); color:#fff; border:none; font-size:0.7rem; font-weight:800; padding:5px 11px; border-radius:5px; cursor:pointer; font-family:'DM Sans',sans-serif; }
.lb-shtag { font-size:0.7rem; font-weight:700; padding:3px 9px; border-radius:5px; background:rgba(255,255,255,0.05); color:var(--snow3); border:1px solid var(--edge); margin-right:6px; display:inline-block; margin-bottom:4px; }

/* ─── HOW IT WORKS ─── */
.lb-hiw {
  padding:96px 32px;
  background:var(--bg2);
  border-top:1px solid var(--edge); border-bottom:1px solid var(--edge);
}
.lb-hiw-in { max-width:1140px; margin:0 auto; }
.lb-hiw-top { text-align:center; margin-bottom:56px; }
.lb-hiw-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:18px; }
.lb-hcard {
  background:var(--bg3); border:1px solid var(--edge2);
  border-radius:16px; padding:26px 22px; position:relative; overflow:hidden;
  transition:transform 0.3s, border-color 0.3s;
}
.lb-hcard:hover { transform:translateY(-5px); border-color:rgba(79,126,255,0.3); }
.lb-hnum {
  font-family:'Fraunces',serif; font-size:3.2rem; font-weight:900;
  line-height:1; letter-spacing:-0.05em;
  color:rgba(79,126,255,0.08); margin-bottom:18px;
  -webkit-text-stroke:1px rgba(79,126,255,0.15);
}
.lb-hico { font-size:1.7rem; margin-bottom:12px; }
.lb-htitle { font-weight:800; font-size:0.93rem; color:var(--snow); margin-bottom:7px; }
.lb-hdesc { font-size:0.8rem; line-height:1.7; color:var(--snow2); }

/* ─── MARQUEE ─── */
.lb-mqs { padding:64px 0; overflow:hidden; }
.lb-mqs-in { max-width:1140px; margin:0 auto; padding:0 32px; }
.lb-mq-lbl { text-align:center; font-size:0.68rem; font-weight:800; letter-spacing:0.16em; text-transform:uppercase; color:var(--snow3); margin-bottom:24px; }
.lb-mq-outer { overflow:hidden; mask-image:linear-gradient(90deg,transparent,black 8%,black 92%,transparent); }
.lb-mtrack { display:flex; gap:9px; width:max-content; animation: lb-mq 32s linear infinite; }
.lb-mtrack:hover { animation-play-state:paused; }
.lb-mpill {
  display:flex; align-items:center; gap:7px;
  background:var(--bg3); border:1px solid var(--edge2); border-radius:100px;
  padding:8px 16px; font-size:0.82rem; font-weight:600; color:var(--snow2);
  white-space:nowrap; transition:all 0.2s; cursor:default;
}
.lb-mpill:hover { border-color:rgba(79,126,255,0.4); color:var(--snow); }

/* ─── TESTIMONIALS ─── */
.lb-ts { padding:96px 32px; }
.lb-ts-hd { text-align:center; margin-bottom:14px; }
.lb-rline { display:flex; align-items:center; justify-content:center; gap:10px; margin-bottom:48px; font-size:0.86rem; color:var(--snow2); }
.lb-rstars { color:var(--amber); font-size:0.95rem; letter-spacing:2px; }
.lb-tg { display:grid; grid-template-columns:repeat(3,1fr); gap:18px; }
.lb-tcard {
  background:var(--bg2); border:1px solid var(--edge);
  border-radius:18px; padding:26px 24px;
  position:relative; overflow:hidden;
  transition:transform 0.35s cubic-bezier(0.16,1,0.3,1), border-color 0.35s;
}
.lb-tcard::after { content:''; position:absolute; top:0; left:0; right:0; height:1px; background:linear-gradient(90deg,transparent,rgba(79,126,255,0.5),transparent); opacity:0; transition:opacity 0.35s; }
.lb-tcard:hover { transform:translateY(-7px); border-color:rgba(79,126,255,0.2); }
.lb-tcard:hover::after { opacity:1; }
.lb-tcst { color:var(--amber); font-size:0.78rem; letter-spacing:3px; margin-bottom:12px; }
.lb-tcq { font-size:0.88rem; line-height:1.78; color:var(--snow2); font-style:italic; margin-bottom:20px; }
.lb-tcp { display:flex; align-items:center; gap:11px; }
.lb-tcav { width:38px; height:38px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:0.88rem; flex-shrink:0; }
.lb-tcn { font-weight:800; font-size:0.86rem; color:var(--snow); }
.lb-tcr { font-size:0.72rem; color:var(--snow3); margin-top:2px; }

/* ─── FAQ ─── */
.lb-fqs {
  padding:96px 32px;
  background:var(--bg2);
  border-top:1px solid var(--edge);
}
.lb-fq-in { max-width:700px; margin:0 auto; }
.lb-fq-hd { text-align:center; margin-bottom:48px; }
.lb-fqitem { border-bottom:1px solid var(--edge); }
.lb-fqq { display:flex; align-items:center; justify-content:space-between; cursor:pointer; padding:20px 0; gap:14px; }
.lb-fqqt { font-weight:700; font-size:0.93rem; color:var(--snow); }
.lb-fqic { width:26px; height:26px; border-radius:7px; background:var(--bg4); border:1px solid var(--edge2); display:flex; align-items:center; justify-content:center; font-size:0.88rem; color:var(--snow3); transition:all 0.25s; flex-shrink:0; }
.lb-fqic.lb-op { background:var(--blue3); border-color:rgba(79,126,255,0.3); color:var(--blue2); transform:rotate(45deg); }
.lb-fqa { overflow:hidden; max-height:0; transition:max-height 0.38s ease, padding 0.38s; }
.lb-fqa.lb-op { max-height:200px; padding-bottom:18px; }
.lb-fqat { font-size:0.86rem; line-height:1.8; color:var(--snow2); }

/* ─── CTA ─── */
.lb-ctas { padding:72px 32px 96px; }
.lb-ctabox {
  max-width:1140px; margin:0 auto; border-radius:24px;
  padding:80px 48px; text-align:center; position:relative; overflow:hidden;
  background:linear-gradient(145deg,var(--bg3) 0%,#0F1222 50%,var(--bg3) 100%);
  border:1px solid rgba(79,126,255,0.16);
  box-shadow:0 0 0 1px rgba(255,255,255,0.03) inset, 0 40px 100px rgba(0,0,0,0.4);
}
.lb-ctabox::before { content:''; position:absolute; top:-80px; left:50%; transform:translateX(-50%); width:600px; height:350px; pointer-events:none; background:radial-gradient(ellipse,rgba(79,126,255,0.12) 0%,rgba(0,229,195,0.04) 50%,transparent 70%); }
.lb-ctah {
  font-family:'Fraunces',serif; font-weight:900;
  font-size:clamp(2rem,4vw,3.6rem);
  line-height:1.06; letter-spacing:-0.03em; color:var(--snow);
  max-width:600px; margin:0 auto 18px; position:relative; z-index:1;
}
.lb-ctah em { font-style:italic; background:linear-gradient(90deg,var(--blue2),var(--teal)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
.lb-ctap { font-size:0.98rem; color:var(--snow2); max-width:420px; margin:0 auto 36px; line-height:1.75; position:relative; z-index:1; }
.lb-ctabtns { display:flex; gap:12px; justify-content:center; flex-wrap:wrap; position:relative; z-index:1; }
.lb-ctab1 { background:linear-gradient(135deg,var(--blue),#3558D6); border:none; color:#fff; font-family:'DM Sans',sans-serif; font-size:0.98rem; font-weight:800; padding:14px 32px; border-radius:11px; cursor:pointer; transition:all 0.25s; box-shadow:0 8px 28px rgba(79,126,255,0.4); }
.lb-ctab1:hover { transform:translateY(-3px); box-shadow:0 16px 44px rgba(79,126,255,0.5); }
.lb-ctab2 { background:rgba(255,255,255,0.04); border:1px solid var(--edge2); color:var(--snow); font-family:'DM Sans',sans-serif; font-size:0.98rem; font-weight:700; padding:13px 28px; border-radius:11px; cursor:pointer; transition:all 0.25s; }
.lb-ctab2:hover { background:rgba(255,255,255,0.08); border-color:var(--edge3); }

/* ─── FOOTER ─── */
.lb-foot { border-top:1px solid var(--edge); padding:56px 32px 32px; }
.lb-foot-grid { max-width:1140px; margin:0 auto; display:grid; grid-template-columns:2fr 1fr 1fr 1fr; gap:44px; margin-bottom:44px; }
.lb-foot-brand p { font-size:0.82rem; color:var(--snow3); line-height:1.72; margin-top:11px; max-width:240px; }
.lb-fct { font-size:0.7rem; font-weight:800; letter-spacing:0.14em; text-transform:uppercase; color:var(--snow3); margin-bottom:16px; }
.lb-fl { display:block; font-size:0.82rem; color:var(--snow3); background:none; border:none; cursor:pointer; padding:0; text-align:left; margin-bottom:10px; transition:color 0.2s; font-family:'DM Sans',sans-serif; }
.lb-fl:hover { color:var(--snow); }
.lb-foot-bot { max-width:1140px; margin:0 auto; padding-top:22px; border-top:1px solid var(--edge); display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; }
.lb-fcopy { font-size:0.76rem; color:var(--snow4); }

/* ─── Keyframes ─── */
@keyframes lb-up { from{opacity:0;transform:translateY(26px)} to{opacity:1;transform:translateY(0)} }
@keyframes lb-shimmer { 0%{background-position:0% center} 100%{background-position:200% center} }
@keyframes lb-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-9px)} }
@keyframes lb-ch1 { 0%,100%{transform:translateY(0) rotate(-1deg)} 50%{transform:translateY(-7px) rotate(1deg)} }
@keyframes lb-ch2 { 0%,100%{transform:translateY(0) rotate(1deg)} 50%{transform:translateY(-5px) rotate(-1deg)} }
@keyframes lb-mq { from{transform:translateX(0)} to{transform:translateX(-50%)} }

/* ─── Reveal ─── */
.lb-rv { opacity:0; transform:translateY(28px); transition:opacity 0.6s ease, transform 0.6s ease; }
.lb-rv.lb-in { opacity:1; transform:translateY(0); }
.lb-d1{transition-delay:0.07s} .lb-d2{transition-delay:0.14s} .lb-d3{transition-delay:0.21s} .lb-d4{transition-delay:0.28s}

/* ─── Responsive ─── */
@media(max-width:1024px){
  .lb-chip { display:none; }
}
@media(max-width:900px){
  .lb-frow,.lb-frow.lb-flip { grid-template-columns:1fr; direction:ltr; gap:36px; }
  .lb-hiw-grid { grid-template-columns:1fr 1fr; }
  .lb-tg { grid-template-columns:1fr; }
  .lb-sring { grid-template-columns:1fr 1fr; }
  .lb-sc { border-right:none; border-bottom:1px solid var(--edge); }
  .lb-foot-grid { grid-template-columns:1fr 1fr; gap:28px; }
  .lb-nlinks { display:none; }
  .lb-ctabox { padding:48px 24px; }
}
@media(max-width:600px){
  .lb-hiw-grid { grid-template-columns:1fr; }
  .lb-sring { grid-template-columns:1fr; }
  .lb-h1 { font-size:2.4rem; }
  .lb-capture { flex-direction:column; border-radius:12px; }
  .lb-cap-in { width:100%; }
  .lb-foot-grid { grid-template-columns:1fr; }
}
`;

/* ─── Mesh Background ─── */
function MeshCanvas() {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext('2d');
    let raf, t = 0;
    const resize = () => { c.width = window.innerWidth; c.height = window.innerHeight; };
    resize(); window.addEventListener('resize', resize);
    const pts = [
      {x:0.15,y:0.2,hue:230,r:0.42,s:0.00028},{x:0.85,y:0.15,hue:185,r:0.38,s:0.00036},
      {x:0.5,y:0.9,hue:250,r:0.46,s:0.00022},{x:0.05,y:0.7,hue:200,r:0.3,s:0.0005},
      {x:0.95,y:0.55,hue:165,r:0.27,s:0.00055},
    ];
    const draw = () => {
      ctx.clearRect(0,0,c.width,c.height);
      pts.forEach(p => {
        const x=(p.x+Math.sin(t*p.s*900+p.hue)*0.09)*c.width;
        const y=(p.y+Math.cos(t*p.s*700+p.hue)*0.08)*c.height;
        const r=p.r*Math.min(c.width,c.height);
        const g=ctx.createRadialGradient(x,y,0,x,y,r);
        g.addColorStop(0,`hsla(${p.hue},90%,62%,0.08)`);
        g.addColorStop(0.5,`hsla(${p.hue},90%,62%,0.022)`);
        g.addColorStop(1,`hsla(${p.hue},90%,62%,0)`);
        ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
      });
      t+=16; raf=requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize',resize); };
  }, []);
  return <canvas id="lb-mesh" ref={ref}/>;
}

/* ─── useReveal ─── */
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.lb-rv');
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('lb-in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.1 });
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  });
}

/* ─── Data ─── */
const DOCS = [
  {icon:'🪪',name:'Aadhaar Card',sub:'Rajesh · Government ID',badge:'Verified',bc:'lb-bok',bg:'rgba(34,211,160,0.1)'},
  {icon:'🛂',name:"Passport – Priya",sub:'Expires in 47 days ⚠️',badge:'Expiring',bc:'lb-bwarn',bg:'rgba(255,107,138,0.1)'},
  {icon:'💳',name:'PAN Card',sub:'Permanent Account No.',badge:'Secure',bc:'lb-bnew',bg:'rgba(0,229,195,0.1)'},
  {icon:'🎓',name:'B.Tech Degree',sub:'Added 2 days ago',badge:'New',bc:'lb-binfo',bg:'rgba(255,181,71,0.1)'},
];
const PILLS_RAW = ['🪪 Aadhaar Card','💳 PAN Card','🛂 Passport','🚗 Driving Licence','🗳️ Voter ID','📄 Income Certificate','🏠 Domicile Certificate','👶 Birth Certificate','💍 Marriage Certificate','🎓 Degree Certificate','🏥 Medical Reports','🏘️ Property Docs','🛡️ Insurance Papers','💵 ITR Documents'];
const TESTI = [
  {av:'R',name:'Rajesh Patil',role:'Tax Dept., Pune Municipal Corp.',c:'#7BA3FF',bg:'rgba(123,163,255,0.1)',q:'"My daughter\'s admission needed 8 documents in 4 hours. I shared all of them with one DocBox link. Literally saved the admission."'},
  {av:'P',name:'Priya Mehta',role:'Business Owner, Mumbai',c:'#00E5C3',bg:'rgba(0,229,195,0.1)',q:'"6 family members across 3 cities. The permission system is so clean — everyone sees only what they need, nothing more."'},
  {av:'A',name:'Arjun Nair',role:'Software Engineer, Bangalore',c:'#22D3A0',bg:'rgba(34,211,160,0.1)',q:'"Expiry alert came 3 months before my passport expired. Renewed with zero stress. Without DocBox I\'d have completely missed it."'},
];
const FAQS = [
  {q:'Is my Aadhaar data safe?',a:'Yes. AES-256 encryption at rest, TLS 1.3 in transit. We never read or share your documents. DocBox is fully DPDP Act compliant.'},
  {q:'Can family members see all my documents?',a:'No. Every document has individual permission settings — View, Download, or Share. Nobody sees anything you haven\'t explicitly allowed.'},
  {q:'What if I lose my phone?',a:'Nothing is stored on your device. Sign in from any browser and your vault is exactly where you left it.'},
  {q:'Is DocBox DPDP Act compliant?',a:'Yes. India-region servers, full data deletion support, immutable audit log, and zero third-party data sharing.'},
  {q:'Can I use DocBox offline?',a:'Recently accessed documents are cached for offline viewing. Uploading and syncing require an internet connection.'},
];

/* ─── Component ─── */
export default function LandingPage() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [email, setEmail] = useState('');
  useReveal();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 48);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  useEffect(() => {
    const s = document.createElement('style');
    s.textContent = CSS; s.id = 'lb-styles';
    document.head.appendChild(s);
    const l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = FONTS; l.id = 'lb-fonts';
    document.head.appendChild(l);
    return () => {
      document.getElementById('lb-styles')?.remove();
      document.getElementById('lb-fonts')?.remove();
    };
  }, []);

  const goto = id => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  const PILLS = [...PILLS_RAW, ...PILLS_RAW];

  const handleGetStarted = () => {
    if (email.trim()) {
      navigate(`/signup?email=${encodeURIComponent(email.trim())}`);
    } else {
      navigate('/signup');
    }
  };

  return (
    <>
      <MeshCanvas />
      <div className="lb-page">

        {/* ── NAV ── */}
        <nav className={`lb-nav${scrolled ? ' scrolled' : ''}`}>
          <div className="lb-nav-row">
            <div className="lb-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <div className="lb-logo-gem">🔐</div>DocBox
            </div>
            <div className="lb-nlinks">
              {[['features','Features'],['how-it-works','How it works'],['docs','Documents'],['testimonials','Reviews'],['faq','FAQ']].map(([id, label]) => (
                <button key={id} className="lb-nlink" onClick={() => goto(id)}>{label}</button>
              ))}
            </div>
            <button className="lb-nbtn" onClick={() => navigate('/login')}>Sign in</button>
            <button className="lb-nbtn2" onClick={() => navigate('/signup')}>Get started →</button>
          </div>
        </nav>

        {/* ── HERO ── */}
        <section className="lb-hero">
          {[480, 760, 1040, 1320].map((s, i) => (
            <div key={s} className="lb-hring" style={{ width: s, height: s, opacity: 0.45 - i * 0.09 }} />
          ))}
          <div className="lb-cx lb-hero-inner">
            <div className="lb-h-badge">
              <span className="lb-h-badge-dot">🇮🇳</span>Built for Indian families
            </div>
            <h1 className="lb-h1">
              Stop losing documents<br />in <span className="lb-grd">WhatsApp groups.</span>
            </h1>
            <p className="lb-h-sub">
              One secure vault for every Aadhaar, PAN, passport and certificate your family owns — with smart expiry alerts and one-tap sharing.
            </p>

            <div className="lb-capture-wrap">
              <div className="lb-capture">
                <input
                  className="lb-cap-in"
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleGetStarted()}
                />
                <button className="lb-cap-btn" onClick={handleGetStarted}>
                  Create free vault →
                </button>
              </div>
              <div className="lb-h-micro">
                <span><span className="lb-check">✦</span> No credit card</span>
                <span><span className="lb-check">✦</span> No app download</span>
                <span><span className="lb-check">✦</span> Works on any phone</span>
                <span><span className="lb-check">✦</span> Free forever plan</span>
              </div>
            </div>

            <div className="lb-trow">
              {[['🔒','End-to-end encrypted'],['🇮🇳','India-hosted'],['✅','DPDP compliant'],['⚡','Reads in seconds'],['👨‍👩‍👧‍👦','2,400+ families']].map(([ic, lb]) => (
                <div key={lb} className="lb-tp"><span>{ic}</span>{lb}</div>
              ))}
            </div>

            {/* Mockup */}
            <div className="lb-mock-wrap">
              <div className="lb-chip lb-chip1">
                <span style={{ fontSize: '1.05rem' }}>⏰</span>
                <div>
                  <div style={{ fontSize: '0.76rem', fontWeight: 800 }}>Passport expiring</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--snow3)' }}>Alert sent · 47 days left</div>
                </div>
              </div>
              <div className="lb-chip lb-chip2">
                <span style={{ fontSize: '1.05rem' }}>✅</span>
                <div>
                  <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#22D3A0' }}>Aadhaar verified</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--snow3)' }}>Extracted in 2.1s</div>
                </div>
              </div>
              <div className="lb-mock">
                <div className="lb-mbar">
                  <div className="lb-mdot" style={{ background: '#FF5F57' }} />
                  <div className="lb-mdot" style={{ background: '#FEBC2E' }} />
                  <div className="lb-mdot" style={{ background: '#28C840' }} />
                  <span className="lb-mtitle">DocBox — Family Vault</span>
                </div>
                <div className="lb-mbody">
                  <div className="lb-mshead">
                    <span className="lb-mshl">All documents</span>
                    <div className="lb-mshr"><div className="lb-sdot" />All synced</div>
                  </div>
                  {DOCS.map(d => (
                    <div key={d.name} className="lb-drow">
                      <div className="lb-dico" style={{ background: d.bg }}>{d.icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="lb-dn">{d.name}</div>
                        <div className="lb-ds">{d.sub}</div>
                      </div>
                      <span className={`lb-dbadge ${d.bc}`}>{d.badge}</span>
                    </div>
                  ))}
                </div>
                <div className="lb-mfoot">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="lb-mavs">
                      {[['#7BA3FF','rgba(123,163,255,0.12)','R'],['#00E5C3','rgba(0,229,195,0.12)','P'],['#22D3A0','rgba(34,211,160,0.12)','A'],['#FFB547','rgba(255,181,71,0.12)','K']].map(([c, bg, l]) => (
                        <div key={l} className="lb-mav" style={{ background: bg, color: c }}>{l}</div>
                      ))}
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--snow3)' }}>4 members</span>
                  </div>
                  <span style={{ fontSize: '0.71rem', color: 'var(--snow3)' }}>↑ Drop to upload</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECURITY STRIP ── */}
        <div className="lb-sstrip lb-rv">
          <div className="lb-sstrip-in">
            {[['🔒','256-bit AES encryption'],['🛡️','Zero-knowledge architecture'],['🇮🇳','India-region servers'],['📜','DPDP Act compliant'],['🕵️','Immutable audit log']].map(([ic, lb]) => (
              <div key={lb} className="lb-sbadge">
                <span style={{ fontSize: '0.95rem' }}>{ic}</span>{lb}
              </div>
            ))}
          </div>
        </div>

        {/* ── STATS ── */}
        <section className="lb-stats">
          <div className="lb-sring">
            {[['20+','Document types recognised','lb-d1'],['2,400+','Families using DocBox','lb-d2'],['5 GB','Free family storage','lb-d3'],['4+','Indian languages','lb-d4']].map(([n, l, d]) => (
              <div key={l} className={`lb-sc lb-rv ${d}`}>
                <div className="lb-sn">{n}</div>
                <div className="lb-sl">{l}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section className="lb-fsec" id="features">
          <div className="lb-cx">

            {/* 1 Upload */}
            <div className="lb-frow lb-rv">
              <div className="lb-ftxt">
                <div className="lb-slabel">Smart Upload</div>
                <h2 className="lb-sh2">Upload any photo,<br /><em>blurry or not</em></h2>
                <p className="lb-fdesc">WhatsApp forwards, crumpled scans, phone camera shots at midnight. DocBox OCR reads every field across English, Hindi, Marathi and all major Indian languages — and classifies the document automatically.</p>
                <ul className="lb-fbulls">
                  {['Reads blurry, low-res, compressed photos','Detects document type automatically','PDF, JPG, PNG, HEIC, WEBP supported','Available in 4+ Indian languages'].map(b => (
                    <li key={b} className="lb-fbull"><span className="lb-fbull-ic">✓</span>{b}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="lb-fvis">
                  <div className="lb-fvh">
                    <div className="lb-fvd" style={{ background: '#FF5F57' }} /><div className="lb-fvd" style={{ background: '#FEBC2E' }} /><div className="lb-fvd" style={{ background: '#28C840' }} />
                    <span className="lb-fvt">DocBox OCR · Processing…</span>
                  </div>
                  <div className="lb-fvb">
                    <div style={{ border: '2px dashed rgba(79,126,255,0.18)', borderRadius: 11, padding: '18px 14px', textAlign: 'center', marginBottom: 13, background: 'rgba(79,126,255,0.03)' }}>
                      <div style={{ fontSize: '1.8rem', marginBottom: 7 }}>📤</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--snow2)', fontWeight: 700, marginBottom: 3 }}>Drop your document here</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--snow3)' }}>Blurry WhatsApp photos work too</div>
                    </div>
                    {[['Document type','Aadhaar Card ✓'],['Name','Rajesh Kumar Patil'],['Aadhaar No.','•••• •••• 4321'],['Filed under','Rajesh → Govt. IDs']].map(([k, v]) => (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--edge)' }}>
                        <span style={{ fontSize: '0.76rem', color: 'var(--snow3)' }}>{k}</span>
                        <span style={{ fontSize: '0.76rem', color: 'var(--snow)', fontWeight: 700 }}>{v}</span>
                      </div>
                    ))}
                    <div style={{ marginTop: 11, padding: '9px 13px', background: 'rgba(34,211,160,0.07)', border: '1px solid rgba(34,211,160,0.2)', borderRadius: 8, fontSize: '0.76rem', color: '#22D3A0', fontWeight: 700 }}>✓ Extracted and filed in 2.1 seconds</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 2 Expiry */}
            <div className="lb-frow lb-flip lb-rv">
              <div className="lb-ftxt">
                <div className="lb-slabel">Expiry Intelligence</div>
                <h2 className="lb-sh2">90-day alerts.<br /><em>Never panic again.</em></h2>
                <p className="lb-fdesc">DocBox reads expiry dates the moment you upload. You get alerts at 90, 30, and 7 days — enough time to renew without any last-minute scramble.</p>
                <ul className="lb-fbulls">
                  {['Auto-detected on upload','Alerts at 90, 30 and 7 days','Passports, licences, visas, certificates','Push + email notifications'].map(b => (
                    <li key={b} className="lb-fbull"><span className="lb-fbull-ic">✓</span>{b}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="lb-fvis">
                  <div className="lb-fvh">
                    <div className="lb-fvd" style={{ background: '#FF5F57' }} /><div className="lb-fvd" style={{ background: '#FEBC2E' }} /><div className="lb-fvd" style={{ background: '#28C840' }} />
                    <span className="lb-fvt">Expiry tracker</span>
                  </div>
                  <div className="lb-fvb">
                    {[
                      { icon: '🛂', name: "Priya's Passport", days: 47, pct: 15, c: '#FF6B8A', gs: 'rgba(255,107,138,0.3)' },
                      { icon: '🚗', name: 'Driving Licence', days: 120, pct: 45, c: '#FFB547', gs: 'rgba(255,181,71,0.3)' },
                      { icon: '🛡️', name: 'Health Insurance', days: 290, pct: 80, c: '#22D3A0', gs: 'rgba(34,211,160,0.3)' },
                      { icon: '🪪', name: 'Aadhaar Card', days: 'Permanent', pct: 100, c: '#7BA3FF', gs: 'rgba(123,163,255,0.3)' },
                    ].map(d => (
                      <div key={d.name} className="lb-er">
                        <div className="lb-erl">
                          <span style={{ fontSize: '0.88rem' }}>{d.icon}</span>
                          <div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--snow)' }}>{d.name}</div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--snow3)' }}>{typeof d.days === 'number' ? `${d.days} days left` : d.days}</div>
                          </div>
                        </div>
                        <div className="lb-erbar-w"><div className="lb-erbar" style={{ width: `${d.pct}%`, background: d.c, boxShadow: `0 0 7px ${d.gs}` }} /></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 3 Access */}
            <div className="lb-frow lb-rv">
              <div className="lb-ftxt">
                <div className="lb-slabel">Access Control</div>
                <h2 className="lb-sh2">You decide<br /><em>who sees what.</em></h2>
                <p className="lb-fdesc">View, Download, or Share — set permissions per document. Each family member sees exactly what you've allowed, nothing more. Per-document granularity, not just folder-level.</p>
                <ul className="lb-fbulls">
                  {['Per-document permission settings','View / Download / Share / No access','Instant permission changes','Complete audit trail of every access'].map(b => (
                    <li key={b} className="lb-fbull"><span className="lb-fbull-ic">✓</span>{b}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="lb-fvis">
                  <div className="lb-fvh">
                    <div className="lb-fvd" style={{ background: '#FF5F57' }} /><div className="lb-fvd" style={{ background: '#FEBC2E' }} /><div className="lb-fvd" style={{ background: '#28C840' }} />
                    <span className="lb-fvt">Access settings · Aadhaar Card</span>
                  </div>
                  <div className="lb-fvb">
                    {[
                      { av: 'P', c: '#00E5C3', bg: 'rgba(0,229,195,0.1)', n: 'Priya', rel: 'Spouse', perm: 'View + Download', pc: 'rgba(34,211,160,0.12)', pcl: '#22D3A0' },
                      { av: 'A', c: '#7BA3FF', bg: 'rgba(123,163,255,0.1)', n: 'Arjun', rel: 'Son', perm: 'View only', pc: 'rgba(79,126,255,0.12)', pcl: '#7BA3FF' },
                      { av: 'K', c: '#FFB547', bg: 'rgba(255,181,71,0.1)', n: 'Kavya', rel: 'Daughter', perm: 'View only', pc: 'rgba(79,126,255,0.12)', pcl: '#7BA3FF' },
                      { av: 'M', c: '#FF6B8A', bg: 'rgba(255,107,138,0.1)', n: 'Mom', rel: 'Parent', perm: 'No access', pc: 'rgba(255,107,138,0.1)', pcl: '#FF6B8A' },
                    ].map(r => (
                      <div key={r.n} className="lb-acrow">
                        <div className="lb-acp">
                          <div className="lb-acav" style={{ background: r.bg, color: r.c }}>{r.av}</div>
                          <div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--snow)' }}>{r.n}</div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--snow3)' }}>{r.rel}</div>
                          </div>
                        </div>
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '3px 10px', borderRadius: 100, background: r.pc, color: r.pcl }}>{r.perm}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 4 Share */}
            <div className="lb-frow lb-flip lb-rv">
              <div className="lb-ftxt">
                <div className="lb-slabel">Instant Sharing</div>
                <h2 className="lb-sh2">One link.<br /><em>No login needed.</em></h2>
                <p className="lb-fdesc">Generate time-limited share links in one tap. The recipient needs no DocBox account — perfect for college admissions, government portals, bank KYC, and visa applications.</p>
                <ul className="lb-fbulls">
                  {['Time-limited links (1hr to 7 days)','No recipient login required','Built for government portals & banks','One-time-view option'].map(b => (
                    <li key={b} className="lb-fbull"><span className="lb-fbull-ic">✓</span>{b}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="lb-fvis">
                  <div className="lb-fvh">
                    <div className="lb-fvd" style={{ background: '#FF5F57' }} /><div className="lb-fvd" style={{ background: '#FEBC2E' }} /><div className="lb-fvd" style={{ background: '#28C840' }} />
                    <span className="lb-fvt">Share · B.Tech Degree.pdf</span>
                  </div>
                  <div className="lb-fvb">
                    <div className="lb-shbox">
                      <div style={{ fontSize: '0.76rem', color: 'var(--snow3)', fontWeight: 600, marginBottom: 9 }}>Share link generated ✓</div>
                      <div className="lb-shlink">
                        <span className="lb-shlt">docbox.app/s/xK8mP2...</span>
                        <button className="lb-shcopy">Copy</button>
                      </div>
                      <div><span className="lb-shtag">⏱ Expires in 24h</span><span className="lb-shtag">👁 View only</span><span className="lb-shtag">🔒 No login</span></div>
                    </div>
                    <div style={{ display: 'flex', gap: 7 }}>
                      {['WhatsApp', 'Email', 'Copy link'].map(a => (
                        <div key={a} style={{ flex: 1, padding: '8px', background: 'var(--bg3)', border: '1px solid var(--edge2)', borderRadius: 8, fontSize: '0.74rem', fontWeight: 700, color: 'var(--snow2)', textAlign: 'center', cursor: 'pointer' }}>{a}</div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section className="lb-hiw" id="how-it-works">
          <div className="lb-hiw-in">
            <div className="lb-hiw-top lb-rv">
              <div className="lb-slabel">Simple process</div>
              <h2 className="lb-sh2" style={{ maxWidth: 500, margin: '0 auto 12px' }}>From chaos to organised<br />in 60 seconds</h2>
              <p className="lb-sp" style={{ margin: '0 auto', textAlign: 'center' }}>Four steps. That's all it takes to go from a drawer full of documents to a perfectly organised family vault.</p>
            </div>
            <div className="lb-hiw-grid">
              {[
                { num: '01', icon: '📤', title: 'Upload once', desc: 'Any photo or PDF. Works with phone shots, WhatsApp forwards, and scanned docs.' },
                { num: '02', icon: '⚡', title: 'Auto-organised', desc: 'OCR extracts every field, detects the type, and files it under the right member instantly.' },
                { num: '03', icon: '🔑', title: 'Set permissions', desc: 'Choose exactly which family members can access, share, or download each document.' },
                { num: '04', icon: '🔍', title: 'Find it in 3s', desc: 'Search by name, type, or member. Any document, any device, anywhere.' },
              ].map((s, i) => (
                <div key={s.num} className={`lb-hcard lb-rv lb-d${i + 1}`}>
                  <div className="lb-hnum">{s.num}</div>
                  <div className="lb-hico">{s.icon}</div>
                  <div className="lb-htitle">{s.title}</div>
                  <div className="lb-hdesc">{s.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── MARQUEE ── */}
        <section className="lb-mqs" id="docs">
          <div className="lb-mqs-in">
            <div className="lb-mq-lbl lb-rv">20+ document types · recognised automatically</div>
            <div className="lb-mq-outer">
              <div className="lb-mtrack">
                {PILLS.map((p, i) => <div key={i} className="lb-mpill">{p}</div>)}
              </div>
            </div>
          </div>
        </section>

        {/* ── TESTIMONIALS ── */}
        <section className="lb-ts" id="testimonials">
          <div className="lb-cx">
            <div className="lb-ts-hd lb-rv">
              <div className="lb-slabel">Real families</div>
              <h2 className="lb-sh2" style={{ maxWidth: 480, margin: '0 auto 12px' }}>Trusted across India</h2>
            </div>
            <div className="lb-rline lb-rv">
              <span className="lb-rstars">★★★★★</span>
              <span>4.8 · 847 families reviewed</span>
            </div>
            <div className="lb-tg">
              {TESTI.map((t, i) => (
                <div key={t.name} className={`lb-tcard lb-rv lb-d${i + 1}`}>
                  <div className="lb-tcst">★★★★★</div>
                  <p className="lb-tcq">{t.q}</p>
                  <div className="lb-tcp">
                    <div className="lb-tcav" style={{ background: t.bg, color: t.c }}>{t.av}</div>
                    <div><div className="lb-tcn">{t.name}</div><div className="lb-tcr">{t.role}</div></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="lb-fqs" id="faq">
          <div className="lb-fq-in">
            <div className="lb-fq-hd lb-rv">
              <div className="lb-slabel">Questions</div>
              <h2 className="lb-sh2" style={{ maxWidth: 440, margin: '0 auto' }}>Frequently asked</h2>
            </div>
            {FAQS.map((f, i) => (
              <div key={i} className="lb-fqitem lb-rv">
                <div className="lb-fqq" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <span className="lb-fqqt">{f.q}</span>
                  <span className={`lb-fqic${openFaq === i ? ' lb-op' : ''}`}>+</span>
                </div>
                <div className={`lb-fqa${openFaq === i ? ' lb-op' : ''}`}>
                  <p className="lb-fqat">{f.a}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="lb-ctas">
          <div className="lb-ctabox lb-rv">
            <h2 className="lb-ctah">Your family deserves better<br />than a <em>WhatsApp group.</em></h2>
            <p className="lb-ctap">Join 2,400+ Indian families who find every document they need, exactly when they need it.</p>
            <div className="lb-ctabtns">
              <button className="lb-ctab1" onClick={() => navigate('/signup')}>
                Create free vault — no card needed →
              </button>
              <button className="lb-ctab2" onClick={() => goto('how-it-works')}>
                See how it works
              </button>
            </div>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer className="lb-foot">
          <div className="lb-foot-grid">
            <div className="lb-foot-brand">
              <div className="lb-logo">
                <div className="lb-logo-gem" style={{ width: 30, height: 30, fontSize: '0.8rem' }}>🔐</div>DocBox
              </div>
              <p>Secure document management built for every Indian family. Every document, one vault, always at hand.</p>
            </div>
            <div>
              <div className="lb-fct">Product</div>
              {['Features', 'How it works', 'Document types', 'Security', 'Changelog'].map(l => (
                <button key={l} className="lb-fl">{l}</button>
              ))}
            </div>
            <div>
              <div className="lb-fct">Company</div>
              {['About', 'Blog', 'Careers', 'Press', 'Contact us'].map(l => (
                <button key={l} className="lb-fl">{l}</button>
              ))}
            </div>
            <div>
              <div className="lb-fct">Legal</div>
              {['Privacy Policy', 'Terms of Service', 'DPDP Compliance', 'Cookie Policy'].map(l => (
                <button key={l} className="lb-fl">{l}</button>
              ))}
            </div>
          </div>
          <div className="lb-foot-bot">
            <span className="lb-fcopy">© {new Date().getFullYear()} DocBox · Secure family document management for India</span>
            <div style={{ display: 'flex', gap: 18 }}>
              {['Privacy', 'Terms', 'Support'].map(l => (
                <button key={l} className="lb-fl" style={{ marginBottom: 0 }}>{l}</button>
              ))}
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}