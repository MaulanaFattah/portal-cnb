import schoolLogo from "../assets/logo-transparent.png";
import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { getKegiatan, resolveMediaUrl } from "../services/api";

/**
 * Memformat nilai tanggal menjadi teks lokal Indonesia (contoh: "5 Januari 2024").
 * @param {string|Date} value Nilai tanggal yang akan diformat.
 * @returns {string} Teks tanggal terformat; string kosong bila value kosong; nilai asli
 *   bila tidak dapat di-parse menjadi tanggal valid. Efek: murni.
 */
function formatTanggal(value) {
  if (!value) return "";
  const date = new Date(value);
  if (isNaN(date)) return value;
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

/**
 * Halaman Kegiatan Sekolah - halaman publik.
 * Akses: umum (tidak perlu login).
 * Fungsi halaman: menampilkan daftar kegiatan/agenda sekolah dari API publik.
 */
function Kegiatan() {
  const [kegiatan, setKegiatan] = useState([]);
  const [loading, setLoading] = useState(true);

  // Efek pemuatan awal: mengambil daftar kegiatan dari API saat mount; setLoading(false)
  // dijalankan di blok finally agar status memuat selalu berakhir.
  useEffect(() => {
    (async () => {
      try {
        const result = await getKegiatan();
        if (result.success) setKegiatan(result.data || []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <>
      <Navbar />

      <main>
        <section className="page-hero container">
          <span className="badge">Kegiatan Sekolah</span>
          <h1>Kegiatan</h1>
          <p>Kabar terbaru seputar aktivitas, program, dan agenda sekolah.</p>
        </section>

        <section className="container">
          <div className="activity-grid">
            {loading ? (
              <p className="empty-text">Memuat kegiatan...</p>
            ) : kegiatan.length === 0 ? (
              <p className="empty-text">Belum ada kegiatan.</p>
            ) : (
              kegiatan.map((item) => (
                <article className="activity-card" key={item.id}>
                  <img src={resolveMediaUrl(item.image, schoolLogo)} alt={item.title} loading="lazy" onError={(event) => { event.currentTarget.src = schoolLogo; }} />

                  <div className="activity-content">
                    <div className="activity-date">{formatTanggal(item.date)}</div>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

export default Kegiatan;
