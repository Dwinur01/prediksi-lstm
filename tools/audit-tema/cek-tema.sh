#!/usr/bin/env bash
# Pemeriksa cepat (tanpa browser): cari kelas latar gelap TANPA pasangan `dark:` pada baris yang sama.
# Pakai di CI sebagai peringatan; beri komentar `tema:sengaja` pada baris yang memang disengaja (tooltip, scrim).
# Pemakaian: bash tools/audit-tema/cek-tema.sh [--fail]
set -u
cd "$(dirname "$0")/../.." || exit 2
hits=$(grep -rnE "(^|[^:[:alnum:]_-])bg-(gray|slate|zinc)-(800|900|950)|(^|[^:[:alnum:]_-])bg-black" src --include=*.jsx \
  | grep -v "dark:" | grep -v "tema:sengaja" || true)
if [ -z "$hits" ]; then echo "OK: tidak ada latar gelap tanpa pasangan dark:"; exit 0; fi
echo "PERIKSA (latar gelap tanpa pasangan dark: — pastikan disengaja):"; echo "$hits" | cut -c1-170
[ "${1:-}" = "--fail" ] && exit 1
exit 0
