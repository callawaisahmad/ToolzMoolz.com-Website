/* ================================================================
   HELIOTROPE — CHARTS & COMPASS
   SVG builders for the sun-elevation chart, monthly bar chart,
   and the interactive/static compass rose.
   Relies on d2r/r2d and SolarEngine, loaded earlier on the page.
   ================================================================ */

/* ---------- Sun elevation line chart ---------- */
function buildSunChartClean(lat, hasLat){
  const W=860, H=360, padL=48, padR=20, padT=18, padB=40;
  const plotW=W-padL-padR, plotH=H-padT-padB;
  const days = [
    {N:355, color:'#5B8DB8', label:'Winter solstice'},
    {N:81,  color:'#FE7F2D', label:'Equinox'},
    {N:172, color:'#D96C4A', label:'Summer solstice'}
  ];
  const xForH = H_ => padL + ((H_+180)/360)*plotW;
  const yForAlt = a => padT + (plotH - (Math.min(a,80)/90)*plotH);
  const latForCurve = hasLat ? lat : 30;

  let svg = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<style>.cl{font-family:ui-monospace,monospace;font-size:10px;fill:#4a5568}.cm{font-family:ui-monospace,monospace;font-size:11px;fill:#4a5568}.ch{font-family:ui-monospace,monospace;font-size:11px;font-weight:600}.clabel{font-family:ui-monospace,monospace;font-size:14px;font-weight:600;fill:#0a0f1c}.peak{font-family:ui-monospace,monospace;font-size:11px;font-weight:600}</style>`;

  // altitude grid lines every 10°
  for(let a=0;a<=80;a+=10){
    const y=yForAlt(a);
    svg += `<line x1="${padL}" y1="${y}" x2="${W-padR}" y2="${y}" stroke="rgba(11,18,32,0.08)"/>`;
  }
  [0,10,20,30,40,50,60,70,80].forEach(a=>{
    const y=yForAlt(a);
    if(a%20===0){
      svg += `<text x="${padL-8}" y="${y+4}" class="cl" text-anchor="end">${a}°</text>`;
    }
  });

  // horizon line
  svg += `<line x1="${padL}" y1="${yForAlt(0)}" x2="${W-padR}" y2="${yForAlt(0)}" stroke="rgba(11,18,32,0.16)" stroke-width="1.5"/>`;
  svg += `<text x="${padL-8}" y="${yForAlt(0)+4}" class="cl" text-anchor="end">0°</text>`;
  svg += `<text x="${W-padR-4}" y="${yForAlt(0)-4}" class="cl" text-anchor="end">horizon</text>`;

  // usable 10° threshold
  const yThresh=yForAlt(10);
  svg += `<line x1="${padL}" y1="${yThresh}" x2="${W-padR}" y2="${yThresh}" stroke="rgba(11,18,32,0.28)" stroke-dasharray="5 5" stroke-width="1.2"/>`;
  svg += `<text x="${W-padR-4}" y="${yThresh-5}" class="cl" fill="rgba(11,18,32,0.55)" text-anchor="end">10° usable light</text>`;

  // curves with detailed annotations
  days.forEach((d,i)=>{
    const dec=SolarEngine.declination(d.N);
    const HA0=SolarEngine.hourAngleSunset(latForCurve,dec);
    let pts=[];
    for(let H=-HA0; H<=HA0; H+=1.5){
      const alt=SolarEngine.solarAltitude(latForCurve,dec,H);
      pts.push(`${xForH(H).toFixed(1)},${yForAlt(Math.max(alt,-5)).toFixed(1)}`);
    }
    svg += `<polyline points="${pts.join(' ')}" fill="none" stroke="${d.color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" opacity="${hasLat?1:0.55}" stroke-dasharray="${hasLat?'none':'2 5'}"/>`;

    if(hasLat){
      // peak altitude badge
      const noonAlt = SolarEngine.solarAltitude(latForCurve, dec, 0);
      const xNoon = xForH(0);
      const yNoon = yForAlt(noonAlt);
      svg += `<rect x="${xNoon-16}" y="${yNoon-22}" width="32" height="18" rx="4" fill="${d.color}" opacity="0.9"/>`;
      svg += `<text x="${xNoon}" y="${yNoon-10}" class="peak" fill="#0a0f1c" text-anchor="middle">${noonAlt.toFixed(1)}°</text>`;
      svg += `<circle cx="${xNoon}" cy="${yNoon}" r="3" fill="${d.color}"/>`;

      // day length annotation at bottom
      const dayLen = (2*HA0/15).toFixed(1);
      const xLabel = xForH(0) + (i-1)*110;
      svg += `<text x="${Math.max(padL+10, Math.min(W-padR-10, xLabel))}" y="${H-10}" class="cm" fill="${d.color}" text-anchor="middle">${d.label} ${dayLen}h</text>`;
    }
  });

  // hourly time labels
  for(let hOffset=-6; hOffset<=6; hOffset++){
    const H=hOffset*15;
    const x=xForH(H);
    const isMain = hOffset%3===0;
    const isNoon = hOffset===0;
    let label = isNoon ? '12:00' : (12+hOffset)+':00';
    if(isNoon){
      svg += `<text x="${x}" y="${padT+plotH+16}" class="ch" fill="#1a1d24" text-anchor="middle">${label}</text>`;
      svg += `<text x="${x}" y="${padT+plotH+30}" class="cl" text-anchor="middle" font-size="9">solar noon</text>`;
    } else if(isMain){
      svg += `<text x="${x}" y="${padT+plotH+16}" class="ch" fill="#4a5568" text-anchor="middle">${label}</text>`;
    } else {
      svg += `<text x="${x}" y="${padT+plotH+16}" class="cl" fill="rgba(11,18,32,0.42)" text-anchor="middle">${label}</text>`;
    }
  }

  // small note about latitude
  if(hasLat){
    svg += `<text x="${padL}" y="${H-10}" class="cl" fill="rgba(11,18,32,0.5)">Lat ${lat.toFixed(2)}° · peaks labeled with max altitude</text>`;
  }

  svg += `</svg>`;
  return svg;
}

/* ---------- Monthly bar chart ---------- */
function buildBarChart(monthData){
  const W=860, H=220, padL=36, padR=10, padT=10, padB=28;
  const plotW=W-padL-padR, plotH=H-padT-padB;
  const maxVal = Math.max(...monthData.map(m=>m.effHours), 1);
  const bw = plotW/monthData.length;
  let svg = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<style>.cl{font-family:ui-monospace,monospace;font-size:9px;fill:#4a5568}</style>`;
  [0.25,0.5,0.75,1].forEach(f=>{
    const y=padT+plotH-(f*plotH);
    svg += `<line x1="${padL}" y1="${y}" x2="${W-padR}" y2="${y}" stroke="rgba(11,18,32,0.08)"/>`;
    svg += `<text x="${padL-6}" y="${y+3}" class="cl" text-anchor="end">${(f*maxVal).toFixed(1)}</text>`;
  });
  const best = Math.max(...monthData.map(m=>m.effHours));
  monthData.forEach((m,i)=>{
    const h=(m.effHours/maxVal)*plotH;
    const x=padL+i*bw+bw*0.15;
    const w=bw*0.7;
    const y=padT+plotH-h;
    const isBest = m.effHours===best;
    svg += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="3" fill="${isBest?'#2563EB':'#9aa7bd'}" opacity="${isBest?1:0.60}"/>`;
    svg += `<text x="${(x+w/2).toFixed(1)}" y="${H-10}" class="cl" text-anchor="middle">${SolarEngine.MONTH_NAMES[i].slice(0,3)}</text>`;
  });
  svg += `</svg>`;
  return svg;
}

/* ================================================================
   COMPASS ROSE — reusable for both the roof-facing input
   (interactive, draggable) and the results direction readout
   (static, needle-only).
   ================================================================ */
const COMPASS_DIRS = [
  {a:0,label:'N'},{a:45,label:'NE'},{a:90,label:'E'},{a:135,label:'SE'},
  {a:180,label:'S'},{a:225,label:'SW'},{a:270,label:'W'},{a:315,label:'NW'}
];
const COMPASS_FULL_NAMES = {N:'North',NE:'Northeast',E:'East',SE:'Southeast',S:'South',SW:'Southwest',W:'West',NW:'Northwest'};

function compassFullName(deg){
  const idx = Math.round(((deg%360)+360)%360/45)%8;
  const keys=['N','NE','E','SE','S','SW','W','NW'];
  return COMPASS_FULL_NAMES[keys[idx]];
}

function buildCompassSVG(id){
  let svg = `<svg viewBox="0 0 200 200" class="compass-svg" id="${id}">`;
  svg += `<circle cx="100" cy="100" r="88" class="compass-ring"/>`;
  svg += `<circle cx="100" cy="100" r="60" class="compass-ring-inner"/>`;
  for(let a=0;a<360;a+=15){
    const isMajor = a%45===0;
    const r1 = isMajor? 76 : 82;
    const rad = d2r(a);
    const x1=100+r1*Math.sin(rad), y1=100-r1*Math.cos(rad);
    const x2=100+88*Math.sin(rad), y2=100-88*Math.cos(rad);
    svg += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" class="compass-tick${isMajor?' major':''}"/>`;
  }
  COMPASS_DIRS.forEach(d=>{
    const rad = d2r(d.a);
    const x = 100 + 67*Math.sin(rad);
    const y = 100 - 67*Math.cos(rad) + 4;
    const cls = (d.a%90===0) ? 'compass-label major' : 'compass-label';
    svg += `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" class="${cls}" text-anchor="middle">${d.label}</text>`;
  });
  svg += `<g id="${id}-needle" class="compass-needle" transform="rotate(0 100 100)">`;
  svg += `<polygon points="100,20 107,100 100,90 93,100" class="needle-north"/>`;
  svg += `<polygon points="100,180 107,100 100,110 93,100" class="needle-south"/>`;
  svg += `</g>`;
  svg += `<circle cx="100" cy="100" r="5" class="compass-center"/>`;
  svg += `</svg>`;
  return svg;
}

function setCompassNeedle(id, deg){
  const needle = document.getElementById(id+'-needle');
  if(needle) needle.setAttribute('transform', `rotate(${deg} 100 100)`);
}

/* Angle (0-360, 0=N, clockwise) from a pointer event relative to an SVG element's center,
   snapping to the 8 principal directions when within snapToleranceDeg of one. */
function bearingFromPointerEvent(svgEl, evt, snapToleranceDeg){
  const rect = svgEl.getBoundingClientRect();
  const cx = rect.left + rect.width/2;
  const cy = rect.top + rect.height/2;
  const dx = evt.clientX - cx, dy = evt.clientY - cy;
  let bearing = (Math.atan2(dx, -dy) * 180/Math.PI + 360) % 360;
  const tol = snapToleranceDeg===undefined ? 4 : snapToleranceDeg;
  for(const s of [0,45,90,135,180,225,270,315]){
    let diff = Math.abs(bearing - s); if(diff>180) diff = 360-diff;
    if(diff < tol){ bearing = s; break; }
  }
  return Math.round(bearing);
}

/* Wires pointer drag/click interaction onto a compass SVG element.
   onChange(bearing) is called with the new bearing whenever it updates.
   Uses document-level move/up listeners (rather than setPointerCapture,
   which triggers an unwanted implicit scroll-into-view in some browsers). */
function initCompassInteraction(svgEl, onChange){
  function handle(e){
    onChange(bearingFromPointerEvent(svgEl, e));
  }
  function onMove(e){ handle(e); }
  function onUp(){
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);
    document.removeEventListener('pointercancel', onUp);
  }
  svgEl.addEventListener('pointerdown', e=>{
    handle(e);
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
  });
}

function buildSunCompassSVG(id, userHeading, sunAzimuth){
  const cx=100, cy=100, R=88;
  let svg = `<svg viewBox="0 0 200 200" class="compass-svg static" id="${id}">`;
  svg += `<circle cx="${cx}" cy="${cy}" r="${R}" class="compass-ring"/>`;
  svg += `<circle cx="${cx}" cy="${cy}" r="60" class="compass-ring-inner"/>`;
  for(let a=0;a<360;a+=15){
    const isMajor = a%45===0;
    const r1 = isMajor? 76 : 82;
    const rad = d2r(a);
    const x1=cx+r1*Math.sin(rad), y1=cy-r1*Math.cos(rad);
    const x2=cx+R*Math.sin(rad), y2=cy-R*Math.cos(rad);
    svg += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" class="compass-tick${isMajor?' major':''}"/>`;
  }
  COMPASS_DIRS.forEach(d=>{
    const rad = d2r(d.a);
    const x = cx + 67*Math.sin(rad);
    const y = cy - 67*Math.cos(rad) + 4;
    const cls = (d.a%90===0) ? 'compass-label major' : 'compass-label';
    svg += `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" class="${cls}" text-anchor="middle">${d.label}</text>`;
  });
  const hR = d2r(userHeading||0);
  const sR = d2r(sunAzimuth||0);
  svg += `<line x1="${cx}" y1="${cy}" x2="${(cx+70*Math.sin(hR)).toFixed(1)}" y2="${(cy-70*Math.cos(hR)).toFixed(1)}" stroke="#EF4444" stroke-width="3.5" stroke-linecap="round" opacity="0.9"/>`;
  svg += `<circle cx="${(cx+70*Math.sin(hR)).toFixed(1)}" cy="${(cy-70*Math.cos(hR)).toFixed(1)}" r="4" fill="#EF4444"/>`;
  svg += `<line x1="${cx}" y1="${cy}" x2="${(cx+60*Math.sin(sR)).toFixed(1)}" y2="${(cy-60*Math.cos(sR)).toFixed(1)}" stroke="#FBBF24" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="4 3" opacity="0.9"/>`;
  svg += `<circle cx="${(cx+60*Math.sin(sR)).toFixed(1)}" cy="${(cy-60*Math.cos(sR)).toFixed(1)}" r="4" fill="#FBBF24"/>`;
  svg += `<circle cx="${cx}" cy="${cy}" r="5" fill="#2563EB"/>`;
  svg += `</svg>`;
  return svg;
}

function setSunCompassNeedle(id, userHeading, sunAzimuth){
  const svg = document.getElementById(id);
  if(!svg) return;
  svg.outerHTML = buildSunCompassSVG(id, userHeading, sunAzimuth);
}

/* ---------- Result compass with fitting direction arrow ---------- */
function buildResultCompassSVG(id, fitAz){
  const cx=100, cy=100, R=88;
  let svg = `<svg viewBox="0 0 200 200" class="compass-svg static" id="${id}">`;
  svg += `<circle cx="${cx}" cy="${cy}" r="${R}" class="compass-ring"/>`;
  svg += `<circle cx="${cx}" cy="${cy}" r="60" class="compass-ring-inner"/>`;
  for(let a=0;a<360;a+=15){
    const isMajor = a%45===0;
    const r1 = isMajor? 76 : 82;
    const rad = d2r(a);
    const x1=cx+r1*Math.sin(rad), y1=cy-r1*Math.cos(rad);
    const x2=cx+R*Math.sin(rad), y2=cy-R*Math.cos(rad);
    svg += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" class="compass-tick${isMajor?' major':''}"/>`;
  }
  COMPASS_DIRS.forEach(d=>{
    const rad = d2r(d.a);
    const x = cx + 67*Math.sin(rad);
    const y = cy - 67*Math.cos(rad) + 4;
    const cls = (d.a%90===0) ? 'compass-label major' : 'compass-label';
    svg += `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" class="${cls}" text-anchor="middle">${d.label}</text>`;
  });
  /* Fitting direction arrow — bright green arrow pointing to optimum azimuth */
  const fR = d2r(fitAz||0);
  const arrowTipX = cx + 72*Math.sin(fR);
  const arrowTipY = cy - 72*Math.cos(fR);
  const arrowBaseX = cx + 10*Math.sin(fR);
  const arrowBaseY = cy - 10*Math.cos(fR);
  const arrowShaftX = cx + 52*Math.sin(fR);
  const arrowShaftY = cy - 52*Math.cos(fR);
  /* arrow shaft */
  svg += `<line x1="${arrowBaseX.toFixed(1)}" y1="${arrowBaseY.toFixed(1)}" x2="${arrowShaftX.toFixed(1)}" y2="${arrowShaftY.toFixed(1)}" stroke="#34D399" stroke-width="5" stroke-linecap="round" opacity="0.85"/>`;
  /* arrowhead */
  svg += `<polygon points="${arrowTipX.toFixed(1)},${arrowTipY.toFixed(1)} ${(cx+48*Math.sin(fR-d2r(22))).toFixed(1)},${(cy-48*Math.cos(fR-d2r(22))).toFixed(1)} ${(cx+48*Math.sin(fR+d2r(22))).toFixed(1)},${(cy-48*Math.cos(fR+d2r(22))).toFixed(1)}" fill="#34D399" opacity="0.9"/>`;
  /* label */
  const labelX = cx + 52*Math.sin(fR);
  const labelY = cy - 52*Math.cos(fR);
  svg += `<circle cx="${cx}" cy="${cy}" r="5" fill="#34D399"/>`;
  svg += `<text x="${cx}" y="${cy+82}" font-family="ui-monospace,monospace" font-size="9" fill="#34D399" text-anchor="middle" font-weight="600">FIT</text>`;
  svg += `</svg>`;
  return svg;
}

if(typeof window !== 'undefined'){
  window.Charts = {
    buildSunChartClean, buildBarChart, buildCompassSVG, setCompassNeedle,
    bearingFromPointerEvent, initCompassInteraction, compassFullName, COMPASS_DIRS,
    buildSunCompassSVG, setSunCompassNeedle, buildResultCompassSVG
  };
}
