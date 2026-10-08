<?php
/**
 * Keyword Spinner — optional AI proxy
 * ---------------------------------------------------------------------------
 * The spinner (index.html) works 100% on its own. This file is only needed if
 * you switch the "AI mode" toggle on, so that the AI provider key never has to
 * live inside the HTML file.
 *
 * HOW TO SET UP
 *   1. Upload this file next to index.html (same folder, same web server).
 *   2. Set one of the following in your server/hosting environment variables:
 *        KS_AI_PROVIDER  = openai | anthropic | gemini | openrouter
 *        KS_AI_API_KEY   = your key
 *        KS_AI_MODEL     = model name (see DEFAULT_MODELS below)
 *        KS_AI_ENDPOINT  = optional custom URL (overrides the provider default)
 *      …or, if your host cannot set env vars, fill in the DEFAULTS below and
 *      delete the lines that read $_ENV / getenv().
 *   3. Make sure PHP 7.4+ is available and the folder allows outbound HTTPS.
 *
 * DEFAULTS (used when the environment variable is not set)
 */
declare(strict_types=1);

const DEFAULTS = [
    'KS_AI_PROVIDER' => '',
    'KS_AI_API_KEY'  => '',
    'KS_AI_MODEL'    => '',
    'KS_AI_ENDPOINT' => '',
];

const DEFAULT_MODELS = [
    'openai'    => 'gpt-4o-mini',
    'anthropic' => 'claude-3-5-haiku-latest',
    'gemini'    => 'gemini-2.0-flash',
    'openrouter'=> 'openai/gpt-4o-mini',
];

const MAX_RESULTS_IN  = 120;   // how many phrases we accept from the browser
const MAX_RESULTS_OUT = 200;   // hard cap on what we hand back
const TIMEOUT_SECONDS = 60;

/* ── configuration ──────────────────────────────────────────────────────── */
function cfg(string $key): string
{
    $env = getenv($key);
    if ($env !== false && $env !== '') {
        return trim((string) $env);
    }
    if (isset($_ENV[$key]) && $_ENV[$key] !== '') {
        return trim((string) $_ENV[$key]);
    }
    return trim((string) (DEFAULTS[$key] ?? ''));
}

function fail(string $message, int $status = 400): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => false, 'error' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

/* ── basic hardening ────────────────────────────────────────────────────── */
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    fail('Use POST.', 405);
}

/* Same-origin by default; set KS_AI_ALLOW_ORIGIN to widen it. */
$allowOrigin = cfg('KS_AI_ALLOW_ORIGIN');
if ($allowOrigin === '') {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $host   = $_SERVER['HTTP_HOST'] ?? '';
    if ($origin !== '' && $host !== '' && parse_url($origin, PHP_URL_HOST) === $host) {
        $allowOrigin = $origin;
    }
}
if ($allowOrigin !== '') {
    header('Access-Control-Allow-Origin: ' . $allowOrigin);
    header('Vary: Origin');
}

/* Tiny in-memory rate limit (per IP, best effort — resets on PHP restart). */
function rateLimit(int $max = 20): void
{
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'cli';
    $file = sys_get_temp_dir() . '/ks_ai_' . preg_replace('/[^a-z0-9]/i', '', $ip) . '.json';
    $now = time();
    $hits = [];
    if (is_readable($file)) {
        $raw = json_decode((string) file_get_contents($file), true);
        if (is_array($raw)) {
            foreach ($raw as $ts) {
                if (is_int($ts) && ($now - $ts) < 3600) {
                    $hits[] = $ts;
                }
            }
        }
    }
    if (count($hits) >= $max) {
        fail('Too many requests, try again in a few minutes.', 429);
    }
    $hits[] = $now;
    @file_put_contents($file, json_encode($hits), LOCK_EX);
}

/* ── input ──────────────────────────────────────────────────────────────── */
$raw = file_get_contents('php://input');
if ($raw === false || trim($raw) === '') {
    fail('Empty request body.');
}
$in = json_decode($raw, true);
if (!is_array($in)) {
    fail('Body must be JSON.');
}

$keyword   = trim((string) ($in['keyword'] ?? ''));
$language  = strtolower(trim((string) ($in['lang'] ?? 'en')));
$limit     = (int) ($in['count'] ?? 60);
$existing  = $in['existing'] ?? [];
$provider  = cfg('KS_AI_PROVIDER');
$apiKey    = cfg('KS_AI_API_KEY');
$model     = cfg('KS_AI_MODEL');
$endpoint  = cfg('KS_AI_ENDPOINT');

if ($keyword === '') {
    fail('Missing keyword.');
}
if (mb_strlen($keyword) > 300) {
    fail('Keyword is too long.');
}
if ($limit < 1 || $limit > MAX_RESULTS_IN) {
    $limit = min(60, MAX_RESULTS_IN);
}
if (!is_array($existing)) {
    $existing = [];
}
$existing = array_slice(array_values(array_filter(
    array_map(static fn($v) => trim((string) $v), $existing),
    static fn($v) => $v !== ''
)), 0, MAX_RESULTS_IN);

if ($provider === '' || $apiKey === '') {
    fail('AI mode is not configured on this server (KS_AI_PROVIDER / KS_AI_API_KEY).', 503);
}
rateLimit();

if ($model === '') {
    $model = DEFAULT_MODELS[$provider] ?? 'gpt-4o-mini';
}

/* ── prompt ─────────────────────────────────────────────────────────────── */
$languageNames = [
    'en' => 'English', 'es' => 'Spanish', 'fr' => 'French', 'de' => 'German',
    'pt' => 'Portuguese', 'it' => 'Italian', 'nl' => 'Dutch', 'ar' => 'Arabic',
    'ur' => 'Urdu', 'hi' => 'Hindi', 'tr' => 'Turkish', 'pl' => 'Polish',
];
$languageName = $languageNames[$language] ?? 'English';

$system = "You generate local-service SEO keyword variations.\n"
    . "Rules you must follow without exception:\n"
    . "1. Reply with a JSON array of strings ONLY. No markdown, no explanation.\n"
    . "2. Write every variation in {$languageName}.\n"
    . "3. Each variation must be at most 9 words.\n"
    . "4. Every variation must contain the service word.\n"
    . "5. Never repeat a phrase that is already in the do-not-repeat list.\n"
    . "6. Natural, search-ready phrasing a real person would type. No keyword stuffing.\n"
    . "7. Do not invent a city other than the one in the keyword.";

$user = "Core keyword: {$keyword}\n"
    . "Requested variations: {$limit}\n";
if ($existing !== []) {
    $user .= "Do not repeat any of these:\n- " . implode("\n- ", array_slice($existing, 0, 60)) . "\n";
}
$user .= "Return {$limit} new variations as a JSON array of strings.";

/* ── provider call ──────────────────────────────────────────────────────── */
function post(string $url, array $headers, array $body): array
{
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => TIMEOUT_SECONDS,
        CURLOPT_HTTPHEADER     => $headers,
        CURLOPT_POSTFIELDS     => json_encode($body, JSON_UNESCAPED_UNICODE),
    ]);
    $raw    = curl_exec($ch);
    $err    = curl_error($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return [$raw === false ? '' : $raw, $err, $status];
}

switch ($provider) {
    case 'anthropic':
        $url = $endpoint ?: 'https://api.anthropic.com/v1/messages';
        [$raw, $err, $status] = post($url, [
            'content-type: application/json',
            'x-api-key: ' . $apiKey,
            'anthropic-version: 2023-06-01',
        ], [
            'model'      => $model,
            'max_tokens' => 2000,
            'system'     => $system,
            'messages'   => [['role' => 'user', 'content' => $user]],
        ]);
        break;

    case 'gemini':
        $url = $endpoint ?: 'https://generativelanguage.googleapis.com/v1beta/models/'
            . rawurlencode($model) . ':generateContent?key=' . rawurlencode($apiKey);
        [$raw, $err, $status] = post($url, ['content-type: application/json'], [
            'systemInstruction' => ['parts' => [['text' => $system]]],
            'contents' => [['role' => 'user', 'parts' => [['text' => $user]]]],
            'generationConfig' => ['responseMimeType' => 'application/json'],
        ]);
        break;

    case 'openrouter':
        $url = $endpoint ?: 'https://openrouter.ai/api/v1/chat/completions';
        [$raw, $err, $status] = post($url, [
            'content-type: application/json',
            'authorization: Bearer ' . $apiKey,
        ], [
            'model'    => $model,
            'messages' => [
                ['role' => 'system', 'content' => $system],
                ['role' => 'user',   'content' => $user],
            ],
        ]);
        break;

    case 'openai':
    default:
        $url = $endpoint ?: 'https://api.openai.com/v1/chat/completions';
        [$raw, $err, $status] = post($url, [
            'content-type: application/json',
            'authorization: Bearer ' . $apiKey,
        ], [
            'model'    => $model,
            'messages' => [
                ['role' => 'system', 'content' => $system],
                ['role' => 'user',   'content' => $user],
            ],
            'response_format' => ['type' => 'json_object'],
        ]);
        break;
}

if ($err !== '') {
    fail('Could not reach the AI provider: ' . $err, 502);
}
if ($status < 200 || $status >= 300) {
    fail('AI provider returned HTTP ' . $status . '.', 502);
}

/* ── parse whatever came back ───────────────────────────────────────────── */
$decoded = json_decode($raw, true);
$text    = '';
if (is_array($decoded)) {
    if (isset($decoded['choices'][0]['message']['content'])) {
        $text = (string) $decoded['choices'][0]['message']['content'];
    } elseif (isset($decoded['candidates'][0]['content']['parts'][0]['text'])) {
        $text = (string) $decoded['candidates'][0]['content']['parts'][0]['text'];
    } elseif (isset($decoded['content'][0]['text'])) {
        $text = (string) $decoded['content'][0]['text'];
    }
}
if ($text === '') {
    fail('Empty answer from the AI provider.', 502);
}

/* the model sometimes wraps the array in {"result": [...]} or a code fence */
$text = trim($text);
$text = preg_replace('/^```(?:json)?/i', '', $text);
$text = preg_replace('/```$/', '', (string) $text);
$list = json_decode(trim($text), true);
if (!is_array($list)) {
    if (is_array($decoded) && isset($decoded['choices'][0]['message']['content'])) {
        $list = json_decode(trim((string) $decoded['choices'][0]['message']['content']), true);
    }
}
if (!is_array($list)) {
    /* last resort: one phrase per line */
    $list = preg_split('/\r?\n/', $text) ?: [];
}

$seen = [];
foreach ($existing as $e) {
    $seen[mb_strtolower(trim($e))] = true;
}

$out = [];
foreach ($list as $item) {
    if (is_array($item)) {
        $item = $item['phrase'] ?? $item['text'] ?? $item['keyword'] ?? '';
    }
    $phrase = trim(preg_replace('/\s+/u', ' ', strip_tags((string) $item)) ?? '');
    if ($phrase === '' || $phrase === '-') {
        continue;
    }
    $phrase = trim($phrase, " \t\n\r\0\x0B\"'");
    if (mb_strlen($phrase) > 160 || mb_strlen($phrase) < 3) {
        continue;
    }
    $key = mb_strtolower($phrase);
    if (isset($seen[$key])) {
        continue;
    }
    $seen[$key] = true;
    $out[] = $phrase;
    if (count($out) >= min($limit, MAX_RESULTS_OUT)) {
        break;
    }
}

echo json_encode([
    'ok'       => true,
    'provider' => $provider,
    'model'    => $model,
    'main'     => $out,   // consumed by KeywordSpinner.mergeAI()
    'related'  => [],
], JSON_UNESCAPED_UNICODE);