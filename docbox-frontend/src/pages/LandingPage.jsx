import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

/* ─────────────────────────────────────────────────────────────────────────────
   GLOBAL CSS  –  injected once on mount
───────────────────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://api.fontshare.com/v2/css?f[]=satoshi@300,400,500,700,900&f[]=general-sans@400,500,600&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,700&display=swap');

:root {
  --void:      #03050D;
  --deep:      #07091A;
  --mid:       #0C0F24;
  --lift:      #131729;
  --lift2:     #1A1F35;
  --rim:       rgba(255,255,255,0.06);
  --rim2:      rgba(255,255,255,0.11);
  --rim3:      rgba(255,255,255,0.18);
  --indigo:    #6366F1;
  --indigo2:   #818CF8;
  --cyan:      #22D3EE;
  --cyan2:     #67E8F9;
  --gold:      #FBBF24;
  --gold2:     #FDE68A;
  --rose:      #F472B6;
  --emerald:   #34D399;
  --text:      #F1F5FF;
  --text2:     rgba(241,245,255,0.6);
  --text3:     rgba(241,245,255,0.35);
  --grad-main: linear-gradient(135deg, var(--indigo) 0%, var(--cyan) 100%);
  --glow-ind:  rgba(99,102,241,0.25);
  --glow-cyan: rgba(34,211,238,0.2);
  --glow-gold: rgba(251,191,36,0.25);
}

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{
  background:var(--void);color:var(--text);
  font-family:'Satoshi',sans-serif;
  -webkit-font-smoothing:antialiased;overflow-x:hidden;
}
#aurora-canvas{position:fixed;inset:0;z-index:0;pointer-events:none;opacity:0.6}
.page-wrap{position:relative;z-index:1}
body::after{
  content:'';position:fixed;inset:0;z-index:9999;pointer-events:none;
  background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E");
  opacity:0.65;
}

/* ── Keyframes ── */
@keyframes fadeUp{from{opacity:0;transform:translateY(48px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideRight{from{opacity:0;transform:translateX(72px)}to{opacity:1;transform:translateX(0)}}
@keyframes floatA{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}
@keyframes floatB{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
@keyframes pulseRing{0%{transform:translate(-50%,-50%) scale(1);opacity:0.5}100%{transform:translate(-50%,-50%) scale(2);opacity:0}}
@keyframes shimmer{0%{background-position:-300% center}100%{background-position:300% center}}
@keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
@keyframes scanLine{0%{top:-2px;opacity:0.9}100%{top:100%;opacity:0}}
@keyframes blobMorph{
  0%,100%{border-radius:60% 40% 30% 70%/60% 30% 70% 40%}
  25%{border-radius:30% 60% 70% 40%/50% 60% 30% 60%}
  50%{border-radius:50% 60% 30% 60%/30% 50% 70% 50%}
  75%{border-radius:60% 30% 50% 70%/60% 40% 60% 30%}
}
@keyframes glowPulse{
  0%,100%{box-shadow:0 0 24px rgba(99,102,241,0.25),0 0 48px rgba(99,102,241,0.08)}
  50%{box-shadow:0 0 48px rgba(99,102,241,0.5),0 0 96px rgba(99,102,241,0.2)}
}
@keyframes cardEntrance{
  from{opacity:0;transform:perspective(900px) rotateX(16deg) translateY(32px)}
  to{opacity:1;transform:perspective(900px) rotateX(0deg) translateY(0)}
}
@keyframes borderPulse{
  0%,100%{border-color:rgba(99,102,241,0.15)}
  50%{border-color:rgba(99,102,241,0.4)}
}
@keyframes numberCount{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}

/* ── Gradient text ── */
.grad-text{
  background:linear-gradient(135deg,var(--indigo2) 0%,var(--cyan) 50%,var(--gold) 100%);
  background-size:200% auto;-webkit-background-clip:text;
  -webkit-text-fill-color:transparent;background-clip:text;
  animation:shimmer 6s linear infinite;
}
.gold-text{
  background:linear-gradient(90deg,var(--gold) 0%,var(--gold2) 40%,var(--gold) 100%);
  background-size:200% auto;-webkit-background-clip:text;
  -webkit-text-fill-color:transparent;background-clip:text;
  animation:shimmer 4s linear infinite;
}
.italic-serif{font-family:'Playfair Display',serif;font-style:italic}

/* ── Nav ── */
.nav{
  position:fixed;top:0;left:0;right:0;z-index:200;
  padding:0 max(20px,calc((100vw - 1200px)/2));
  transition:all 0.4s ease;
}
.nav.solid{background:rgba(3,5,13,0.8);backdrop-filter:blur(24px);border-bottom:1px solid var(--rim2)}
.nav-inner{display:flex;align-items:center;height:68px;gap:32px}
.logo{
  display:flex;align-items:center;gap:10px;
  font-family:'Satoshi',sans-serif;font-weight:900;font-size:1.25rem;
  color:var(--text);text-decoration:none;margin-right:auto;letter-spacing:-0.02em;
}
.logo-mark{
  width:36px;height:36px;border-radius:10px;
  background:var(--grad-main);
  display:flex;align-items:center;justify-content:center;font-size:1rem;
  box-shadow:0 4px 20px var(--glow-ind);animation:glowPulse 3s ease-in-out infinite;
}
.nav-a{background:none;border:none;cursor:pointer;font-family:'Satoshi',sans-serif;font-size:0.88rem;font-weight:500;color:var(--text2);transition:color 0.2s}
.nav-a:hover{color:var(--text)}
.btn-n{background:none;border:1px solid var(--rim2);color:var(--text);font-family:'Satoshi',sans-serif;font-size:0.88rem;font-weight:600;padding:8px 20px;border-radius:8px;cursor:pointer;transition:all 0.2s}
.btn-n:hover{border-color:var(--indigo2);color:var(--indigo2)}
.btn-cta{
  background:var(--grad-main);border:none;color:#fff;font-family:'Satoshi',sans-serif;
  font-size:0.88rem;font-weight:700;padding:9px 22px;border-radius:8px;cursor:pointer;
  transition:all 0.25s;box-shadow:0 4px 20px var(--glow-ind);position:relative;overflow:hidden;
}
.btn-cta:hover{transform:translateY(-2px);box-shadow:0 8px 32px var(--glow-ind)}

/* ── Hero ── */
.hero{
  min-height:100vh;display:flex;align-items:center;
  padding:120px max(20px,calc((100vw - 1200px)/2)) 80px;
  position:relative;overflow:hidden;
}
.orbit-ring{position:absolute;border-radius:50%;border:1px solid rgba(99,102,241,0.07);pointer-events:none}
.blob{position:absolute;border-radius:60% 40% 30% 70%/60% 30% 70% 40%;filter:blur(80px);pointer-events:none;animation:blobMorph 14s ease-in-out infinite}
/* Right column is wider (560px) so badges have room inside without bleeding */
.hero-grid{display:grid;grid-template-columns:1fr 460px;gap:60px;align-items:center;width:100%;position:relative;z-index:2}
.eyebrow{
  display:inline-flex;align-items:center;gap:8px;
  background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.25);
  border-radius:100px;padding:5px 14px;
  font-size:0.78rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;
  color:var(--indigo2);margin-bottom:24px;width:fit-content;
}
.eyebrow-dot{width:6px;height:6px;border-radius:50%;background:var(--indigo2);animation:pulse 2s ease-in-out infinite;box-shadow:0 0 8px var(--indigo2)}
.hero-h1{
  font-family:'Satoshi',sans-serif;font-weight:900;
  font-size:clamp(3.2rem,6vw,5.5rem);line-height:0.97;letter-spacing:-0.04em;
  color:var(--text);margin-bottom:28px;
}
.hero-sub{font-size:1.1rem;line-height:1.78;color:var(--text2);max-width:500px;margin-bottom:44px;font-weight:400}
.cta-row{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:52px}
.btn-hero{
  background:var(--grad-main);border:none;color:#fff;font-family:'Satoshi',sans-serif;
  font-size:1rem;font-weight:700;padding:15px 34px;border-radius:12px;cursor:pointer;
  transition:all 0.25s;
  box-shadow:0 8px 32px var(--glow-ind),0 0 0 1px rgba(255,255,255,0.1) inset;
  letter-spacing:-0.01em;position:relative;overflow:hidden;
}
.btn-hero:hover{transform:translateY(-3px);box-shadow:0 16px 48px var(--glow-ind)}
.btn-ghost2{
  background:rgba(255,255,255,0.04);border:1px solid var(--rim2);color:var(--text);
  font-family:'Satoshi',sans-serif;font-size:1rem;font-weight:600;
  padding:14px 30px;border-radius:12px;cursor:pointer;transition:all 0.25s;backdrop-filter:blur(8px);
}
.btn-ghost2:hover{border-color:var(--rim3);background:rgba(255,255,255,0.08);transform:translateY(-2px)}
.trust-row{display:flex;align-items:center;gap:28px;flex-wrap:wrap}
.trust-item{display:flex;align-items:center;gap:7px;font-size:0.83rem;color:var(--text3);font-weight:500}
.trust-icon{font-size:0.75rem;color:var(--emerald)}

/* hero-visual is the right-column mockup container */
.hero-visual{
  position:relative;
  padding:20px 0;
  animation:floatA 8s ease-in-out infinite;
}
.mock-shell{
  background:linear-gradient(145deg,var(--lift) 0%,var(--lift2) 100%);
  border:1px solid var(--rim2);border-radius:24px;padding:24px;
  box-shadow:0 48px 96px rgba(0,0,0,0.6),0 0 0 1px rgba(255,255,255,0.04) inset,0 1px 0 rgba(255,255,255,0.08) inset,0 0 100px rgba(99,102,241,0.08);
  position:relative;overflow:hidden;
}
.mock-shell::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent 0%,var(--indigo2) 30%,var(--cyan) 70%,transparent 100%)}
.mock-topbar{display:flex;align-items:center;gap:8px;margin-bottom:18px;padding-bottom:16px;border-bottom:1px solid var(--rim)}
.dot-r{width:10px;height:10px;border-radius:50%;background:#FF5F57}
.dot-y{width:10px;height:10px;border-radius:50%;background:#FEBC2E}
.dot-g{width:10px;height:10px;border-radius:50%;background:#28C840}
.mock-title{margin-left:8px;font-size:0.78rem;font-weight:600;color:var(--text3);flex:1;text-align:center}
.scan{position:absolute;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,var(--cyan),var(--indigo2),transparent);animation:scanLine 3s linear infinite;opacity:0.7;z-index:5}
.doc-row-m{display:flex;align-items:center;gap:12px;padding:11px 13px;border-radius:12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.05);margin-bottom:8px;transition:all 0.2s;cursor:default}
.doc-row-m:hover{background:rgba(99,102,241,0.06);border-color:rgba(99,102,241,0.2);transform:translateX(4px)}
.d-icon{width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:0.95rem;flex-shrink:0}
.d-name{font-size:0.82rem;font-weight:700;color:var(--text)}
.d-sub{font-size:0.7rem;color:var(--text3);margin-top:1px}
.d-badge{font-size:0.66rem;font-weight:800;padding:3px 9px;border-radius:100px;margin-left:auto;white-space:nowrap;letter-spacing:0.04em}
.b-ok{background:rgba(52,211,153,0.12);color:#34D399}
.b-warn{background:rgba(244,114,182,0.12);color:#F472B6}
.b-new{background:rgba(34,211,238,0.12);color:#22D3EE}
.b-gold{background:rgba(251,191,36,0.12);color:#FBBF24}
.mock-footer{margin-top:14px;padding-top:14px;border-top:1px solid var(--rim);display:flex;align-items:center;justify-content:space-between}
.mock-avatars{display:flex}
.mock-av{width:26px;height:26px;border-radius:50%;border:2px solid var(--lift);display:flex;align-items:center;justify-content:center;font-size:0.6rem;font-weight:800;margin-left:-8px}
.mock-av:first-child{margin-left:0}
.sync-dot{width:5px;height:5px;border-radius:50%;background:var(--emerald);animation:pulse 2s infinite}
/* ── hero-visual is now just the mockup card, no overflow issues ── */

/* Badges live in .badges-layer which is a separate absolutely-positioned div
   layered OVER the hero grid column — so they never push or clip content.    */
.badges-layer{
  position:absolute;
  /* covers the entire right column + a bit beyond */
  top:0;right:0;bottom:0;
  width:580px;        /* wide enough to hold mockup + badge bleed */
  pointer-events:none;
  z-index:3;
}
.ftag{
  position:absolute;
  background:rgba(7,9,26,0.92);
  backdrop-filter:blur(20px);
  border:1px solid var(--rim2);
  border-radius:14px;padding:10px 16px;
  display:flex;align-items:center;gap:10px;
  font-size:0.78rem;font-weight:600;
  color:var(--text);white-space:nowrap;
  box-shadow:0 12px 40px rgba(0,0,0,0.5);
  pointer-events:auto;
}
/* Badge 1 – top-right corner of the mockup */
.ftag-1{top:20px;right:0;animation:floatB 5s ease-in-out infinite}
/* Badge 2 – bottom-left of the mockup, fully inside the column */
.ftag-2{bottom:60px;left:0;animation:floatA 6.5s ease-in-out infinite;animation-delay:1s}
/* Badge 3 – mid-left, inside column */
.ftag-3{top:45%;left:0;animation:floatB 7s ease-in-out infinite;animation-delay:2s}

/* ── Stats ── */
.stats-wrap{padding:0 max(20px,calc((100vw - 1200px)/2));margin-bottom:80px}
.stats-inner{
  display:grid;grid-template-columns:repeat(4,1fr);
  border:1px solid var(--rim2);border-radius:24px;overflow:hidden;
  background:linear-gradient(135deg,rgba(99,102,241,0.05),rgba(34,211,238,0.02));
  backdrop-filter:blur(8px);
}
.stat-cell{padding:36px 32px;text-align:center;border-right:1px solid var(--rim);animation:numberCount 0.8s cubic-bezier(0.16,1,0.3,1) both}
.stat-cell:last-child{border-right:none}
.stat-n{font-family:'Satoshi',sans-serif;font-weight:900;font-size:3rem;line-height:1;letter-spacing:-0.04em;background:linear-gradient(135deg,var(--text) 30%,var(--indigo2));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:6px}
.stat-l{font-size:0.82rem;color:var(--text3);font-weight:500}

/* ── Section ── */
.section{padding:120px max(20px,calc((100vw - 1200px)/2))}
.sec-eye{font-size:0.7rem;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:var(--indigo2);margin-bottom:16px}
.sec-h{font-family:'Satoshi',sans-serif;font-weight:900;font-size:clamp(2.2rem,4vw,3.4rem);line-height:1.02;letter-spacing:-0.035em;color:var(--text);margin-bottom:16px}
.sec-sub{font-size:1rem;line-height:1.8;color:var(--text2);max-width:500px}

/* ── Bento Features ── */
.bento{display:grid;grid-template-columns:repeat(12,1fr);grid-auto-rows:auto;gap:16px;margin-top:72px}
.bento-cell{
  background:var(--mid);border:1px solid var(--rim);border-radius:20px;padding:32px;
  position:relative;overflow:hidden;
  transition:transform 0.4s cubic-bezier(0.16,1,0.3,1),border-color 0.35s,box-shadow 0.35s;
  animation:cardEntrance 0.8s cubic-bezier(0.16,1,0.3,1) both;
}
.bento-cell::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(99,102,241,0.06),rgba(34,211,238,0.03));opacity:0;transition:opacity 0.35s;border-radius:20px}
.bento-cell:hover{border-color:rgba(99,102,241,0.3);box-shadow:0 24px 64px rgba(0,0,0,0.4),0 0 0 1px rgba(99,102,241,0.15)}
.bento-cell:hover::before{opacity:1}
.bc1{grid-column:span 5}.bc2{grid-column:span 7}.bc3{grid-column:span 4}.bc4{grid-column:span 4}.bc5{grid-column:span 4}.bc6{grid-column:span 6}.bc7{grid-column:span 6}
.b-num{font-size:0.7rem;font-weight:800;letter-spacing:0.12em;color:var(--text3);margin-bottom:20px}
.b-icon{width:52px;height:52px;border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:1.5rem;margin-bottom:20px;position:relative;z-index:1}
.b-title{font-family:'Satoshi',sans-serif;font-weight:800;font-size:1.1rem;letter-spacing:-0.02em;color:var(--text);margin-bottom:10px;position:relative;z-index:1}
.b-desc{font-size:0.87rem;line-height:1.75;color:var(--text2);position:relative;z-index:1}

/* ── How it works ── */
.steps-outer{background:var(--deep);padding:120px max(20px,calc((100vw - 1200px)/2))}
.steps-wrap{display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:start}
.step-list{margin-top:48px;display:flex;flex-direction:column;gap:4px}
.step-row{display:flex;gap:20px;padding:22px 20px;border-radius:16px;cursor:pointer;transition:all 0.3s;border:1px solid transparent;position:relative}
.step-row.on{background:var(--lift);border-color:rgba(99,102,241,0.2);box-shadow:0 8px 32px rgba(0,0,0,0.3)}
.step-row:hover:not(.on){background:rgba(255,255,255,0.02)}
.step-badge{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-family:'Satoshi',sans-serif;font-size:0.8rem;font-weight:900;flex-shrink:0;transition:all 0.3s;letter-spacing:-0.02em}
.step-t{font-family:'Satoshi',sans-serif;font-weight:800;font-size:1rem;letter-spacing:-0.02em;color:var(--text);margin-bottom:5px}
.step-d{font-size:0.87rem;line-height:1.7;color:var(--text2)}
.steps-panel{
  position:sticky;top:100px;background:var(--mid);border:1px solid var(--rim2);
  border-radius:24px;overflow:hidden;min-height:340px;
  box-shadow:0 24px 80px rgba(0,0,0,0.4);animation:borderPulse 4s ease-in-out infinite;
}
.panel-scan{position:absolute;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,var(--indigo2),var(--cyan),transparent);animation:scanLine 2.5s linear infinite;opacity:0.6}
.panel-inner{padding:36px;position:relative;z-index:1}
.panel-tag{display:inline-flex;align-items:center;gap:6px;background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.2);border-radius:100px;padding:4px 12px;font-size:0.72rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--indigo2);margin-bottom:20px}

/* ── Marquee ── */
.marquee-section{padding:72px 0;overflow:hidden;border-top:1px solid var(--rim);border-bottom:1px solid var(--rim)}
.marquee-label{text-align:center;font-size:0.7rem;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:var(--text3);margin-bottom:28px}
.marquee-track{display:flex;gap:12px;animation:marquee 28s linear infinite;width:max-content}
.pill{display:flex;align-items:center;gap:9px;background:var(--mid);border:1px solid var(--rim2);border-radius:100px;padding:10px 20px;font-size:0.87rem;font-weight:600;color:var(--text2);white-space:nowrap;transition:all 0.2s;cursor:default}
.pill:hover{border-color:rgba(99,102,241,0.35);color:var(--text);background:var(--lift)}

/* ── Testimonials ── */
.testi-wrap{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:72px}
.tcard{background:var(--mid);border:1px solid var(--rim);border-radius:22px;padding:32px;transition:all 0.35s cubic-bezier(0.16,1,0.3,1);position:relative;overflow:hidden}
.tcard::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(99,102,241,0.5),transparent);opacity:0;transition:opacity 0.35s}
.tcard:hover{transform:translateY(-8px);border-color:rgba(99,102,241,0.25);box-shadow:0 32px 80px rgba(0,0,0,0.4)}
.tcard:hover::before{opacity:1}
.t-stars{font-size:0.85rem;letter-spacing:3px;color:var(--gold);margin-bottom:16px}
.t-quote{font-size:0.93rem;line-height:1.8;color:rgba(241,245,255,0.72);font-style:italic;margin-bottom:24px}
.t-person{display:flex;align-items:center;gap:12px}
.t-av{width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'Satoshi',sans-serif;font-weight:900;font-size:0.95rem;flex-shrink:0}
.t-name{font-family:'Satoshi',sans-serif;font-weight:800;font-size:0.9rem;color:var(--text);letter-spacing:-0.01em}
.t-role{font-size:0.76rem;color:var(--text3);margin-top:2px}

/* ── CTA ── */
.cta-wrap{padding:0 max(20px,calc((100vw - 1200px)/2));margin-bottom:100px}
.cta-box{
  border-radius:32px;
  background:linear-gradient(135deg,var(--lift) 0%,#0E0F2A 50%,var(--lift) 100%);
  border:1px solid rgba(99,102,241,0.2);padding:96px 60px;text-align:center;
  position:relative;overflow:hidden;box-shadow:0 0 0 1px rgba(255,255,255,0.03) inset;
}
.cta-box::before{content:'';position:absolute;top:-50%;left:50%;transform:translateX(-50%);width:800px;height:500px;background:radial-gradient(ellipse,rgba(99,102,241,0.15) 0%,rgba(34,211,238,0.05) 50%,transparent 70%);pointer-events:none}
.cta-box::after{content:'';position:absolute;bottom:-40%;left:50%;transform:translateX(-50%);width:400px;height:300px;background:radial-gradient(ellipse,rgba(251,191,36,0.08) 0%,transparent 70%);pointer-events:none}
.cta-h{font-family:'Satoshi',sans-serif;font-weight:900;font-size:clamp(2rem,4vw,3.5rem);letter-spacing:-0.04em;line-height:1.0;color:var(--text);max-width:640px;margin:0 auto 20px;position:relative;z-index:1}
.cta-sub{font-size:1rem;line-height:1.75;color:var(--text2);max-width:440px;margin:0 auto 40px;position:relative;z-index:1}
.cta-btns{display:flex;gap:14px;justify-content:center;flex-wrap:wrap;position:relative;z-index:1}
.cta-ring{position:absolute;border-radius:50%;border:1px solid rgba(99,102,241,0.07);pointer-events:none;left:50%;top:50%;transform:translate(-50%,-50%)}

/* ── Footer ── */
.footer{border-top:1px solid var(--rim);padding:32px max(20px,calc((100vw - 1200px)/2));display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px}
.f-copy{font-size:0.8rem;color:var(--text3)}
.f-links{display:flex;gap:24px}
.f-link{font-size:0.8rem;color:var(--text3);background:none;border:none;cursor:pointer;transition:color 0.2s}
.f-link:hover{color:var(--indigo2)}

/* ── Responsive ── */
@media(max-width:960px){
  .hero-grid{grid-template-columns:1fr;gap:48px}
  .hero-visual,.ftag-2,.ftag-3{display:none}
  .bento{grid-template-columns:1fr}
  .bc1,.bc2,.bc3,.bc4,.bc5,.bc6,.bc7{grid-column:span 1}
  .steps-wrap{grid-template-columns:1fr}
  .steps-panel{display:none}
  .testi-wrap{grid-template-columns:1fr}
  .stats-inner{grid-template-columns:1fr 1fr}
  .stat-cell{border-right:none;border-bottom:1px solid var(--rim)}
  .stat-cell:nth-child(2n){border-right:none}
  .cta-box{padding:60px 24px}
  .nav-hide{display:none}
}
`;

/* ─── Data ──────────────────────────────────────────────────────────────────── */
const HERO_DOCS = [
  { icon:'🪪', name:'Aadhaar Card',     sub:'Family · Government ID',   badge:'Verified', bc:'b-ok',   bg:'rgba(52,211,153,0.1)' },
  { icon:'🛂', name:'Passport – Priya', sub:'Expires in 47 days ⚠️',   badge:'Expiring', bc:'b-warn', bg:'rgba(244,114,182,0.1)' },
  { icon:'💳', name:'PAN Card',         sub:'Rajesh · Permanent',       badge:'Secure',   bc:'b-new',  bg:'rgba(34,211,238,0.1)' },
  { icon:'🎓', name:'B.Tech Degree',    sub:'Arjun · Added 2 days ago', badge:'New',      bc:'b-gold', bg:'rgba(251,191,36,0.1)' },
];

const FEATURES = [
  { num:'01', icon:'🔍', title:'Smart OCR Engine',         span:'bc1', ibg:'rgba(99,102,241,0.15)',  ic:'#818CF8', desc:'Upload any photo or PDF — even crumpled Aadhaar cards forwarded on WhatsApp. DocBox reads every field, detects the document type, and classifies it in seconds across English, Hindi, Marathi and all Indian regional languages.' },
  { num:'02', icon:'👨‍👩‍👧‍👦', title:'Family Vault',              span:'bc2', ibg:'rgba(34,211,238,0.12)',  ic:'#22D3EE', desc:'One vault, every member. Parents, spouse, kids — each gets their own space with their own history and their own documents. You control exactly who sees what, down to the individual file.' },
  { num:'03', icon:'🔑', title:'Granular Access Control',   span:'bc3', ibg:'rgba(52,211,153,0.12)',  ic:'#34D399', desc:'View, Download, or Share — set permissions per document or per category. Nobody sees anything you haven\'t explicitly allowed.' },
  { num:'04', icon:'⏰', title:'Expiry Intelligence',        span:'bc4', ibg:'rgba(244,114,182,0.12)', ic:'#F472B6', desc:'DocBox spots expiry dates on upload and starts alerting you 90 days in advance. Never scramble for a passport renewal again.' },
  { num:'05', icon:'🔗', title:'Secure Share Links',         span:'bc5', ibg:'rgba(251,191,36,0.12)',  ic:'#FBBF24', desc:'One-click time-limited links. No login needed for the recipient — perfect for government portals and college admissions.' },
  { num:'06', icon:'🛡️', title:'Bank-Grade Security',        span:'bc6', ibg:'rgba(99,102,241,0.12)',  ic:'#818CF8', desc:'AES-256 encryption at rest. TLS in transit. JWT auth, RBAC, and a full immutable audit log of every action.' },
  { num:'07', icon:'🚨', title:'Emergency Access',           span:'bc7', ibg:'rgba(244,114,182,0.12)', ic:'#F472B6', desc:'Designate a trusted family member who can request emergency access when you\'re unreachable — with a complete audit trail.' },
];

const STEPS = [
  { num:'01', title:'Upload once',      desc:'Drag a photo or PDF. Works with phone camera shots, WhatsApp forwards, and scanned PDFs alike.' },
  { num:'02', title:'Auto-organised',   desc:'OCR extracts text, detects the document type, and files it under the right family member — instantly.' },
  { num:'03', title:'Set who sees what',desc:'Choose exactly which family members can access, share, or download each document. Per-document granularity.' },
  { num:'04', title:'Find it in 3s',    desc:'Search by name, type, or member. Pull up any document on any device, anywhere in the world.' },
];

const TESTIMONIALS = [
  { av:'R', name:'Rajesh Patil', role:'Govt. Employee, Pune', c:'#818CF8', bg:'rgba(129,140,248,0.1)', text:'"My daughter\'s college admission needed 8 documents in 4 hours. I shared all of them with one link. DocBox literally saved the admission."' },
  { av:'P', name:'Priya Mehta', role:'Business Owner, Mumbai', c:'#22D3EE', bg:'rgba(34,211,238,0.1)', text:'"I manage documents for 6 family members across 3 cities. The permission system is so clean — everyone sees only what they need."' },
  { av:'A', name:'Arjun Nair', role:'Software Engineer, Bangalore', c:'#34D399', bg:'rgba(52,211,153,0.1)', text:'"The expiry alert for my passport came 3 months early. I renewed with zero stress. Would have completely missed it otherwise."' },
];

const PILLS = [
  '🪪 Aadhaar Card','💳 PAN Card','🛂 Passport','🚗 Driving License','🗳️ Voter ID',
  '📄 Income Certificate','🏠 Domicile Certificate','📋 Caste Certificate','👶 Birth Certificate',
  '💍 Marriage Certificate','🎓 Degree Certificate','🏥 Medical Reports','🏘️ Property Documents',
  '🛡️ Insurance Papers','💵 ITR Documents','🧾 Bills & Receipts','💼 Offer Letter',
  '🚙 RC Book','⚖️ Legal Agreements','🎫 Ration Card','📑 Bonafide Certificate',
];

/* ─── Aurora Canvas ──────────────────────────────────────────────────────────── */
function AuroraCanvas() {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current;
    const ctx = c.getContext('2d');
    let raf, t = 0;
    const resize = () => { c.width = window.innerWidth; c.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);
    const orbs = [
      { x:0.2,  y:0.3,  r:0.38, hue:240, s:0.0003 },
      { x:0.82, y:0.22, r:0.32, hue:190, s:0.00042 },
      { x:0.5,  y:0.85, r:0.42, hue:270, s:0.00028 },
      { x:0.1,  y:0.72, r:0.26, hue:210, s:0.00055 },
      { x:0.9,  y:0.6,  r:0.22, hue:160, s:0.0006  },
    ];
    const draw = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      orbs.forEach(o => {
        const x = (o.x + Math.sin(t * o.s * 1000 + o.hue) * 0.12) * c.width;
        const y = (o.y + Math.cos(t * o.s * 800  + o.hue) * 0.1)  * c.height;
        const r = o.r * Math.min(c.width, c.height);
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `hsla(${o.hue},85%,65%,0.13)`);
        g.addColorStop(0.5, `hsla(${o.hue},85%,65%,0.04)`);
        g.addColorStop(1, `hsla(${o.hue},85%,65%,0)`);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      });
      t += 16;
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas id="aurora-canvas" ref={ref} />;
}

/* ─── 3D Tilt Card ───────────────────────────────────────────────────────────── */
function TiltCard({ children, className, style, delay = 0 }) {
  const ref = useRef(null);
  const onMove = useCallback(e => {
    const el = ref.current; if (!el) return;
    const r  = el.getBoundingClientRect();
    const x  = (e.clientX - r.left)  / r.width  - 0.5;
    const y  = (e.clientY - r.top)   / r.height - 0.5;
    el.style.transform = `perspective(900px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg) translateY(-6px)`;
  }, []);
  const onLeave = useCallback(() => { if (ref.current) ref.current.style.transform = ''; }, []);
  return (
    <div ref={ref} className={className}
      style={{ ...style, animationDelay:`${delay}s` }}
      onMouseMove={onMove} onMouseLeave={onLeave}>
      {children}
    </div>
  );
}

/* ─── Step Panels ────────────────────────────────────────────────────────────── */
const StepPanels = [
  () => (
    <div>
      <span className="panel-tag"><span style={{color:'#22D3EE'}}>●</span>&nbsp;Upload</span>
      <div style={{border:'2px dashed rgba(99,102,241,0.25)',borderRadius:16,padding:'28px 20px',background:'rgba(99,102,241,0.04)',textAlign:'center'}}>
        <div style={{fontSize:'2.8rem',marginBottom:14}}>📤</div>
        <div style={{fontSize:'0.9rem',color:'var(--text2)',marginBottom:6,fontWeight:700}}>Drop your document here</div>
        <div style={{fontSize:'0.78rem',color:'var(--text3)',marginBottom:20}}>PDF, JPG, PNG — blurry WhatsApp photos work too</div>
        <div style={{background:'linear-gradient(135deg,#6366F1,#22D3EE)',color:'#fff',padding:'10px 24px',borderRadius:8,fontSize:'0.85rem',fontWeight:700,display:'inline-block',cursor:'pointer'}}>Browse files</div>
      </div>
      <div style={{marginTop:14,display:'flex',gap:8,flexWrap:'wrap'}}>
        {['PDF','JPG','PNG','HEIC','WEBP'].map(f=>(
          <span key={f} style={{padding:'4px 10px',background:'var(--lift)',border:'1px solid var(--rim2)',borderRadius:6,fontSize:'0.72rem',color:'var(--text3)',fontWeight:700}}>{f}</span>
        ))}
      </div>
    </div>
  ),
  () => (
    <div>
      <span className="panel-tag"><span style={{color:'#FBBF24'}}>◈</span>&nbsp;Processing…</span>
      {[['Document type','Aadhaar Card ✓'],['Name','Rajesh Kumar Patil'],['DOB','14 Aug 1982'],['Aadhaar No.','XXXX XXXX 4321'],['Category','Government ID']].map(([k,v])=>(
        <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:'1px solid var(--rim)'}}>
          <span style={{fontSize:'0.82rem',color:'var(--text3)'}}>{k}</span>
          <span style={{fontSize:'0.82rem',color:'var(--text)',fontWeight:700}}>{v}</span>
        </div>
      ))}
      <div style={{marginTop:18,padding:'12px 16px',background:'rgba(52,211,153,0.07)',border:'1px solid rgba(52,211,153,0.2)',borderRadius:10,fontSize:'0.82rem',color:'#34D399',fontWeight:700}}>
        ✓ Filed under Rajesh → Government IDs
      </div>
    </div>
  ),
  () => (
    <div>
      <span className="panel-tag">🔑&nbsp;Access settings</span>
      <div style={{fontSize:'0.85rem',fontWeight:700,color:'var(--text)',marginBottom:14}}>Aadhaar Card</div>
      {[['Priya (spouse)','View + Download','rgba(52,211,153,0.12)','#34D399'],['Arjun (son)','View only','rgba(34,211,238,0.12)','#22D3EE'],['Kavya (daughter)','No access','rgba(244,114,182,0.12)','#F472B6']].map(([who,perm,bg,c])=>(
        <div key={who} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 14px',background:'rgba(255,255,255,0.025)',borderRadius:10,marginBottom:8,border:'1px solid var(--rim)'}}>
          <span style={{fontSize:'0.85rem',color:'var(--text)',fontWeight:600}}>{who}</span>
          <span style={{fontSize:'0.7rem',fontWeight:800,padding:'3px 10px',borderRadius:100,background:bg,color:c}}>{perm}</span>
        </div>
      ))}
    </div>
  ),
  () => (
    <div style={{textAlign:'center',padding:'8px 0'}}>
      <span className="panel-tag">📱&nbsp;Any device</span>
      <div style={{fontSize:'3.2rem',margin:'16px 0 10px'}}>📱</div>
      <div style={{fontSize:'1rem',fontWeight:800,color:'var(--text)',marginBottom:6,letterSpacing:'-0.02em'}}>Aadhaar Card</div>
      <div style={{fontSize:'0.82rem',color:'var(--text3)',marginBottom:24}}>Tap to view · Share · Download</div>
      <div style={{display:'flex',gap:10,justifyContent:'center'}}>
        {[['View',false],['Share link',true],['Download',false]].map(([a,primary])=>(
          <div key={a} style={{padding:'9px 16px',borderRadius:9,background:primary?'linear-gradient(135deg,#6366F1,#22D3EE)':'var(--lift)',color:primary?'#fff':'var(--text)',fontSize:'0.8rem',fontWeight:700,cursor:'pointer',border:primary?'none':'1px solid var(--rim2)'}}>{a}</div>
        ))}
      </div>
    </div>
  ),
];

/* ─── Component ─────────────────────────────────────────────────────────────── */
export default function LandingPage() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const el = document.createElement('style');
    el.textContent = CSS;
    document.head.appendChild(el);
    return () => document.head.removeChild(el);
  }, []);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setActiveStep(s => (s + 1) % STEPS.length), 2800);
    return () => clearInterval(t);
  }, []);

  const go = id => document.getElementById(id)?.scrollIntoView({ behavior:'smooth' });
  const PanelContent = StepPanels[activeStep];
  const pills = [...PILLS, ...PILLS];

  return (
    <>
      <AuroraCanvas />
      <div className="page-wrap">

        {/* ═══ NAV ═══ */}
        <nav className={`nav${scrolled?' solid':''}`}>
          <div className="nav-inner">
            <a className="logo" href="#">
              <div className="logo-mark">🔐</div>
              DocBox
            </a>
            <div style={{display:'flex',gap:32}} className="nav-hide">
              {[['features','Features'],['how-it-works','How it works'],['docs','Documents'],['testimonials','Reviews']].map(([id,l])=>(
                <button key={id} className="nav-a" onClick={()=>go(id)}>{l}</button>
              ))}
            </div>
            <button className="btn-n nav-hide" onClick={()=>navigate('/login')}>Sign in</button>
            <button className="btn-cta" onClick={()=>navigate('/signup')}>Get started →</button>
          </div>
        </nav>

        {/* ═══ HERO ═══ */}
        <section className="hero">
          {[600,900,1200].map((s,i)=>(
            <div key={s} className="orbit-ring" style={{width:s,height:s,left:`calc(75% - ${s/2}px)`,top:`calc(50% - ${s/2}px)`,opacity:0.4-i*0.1}} />
          ))}
          <div className="blob" style={{width:500,height:500,background:'rgba(99,102,241,0.07)',top:'-10%',left:'60%',animationDuration:'15s'}} />
          <div className="blob" style={{width:350,height:350,background:'rgba(34,211,238,0.05)',bottom:'10%',right:'55%',animationDuration:'18s',animationDelay:'3s'}} />

          <div className="hero-grid">
            <div>
              <div className="eyebrow" style={{animation:'fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.05s both'}}>
                <span className="eyebrow-dot" />
                Built for Indian families
              </div>
              <h1 className="hero-h1" style={{animation:'fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.15s both'}}>
                Every document.<br />
                <span className="grad-text">One vault.</span><br />
                <span style={{color:'var(--text2)',fontSize:'0.55em',fontWeight:300,fontFamily:"'Playfair Display',serif",fontStyle:'italic',letterSpacing:'0em'}}>always at hand.</span>
              </h1>
              <p className="hero-sub" style={{animation:'fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.28s both'}}>
                Stop hunting through WhatsApp chats and physical drawers. DocBox is one
                secure vault for every Aadhaar, PAN, passport and certificate your family
                owns — with smart expiry alerts and one-tap sharing.
              </p>
              <div className="cta-row" style={{animation:'fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.4s both'}}>
                <button className="btn-hero" onClick={()=>navigate('/signup')}>Start free — no card needed →</button>
                <button className="btn-ghost2" onClick={()=>navigate('/login')}>Sign in</button>
              </div>
              <div className="trust-row" style={{animation:'fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.55s both'}}>
                {['Free to start','5 GB storage','End-to-end encrypted','4+ Indian languages'].map(t=>(
                  <div key={t} className="trust-item"><span className="trust-icon">✦</span>{t}</div>
                ))}
              </div>
            </div>

            {/*
              Layout:
              .hero-visual has padding-left:140px and padding-top/bottom:40px
              Badges sit in the left 130px strip and the top/bottom buffer zones.
              The mockup card (.mock-shell) fills the remaining right area.
              Nothing bleeds outside its own padding box → zero overlap.
            */}
            <div className="hero-visual" style={{animation:'slideRight 0.9s cubic-bezier(0.16,1,0.3,1) 0.3s both'}}>

              {/* ── Mockup card ── */}
              <div className="mock-shell">
                <div className="scan" />
                <div className="mock-topbar">
                  <div className="dot-r"/><div className="dot-y"/><div className="dot-g"/>
                  <span className="mock-title">DocBox — Family Vault</span>
                </div>
                {HERO_DOCS.map(d=>(
                  <div key={d.name} className="doc-row-m">
                    <div className="d-icon" style={{background:d.bg}}>{d.icon}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div className="d-name">{d.name}</div>
                      <div className="d-sub">{d.sub}</div>
                    </div>
                    <span className={`d-badge ${d.bc}`}>{d.badge}</span>
                  </div>
                ))}
                <div className="mock-footer">
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    <div className="mock-avatars">
                      {[['#818CF8','rgba(129,140,248,0.15)','R'],['#22D3EE','rgba(34,211,238,0.15)','P'],['#34D399','rgba(52,211,153,0.15)','A'],['#FBBF24','rgba(251,191,36,0.15)','K']].map(([c,bg,l])=>(
                        <div key={l} className="mock-av" style={{background:bg,color:c}}>{l}</div>
                      ))}
                    </div>
                    <span style={{fontSize:'0.74rem',color:'var(--text3)'}}>4 members</span>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:6,fontSize:'0.74rem',color:'var(--text3)'}}>
                    <div className="sync-dot"/>All synced
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ STATS ═══ */}
        <div className="stats-wrap">
          <div className="stats-inner">
            {[['20+','Document types','0.1s'],['100%','Private & encrypted','0.2s'],['5 GB','Free family storage','0.3s'],['4+','Indian languages','0.4s']].map(([n,l,d])=>(
              <div key={l} className="stat-cell" style={{animationDelay:d}}>
                <div className="stat-n">{n}</div>
                <div className="stat-l">{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ═══ FEATURES ═══ */}
        <section className="section" id="features">
          <div className="sec-eye">What DocBox does</div>
          <h2 className="sec-h">Everything your documents<br />will ever need</h2>
          <p className="sec-sub">From upload to access control to expiry alerts — DocBox handles the full lifecycle of every document your family owns.</p>
          <div className="bento">
            {FEATURES.map((f,i)=>(
              <TiltCard key={f.num} className={`bento-cell ${f.span}`} delay={i*0.07}>
                <div className="b-num">— {f.num}</div>
                <div className="b-icon" style={{background:f.ibg}}>{f.icon}</div>
                <div className="b-title">{f.title}</div>
                <div className="b-desc">{f.desc}</div>
              </TiltCard>
            ))}
          </div>
        </section>

        {/* ═══ HOW IT WORKS ═══ */}
        <div className="steps-outer" id="how-it-works">
          <div className="steps-wrap">
            <div>
              <div className="sec-eye">Simple process</div>
              <h2 className="sec-h">From chaos to organised<br />in 60 seconds</h2>
              <div className="step-list">
                {STEPS.map((s,i)=>(
                  <div key={s.num} className={`step-row${activeStep===i?' on':''}`} onClick={()=>setActiveStep(i)}>
                    <div className="step-badge" style={{
                      background:activeStep===i?'rgba(99,102,241,0.15)':'rgba(255,255,255,0.04)',
                      color:activeStep===i?'var(--indigo2)':'var(--text3)',
                      boxShadow:activeStep===i?'0 0 20px rgba(99,102,241,0.2)':'none',
                    }}>{s.num}</div>
                    <div>
                      <div className="step-t">{s.title}</div>
                      <div className="step-d">{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="steps-panel">
                <div className="panel-scan" />
                <div className="panel-inner"><PanelContent /></div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ MARQUEE ═══ */}
        <div className="marquee-section" id="docs">
          <div className="marquee-label">20+ document types · recognised automatically</div>
          <div style={{display:'flex',gap:12}}>
            <div className="marquee-track">
              {pills.map((p,i)=><div key={i} className="pill">{p}</div>)}
            </div>
          </div>
        </div>

        {/* ═══ TESTIMONIALS ═══ */}
        <section className="section" id="testimonials">
          <div style={{textAlign:'center'}}>
            <div className="sec-eye">Real families</div>
            <h2 className="sec-h" style={{maxWidth:520,margin:'0 auto 16px'}}>Trusted across India</h2>
            <p className="sec-sub" style={{margin:'0 auto'}}>From college admissions in Pune to passport renewals in Bangalore — DocBox is there when documents matter most.</p>
          </div>
          <div className="testi-wrap">
            {TESTIMONIALS.map((t,i)=>(
              <TiltCard key={t.name} className="tcard" delay={i*0.1}>
                <div className="t-stars">★★★★★</div>
                <p className="t-quote">{t.text}</p>
                <div className="t-person">
                  <div className="t-av" style={{background:t.bg,color:t.c}}>{t.av}</div>
                  <div>
                    <div className="t-name">{t.name}</div>
                    <div className="t-role">{t.role}</div>
                  </div>
                </div>
              </TiltCard>
            ))}
          </div>
        </section>

        {/* ═══ CTA ═══ */}
        <div className="cta-wrap">
          <div className="cta-box">
            {[300,500,700].map(s=>(
              <div key={s} className="cta-ring" style={{width:s,height:s}} />
            ))}
            <h2 className="cta-h">
              Your family's documents deserve better than a{' '}
              <span className="gold-text italic-serif">WhatsApp group.</span>
            </h2>
            <p className="cta-sub">Join thousands of Indian families who found every document they needed, exactly when they needed it.</p>
            <div className="cta-btns">
              <button className="btn-hero" onClick={()=>navigate('/signup')}>Create free account →</button>
              <button className="btn-ghost2" onClick={()=>navigate('/login')}>Sign in</button>
            </div>
          </div>
        </div>

        {/* ═══ FOOTER ═══ */}
        <footer className="footer">
          <div className="logo" style={{fontSize:'1rem',marginRight:0}}>
            <div className="logo-mark" style={{width:28,height:28,fontSize:'0.82rem'}}>🔐</div>
            DocBox
          </div>
          <span className="f-copy">© {new Date().getFullYear()} DocBox · Secure family document management for India</span>
          <div className="f-links">
            {['Privacy','Terms','Support'].map(l=>(
              <button key={l} className="f-link">{l}</button>
            ))}
          </div>
        </footer>
      </div>
    </>
  );
}