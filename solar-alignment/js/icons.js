/* ================================================================
   HELIOTROPE — ICON REGISTRY
   Hand-built inline SVG icons. No external icon font/library —
   keeps the whole site working with zero network dependency.
   ================================================================ */

const ICON_PATHS = {
  pin: `<path d="M12 21s-6.5-6.2-6.5-11A6.5 6.5 0 0 1 18.5 10c0 4.8-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.2"/>`,
  target: `<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="0.9" fill="currentColor" stroke="none"/>`,
  roof: `<path d="M3 12 12 4l9 8"/><path d="M5.5 10.5V20h13v-9.5"/>`,
  roofFlat: `<path d="M4 20V10h16v10"/><line x1="4" y1="10" x2="20" y2="10"/><line x1="7.5" y1="10" x2="7.5" y2="7"/><line x1="16.5" y1="10" x2="16.5" y2="7"/>`,
  ground: `<path d="M4 11.5 17 7l2 6-13 4.5z"/><line x1="10.5" y1="13" x2="10.5" y2="21"/><line x1="6.5" y1="21" x2="14.5" y2="21"/>`,
  unlock: `<rect x="5" y="11" width="14" height="9" rx="1.8"/><path d="M8 11V7.5A4 4 0 0 1 15.5 5.3"/><circle cx="12" cy="15.2" r="1.3" fill="currentColor" stroke="none"/>`,
  sliders: `<line x1="4" y1="8" x2="20" y2="8"/><circle cx="9" cy="8" r="2.1" fill="currentColor" stroke="none"/><line x1="4" y1="16" x2="20" y2="16"/><circle cx="15.5" cy="16" r="2.1" fill="currentColor" stroke="none"/>`,
  angle: `<path d="M4 19h16"/><path d="M4 19 15.5 6"/><path d="M7.5 19a5.8 5.8 0 0 1 2-4.4"/>`,
  compass: `<circle cx="12" cy="12" r="9"/><path d="M15.3 8.7 12.8 13l-4.6 2.3 2.5-4.3z" fill="currentColor" stroke="none"/>`,
  grid: `<rect x="4" y="4" width="7" height="7" rx="1.2"/><rect x="13" y="4" width="7" height="7" rx="1.2"/><rect x="4" y="13" width="7" height="7" rx="1.2"/><rect x="13" y="13" width="7" height="7" rx="1.2"/>`,
  ruler: `<rect x="7.5" y="3" width="9" height="18" rx="1.5"/><line x1="7.5" y1="7.5" x2="10.5" y2="7.5"/><line x1="7.5" y1="12" x2="12.5" y2="12"/><line x1="7.5" y1="16.5" x2="10.5" y2="16.5"/>`,
  stack: `<rect x="4" y="4.5" width="16" height="4" rx="1"/><rect x="4" y="10" width="16" height="4" rx="1"/><rect x="4" y="15.5" width="16" height="4" rx="1"/>`,
  cycle: `<path d="M4.5 12a7.5 7.5 0 0 1 12.8-5.3L19.5 8.7"/><path d="M19.5 4.5v4.2h-4.2"/><path d="M19.5 12a7.5 7.5 0 0 1-12.8 5.3L4.5 15.3"/><path d="M4.5 19.5v-4.2h4.2"/>`,
  snow: `<line x1="12" y1="2.5" x2="12" y2="21.5"/><line x1="4.5" y1="7.2" x2="19.5" y2="16.8"/><line x1="4.5" y1="16.8" x2="19.5" y2="7.2"/>`,
  sun: `<circle cx="12" cy="12" r="4.3"/><line x1="12" y1="1.8" x2="12" y2="4.3"/><line x1="12" y1="19.7" x2="12" y2="22.2"/><line x1="1.8" y1="12" x2="4.3" y2="12"/><line x1="19.7" y1="12" x2="22.2" y2="12"/><line x1="4.6" y1="4.6" x2="6.4" y2="6.4"/><line x1="17.6" y1="17.6" x2="19.4" y2="19.4"/><line x1="4.6" y1="19.4" x2="6.4" y2="17.6"/><line x1="17.6" y1="6.4" x2="19.4" y2="4.6"/>`,
  spacing: `<line x1="6.5" y1="3" x2="6.5" y2="21"/><line x1="17.5" y1="3" x2="17.5" y2="21"/><path d="M6.5 12h11"/><path d="M9.5 9l-3 3 3 3"/><path d="M14.5 9l3 3-3 3"/>`,
  clock: `<circle cx="12" cy="12" r="9"/><path d="M12 7.2v5l3.6 2"/>`,
  camera: `<path d="M4 8h3.2l1.5-2h6.6L16.8 8H20a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.2" r="3.4"/>`,
  sparkle: `<path d="M12 2.5l1.7 5.8L19.5 10l-5.8 1.7L12 17.5l-1.7-5.8L4.5 10l5.8-1.7z" fill="currentColor" stroke="none"/>`,
  barchart: `<line x1="4" y1="21" x2="20" y2="21"/><rect x="6" y="13" width="3" height="8" rx="0.5"/><rect x="11" y="9" width="3" height="12" rx="0.5"/><rect x="16" y="5" width="3" height="16" rx="0.5"/>`,
  calendar: `<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><line x1="3.5" y1="9.8" x2="20.5" y2="9.8"/><line x1="8" y1="3" x2="8" y2="7"/><line x1="16" y1="3" x2="16" y2="7"/>`,
  bolt: `<path d="M13 2 4.5 14h5.7l-1 8L18 10h-5.7z" fill="currentColor" stroke="none"/>`,
  warning: `<path d="M12 3 2.5 20.5h19L12 3z"/><line x1="12" y1="10" x2="12" y2="14.5"/><circle cx="12" cy="17.3" r="0.7" fill="currentColor" stroke="none"/>`,
  shieldCheck: `<path d="M12 3 5.5 5.8V11c0 5 2.8 7.6 6.5 9 3.7-1.4 6.5-4 6.5-9V5.8L12 3z"/><path d="M9 12.2l2.1 2 4-4.5"/>`,
  info: `<circle cx="12" cy="12" r="9"/><line x1="12" y1="11" x2="12" y2="16.5"/><circle cx="12" cy="7.8" r="1" fill="currentColor" stroke="none"/>`,
  close: `<line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>`,
  check: `<path d="M5 12.5l4.5 4.5L19 7"/>`,
  cloud: `<path d="M6 17a5 5 0 0 1 0-10 6 6 0 0 1 11.5-2A4.5 4.5 0 0 1 18 17z" stroke="currentColor" fill="none"/><circle cx="9" cy="14" r="0.7" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="0.7" fill="currentColor" stroke="none"/><circle cx="15" cy="14" r="0.7" fill="currentColor" stroke="none"/>`,
  dollar: `<line x1="12" y1="2.5" x2="12" y2="21.5"/><path d="M8.5 7.5C8.5 5.5 14 4.5 15 6.5s-6 3.5-6 5.5 6.5 4 6.5 4" fill="none" stroke="currentColor"/>`,
  star: `<polygon points="12 2.5 15.5 9.5 23 10.5 17.5 16 19 23.5 12 19.5 5 23.5 6.5 16 1 10.5 8.5 9.5" fill="none" stroke="currentColor"/>`,
  phoneTilt: `<path d="M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"/><line x1="12" y1="19" x2="12.01" y2="19"/><line x1="7" y1="7" x2="17" y2="7"/><line x1="7" y1="14" x2="17" y2="14"/>`,
  rulerAngle: `<path d="M3 21 21 3"/><line x1="13.5" y1="10.5" x2="17" y2="7"/><line x1="10.5" y1="13.5" x2="14" y2="10"/>`,
  refresh: `<path d="M21 12a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3"/><path d="M3 12a9 9 0 0 0 9 9 9 9 0 0 0 6-2.3"/><path d="M21 3v9h-9"/><path d="M3 21v-9h9"/>`,
  feedback: `<path d="M21 11.5a8.4 8.4 0 0 1-.2 1.8 9 9 0 0 1-8.6 6.7 8.5 8.5 0 0 1-1.8-.2L4 22l2.2-6.2A8.5 8.5 0 0 1 6 12a9 9 0 0 1 9-9 8.8 8.8 0 0 1 6 2.5"/>`,
  savings: `<path d="M4 10v5a8 8 0 0 0 16 0v-5"/><path d="M4 10a4 4 0 0 1 8 0v5"/><path d="M12 10a4 4 0 0 1 8 0v5"/><path d="M12 10V4"/>
<line x1="9" y1="4" x2="15" y2="4"/>`
};

function svgIcon(name, cls){
  const body = ICON_PATHS[name];
  if(!body) return '';
  return `<svg class="icon ${cls||''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
}

function applyStaticIcons(root){
  (root||document).querySelectorAll('[data-icon]').forEach(el=>{
    el.insertAdjacentHTML('afterbegin', svgIcon(el.getAttribute('data-icon')));
  });
}

if(typeof window !== 'undefined'){
  window.Icons = { ICON_PATHS, svgIcon, applyStaticIcons };
}
