/* ToolzMoolz — on-demand engine loader.
   Heavy conversion engines (pdf.js, mammoth, SheetJS, JSZip, jsPDF...) are only
   fetched when the visitor actually adds a file / runs a conversion, so first
   paint is never blocked by a 300KB-1MB script.

   Engines are served from this site's own /assets/vendor/ folder first (fast,
   same-origin, no third-party dependency). If a local file is missing or fails,
   the loader falls back to the original public CDN automatically. */
(function () {
    "use strict";

    /* Resolve this script's own folder so vendor paths work from any sub-page. */
    var ASSETS_BASE = (function () {
        var s = document.currentScript;
        if (!s) {
            var all = document.getElementsByTagName('script');
            s = all[all.length - 1];
        }
        if (s && s.src) return s.src.replace(/[^/]*$/, '');
        return '/assets/';
    })();

    function local(file) { return ASSETS_BASE + 'vendor/' + file; }

    var CDN = 'https://cdnjs.cloudflare.com/ajax/libs/';
    var PDF_WORKER = local('pdf.worker.min.js');
    var PDF_WORKER_CDN = CDN + 'pdf.js/3.11.174/pdf.worker.min.js';

    var LIBS = {
        pdfjs: {
            local: local('pdf.min.js'),
            url: CDN + 'pdf.js/3.11.174/pdf.min.js',
            ready: function () { return !!window.pdfjsLib; },
            after: function () {
                if (window.pdfjsLib && window.pdfjsLib.GlobalWorkerOptions) {
                    window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER;
                }
            }
        },
        jspdf: {
            local: local('jspdf.umd.min.js'),
            url: CDN + 'jspdf/2.5.1/jspdf.umd.min.js',
            ready: function () { return !!(window.jspdf || window.jsPDF); }
        },
        jszip: {
            local: local('jszip.min.js'),
            url: CDN + 'jszip/3.10.1/jszip.min.js',
            ready: function () { return !!window.JSZip; }
        },
        pdflib: {
            local: local('pdf-lib.min.js'),
            url: CDN + 'pdf-lib/1.17.1/pdf-lib.min.js',
            ready: function () { return !!window.PDFLib; }
        },
        mammoth: {
            local: local('mammoth.browser.min.js'),
            url: CDN + 'mammoth/1.6.0/mammoth.browser.min.js',
            ready: function () { return !!window.mammoth; }
        },
        html2pdf: {
            local: local('html2pdf.bundle.min.js'),
            url: CDN + 'html2pdf.js/0.10.1/html2pdf.bundle.min.js',
            ready: function () { return !!window.html2pdf; }
        },
        xlsx: {
            local: local('xlsx.full.min.js'),
            url: 'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js',
            ready: function () { return !!window.XLSX; }
        },
        heic2any: {
            local: local('heic2any.min.js'),
            url: CDN + 'heic2any/0.0.4/heic2any.min.js',
            ready: function () { return !!window.heic2any; }
        },
        tesseract: {
            /* OCR keeps using the CDN build: Tesseract pulls large WASM cores and
               language files at runtime, which are not practical to bundle here. */
            url: CDN + 'tesseract.js/5.1.0/tesseract.min.js',
            ready: function () { return !!window.Tesseract; }
        },
        pdfworker: {
            local: PDF_WORKER,
            url: PDF_WORKER_CDN,
            ready: function () { return true; }
        }
    };

    var inflight = {};

    var TIMEOUT = 15000;

    function loadScript(url) {
        return new Promise(function (resolve, reject) {
            var el = document.createElement('script');
            el.src = url;
            el.async = true;
            var done = false;
            var timer = setTimeout(function () {
                if (done) return;
                done = true;
                reject(new Error('Timed out loading ' + url));
            }, TIMEOUT);
            el.onload = function () {
                if (done) return;
                done = true;
                clearTimeout(timer);
                resolve();
            };
            el.onerror = function () {
                if (done) return;
                done = true;
                clearTimeout(timer);
                reject(new Error('Could not load ' + url));
            };
            document.head.appendChild(el);
        });
    }

    function inject(name, def) {
        var first = def.local ? loadScript(def.local) : Promise.reject(new Error('no local'));
        return first.then(function () {
            if (def.after) { try { def.after(); } catch (e) { /* keep going */ } }
        }).catch(function () {
            /* Local copy missing or blocked — fall back to the public CDN. */
            return loadScript(def.url).then(function () {
                if (def.after) { try { def.after(); } catch (e) { /* keep going */ } }
            });
        }).catch(function () {
            throw new Error('Could not load the conversion engine (' + name + ').');
        });
    }

    window.TZLib = {
        has: function (name) {
            var d = LIBS[name];
            return !!(d && d.ready());
        },
        /* TZLib.load('pdfjs') / TZLib.load(['mammoth','html2pdf']) -> Promise */
        load: function () {
            var names = [];
            for (var i = 0; i < arguments.length; i++) {
                var a = arguments[i];
                if (Array.isArray(a)) names = names.concat(a); else names.push(a);
            }
            var chain = Promise.resolve();
            names.forEach(function (name) {
                chain = chain.then(function () {
                    var def = LIBS[name];
                    if (!def) return;
                    if (def.ready()) { if (def.after) def.after(); return; }
                    if (!inflight[name]) {
                        inflight[name] = inject(name, def).catch(function (err) {
                            delete inflight[name];
                            throw err;
                        });
                    }
                    return inflight[name];
                });
            });
            return chain;
        }
    };
})();
