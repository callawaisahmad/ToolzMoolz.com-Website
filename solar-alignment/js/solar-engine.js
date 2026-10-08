/* ================================================================
   HELIOTROPE — SOLAR GEOMETRY ENGINE
   Pure astronomy math. No DOM access, no external API calls.
   Formulas: standard solar-position equations (declination, hour
   angle, equation of time, angle of incidence on a tilted surface)
   as used in PV engineering references (e.g. Duffie & Beckman).
   ================================================================ */

const REP_DAY = [17,47,75,105,135,162,198,228,258,288,318,344]; // Klein/Cooper average day per month
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DIM = [31,28,31,30,31,30,31,31,30,31,30,31];
const COMPASS16 = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];

const d2r = d => d*Math.PI/180;
const r2d = r => r*180/Math.PI;

function declination(N){ return 23.45*Math.sin(d2r(360/365*(284+N))); }

function eotMinutes(N){
  const B = d2r(360/365*(N-81));
  return 9.87*Math.sin(2*B) - 7.53*Math.cos(B) - 1.5*Math.sin(B);
}

function hourAngleSunset(lat, dec){
  const cosH = Math.max(-1, Math.min(1, -Math.tan(d2r(lat))*Math.tan(d2r(dec))));
  return r2d(Math.acos(cosH));
}

function solarAltitude(lat, dec, H){
  return r2d(Math.asin(Math.sin(d2r(lat))*Math.sin(d2r(dec)) + Math.cos(d2r(lat))*Math.cos(d2r(dec))*Math.cos(d2r(H))));
}

function solarAzimuth(lat, dec, H){
  const phi=d2r(lat), delta=d2r(dec), Hr=d2r(H);
  const num = -Math.sin(Hr)*Math.cos(delta);
  const den = Math.sin(delta)*Math.cos(phi) - Math.cos(delta)*Math.sin(phi)*Math.cos(Hr);
  let az = r2d(Math.atan2(num, den));
  az = ((az%360)+360)%360;
  return az;
}

function cosIncidence(lat, dec, H, tilt, azCompass){
  const phi=d2r(lat), delta=d2r(dec), beta=d2r(tilt), gamma=d2r(azCompass-180), Hr=d2r(H);
  return Math.sin(delta)*Math.sin(phi)*Math.cos(beta)
       - Math.sin(delta)*Math.cos(phi)*Math.sin(beta)*Math.cos(gamma)
       + Math.cos(delta)*Math.cos(phi)*Math.cos(beta)*Math.cos(Hr)
       + Math.cos(delta)*Math.sin(phi)*Math.sin(beta)*Math.cos(gamma)*Math.cos(Hr)
       + Math.cos(delta)*Math.sin(beta)*Math.sin(gamma)*Math.sin(Hr);
}

function clockTimeFromSolarHour(solarHour, lon, N, tzOffsetHours){
  const LSTM = 15*tzOffsetHours;
  const TC = 4*(lon-LSTM) + eotMinutes(N);
  let t = solarHour - TC/60;
  t = ((t % 24)+24) % 24;
  return t;
}

function fmtClock(hoursDecimal){
  let h = Math.floor(hoursDecimal);
  let m = Math.round((hoursDecimal-h)*60);
  if(m===60){m=0;h+=1;}
  h = ((h%24)+24)%24;
  const ampm = h>=12 ? 'PM':'AM';
  let h12 = h%12; if(h12===0) h12=12;
  return `${h12}:${String(m).padStart(2,'0')} ${ampm}`;
}

// Annual/seasonal metric used for optimization search
function metric(lat, tilt, az, months, hStep, dayList){
  let total=0;
  for(const m of months){
    const N=dayList[m], dec=declination(N);
    const HA0=hourAngleSunset(lat,dec);
    let dayIntegral=0;
    for(let H=-HA0; H<=HA0; H+=hStep){
      const alt=solarAltitude(lat,dec,H);
      if(alt>10){
        const c=cosIncidence(lat,dec,H,tilt,az);
        if(c>0) dayIntegral += c*(hStep/15);
      }
    }
    total += dayIntegral*DIM[m];
  }
  return total;
}

function monthsForPriority(priority, lat){
  const all=[0,1,2,3,4,5,6,7,8,9,10,11];
  if(priority==='annual') return all;
  const north = lat>=0;
  const winterN=[9,10,11,0,1,2], summerN=[3,4,5,6,7,8];
  if(priority==='winter') return north? winterN : summerN;
  if(priority==='summer') return north? summerN : winterN;
  return all;
}

function optimizeTilt(lat, az, months){
  let best=0, bestVal=-Infinity;
  for(let t=0;t<=90;t+=1){
    const v=metric(lat,t,az,months,5,REP_DAY);
    if(v>bestVal){bestVal=v;best=t;}
  }
  let best2=best, bestVal2=-Infinity;
  for(let t=Math.max(0,best-1); t<=Math.min(90,best+1); t+=0.25){
    const v=metric(lat,t,az,months,2,REP_DAY);
    if(v>bestVal2){bestVal2=v;best2=t;}
  }
  return {tilt:Math.round(best2*10)/10, val:bestVal2};
}

function optimizeTiltAndAzimuth(lat, months){
  let best={tilt:0,az:180,val:-Infinity};
  for(let az=0; az<360; az+=10){
    for(let t=0;t<=90;t+=5){
      const v=metric(lat,t,az,months,8,REP_DAY);
      if(v>best.val) best={tilt:t,az:az,val:v};
    }
  }
  let refined={tilt:best.tilt,az:best.az,val:-Infinity};
  for(let az=best.az-15; az<=best.az+15; az+=2){
    for(let t=Math.max(0,best.tilt-8); t<=Math.min(90,best.tilt+8); t+=1){
      const azNorm=((az%360)+360)%360;
      const v=metric(lat,t,azNorm,months,3,REP_DAY);
      if(v>refined.val) refined={tilt:t,az:azNorm,val:v};
    }
  }
  return refined;
}

function compassLabel(deg){
  const idx=Math.round(((deg%360)+360)%360/22.5)%16;
  return COMPASS16[idx];
}

function rowSpacing(tilt, panelHeightM, lat){
  const worstDec = lat>=0 ? -23.45 : 23.45;
  const altMinNoon = 90 - Math.abs(lat - worstDec);
  const altR = d2r(Math.max(altMinNoon,3));
  const tiltR = d2r(tilt);
  return panelHeightM*(Math.cos(tiltR) + Math.sin(tiltR)/Math.tan(altR));
}

function dayProfile(lat, lon, tzOffset, N, tilt, az){
  const dec=declination(N);
  const HA0=hourAngleSunset(lat,dec);
  const dayLength=(2/15)*HA0;
  let effHours=0;
  let firstProductive=null, lastProductive=null;
  const step=1;
  for(let H=-HA0; H<=HA0; H+=step){
    const alt=solarAltitude(lat,dec,H);
    const c=cosIncidence(lat,dec,H,tilt,az);
    if(alt>10 && c>0){
      effHours += c*(step/15);
      const solarHour = 12+H/15;
      if(firstProductive===null) firstProductive=solarHour;
      lastProductive=solarHour;
    }
  }
  let startClock=null, endClock=null;
  if(firstProductive!==null){
    startClock = clockTimeFromSolarHour(firstProductive, lon, N, tzOffset);
    endClock = clockTimeFromSolarHour(lastProductive, lon, N, tzOffset);
  }
  return {dec, dayLength, effHours, startClock, endClock};
}

// === ENHANCED MODELS (weather, efficiency, financials) ===

function relativeAirMass(altitudeDeg){
  if(altitudeDeg < 0) return 40;
  const zen = 90 - altitudeDeg;
  if(zen >= 90) return 40;
  const zenR = d2r(zen);
  return 1 / (Math.cos(zenR) + 0.50572 * Math.pow(96.07995 - zen, -1.6364));
}

function diffuseFraction(airMass, clearnessIndex){
  const kt = Math.max(0.1, Math.min(0.8, clearnessIndex || 0.5));
  return Math.min(0.85, Math.max(0.12, 0.95 - 0.08 * kt));
}

function panelTemperature(ambientC, irradianceWM2){
  const NOCT = 45;
  return ambientC + (NOCT - 20) * Math.max(0, irradianceWM2 || 500) / 800;
}

function tempDeratingFactor(tempC, tempCoeff){
  const STC = 25;
  return 1 + (tempCoeff || -0.0035) * (tempC - STC);
}

function cloudAdjustment(cloudCoverPct){
  const cc = Math.max(0, Math.min(100, cloudCoverPct || 0)) / 100;
  return 1 - 0.65 * cc;
}

function soilingAdjustment(daysSinceRain){
  const d = Math.max(0, Math.min(90, daysSinceRain || 0));
  return 1 - 0.002 * d;
}

function systemLossFactor(){
  return 0.85;
}

function kwhAnnual(effSunHoursPerDay, panelWatts, panelCount, tempFactor, cloudFactor, soilingFactor, sysLoss){
  const dailyWh = effSunHoursPerDay * panelWatts * panelCount * tempFactor * cloudFactor * soilingFactor * sysLoss;
  return dailyWh * 365 / 1000;
}

function calculateROI(annualKwh, electricityRate, systemCost){
  const annualSavings = annualKwh * electricityRate;
  const paybackYears = systemCost > 0 ? systemCost / annualSavings : 0;
  return {
    annualSavings,
    paybackMonths: paybackYears * 12,
    twentyFiveYearProduction: annualKwh * 25,
    lifetimeSavings: annualSavings * 25,
    netProfit: annualSavings * 25 - systemCost,
    roiPct: systemCost > 0 ? ((annualSavings * 25 - systemCost) / systemCost) * 100 : 0
  };
}

function effectiveIrradiance(altitude, tilt, az, lat, dec, H, clearnessIndex){
  const ci = cosIncidence(lat, dec, H, tilt, az);
  if(ci <= 0) return 0;
  const am = relativeAirMass(altitude);
  const tb = 0.7 * Math.pow(0.91, am);
  const direct = 1000 * tb * (clearnessIndex || 0.5) * ci;
  const diff = 1000 * (0.2 + 0.4 * (clearnessIndex || 0.5)) * (1 + Math.cos(d2r(tilt))) / 2;
  return direct + diff;
}

const CITIES = [
  ["New York, USA",40.7128,-74.0060,-5],["Los Angeles, USA",34.0522,-118.2437,-8],
  ["Chicago, USA",41.8781,-87.6298,-6],["Houston, USA",29.7604,-95.3698,-6],
  ["Miami, USA",25.7617,-80.1918,-5],["Denver, USA",39.7392,-104.9903,-7],
  ["Seattle, USA",47.6062,-122.3321,-8],["Toronto, Canada",43.6532,-79.3832,-5],
  ["Vancouver, Canada",49.2827,-123.1207,-8],["Mexico City, Mexico",19.4326,-99.1332,-6],
  ["London, UK",51.5074,-0.1278,0],["Paris, France",48.8566,2.3522,1],
  ["Berlin, Germany",52.5200,13.4050,1],["Madrid, Spain",40.4168,-3.7038,1],
  ["Rome, Italy",41.9028,12.4964,1],["Moscow, Russia",55.7558,37.6173,3],
  ["Istanbul, Turkey",41.0082,28.9784,3],["Cairo, Egypt",30.0444,31.2357,2],
  ["Lagos, Nigeria",6.5244,3.3792,1],["Nairobi, Kenya",-1.2921,36.8219,3],
  ["Johannesburg, South Africa",-26.2041,28.0473,2],["Cape Town, South Africa",-33.9249,18.4241,2],
  ["Dubai, UAE",25.2048,55.2708,4],["Riyadh, Saudi Arabia",24.7136,46.6753,3],
  ["Tehran, Iran",35.6892,51.3890,3.5],["Karachi, Pakistan",24.8607,67.0011,5],
  ["Lahore, Pakistan",31.5497,74.3436,5],["Islamabad, Pakistan",33.6844,73.0479,5],
  ["Delhi, India",28.7041,77.1025,5.5],["Mumbai, India",19.0760,72.8777,5.5],
  ["Dhaka, Bangladesh",23.8103,90.4125,6],["Kathmandu, Nepal",27.7172,85.3240,5.75],
  ["Beijing, China",39.9042,116.4074,8],["Shanghai, China",31.2304,121.4737,8],
  ["Tokyo, Japan",35.6762,139.6503,9],["Seoul, South Korea",37.5665,126.9780,9],
  ["Singapore",1.3521,103.8198,8],["Kuala Lumpur, Malaysia",3.1390,101.6869,8],
  ["Bangkok, Thailand",13.7563,100.5018,7],["Jakarta, Indonesia",-6.2088,106.8456,7],
  ["Manila, Philippines",14.5995,120.9842,8],["Hanoi, Vietnam",21.0278,105.8342,7],
  ["Sydney, Australia",-33.8688,151.2093,10],["Melbourne, Australia",-37.8136,144.9631,10],
  ["Auckland, New Zealand",-36.8485,174.7633,12],["São Paulo, Brazil",-23.5505,-46.6333,-3],
  ["Rio de Janeiro, Brazil",-22.9068,-43.1729,-3],["Buenos Aires, Argentina",-34.6037,-58.3816,-3],
  ["Jerusalem, Israel",31.7683,35.2137,2]
];

// Expose to browser global scope (no bundler/module system — plain <script> include)
if(typeof window !== 'undefined'){
  window.SolarEngine = {
    REP_DAY, MONTH_NAMES, DIM, COMPASS16, CITIES,
    declination, eotMinutes, hourAngleSunset, solarAltitude, solarAzimuth, cosIncidence,
    clockTimeFromSolarHour, fmtClock, metric, monthsForPriority,
    optimizeTilt, optimizeTiltAndAzimuth, compassLabel, rowSpacing, dayProfile,
    relativeAirMass, diffuseFraction, panelTemperature, tempDeratingFactor,
    cloudAdjustment, soilingAdjustment, systemLossFactor,
    kwhAnnual, calculateROI, effectiveIrradiance
  };
}
// Expose to node for standalone testing
if(typeof module !== 'undefined' && module.exports){
  module.exports = {
    REP_DAY, MONTH_NAMES, DIM, COMPASS16, CITIES,
    declination, eotMinutes, hourAngleSunset, solarAltitude, solarAzimuth, cosIncidence,
    clockTimeFromSolarHour, fmtClock, metric, monthsForPriority,
    optimizeTilt, optimizeTiltAndAzimuth, compassLabel, rowSpacing, dayProfile,
    relativeAirMass, diffuseFraction, panelTemperature, tempDeratingFactor,
    cloudAdjustment, soilingAdjustment, systemLossFactor,
    kwhAnnual, calculateROI, effectiveIrradiance
  };
}
