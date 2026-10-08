/* ================================================================
   SOLMAX — APP
   SPA routing, navigation, and the full solar calculator.
   ================================================================ */
(function(){

const svgIcon = Icons.svgIcon;
const applyStaticIcons = Icons.applyStaticIcons;

/* ============================================================
   SPA PAGE ROUTING
   ============================================================ */
function navigateTo(page){
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById('page-' + page);
  if(target) target.classList.add('active');
  document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
  const link = document.querySelector(`.nav-links a[data-page="${page}"]`);
  if(link) link.classList.add('active');
  if(page === 'tool' && !document.querySelector('#page-tool .wrap .chart-card .chart-label #chartLatLabel').textContent.includes('awaiting')){
    setTimeout(()=>{
      const sc = document.querySelector('#sunChartMount svg');
      if(sc) sc.style.animation = 'none';
    }, 50);
  }
}

function handleHash(){
  const page = location.hash.slice(1) || 'home';
  if(document.getElementById('page-' + page)){
    navigateTo(page);
  } else {
    navigateTo('home');
  }
}

window.addEventListener('hashchange', handleHash);
handleHash();

/* Mobile nav toggle */
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');
if(navToggle){
  navToggle.addEventListener('click', ()=>{
    navLinks.classList.toggle('open');
  });
  document.querySelectorAll('.nav-links a').forEach(a => {
    a.addEventListener('click', ()=>{
      navLinks.classList.remove('open');
    });
  });
}

/* ============================================================
   CONTACT FORM
   ============================================================ */
const contactForm = document.getElementById('contactForm');
const formStatus = document.getElementById('formStatus');
if(contactForm){
  contactForm.addEventListener('submit', e => {
    e.preventDefault();
    const name = document.getElementById('contactName').value.trim();
    const email = document.getElementById('contactEmail').value.trim();
    const message = document.getElementById('contactMessage').value.trim();
    if(!name || !email || !message){
      formStatus.innerHTML = svgIcon('warning') + '<span>' + TranslationEngine.t('contact_error') + '</span>';
      formStatus.classList.add('show');
      formStatus.style.color = 'var(--danger)';
      return;
    }
    formStatus.innerHTML = svgIcon('check') + '<span>' + TranslationEngine.t('contact_success').replace('{name}', name) + '</span>';
    formStatus.classList.add('show');
    formStatus.style.color = 'var(--success)';
    contactForm.reset();
  });
}

/* ============================================================
   INFO TEXT
   ============================================================ */
const INFO_TEXT = {
  location: {
    title:'Latitude & longitude',
    text:"These tell us exactly where you are on Earth. <b>Latitude</b> tells us how far you are from the equator — this decides how high the sun goes in your sky. <b>Longitude</b> helps us figure out what time the sun rises and sets where you are."
  },
  fittingHeight: {
    title:'Fitting Height',
    text:"<b>Roof</b> — your solar panels will sit on top of your building's roof. Most homes have a first floor height of about 11 feet.<br><br><b>Ground</b> — your panels will stand on a metal frame on the ground, like a small structure in your yard or open space."
  },
  roofHeight: {
    title:'Roof height',
    text:"This is how tall your roof is from the ground. For a normal house with one floor, this is usually about <b>11 feet</b>. If you have two floors, it would be around 22 feet. This number helps us calculate the stand angles correctly."
  },
  groundHeight: {
    title:'Ground stand height',
    text:"This is how high off the ground your solar panel will sit on its stand. <b>11 feet</b> is a common choice — it keeps the panel safe and gives shade space underneath. You can go higher if you need to walk or park under it."
  },
  roofTypeSlope: {
    title:'Roof type',
    text:"<b>Flat</b> — your roof is almost level with very little slope. Water may pool on it. Panels on a flat roof need a stand to tilt them toward the sun.<br><br><b>Sloped</b> — your roof already has an angle or slope to it (like a triangle shape from the side). Panels can be mounted along this existing slope."
  },
  adjustmentType: {
    title:'Adjustment type',
    text:"<b>Stationary</b> — once installed, the panels stay in one fixed position. They are bolted to a stand that doesn't move. This is the most common and cheapest option.<br><br><b>Movable</b> — the panels can be tilted or turned by hand or with a motor. This lets you adjust them seasonally to follow the sun better, but costs more."
  },
  roofType: {
    title:'Roof type',
    text:"<b>Flat</b> — your roof is almost level. Panels need a tilted stand.<br><b>Sloped</b> — your roof has an angle already built in."
  },
  roofPitch: {
    title:'Roof pitch',
    text:"This is the angle of your sloped roof, measured from flat ground. <b>0°</b> would be perfectly flat. <b>90°</b> would be a vertical wall. Most houses have a roof angle between <b>15° and 40°</b>. You can check your house plans or use a phone angle-measuring app to find this number."
  },
  roofFacing: {
    title:'Roof facing direction',
    text:"This is the compass direction your roof slopes toward — the way rainwater would run off it. If you're not sure, stand outside at the bottom of your roof slope with your back against the roof. The direction you're facing is your answer. You can also drag the compass needle below to set it."
  },
  priority: {
    title:'Optimize for',
    text:"<b>Annual</b> — makes your panels produce the most energy over the whole year. This is the best choice for most people.<br><br><b>Winter</b> — tilts panels more steeply to catch the low winter sun. Pick this if you use more electricity in winter (for heating, lights).<br><br><b>Summer</b> — uses a shallower angle to catch the high summer sun. Pick this if you use more electricity in summer (for air conditioning)."
  },
  resultTilt: {
    title:'Tilt angle',
    text:"How much your solar panel should lean back from lying flat. A bigger number means a steeper lean. For example, 30° means the panel is tilted up 30 degrees from the ground."
  },
  resultAzimuth: {
    title:'Panel facing direction',
    text:"The compass direction your solar panel's face should point toward. This is the direction where the sun shines most directly on your panel. The compass in the results shows this with an arrow."
  },
  resultSpacing: {
    title:'Row spacing',
    text:"If you have more than one row of panels, this is the minimum gap between them so that one row doesn't cast a shadow on the row behind it."
  },
  resultHours: {
    title:'Effective sun hours per day',
    text:"On average, how many hours of strong, direct sunlight your panels will receive each day after accounting for the weather, temperature, and dirt on the panels."
  },
  panelWattage: {
    title:'Panel wattage',
    text:"The power rating written on your solar panel — how many watts it produces under perfect conditions. Most home panels are between <b>350W and 500W</b>. Check the label on your panel or ask your supplier."
  },
  panelEfficiency: {
    title:'Panel efficiency',
    text:"How good your panel is at turning sunlight into electricity. Most modern panels are about <b>19–23%</b> efficient. Higher is better, but the difference is usually small."
  },
  tempCoeff: {
    title:'Temperature coefficient',
    text:"Solar panels actually produce <b>less</b> power when they get too hot. This number tells us how much power is lost for each degree above 25°C. Most panels lose about <b>0.3–0.4%</b> for every extra degree of heat."
  }
};

/* ============================================================
   INFO POPOVER SYSTEM
   ============================================================ */
let activePopover = null;
function closePopover(){
  if(activePopover){
    activePopover.el.remove();
    activePopover.trigger.setAttribute('aria-expanded','false');
    activePopover = null;
    document.removeEventListener('click', onDocClick, true);
  }
}
function onDocClick(e){
  if(activePopover && !activePopover.el.contains(e.target) && !activePopover.trigger.contains(e.target)){
    closePopover();
  }
}
function positionPopover(pop, trigger){
  const r = trigger.getBoundingClientRect();
  const popRect = pop.getBoundingClientRect();
  const vw = document.documentElement.clientWidth;
  const vh = window.innerHeight;
  let top = r.bottom + window.scrollY + 10;
  let left = r.left + window.scrollX + r.width/2 - popRect.width/2;
  left = Math.max(10+window.scrollX, Math.min(left, window.scrollX+vw-popRect.width-10));
  let flip = false;
  if(r.bottom + popRect.height + 20 > vh){
    top = r.top + window.scrollY - popRect.height - 10;
    flip = true;
  }
  pop.classList.toggle('flip', flip);
  pop.style.top = top+'px';
  pop.style.left = left+'px';
  const arrowLeft = (r.left+window.scrollX+r.width/2) - left;
  const arrow = pop.querySelector('.ip-arrow');
  if(arrow) arrow.style.left = Math.max(12, Math.min(popRect.width-12, arrowLeft))+'px';
}
function openPopover(trigger, key){
  const data = INFO_TEXT[key];
  if(!data) return;
  closePopover();
  const pop = document.createElement('div');
  pop.className = 'info-popover';
  pop.innerHTML = `<div class="ip-title">${data.title}</div><div class="ip-text">${data.text}</div><div class="ip-arrow"></div>`;
  document.body.appendChild(pop);
  positionPopover(pop, trigger);
  trigger.setAttribute('aria-expanded','true');
  activePopover = {el:pop, trigger};
  setTimeout(()=>document.addEventListener('click', onDocClick, true), 0);
}
document.addEventListener('click', e=>{
  const btn = e.target.closest('.info-btn');
  if(!btn) return;
  e.stopPropagation();
  if(activePopover && activePopover.trigger===btn){ closePopover(); return; }
  openPopover(btn, btn.getAttribute('data-info'));
});
document.addEventListener('keydown', e=>{ if(e.key==='Escape') closePopover(); });
window.addEventListener('resize', ()=>{ if(activePopover) positionPopover(activePopover.el, activePopover.trigger); });

/* ============================================================
   STATE
   ============================================================ */
let state = { lat:null, lon:null, tzOffset: -new Date().getTimezoneOffset()/60, lockedSunAzimuth:null };
let lastEstimatedDailyKwh = null;

/* ============================================================
   COMPASS
   ============================================================ */
const facingMount = document.getElementById('facingCompassMount');
if(facingMount){
  facingMount.innerHTML = Charts.buildCompassSVG('facingCompass');
  const facingSvg = document.getElementById('facingCompass');

  function setFacingCompass(deg){
    deg = ((Math.round(deg)%360)+360)%360;
    Charts.setCompassNeedle('facingCompass', deg);
    document.getElementById('facingDegLabel').textContent = deg+'°';
    document.getElementById('facingNameLabel').textContent = Charts.compassFullName(deg);
    state.roofFacing = deg;
  }
  Charts.initCompassInteraction(facingSvg, setFacingCompass);
  setFacingCompass(180);
}

/* ============================================================
   LOCATION UI
   ============================================================ */
const locStatus = document.getElementById('locStatus');
const btnGeo = document.getElementById('btnGeo');
if(btnGeo){
  btnGeo.addEventListener('click', ()=>{
    if(!navigator.geolocation){
      showLocStatus(TranslationEngine.t('loc_not_available'), true);
      showManual();
      return;
    }
    showLocStatus(TranslationEngine.t('locating'), false);
    navigator.geolocation.getCurrentPosition(pos=>{
      state.lat = pos.coords.latitude;
      state.lon = pos.coords.longitude;
      const latInput = document.getElementById('latInput');
      const lonInput = document.getElementById('lonInput');
      if(latInput) latInput.value = state.lat.toFixed(4);
      if(lonInput) lonInput.value = state.lon.toFixed(4);
      const tz = state.tzOffset>=0?'+':''+state.tzOffset;
      showLocStatus(TranslationEngine.t('loc_found').replace('{lat}',state.lat.toFixed(3)).replace('{lon}',state.lon.toFixed(3)).replace('{tz}',tz), false);
      showManual();
      updateChartLabel();
      triggerSunCompass();
    }, ()=>{
      showLocStatus(TranslationEngine.t('loc_denied'), true);
      showManual();
    });
  });
}
document.getElementById('btnManual').addEventListener('click', showManual);
function showManual(){
  document.getElementById('latlonRow').classList.add('show');
}
function showLocStatus(msg, isErr){
  if(!locStatus) return;
  locStatus.innerHTML = svgIcon(isErr?'warning':'pin') + '<span>' + msg + '</span>';
  locStatus.classList.add('show');
  locStatus.classList.toggle('error', isErr);
}
document.getElementById('latInput').addEventListener('input', function(){
  updateChartLabel();
  const lat = parseFloat(this.value);
  const lon = parseFloat(document.getElementById('lonInput').value);
  if(!isNaN(lat) && !isNaN(lon)) triggerSunCompass();
});
document.getElementById('lonInput').addEventListener('input', function(){
  updateChartLabel();
  const lat = parseFloat(document.getElementById('latInput').value);
  const lon = parseFloat(this.value);
  if(!isNaN(lat) && !isNaN(lon)) triggerSunCompass();
});
function updateChartLabel(){
  const lat=parseFloat(document.getElementById('latInput').value);
  const chartLabel = document.getElementById('chartLatLabel');
  const mount = document.getElementById('sunChartMount');
  const insight = document.getElementById('chartInsight');
  if(!chartLabel || !mount) return;
  if(!isNaN(lat)){
    chartLabel.textContent = `LAT ${lat.toFixed(2)}°`;

    const decJun = SolarEngine.declination(172);
    const decDec = SolarEngine.declination(355);
    const summerPeak = SolarEngine.solarAltitude(lat, decJun, 0);
    const winterPeak = SolarEngine.solarAltitude(lat, decDec, 0);
    const haSummer = SolarEngine.hourAngleSunset(lat, decJun);
    const haWinter = SolarEngine.hourAngleSunset(lat, decDec);
    const dayLenSummer = (2 * haSummer / 15).toFixed(1);
    const dayLenWinter = (2 * haWinter / 15).toFixed(1);

    mount.innerHTML = Charts.buildSunChartClean(lat, true);

    if(insight){
      const _t = TranslationEngine.t;
      insight.innerHTML = `<span class="tag">${_t('chart_insight_tag')}</span> ${_t('chart_insight_text').replace('{summerPeak}',summerPeak.toFixed(1)).replace('{dayLenSummer}',dayLenSummer).replace('{winterPeak}',winterPeak.toFixed(1)).replace('{dayLenWinter}',dayLenWinter)}`;
      insight.classList.add('show');
    }
  } else {
    mount.innerHTML = Charts.buildSunChartClean(0, false);
    if(insight) insight.classList.remove('show');
  }
}
const sunChartMount = document.getElementById('sunChartMount');
if(sunChartMount) sunChartMount.innerHTML = Charts.buildSunChartClean(0,false);

/* ============================================================
   SEGMENTED CONTROLS
   ============================================================ */
const pitchRow=document.getElementById('pitchRow');
const roofHeightRow=document.getElementById('roofHeightRow');
const groundHeightRow=document.getElementById('groundHeightRow');
function radioValue(name){
  const el=document.querySelector(`input[name="${name}"]:checked`);
  return el ? el.value : null;
}
function setRadioValue(name, value){
  const el=document.querySelector(`input[name="${name}"][value="${value}"]`);
  if(!el) return;
  el.checked=true;
  const group=el.closest('.segmented');
  if(group){
    group.querySelectorAll('.seg-btn').forEach(c=>c.classList.remove('active'));
    el.closest('.seg-btn').classList.add('active');
  }
}
function wireSegmented(containerId, onChange){
  const container=document.getElementById(containerId);
  if(!container) return;
  container.addEventListener('change', e=>{
    if(!e.target.matches('input[type="radio"]')) return;
    container.querySelectorAll('.seg-btn').forEach(c=>c.classList.remove('active'));
    e.target.closest('.seg-btn').classList.add('active');
    if(onChange) onChange(e.target.value);
  });
}
function refreshMountDefaults(){
  const rt=radioValue('roofType');
  if(rt==='flat'){ setRadioValue('adjustmentType','stationary'); }
  else if(rt==='sloped'){ setRadioValue('adjustmentType','stationary'); }
  else { setRadioValue('adjustmentType','movable'); }
  refreshConditionals();
}
function refreshConditionals(){
  const mt=radioValue('adjustmentType');
  const fh=radioValue('fittingHeight');
  const needsPitch = mt==='stationary';
  if(pitchRow) pitchRow.classList.toggle('show', needsPitch);
  
  if(roofHeightRow) roofHeightRow.style.display = fh==='roof' ? 'flex' : 'none';
  if(groundHeightRow) groundHeightRow.style.display = fh==='ground' ? 'flex' : 'none';
}
wireSegmented('roofTypeGroup', refreshMountDefaults);
wireSegmented('adjustmentTypeGroup', refreshConditionals);
wireSegmented('fittingHeightGroup', refreshConditionals);
wireSegmented('priorityGroup');

/* ============================================================
   WEATHER — FREE OPEN-METEO API (no key needed)
   ============================================================ */
const btnFetchWeather = document.getElementById('btnFetchWeather');
const weatherStatus = document.getElementById('weatherStatus');
const cloudCoverSlider = document.getElementById('cloudCoverSlider');
const cloudCoverVal = document.getElementById('cloudCoverVal');
const avgTempInput = document.getElementById('avgTempInput');

if(cloudCoverSlider && cloudCoverVal){
  cloudCoverSlider.addEventListener('input', ()=>{
    cloudCoverVal.textContent = cloudCoverSlider.value + '%';
  });
}

if(btnFetchWeather){
  btnFetchWeather.addEventListener('click', async ()=>{
    const lat = parseFloat(document.getElementById('latInput').value);
    const lon = parseFloat(document.getElementById('lonInput').value);
    if(isNaN(lat) || isNaN(lon)){
      weatherStatus.innerHTML = svgIcon('warning') + '<span>' + TranslationEngine.t('weather_enter_location') + '</span>';
      weatherStatus.classList.add('show');
      weatherStatus.classList.add('error');
      return;
    }
    weatherStatus.innerHTML = '<span class="spinner"></span> ' + TranslationEngine.t('weather_fetching');
    weatherStatus.classList.add('show');
    weatherStatus.classList.remove('error');
    try{
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,cloud_cover_mean,precipitation_sum&timezone=auto&forecast_days=7`;
      const resp = await fetch(url);
      if(!resp.ok) throw new Error('Weather API returned ' + resp.status);
      const data = await resp.json();
      const daily = data.daily;
      const avgCloud = daily.cloud_cover_mean.reduce((a,b)=>a+b,0) / daily.cloud_cover_mean.length;
      const avgTemp = daily.temperature_2m_max.reduce((a,b)=>a+b,0) / daily.temperature_2m_max.length;
      cloudCoverSlider.value = Math.round(avgCloud);
      cloudCoverVal.textContent = Math.round(avgCloud) + '%';
      avgTempInput.value = Math.round(avgTemp);
      weatherStatus.innerHTML = svgIcon('check') + '<span>' + TranslationEngine.t('weather_fetched').replace('{cloud}',Math.round(avgCloud)).replace('{temp}',Math.round(avgTemp)) + '</span>';
      weatherStatus.classList.remove('error');
    }catch(err){
      weatherStatus.innerHTML = svgIcon('warning') + '<span>' + TranslationEngine.t('weather_error').replace('{msg}', err.message) + '</span>';
      weatherStatus.classList.add('error');
    }
  });
}

/* ============================================================
   SUN COMPASS — live heading vs sun azimuth
   ============================================================ */
const sunCompassModule = document.getElementById('sunCompassModule');
const sunCompassMount = document.getElementById('sunCompassMount');
const sunHeadingVal = document.getElementById('sunHeadingVal');
const sunAzimuthVal = document.getElementById('sunAzimuthVal');
const sunDiffVal = document.getElementById('sunDiffVal');
const sunLocalTimeVal = document.getElementById('sunLocalTimeVal');
const sunCompassHint = document.getElementById('sunCompassHint');
const sunCompassStatus = document.getElementById('sunCompassStatus');
let sunOrientationListener = null;
let sunCompassActive = false;

function showSunCompass(){
  if(!sunCompassModule) return;
  const lat = parseFloat(document.getElementById('latInput').value);
  const lon = parseFloat(document.getElementById('lonInput').value);
  if(isNaN(lat) || isNaN(lon)) return;

  sunCompassModule.style.display = 'block';
  sunCompassMount.innerHTML = Charts.buildSunCompassSVG('sunCompassSVG', 0, 0);

  // Show local time
  const now = new Date();
  const tzOffset = state.tzOffset !== undefined ? state.tzOffset : -now.getTimezoneOffset()/60;
  const tzSign = tzOffset >= 0 ? '+' : '';
  const localTimeStr = now.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
  if(sunLocalTimeVal) sunLocalTimeVal.textContent = `${localTimeStr} (UTC${tzSign}${tzOffset})`;

  updateSunCompassDesc(lat, lon);

  if(!window.DeviceOrientationEvent){
    if(sunCompassHint) sunCompassHint.innerHTML = `<span data-icon="warning"></span><span>${TranslationEngine.t('sun_compass_no_device')}</span>`;
    return;
  }

  if(window.DeviceOrientationEvent.requestPermission){
    DeviceOrientationEvent.requestPermission().then(perm => {
      if(perm !== 'granted'){
        if(sunCompassHint) sunCompassHint.innerHTML = `<span data-icon="warning"></span><span>${TranslationEngine.t('sun_compass_no_permission')}</span>`;
        return;
      }
      startSunOrientation(lat, lon);
    }).catch(() => startSunOrientation(lat, lon));
  } else {
    startSunOrientation(lat, lon);
  }
}

function updateSunCompassDesc(lat, lon){
  const desc = document.getElementById('sunCompassDesc');
  if(!desc) return;
  const now = new Date();
  const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
  const dec = SolarEngine.declination(dayOfYear);
  const HA = SolarEngine.hourAngleSunset(lat, dec);
  const altNow = SolarEngine.solarAltitude(lat, dec, 0);
  desc.textContent = TranslationEngine.t('sun_compass_update').replace('{alt}',altNow.toFixed(0)).replace('{daylight}',(2*HA/15).toFixed(1));
}

function startSunOrientation(lat, lon){
  if(sunCompassActive) return;
  sunCompassActive = true;
  if(sunCompassHint) sunCompassHint.style.display = 'flex';
  const sunCompassLock = document.getElementById('sunCompassLock');
  if(sunCompassLock) sunCompassLock.style.display = 'block';

  const listener = e => {
    if(e.alpha === null) return;
    const heading = ((e.alpha % 360) + 360) % 360;

    // Compute sun's current azimuth
    const now = new Date();
    const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
    const dec = SolarEngine.declination(dayOfYear);
    const solarHour = (now.getUTCHours() + now.getUTCMinutes()/60 - 12) + state.tzOffset;
    const H = solarHour * 15;
    const sunAz = SolarEngine.solarAzimuth(lat, dec, H);

    // Update compass
    Charts.setSunCompassNeedle('sunCompassSVG', heading, sunAz);

    if(sunHeadingVal) sunHeadingVal.textContent = `${Math.round(heading)}° (${Charts.compassFullName(heading)})`;
    if(sunAzimuthVal) sunAzimuthVal.textContent = `${Math.round(sunAz)}° (${Charts.compassFullName(sunAz)})`;

    let diff = Math.abs(heading - sunAz);
    if(diff > 180) diff = 360 - diff;
    if(sunDiffVal) sunDiffVal.textContent = `${Math.round(diff)}°`;

    // Update hint
    const hintEl = document.getElementById('sunCompassHint');
    if(hintEl && diff < 10){
      hintEl.innerHTML = `<span data-icon="check"></span><span>${TranslationEngine.t('sun_compass_pointing')}</span>`;
    }
  };
  sunOrientationListener = listener;
  window.addEventListener('deviceorientation', listener);
}

function stopSunOrientation(){
  if(sunOrientationListener){
    window.removeEventListener('deviceorientation', sunOrientationListener);
    sunOrientationListener = null;
  }
  sunCompassActive = false;
}

// Calibrate button — captures current heading as "pointed at sun"
const btnCalibrateSun = document.getElementById('btnCalibrateSun');
if(btnCalibrateSun){
  btnCalibrateSun.addEventListener('click', ()=>{
    if(sunCompassStatus){
      const heading = sunHeadingVal ? sunHeadingVal.textContent : '—';
      const sunAz = sunAzimuthVal ? sunAzimuthVal.textContent : '—';
      sunCompassStatus.innerHTML = svgIcon('check') + `<span>${TranslationEngine.t('sun_compass_calibrated').replace('{heading}', heading).replace('{sunAz}', sunAz)}</span>`;
      sunCompassStatus.classList.add('show');
      sunCompassStatus.classList.remove('error');
    }
  });
}

// Lock Sun Direction button — captures current sun azimuth as locked direction
const btnLockSunDirection = document.getElementById('btnLockSunDirection');
const sunLockStatus = document.getElementById('sunLockStatus');
if(btnLockSunDirection){
  btnLockSunDirection.addEventListener('click', ()=>{
    const sunAz = sunAzimuthVal ? sunAzimuthVal.textContent : '—';
    const sunAzNum = parseFloat(sunAz);
    if(!isNaN(sunAzNum)){
      state.lockedSunAzimuth = sunAzNum;
      if(sunLockStatus){
      sunLockStatus.innerHTML = svgIcon('check') + '<span>' + TranslationEngine.t('sun_compass_locked').replace('{az}',Math.round(sunAzNum)).replace('{dir}',Charts.compassFullName(sunAzNum)) + '</span>';
        sunLockStatus.classList.add('show');
        sunLockStatus.classList.remove('error');
      }
      // Update the facing compass to match locked sun direction
      setFacingCompass(sunAzNum);
    } else {
      if(sunLockStatus){
        sunLockStatus.innerHTML = svgIcon('warning') + `<span>${TranslationEngine.t('sun_compass_lock_error')}</span>`;
        sunLockStatus.classList.add('show');
        sunLockStatus.classList.add('error');
      }
    }
  });
}

// Auto-show sun compass when location is confirmed
function triggerSunCompass(){
  showSunCompass();
}

/* ============================================================
   CALCULATE
   ============================================================ */
document.getElementById('btnCalc').addEventListener('click', ()=>{
  const calcError=document.getElementById('calcError');
  calcError.classList.remove('show');

  const lat = parseFloat(document.getElementById('latInput').value);
  const lon = parseFloat(document.getElementById('lonInput').value);
  if(isNaN(lat) || isNaN(lon) || lat<-90||lat>90||lon<-180||lon>180){
    calcError.innerHTML = svgIcon('warning') + '<span>' + TranslationEngine.t('calc_error_location') + '</span>';
    calcError.classList.add('show');
    return;
  }
  state.lat=lat; state.lon=lon;

  const adjustmentType = radioValue('adjustmentType');
  const fittingHeight = radioValue('fittingHeight');
  const roofType = radioValue('roofType');
  const roofHeight = parseFloat(document.getElementById('roofHeight').value) || 11;
  const groundHeight = parseFloat(document.getElementById('groundHeight').value) || 11;
  const numOr = (val, fallback) => { const n = parseFloat(val); return isNaN(n) ? fallback : n; };
  const roofPitch = numOr(document.getElementById('roofPitch').value, 30);
  const roofFacing = state.roofFacing !== undefined ? state.roofFacing : 180;
  const priority = radioValue('priority');
  const months = SolarEngine.monthsForPriority(priority, lat);
  const E = SolarEngine;

  // Weather & environment params
  const cloudCover = parseInt(cloudCoverSlider ? cloudCoverSlider.value : 35, 10);
  const avgTemp = numOr(avgTempInput ? avgTempInput.value : null, 25);
  const daysSinceRain = numOr(document.getElementById('daysSinceRain') ? document.getElementById('daysSinceRain').value : null, 7);

  // System params
  const tempCoeff = numOr(document.getElementById('tempCoeff').value, -0.35);

  let finalTilt, finalAz, mismatchHtml=null;

  if(adjustmentType==='stationary'){
    finalTilt = roofPitch;
    finalAz = state.lockedSunAzimuth !== null ? state.lockedSunAzimuth : roofFacing;
    const ideal = E.optimizeTiltAndAzimuth(lat, months);
    const actualVal = E.metric(lat, finalTilt, finalAz, months, 3, E.REP_DAY);
    const ratio = actualVal/ideal.val;
    if(ratio < 0.93){
      mismatchHtml = TranslationEngine.t('mismatch_stationary').replace('{ratio}',Math.round(ratio*100)).replace('{tilt}',ideal.tilt).replace('{dir}',E.compassLabel(ideal.az));
    }
  } else {
    const lockedAz = state.lockedSunAzimuth !== null ? state.lockedSunAzimuth : roofFacing;
    const opt = E.optimizeTilt(lat, lockedAz, months);
    finalTilt = opt.tilt;
    finalAz = lockedAz;
    const idealFree = E.optimizeTiltAndAzimuth(lat, months);
    const ratio = opt.val/idealFree.val;
    if(ratio < 0.93){
      mismatchHtml = TranslationEngine.t('mismatch_movable').replace('{dir}',E.compassLabel(finalAz)).replace('{tilt}',finalTilt).replace('{ratio}',Math.round(ratio*100));
    }
  }

  const monthData = E.REP_DAY.map((N,i)=>{
    const p = E.dayProfile(lat, lon, state.tzOffset, N, finalTilt, finalAz);
    return {name:E.MONTH_NAMES[i], ...p};
  });

  const avgEffHours = monthData.reduce((s,m)=>s+m.effHours,0)/12;
  const bestHours = Math.max(...monthData.map(m=>m.effHours));
  const goodDays = monthData.reduce((s,m,i)=> s + (m.effHours >= bestHours*0.75 ? E.DIM[i] : 0), 0);
  const equinox = E.dayProfile(lat,lon,state.tzOffset,81,finalTilt,finalAz);

  // Apply weather and efficiency adjustments
  const cloudFactor = E.cloudAdjustment(cloudCover);
  const soilingFactor = E.soilingAdjustment(daysSinceRain);
  const panelTemp = E.panelTemperature(avgTemp, 600);
  const tempFactor = E.tempDeratingFactor(panelTemp, tempCoeff / 100);
  const sysLoss = E.systemLossFactor();

  const adjustedEffHours = avgEffHours * cloudFactor * tempFactor * soilingFactor * sysLoss;

  document.getElementById('outTilt').innerHTML = `${finalTilt.toFixed(1)}<small>°</small>`;
  document.getElementById('outAzimuth').innerHTML = `${E.compassLabel(finalAz)} <small style="font-size:14px; color:var(--text-muted);">${finalAz.toFixed(0)}°</small>`;
  document.getElementById('outSpacing').innerHTML = `<small>—</small>`;
  document.getElementById('outHours').innerHTML = `${adjustedEffHours.toFixed(1)}<small> hrs</small>`;

  document.getElementById('resultCompassMount').innerHTML = Charts.buildResultCompassSVG('resultCompass', finalAz);
  Charts.setCompassNeedle('resultCompass', finalAz);

  // Show locked sun direction in results
  const lockedSunDisplay = document.getElementById('lockedSunDisplay');
  const lockedSunText = document.getElementById('lockedSunText');
  if(state.lockedSunAzimuth !== null){
    if(lockedSunDisplay) lockedSunDisplay.style.display = 'block';
    if(lockedSunText) lockedSunText.textContent = `${Math.round(state.lockedSunAzimuth)}° (${E.compassLabel(state.lockedSunAzimuth)})`;
  } else {
    if(lockedSunDisplay) lockedSunDisplay.style.display = 'none';
  }

  // Compute stand angles for the two-leg stand
  const standHeight = fittingHeight === 'roof' ? roofHeight : groundHeight;
  const panelLengthFt = 6.5; // standard panel ~6.5ft long
  const tiltRad = finalTilt * Math.PI / 180;
  
  // For a two-leg stand:
  // Back leg angle = tilt angle from vertical (steeper = more tilt)
  // Front leg angle = 0° from vertical (vertical front leg)
  const backLegAngle = finalTilt;
  const frontLegAngle = 0;
  
  // Height calculations
  const backLegHeight = standHeight + panelLengthFt * Math.sin(tiltRad);
  const frontLegHeight = standHeight;
  
  // Stand base length (horizontal distance between legs)
  const standBase = panelLengthFt * Math.cos(tiltRad);

  // Update stand angle display in results
  const _t = TranslationEngine.t;
  const standAngleHtml = `
    <div class="stand-angle-panel">
      <h4 data-icon="angle">${_t('stand_title')}</h4>
      <div class="stand-visual">
        <svg viewBox="0 0 300 150" xmlns="http://www.w3.org/2000/svg" class="stand-svg">
          <line x1="40" y1="130" x2="260" y2="130" stroke="var(--border)" stroke-width="1" stroke-dasharray="4 4"/>
          <line x1="60" y1="130" x2="60" y2="${130 - frontLegHeight * 5}" stroke="var(--accent)" stroke-width="3" stroke-linecap="round"/>
          <line x1="240" y1="130" x2="${240 - standBase * 5}" y2="${130 - backLegHeight * 5}" stroke="var(--accent)" stroke-width="3" stroke-linecap="round"/>
          <line x1="60" y2="${130 - frontLegHeight * 5}" x2="${240 - standBase * 5}" y1="${130 - backLegHeight * 5}" stroke="var(--heading)" stroke-width="4" stroke-linecap="round"/>
          <text x="30" y="${130 - frontLegHeight * 2.5}" font-size="9" fill="var(--text-muted)" font-family="DM Mono, monospace">${TranslationEngine.t('stand_svg_front')}</text>
          <text x="${250 - standBase * 2.5}" y="${130 - backLegHeight * 2.5}" font-size="9" fill="var(--text-muted)" font-family="DM Mono, monospace">${TranslationEngine.t('stand_svg_back')}</text>
          <text x="150" y="145" font-size="9" fill="var(--body-faint)" font-family="DM Mono, monospace" text-anchor="middle">${TranslationEngine.t('stand_svg_ground')}</text>
        </svg>
      </div>
      <div class="stand-readout-grid">
        <div class="stand-readout-item">
          <span class="stand-k">${_t('stand_front')}</span>
          <span class="stand-v">${frontLegAngle.toFixed(1)}° <small>${_t('stand_front_hint')}</small></span>
          <span class="stand-hint">${_t('stand_height_prefix')} ${frontLegHeight.toFixed(1)} ${_t('stand_ft')}</span>
        </div>
        <div class="stand-readout-item">
          <span class="stand-k">${_t('stand_back')}</span>
          <span class="stand-v">${backLegAngle.toFixed(1)}° <small>${_t('stand_back_hint')}</small></span>
          <span class="stand-hint">${_t('stand_height_prefix')} ${backLegHeight.toFixed(1)} ${_t('stand_ft')}</span>
        </div>
        <div class="stand-readout-item">
          <span class="stand-k">${_t('stand_base')}</span>
          <span class="stand-v">${standBase.toFixed(1)} ${_t('stand_ft')}</span>
          <span class="stand-hint">${_t('stand_base_hint')}</span>
        </div>
        <div class="stand-readout-item">
          <span class="stand-k">${_t('stand_tilt')}</span>
          <span class="stand-v">${finalTilt.toFixed(1)}°</span>
          <span class="stand-hint">${_t('stand_tilt_hint')}</span>
        </div>
      </div>
    </div>`;

  const _pt = TranslationEngine.t;
  const windowTxt = equinox && equinox.startClock!==null
    ? _pt('plain_summary_window').replace('{start}',E.fmtClock(equinox.startClock)).replace('{end}',E.fmtClock(equinox.endClock))
    : _pt('plain_summary_window_varies');

  document.getElementById('plainSummary').innerHTML =
    _pt('plain_summary').replace('{tilt}',finalTilt.toFixed(1)).replace('{dir}',E.compassLabel(finalAz)).replace('{hours}',adjustedEffHours.toFixed(1)).replace('{rawHours}',avgEffHours.toFixed(1)).replace('{window}',windowTxt).replace('{goodDays}',goodDays) +
    `<br><span style="font-size:12.5px; color:var(--text-muted);">${_pt('plain_summary_factors').replace('{cloud}',Math.round((1-cloudFactor)*100)).replace('{temp}',Math.round((1-tempFactor)*100)).replace('{soiling}',Math.round((1-soilingFactor)*100)).replace('{sys}',Math.round((1-sysLoss)*100))}</span>`;

  document.getElementById('standAnglePanel').innerHTML = standAngleHtml;

  // Store estimated daily kWh for feedback system
  lastEstimatedDailyKwh = adjustedEffHours;

  const mismatchNote = document.getElementById('mismatchNote');
  if(mismatchHtml){
    mismatchNote.innerHTML = svgIcon('warning') + '<span>' + mismatchHtml + '</span>';
    mismatchNote.style.display='flex';
    mismatchNote.classList.add('warn');
  } else {
    mismatchNote.style.display='none';
  }

  document.getElementById('barChartMount').innerHTML = Charts.buildBarChart(monthData);

  const tbody = document.querySelector('#monthTable tbody');
  tbody.innerHTML = monthData.map((m)=>{
    const isBest = m.effHours===bestHours;
    const windowStr = m.startClock!==null ? `${E.fmtClock(m.startClock)}–${E.fmtClock(m.endClock)}` : '—';
    return `<tr><td>${m.name}</td><td>${windowStr}</td><td>${m.dayLength.toFixed(1)} h</td><td class="${isBest?'best-month':''}">${m.effHours.toFixed(1)} h</td></tr>`;
  }).join('');

  const _cv = TranslationEngine.t;
  const caveats = [
    _cv('caveat1'),
    _cv('caveat2'),
    _cv('caveat3'),
    _cv('caveat4'),
    _cv('caveat5')
  ];
  document.getElementById('caveatsList').innerHTML = caveats.map((c,i)=>{
    const ic = i===caveats.length-1 ? 'shieldCheck' : 'warning';
    return `<li>${svgIcon(ic)}<span>${c}</span></li>`;
  }).join('');

  document.getElementById('results').classList.add('show');
  document.getElementById('results').scrollIntoView({behavior:'smooth', block:'start'});
});

/* ============================================================
   SELF-LEARNING — LOCAL FEEDBACK SYSTEM
   Stores user feedback in localStorage to track accuracy
   and show regional learning summary.
   ============================================================ */
const btnFeedback = document.getElementById('btnFeedback');
const feedbackStatus = document.getElementById('feedbackStatus');
const learningSummary = document.getElementById('learningSummary');
const LEARNING_KEY = 'solmax_feedback';

function loadFeedback(){
  try{
    return JSON.parse(localStorage.getItem(LEARNING_KEY)) || [];
  }catch{ return []; }
}

function saveFeedback(fb){
  try{
    localStorage.setItem(LEARNING_KEY, JSON.stringify(fb));
  }catch{}
}

if(btnFeedback){
  btnFeedback.addEventListener('click', ()=>{
    const actualKwh = parseFloat(document.getElementById('feedbackAccuracy').value);
    const monthsData = parseInt(document.getElementById('feedbackMonths').value, 10) || 6;
    if(isNaN(actualKwh) || actualKwh <= 0){
      feedbackStatus.innerHTML = svgIcon('warning') + '<span>' + TranslationEngine.t('feedback_error_valid') + '</span>';
      feedbackStatus.classList.add('show');
      feedbackStatus.style.color = 'var(--danger)';
      return;
    }
    const estDaily = lastEstimatedDailyKwh;
    if(!estDaily || estDaily <= 0){
      feedbackStatus.innerHTML = svgIcon('warning') + '<span>' + TranslationEngine.t('feedback_error_calc') + '</span>';
      feedbackStatus.classList.add('show');
      feedbackStatus.style.color = 'var(--danger)';
      return;
    }
    const ratio = actualKwh / estDaily;
    const entry = {
      date: new Date().toISOString(),
      lat: state.lat,
      lon: state.lon,
      tilt: parseFloat(document.getElementById('outTilt').textContent),
      estimatedDailyKwh: estDaily,
      actualDailyKwh: actualKwh,
      accuracyRatio: ratio,
      monthsData: monthsData
    };
    const all = loadFeedback();
    all.push(entry);
    saveFeedback(all);
    feedbackStatus.innerHTML = svgIcon('check') + `<span>${TranslationEngine.t('feedback_saved').replace('{kwh}', actualKwh).replace('{ratio}', (ratio*100).toFixed(0))}</span>`;
    feedbackStatus.classList.add('show');
    feedbackStatus.style.color = 'var(--success)';
    updateLearningSummary();
  });
}

function updateLearningSummary(){
  const all = loadFeedback();
  if(all.length === 0){
    if(learningSummary) learningSummary.style.display = 'none';
    return;
  }
  const totalRatio = all.reduce((s, e) => s + e.accuracyRatio, 0);
  const avgRatio = totalRatio / all.length;
  const regionEntries = state.lat ? all.filter(e =>
    e.lat && Math.abs(e.lat - state.lat) < 5 && Math.abs(e.lon - state.lon) < 5
  ) : [];
  const regionAvg = regionEntries.length > 0
    ? regionEntries.reduce((s,e) => s + e.accuracyRatio, 0) / regionEntries.length
    : null;
  let html = `<div class="learn-header" data-icon="feedback">${TranslationEngine.t('feedback_learning_header').replace('{count}', all.length)}</div>`;
  html += `<div class="learn-body">`;
  html += TranslationEngine.t('feedback_learning_global').replace('{avg}', (avgRatio*100).toFixed(0));
  if(regionAvg !== null){
    html += ` &middot; ` + TranslationEngine.t('feedback_learning_local').replace('{count}', regionEntries.length).replace('{avg}', (regionAvg*100).toFixed(0));
  }
  html += `</div>`;
  learningSummary.innerHTML = html;
  learningSummary.style.display = 'block';
}

// Show learning summary on load
updateLearningSummary();

// init
refreshConditionals();
applyStaticIcons();

/* ============================================================
   LANGUAGE SELECTOR
   ============================================================ */
const langSelect = document.getElementById('langSelect');
if(langSelect){
  langSelect.value = TranslationEngine.currentLang;
  langSelect.addEventListener('change', ()=>{
    TranslationEngine.setLanguage(langSelect.value);
    updateLearningSummary();
  });
}
// Apply saved translations on load
TranslationEngine.applyTranslations();

})();
