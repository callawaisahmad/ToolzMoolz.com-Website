/* Minimal shared runtime for the policy pages (privacy, terms, cookie, about,
   contact) so the header toggle, tip modal and toast behave like they do on the
   tool pages, which ship their own inline copy of this code. */
(function () {
  'use strict';
  var CHANNELS = { kofi: 'https://ko-fi.com/toolzmoolz' };
  var amount = 1;

  function ensureMarkup() {
    if (!document.getElementById('tipModal')) {
      var wrap = document.createElement('div');
      wrap.innerHTML =
        '<div class="modal-overlay" id="tipModal">' +
        '<div class="modal">' +
        '<button class="modal-close" type="button" aria-label="Close">&#10005;</button>' +
        '<div class="modal-emoji">&#10084;&#65039;</div>' +
        '<h3>Support ToolzMoolz</h3>' +
        '<p class="modal-sub">Every tool is 100% free. A small tip helps keep the lights on!</p>' +
        '<div class="tip-amounts" id="tipAmounts">' +
        '<button class="tip-amount active" data-amount="1" type="button"><span class="tip-price">&pound;1</span><span class="tip-label">A sip &#9749;</span></button>' +
        '<button class="tip-amount" data-amount="3" type="button"><span class="tip-price">&pound;3</span><span class="tip-label">A coffee</span></button>' +
        '<button class="tip-amount" data-amount="5" type="button"><span class="tip-price">&pound;5</span><span class="tip-label">A treat &#127856;</span></button>' +
        '<button class="tip-amount" data-amount="10" type="button"><span class="tip-price">&pound;10</span><span class="tip-label">Legend &#129336;</span></button>' +
        '</div>' +
        '<input type="number" class="custom-amount" id="customAmount" placeholder="Custom amount (&pound;)" min="1"/>' +
        '<div class="pay-channels">' +
        '<button class="pay-channel" type="button" data-pay="kofi"><span class="ch-icon">&#9749;</span><div><span class="ch-name">Ko-fi</span><span class="ch-desc">Cards &middot; PayPal &middot; Apple Pay &middot; Google Pay</span></div><span class="ch-arrow">&rarr;</span></button>' +
        '</div>' +
        '<p class="tip-note">Opens Ko-fi in a popup &mdash; you stay right here. Thank you! &#10084;&#65039;</p>' +
        '</div></div>';
      while (wrap.firstChild) document.body.appendChild(wrap.firstChild);
    }
    if (!document.getElementById('toast')) {
      var t = document.createElement('div');
      t.className = 'toast';
      t.id = 'toast';
      document.body.appendChild(t);
    }
  }

  function showToast(msg) {
    var t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(function () { t.classList.remove('show'); }, 3000);
  }

  function openTip() {
    var m = document.getElementById('tipModal');
    if (!m) return;
    m.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeTip() {
    var m = document.getElementById('tipModal');
    if (m) m.classList.remove('open');
    document.body.style.overflow = '';
  }

  function syncCustom(el) {
    amount = parseFloat(el.value) || 0;
    var btns = document.querySelectorAll('.tip-amount');
    for (var i = 0; i < btns.length; i++) btns[i].classList.remove('active');
  }

  function payWith(ch) {
    var url = CHANNELS[ch];
    if (!url) { showToast('Payment link not set yet.'); return; }
    var popup = window.open(url, 'payment', 'width=520,height=680,top=' + Math.round((screen.height - 680) / 2) + ',left=' + Math.round((screen.width - 520) / 2));
    if (!popup) window.open(url, '_blank');
    closeTip();
    showToast('Opening payment &mdash; thank you! &#10084;&#65039;');
  }

  function wire() {
    ensureMarkup();

    var toggle = document.getElementById('navToggle');
    var nav = document.getElementById('toolNav');
    if (toggle && nav && !toggle.getAttribute('data-tz-wired')) {
      toggle.setAttribute('data-tz-wired', '1');
      toggle.addEventListener('click', function () { nav.classList.toggle('open'); });
    }

    var modal = document.getElementById('tipModal');
    if (modal && !modal.getAttribute('data-tz-wired')) {
      modal.setAttribute('data-tz-wired', '1');
      modal.addEventListener('click', function (e) {
        if (e.target === modal) closeTip();
        var cls = e.target && e.target.className;
        if (typeof cls === 'string' && cls.indexOf('modal-close') >= 0) closeTip();
      });
    }

    var amounts = document.querySelectorAll('.tip-amount');
    for (var i = 0; i < amounts.length; i++) {
      (function (b) {
        if (b.getAttribute('data-tz-wired')) return;
        b.setAttribute('data-tz-wired', '1');
        b.addEventListener('click', function () {
          for (var j = 0; j < amounts.length; j++) amounts[j].classList.remove('active');
          b.classList.add('active');
          amount = parseFloat(b.getAttribute('data-amount')) || amount;
          var c = document.getElementById('customAmount');
          if (c) c.value = '';
        });
      })(amounts[i]);
    }

    var pays = document.querySelectorAll('[data-pay]');
    for (var k = 0; k < pays.length; k++) {
      (function (p) {
        if (p.getAttribute('data-tz-wired')) return;
        p.setAttribute('data-tz-wired', '1');
        p.addEventListener('click', function () { payWith(p.getAttribute('data-pay')); });
      })(pays[k]);
    }

    var custom = document.getElementById('customAmount');
    if (custom && !custom.getAttribute('data-tz-wired')) {
      custom.setAttribute('data-tz-wired', '1');
      custom.addEventListener('input', function () { syncCustom(custom); });
    }
  }

  window.openTip = openTip;
  window.closeTip = closeTip;
  window.payWith = payWith;
  window.showToast = showToast;
  window.syncCustom = syncCustom;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();
})();
