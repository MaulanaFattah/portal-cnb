import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import schoolPhoto from "../assets/school-photo.jpeg";
import { schoolFacilities } from "../data/facilities";
import { getFasilitas, resolveMediaUrl } from "../services/api";

/**
 * Halaman Fasilitas - halaman publik.
 * Akses: umum (tidak perlu login).
 * Fungsi halaman: menampilkan daftar fasilitas sekolah dari API publik, dengan fallback
 * ke data statis dan pesan info bila server belum tersedia.
 */
function Fasilitas() {
  const [facilities, setFacilities] = useState(schoolFacilities);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Efek pemuatan awal: mengambil daftar fasilitas dari API saat mount. Bila gagal/error,
  // menyetel pesan loadError dan tetap memakai data default; setIsLoading(false) di finally.
  useEffect(() => {
    (async () => {
      try {
        const result = await getFasilitas();
        if (result.success) {
          setFacilities(result.data || []);
          setLoadError("");
        } else {
          setLoadError("Menampilkan data fasilitas default karena data server belum tersedia.");
        }
      } catch {
        setLoadError("Menampilkan data fasilitas default karena server belum bisa diakses.");
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  return (
    <>
      <Navbar />

      <main>
        <section className="page-hero container facility-hero">
          <span className="badge">Fasilitas Sekolah</span>
          <h1>Fasilitas untuk belajar, berkegiatan, dan bertumbuh</h1>
          <p>
            Daftar fasilitas utama Cipta Nusa Bakti yang mendukung proses belajar,
            literasi, kegiatan sekolah, olahraga, dan layanan administrasi.
          </p>
        </section>

        <section className="container facility-page-section">
          {loadError && <p className="facility-page-note">{loadError}</p>}
          {isLoading ? (
            <p className="empty-text">Memuat fasilitas sekolah...</p>
          ) : facilities.length === 0 ? (
            <p className="empty-text">Belum ada fasilitas yang ditampilkan.</p>
          ) : (
            <div className="facility-grid facility-page-grid">
              {facilities.map((item) => (
                <article className="facility-card facility-page-card" key={item.id}>
                  <img
                    src={resolveMediaUrl(item.image, schoolPhoto)}
                    alt={item.name}
                    loading="lazy"
                    onError={(event) => { event.currentTarget.src = schoolPhoto; }}
                  />
                  <div>
                    <span className="section-kicker">Fasilitas</span>
                    <h2>{item.name}</h2>
                    <p>{item.description}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </>
  );
}

export default Fasilitas;
