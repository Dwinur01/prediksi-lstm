/** Champion–challenger (docs/06 §13): promosi hanya bila MAE uji kandidat ≤ MAE uji model aktif pada jendela yang sama. */
export function chooseCandidate(candidates) {
  const ok = candidates.filter((c) => Number.isFinite(c.mae));
  if (!ok.length) return null;
  return ok.reduce((best, c) => (c.mae < best.mae || (c.mae === best.mae && c.variant === 'scratch' && best.variant !== 'scratch') ? c : best));
}

export function decide({ candidates, champion }) {
  const winner = chooseCandidate(candidates);
  if (!winner) return { winner: null, decision: 'gagal', reason: 'Tidak ada kandidat yang valid.' };
  if (!champion || !Number.isFinite(champion.mae)) {
    return { winner, decision: 'tanpa_champion', reason: 'Belum ada model aktif; model pertama langsung dipakai.' };
  }
  const fmt = (v) => v.toFixed(2).replace('.', ',');
  if (winner.mae <= champion.mae) {
    return { winner, decision: 'diaktifkan', reason: `Model diganti: MAE uji ${fmt(winner.mae)} ≤ ${fmt(champion.mae)} (model lama).` };
  }
  return { winner, decision: 'ditahan', reason: `Model lama dipertahankan: kandidat ${fmt(winner.mae)} > ${fmt(champion.mae)}.` };
}
