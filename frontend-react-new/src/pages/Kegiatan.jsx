import schoolLogo from "../assets/logo.jpeg";
import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { getKegiatan } from "../services/api";

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

function Kegiatan() {
  const [kegiatan, setKegiatan] = useState([]);
  const [loading, setLoading] = useState(true);

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
                  <img src={item.image || schoolLogo} alt={item.title} />

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
