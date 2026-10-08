/* ══════════════════════════════════════════════════════════════
   ReverseJargon — the tech reverse-dictionary (ToolzMoolz feature)
   100% client-side. Bring-Your-Own-Key (Google Gemini), stored only
   in the visitor's browser. Nothing is sent anywhere except Google.

   Used by both the homepage and /reverse-jargon/ via:
     ReverseJargon.mount(document.getElementById('rjRoot'))
   ══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  // ── Config ────────────────────────────────────────────────────
  // To change the AI model later, edit this one line. "gemini-2.5-flash"
  // is a fast, low-cost, generally-available model on Google's free tier.
  var MODEL = 'gemini-2.5-flash';
  var ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/' + MODEL + ':generateContent';
  var KEY_STORE = 'rj_gemini_key';
  var GET_KEY_URL = 'https://aistudio.google.com/app/apikey';

  // ════════════════════════════════════════════════════════════
  //  HOW THE AI IS ACCESSED — three modes, in priority order:
  //
  //  1) PROXY_MODE  (recommended, most secure) — set PROXY_URL to
  //     your server proxy (reverse-jargon/api.php). Your key stays
  //     on the server and is NEVER exposed in the browser. Visitors
  //     need no key of their own. THIS IS ON BY DEFAULT below.
  //
  //  2) OWNER_KEY   — paste a key here to run it for everyone WITHOUT
  //     a proxy. Simple, but the key is visible in this public file
  //     and Gemini keys can't be locked to your domain, so only use
  //     this if you accept that risk. Leave '' to disable.
  //
  //  3) Bring-Your-Own-Key — if neither of the above is set, each
  //     visitor supplies their own free key (stored in their browser).
  // ════════════════════════════════════════════════════════════
  var PROXY_URL  = '/reverse-jargon/api.php';   // '' to turn the proxy off
  var OWNER_KEY  = '';

  var PROXY_MODE = !!(PROXY_URL && PROXY_URL.trim());
  var OWNER_MODE = !PROXY_MODE && !!(OWNER_KEY && OWNER_KEY.trim());
  // True when visitors don't need to supply their own key.
  var MANAGED_MODE = PROXY_MODE || OWNER_MODE;

  // ── Key helpers ───────────────────────────────────────────────
  function getKey() {
    try { return localStorage.getItem(KEY_STORE) || ''; } catch (e) { return ''; }
  }
  function setKey(v) {
    try { v ? localStorage.setItem(KEY_STORE, v) : localStorage.removeItem(KEY_STORE); } catch (e) {}
  }
  // The key used for a DIRECT browser call (BYOK / owner). Not used in proxy mode.
  function activeKey() { return OWNER_MODE ? OWNER_KEY.trim() : getKey(); }

  // ── Proxy call (server holds the key) ─────────────────────────
  function callProxy(query) {
    return fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query })
    }).then(function (res) {
      return res.json().then(function (data) {
        if (!res.ok) { throw new Error((data && data.error) || ('Request failed (' + res.status + ')')); }
        return data;
      }).catch(function (e) {
        if (e instanceof SyntaxError) throw new Error('Unexpected response from the server. Please try again.');
        throw e;
      });
    });
  }

  // ── Prompt ────────────────────────────────────────────────────
  function buildPrompt(query) {
    return [
      'You are a "reverse dictionary" for tech, software, AI and general knowledge.',
      'The user describes a concept but does not know the exact term/jargon for it.',
      'Figure out the single best-matching term and explain it clearly. Be direct, no fluff.',
      '',
      'User description: "' + query + '"',
      '',
      'Respond with ONLY a JSON object of this exact shape:',
      '{',
      '  "term": "The exact term / jargon (short)",',
      '  "explanation": "A concise, plain-English, no-nonsense explanation (2-4 sentences).",',
      '  "examples": [',
      '    { "title": "Example name", "desc": "One-line description" },',
      '    { "title": "Example name", "desc": "One-line description" }',
      '  ],',
      '  "useCases": ["Use case 1", "Use case 2", "Use case 3"]',
      '}',
      'If the description is too vague, pick the most likely term and say so briefly in the explanation.'
    ].join('\n');
  }

  // ── Gemini call ───────────────────────────────────────────────
  function callGemini(query, key) {
    var body = {
      contents: [{ parts: [{ text: buildPrompt(query) }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.4 }
    };
    return fetch(ENDPOINT + '?key=' + encodeURIComponent(key), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function (res) {
      return res.json().then(function (data) {
        if (!res.ok) {
          var msg = (data && data.error && data.error.message) || ('Request failed (' + res.status + ')');
          if (res.status === 400 || res.status === 403) {
            throw new Error('Your API key was rejected. Double-check it, or generate a new free key.');
          }
          if (res.status === 429) {
            throw new Error('Rate limit reached on your key. Wait a moment and try again.');
          }
          throw new Error(msg);
        }
        var text = data && data.candidates && data.candidates[0] &&
                   data.candidates[0].content && data.candidates[0].content.parts &&
                   data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text;
        if (!text) throw new Error('The AI returned an empty response. Try rephrasing.');
        var clean = String(text).replace(/```json/gi, '').replace(/```/g, '').trim();
        try { return JSON.parse(clean); }
        catch (e) { throw new Error('Could not read the AI response. Try again.'); }
      });
    });
  }

  // ── Demo data (works with no key, so visitors see the format) ──
  var DEMO = {
    term: 'Vibe Coding',
    explanation: 'Building software by describing what you want in plain English and letting an AI generate the code, rather than writing every line yourself. You steer with intent and prompts; the model handles the syntax.',
    examples: [
      { title: 'Prompt-to-app', desc: '"Make a to-do app with dark mode" → the AI scaffolds it.' },
      { title: 'Iterative refining', desc: 'You review the output and ask for tweaks in natural language.' }
    ],
    useCases: ['Rapid prototyping without deep syntax knowledge', 'Learning a new framework by example', 'Turning ideas into working demos fast']
  };

  // ── Rendering ─────────────────────────────────────────────────
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderResult(el, r) {
    if (!r || !r.term) { el.innerHTML = ''; return; }
    var ex = (r.examples || []).map(function (e) {
      return '<div class="rj-ex"><h5>' + esc(e.title) + '</h5><p>' + esc(e.desc) + '</p></div>';
    }).join('');
    var uses = (r.useCases || []).map(function (u) {
      return '<li>' + esc(u) + '</li>';
    }).join('');
    var exSec  = ex   ? '<div class="rj-sec"><p class="rj-sec-t">✦ Examples in action</p><div class="rj-ex-grid">' + ex + '</div></div>' : '';
    var useSec = uses ? '<div class="rj-sec"><p class="rj-sec-t">Common use cases</p><ul class="rj-uses">' + uses + '</ul></div>' : '';
    var lower  = (exSec || useSec) ? '<div class="rj-lower">' + exSec + useSec + '</div>' : '';
    el.innerHTML =
      '<div class="rj-card">' +
        '<div class="rj-top">' +
          '<h2 class="rj-term">' + esc(r.term) + '</h2>' +
          '<div class="rj-sec rj-explain-sec"><p class="rj-sec-t">The no-BS explanation</p>' +
            '<p class="rj-explain">' + esc(r.explanation) + '</p></div>' +
        '</div>' +
        lower +
      '</div>';
  }

  // ── Mount the whole feature into a root element ───────────────
  function mount(root, opts) {
    if (!root) return;
    opts = opts || {};

    root.innerHTML =
      '<div class="rj-panel">' +
        '<div class="rj-head">' +
          '<span class="rj-badge">' + (MANAGED_MODE
            ? '✦ AI Reverse Dictionary · Free · No sign-up'
            : '✦ AI Reverse Dictionary · Bring your own free key') + '</span>' +
          '<h2 class="rj-title">Reverse<span>Jargon</span></h2>' +
          '<p class="rj-sub">Describe the concept — get the exact term, a no-BS explanation, examples and use cases, all on one screen. Built for developers, vibe coders, and anyone talking to AI.</p>' +
        '</div>' +
        '<form class="rj-search" autocomplete="off">' +
          '<span class="rj-search-ic">⌕</span>' +
          '<input class="rj-input" type="text" placeholder="e.g. what’s it called when AI writes code from a plain-English description?" aria-label="Describe the concept" />' +
          '<button class="rj-btn" type="submit">Find Term</button>' +
        '</form>' +
        '<div class="rj-keyrow"></div>' +
        '<div class="rj-keypanel" hidden></div>' +
        '<div class="rj-status" aria-live="polite"></div>' +
        '<div class="rj-result"></div>' +
      '</div>';

    var input    = root.querySelector('.rj-input');
    var form     = root.querySelector('.rj-search');
    var keyrow   = root.querySelector('.rj-keyrow');
    var keypanel = root.querySelector('.rj-keypanel');
    var status   = root.querySelector('.rj-status');
    var result   = root.querySelector('.rj-result');

    function renderKeyRow() {
      if (MANAGED_MODE) {
        // Server proxy or owner key — visitors don't need one.
        keyrow.innerHTML = '⚡ <b>Powered by Google Gemini</b> · free to use, no sign-up';
      } else if (getKey()) {
        keyrow.innerHTML = '🔑 <b>Your Gemini key is saved</b> in this browser · ' +
          '<span class="rj-link" data-act="edit">change or remove</span>';
      } else {
        keyrow.innerHTML = 'Runs on your own <b>free</b> Google Gemini key · ' +
          '<span class="rj-link" data-act="edit">add key</span> · ' +
          '<span class="rj-link" data-act="demo">see a demo</span>';
      }
    }

    function renderKeyPanel() {
      var has = !!getKey();
      keypanel.innerHTML =
        '<h4>' + (has ? 'Update your Gemini API key' : 'Add your free Gemini API key to start') + '</h4>' +
        '<p>ReverseJargon uses Google’s Gemini AI. Your key is stored <b>only in this browser</b> and is sent straight to Google — never to us, and never to any other server.</p>' +
        '<div class="rj-keyform">' +
          '<input class="rj-keyinput" type="password" placeholder="Paste your Gemini API key" value="' + esc(getKey()) + '" />' +
          '<button class="rj-keysave" type="button">Save key</button>' +
        '</div>' +
        '<p class="rj-keyhint">Don’t have one? <a href="' + GET_KEY_URL + '" target="_blank" rel="noopener">Get a free key →</a> ' +
          '(takes ~20 seconds, no credit card). ' +
          (has ? '<span class="rj-link" data-act="remove">Remove saved key</span> · ' : '') +
          '<span class="rj-link" data-act="demo">See a demo instead</span></p>';
    }

    function openPanel()  { renderKeyPanel(); keypanel.hidden = false; var k = keypanel.querySelector('.rj-keyinput'); if (k) k.focus(); }
    function closePanel() { keypanel.hidden = true; }

    function showLoading() {
      result.innerHTML = '';
      status.innerHTML = '<div class="rj-loading"><div class="rj-spinner"></div><p>Analyzing your description…</p></div>';
    }
    function showError(msg) {
      status.innerHTML = '<div class="rj-error">' + esc(msg) + '</div>';
    }
    function clearStatus() { status.innerHTML = ''; }

    function runSearch(q) {
      q = (q || '').trim();
      if (!q) return;

      var request;
      if (PROXY_MODE) {
        request = callProxy(q);              // server holds the key
      } else {
        var key = activeKey();               // owner key or visitor's own key
        if (!key) {
          openPanel();
          showError('Add your free Gemini key above to search — or click “see a demo” for a sample answer.');
          return;
        }
        request = callGemini(q, key);
      }

      showLoading();
      request.then(function (data) {
        clearStatus();
        renderResult(result, data);
        if (result.firstChild && result.scrollIntoView) {
          try { result.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (e) {}
        }
      }).catch(function (err) {
        result.innerHTML = '';
        showError(err && err.message ? err.message : 'Something went wrong. Try again.');
      });
    }

    function runDemo() {
      closePanel();
      clearStatus();
      if (!input.value) input.value = 'when you build an app by describing it to AI in plain English';
      renderResult(result, DEMO);
    }

    // Events
    form.addEventListener('submit', function (e) { e.preventDefault(); runSearch(input.value); });

    keyrow.addEventListener('click', function (e) {
      var act = e.target.getAttribute('data-act');
      if (act === 'edit') { keypanel.hidden ? openPanel() : closePanel(); }
      else if (act === 'demo') { runDemo(); }
    });

    keypanel.addEventListener('click', function (e) {
      var act = e.target.getAttribute('data-act');
      if (e.target.classList.contains('rj-keysave')) {
        var val = keypanel.querySelector('.rj-keyinput').value.trim();
        if (!val) { return; }
        setKey(val); renderKeyRow(); closePanel(); clearStatus();
        if (input.value.trim()) runSearch(input.value);
      } else if (act === 'remove') {
        setKey(''); renderKeyRow(); openPanel(); clearStatus();
      } else if (act === 'demo') {
        runDemo();
      }
    });

    // Init
    renderKeyRow();
    if (!getKey()) { /* keep panel collapsed until user asks — keyrow guides them */ }

    // Deep-link support: ?q=... auto-runs (from the homepage search box)
    var params = new URLSearchParams(window.location.search);
    var q = params.get('q');
    if (q) { input.value = q; if (MANAGED_MODE || activeKey()) runSearch(q); else { openPanel(); } }

    if (opts.focus && input.focus) { try { input.focus(); } catch (e) {} }
  }

  window.ReverseJargon = { mount: mount, getKey: getKey, setKey: setKey, MODEL: MODEL };
})();
