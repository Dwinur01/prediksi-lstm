<?php
/**
 * Helper pemuat berkas .env untuk konfigurasi server (T-03)
 */

function load_env($filePath = null) {
    static $loaded = null;
    if ($loaded !== null && $filePath === null) {
        return $loaded;
    }

    $env = [];
    if ($filePath === null) {
        $candidates = [
            __DIR__ . '/../.env',
            __DIR__ . '/../../.env'
        ];
        foreach ($candidates as $candidate) {
            if (file_exists($candidate) && is_readable($candidate)) {
                $filePath = $candidate;
                break;
            }
        }
    }

    if ($filePath && file_exists($filePath) && is_readable($filePath)) {
        $lines = file($filePath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if ($lines !== false) {
            foreach ($lines as $line) {
                $line = trim($line);
                if ($line === '' || strpos($line, '#') === 0) {
                    continue;
                }
                if (strpos($line, '=') !== false) {
                    list($key, $value) = explode('=', $line, 2);
                    $key = trim($key);
                    $value = trim($value);

                    // Lepas tanda kutip ganda atau tunggal jika membungkus nilai
                    $len = strlen($value);
                    if ($len >= 2) {
                        $first = $value[0];
                        $last = $value[$len - 1];
                        if (($first === '"' && $last === '"') || ($first === "'" && $last === "'")) {
                            $value = substr($value, 1, -1);
                        }
                    }

                    $env[$key] = $value;
                    if (!array_key_exists($key, $_ENV)) {
                        $_ENV[$key] = $value;
                    }
                    putenv("{$key}={$value}");
                }
            }
        }
        $loaded = $env;
    } else {
        $loaded = [];
    }

    return $loaded;
}

function env($key, $default = null) {
    load_env();
    if (array_key_exists($key, $_ENV)) {
        return $_ENV[$key];
    }
    $val = getenv($key);
    if ($val !== false) {
        return $val;
    }
    $all = load_env();
    return $all[$key] ?? $default;
}

function has_env_file() {
    $candidates = [
        __DIR__ . '/../.env',
        __DIR__ . '/../../.env'
    ];
    foreach ($candidates as $candidate) {
        if (file_exists($candidate) && is_readable($candidate)) {
            return true;
        }
    }
    return false;
}

