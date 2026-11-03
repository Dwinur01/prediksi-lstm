import { useCallback, useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../services/api';
import { normalizeRows } from '../services/lstm/preprocessing';

/** Memuat data penjualan dari API. Tidak ada data simulasi: bila gagal, `error` berisi pesan dan `rows` kosong. */
export function useTickets() {
  const [raw, setRaw] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/data/tickets.php');
      if (res.data?.status === 'success') setRaw(res.data.data ?? []);
      else { setRaw([]); setError(res.data?.message || 'Data tidak dapat dimuat.'); }
    } catch (e) {
      setRaw([]);
      setError(apiErrorMessage(e, 'Data tidak dapat dimuat.'));
    } finally {
      setLoading(false);
    }
  }, []);

  // Memuat data saat komponen dipasang (pola fetch-on-mount yang disengaja).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { reload(); }, [reload]);
  return { raw, rows: normalizeRows(raw), loading, error, reload };
}
