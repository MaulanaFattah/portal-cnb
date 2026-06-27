import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { getPengumuman } from "../services/api";

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
 * Halaman Pengumuman - halaman publik.
 * Akses: umum (tidak perlu login).
 * Fungsi halaman: menampilkan daftar pengumuman resmi sekolah dari API publik.
 */
function Pengumuman() {
  const [pengumuman, setPengumuman] = useState([]);
  const [loading, setLoading] = useState(true);

  // Efek pemuatan awal: mengambil daftar pengumuman dari API saat mount; setLoading(false)
  // dijalankan di blok finally agar status memuat selalu berakhir.
  useEffect(() => {
    (async () => {
      try {
        const result = await getPengumuman();
        if (result.success) setPengumuman(result.data || []);
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
          <span className="badge">Informasi Sekolah</span>
          <h1>Pengumuman</h1>
          <p>Informasi resmi dan terbaru dari Cipta Nusa Bakti.</p>
        </section>

        <section className="container">
          <div className="announcement-list">
            {loading ? (
              <p className="empty-text">Memuat pengumuman...</p>
            ) : pengumuman.length === 0 ? (
              <p className="empty-text">Belum ada pengumuman.</p>
            ) : (
              pengumuman.map((item) => (
                <article className="announcement-card" key={item.id}>
                  <div>
                    <span className="announcement-label">
                      {item.category || "Pengumuman"}
                    </span>
                    <h3>{item.title}</h3>
                    <p>{item.content}</p>
                  </div>

                  <span className="announcement-date">
                    {formatTanggal(item.date)}
                  </span>
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

export default Pengumuman;
