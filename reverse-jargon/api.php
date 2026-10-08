<?php
/* ══════════════════════════════════════════════════════════════
   ReverseJargon — secure server-side proxy for the Gemini API
   Your API key lives ONLY in this file, on your server. It is never
   sent to the browser. The page calls THIS file; this file calls Google.
   ══════════════════════════════════════════════════════════════ */

// ── 1. YOUR SETTINGS ──────────────────────────────────────────
// The API key is NEVER written into this file — that would publish it.
// Supply it in one of these ways, in order of preference:
//   1) Server environment variable: GEMINI_API_KEY   (recommended)
//   2) A local file api-config.php next to this file that returns the key.
//      Copy api-config.example.php to api-config.php and edit it; that file
//      is git-ignored and is never pushed to GitHub.
$GEMINI_API_KEY = (string) (getenv('GEMINI_API_KEY') ?: '');
if ($GEMINI_API_KEY === '' && is_file(__DIR__ . '/api-config.php')) {
    $__cfg = require __DIR__ . '/api-config.php';
    if (is_array($__cfg) && isset($__cfg['GEMINI_API_KEY'])) {
        $GEMINI_API_KEY = trim((string) $__cfg['GEMINI_API_KEY']);
    }
}
if ($GEMINI_API_KEY === '') {
    $GEMINI_API_KEY = 'PASTE_YOUR_GEMINI_API_KEY_HERE';
}

// Domains the proxy accepts (each domain AND any subdomain of it).
$ALLOWED_DOMAINS = array(
    'toolzmoolz.com',    // your live domain (and its subdomains)
    'kortechx.com',      // your current test host (toolzmoolz.kortechx.com)
);
$ALLOWED_HOSTS = array('localhost', '127.0.0.1');   // extra exact hosts

// Models to try, in order. The proxy uses the first one that works and
// skips any that Google has retired — so if a model name stops working,
// it automatically falls through to the next without you changing anything.
$MODELS = array(
    'gemini-flash-latest',      // alias that always points to the current Flash
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-flash-lite-latest',
);

$RATE_LIMIT_PER_MIN  = 20;
$MAX_QUERY_CHARS     = 500;

// ══════════════════════════════════════════════════════════════
//  You normally do not need to edit anything below this line.
// ══════════════════════════════════════════════════════════════

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

function fail($status, $message) {
    http_response_code($status);
    echo json_encode(array('error' => $message));
    exit;
}

// One HTTP POST to a Gemini model. Returns array(status, resp, err).
function gemini_post($model, $payload, $key) {
    $url = 'https://generativelanguage.googleapis.com/v1beta/models/' . $model
         . ':generateContent?key=' . urlencode($key);
    $st = 0; $rs = false; $er = '';
    if (function_exists('curl_init')) {
        $c = curl_init($url);
        curl_setopt_array($c, array(CURLOPT_POST=>true, CURLOPT_POSTFIELDS=>$payload,
            CURLOPT_HTTPHEADER=>array('Content-Type: application/json'),
            CURLOPT_RETURNTRANSFER=>true, CURLOPT_TIMEOUT=>30));
        $rs = curl_exec($c); $st = (int) curl_getinfo($c, CURLINFO_HTTP_CODE); $er = curl_error($c); curl_close($c);
    } else {
        $ctx = stream_context_create(array('http'=>array('method'=>'POST',
            'header'=>"Content-Type: application/json\r\n", 'content'=>$payload,
            'timeout'=>30, 'ignore_errors'=>true)));
        $rs = @file_get_contents($url, false, $ctx);
        $st = (isset($http_response_header[0]) && preg_match('#\s(\d{3})\s#', $http_response_header[0], $m)) ? (int)$m[1] : ($rs !== false ? 200 : 0);
    }
    return array('status'=>$st, 'resp'=>$rs, 'err'=>$er);
}

// Try each model until one works. Stops on the first success, or on a
// first NON-404/NON-5xx error (real problems like a bad key surface
// immediately). 404 = retired model, 5xx = transient overload — try next.
function gemini_generate($models, $payload, $key) {
    $last = array('model'=>null, 'status'=>0, 'resp'=>false, 'err'=>'');
    foreach ($models as $model) {
        $r = gemini_post($model, $payload, $key);
        $last = array('model'=>$model, 'status'=>$r['status'], 'resp'=>$r['resp'], 'err'=>$r['err']);
        if ($r['status'] === 200) return $last;   // success
        if ($r['status'] !== 404 && $r['status'] < 500) return $last;   // real error — don't mask it
        // 404/5xx → try the next model
    }
    return $last;
}

// ── DIAGNOSTIC (temporary): open  api.php?selftest=1  in a browser ──
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'GET' && isset($_GET['selftest'])) {
    // (a) which models can this key actually use for generateContent?
    $listUrl = 'https://generativelanguage.googleapis.com/v1beta/models?key=' . urlencode($GEMINI_API_KEY);
    $listRaw = false;
    if (function_exists('curl_init')) {
        $c = curl_init($listUrl);
        curl_setopt_array($c, array(CURLOPT_RETURNTRANSFER=>true, CURLOPT_TIMEOUT=>30));
        $listRaw = curl_exec($c); curl_close($c);
    } else {
        $listRaw = @file_get_contents($listUrl);
    }
    $available = array();
    $ld = json_decode((string)$listRaw, true);
    if (isset($ld['models']) && is_array($ld['models'])) {
        foreach ($ld['models'] as $mm) {
            $methods = $mm['supportedGenerationMethods'] ?? array();
            if (in_array('generateContent', $methods, true)) {
                $available[] = str_replace('models/', '', $mm['name'] ?? '');
            }
        }
    }
    // (b) an actual tiny generate using the fallback list
    $p = json_encode(array('contents'=>array(array('parts'=>array(array('text'=>'Reply with the single word: hello'))))));
    $g = gemini_generate($MODELS, $p, $GEMINI_API_KEY);
    echo json_encode(array(
        'php_has_curl'         => function_exists('curl_init'),
        'key_prefix'           => substr($GEMINI_API_KEY, 0, 4) . '...(' . strlen($GEMINI_API_KEY) . ' chars)',
        'models_tried'         => $MODELS,
        'working_model'        => ($g['status'] === 200 ? $g['model'] : null),
        'test_http_status'     => $g['status'],
        'available_models'     => (empty($available) ? ('could not list: ' . substr((string)$listRaw, 0, 400)) : $available),
        'test_google_response' => (json_decode((string)$g['resp'], true) ?: substr((string)$g['resp'], 0, 800)),
    ), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

// ── 2. Only allow POST ────────────────────────────────────────
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    fail(405, 'Method not allowed.');
}

// ── 3. Only allow calls coming from your own site ─────────────
function request_host() {
    $src = $_SERVER['HTTP_ORIGIN'] ?? ($_SERVER['HTTP_REFERER'] ?? '');
    if ($src === '') return null;
    $host = parse_url($src, PHP_URL_HOST);
    return $host ? strtolower($host) : null;
}
function host_allowed($host, $domains, $extra) {
    if ($host === null) return true;
    if (in_array($host, $extra, true)) return true;
    foreach ($domains as $domain) {
        if ($host === $domain) return true;
        $suffix = '.' . $domain;
        if (substr($host, -strlen($suffix)) === $suffix) return true;
    }
    return false;
}
$host = request_host();
if (!host_allowed($host, $ALLOWED_DOMAINS, $ALLOWED_HOSTS)) {
    fail(403, 'This tool can only be used from its own website.');
}
if (!empty($_SERVER['HTTP_ORIGIN'])) {
    header('Access-Control-Allow-Origin: ' . $_SERVER['HTTP_ORIGIN']);
    header('Vary: Origin');
}

// ── 4. Make sure the key was set ──────────────────────────────
if ($GEMINI_API_KEY === 'PASTE_YOUR_GEMINI_API_KEY_HERE' || trim($GEMINI_API_KEY) === '') {
    fail(500, 'The site owner has not added an API key yet.');
}

// ── 5. Simple per-IP rate limit ───────────────────────────────
function rate_limited($perMin) {
    $ip  = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $dir = sys_get_temp_dir() . '/rj_rate';
    if (!is_dir($dir)) @mkdir($dir, 0700, true);
    $file = $dir . '/' . md5($ip) . '.json';
    $now  = time(); $hits = array();
    $fp = @fopen($file, 'c+');
    if ($fp === false) return false;
    flock($fp, LOCK_EX);
    $data = json_decode(stream_get_contents($fp), true);
    if (is_array($data)) foreach ($data as $t) { if ($t > $now - 60) $hits[] = $t; }
    $blocked = count($hits) >= $perMin;
    if (!$blocked) $hits[] = $now;
    ftruncate($fp, 0); rewind($fp); fwrite($fp, json_encode($hits));
    flock($fp, LOCK_UN); fclose($fp);
    return $blocked;
}
if (rate_limited($RATE_LIMIT_PER_MIN)) {
    fail(429, 'You are searching too fast. Please wait a moment and try again.');
}

// ── 6. Read the visitor's description ─────────────────────────
$body  = json_decode(file_get_contents('php://input'), true);
$query = is_array($body) ? trim((string)($body['q'] ?? '')) : '';
if ($query === '') fail(400, 'Please describe the concept you are looking for.');
if (mb_strlen($query) > $MAX_QUERY_CHARS) $query = mb_substr($query, 0, $MAX_QUERY_CHARS);

// ── 7. Build the prompt ───────────────────────────────────────
$prompt =
"You are a \"reverse dictionary\" for tech, software, AI and general knowledge.\n" .
"The user describes a concept but does not know the exact term/jargon for it.\n" .
"Figure out the single best-matching term and explain it clearly. Be direct, no fluff.\n\n" .
"User description: \"" . $query . "\"\n\n" .
"Respond with ONLY a JSON object of this exact shape:\n" .
"{\n" .
"  \"term\": \"The exact term / jargon (short)\",\n" .
"  \"explanation\": \"A concise, plain-English, no-nonsense explanation (2-4 sentences).\",\n" .
"  \"examples\": [ { \"title\": \"Example name\", \"desc\": \"One-line description\" }, { \"title\": \"Example name\", \"desc\": \"One-line description\" } ],\n" .
"  \"useCases\": [\"Use case 1\", \"Use case 2\", \"Use case 3\"]\n" .
"}\n" .
"If the description is too vague, pick the most likely term and say so briefly in the explanation.";

$payload = json_encode(array(
    'contents' => array(array('parts' => array(array('text' => $prompt)))),
    'generationConfig' => array('responseMimeType' => 'application/json', 'temperature' => 0.4),
));

// ── 8. Call Gemini (tries models in order, skips retired ones) ─
$call = gemini_generate($MODELS, $payload, $GEMINI_API_KEY);
$resp = $call['resp']; $code = $call['status']; $usedModel = $call['model'];

if ($resp === false) fail(502, 'Could not reach the AI service. Please try again.');

// TEMPORARY DEBUG: surface Google's real error. Once everything works you
// can replace this block with a simple: fail(502, 'The AI service returned an error. Please try again.');
if ($code < 200 || $code >= 300) {
    $errData = json_decode($resp, true);
    $gmsg = $errData['error']['message'] ?? substr((string)$resp, 0, 300);
    fail(502, 'AI error [HTTP ' . $code . ', model ' . $usedModel . ']: ' . $gmsg);
}

// ── 9. Extract and clean the model's JSON, then return it ─────
$data = json_decode($resp, true);
$text = $data['candidates'][0]['content']['parts'][0]['text'] ?? '';
if ($text === '') fail(502, 'The AI returned an empty answer. Try rephrasing.');

$clean = trim(preg_replace('/```json|```/i', '', $text));
$parsed = json_decode($clean, true);
if (!is_array($parsed) || !isset($parsed['term'])) {
    fail(502, 'Could not read the AI answer. Please try again.');
}

echo json_encode(array(
    'term'        => (string)($parsed['term'] ?? ''),
    'explanation' => (string)($parsed['explanation'] ?? ''),
    'examples'    => array_values((array)($parsed['examples'] ?? array())),
    'useCases'    => array_values((array)($parsed['useCases'] ?? array())),
));
