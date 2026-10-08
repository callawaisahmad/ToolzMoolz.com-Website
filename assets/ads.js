/* ToolzMoolz ad loader.
   Ads are only requested after the visitor granted advertising consent, and only
   when a real publisher id is configured below.

   TODO(adsense): after AdSense approval set
     cfg.client = 'ca-pub-XXXXXXXXXXXXXXXX'
   and map each ad position to its slot number in cfg.slots, e.g.
     cfg.slots = { 0: 1234567890, 1: 2345678901, 2: 3456789012 };
   ads.txt at the site root must carry the same publisher id. */
(function () {
  'use strict';
  var cfg = window.TZ_ADS || {};
  if (!cfg.client) cfg.client = '';
  if (!cfg.max) cfg.max = 3;
  if (!cfg.slots) cfg.slots = {};
  window.TZ_ADS = cfg;

  var css = [
    '.tz-ad{margin:18px auto;min-height:110px;display:flex;align-items:center;justify-content:center;width:100%}',
    '.tz-ad[data-tz-ad-state="empty"]{min-height:0;margin:0}',
    '@media (max-width:640px){.tz-ad{min-height:100px;margin:14px auto}}'
  ].join('');

  function injectCss() {
    if (document.getElementById('tz-ad-style')) return;
    var s = document.createElement('style');
    s.id = 'tz-ad-style';
    s.textContent = css;
    document.head.appendChild(s);
  }

  function configured() { return typeof cfg.client === 'string' && /^ca-pub-\d{6,}$/.test(cfg.client); }

  function adsAllowed() {
    try {
      var raw = localStorage.getItem('tz_consent_v1');
      if (!raw) return false;
      var v = JSON.parse(raw);
      return !!(v && v.v === 1 && v.ads && Date.now() - v.ts < 397 * 864e5);
    } catch (e) { return false; }
  }

  function candidateAnchors() {
    var out = [];
    var tool = document.querySelector('.tool-page') || document.querySelector('.tool-topbar');
    var seo = document.querySelector('.seo-tool-section');
    var ft = document.querySelector('footer.site-footer');
    // Tool pages: never between the toolbar chips and the tool itself — sit
    // above the whole tool card instead, then before SEO copy, then above footer.
    if (tool) out.push([tool, 'before']);
    if (seo && seo !== tool) out.push([seo, 'before']);
    if (!tool) {
      var h1 = document.querySelector('main h1');
      if (h1) out.push([h1, 'after']);
    }
    if (ft && ft !== tool && ft !== seo) out.push([ft, 'before']);
    return out;
  }

  function placeSlots() {
    injectCss();
    var anchors = candidateAnchors(), made = 0;
    for (var i = 0; i < anchors.length && made < cfg.max; i++) {
      var node = anchors[i][0], pos = anchors[i][1];
      if (node.getAttribute('data-tz-ad-host') === '1') continue;
      node.setAttribute('data-tz-ad-host', '1');
      var box = document.createElement('div');
      box.className = 'tz-ad';
      box.setAttribute('role', 'complementary');
      box.setAttribute('aria-label', 'Advertisement');
      var ins = document.createElement('ins');
      ins.className = 'adsbygoogle';
      box.appendChild(ins);
      if (pos === 'after' && node.parentNode) node.parentNode.insertBefore(box, node.nextSibling);
      else if (node.parentNode) node.parentNode.insertBefore(box, node);
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({
          adClient: cfg.client,
          adSlot: cfg.slots[made] || '',
          adFormat: 'auto',
          adLayout: '',
          enablePageLevelAds: false
        });
      } catch (e) { }
      made++;
    }
    return made;
  }

  function loadScript() {
    if (document.querySelector('script[src*="adsbygoogle.js"]')) return;
    var s = document.createElement('script');
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + cfg.client;
    document.head.appendChild(s);
  }

  var started = false;
  function start(reason) {
    if (started) return;
    if (!configured()) return;
    if (!adsAllowed()) return;
    started = true;
    injectCss();
    loadScript();
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', placeSlots);
    else placeSlots();
  }

  window.tzAdsOnConsent = function () { start('consent'); };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { start('dom'); });
  else start('dom');
})();
