/* ToolzMoolz consent manager (first-party CMP).
   Sets Google Consent Mode v2 signals, stores the visitor choice, renders the
   banner + preferences panel, and exposes revoke. If Google Funding Choices is
   later loaded on the page, this banner defers to it and hides itself. */
(function () {
  'use strict';
  var KEY = 'tz_consent_v1';
  var EXPIRY = 397 * 864e5;           /* 13 months */
  var state = null;
  var banner = null, panel = null;

  function dataLayerPush() {
    if (typeof window.tzg === 'function') { window.tzg.apply(null, arguments); return; }
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(arguments);
  }

  function readStore() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return null;
      var v = JSON.parse(raw);
      if (!v || v.v !== 1 || !v.ts || Date.now() - v.ts > EXPIRY) return null;
      return v;
    } catch (e) { return null; }
  }

  function writeStore(v) {
    try { localStorage.setItem(KEY, JSON.stringify(v)); return true; }
    catch (e) { return false; }
  }

  function applyConsent(c, persist) {
    dataLayerPush('consent', 'update', {
      ad_storage: c.ads ? 'granted' : 'denied',
      ad_user_data: c.ads ? 'granted' : 'denied',
      ad_personalization: c.personalization ? 'granted' : 'denied',
      analytics_storage: c.analytics ? 'granted' : 'denied'
    });
    state = { v: 1, ts: Date.now(), analytics: !!c.analytics, ads: !!c.ads, personalization: !!c.personalization, sources: c.sources || ['site'] };
    if (persist) writeStore(state);
    try { window.dispatchEvent(new CustomEvent('tz:consent', { detail: state })); } catch (e) { }
    var rev = document.querySelectorAll('[data-tz-revoke]');
    for (var i = 0; i < rev.length; i++) rev[i].disabled = false;
    if (typeof window.tzAdsOnConsent === 'function') { try { window.tzAdsOnConsent(state); } catch (e2) { } }
  }

  function googleCmpPresent() {
    return !!(window.googlefc && (window.googlefc.api || window.googlefc.showRevocationMessage) ||
      document.querySelector('iframe[name="googlefc"], iframe[src*="fundingchoicesmessages"]'));
  }

  var css = [
    '.tz-cm-banner{position:fixed;left:0;right:0;bottom:0;z-index:99998;background:#0b1220;color:#e8eefc;border-top:1px solid #2563eb;padding:16px 18px;font-family:Inter,system-ui,sans-serif;box-shadow:0 -8px 30px rgba(0,0,0,.35)}',
    '.tz-cm-banner .tz-cm-inner{max-width:1080px;margin:0 auto;display:flex;gap:16px;align-items:center;flex-wrap:wrap}',
    '.tz-cm-banner p{margin:0;flex:1 1 340px;font-size:13.5px;line-height:1.6;color:#c7d4ee}',
    '.tz-cm-banner a{color:#7fb0ff}',
    '.tz-cm-btn{border:0;border-radius:9px;padding:10px 16px;font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap}',
    '.tz-cm-accept{background:#2563eb;color:#fff}',
    '.tz-cm-reject{background:transparent;color:#c7d4ee;border:1px solid #34436a}',
    '.tz-cm-manage{background:transparent;color:#7fb0ff;border:1px solid #2563eb}',
    '.tz-cm-overlay{position:fixed;inset:0;background:rgba(4,8,18,.72);z-index:99999;display:none}',
    '.tz-cm-overlay.open{display:block}',
    '.tz-cm-panel{position:fixed;z-index:100000;left:50%;top:50%;transform:translate(-50%,-50%);width:min(560px,92vw);background:#fff;color:#141a26;border-radius:16px;padding:24px;font-family:Inter,system-ui,sans-serif;box-shadow:0 24px 70px rgba(0,0,0,.35);display:none;max-height:86vh;overflow:auto}',
    '.tz-cm-panel.open{display:block}',
    '.tz-cm-panel h3{margin:0 0 6px;font-size:19px;font-weight:800;color:#000}',
    '.tz-cm-panel p{margin:0 0 16px;font-size:13.5px;line-height:1.65;color:#3a4354}',
    '.tz-cm-row{display:flex;gap:12px;align-items:flex-start;padding:13px 0;border-top:1px solid #e3e9f2}',
    '.tz-cm-row label{font-size:14px;font-weight:700;color:#000}',
    '.tz-cm-row small{display:block;font-weight:400;color:#54607a;font-size:12.5px;margin-top:3px;line-height:1.5}',
    '.tz-cm-row input{margin-top:3px;width:18px;height:18px;accent-color:#2563eb}',
    '.tz-cm-actions{display:flex;gap:10px;margin-top:18px;flex-wrap:wrap}',
    '.tz-cm-save{background:#2563eb}',
    '.tz-cm-min{background:#eef2f9;color:#1a1d24}',
    '.tz-cm-links{margin-top:14px;font-size:12.5px}',
    '.tz-cm-links a{color:#2563eb}',
    'ul.footer-legal{flex-wrap:wrap;gap:8px 16px}',
    'ul.footer-legal li button[data-tz-revoke]{background:none;border:0;padding:0;margin:0;color:rgba(255,255,255,0.6);font-family:inherit;font-size:12px;font-weight:500;cursor:pointer}',
    'ul.footer-legal li button[data-tz-revoke]:hover{color:#fff;text-decoration:underline}',
    'div.footer-links button[data-tz-revoke]{background:none;border:0;padding:0;color:rgba(255,255,255,0.8);font-family:inherit;font-size:13px;cursor:pointer}',
    '@media (max-width:560px){.tz-cm-banner{padding:14px}.tz-cm-banner .tz-cm-inner{gap:10px}.tz-cm-btn{flex:1 1 auto}}'
  ].join('');

  function injectCss() {
    if (document.getElementById('tz-cm-style')) return;
    var s = document.createElement('style');
    s.id = 'tz-cm-style';
    s.textContent = css;
    document.head.appendChild(s);
  }

  function el(tag, attrs, html) {
    var n = document.createElement(tag);
    for (var k in attrs) if (attrs.hasOwnProperty(k)) n.setAttribute(k, attrs[k]);
    if (html) n.innerHTML = html;
    return n;
  }

  function buildBanner() {
    if (banner) return banner;
    var b = el('div', { class: 'tz-cm-banner', id: 'tzCmBanner', role: 'region', 'aria-label': 'Cookie consent' });
    b.innerHTML =
      '<div class="tz-cm-inner">' +
      '<p>We use cookies and similar technologies for advertising (Google AdSense) and, if enabled, analytics. ' +
      'You can accept, reject non-essential cookies, or choose exactly what to allow. ' +
      'Read our <a href="' + (window.TZ_ROOT || '') + 'cookie-policy.html">Cookie Policy</a> and ' +
      '<a href="' + (window.TZ_ROOT || '') + 'privacy-policy.html">Privacy Policy</a>.</p>' +
      '<button type="button" class="tz-cm-btn tz-cm-reject" id="tzCmReject">Reject all</button>' +
      '<button type="button" class="tz-cm-btn tz-cm-manage" id="tzCmManage">Manage preferences</button>' +
      '<button type="button" class="tz-cm-btn tz-cm-accept" id="tzCmAccept">Accept all</button>' +
      '</div>';
    return b;
  }

  function buildPanel() {
    if (panel) return panel;
    var wrap = el('div', { class: 'tz-cm-overlay', id: 'tzCmOverlay' });
    var p = el('div', { class: 'tz-cm-panel', id: 'tzCmPanel', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Privacy and cookie settings' });
    p.innerHTML =
      '<h3>Privacy &amp; cookie settings</h3>' +
      '<p>Choose which cookies ToolzMoolz may use. Strictly necessary storage is always on because it saves your choice. ' +
      'Everything on this site works whether you allow the rest or not.</p>' +
      '<div class="tz-cm-row"><input type="checkbox" checked disabled id="tzCmEssential">' +
      '<label for="tzCmEssential">Strictly necessary<small>Saves your consent choice on this device (localStorage). No third parties.</small></label></div>' +
      '<div class="tz-cm-row"><input type="checkbox" id="tzCmPersonalization">' +
      '<label for="tzCmPersonalization">Personalized advertising<small>Google AdSense may use your visit to show more relevant ads, including across other sites.</small></label></div>' +
      '<div class="tz-cm-row"><input type="checkbox" id="tzCmAds">' +
      '<label for="tzCmAds">Advertising cookies<small>Allows Google advertising cookies (including DART) so ads can be measured and served.</small></label></div>' +
      '<div class="tz-cm-row"><input type="checkbox" id="tzCmAnalyticsBox">' +
      '<label for="tzCmAnalyticsBox">Analytics<small>Reserved for audience measurement. No analytics tool runs on this site today.</small></label></div>' +
      '<div class="tz-cm-actions">' +
      '<button type="button" class="tz-cm-btn tz-cm-save" id="tzCmSave">Save preferences</button>' +
      '<button type="button" class="tz-cm-btn tz-cm-min" id="tzCmClose">Close</button>' +
      '</div>' +
      '<div class="tz-cm-links">More detail in the <a href="' + (window.TZ_ROOT || '') + 'cookie-policy.html">Cookie Policy</a>. ' +
      'You can change this at any time with “Cookie settings” in the footer.</div>';
    wrap.appendChild(p);
    return wrap;
  }

  function openPanel() {
    var c = state || { analytics: false, ads: false, personalization: false };
    document.getElementById('tzCmPersonalization').checked = !!c.personalization;
    document.getElementById('tzCmAds').checked = !!c.ads;
    document.getElementById('tzCmAnalyticsBox').checked = !!c.analytics;
    document.getElementById('tzCmOverlay').classList.add('open');
    document.getElementById('tzCmPanel').classList.add('open');
  }

  function closePanel() {
    var o = document.getElementById('tzCmOverlay'), p = document.getElementById('tzCmPanel');
    if (o) o.classList.remove('open');
    if (p) p.classList.remove('open');
  }

  function hideBanner() { if (banner) banner.style.display = 'none'; }

  function showBanner() {
    if (googleCmpPresent()) return;
    injectCss();
    if (!banner.parentNode || !document.body.contains(banner)) document.body.appendChild(banner);
    banner.style.display = '';
  }

  function hideAll() {
    if (banner) banner.style.display = 'none';
    closePanel();
  }

  function mount() {
    injectCss();
    banner = buildBanner();
    panel = buildPanel();
    document.body.appendChild(banner);
    document.body.appendChild(panel);
    document.getElementById('tzCmAccept').addEventListener('click', function () {
      applyConsent({ analytics: true, ads: true, personalization: true }, true); hideAll();
    });
    document.getElementById('tzCmReject').addEventListener('click', function () {
      applyConsent({ analytics: false, ads: false, personalization: false }, true); hideAll();
    });
    document.getElementById('tzCmManage').addEventListener('click', openPanel);
    document.getElementById('tzCmSave').addEventListener('click', function () {
      applyConsent({
        analytics: document.getElementById('tzCmAnalyticsBox').checked,
        ads: document.getElementById('tzCmAds').checked,
        personalization: document.getElementById('tzCmPersonalization').checked
      }, true);
      hideAll();
    });
    document.getElementById('tzCmClose').addEventListener('click', closePanel);
    document.getElementById('tzCmOverlay').addEventListener('click', closePanel);

    var revokes = document.querySelectorAll('[data-tz-revoke]');
    for (var i = 0; i < revokes.length; i++) {
      (function (btn) {
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          if (googleCmpPresent() && window.googlefc && window.googlefc.showRevocationMessage) {
            window.googlefc.showRevocationMessage(); return;
          }
          openPanel();
        });
      })(revokes[i]);
    }

    state = readStore();
    if (state) { applyConsent(state, false); hideBanner(); }
    else {
      applyConsent({ analytics: false, ads: false, personalization: false }, false);
      showBanner();
    }
    setTimeout(function () { if (googleCmpPresent()) hideAll(); }, 2500);
  }

  window.tzConsent = {
    get: function () { return state; },
    has: function () { return !!readStore(); },
    open: function () { showBanner(); openPanel(); },
    reset: function () {
      try { localStorage.removeItem(KEY); } catch (e) { }
      state = null;
      applyConsent({ analytics: false, ads: false, personalization: false }, false);
      showBanner();
    },
    apply: function (c) { applyConsent(c, true); }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
