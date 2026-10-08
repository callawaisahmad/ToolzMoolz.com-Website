/* ToolzMoolz shared conversion queue
   iLovePDF-style flow: select files -> uploading % -> uploaded -> explicit convert -> finished -> per-file download
   Loaded with <script defer src="../assets/convert-queue.js"></script> */

(function (global) {
    'use strict';

    function fmtSize(n) {
        if (n < 1024) return n + ' B';
        if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
        return (n / 1048576).toFixed(1) + ' MB';
    }

    function el(tag, cls, html) {
        var n = document.createElement(tag);
        if (cls) n.className = cls;
        if (html != null) n.innerHTML = html;
        return n;
    }

    function find(sel, root) {
        if (!sel) return null;
        if (typeof sel !== 'string') return sel;
        return (root || document).querySelector(sel);
    }

    /* global.TZQueue.create({...}) -> controller */
    function create(opts) {
        var o = opts || {};
        var list = find(o.list);
        var input = find(o.input);
        var addBtn = find(o.addBtn);
        var convertBtn = find(o.convertBtn);
        var countEl = find(o.countEl);

        var accept = o.accept || null;              // RegExp on file name
        var acceptLabel = o.acceptLabel || 'file';
        var maxSize = o.maxSize || 0;               // bytes, 0 = unlimited
        var validate = typeof o.validate === 'function' ? o.validate : null;  // (file) => true | errorMessage
        var icon = o.icon || '&#128196;';
        var convertLabel = o.convertLabel || 'Convert';
        var idleLabel = o.idleLabel || ('Select ' + acceptLabel + ' files');
        var convertingLabel = o.convertingLabel || ('Converting ' + acceptLabel + '…');
        var maxFiles = o.maxFiles || 0;             // 0 = unlimited
        var toast = typeof o.toast === 'function' ? o.toast : function (m) { if (global.console) console.info(m); };
        var readMode = o.readMode || 'buffer';      // 'buffer' | 'text' | 'none'
        var uploadHold = o.uploadHold == null ? 620 : o.uploadHold;
        var uploadEase = o.uploadEase == null ? 340 : o.uploadEase;
        var uploadEaseTail = o.uploadEaseTail == null ? 360 : o.uploadEaseTail;
        var convert = o.convert;                    // async (entry) => Blob
        var outName = o.outName || function (e) { return e.name; };
        var beforeAdd = typeof o.beforeAdd === 'function' ? o.beforeAdd : null;
        var onChange = typeof o.onChange === 'function' ? o.onChange : null;
        var allowReconvert = o.allowReconvert !== false;
        var logErrors = o.logErrors !== false;   // pages that surface failures in their own UI can opt out
        var addToast = typeof o.addToast === 'function' ? o.addToast : null;   // (count) => string
        var doneToast = o.doneToast || null;     // string | (okAll, finishedCount) => string
        var failedHint = o.failedHint || 'Some files could not be converted.';
        var emptyHint = o.emptyHint || ('Choose ' + acceptLabel + ' files to convert.');

        var entries = [];
        var busy = false;
        var convertTimer = null;

        /* ---------- rendering ---------- */

        function buildRow(e) {
            var row = el('div', 'tzq-card');
            row.setAttribute('data-tzq-name', e.name);
            var left = el('div', 'tzq-left');
            left.appendChild(el('div', 'tzq-ic', icon));
            var txt = el('div', 'tzq-txt');
            txt.appendChild(el('div', 'tzq-name'));
            var meta = el('div', 'tzq-meta');
            meta.appendChild(el('span', 'tzq-size'));
            meta.appendChild(el('span', 'tzq-sep', '&middot;'));
            meta.appendChild(el('span', 'tzq-status'));
            txt.appendChild(meta);
            txt.appendChild(el('div', 'tzq-bar', '<div class="tzq-fill"></div>'));
            left.appendChild(txt);
            var right = el('div', 'tzq-right');
            var dl = el('a', 'tzq-dl', '&#11015;&#65039; Download');
            dl.href = '#';
            dl.hidden = true;
            var rm = el('button', 'tzq-rm', '&#10005;');
            rm.type = 'button';
            rm.setAttribute('aria-label', 'Remove file');
            right.appendChild(dl);
            right.appendChild(rm);
            row.appendChild(left);
            row.appendChild(right);
            list.appendChild(row);

            e.row = row;
            e.nameEl = row.querySelector('.tzq-name');
            e.sizeEl = row.querySelector('.tzq-size');
            e.statusEl = row.querySelector('.tzq-status');
            e.fillEl = row.querySelector('.tzq-fill');
            e.dlEl = dl;
            e.rmEl = rm;
            dl.addEventListener('click', function (ev) { if (!e.url) ev.preventDefault(); });
            rm.addEventListener('click', function () { remove(e); });
            updateRow(e);
        }

        function updateRow(e) {
            e.nameEl.textContent = e.name;
            e.sizeEl.textContent = fmtSize(e.size);
            var st = e.statusEl;
            e.fillEl.style.width = (e.pct || 0) + '%';
            e.row.classList.toggle('is-converting', e.status === 'converting');
            e.row.classList.toggle('is-error', e.status === 'error');
            if (e.status === 'uploading') {
                st.textContent = 'Uploading… ' + Math.round(e.pct) + '%';
                st.className = 'tzq-status';
            } else if (e.status === 'ready') {
                st.textContent = 'Uploaded ✓';
                st.className = 'tzq-status ok';
                e.fillEl.classList.add('ok');
            } else if (e.status === 'converting') {
                st.textContent = convertingLabel;
                st.className = 'tzq-status';
            } else if (e.status === 'finished') {
                st.textContent = 'Finished ✓';
                st.className = 'tzq-status ok';
                e.dlEl.href = e.url;
                e.dlEl.setAttribute('download', e.outName || outName(e));
                e.dlEl.hidden = false;
            } else {
                st.textContent = o.errorText || 'Conversion failed';
                st.className = 'tzq-status err';
            }
            e.rmEl.hidden = (e.status === 'converting');
        }

        /* ---------- reading (the "upload" phase) ---------- */

        function readFile(e) {
            if (readMode === 'none') {
                e.status = 'ready';
                e.pct = 100;
                updateRow(e);
                updateConvertBtn();
                return;
            }
            var t0 = Date.now();
            var rd = new FileReader();
            var method = readMode === 'text' ? 'readAsText' : 'readAsArrayBuffer';
            rd.onprogress = function (ev) {
                if (e.status !== 'uploading' || !ev.lengthComputable) return;
                e.pct = Math.max(e.pct, Math.round((ev.loaded / ev.total) * 70));
                updateRow(e);
            };
            rd.onload = function () {
                if (e.status !== 'uploading') return;
                var hold = Math.max(0, uploadHold - (Date.now() - t0));
                setTimeout(function () {
                    easeBar(e, 100, uploadEase);
                    setTimeout(function () {
                        if (e.status !== 'uploading') return;
                        e.buf = rd.result;
                        e.status = 'ready';
                        e.pct = 100;
                        updateRow(e);
                        updateConvertBtn();
                    }, uploadEaseTail);
                }, hold);
            };
            rd.onerror = function () {
                if (e.status === 'uploading') {
                    e.status = 'error';
                    e.pct = 0;
                    updateRow(e);
                    updateConvertBtn();
                }
            };
            try {
                rd[method](e.file);
            } catch (err) {
                e.status = 'error';
                updateRow(e);
                updateConvertBtn();
            }
            setTimeout(function () {
                if (e.status === 'uploading') { e.pct = Math.max(e.pct, 10); updateRow(e); }
            }, 120);
        }

        function easeBar(e, to, ms) {
            if (e.status !== 'uploading') return;
            var from = e.pct, t0 = performance.now();
            (function step(now) {
                var k = Math.min(1, (now - t0) / ms);
                e.pct = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3)));
                if (e.status === 'uploading') updateRow(e);
                if (k < 1 && e.status === 'uploading') requestAnimationFrame(step);
            })(t0);
        }

        function startConvertAnim() {
            var step = 0;
            convertTimer = setInterval(function () {
                step = (step + 1) % 5;
                entries.forEach(function (e) {
                    if (e.status === 'converting') {
                        e.pct = Math.min(88, 14 + step * 18);
                        updateRow(e);
                    }
                });
            }, 220);
        }
        function stopConvertAnim() { clearInterval(convertTimer); convertTimer = null; }

        /* ---------- public actions ---------- */

        function addFiles(fileList) {
            var arr = fileList ? Array.prototype.slice.call(fileList) : [];
            var accepted = [];
            for (var i = 0; i < arr.length; i++) {
                var f = arr[i];
                if (validate) {
                    var v = validate(f);
                    if (v !== true) { toast(typeof v === 'string' ? v : 'That file is not supported.'); continue; }
                }
                if (accept && !accept.test(f.name)) { toast('Only ' + acceptLabel + ' files are supported.'); continue; }
                if (maxSize && f.size > maxSize) { toast(f.name + ' is larger than ' + fmtSize(maxSize) + '.'); continue; }
                if (maxFiles && entries.length + accepted.length >= maxFiles) { toast('You can add up to ' + maxFiles + ' files.'); break; }
                var dup = entries.some(function (x) { return x.name === f.name && x.size === f.size; });
                if (dup) continue;
                accepted.push(f);
            }
            if (!accepted.length) return false;
            if (typeof o.warm === 'function') { try { o.warm(); } catch (err) { /* warm is best-effort */ } }
            if (beforeAdd) { try { beforeAdd(accepted); } catch (err) { /* hook is best-effort */ } }
            for (var j = 0; j < accepted.length; j++) {
                var f2 = accepted[j];
                var e = {
                    id: Date.now() + '_' + j, file: f2, name: f2.name, size: f2.size,
                    status: 'uploading', pct: 4, buf: null, url: null, outName: null,
                    row: null, nameEl: null, sizeEl: null, statusEl: null, fillEl: null, dlEl: null, rmEl: null
                };
                entries.push(e);
                buildRow(e);
                readFile(e);
            }
            list.classList.add('visible');
            toast(addToast ? addToast(accepted.length) : (accepted.length === 1 ? 'Uploading your file…' : 'Adding ' + accepted.length + ' files…'));
            updateConvertBtn();
            if (onChange) onChange(entries);
            return true;
        }

        function remove(e) {
            if (e.status === 'converting' || busy) return;
            if (e.url) URL.revokeObjectURL(e.url);
            var i = entries.indexOf(e);
            if (i >= 0) entries.splice(i, 1);
            if (e.row && e.row.parentNode) e.row.parentNode.removeChild(e.row);
            if (!entries.length) list.classList.remove('visible');
            updateConvertBtn();
            if (onChange) onChange(entries);
        }

        function clearAll() {
            if (busy) return;
            entries.slice().forEach(function (e) { remove(e); });
        }

        function updateConvertBtn() {
            if (onChange) onChange(entries);
            if (!convertBtn) return;
            if (busy) return;
            if (!entries.length) {
                convertBtn.disabled = false;
                convertBtn.textContent = idleLabel;
                if (countEl) countEl.textContent = '';
                return;
            }
            var ready = entries.some(function (e) { return e.status === 'ready' || e.status === 'error'; });
            convertBtn.disabled = !ready;
            convertBtn.textContent = ready ? convertLabel : 'Uploading files…';
            if (countEl) countEl.textContent = entries.length + ' file' + (entries.length > 1 ? 's' : '') + ' selected';
        }

        function convertAll() {
            if (busy || typeof convert !== 'function') return Promise.resolve();
            var todo = entries.filter(function (e) {
                return e.status === 'ready' || (e.status === 'error' && allowReconvert);
            });
            if (!todo.length) {
                if (!entries.length) { if (input) input.click(); toast(emptyHint); }
                else toast('Wait for your files to finish uploading.');
                return Promise.resolve();
            }
            busy = true;
            if (convertBtn) { convertBtn.disabled = true; convertBtn.textContent = 'Converting…'; }
            var okAll = true;
            var finishedCount = 0;
            var ready = (typeof o.warm === 'function') ? Promise.resolve(o.warm()) : Promise.resolve();
            return ready.then(function () {
                startConvertAnim();
                var chain = Promise.resolve();
                todo.forEach(function (e) {
                    chain = chain.then(function () {
                        if (e.status === 'finished') return null;
                        e.status = 'converting';
                        e.pct = 12;
                        updateRow(e);
                        return Promise.resolve()
                            .then(function () { return convert(e); })
                            .then(function (res) {
                                var blob = res && res.blob ? res.blob : res;
                                if (!(blob instanceof Blob)) throw new Error('converter returned no data');
                                if (e.url) URL.revokeObjectURL(e.url);
                                e.url = URL.createObjectURL(blob);
                                e.outName = outName(e);
                                e.status = 'finished';
                                e.pct = 100;
                                finishedCount++;
                                updateRow(e);
                            })
                            .catch(function (err) {
                                if (logErrors && global.console) console.error(err);
                                e.status = 'error';
                                e.pct = 100;
                                updateRow(e);
                                okAll = false;
                            });
                    });
                });
                return chain;
            }).then(function () {
                stopConvertAnim();
                busy = false;
                updateConvertBtn();
                var msg;
                if (typeof doneToast === 'function') msg = doneToast(okAll, finishedCount);
                else if (doneToast) msg = doneToast;
                else msg = okAll ? 'Conversion successful!' : failedHint;
                toast(msg);
                if (onChange) onChange(entries);
            });
        }

        /* ---------- wiring ---------- */

        if (convertBtn) convertBtn.addEventListener('click', function () { convertAll(); });
        if (addBtn && input) {
            addBtn.addEventListener('click', function () { if (!busy) input.click(); });
        }
        if (input) {
            input.addEventListener('change', function () {
                if (input.files && input.files.length) { addFiles(input.files); input.value = ''; }
            });
        }
        var dz = find(o.dropzone);
        if (dz && input) {
            dz.addEventListener('click', function () { if (!busy) input.click(); });
            ['dragenter', 'dragover'].forEach(function (ev) {
                dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.add('dragover'); });
            });
            ['dragleave', 'drop'].forEach(function (ev) {
                dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.remove('dragover'); });
            });
            dz.addEventListener('drop', function (e) {
                e.preventDefault();
                dz.classList.remove('dragover');
                if (e.dataTransfer && e.dataTransfer.files) addFiles(e.dataTransfer.files);
            });
        }

        updateConvertBtn();

        return {
            addFiles: addFiles,
            convertAll: convertAll,
            clearAll: clearAll,
            remove: remove,
            entries: entries,
            get busy() { return busy; },
            refresh: updateConvertBtn
        };
    }

    global.TZQueue = { create: create, fmtSize: fmtSize };
})(window);
