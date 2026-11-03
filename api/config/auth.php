<?php
/**
 * Autentikasi dan Otorisasi Token JWT (T-01)
 * Menggunakan HMAC-SHA256 (HS256) dengan masa berlaku 8 jam (28800 detik)
 */

require_once __DIR__ . '/env.php';

function base64url_encode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64url_decode($data) {
    return base64_decode(strtr($data, '-_', '+/') . str_repeat('=', (4 - strlen($data) % 4) % 4));
}

function get_bearer_token() {
    $header = null;
    if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $header = trim($_SERVER['HTTP_AUTHORIZATION']);
    } elseif (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        $header = trim($_SERVER['REDIRECT_HTTP_AUTHORIZATION']);
    } elseif (function_exists('getallheaders')) {
        $headers = getallheaders();
        foreach ($headers as $key => $val) {
            if (strtolower($key) === 'authorization') {
                $header = trim($val);
                break;
            }
        }
    }

    if (!empty($header) && preg_match('/^Bearer\s+(.+)$/i', $header, $matches)) {
        return trim($matches[1]);
    }
    return null;
}

function issue_token(array $user) {
    $secret = env('JWT_SECRET');
    if (empty($secret)) {
        throw new Exception("JWT_SECRET belum dikonfigurasi di berkas .env");
    }

    $header = [
        'alg' => 'HS256',
        'typ' => 'JWT'
    ];

    $now = time();
    $exp = $now + 28800; // 8 jam

    $payload = [
        'sub' => (int)$user['id'],
        'name' => $user['name'] ?? '',
        'username' => $user['username'] ?? '',
        'role' => $user['role'] ?? 'staf',
        'iat' => $now,
        'exp' => $exp
    ];

    $header64 = base64url_encode(json_encode($header, JSON_UNESCAPED_SLASHES));
    $payload64 = base64url_encode(json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
    $signature = hash_hmac('sha256', "{$header64}.{$payload64}", $secret, true);
    $signature64 = base64url_encode($signature);

    return "{$header64}.{$payload64}.{$signature64}";
}

function verify_token($jwt = null) {
    if ($jwt === null) {
        $jwt = get_bearer_token();
    }
    if (empty($jwt)) {
        return false;
    }

    $parts = explode('.', $jwt);
    if (count($parts) !== 3) {
        return false;
    }

    list($header64, $payload64, $signature64) = $parts;
    $secret = env('JWT_SECRET');
    if (empty($secret)) {
        return false;
    }

    $expectedSignature = hash_hmac('sha256', "{$header64}.{$payload64}", $secret, true);
    $expectedSignature64 = base64url_encode($expectedSignature);

    if (!hash_equals($expectedSignature64, $signature64)) {
        return false;
    }

    $payloadJson = base64url_decode($payload64);
    $payload = json_decode($payloadJson, true);
    if (!is_array($payload)) {
        return false;
    }

    // Periksa masa berlaku (exp)
    if (isset($payload['exp']) && time() > $payload['exp']) {
        return false;
    }

    return $payload;
}

function require_auth() {
    $payload = verify_token();
    if (!$payload) {
        http_response_code(401);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'status' => 'error',
            'message' => 'Token tidak valid atau telah kedaluwarsa.'
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }
    return $payload;
}

function require_role($requiredRole) {
    $user = require_auth();
    if (($user['role'] ?? '') !== $requiredRole) {
        http_response_code(403);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'status' => 'error',
            'message' => 'Anda tidak memiliki hak akses untuk tindakan ini.'
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }
    return $user;
}

