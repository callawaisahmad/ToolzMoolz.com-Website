/* ToolzMoolz — on-demand engine loader.
   Heavy conversion engines (pdf.js, mammoth, SheetJS, JSZip, jsPDF...) are only
   fetched when the visitor actually adds a file / runs a conversion, so first
   paint is never blocked by a 300KB-1MB script. */
(function () {
    "use strict";

    var PDF_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    var LIBS = {
        pdfjs: {
            url: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
            ready: function () { return !!window.pdfjsLib; },
            after: function () {
                if (window.pdfjsLib && window.pdfjsLib.GlobalWorkerOptions) {
                    window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER;
                }
            }
        },
        jspdf: {
            url: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
            ready: function () { return !!(window.jspdf || window.jsPDF); }
        },
        jszip: {
            url: 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
            ready: function () { return !!window.JSZip; }
        },
        pdflib: {
            url: 'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js',
            ready: function () { return !!window.PDFLib; }
        },
        mammoth: {
            url: 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js',
            ready: function () { return !!window.mammoth; }
        },
        html2pdf: {
            url: 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js',
            ready: function () { return !!window.html2pdf; }
        },
        xlsx: {
            url: 'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js',
            ready: function () { return !!window.XLSX; }
        },
        heic2any: {
            url: 'https://cdnjs.cloudflare.com/ajax/libs/heic2any/0.0.4/heic2any.min.js',
            ready: function () { return !!window.heic2any; }
        },
        tesseract: {
            url: 'https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/5.1.0/tesseract.min.js',
            ready: function () { return !!window.Tesseract; }
        },
        pdfworker: {
            url: PDF_WORKER,
            ready: function () { return true; }
        }
    };

    var inflight = {};

    function inject(name, def) {
        return new Promise(function (resolve, reject) {
            var el = document.createElement('script');
            el.src = def.url;
            el.async = true;
            el.onload = function () {
                if (def.after) { try { def.after(); } catch (e) { /* keep going */ } }
                resolve(name);
            };
            el.onerror = function () { reject(new Error('Could not load the conversion engine (' + name + ').')); };
            document.head.appendChild(el);
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
