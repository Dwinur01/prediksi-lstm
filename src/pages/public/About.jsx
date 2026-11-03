import { Link } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/theme';

const Section = ({ n, title, children }) => (
  <section className="py-8 border-t border-rule grid md:grid-cols-[3.5rem_1fr] gap-2 md:gap-6">
    <p className="font-serif text-2xl text-muted">{n}</p>
    <div>
      <h2 className="text-2xl">{title}</h2>
      <div className="mt-3 space-y-3 text-[15px] max-w-[68ch]">{children}</div>
    </div>
  </section>
);

export default function About() {
  const { isDark, toggleTheme } = useTheme();
  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b border-rule">
        <div className="max-w-[1120px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link to="/" className="font-serif text-xl font-semibold tracking-tight">SWA Predict</Link>
          <div className="flex items-center gap-1">
            <Link to="/" className="btn-ghost">← Masuk</Link>
            <button type="button" onClick={toggleTheme} className="btn-ghost" aria-label={isDark ? 'Ganti ke mode terang' : 'Ganti ke mode gelap'}>
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-[1120px] mx-auto px-4 sm:px-6 py-12">
        <p className="eyebrow">Dokumentasi metode</p>
        <h1 className="mt-3 text-4xl lg:text-5xl max-w-[22ch]">Metode dan batasan</h1>
        <p className="mt-5 text-lg text-muted max-w-[60ch]">Halaman ini menjelaskan bagaimana perkiraan dibuat dan diuji, termasuk hal-hal yang tidak dapat dijamin.</p>

        <div className="mt-10">
          <Section n="1" title="Data">
            <p>Data berupa jumlah tiket terjual dan harga tiket per minggu. Satu minggu terdiri dari tujuh hari; tanggal awal minggu menjadi kunci data. Staf menambah data setiap minggu, dan data lama dapat diperbaiki bila ada kekeliruan.</p>
            <p>Setiap hasil menyimpan jejak data yang dipakai (jumlah minggu, rentang tanggal, dan sidik jari data), sehingga dapat diketahui apakah sebuah model masih sesuai dengan data terbaru.</p>
          </Section>
          <Section n="2" title="Model">
            <p>Model adalah LSTM satu lapis dengan empat unit tersembunyi. Untuk memperkirakan minggu ke-<em>t</em>, model memakai tujuh masukan: penjualan empat minggu sebelumnya, rata-rata harga tiga minggu terakhir, perubahan harga minggu lalu, dan penanda libur pada minggu <em>t</em>.</p>
            <p>Semua masukan diskalakan ke rentang 0–1 memakai nilai terkecil dan terbesar dari data latih saja. Penanda libur diturunkan dari kalender tanggal merah, cuti bersama, dan libur sekolah Jawa Timur.</p>
          </Section>
          <Section n="3" title="Evaluasi">
            <p>Data dibagi menurut urutan waktu: bagian terlama untuk melatih, bagian tengah untuk menghentikan pelatihan tepat waktu, dan bagian terbaru untuk menguji. Bagian uji tidak pernah dipakai saat pelatihan.</p>
            <p>Hasil uji selalu ditampilkan bersama dua pembanding: <em>rata-rata data latih</em> dan <em>minggu depan sama dengan minggu ini</em>. Ukuran utama adalah MAE dan RMSE dalam satuan tiket.</p>
            <p>Setiap data baru memicu pelatihan ulang. Model baru hanya menggantikan model lama bila kesalahan ujinya tidak lebih besar, diukur pada bagian uji yang sama.</p>
          </Section>
          <Section n="4" title="Batasan">
            <p>Jumlah tiket per minggu kecil (sekitar 6–10), sehingga tebakan sederhana pun sudah cukup dekat. Persentase kesalahan (MAPE) menyesatkan untuk angka sekecil ini, karena itu tidak dijadikan ukuran utama.</p>
            <p>Memilih model berulang kali dengan bagian uji yang hampir sama cenderung membuat nilai uji tampak lebih baik daripada kenyataan. Ukuran yang lebih jujur adalah <em>galat nyata</em>: perkiraan dibandingkan dengan penjualan minggu-minggu baru yang belum pernah dilihat model.</p>
            <p>Perkiraan lebih dari satu minggu ke depan mengandaikan harga tidak berubah dan menjadi kurang pasti. Perkiraan adalah alat bantu perencanaan, bukan jaminan.</p>
          </Section>
          <Section n="5" title="Versi">
            <p>Antarmuka dan model dikembangkan sebagai bagian skripsi Informatika, Universitas Muhammadiyah Gresik, untuk PT Swabina Gatra.</p>
          </Section>
        </div>
      </main>
    </div>
  );
}
