/** Jejak data: hash kanonik SHA-256 (docs/03 §5b). Fungsi yang sama harus dipakai klien dan server. */
export const canonicalString = (rows) =>
  [...rows]
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .map((r) => `${r.date}|${r.td}|${r.price}|${r.libur}`)
    .join('\n');

export async function dataHash(rows) {
  const buf = new TextEncoder().encode(canonicalString(rows));
  const digest = await globalThis.crypto.subtle.digest('SHA-256', buf);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const dataSnapshot = async (rows) => ({
  n: rows.length, first_week: rows[0]?.date ?? null, last_week: rows[rows.length - 1]?.date ?? null, data_hash: await dataHash(rows),
});

/** Alasan model "usang": minggu baru di akhir data, atau baris lama berubah. */
export function staleReason(modelSeries, currentRows) {
  const a = modelSeries ?? [];
  const same = (x, y) => x.date === y.date && x.td === y.td && x.price === y.price && x.libur === y.libur;
  const prefixOk = a.every((r, i) => currentRows[i] && same(r, currentRows[i]));
  if (prefixOk && a.length === currentRows.length) return null;
  if (prefixOk) return `${currentRows.length - a.length} minggu baru sejak pelatihan`;
  return 'data lama diubah';
}
