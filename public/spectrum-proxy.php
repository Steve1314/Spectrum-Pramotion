<?php
// Simple PHP Proxy for Spectrum API
// Put this in your public/ folder (it will be copied to dist/ on build)

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, client-id, channel, Accept');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Get the requested path from the query string
$path = isset($_GET['path']) ? $_GET['path'] : '';

// Reconstruct the full target URL including query parameters
$queryParams = $_GET;
unset($queryParams['path']); // Remove the path parameter used for routing
$queryString = http_build_query($queryParams);
$targetUrl = 'https://cpartner.spectrum.com/' . $path . ($queryString ? '?' . $queryString : '');

// Fallback for getallheaders() if not available
if (!function_exists('getallheaders')) {
    function getallheaders() {
        $headers = [];
        foreach ($_SERVER as $name => $value) {
            if (substr($name, 0, 5) == 'HTTP_') {
                $headers[str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($name, 5)))))] = $value;
            }
        }
        return $headers;
    }
}

// Get all the headers from the incoming request
$headers = getallheaders();
$forwardHeaders = [
    'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language: en-US,en;q=0.9',
    'Referer: https://cpartner.spectrum.com/'
];

foreach ($headers as $key => $value) {
    if (in_array(strtolower($key), ['authorization', 'client-id', 'channel', 'accept', 'content-type'])) {
        $forwardHeaders[] = "$key: $value";
    }
}

// Initialize CURL
$ch = curl_init($targetUrl);

// Set common CURL options
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, $forwardHeaders);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);
curl_setopt($ch, CURLOPT_IPRESOLVE, CURL_IPRESOLVE_V4); // Force IPv4
curl_setopt($ch, CURLOPT_HTTP_VERSION, CURL_HTTP_VERSION_1_1);
curl_setopt($ch, CURLOPT_ENCODING, ''); // Handle all encodings (gzip, etc)

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, file_get_contents('php://input'));
}

$response = curl_exec($ch);
$error = curl_error($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);

curl_close($ch);

if ($response === false) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        'error' => 'Proxy Error',
        'message' => $error,
        'url' => $targetUrl
    ]);
    exit;
}

// Set the response code and content type to match the Spectrum API
http_response_code($httpCode ?: 200);
if ($contentType) {
    header("Content-Type: $contentType");
} else {
    header("Content-Type: application/json");
}

echo $response;
?>
