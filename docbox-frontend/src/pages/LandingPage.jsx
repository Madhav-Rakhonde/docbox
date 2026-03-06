import { useState, useEffect, useRef } from "react";

const FONTS = `https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,700;0,9..144,900;1,9..144,700;1,9..144,900&family=Cabinet+Grotesk:wght@400;500;700;800;900&display=swap`;

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
  font-family: 'Cabinet Grotesk', sans-serif;
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
}
body::after {
  content:''; position:fixed; inset:0; z-index:9999; pointer-events:none;
  background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.028'/%3E%3C/svg%3E");
  opacity:0.5;
}
#mesh { position:fixed; inset:0; z-index:0; pointer-events:none; }
.page { position:relative; z-index:1; }
.cx { max-width:1140px; margin:0 auto; padding:0 28px; }

/* ─── NAV ─── */
.nav { position:fixed; top:0; left:0; right:0; z-index:200; padding:0 28px; transition:all 0.4s; }
.nav.on { background:rgba(6,8,16,0.85); backdrop-filter:blur(24px) saturate(180%); border-bottom:1px solid var(--edge2); }
.nav-row { max-width:1140px; margin:0 auto; display:flex; align-items:center; height:66px; gap:8px; }
.logo { display:flex; align-items:center; gap:11px; font-weight:900; font-size:1.2rem; color:var(--snow); text-decoration:none; margin-right:auto; letter-spacing:-0.03em; }
.logo-gem { width:36px; height:36px; border-radius:10px; background:linear-gradient(135deg,#4F7EFF,#00E5C3); display:flex; align-items:center; justify-content:center; font-size:1rem; box-shadow:0 0 24px rgba(79,126,255,0.5),0 0 48px rgba(0,229,195,0.15); }
.nlinks { display:flex; gap:4px; }
.nlink { background:none; border:none; cursor:pointer; font-family:'Cabinet Grotesk',sans-serif; font-size:0.875rem; font-weight:700; color:var(--snow3); padding:7px 14px; border-radius:8px; transition:color 0.2s,background 0.2s; }
.nlink:hover { color:var(--snow); background:var(--snow4); }
.nbtn { background:none; border:1px solid var(--edge2); color:var(--snow2); font-family:'Cabinet Grotesk',sans-serif; font-size:0.875rem; font-weight:700; padding:8px 20px; border-radius:9px; cursor:pointer; transition:all 0.2s; }
.nbtn:hover { border-color:var(--blue2); color:var(--blue2); }
.nbtn2 { background:linear-gradient(135deg,var(--blue),#3558D6); border:none; color:#fff; font-family:'Cabinet Grotesk',sans-serif; font-size:0.875rem; font-weight:800; padding:9px 22px; border-radius:9px; cursor:pointer; transition:all 0.25s; margin-left:8px; box-shadow:0 4px 20px rgba(79,126,255,0.35); }
.nbtn2:hover { transform:translateY(-2px); box-shadow:0 10px 32px rgba(79,126,255,0.5); }

/* ─── HERO ─── */
.hero { padding:160px 28px 0; text-align:center; position:relative; overflow:hidden; }
.hring { position:absolute; border-radius:50%; border:1px solid rgba(79,126,255,0.06); pointer-events:none; left:50%; top:46%; transform:translate(-50%,-50%); }
.h-eye { display:inline-flex; align-items:center; gap:8px; background:linear-gradient(135deg,rgba(79,126,255,0.12),rgba(0,229,195,0.07)); border:1px solid rgba(79,126,255,0.22); border-radius:100px; padding:6px 16px 6px 10px; margin-bottom:32px; font-size:0.78rem; font-weight:800; letter-spacing:0.06em; text-transform:uppercase; color:var(--blue2); opacity:0; animation:up 0.7s 0.05s cubic-bezier(0.16,1,0.3,1) forwards; }
.h-eye-pip { width:22px; height:22px; border-radius:6px; background:linear-gradient(135deg,var(--blue),var(--teal)); display:flex; align-items:center; justify-content:center; font-size:0.7rem; }
.h1 { font-family:'Fraunces',serif; font-weight:900; font-size:clamp(3rem,6.5vw,5.8rem); line-height:1.01; letter-spacing:-0.03em; color:var(--snow); max-width:820px; margin:0 auto 26px; opacity:0; animation:up 0.7s 0.15s cubic-bezier(0.16,1,0.3,1) forwards; }
.h1 .grd { font-style:italic; font-weight:700; background:linear-gradient(90deg,var(--blue) 0%,var(--teal) 55%,var(--amber) 100%); background-size:200% auto; -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; animation:shimmer 5s linear infinite; }
.h-sub { font-size:1.1rem; line-height:1.8; color:var(--snow2); max-width:540px; margin:0 auto 44px; font-weight:400; opacity:0; animation:up 0.7s 0.25s cubic-bezier(0.16,1,0.3,1) forwards; }
.capture { display:inline-flex; background:var(--bg3); border:1px solid var(--edge2); border-radius:14px; overflow:hidden; margin-bottom:20px; box-shadow:0 20px 60px rgba(0,0,0,0.4),0 0 0 1px rgba(255,255,255,0.03) inset; opacity:0; animation:up 0.7s 0.32s cubic-bezier(0.16,1,0.3,1) forwards; }
.cap-in { background:none; border:none; outline:none; font-family:'Cabinet Grotesk',sans-serif; font-size:0.95rem; color:var(--snow); padding:14px 20px; width:280px; }
.cap-in::placeholder { color:var(--snow3); }
.cap-btn { background:linear-gradient(135deg,var(--blue),#3558D6); border:none; color:#fff; font-family:'Cabinet Grotesk',sans-serif; font-size:0.9rem; font-weight:800; padding:14px 26px; cursor:pointer; transition:background 0.25s; white-space:nowrap; }
.cap-btn:hover { background:linear-gradient(135deg,var(--blue2),var(--blue)); }
.h-micro { font-size:0.8rem; color:var(--snow3); margin-bottom:52px; display:flex; align-items:center; justify-content:center; gap:20px; flex-wrap:wrap; opacity:0; animation:up 0.7s 0.38s cubic-bezier(0.16,1,0.3,1) forwards; }
.h-micro span { color:var(--jade); margin-right:4px; }
.trow { display:flex; align-items:center; justify-content:center; gap:10px; flex-wrap:wrap; margin-bottom:72px; opacity:0; animation:up 0.7s 0.44s cubic-bezier(0.16,1,0.3,1) forwards; }
.tp { display:flex; align-items:center; gap:7px; background:var(--bg3); border:1px solid var(--edge2); border-radius:100px; padding:7px 14px; font-size:0.78rem; font-weight:700; color:var(--snow3); }

/* Mockup */
.mock-wrap { max-width:700px; margin:0 auto; position:relative; opacity:0; animation:up 0.9s 0.55s cubic-bezier(0.16,1,0.3,1) forwards; }
.mock-wrap::before { content:''; position:absolute; bottom:-50px; left:50%; transform:translateX(-50%); width:80%; height:80px; background:radial-gradient(ellipse,rgba(79,126,255,0.22) 0%,transparent 70%); pointer-events:none; filter:blur(20px); }
.mock { background:var(--bg2); border:1px solid var(--edge2); border-radius:22px; overflow:hidden; box-shadow:0 60px 120px rgba(0,0,0,0.6),0 0 0 1px rgba(255,255,255,0.05) inset,0 1px 0 rgba(255,255,255,0.08) inset; animation:floatUD 7s ease-in-out infinite; }
.mbar { background:var(--bg3); border-bottom:1px solid var(--edge); padding:14px 20px; display:flex; align-items:center; gap:9px; }
.mdot { width:10px; height:10px; border-radius:50%; }
.mtitle { flex:1; text-align:center; font-size:0.78rem; color:var(--snow3); font-weight:600; }
.mbody { padding:20px; }
.mshead { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; }
.mshl { font-size:0.88rem; font-weight:800; color:var(--snow); }
.mshr { display:flex; align-items:center; gap:6px; font-size:0.73rem; color:var(--snow3); }
.sdot { width:6px; height:6px; border-radius:50%; background:var(--jade); }
.drow { display:flex; align-items:center; gap:12px; padding:12px 13px; border-radius:12px; background:var(--bg3); border:1px solid var(--edge); margin-bottom:8px; transition:border-color 0.2s,transform 0.2s; }
.drow:hover { border-color:rgba(79,126,255,0.25); transform:translateX(3px); }
.drow:last-child { margin-bottom:0; }
.dico { width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:0.95rem; flex-shrink:0; }
.dn { font-size:0.84rem; font-weight:700; color:var(--snow); }
.ds { font-size:0.7rem; color:var(--snow3); margin-top:1px; }
.dbadge { margin-left:auto; font-size:0.66rem; font-weight:800; padding:3px 9px; border-radius:100px; white-space:nowrap; }
.bok   { background:rgba(34,211,160,0.12); color:#22D3A0; }
.bwarn { background:rgba(255,107,138,0.12); color:#FF6B8A; }
.bnew  { background:rgba(0,229,195,0.12);   color:#00E5C3; }
.binfo { background:rgba(255,181,71,0.12);  color:#FFB547; }
.mfoot { padding:14px 20px; border-top:1px solid var(--edge); display:flex; align-items:center; justify-content:space-between; }
.mavs { display:flex; }
.mav { width:26px; height:26px; border-radius:50%; border:2px solid var(--bg2); display:flex; align-items:center; justify-content:center; font-size:0.58rem; font-weight:900; margin-left:-7px; }
.mav:first-child { margin-left:0; }
.chip { position:absolute; background:rgba(6,8,16,0.9); backdrop-filter:blur(20px); border:1px solid var(--edge2); border-radius:14px; padding:10px 16px; display:flex; align-items:center; gap:10px; box-shadow:0 12px 40px rgba(0,0,0,0.5); font-size:0.8rem; font-weight:700; color:var(--snow); white-space:nowrap; pointer-events:none; }
.chip1 { top:24px; right:-28px; animation:ch1 5s ease-in-out infinite; }
.chip2 { bottom:80px; left:-28px; animation:ch2 6s ease-in-out infinite; }

/* ─── SEC STRIP ─── */
.sstrip { background:var(--bg2); border-top:1px solid var(--edge); border-bottom:1px solid var(--edge); padding:22px 28px; }
.sstrip-in { max-width:1140px; margin:0 auto; display:flex; align-items:center; justify-content:center; gap:32px; flex-wrap:wrap; }
.sbadge { display:flex; align-items:center; gap:8px; font-size:0.8rem; font-weight:700; color:var(--snow3); }

/* ─── STATS ─── */
.stats { padding:80px 28px; }
.sring { max-width:1140px; margin:0 auto; display:grid; grid-template-columns:repeat(4,1fr); border-radius:20px; overflow:hidden; border:1px solid var(--edge2); background:linear-gradient(135deg,var(--bg2),var(--bg3)); box-shadow:0 24px 80px rgba(0,0,0,0.3); }
.sc { padding:38px 28px; text-align:center; border-right:1px solid var(--edge); position:relative; overflow:hidden; }
.sc:last-child { border-right:none; }
.sc::before { content:''; position:absolute; top:0; left:50%; transform:translateX(-50%); width:60%; height:2px; background:linear-gradient(90deg,transparent,var(--blue),transparent); opacity:0; transition:opacity 0.3s; }
.sc:hover::before { opacity:1; }
.sn { font-family:'Fraunces',serif; font-weight:900; font-size:3rem; line-height:1; letter-spacing:-0.04em; background:linear-gradient(135deg,var(--snow) 30%,var(--blue2)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; margin-bottom:7px; }
.sl { font-size:0.82rem; color:var(--snow3); font-weight:600; }

/* ─── SECTION LABELS ─── */
.slabel { display:inline-block; font-size:0.7rem; font-weight:800; letter-spacing:0.16em; text-transform:uppercase; color:var(--teal); margin-bottom:16px; }
.sh2 { font-family:'Fraunces',serif; font-weight:900; font-size:clamp(2.2rem,3.8vw,3.2rem); line-height:1.08; letter-spacing:-0.03em; color:var(--snow); margin-bottom:16px; }
.sh2 em { font-style:italic; color:var(--blue2); }
.sp { font-size:0.95rem; line-height:1.8; color:var(--snow2); max-width:480px; }

/* ─── FEATURES ─── */
.fsec { padding:100px 28px; }
.frow { display:grid; grid-template-columns:1fr 1fr; gap:64px; align-items:center; margin-bottom:96px; }
.frow:last-child { margin-bottom:0; }
.frow.fl { direction:rtl; }
.frow.fl > * { direction:ltr; }
.ftxt .sh2 { font-size:clamp(1.8rem,3vw,2.6rem); margin-bottom:14px; }
.fdesc { font-size:0.95rem; line-height:1.82; color:var(--snow2); margin-bottom:28px; }
.fbulls { list-style:none; display:flex; flex-direction:column; gap:10px; }
.fbull { display:flex; align-items:flex-start; gap:10px; font-size:0.88rem; color:var(--snow2); line-height:1.6; }
.fbull-ic { width:20px; height:20px; border-radius:6px; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:0.7rem; margin-top:2px; background:linear-gradient(135deg,var(--blue3),rgba(0,229,195,0.1)); color:var(--teal); }
.fvis { border-radius:20px; overflow:hidden; border:1px solid var(--edge2); box-shadow:0 32px 80px rgba(0,0,0,0.4); transition:transform 0.4s cubic-bezier(0.16,1,0.3,1); }
.fvis:hover { transform:translateY(-6px) rotate(-0.4deg); }
.fvh { background:var(--bg3); padding:14px 18px; border-bottom:1px solid var(--edge); display:flex; align-items:center; gap:9px; }
.fvd { width:9px; height:9px; border-radius:50%; }
.fvt { font-size:0.76rem; color:var(--snow3); font-weight:600; margin-left:4px; }
.fvb { background:var(--bg2); padding:20px; }

/* expiry visual */
.er { display:flex; align-items:center; justify-content:space-between; padding:11px 14px; border-radius:12px; background:var(--bg3); border:1px solid var(--edge); margin-bottom:8px; }
.erl { display:flex; align-items:center; gap:10px; }
.erbar-w { flex:1; margin:0 14px; height:5px; background:var(--bg4); border-radius:3px; overflow:hidden; }
.erbar { height:100%; border-radius:3px; }

/* access visual */
.acrow { display:flex; align-items:center; justify-content:space-between; padding:12px 14px; border-radius:12px; background:var(--bg3); border:1px solid var(--edge); margin-bottom:8px; }
.acp { display:flex; align-items:center; gap:10px; }
.acav { width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:0.7rem; font-weight:800; }

/* share visual */
.shbox { background:var(--bg3); border:1px solid var(--edge); border-radius:12px; padding:14px; margin-bottom:12px; }
.shlink { display:flex; align-items:center; gap:10px; background:var(--bg4); border:1px solid var(--edge2); border-radius:9px; padding:10px 12px; margin-bottom:10px; }
.shlt { flex:1; font-size:0.75rem; color:var(--blue2); font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.shcopy { background:var(--blue); color:#fff; border:none; font-size:0.72rem; font-weight:800; padding:5px 12px; border-radius:6px; cursor:pointer; font-family:'Cabinet Grotesk',sans-serif; }
.shtag { font-size:0.72rem; font-weight:700; padding:3px 10px; border-radius:6px; background:rgba(255,255,255,0.05); color:var(--snow3); border:1px solid var(--edge); margin-right:8px; display:inline-block; margin-bottom:4px; }

/* ─── HOW IT WORKS ─── */
.hiw { padding:100px 28px; background:var(--bg2); border-top:1px solid var(--edge); border-bottom:1px solid var(--edge); }
.hiw-in { max-width:1140px; margin:0 auto; }
.hiw-top { text-align:center; margin-bottom:64px; }
.hiw-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:20px; }
.hcard { background:var(--bg3); border:1px solid var(--edge2); border-radius:18px; padding:28px 24px; position:relative; overflow:hidden; transition:transform 0.3s,border-color 0.3s; }
.hcard:hover { transform:translateY(-6px); border-color:rgba(79,126,255,0.3); }
.hnum { font-family:'Fraunces',serif; font-size:3.5rem; font-weight:900; line-height:1; letter-spacing:-0.05em; color:rgba(79,126,255,0.1); margin-bottom:20px; -webkit-text-stroke:1px rgba(79,126,255,0.18); }
.hico { font-size:1.8rem; margin-bottom:14px; }
.htitle { font-weight:800; font-size:0.95rem; color:var(--snow); margin-bottom:8px; }
.hdesc { font-size:0.82rem; line-height:1.72; color:var(--snow2); }

/* ─── MARQUEE ─── */
.mqs { padding:72px 0; overflow:hidden; }
.mqs-in { max-width:1140px; margin:0 auto; padding:0 28px; }
.mq-lbl { text-align:center; font-size:0.7rem; font-weight:800; letter-spacing:0.16em; text-transform:uppercase; color:var(--snow3); margin-bottom:28px; }
.mq-outer { overflow:hidden; mask-image:linear-gradient(90deg,transparent,black 8%,black 92%,transparent); }
.mtrack { display:flex; gap:10px; width:max-content; animation:mqanim 32s linear infinite; }
.mtrack:hover { animation-play-state:paused; }
.mpill { display:flex; align-items:center; gap:8px; background:var(--bg3); border:1px solid var(--edge2); border-radius:100px; padding:9px 18px; font-size:0.84rem; font-weight:600; color:var(--snow2); white-space:nowrap; transition:all 0.2s; cursor:default; }
.mpill:hover { border-color:rgba(79,126,255,0.4); color:var(--snow); }

/* ─── TESTIMONIALS ─── */
.ts { padding:100px 28px; }
.ts-hd { text-align:center; margin-bottom:16px; }
.rline { display:flex; align-items:center; justify-content:center; gap:10px; margin-bottom:56px; font-size:0.88rem; color:var(--snow2); }
.rstars { color:var(--amber); font-size:1rem; letter-spacing:2px; }
.tg { display:grid; grid-template-columns:repeat(3,1fr); gap:20px; }
.tcard { background:var(--bg2); border:1px solid var(--edge); border-radius:20px; padding:30px 26px; position:relative; overflow:hidden; transition:transform 0.35s cubic-bezier(0.16,1,0.3,1),border-color 0.35s; }
.tcard::after { content:''; position:absolute; top:0; left:0; right:0; height:1px; background:linear-gradient(90deg,transparent,rgba(79,126,255,0.5),transparent); opacity:0; transition:opacity 0.35s; }
.tcard:hover { transform:translateY(-8px); border-color:rgba(79,126,255,0.2); }
.tcard:hover::after { opacity:1; }
.tcst { color:var(--amber); font-size:0.8rem; letter-spacing:3px; margin-bottom:14px; }
.tcq { font-size:0.9rem; line-height:1.8; color:var(--snow2); font-style:italic; margin-bottom:22px; }
.tcp { display:flex; align-items:center; gap:12px; }
.tcav { width:40px; height:40px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:0.9rem; flex-shrink:0; }
.tcn { font-weight:800; font-size:0.88rem; color:var(--snow); }
.tcr { font-size:0.73rem; color:var(--snow3); margin-top:2px; }

/* ─── FAQ ─── */
.fqs { padding:100px 28px; background:var(--bg2); border-top:1px solid var(--edge); }
.fq-in { max-width:720px; margin:0 auto; }
.fq-hd { text-align:center; margin-bottom:56px; }
.fqitem { border-bottom:1px solid var(--edge); }
.fqq { display:flex; align-items:center; justify-content:space-between; cursor:pointer; padding:22px 0; gap:16px; }
.fqqt { font-weight:700; font-size:0.95rem; color:var(--snow); }
.fqic { width:28px; height:28px; border-radius:8px; background:var(--bg4); border:1px solid var(--edge2); display:flex; align-items:center; justify-content:center; font-size:0.9rem; color:var(--snow3); transition:all 0.25s; flex-shrink:0; }
.fqic.op { background:var(--blue3); border-color:rgba(79,126,255,0.3); color:var(--blue2); transform:rotate(45deg); }
.fqa { overflow:hidden; max-height:0; transition:max-height 0.38s ease,padding 0.38s; }
.fqa.op { max-height:200px; padding-bottom:20px; }
.fqat { font-size:0.875rem; line-height:1.8; color:var(--snow2); }

/* ─── CTA ─── */
.ctas { padding:80px 28px 100px; }
.ctabox { max-width:1140px; margin:0 auto; border-radius:28px; padding:88px 48px; text-align:center; position:relative; overflow:hidden; background:linear-gradient(145deg,var(--bg3) 0%,#0F1222 50%,var(--bg3) 100%); border:1px solid rgba(79,126,255,0.18); box-shadow:0 0 0 1px rgba(255,255,255,0.03) inset,0 40px 100px rgba(0,0,0,0.4); }
.ctabox::before { content:''; position:absolute; top:-100px; left:50%; transform:translateX(-50%); width:700px; height:400px; pointer-events:none; background:radial-gradient(ellipse,rgba(79,126,255,0.14) 0%,rgba(0,229,195,0.05) 50%,transparent 70%); }
.ctabox::after { content:''; position:absolute; bottom:-80px; left:50%; transform:translateX(-50%); width:400px; height:250px; pointer-events:none; background:radial-gradient(ellipse,rgba(255,181,71,0.07) 0%,transparent 70%); }
.ctah { font-family:'Fraunces',serif; font-weight:900; font-size:clamp(2.2rem,4.5vw,4rem); line-height:1.05; letter-spacing:-0.03em; color:var(--snow); max-width:660px; margin:0 auto 20px; position:relative; z-index:1; }
.ctah em { font-style:italic; background:linear-gradient(90deg,var(--blue2),var(--teal)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
.ctap { font-size:1rem; color:var(--snow2); max-width:440px; margin:0 auto 40px; line-height:1.75; position:relative; z-index:1; }
.ctabtns { display:flex; gap:14px; justify-content:center; flex-wrap:wrap; position:relative; z-index:1; }
.ctab1 { background:linear-gradient(135deg,var(--blue),#3558D6); border:none; color:#fff; font-family:'Cabinet Grotesk',sans-serif; font-size:1rem; font-weight:800; padding:15px 34px; border-radius:12px; cursor:pointer; transition:all 0.25s; box-shadow:0 8px 28px rgba(79,126,255,0.4); }
.ctab1:hover { transform:translateY(-3px); box-shadow:0 16px 48px rgba(79,126,255,0.5); }
.ctab2 { background:rgba(255,255,255,0.04); border:1px solid var(--edge2); color:var(--snow); font-family:'Cabinet Grotesk',sans-serif; font-size:1rem; font-weight:700; padding:14px 30px; border-radius:12px; cursor:pointer; transition:all 0.25s; }
.ctab2:hover { background:rgba(255,255,255,0.08); border-color:var(--edge3); }

/* ─── FOOTER ─── */
.foot { border-top:1px solid var(--edge); padding:60px 28px 36px; }
.foot-grid { max-width:1140px; margin:0 auto; display:grid; grid-template-columns:2fr 1fr 1fr 1fr; gap:48px; margin-bottom:48px; }
.foot-brand p { font-size:0.84rem; color:var(--snow3); line-height:1.72; margin-top:12px; max-width:240px; }
.fct { font-size:0.72rem; font-weight:800; letter-spacing:0.14em; text-transform:uppercase; color:var(--snow3); margin-bottom:18px; }
.fl { display:block; font-size:0.84rem; color:var(--snow3); background:none; border:none; cursor:pointer; padding:0; text-align:left; margin-bottom:11px; transition:color 0.2s; font-family:'Cabinet Grotesk',sans-serif; }
.fl:hover { color:var(--snow); }
.foot-bot { max-width:1140px; margin:0 auto; padding-top:24px; border-top:1px solid var(--edge); display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; }
.fcopy { font-size:0.78rem; color:var(--snow4); }

/* ─── Keyframes ─── */
@keyframes up { from{opacity:0;transform:translateY(28px)} to{opacity:1;transform:translateY(0)} }
@keyframes shimmer { 0%{background-position:0% center} 100%{background-position:200% center} }
@keyframes floatUD { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
@keyframes ch1 { 0%,100%{transform:translateY(0) rotate(-1deg)} 50%{transform:translateY(-8px) rotate(1deg)} }
@keyframes ch2 { 0%,100%{transform:translateY(0) rotate(1deg)} 50%{transform:translateY(-6px) rotate(-1deg)} }
@keyframes mqanim { from{transform:translateX(0)} to{transform:translateX(-50%)} }

/* ─── Reveal ─── */
.rv { opacity:0; transform:translateY(32px); transition:opacity 0.65s ease,transform 0.65s ease; }
.rv.in { opacity:1; transform:translateY(0); }
.d1{transition-delay:0.07s} .d2{transition-delay:0.14s} .d3{transition-delay:0.21s} .d4{transition-delay:0.28s}

/* ─── Responsive ─── */
@media(max-width:960px){
  .frow,.frow.fl{grid-template-columns:1fr;direction:ltr;gap:40px}
  .hiw-grid{grid-template-columns:1fr 1fr}
  .tg{grid-template-columns:1fr}
  .sring{grid-template-columns:1fr 1fr}
  .sc{border-right:none;border-bottom:1px solid var(--edge)}
  .foot-grid{grid-template-columns:1fr 1fr;gap:32px}
  .nlinks{display:none}
  .ctabox{padding:56px 24px}
  .capture{flex-direction:column;border-radius:12px}
  .cap-in{width:100%;max-width:100%}
  .chip{display:none}
}
@media(max-width:600px){
  .hiw-grid{grid-template-columns:1fr}
  .sring{grid-template-columns:1fr}
  .h1{font-size:2.6rem}
  .foot-grid{grid-template-columns:1fr}
}
`;

/* ── Mesh Canvas ──────────────────────────────────────────────────────────── */
function MeshCanvas() {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext('2d');
    let raf, t = 0;
    const resize = () => { c.width = window.innerWidth; c.height = window.innerHeight; };
    resize(); window.addEventListener('resize', resize);
    const pts = [
      {x:0.15,y:0.2,hue:230,r:0.4,s:0.00028},{x:0.85,y:0.15,hue:185,r:0.35,s:0.00036},
      {x:0.5,y:0.9,hue:250,r:0.45,s:0.00022},{x:0.05,y:0.7,hue:200,r:0.28,s:0.0005},
      {x:0.95,y:0.55,hue:165,r:0.25,s:0.00055},
    ];
    const draw = () => {
      ctx.clearRect(0,0,c.width,c.height);
      pts.forEach(p => {
        const x=(p.x+Math.sin(t*p.s*900+p.hue)*0.1)*c.width;
        const y=(p.y+Math.cos(t*p.s*700+p.hue)*0.09)*c.height;
        const r=p.r*Math.min(c.width,c.height);
        const g=ctx.createRadialGradient(x,y,0,x,y,r);
        g.addColorStop(0,`hsla(${p.hue},90%,62%,0.09)`);
        g.addColorStop(0.5,`hsla(${p.hue},90%,62%,0.025)`);
        g.addColorStop(1,`hsla(${p.hue},90%,62%,0)`);
        ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
      });
      t+=16; raf=requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize',resize); };
  }, []);
  return <canvas id="mesh" ref={ref}/>;
}

/* ── useReveal ────────────────────────────────────────────────────────────── */
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.rv');
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.1 });
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  });
}

/* ── Data ─────────────────────────────────────────────────────────────────── */
const DOCS = [
  {icon:'🪪',name:'Aadhaar Card',sub:'Rajesh · Government ID',badge:'Verified',bc:'bok',bg:'rgba(34,211,160,0.1)'},
  {icon:'🛂',name:'Passport – Priya',sub:'Expires in 47 days ⚠️',badge:'Expiring',bc:'bwarn',bg:'rgba(255,107,138,0.1)'},
  {icon:'💳',name:'PAN Card',sub:'Permanent Account No.',badge:'Secure',bc:'bnew',bg:'rgba(0,229,195,0.1)'},
  {icon:'🎓',name:'B.Tech Degree',sub:'Added 2 days ago',badge:'New',bc:'binfo',bg:'rgba(255,181,71,0.1)'},
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

/* ── Main ─────────────────────────────────────────────────────────────────── */
export default function DocBox() {
  const [scrolled, setScrolled] = useState(false);
  const [openFaq, setOpenFaq]   = useState(null);
  const [email, setEmail]       = useState('');
  useReveal();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 48);
    window.addEventListener('scroll', fn, {passive:true});
    return () => window.removeEventListener('scroll', fn);
  }, []);

  useEffect(() => {
    const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s);
    const l = document.createElement('link'); l.rel='stylesheet'; l.href=FONTS; document.head.appendChild(l);
    return () => { document.head.removeChild(s); document.head.removeChild(l); };
  }, []);

  const goto = id => document.getElementById(id)?.scrollIntoView({behavior:'smooth'});
  const PILLS = [...PILLS_RAW,...PILLS_RAW];

  return (
    <>
      <MeshCanvas />
      <div className="page">

        {/* NAV */}
        <nav className={`nav${scrolled?' on':''}`}>
          <div className="nav-row">
            <a className="logo" href="#"><div className="logo-gem">🔐</div>DocBox</a>
            <div className="nlinks">
              {[['features','Features'],['how-it-works','How it works'],['docs','Documents'],['testimonials','Reviews'],['faq','FAQ']].map(([id,l])=>(
                <button key={id} className="nlink" onClick={()=>goto(id)}>{l}</button>
              ))}
            </div>
            <button className="nbtn">Sign in</button>
            <button className="nbtn2">Get started →</button>
          </div>
        </nav>

        {/* HERO */}
        <section className="hero">
          {[500,800,1100,1400].map((s,i)=>(
            <div key={s} className="hring" style={{width:s,height:s,opacity:0.5-i*0.1}}/>
          ))}
          <div className="cx">
            <div className="h-eye"><span className="h-eye-pip">🇮🇳</span>Built for Indian families</div>
            <h1 className="h1">Stop losing documents<br />in <span className="grd">WhatsApp groups.</span></h1>
            <p className="h-sub">One secure vault for every Aadhaar, PAN, passport and certificate your family owns — with smart expiry alerts and one-tap sharing.</p>
            <div style={{display:'flex',flexDirection:'column',alignItems:'center'}}>
              <div className="capture">
                <input className="cap-in" type="email" placeholder="Enter your email address" value={email} onChange={e=>setEmail(e.target.value)}/>
                <button className="cap-btn">Create free vault →</button>
              </div>
            </div>
            <div className="h-micro">
              <span><span>✦</span> No credit card</span>
              <span><span>✦</span> No app download</span>
              <span><span>✦</span> Works on any phone</span>
              <span><span>✦</span> Free forever plan</span>
            </div>
            <div className="trow">
              {[['🔒','End-to-end encrypted'],['🇮🇳','India-hosted'],['✅','DPDP compliant'],['⚡','Reads in seconds'],['👨‍👩‍👧‍👦','2,400+ families']].map(([ic,lb])=>(
                <div key={lb} className="tp"><span>{ic}</span>{lb}</div>
              ))}
            </div>
            {/* Mockup */}
            <div className="mock-wrap">
              <div className="chip chip1">
                <span style={{fontSize:'1.1rem'}}>⏰</span>
                <div><div style={{fontSize:'0.78rem',fontWeight:800}}>Passport expiring</div><div style={{fontSize:'0.7rem',color:'var(--snow3)'}}>Alert sent · 47 days left</div></div>
              </div>
              <div className="chip chip2">
                <span style={{fontSize:'1.1rem'}}>✅</span>
                <div><div style={{fontSize:'0.78rem',fontWeight:800,color:'#22D3A0'}}>Aadhaar verified</div><div style={{fontSize:'0.7rem',color:'var(--snow3)'}}>Extracted in 2.1s</div></div>
              </div>
              <div className="mock">
                <div className="mbar">
                  <div className="mdot" style={{background:'#FF5F57'}}/><div className="mdot" style={{background:'#FEBC2E'}}/><div className="mdot" style={{background:'#28C840'}}/>
                  <span className="mtitle">DocBox — Family Vault</span>
                </div>
                <div className="mbody">
                  <div className="mshead">
                    <span className="mshl">All documents</span>
                    <div className="mshr"><div className="sdot"/>All synced</div>
                  </div>
                  {DOCS.map(d=>(
                    <div key={d.name} className="drow">
                      <div className="dico" style={{background:d.bg}}>{d.icon}</div>
                      <div style={{flex:1,minWidth:0}}><div className="dn">{d.name}</div><div className="ds">{d.sub}</div></div>
                      <span className={`dbadge ${d.bc}`}>{d.badge}</span>
                    </div>
                  ))}
                </div>
                <div className="mfoot">
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <div className="mavs">
                      {[['#7BA3FF','rgba(123,163,255,0.12)','R'],['#00E5C3','rgba(0,229,195,0.12)','P'],['#22D3A0','rgba(34,211,160,0.12)','A'],['#FFB547','rgba(255,181,71,0.12)','K']].map(([c,bg,l])=>(
                        <div key={l} className="mav" style={{background:bg,color:c}}>{l}</div>
                      ))}
                    </div>
                    <span style={{fontSize:'0.74rem',color:'var(--snow3)'}}>4 members</span>
                  </div>
                  <span style={{fontSize:'0.73rem',color:'var(--snow3)'}}>↑ Drop to upload</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECURITY STRIP */}
        <div className="sstrip rv">
          <div className="sstrip-in">
            {[['🔒','256-bit AES encryption'],['🛡️','Zero-knowledge architecture'],['🇮🇳','India-region servers'],['📜','DPDP Act compliant'],['🕵️','Immutable audit log']].map(([ic,lb])=>(
              <div key={lb} className="sbadge"><span style={{fontSize:'1rem'}}>{ic}</span>{lb}</div>
            ))}
          </div>
        </div>

        {/* STATS */}
        <section className="stats">
          <div className="sring">
            {[['20+','Document types recognised','d1'],['2,400+','Families using DocBox','d2'],['5 GB','Free family storage','d3'],['4+','Indian languages','d4']].map(([n,l,d])=>(
              <div key={l} className={`sc rv ${d}`}><div className="sn">{n}</div><div className="sl">{l}</div></div>
            ))}
          </div>
        </section>

        {/* FEATURES */}
        <section className="fsec" id="features">
          <div className="cx">
            {/* 1 — Upload */}
            <div className="frow rv">
              <div className="ftxt">
                <div className="slabel">Smart Upload</div>
                <h2 className="sh2">Upload any photo,<br /><em>blurry or not</em></h2>
                <p className="fdesc">WhatsApp forwards, crumpled scans, phone camera shots at midnight. DocBox OCR reads every field across English, Hindi, Marathi and all major Indian languages — and classifies the document automatically.</p>
                <ul className="fbulls">
                  {['Reads blurry, low-res, compressed photos','Detects document type automatically','PDF, JPG, PNG, HEIC, WEBP supported','Available in 4+ Indian languages'].map(b=>(
                    <li key={b} className="fbull"><span className="fbull-ic">✓</span>{b}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="fvis">
                  <div className="fvh"><div className="fvd" style={{background:'#FF5F57'}}/><div className="fvd" style={{background:'#FEBC2E'}}/><div className="fvd" style={{background:'#28C840'}}/><span className="fvt">DocBox OCR · Processing…</span></div>
                  <div className="fvb">
                    <div style={{border:'2px dashed rgba(79,126,255,0.2)',borderRadius:12,padding:'20px 16px',textAlign:'center',marginBottom:14,background:'rgba(79,126,255,0.03)'}}>
                      <div style={{fontSize:'2rem',marginBottom:8}}>📤</div>
                      <div style={{fontSize:'0.82rem',color:'var(--snow2)',fontWeight:700,marginBottom:4}}>Drop your document here</div>
                      <div style={{fontSize:'0.72rem',color:'var(--snow3)'}}>Blurry WhatsApp photos work too</div>
                    </div>
                    {[['Document type','Aadhaar Card ✓'],['Name','Rajesh Kumar Patil'],['Aadhaar No.','•••• •••• 4321'],['Filed under','Rajesh → Govt. IDs']].map(([k,v])=>(
                      <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:'1px solid var(--edge)'}}>
                        <span style={{fontSize:'0.78rem',color:'var(--snow3)'}}>{k}</span>
                        <span style={{fontSize:'0.78rem',color:'var(--snow)',fontWeight:700}}>{v}</span>
                      </div>
                    ))}
                    <div style={{marginTop:12,padding:'10px 14px',background:'rgba(34,211,160,0.07)',border:'1px solid rgba(34,211,160,0.2)',borderRadius:9,fontSize:'0.78rem',color:'#22D3A0',fontWeight:700}}>✓ Extracted and filed in 2.1 seconds</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 2 — Expiry */}
            <div className="frow fl rv">
              <div className="ftxt">
                <div className="slabel">Expiry Intelligence</div>
                <h2 className="sh2">90-day alerts.<br /><em>Never panic again.</em></h2>
                <p className="fdesc">DocBox reads expiry dates the moment you upload. You get alerts at 90, 30, and 7 days — enough time to renew without any last-minute scramble.</p>
                <ul className="fbulls">
                  {['Auto-detected on upload','Alerts at 90, 30 and 7 days','Passports, licences, visas, certificates','Push + email notifications'].map(b=>(
                    <li key={b} className="fbull"><span className="fbull-ic">✓</span>{b}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="fvis">
                  <div className="fvh"><div className="fvd" style={{background:'#FF5F57'}}/><div className="fvd" style={{background:'#FEBC2E'}}/><div className="fvd" style={{background:'#28C840'}}/><span className="fvt">Expiry tracker</span></div>
                  <div className="fvb">
                    {[
                      {icon:'🛂',name:"Priya's Passport",days:47,pct:15,c:'#FF6B8A',gs:'rgba(255,107,138,0.35)'},
                      {icon:'🚗',name:'Driving Licence',days:120,pct:45,c:'#FFB547',gs:'rgba(255,181,71,0.35)'},
                      {icon:'🛡️',name:'Health Insurance',days:290,pct:80,c:'#22D3A0',gs:'rgba(34,211,160,0.35)'},
                      {icon:'🪪',name:'Aadhaar Card',days:'Permanent',pct:100,c:'#7BA3FF',gs:'rgba(123,163,255,0.35)'},
                    ].map(d=>(
                      <div key={d.name} className="er">
                        <div className="erl">
                          <span style={{fontSize:'0.9rem'}}>{d.icon}</span>
                          <div><div style={{fontSize:'0.82rem',fontWeight:700,color:'var(--snow)'}}>{d.name}</div><div style={{fontSize:'0.7rem',color:'var(--snow3)'}}>{typeof d.days==='number'?`${d.days} days left`:d.days}</div></div>
                        </div>
                        <div className="erbar-w"><div className="erbar" style={{width:`${d.pct}%`,background:d.c,boxShadow:`0 0 8px ${d.gs}`}}/></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 3 — Access */}
            <div className="frow rv">
              <div className="ftxt">
                <div className="slabel">Access Control</div>
                <h2 className="sh2">You decide<br /><em>who sees what.</em></h2>
                <p className="fdesc">View, Download, or Share — set permissions per document. Each family member sees exactly what you've allowed, nothing more. Per-document granularity, not just folder-level.</p>
                <ul className="fbulls">
                  {['Per-document permission settings','View / Download / Share / No access','Instant permission changes','Complete audit trail of every access'].map(b=>(
                    <li key={b} className="fbull"><span className="fbull-ic">✓</span>{b}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="fvis">
                  <div className="fvh"><div className="fvd" style={{background:'#FF5F57'}}/><div className="fvd" style={{background:'#FEBC2E'}}/><div className="fvd" style={{background:'#28C840'}}/><span className="fvt">Access settings · Aadhaar Card</span></div>
                  <div className="fvb">
                    {[
                      {av:'P',c:'#00E5C3',bg:'rgba(0,229,195,0.1)',n:'Priya',rel:'Spouse',perm:'View + Download',pc:'rgba(34,211,160,0.12)',pcl:'#22D3A0'},
                      {av:'A',c:'#7BA3FF',bg:'rgba(123,163,255,0.1)',n:'Arjun',rel:'Son',perm:'View only',pc:'rgba(79,126,255,0.12)',pcl:'#7BA3FF'},
                      {av:'K',c:'#FFB547',bg:'rgba(255,181,71,0.1)',n:'Kavya',rel:'Daughter',perm:'View only',pc:'rgba(79,126,255,0.12)',pcl:'#7BA3FF'},
                      {av:'M',c:'#FF6B8A',bg:'rgba(255,107,138,0.1)',n:'Mom',rel:'Parent',perm:'No access',pc:'rgba(255,107,138,0.1)',pcl:'#FF6B8A'},
                    ].map(r=>(
                      <div key={r.n} className="acrow">
                        <div className="acp"><div className="acav" style={{background:r.bg,color:r.c}}>{r.av}</div><div><div style={{fontSize:'0.82rem',fontWeight:700,color:'var(--snow)'}}>{r.n}</div><div style={{fontSize:'0.7rem',color:'var(--snow3)'}}>{r.rel}</div></div></div>
                        <span style={{fontSize:'0.7rem',fontWeight:800,padding:'3px 10px',borderRadius:100,background:r.pc,color:r.pcl}}>{r.perm}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 4 — Share */}
            <div className="frow fl rv">
              <div className="ftxt">
                <div className="slabel">Instant Sharing</div>
                <h2 className="sh2">One link.<br /><em>No login needed.</em></h2>
                <p className="fdesc">Generate time-limited share links in one tap. The recipient needs no DocBox account — perfect for college admissions, government portals, bank KYC, and visa applications.</p>
                <ul className="fbulls">
                  {['Time-limited links (1hr to 7 days)','No recipient login required','Built for government portals & banks','One-time-view option'].map(b=>(
                    <li key={b} className="fbull"><span className="fbull-ic">✓</span>{b}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="fvis">
                  <div className="fvh"><div className="fvd" style={{background:'#FF5F57'}}/><div className="fvd" style={{background:'#FEBC2E'}}/><div className="fvd" style={{background:'#28C840'}}/><span className="fvt">Share · B.Tech Degree.pdf</span></div>
                  <div className="fvb">
                    <div className="shbox">
                      <div style={{fontSize:'0.78rem',color:'var(--snow3)',fontWeight:600,marginBottom:10}}>Share link generated ✓</div>
                      <div className="shlink"><span className="shlt">docbox.app/s/xK8mP2...</span><button className="shcopy">Copy</button></div>
                      <div><span className="shtag">⏱ Expires in 24h</span><span className="shtag">👁 View only</span><span className="shtag">🔒 No login</span></div>
                    </div>
                    <div style={{display:'flex',gap:8}}>
                      {['WhatsApp','Email','Copy link'].map(a=>(
                        <div key={a} style={{flex:1,padding:'9px',background:'var(--bg3)',border:'1px solid var(--edge2)',borderRadius:9,fontSize:'0.76rem',fontWeight:700,color:'var(--snow2)',textAlign:'center',cursor:'pointer'}}>{a}</div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="hiw" id="how-it-works">
          <div className="hiw-in">
            <div className="hiw-top rv">
              <div className="slabel">Simple process</div>
              <h2 className="sh2" style={{maxWidth:520,margin:'0 auto 14px'}}>From chaos to organised<br />in 60 seconds</h2>
              <p className="sp" style={{margin:'0 auto'}}>Four steps. That's all it takes to go from a drawer full of documents to a perfectly organised family vault.</p>
            </div>
            <div className="hiw-grid">
              {[
                {num:'01',icon:'📤',title:'Upload once',desc:'Any photo or PDF. Works with phone shots, WhatsApp forwards, and scanned docs.'},
                {num:'02',icon:'⚡',title:'Auto-organised',desc:'OCR extracts every field, detects the type, and files it under the right member instantly.'},
                {num:'03',icon:'🔑',title:'Set permissions',desc:'Choose exactly which family members can access, share, or download each document.'},
                {num:'04',icon:'🔍',title:'Find it in 3s',desc:'Search by name, type, or member. Any document, any device, anywhere.'},
              ].map((s,i)=>(
                <div key={s.num} className={`hcard rv d${i+1}`}>
                  <div className="hnum">{s.num}</div>
                  <div className="hico">{s.icon}</div>
                  <div className="htitle">{s.title}</div>
                  <div className="hdesc">{s.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* MARQUEE */}
        <section className="mqs" id="docs">
          <div className="mqs-in">
            <div className="mq-lbl rv">20+ document types · recognised automatically</div>
            <div className="mq-outer">
              <div className="mtrack">{PILLS.map((p,i)=><div key={i} className="mpill">{p}</div>)}</div>
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="ts" id="testimonials">
          <div className="cx">
            <div className="ts-hd rv"><div className="slabel">Real families</div><h2 className="sh2" style={{maxWidth:500,margin:'0 auto 14px'}}>Trusted across India</h2></div>
            <div className="rline rv"><span className="rstars">★★★★★</span><span>4.8 · 847 families reviewed</span></div>
            <div className="tg">
              {TESTI.map((t,i)=>(
                <div key={t.name} className={`tcard rv d${i+1}`}>
                  <div className="tcst">★★★★★</div>
                  <p className="tcq">{t.q}</p>
                  <div className="tcp"><div className="tcav" style={{background:t.bg,color:t.c}}>{t.av}</div><div><div className="tcn">{t.name}</div><div className="tcr">{t.role}</div></div></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="fqs" id="faq">
          <div className="fq-in">
            <div className="fq-hd rv"><div className="slabel">Questions</div><h2 className="sh2" style={{maxWidth:460,margin:'0 auto'}}>Frequently asked</h2></div>
            {FAQS.map((f,i)=>(
              <div key={i} className="fqitem rv">
                <div className="fqq" onClick={()=>setOpenFaq(openFaq===i?null:i)}>
                  <span className="fqqt">{f.q}</span>
                  <span className={`fqic${openFaq===i?' op':''}`}>+</span>
                </div>
                <div className={`fqa${openFaq===i?' op':''}`}><p className="fqat">{f.a}</p></div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="ctas">
          <div className="ctabox rv">
            <h2 className="ctah">Your family deserves better<br />than a <em>WhatsApp group.</em></h2>
            <p className="ctap">Join 2,400+ Indian families who find every document they need, exactly when they need it.</p>
            <div className="ctabtns">
              <button className="ctab1">Create free vault — no card needed →</button>
              <button className="ctab2" onClick={()=>goto('how-it-works')}>See how it works</button>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="foot">
          <div className="foot-grid">
            <div className="foot-brand">
              <div className="logo"><div className="logo-gem" style={{width:30,height:30,fontSize:'0.8rem'}}>🔐</div>DocBox</div>
              <p>Secure document management built for every Indian family. Every document, one vault, always at hand.</p>
            </div>
            <div><div className="fct">Product</div>{['Features','How it works','Document types','Security','Changelog'].map(l=><button key={l} className="fl">{l}</button>)}</div>
            <div><div className="fct">Company</div>{['About','Blog','Careers','Press','Contact us'].map(l=><button key={l} className="fl">{l}</button>)}</div>
            <div><div className="fct">Legal</div>{['Privacy Policy','Terms of Service','DPDP Compliance','Cookie Policy'].map(l=><button key={l} className="fl">{l}</button>)}</div>
          </div>
          <div className="foot-bot">
            <span className="fcopy">© {new Date().getFullYear()} DocBox · Secure family document management for India</span>
            <div style={{display:'flex',gap:20}}>{['Privacy','Terms','Support'].map(l=><button key={l} className="fl" style={{marginBottom:0}}>{l}</button>)}</div>
          </div>
        </footer>
      </div>
    </>
  );
}