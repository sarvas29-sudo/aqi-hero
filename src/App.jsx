import { useState, useRef, useEffect, useCallback } from "react";

/* ══════════════════════════════════════════════════════
   WEB AUDIO ENGINE
══════════════════════════════════════════════════════ */
function useAudio() {
  const ctx = useRef(null);
  const bgNodes = useRef([]);
  const muted = useRef(false);
  const getCtx = useCallback(() => {
    if (!ctx.current) ctx.current = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.current.state === "suspended") ctx.current.resume();
    return ctx.current;
  }, []);
  // Ambient background — original energy, buzz removed via triangle waves + lowpass
  const startBg = useCallback(() => {
    const c = getCtx();
    const master = c.createGain(); master.gain.value = 0.08; master.connect(c.destination);
    // Lowpass filter on drone channel — cuts harsh upper harmonics above 600 Hz
    const lp = c.createBiquadFilter();
    lp.type = "lowpass"; lp.frequency.value = 600; lp.Q.value = 0.7;
    lp.connect(master);
    // Drone — triangle waves: warm and resonant like sawtooth but zero buzz
    const droneFreqs = [130.81, 196.00, 261.63, 130.81];
    droneFreqs.forEach((f, i) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = "triangle";
      o.frequency.value = f;
      g.gain.value = 0.15 / (i + 1);
      o.connect(g); g.connect(lp);
      o.start();
      bgNodes.current.push(o);
    });
    // Melodic loop — original pace (800ms), original energy
    const notes = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 392.00, 329.63];
    let noteIdx = 0;
    function playNote() {
      if (muted.current) return;
      const c2 = getCtx();
      const o = c2.createOscillator();
      const g = c2.createGain();
      const fil = c2.createBiquadFilter();
      fil.type = "lowpass"; fil.frequency.value = 1200;
      o.type = "sine"; o.frequency.value = notes[noteIdx % notes.length];
      g.gain.setValueAtTime(0, c2.currentTime);
      g.gain.linearRampToValueAtTime(0.18, c2.currentTime + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, c2.currentTime + 1.2);
      o.connect(fil); fil.connect(g); g.connect(master);
      o.start(); o.stop(c2.currentTime + 1.3);
      noteIdx++;
    }
    const id = setInterval(playNote, 800);
    bgNodes.current.push({ stop: () => clearInterval(id) });
  }, [getCtx]);
  const stopBg = useCallback(() => {
    const c = ctx.current;
    bgNodes.current.forEach(n => {
      try {
        if (typeof n.stop === "function") {
          try { n.stop(c ? c.currentTime + 0.15 : 0); } catch(e) {}
        } else if (n && typeof n === "object" && n.stop) {
          n.stop();
        }
      } catch(e) {}
    });
    bgNodes.current = [];
  }, []);
  // Deploy action sound — satisfying "whoosh + chime"
  const playDeploy = useCallback(() => {
    const c = getCtx();
    // Whoosh
    const buf = c.createBuffer(1, c.sampleRate * 0.4, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = c.createBufferSource(); src.buffer = buf;
    const fil = c.createBiquadFilter(); fil.type = "bandpass"; fil.frequency.value = 800;
    const g = c.createGain(); g.gain.setValueAtTime(0.3, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.35);
    src.connect(fil); fil.connect(g); g.connect(c.destination); src.start();
    // Chime sequence
    [523.25, 659.25, 783.99, 1046.50].forEach((f, i) => {
      const o = c.createOscillator(); const og = c.createGain();
      o.type = "sine"; o.frequency.value = f;
      og.gain.setValueAtTime(0, c.currentTime + i * 0.08);
      og.gain.linearRampToValueAtTime(0.25, c.currentTime + i * 0.08 + 0.02);
      og.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.08 + 0.5);
      o.connect(og); og.connect(c.destination);
      o.start(c.currentTime + i * 0.08); o.stop(c.currentTime + i * 0.08 + 0.55);
    });
  }, [getCtx]);
  // Season change — deep gong
  const playSeasonChange = useCallback(() => {
    const c = getCtx();
    [80, 160, 240].forEach((f, i) => {
      const o = c.createOscillator(); const g = c.createGain();
      o.type = "sine"; o.frequency.value = f;
      g.gain.setValueAtTime(0.2, c.currentTime + i * 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 2.5);
      o.connect(g); g.connect(c.destination);
      o.start(c.currentTime + i * 0.05); o.stop(c.currentTime + 2.6);
    });
  }, [getCtx]);
  // AQI improved — ascending sparkle
  const playImprove = useCallback(() => {
    const c = getCtx();
    [400, 600, 800, 1000, 1200].forEach((f, i) => {
      const o = c.createOscillator(); const g = c.createGain();
      o.type = "triangle"; o.frequency.value = f;
      g.gain.setValueAtTime(0.15, c.currentTime + i * 0.06);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.06 + 0.3);
      o.connect(g); g.connect(c.destination);
      o.start(c.currentTime + i * 0.06); o.stop(c.currentTime + i * 0.06 + 0.35);
    });
  }, [getCtx]);
  return { startBg, stopBg, playDeploy, playSeasonChange, playImprove, muted };
}

/* ══════════════════════════════════════════════════════
   SEASONS — real Delhi AQI data
══════════════════════════════════════════════════════ */
const SEASONS = [
  { id:"spring", name:"Spring", months:"Mar–Apr", emoji:"🌸", baseAqi:172, spike:0,
    eventDesc:"", tip:"Good time to plant trees and build infrastructure!",
    smogAlpha:0.25, skyA:"#a8d8f0", skyB:"#c8eac0", groundA:"#5a9e3a", groundB:"#4a8e2a" },
  { id:"summer", name:"Summer", months:"May–Jun", emoji:"☀️", baseAqi:175, spike:45,
    eventDesc:"🏗️ Construction dust storms peak across Delhi!",
    tip:"Water spraying and nets stop dust from spreading.", smogAlpha:0.42,
    skyA:"#d4a040", skyB:"#e8c870", groundA:"#7aaa40", groundB:"#5a8a28" },
  { id:"monsoon", name:"Monsoon", months:"Jul–Sep", emoji:"🌧️", baseAqi:92, spike:-38,
    eventDesc:"🌧️ Monsoon rains wash the sky clean!",
    tip:"Cleanest season — invest in green infrastructure now.", smogAlpha:0.05,
    skyA:"#2a78c8", skyB:"#5aaae0", groundA:"#3aaa3a", groundB:"#2a8a2a" },
  { id:"harvest", name:"Harvest", months:"Oct–Nov", emoji:"🌾", baseAqi:294, spike:95,
    eventDesc:"🌾 Farmers burn stubble — smoke blankets Delhi for weeks!",
    tip:"Stubble burning = 35% of Delhi's worst winter pollution.", smogAlpha:0.68,
    skyA:"#7a4a10", skyB:"#b8721a", groundA:"#8a9a3a", groundB:"#6a7a28" },
  { id:"diwali", name:"Diwali", months:"November", emoji:"🪔", baseAqi:368, spike:120,
    eventDesc:"🎆 Diwali firecrackers spike PM2.5 to 16× safe limits!",
    tip:"One Diwali night adds more PM2.5 than 3 weeks of traffic.", smogAlpha:0.82,
    skyA:"#1a0800", skyB:"#3a1200", groundA:"#6a6a2a", groundB:"#4a4a18" },
];

/* ══════════════════════════════════════════════════════
   HOTSPOTS — Delhi locations on 800×580 canvas
══════════════════════════════════════════════════════ */
const HOTSPOTS = [
  { id:"redfort",  x:490, y:158, icon:"🏯", label:"Red Fort",    size:52,
    desc:"Old Delhi — 2-wheelers & 3-wheelers dominate; they cause 50% of local transport PM2.5",
    actions:[
      { id:"cng",    emoji:"🛺", label:"CNG & EV Autos", cost:2, drop:14, evidence:"strong",
        detail:"CNG autos emit negligible PM directly (diesel emits 76% of vehicle PM; CNG near 0%). Delhi's 80,000+ autos converted to CNG showed measurable local PM reductions. 2- and 3-wheelers together account for ~50% of on-road transport PM2.5. Source: IIT Kanpur/TERI 2018, vehicular emission studies." },
      { id:"bsvi",   emoji:"🚗", label:"BS-VI Enforcement", cost:2, drop:18, evidence:"strong",
        detail:"BS-VI vehicle standards (introduced Delhi 2018) cut PM tailpipe emissions by ~80% vs BS-IV. Real-world testing (ICCT 2024) shows many vehicles still exceed limits — strict enforcement could yield 15–20 AQI point gains city-wide. Source: Science Advances 2024, ICCT True Initiative 2024." },
      { id:"oddeven", emoji:"🔢", label:"Odd-Even Scheme",  cost:1, drop:5, evidence:"weak",
        detail:"⚠️ Contested evidence. Studies show only 4–6% PM2.5 reduction (IIT Delhi, CPCB 2016). EPIC/UChicago found 14–16% daytime reduction in Jan 2016, but zero effect in April 2016. Car trips fell <20% as 2-wheelers increased 17%. Most studies found no meaningful city-wide PM2.5 change. Source: Mohan et al. 2017, AAQR 2022." },
    ]},
  { id:"indiagate", x:378, y:295, icon:"🏛️", label:"India Gate", size:50,
    desc:"Central Delhi — transport is 17–28% of city-wide PM2.5; buses are a small but cleanable share",
    actions:[
      { id:"ebus",   emoji:"🚌", label:"Electric Bus Fleet", cost:3, drop:12, evidence:"moderate",
        detail:"Full electrification of Delhi's bus fleet could cut 74% of bus PM2.5 emissions (Kyushu Univ. 2022). But buses are a small share of total vehicles — city-wide PM2.5 impact estimated at 8–12 AQI points. 25% of Delhi buses were electric by July 2024. Source: Journal of Environmental Management 2022." },
      { id:"metro",  emoji:"🚇", label:"Expand Metro",       cost:4, drop:20, evidence:"moderate",
        detail:"Delhi Metro removes an estimated 390,000 car trips/day. Modelling suggests each major corridor reduces local PM2.5 by 5–10%. But private vehicle numbers keep rising — CSE 2024 found AQI unchanged despite metro expansion, as new cars fill the gap. Source: CSE Mobility Report 2024." },
      { id:"congestion", emoji:"🛣️", label:"Congestion Pricing", cost:3, drop:15, evidence:"moderate",
        detail:"At peak hours (5–9pm), NO2 is 2.3× higher than midday due to congestion. Reducing peak traffic speed from 15 to 25 km/h cuts emissions significantly. London's congestion charge cut traffic PM by 12%. Not yet tried in Delhi. Source: CSE 2024, TRL London study." },
    ]},
  { id:"yamuna",  x:570, y:312, icon:"🌊", label:"Yamuna",       size:46,
    desc:"Open waste burning on Yamuna floodplain — biomass/waste burning is 12–14% of Delhi PM2.5",
    actions:[
      { id:"noburn", emoji:"🚯", label:"Ban Waste Burning",  cost:2, drop:20, evidence:"strong",
        detail:"Biomass and waste burning contributes 12–14% of Delhi PM2.5 year-round (TERI/CPCB source apportionment). Open burning ban with composting alternatives reduces this source by ~80%. Enforcement is the main challenge — monitoring via satellite fire counts helps. Source: TERI 2018, CPCB source apportionment." },
      { id:"gbelt",  emoji:"🌿", label:"Yamuna Green Belt",  cost:2, drop:6, evidence:"weak",
        detail:"⚠️ Limited evidence. Trees absorb some PM2.5 but studies show urban forests reduce city-wide AQI by only 1–3 points — they can't filter the volume of pollution Delhi produces. Local benefits near the belt are real. Best as a co-benefit with other actions, not a standalone solution. Source: Urban forestry meta-analysis, CSE." },
    ]},
  { id:"farms",   x:142, y:98,  icon:"🌾", label:"NCR Farms",    size:54,
    desc:"Stubble burning = 30–35% of Delhi PM2.5 in Oct–Nov, but only ~8% averaged across the year",
    actions:[
      { id:"biod",   emoji:"🧪", label:"Bio-Decomposer Spray", cost:2, drop:40, evidence:"strong",
        detail:"IARI's Pusa bio-decomposer converts paddy stubble to compost in 20 days at ₹20/acre, eliminating the need to burn. Used on 4 lakh+ acres in Delhi-NCR in 2022. Stubble burning contributes 30–35% of Delhi PM2.5 during Oct–Nov (PMC 2023 modelling study). Reducing fires by 50% = ~15–17% seasonal AQI improvement. Source: PMC/Atmosphere 2023, IARI." },
      { id:"seeder", emoji:"🚜", label:"Happy Seeder Subsidy",  cost:3, drop:35, evidence:"strong",
        detail:"Happy Seeder machines let farmers sow directly into stubble without burning. Subsidies for 2 lakh farmers in Punjab stopped burning on 3M+ acres. Each 10% reduction in fire counts in Punjab/Haryana reduces Delhi Nov PM2.5 by roughly 3–5 µg/m³. Source: Ecosystem Health & Sustainability 2020, Punjab govt. data." },
      { id:"crop",   emoji:"🌽", label:"Crop Diversification",  cost:4, drop:50, evidence:"moderate",
        detail:"Shifting rice area to maize, vegetables, or pulses permanently removes paddy stubble — the root cause. A 20% shift in Punjab rice acreage would eliminate ~7M tonnes of burnable stubble/year. Requires sustained MSP reform and water policy changes. Highest long-term impact. Source: IARI, Punjab Agriculture Dept." },
    ]},
  { id:"construct",x:205, y:408, icon:"🏗️", label:"Sites",       size:48,
    desc:"Road dust + construction = 15–20% of Delhi PM2.5; zeroing hotspot dust gives up to 28% local reduction",
    actions:[
      { id:"nets",   emoji:"🕸️", label:"Anti-Smog Nets + Barriers", cost:1, drop:18, evidence:"strong",
        detail:"Construction dust controls (green nets, barriers, covered trucks) are among the most cost-effective interventions. WRF-CMAQ modelling shows zeroing construction/unpaved road dust at hotspots reduces local PM2.5 by up to 28%. Mandated by Delhi NGT since 2019 — the enforcement gap is large. Source: AAQR modelling study 2022." },
      { id:"spray",  emoji:"💧", label:"Mechanical Road Sweeping",   cost:2, drop:22, evidence:"strong",
        detail:"Road dust re-suspension is a major PM10 source. Mechanical sweeping + water spraying cuts road dust PM10 by 40% (DPCC data). Addressing compliance at hotspots alone can reduce city-wide PM2.5 by 12% (AAQR 2022). Delhi operates 100+ sweeper machines but coverage is patchy. Source: AAQR 2022, DPCC operational data." },
      { id:"tower",  emoji:"🗼", label:"Smog Tower",                 cost:4, drop:5, evidence:"weak",
        detail:"⚠️ Weak evidence for city-scale impact. Delhi's Connaught Place smog tower processes ~1,000 m³/s of air — but Delhi produces millions of m³/s of polluted air. Independent evaluations found it has negligible city-wide AQI impact. May reduce pollution within ~200m radius. IIT Bombay review (2022) questioned its cost-effectiveness. Source: IIT Bombay 2022, CSE." },
    ]},
  { id:"southd",  x:305, y:490, icon:"🕌", label:"South Delhi",  size:48,
    desc:"Residential burning & cooking fuel = 20–25% of Delhi PM2.5 in winter",
    actions:[
      { id:"lpg",    emoji:"🍳", label:"Clean Cooking Fuel",  cost:2, drop:22, evidence:"strong",
        detail:"Residential sector contributes 20–25% of Delhi PM2.5 (TERI 2018). Biomass/coal cooking in low-income areas is a major source. PM Ujjwala Yojana provided 9 crore LPG connections — households using biomass fuel produce 10–50× more PM2.5 indoors. High-LPG adoption in Delhi explains its lower residential share vs NCR. Source: TERI source apportionment 2018." },
      { id:"solar",  emoji:"☀️", label:"Solar + Grid Clean-up", cost:3, drop:15, evidence:"moderate",
        detail:"Coal power plants (within 20–30 km of Delhi) contribute significantly to regional PM2.5. Delhi's rooftop solar push and UP/Haryana coal plant closures near Delhi have measurable impact — BS-VI and power plant closures together contributed to a 7% annual PM2.5 improvement in 2023. Source: Science Advances 2024, CPCB." },
      { id:"gdiwali",emoji:"🪔", label:"Green Diwali Campaign", cost:1, drop:30, evidence:"moderate",
        detail:"Diwali firecrackers cause PM2.5 to spike 5–10× overnight. Supreme Court banned high-emission crackers in 2018; 'green crackers' reduce PM by 30%. Community campaigns in 2023–24 reduced firecracker use noticeably — Delhi recorded lower Diwali peaks in 2024 vs 2023. Most effective when combined with enforcement. Source: SSRN 2024 comparative study, DPCC Diwali data." },
    ]},
  { id:"factory", x:645, y:225, icon:"🏭", label:"Industry",     size:50,
    desc:"Industry = 10–24% of Delhi PM2.5; brick kilns and diesel generators are key hotspots",
    actions:[
      { id:"kiln",   emoji:"🧱", label:"Zigzag Kiln Technology", cost:3, drop:25, evidence:"strong",
        detail:"Brick kilns are a major NCR PM source. Zigzag technology reduces kiln PM emissions by 60–70% and saves 20% fuel. Over 5,000 kilns in NCR have adopted it. IIT Kanpur source apportionment identifies brick kilns as a significant contributor in Haryana/UP districts. Source: IIT Kanpur inventory, MoEF kiln data." },
      { id:"gensets", emoji:"⚡", label:"Ban Diesel Generators",  cost:2, drop:18, evidence:"strong",
        detail:"Diesel generator sets (DG sets) for backup power are a major unregulated urban source — not counted in many inventories. During power cuts they spike local PM2.5 significantly. Delhi's 24/7 power push + grid reliability improvements can eliminate DG set use. Source: SAFAR emission inventory 2018, DPCC." },
      { id:"cngind", emoji:"🔥", label:"Industrial Fuel Switch",  cost:3, drop:20, evidence:"moderate",
        detail:"Switching NCR industrial units from coal/petcoke to PNG/CNG cuts PM2.5 significantly — petcoke burning was banned in Delhi-NCR in 2017 after court orders. Industries (24%) are the largest single PM2.5 source in NCR as a whole (TERI 2018). Compliance monitoring remains the challenge. Source: TERI 2018, NGT orders." },
    ]},
];

/* ══════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════ */
function aqiCol(v){ return v>300?"#b22020":v>200?"#d4600a":v>150?"#c4960a":v>100?"#2a8a2a":"#1a6a3a"; }
function aqiLbl(v){ return v>300?"Hazardous 😷":v>200?"Very Poor 😨":v>150?"Poor 😟":v>100?"Moderate 😐":"Good 😊"; }

/* ══════════════════════════════════════════════════════
   CARTOON MAP SVG
══════════════════════════════════════════════════════ */
function CartoonMap({ season, aqi, hotspots, activeId, deployedIds, onTap }) {
  const smog = season.smogAlpha * Math.min(1.2, aqi / 300);

  function Tree({ x, y, s = 1 }) {
    return (
      <g transform={`translate(${x},${y}) scale(${s})`}>
        <rect x="-3" y="0" width="6" height="10" rx="2" fill="#8B5e20" stroke="#5a3a10" strokeWidth="1.5"/>
        <circle cx="0" cy="-6" r="11" fill="#3a9a28" stroke="#1a6a10" strokeWidth="2"/>
        <circle cx="-5" cy="-2" r="7" fill="#4aaa32" stroke="#1a6a10" strokeWidth="1.5"/>
        <circle cx="5" cy="-2" r="7" fill="#4aaa32" stroke="#1a6a10" strokeWidth="1.5"/>
      </g>
    );
  }

  function PalmTree({ x, y, s = 1 }) {
    return (
      <g transform={`translate(${x},${y}) scale(${s})`}>
        <path d="M0,10 Q2,-5 1,-18" stroke="#8B6a20" strokeWidth="4" fill="none" strokeLinecap="round"/>
        <ellipse cx="-10" cy="-15" rx="10" ry="4" fill="#3aaa20" stroke="#1a7a10" strokeWidth="1.5" transform="rotate(-20,-10,-15)"/>
        <ellipse cx="10" cy="-16" rx="10" ry="4" fill="#3aaa20" stroke="#1a7a10" strokeWidth="1.5" transform="rotate(20,10,-16)"/>
        <ellipse cx="0" cy="-20" rx="8" ry="3" fill="#4aba28" stroke="#1a7a10" strokeWidth="1.5"/>
      </g>
    );
  }

  function SmogCloud({ x, y, w, opacity }) {
    return (
      <g opacity={opacity}>
        <ellipse cx={x} cy={y} rx={w} ry={w*0.45} fill="#9a8060"/>
        <ellipse cx={x-w*0.3} cy={y-w*0.2} rx={w*0.55} ry={w*0.38} fill="#b09070"/>
        <ellipse cx={x+w*0.35} cy={y-w*0.15} rx={w*0.48} ry={w*0.35} fill="#a88860"/>
        <ellipse cx={x} cy={y-w*0.3} rx={w*0.4} ry={w*0.3} fill="#c0a878"/>
      </g>
    );
  }

  return (
    <svg viewBox="0 0 800 580" style={{ width:"100%", height:"100%", display:"block" }}
      preserveAspectRatio="xMidYMid meet">
      <defs>
        <filter id="outline">
          <feMorphology operator="dilate" radius="2" in="SourceAlpha" result="expanded"/>
          <feFlood floodColor="#2a1a08" result="color"/>
          <feComposite in="color" in2="expanded" operator="in" result="outline"/>
          <feMerge><feMergeNode in="outline"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="softBlur"><feGaussianBlur stdDeviation="3"/></filter>
        <filter id="innerShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="blur"/>
          <feOffset dx="2" dy="3" result="offsetBlur"/>
          <feComposite in="SourceGraphic" in2="offsetBlur" operator="over"/>
        </filter>
        <pattern id="grass" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
          <rect width="20" height="20" fill={season.groundA}/>
          <circle cx="5" cy="15" r="2" fill={season.groundB} opacity="0.4"/>
          <circle cx="14" cy="8" r="2.5" fill={season.groundB} opacity="0.3"/>
          <circle cx="10" cy="17" r="1.5" fill={season.groundB} opacity="0.35"/>
        </pattern>
        <pattern id="water" x="0" y="0" width="30" height="15" patternUnits="userSpaceOnUse">
          <rect width="30" height="15" fill="#3a88c8"/>
          <path d="M0,8 Q7,5 15,8 Q22,11 30,8" stroke="#5aaae0" strokeWidth="1.5" fill="none" opacity="0.6"/>
          <path d="M0,4 Q6,2 12,4 Q18,6 24,4" stroke="#7ac4f0" strokeWidth="1" fill="none" opacity="0.4"/>
        </pattern>
        <pattern id="road" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
          <rect width="20" height="20" fill="#c8a870"/>
          <rect x="0" y="9" width="20" height="2" fill="#d4b880" opacity="0.5"/>
        </pattern>
        <radialGradient id="smogGrad" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor={`rgba(160,120,60,${smog*0.5})`}/>
          <stop offset="60%" stopColor={`rgba(130,90,40,${smog*0.7})`}/>
          <stop offset="100%" stopColor={`rgba(100,70,30,${smog*0.9})`}/>
        </radialGradient>
        <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={season.skyA}/>
          <stop offset="100%" stopColor={season.skyB}/>
        </linearGradient>
      </defs>

      {/* ── SKY ── */}
      <rect x="0" y="0" width="800" height="580" fill="url(#skyGrad)"/>

      {/* Clouds (only in spring/monsoon) */}
      {aqi < 150 && [
        [100,60,60],[280,40,80],[520,55,65],[670,70,50]
      ].map(([cx,cy,r],i) => (
        <g key={i} opacity="0.85">
          <ellipse cx={cx} cy={cy} rx={r} ry={r*0.5} fill="#fff" stroke="#e8e8e8" strokeWidth="1"/>
          <ellipse cx={cx-r*0.3} cy={cy-r*0.2} rx={r*0.55} ry={r*0.38} fill="#fff" stroke="#e8e8e8" strokeWidth="1"/>
          <ellipse cx={cx+r*0.35} cy={cy-r*0.15} rx={r*0.5} ry={r*0.35} fill="#fff" stroke="#e8e8e8" strokeWidth="1"/>
        </g>
      ))}

      {/* ── GROUND TERRAIN ── */}
      <path d="M 80,580 L 80,340 Q 70,280 100,240 Q 120,200 140,180 Q 160,150 180,130
               Q 200,100 240,90 Q 280,75 320,72 Q 360,68 400,72 Q 440,75 470,85
               Q 510,95 540,110 Q 570,122 590,140 Q 610,155 625,170
               Q 650,190 660,215 Q 672,242 670,270 Q 668,300 660,330
               Q 650,360 640,390 Q 628,420 615,445 Q 600,470 580,490
               Q 558,510 530,525 Q 500,540 470,550 Q 440,558 400,562
               Q 360,566 320,558 Q 280,550 245,538 Q 210,524 180,505
               Q 148,484 125,460 Q 100,432 88,400 Q 80,370 80,340 L 80,580 Z"
        fill="url(#grass)" stroke="#2a6a18" strokeWidth="3.5" filter="url(#innerShadow)"/>
      <path d="M 240,90 Q 200,60 170,42 Q 140,28 110,30 Q 80,32 65,50 Q 50,68 55,90
               Q 60,112 80,125 Q 100,138 125,140 Q 155,142 178,132 Q 205,118 240,90 Z"
        fill="url(#grass)" stroke="#2a6a18" strokeWidth="3"/>
      <path d="M 55,90 Q 40,60 50,38 Q 60,18 90,12 Q 120,5 148,18 Q 170,30 168,55
               Q 165,78 145,90 Q 125,102 100,100 Q 75,98 55,90 Z"
        fill="#7aaa40" stroke="#3a7a18" strokeWidth="3" opacity="0.9"/>
      {[0,1,2,3,4,5].map(i=>(
        <rect key={i} x={58+i*16} y={20+i*8} width="10" height="35" rx="3"
          fill={i%2===0?"#5a9a28":"#7aba40"} stroke="#3a7a18" strokeWidth="1" opacity="0.7"/>
      ))}
      <path d="M 660,215 Q 690,200 720,205 Q 750,210 760,238 Q 770,265 755,285
               Q 738,305 710,308 Q 682,310 665,290 Q 648,270 650,248 Q 650,230 660,215 Z"
        fill="#a09068" stroke="#6a5a38" strokeWidth="3" opacity="0.85"/>

      {/* ── YAMUNA RIVER ── */}
      <path d="M 558,0 Q 598,80 590,160 Q 582,240 578,300 Q 574,360 590,430 Q 608,500 628,580"
        stroke="#2a70b8" strokeWidth="28" fill="none" strokeLinecap="round"/>
      <path d="M 558,0 Q 598,80 590,160 Q 582,240 578,300 Q 574,360 590,430 Q 608,500 628,580"
        stroke="url(#water)" strokeWidth="24" fill="none" strokeLinecap="round"/>
      <path d="M 558,0 Q 598,80 590,160 Q 582,240 578,300 Q 574,360 590,430 Q 608,500 628,580"
        stroke="#5aaae0" strokeWidth="6" fill="none" strokeLinecap="round" opacity="0.5"/>
      {[[580,120],[582,210],[576,308],[584,400],[600,480]].map(([rx,ry],i)=>(
        <path key={i} d={`M${rx-10},${ry} Q${rx},${ry-5} ${rx+10},${ry}`}
          stroke="#7ac4f0" strokeWidth="1.5" fill="none" opacity="0.6"/>
      ))}
      <text x="604" y="298" fontSize="10" fill="#2a60a8" fontFamily="sans-serif"
        fontWeight="700" transform="rotate(12,604,298)" opacity="0.7">Yamuna</text>

      {/* ── ROADS ── */}
      <ellipse cx="395" cy="310" rx="220" ry="188"
        stroke="#c8a060" strokeWidth="5" fill="none" strokeDasharray="14,7" opacity="0.55"/>
      <path d="M 165,310 Q 280,305 400,308 Q 520,310 640,308"
        stroke="#d4b070" strokeWidth="6" fill="none" strokeLinecap="round" opacity="0.5"/>
      <path d="M 398,95 Q 402,200 400,310 Q 398,420 402,555"
        stroke="#d4b070" strokeWidth="6" fill="none" strokeLinecap="round" opacity="0.5"/>
      <path d="M 195,152 Q 295,230 398,308 Q 498,385 602,460"
        stroke="#c8a860" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.35" strokeDasharray="10,6"/>
      <path d="M 602,148 Q 498,230 400,308 Q 298,385 195,465"
        stroke="#c8a860" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.35" strokeDasharray="10,6"/>
      <path d="M 142,296 Q 245,285 400,290 Q 520,288 648,296"
        stroke="#cc1818" strokeWidth="5" fill="none" strokeDasharray="12,5" opacity="0.6"/>
      <path d="M 142,296 Q 245,285 400,290 Q 520,288 648,296"
        stroke="#ff4444" strokeWidth="2" fill="none" strokeDasharray="12,5" opacity="0.4"/>

      {/* ── LANDMARK ILLUSTRATIONS ── */}
      {/* Red Fort */}
      <g filter="url(#outline)" transform="translate(455,120)">
        <rect x="0" y="18" width="58" height="42" rx="3" fill="#c03828" stroke="#8a1a10" strokeWidth="2"/>
        <rect x="-6" y="8" width="14" height="30" rx="3" fill="#a02818" stroke="#701808" strokeWidth="2"/>
        <rect x="50" y="8" width="14" height="30" rx="3" fill="#a02818" stroke="#701808" strokeWidth="2"/>
        {[0,1,2,3,4].map(i=><rect key={i} x={4+i*11} y="14" width="8" height="8" rx="1" fill="#8a1808" stroke="#601808" strokeWidth="1"/>)}
        <rect x="20" y="28" width="18" height="22" rx="2" fill="#8a1808" stroke="#601808" strokeWidth="1.5"/>
        <path d="M20,28 Q29,20 38,28" fill="#701408" stroke="#501008" strokeWidth="1"/>
        <ellipse cx="10" cy="6" rx="6" ry="10" fill="#d84030" stroke="#8a1808" strokeWidth="1.5"/>
        <ellipse cx="48" cy="6" rx="6" ry="10" fill="#d84030" stroke="#8a1808" strokeWidth="1.5"/>
        <text x="29" y="78" textAnchor="middle" fontSize="9" fontFamily="sans-serif" fontWeight="800" fill="#701808">Red Fort</text>
      </g>
      {/* India Gate */}
      <g filter="url(#outline)" transform="translate(360,260)">
        <rect x="12" y="0" width="10" height="36" rx="2" fill="#d4b870" stroke="#8a7428" strokeWidth="2"/>
        <rect x="2" y="0" width="10" height="36" rx="2" fill="#d4b870" stroke="#8a7428" strokeWidth="2"/>
        <path d="M0,0 Q12,-18 24,0" fill="#c4a850" stroke="#8a7428" strokeWidth="2"/>
        <path d="M4,0 Q12,-10 20,0" fill="#d4b870" stroke="#8a7428" strokeWidth="1"/>
        <rect x="-4" y="34" width="32" height="6" rx="2" fill="#d4b870" stroke="#8a7428" strokeWidth="1.5"/>
        <text x="12" y="52" textAnchor="middle" fontSize="9" fontFamily="sans-serif" fontWeight="800" fill="#8a6820">India Gate</text>
      </g>
      {/* Qutub Minar */}
      <g filter="url(#outline)" transform="translate(285,452)">
        <rect x="6" y="4" width="20" height="52" rx="6" fill="#a07848" stroke="#6a4818" strokeWidth="2"/>
        <rect x="8" y="4" width="16" height="42" rx="5" fill="#b08858" stroke="#6a4818" strokeWidth="1"/>
        {[0,1,2,3].map(i=><rect key={i} x="5" y={10+i*10} width="22" height="3" rx="1" fill="#8a6838" stroke="#5a3818" strokeWidth="0.5"/>)}
        <rect x="4" y="0" width="24" height="8" rx="3" fill="#8a6838" stroke="#5a3818" strokeWidth="1.5"/>
        <polygon points="16,-8 10,0 22,0" fill="#c09860" stroke="#8a6828" strokeWidth="1.5"/>
        <text x="16" y="68" textAnchor="middle" fontSize="8" fontFamily="sans-serif" fontWeight="800" fill="#6a4818">Qutub Minar</text>
      </g>
      {/* Lotus Temple */}
      <g filter="url(#outline)" transform="translate(438,355)">
        {[[-14,14,12,24],[0,10,10,26],[14,14,12,24]].map(([ox,a,rx,ry],i)=>(
          <ellipse key={i} cx={24+ox} cy={30} rx={rx} ry={ry}
            fill="#f0ebe4" stroke="#c8bfb0" strokeWidth="2" transform={`rotate(${a},${24+ox},30)`}/>
        ))}
        <ellipse cx="24" cy="38" rx="18" ry="8" fill="#e0d8d0" stroke="#c8bfb0" strokeWidth="1.5"/>
        <text x="24" y="56" textAnchor="middle" fontSize="8" fontFamily="sans-serif" fontWeight="800" fill="#9a9080">Lotus Temple</text>
      </g>

      {/* ── VEGETATION ── */}
      <Tree x={130} y={200} s={1.1}/>  <Tree x={155} y={215} s={0.9}/>
      <Tree x={320} y={130} s={1.0}/>  <Tree x={345} y={118} s={0.85}/>
      <Tree x={460} y={430} s={1.0}/>  <Tree x={248} y={520} s={0.9}/>
      <Tree x={180} y={460} s={0.85}/> <Tree x={200} y={478} s={1.05}/>
      <Tree x={540} y={460} s={0.9}/>  <Tree x={420} y={530} s={1.0}/>
      <PalmTree x={355} y={540} s={1}/> <PalmTree x={435} y={545} s={0.9}/>
      <PalmTree x={270} y={350} s={0.85}/>

      {/* ── SMOG CLOUDS ── */}
      {smog > 0.15 && <>
        <SmogCloud x={220} y={145} w={70} opacity={smog*0.7}/>
        <SmogCloud x={420} y={125} w={85} opacity={smog*0.65}/>
        <SmogCloud x={640} y={160} w={65} opacity={smog*0.6}/>
        <SmogCloud x={150} y={290} w={60} opacity={smog*0.55}/>
        <SmogCloud x={500} y={220} w={75} opacity={smog*0.65}/>
        {smog > 0.5 && <>
          <SmogCloud x={340} y={250} w={90} opacity={smog*0.5}/>
          <SmogCloud x={120} y={400} w={68} opacity={smog*0.48}/>
          <SmogCloud x={580} y={380} w={72} opacity={smog*0.52}/>
        </>}
      </>}

      {/* ── HOTSPOT PINS ── */}
      {hotspots.map(h => {
        const dep = deployedIds.includes(h.id);
        const act = activeId === h.id;
        const pinColor = dep ? "#2e8a2e" : act ? "#e05020" : "#fff5e0";
        const pinStroke = dep ? "#1a5a1a" : act ? "#a03010" : "#8a6020";
        return (
          <g key={h.id} onClick={() => onTap(h)} style={{ cursor:"pointer" }}>
            {!dep && (
              <circle cx={h.x} cy={h.y-10} r={h.size*0.7}
                fill="none" stroke={aqiCol(aqi)} strokeWidth="2.5"
                strokeDasharray="5,3" opacity="0.6"
                style={{ animation:"spinRing 6s linear infinite" }}/>
            )}
            <ellipse cx={h.x+3} cy={h.y+32} rx={16} ry={5} fill="rgba(0,0,0,0.22)" filter="url(#softBlur)"/>
            <path d={`M${h.x},${h.y+30} Q${h.x-18},${h.y+8} ${h.x-18},${h.y-12} A18,18 0 1,1 ${h.x+18},${h.y-12} Q${h.x+18},${h.y+8} ${h.x},${h.y+30}Z`}
              fill={pinColor} stroke={pinStroke} strokeWidth="2.5"
              filter="url(#outline)"
              style={{ transition:"fill 0.4s, transform 0.2s", transformOrigin:`${h.x}px ${h.y}px`,
                animation: dep ? "pinBounce 0.5s ease" : undefined }}/>
            <text x={h.x} y={h.y+5} textAnchor="middle" fontSize={dep?16:20}
              style={{ userSelect:"none", transition:"font-size 0.3s" }}>
              {dep ? "✅" : h.icon}
            </text>
            <rect x={h.x-22} y={h.y+35} width={44} height={14} rx={4}
              fill="rgba(255,245,220,0.88)" stroke={pinStroke} strokeWidth="1"/>
            <text x={h.x} y={h.y+45} textAnchor="middle" fontSize="9"
              fontFamily="'Baloo 2',cursive" fontWeight="800" fill={dep?"#1a5a1a":"#3a1808"}>
              {h.label}
            </text>
          </g>
        );
      })}

      {/* Full smog overlay */}
      {smog > 0.05 && (
        <rect x="0" y="0" width="800" height="580"
          fill="url(#smogGrad)"
          style={{ transition:"opacity 1.5s", pointerEvents:"none" }}/>
      )}

      {/* Diwali sparkles */}
      {season.id === "diwali" && [
        [200,180],[450,120],[650,200],[150,350],[550,300],[350,450]
      ].map(([sx,sy],i)=>(
        <g key={i} style={{ animation:`sparkle ${1+i*0.4}s ${i*0.3}s infinite` }}>
          {["#ff6","#f90","#f0f","#0ff"].map((c,j)=>(
            <line key={j} x1={sx} y1={sy} x2={sx+Math.cos(j*90*Math.PI/180)*12} y2={sy+Math.sin(j*90*Math.PI/180)*12}
              stroke={c} strokeWidth="2" opacity="0.7"/>
          ))}
        </g>
      ))}

      <style>{`
        @keyframes spinRing { from{stroke-dashoffset:0;} to{stroke-dashoffset:-50;} }
        @keyframes pinBounce { 0%{transform:scale(1);} 30%{transform:scale(1.5) translateY(-6px);} 60%{transform:scale(0.9);} 100%{transform:scale(1);} }
        @keyframes sparkle { 0%,100%{opacity:0.3;} 50%{opacity:1;} }
      `}</style>
    </svg>
  );
}

/* ══════════════════════════════════════════════════════
   ACTION BOTTOM SHEET
══════════════════════════════════════════════════════ */
function ActionSheet({ hotspot, season, usedActions, ap, onAction, onClose }) {
  const [sel, setSel] = useState(null);
  return (
    <div style={{ position:"fixed", inset:0, zIndex:100, display:"flex", flexDirection:"column", justifyContent:"flex-end" }}>
      <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.52)", backdropFilter:"blur(4px)" }} onClick={onClose}/>
      <div style={{ position:"relative", zIndex:1, background:"#fdf5e6",
        borderRadius:"24px 24px 0 0", boxShadow:"0 -10px 50px rgba(0,0,0,0.38)",
        animation:"slideUp 0.32s cubic-bezier(0.34,1.3,0.64,1)",
        maxHeight:"78vh", display:"flex", flexDirection:"column",
        border:"3px solid #d4a840", borderBottom:"none" }}>
        <div style={{ width:48, height:6, background:"#d4a840", borderRadius:99, margin:"12px auto 0" }}/>
        <div style={{ padding:"12px 18px 10px", borderBottom:"2px dashed #e8c870",
          display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:40 }}>{hotspot.icon}</span>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:"'Baloo 2',cursive", fontSize:20, fontWeight:800, color:"#2a1008" }}>{hotspot.label}</div>
            <div style={{ fontFamily:"sans-serif", fontSize:12, color:"#8a6040", lineHeight:1.4, marginTop:2 }}>{hotspot.desc}</div>
          </div>
          <button onClick={onClose} style={{ background:"#e8c870", border:"2px solid #c8a040", borderRadius:"50%",
            width:32, height:32, fontSize:16, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
        </div>
        {season.eventDesc && (
          <div style={{ margin:"8px 14px 0", background:"#fff3cd", border:"2px solid #ffc107",
            borderRadius:12, padding:"7px 12px", fontFamily:"sans-serif", fontSize:12, color:"#856404", fontWeight:600 }}>
            ⚠️ {season.eventDesc}
          </div>
        )}
        <div style={{ overflowY:"auto", padding:"10px 14px 24px", display:"flex", flexDirection:"column", gap:10 }}>
          {hotspot.actions.map(a => {
            const used = usedActions.includes(a.id);
            const ok = ap >= a.cost;
            const open = sel === a.id;
            return (
              <div key={a.id}
                onClick={() => !used && ok && setSel(open ? null : a.id)}
                style={{ background: used?"#f0ece0": open?"#fff8e8":"#fffdf5",
                  border:`2.5px solid ${used?"#d4c8a8": open?"#e05020":"#d4b858"}`,
                  borderRadius:16, padding:"12px 14px",
                  cursor: used||!ok ? "default":"pointer",
                  opacity: !ok&&!used ? 0.5 : 1,
                  boxShadow: open ? "0 4px 20px rgba(224,80,32,0.2)" : "0 2px 6px rgba(0,0,0,0.07)",
                  transition:"all 0.2s" }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ fontSize:32 }}>{a.emoji}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontFamily:"'Baloo 2',cursive", fontSize:15, fontWeight:700, color:"#2a1008" }}>{a.label}</div>
                    <div style={{ display:"flex", gap:6, marginTop:3, flexWrap:"wrap" }}>
                      <span style={{ background:"#fff0d0", color:"#c05010", border:"1.5px solid #e8a040",
                        borderRadius:99, fontSize:11, padding:"2px 10px", fontFamily:"sans-serif", fontWeight:700 }}>⚡ {a.cost} AP</span>
                      <span style={{ background:"#e8f5e0", color:"#2a6a10", border:"1.5px solid #8acc60",
                        borderRadius:99, fontSize:11, padding:"2px 10px", fontFamily:"sans-serif", fontWeight:700 }}>↓ AQI ~−{a.drop}</span>
                      {a.evidence==="strong" && <span style={{ background:"#e8f0ff", color:"#1a4aaa", border:"1.5px solid #6a8acc",
                        borderRadius:99, fontSize:10, padding:"2px 8px", fontFamily:"sans-serif", fontWeight:700 }}>✅ Strong evidence</span>}
                      {a.evidence==="moderate" && <span style={{ background:"#fff8e0", color:"#8a6000", border:"1.5px solid #c8a020",
                        borderRadius:99, fontSize:10, padding:"2px 8px", fontFamily:"sans-serif", fontWeight:700 }}>⚠️ Mixed evidence</span>}
                      {a.evidence==="weak" && <span style={{ background:"#ffeeee", color:"#aa2020", border:"1.5px solid #cc6060",
                        borderRadius:99, fontSize:10, padding:"2px 8px", fontFamily:"sans-serif", fontWeight:700 }}>❓ Weak evidence</span>}
                      {used && <span style={{ background:"#e0f0e0", color:"#2a6a10", borderRadius:99,
                        fontSize:11, padding:"2px 10px", fontFamily:"sans-serif" }}>✓ Done!</span>}
                    </div>
                  </div>
                  {!used && <div style={{ width:24, height:24, borderRadius:"50%",
                    border:`2.5px solid ${open?"#e05020":"#c8a040"}`,
                    background: open?"#e05020":"transparent",
                    display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    {open && <span style={{ color:"#fff", fontSize:14 }}>✓</span>}
                  </div>}
                </div>
                {open && (
                  <div style={{ marginTop:12, paddingTop:10, borderTop:"1.5px dashed #e8c870" }}>
                    <div style={{ background:"#fdf0d8", border:"1.5px solid #e8c060", borderRadius:10,
                      padding:"10px 12px", fontFamily:"sans-serif", fontSize:12, color:"#6a4010",
                      lineHeight:1.6, marginBottom:12 }}>
                      📊 <strong>Real Delhi data:</strong><br/>{a.detail}
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); onAction(a); onClose(); }}
                      style={{ background:"linear-gradient(135deg,#e05020,#c03010)", color:"#fff",
                        border:"none", borderRadius:14, padding:"12px", fontSize:16,
                        fontFamily:"'Baloo 2',cursive", fontWeight:700, cursor:"pointer",
                        width:"100%", boxShadow:"0 4px 0 #801808, 0 6px 20px rgba(224,80,32,0.3)" }}>
                      🚀 Deploy — Save {a.drop} AQI Points!
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   SEASON MODAL
══════════════════════════════════════════════════════ */
function SeasonModal({ season, onGo }) {
  return (
    <div style={{ position:"fixed", inset:0, zIndex:90, display:"flex", alignItems:"center",
      justifyContent:"center", background:"rgba(0,0,0,0.65)", backdropFilter:"blur(6px)" }}>
      <div style={{ background:"linear-gradient(160deg,#2a1408,#1a0c04)",
        border:"3px solid #c8882a", borderRadius:24, padding:"28px 24px",
        maxWidth:340, width:"90%", textAlign:"center",
        boxShadow:"0 10px 60px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,200,100,0.15)",
        animation:"popIn 0.4s cubic-bezier(0.34,1.4,0.64,1)" }}>
        <div style={{ fontSize:64, marginBottom:8 }}>{season.emoji}</div>
        <div style={{ fontFamily:"'Baloo 2',cursive", fontSize:28, fontWeight:800, color:"#fff8e0" }}>{season.name}</div>
        <div style={{ fontFamily:"sans-serif", fontSize:13, color:"#b89060", marginBottom:16 }}>{season.months}</div>
        {season.eventDesc && (
          <div style={{ background:"rgba(224,80,32,0.2)", border:"1.5px solid rgba(224,80,32,0.45)",
            borderRadius:12, padding:"10px 14px", marginBottom:14,
            fontFamily:"sans-serif", fontSize:13, color:"#ffaa78", lineHeight:1.5 }}>
            {season.eventDesc}
          </div>
        )}
        <div style={{ background:"rgba(255,255,255,0.06)", borderRadius:12, padding:"10px 14px",
          marginBottom:20, fontFamily:"sans-serif", fontSize:13, color:"#c8b090", lineHeight:1.5 }}>
          💡 {season.tip}
        </div>
        <div style={{ display:"flex", justifyContent:"center", gap:24, marginBottom:20 }}>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:10, color:"#8a7050", fontFamily:"sans-serif" }}>Season AQI</div>
            <div style={{ fontSize:26, fontWeight:800, color:aqiCol(season.baseAqi) }}>{season.baseAqi}</div>
          </div>
          {season.spike !== 0 && (
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:10, color:"#8a7050", fontFamily:"sans-serif" }}>Event spike</div>
              <div style={{ fontSize:26, fontWeight:800, color:season.spike>0?"#e06020":"#2a9a3a" }}>
                {season.spike>0?"+":""}{season.spike}
              </div>
            </div>
          )}
        </div>
        <button onClick={onGo} style={{ background:"linear-gradient(135deg,#e05020,#c03010)",
          color:"#fff", border:"none", borderRadius:14, padding:"14px", fontSize:18,
          fontFamily:"'Baloo 2',cursive", fontWeight:700, cursor:"pointer",
          boxShadow:"0 4px 0 #801808", width:"100%" }}>
          Take Action! 🌟
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   RESULT SCREEN
══════════════════════════════════════════════════════ */
function ResultScreen({ aqi, history, onRestart }) {
  const start = 310, drop = Math.round(start - aqi);
  const grade = aqi<100?"A+":aqi<150?"A":aqi<200?"B":aqi<250?"C":"D";
  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(160deg,#0a1a08 0%,#1a3018 50%,#081408 100%)",
      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
      padding:24, fontFamily:"'Baloo 2',cursive", overflowY:"auto" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;600;700;800&display=swap');`}</style>
      <div style={{ maxWidth:480, width:"100%", textAlign:"center" }}>
        <div style={{ fontSize:72, marginBottom:8 }}>{aqi<150?"🌟":aqi<250?"😊":"😷"}</div>
        <h1 style={{ fontSize:36, color:"#f0f8e0", margin:"0 0 6px" }}>Year Complete!</h1>
        <div style={{ background:"rgba(255,255,255,0.07)", borderRadius:20, padding:22, marginBottom:18,
          border:"2px solid rgba(200,210,150,0.2)" }}>
          <div style={{ display:"flex", justifyContent:"space-around", marginBottom:18 }}>
            {[["Started",start,aqiCol(start)],["Final",Math.round(aqi),aqiCol(aqi)],["Saved",drop,"#4caf50"]].map(([l,v,c])=>(
              <div key={l}><div style={{ fontSize:11, color:"#6da870", fontFamily:"sans-serif", marginBottom:3 }}>{l}</div>
              <div style={{ fontSize:30, fontWeight:800, color:c }}>{l==="Saved"?"↓":""}{v}</div></div>
            ))}
          </div>
          <div style={{ background:aqiCol(aqi), borderRadius:12, padding:"10px 18px", display:"inline-block", marginBottom:16 }}>
            <span style={{ color:"#fff", fontSize:20, fontWeight:800 }}>Grade {grade} · {aqiLbl(aqi)}</span>
          </div>
          <div style={{ textAlign:"left" }}>
            {SEASONS.map((s,i)=>(
              <div key={i} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6,
                background:"rgba(255,255,255,0.05)", borderRadius:10, padding:"7px 12px" }}>
                <span style={{ fontSize:16 }}>{s.emoji}</span>
                <span style={{ fontFamily:"sans-serif", fontSize:12, color:"#a8c898", minWidth:72 }}>{s.name}</span>
                <span style={{ flex:1, fontSize:16 }}>{(history[i]||[]).map(a=>a.emoji).join(" ")||"—"}</span>
                <span style={{ color:"#4caf50", fontSize:12, fontWeight:700 }}>
                  {(history[i]||[]).length>0?`−${(history[i]||[]).reduce((s,a)=>s+a.drop,0)}`:""}</span>
              </div>
            ))}
          </div>
        </div>
        {aqi<100&&<p style={{ color:"#4caf50", fontFamily:"sans-serif", fontWeight:700, marginBottom:16 }}>🏆 Incredible! Delhi's air is safe again. You're a TRUE AQI Hero!</p>}
        {aqi>=100&&aqi<200&&<p style={{ color:"#ffb74d", fontFamily:"sans-serif", marginBottom:16 }}>👏 Big improvement! Target stubble burning & Diwali next time!</p>}
        {aqi>=200&&<p style={{ color:"#ef5350", fontFamily:"sans-serif", marginBottom:16 }}>😷 Try high-drop actions (Crop Diversify, Green Diwali) in the big spike seasons!</p>}
        <button onClick={onRestart} style={{ background:"linear-gradient(135deg,#e05020,#c03010)",
          color:"#fff", border:"none", borderRadius:14, padding:"14px", fontSize:18,
          fontFamily:"'Baloo 2',cursive", fontWeight:700, cursor:"pointer", boxShadow:"0 4px 0 #801808", width:"100%" }}>
          Play Again 🔄
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   INTRO
══════════════════════════════════════════════════════ */
function IntroScreen({ onStart }) {
  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(160deg,#2c1204 0%,#3d1a08 50%,#1a0804 100%)",
      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
      padding:"16px 24px", fontFamily:"'Baloo 2',cursive", overflowY:"auto" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;600;700;800&display=swap');`}</style>
      <div style={{ maxWidth:440, width:"100%", textAlign:"center" }}>
        <div style={{ fontSize:"clamp(48px,8vw,72px)", filter:"drop-shadow(0 0 30px rgba(255,120,0,0.5))" }}>🏙️</div>
        <div style={{ fontFamily:"sans-serif", fontSize:12, color:"#e05020", fontWeight:700,
          letterSpacing:3, textTransform:"uppercase", marginBottom:4 }}>Delhi, India</div>
        <h1 style={{ fontSize:"clamp(32px,8vw,52px)", color:"#fff8e0", margin:"0 0 8px",
          lineHeight:1.05, textShadow:"0 2px 20px rgba(224,80,32,0.5)" }}>AQI Hero</h1>
        <p style={{ fontSize:"clamp(13px,2vw,16px)", color:"#c8a070", fontFamily:"sans-serif", margin:"0 0 16px", lineHeight:1.6 }}>
          Delhi's winter AQI hits <strong style={{color:"#ff6644"}}>400+</strong> — 16× the safe limit.<br/>
          <strong style={{color:"#ffb07a"}}>You have one year to fix it.</strong>
        </p>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:16, textAlign:"left" }}>
          {[["🗺️","Tap the map","Click illustrated hotspots across Delhi"],
            ["📊","Real data","Every action uses actual Delhi AQI research"],
            ["🌾","5 seasons","Spring → Summer → Monsoon → Harvest → Diwali"],
            ["🎯","Target: AQI 100","Below 100 = children can play outside safely"]
          ].map(([e,t,d],i)=>(
            <div key={i} style={{ background:"rgba(255,255,255,0.05)", borderRadius:14,
              padding:"10px 12px", border:"1.5px solid rgba(255,200,100,0.15)" }}>
              <div style={{ fontSize:22, marginBottom:4 }}>{e}</div>
              <div style={{ fontSize:12, fontWeight:700, color:"#fff8e0", marginBottom:2 }}>{t}</div>
              <div style={{ fontSize:10, color:"#9a7050", fontFamily:"sans-serif", lineHeight:1.4 }}>{d}</div>
            </div>
          ))}
        </div>
        <button onClick={onStart} style={{ background:"linear-gradient(135deg,#e05020,#c03010)",
          color:"#fff", border:"none", borderRadius:16, padding:"14px", fontSize:"clamp(17px,3vw,22px)",
          fontFamily:"'Baloo 2',cursive", fontWeight:700, cursor:"pointer",
          boxShadow:"0 5px 0 #801808, 0 8px 30px rgba(224,80,32,0.4)", width:"100%", marginBottom:8 }}>
          Start Cleaning Delhi! 🚀
        </button>
        <div style={{ fontFamily:"sans-serif", fontSize:12, color:"#6a4030" }}>Ages 9–12 · 5 seasons · ~10 min</div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   MAIN APP
══════════════════════════════════════════════════════ */
export default function App() {
  const AP = 7, START = 310;
  const [screen, setScreen] = useState("intro");
  const [ri, setRi] = useState(0);
  const [aqi, setAqi] = useState(START);
  const [ap, setAp] = useState(AP);
  const [used, setUsed] = useState([]);
  const [roundActs, setRoundActs] = useState([]);
  const [history, setHistory] = useState([]);
  const [activeHS, setActiveHS] = useState(null);
  const [showSeason, setShowSeason] = useState(false);
  const [deployed, setDeployed] = useState([]);
  const [bgOn, setBgOn] = useState(false);
  const audio = useAudio();
  const season = SEASONS[ri];

  function startGame() {
    setAqi(SEASONS[0].baseAqi);
    setScreen("game");
    setShowSeason(true);
  }

  function toggleBg() {
    if (bgOn) { audio.stopBg(); setBgOn(false); }
    else { audio.startBg(); setBgOn(true); }
  }

  function doAction(a) {
    if (ap < a.cost) return;
    setAqi(v => Math.max(28, v - a.drop));
    setAp(v => v - a.cost);
    setUsed(u => [...u, a.id]);
    setRoundActs(r => [...r, a]);
    if (activeHS) setDeployed(d => d.includes(activeHS.id) ? d : [...d, activeHS.id]);
    audio.playDeploy();
    setTimeout(() => audio.playImprove(), 400);
  }

  function nextRound() {
    const h = [...history, roundActs];
    setHistory(h);
    if (ri + 1 >= SEASONS.length) { setScreen("result"); return; }
    const next = SEASONS[ri + 1];
    setAqi(v => {
      let nv = v * 0.78 + next.baseAqi * 0.22;
      if (next.spike > 0) nv = Math.min(420, nv + next.spike * 0.55);
      if (next.spike < 0) nv = Math.max(28, nv + next.spike * 0.7);
      return nv;
    });
    setRi(i => i + 1);
    setAp(AP); setUsed([]); setRoundActs([]); setDeployed([]); setActiveHS(null);
    setShowSeason(true);
    audio.playSeasonChange();
  }

  function restart() {
    setScreen("intro"); setRi(0); setAqi(START); setAp(AP);
    setUsed([]); setRoundActs([]); setHistory([]); setDeployed([]); setActiveHS(null);
    audio.stopBg(); setBgOn(false);
  }

  if (screen === "intro") return <IntroScreen onStart={startGame}/>;
  if (screen === "result") return <ResultScreen aqi={aqi} history={history} onRestart={restart}/>;

  const aqiPct = Math.min(1, aqi / 420);
  return (
    <div style={{ position:"fixed", inset:0, fontFamily:"'Baloo 2',cursive", overflow:"hidden", background: season.skyA }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;600;700;800&display=swap');
        *{box-sizing:border-box;}
        @keyframes slideUp{from{transform:translateY(100%);opacity:0;}to{transform:translateY(0);opacity:1;}}
        @keyframes popIn{from{transform:scale(0.72);opacity:0;}to{transform:scale(1);opacity:1;}}
        @keyframes pulse{0%,100%{opacity:0.6;}50%{opacity:1;}}
      `}</style>

      {/* MAP */}
      <div style={{ position:"absolute", top:55, bottom:50, left:0, right:0, zIndex:4 }}>
        <CartoonMap season={season} aqi={aqi} hotspots={HOTSPOTS}
          activeId={activeHS?.id} deployedIds={deployed}
          onTap={h => setActiveHS(activeHS?.id===h.id ? null : h)}/>
      </div>

      {/* TOP HUD */}
      <div style={{ position:"absolute", top:0, left:0, right:0, zIndex:20,
        background:"rgba(20,10,2,0.88)", backdropFilter:"blur(12px)",
        borderBottom:"2px solid rgba(200,160,40,0.35)",
        padding:"7px 12px", display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
        <div style={{ fontWeight:800, fontSize:15, color:"#fff8e0" }}>🏙️ AQI Hero</div>
        <div style={{ display:"flex", gap:3, flex:1, justifyContent:"center", flexWrap:"wrap" }}>
          {SEASONS.map((s,i)=>(
            <div key={i} style={{
              background:i<ri?"rgba(46,120,46,0.6)":i===ri?"rgba(224,80,32,0.8)":"rgba(255,255,255,0.06)",
              border:`1.5px solid ${i===ri?"#e05020":i<ri?"rgba(80,180,80,0.5)":"rgba(255,255,255,0.1)"}`,
              borderRadius:99, padding:"3px 9px", fontSize:11,
              color:i===ri?"#fff":i<ri?"rgba(200,255,200,0.75)":"rgba(255,255,255,0.4)",
              fontWeight:i===ri?700:400 }}>
              {s.emoji} {s.name}
            </div>
          ))}
        </div>
        <div style={{ background:`${aqiCol(aqi)}22`, border:`2px solid ${aqiCol(aqi)}66`,
          borderRadius:12, padding:"4px 11px", textAlign:"center", minWidth:72 }}>
          <div style={{ fontSize:9, color:"rgba(255,255,255,0.45)", fontFamily:"sans-serif" }}>AQI</div>
          <div style={{ fontSize:22, fontWeight:800, color:aqiCol(aqi), lineHeight:1.1 }}>{Math.round(aqi)}</div>
          <div style={{ fontSize:9, color:aqiCol(aqi), fontFamily:"sans-serif" }}>{aqiLbl(aqi)}</div>
        </div>
        <button onClick={toggleBg}
          style={{ background:"rgba(255,255,255,0.08)", border:"1.5px solid rgba(255,200,100,0.3)",
            borderRadius:10, padding:"5px 10px", fontSize:16, cursor:"pointer", color:"#fff8e0" }}
          title={bgOn?"Mute music":"Play music"}>
          {bgOn?"🔊":"🔇"}
        </button>
      </div>

      {/* AQI progress bar */}
      <div style={{ position:"absolute", top:50, left:0, right:0, zIndex:19, height:5, background:"rgba(0,0,0,0.5)" }}>
        <div style={{ width:`${aqiPct*100}%`, height:"100%", transition:"width 1s ease",
          background:`linear-gradient(90deg,#2a9a2a,#c4960a,#e06020,#b02020)`,
          boxShadow:`0 0 10px ${aqiCol(aqi)}` }}/>
      </div>

      {/* BOTTOM HUD */}
      <div style={{ position:"absolute", bottom:0, left:0, right:0, zIndex:20,
        background:"rgba(20,10,2,0.88)", backdropFilter:"blur(12px)",
        borderTop:"2px solid rgba(200,160,40,0.35)",
        padding:"9px 12px", display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
        <div style={{ display:"flex", gap:4, alignItems:"center", flexShrink:0 }}>
          {Array.from({length:AP}).map((_,i)=>(
            <div key={i} style={{ width:13, height:13, borderRadius:"50%",
              background:i<ap?"#f59e0b":"rgba(255,255,255,0.12)",
              boxShadow:i<ap?"0 0 5px rgba(245,158,11,0.8)":undefined, transition:"all 0.3s" }}/>
          ))}
          <span style={{ fontSize:12, color:"#f59e0b", fontWeight:700, marginLeft:3 }}>{ap} AP</span>
        </div>
        <div style={{ flex:1, display:"flex", gap:5, alignItems:"center", overflow:"hidden", flexWrap:"wrap" }}>
          {roundActs.length>0 ? <>
            <span style={{ fontSize:10, color:"rgba(255,255,255,0.35)", fontFamily:"sans-serif", flexShrink:0 }}>Done:</span>
            {roundActs.map((a,i)=>(
              <span key={i} style={{ background:"rgba(46,120,46,0.5)", border:"1px solid rgba(80,180,80,0.4)",
                borderRadius:99, padding:"2px 8px", fontSize:12, color:"#a0e890", flexShrink:0 }}>
                {a.emoji}−{a.drop}
              </span>
            ))}
            <span style={{ color:"#4caf50", fontSize:13, fontWeight:700, flexShrink:0 }}>
              = −{roundActs.reduce((s,a)=>s+a.drop,0)}
            </span>
          </> : (
            <span style={{ fontSize:12, color:"rgba(255,255,255,0.28)", fontFamily:"sans-serif" }}>
              👆 Tap a glowing pin on the map
            </span>
          )}
        </div>
        <button onClick={nextRound}
          style={{ background:"linear-gradient(135deg,#e05020,#c03010)", color:"#fff", border:"none",
            borderRadius:12, padding:"9px 14px", fontSize:13, fontFamily:"'Baloo 2',cursive",
            fontWeight:700, cursor:"pointer", boxShadow:"0 3px 0 #801808", flexShrink:0 }}>
          {ri===SEASONS.length-1 ? "🏁 Results" : `${SEASONS[ri+1].emoji} Next →`}
        </button>
      </div>

      {showSeason && <SeasonModal season={season} onGo={()=>setShowSeason(false)}/>}
      {activeHS && <ActionSheet hotspot={activeHS} season={season} usedActions={used}
        ap={ap} onAction={doAction} onClose={()=>setActiveHS(null)}/>}
    </div>
  );
}
