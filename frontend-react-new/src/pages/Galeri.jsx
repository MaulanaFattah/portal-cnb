import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { getGaleri } from "../services/api";

function Galeri() {
  const [galeri, setGaleri] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const result = await getGaleri();
        if (result.success) setGaleri(result.data || []);
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
          <span className="badge">Dokumentasi</span>
          <h1>Galeri</h1>
          <p>Dokumentasi foto kegiatan dan suasana sekolah.</p>
        </section>

        <section className="container">
          <div className="gallery-page-grid">
            {loading ? (
              <p className="empty-text">Memuat galeri...</p>
            ) : galeri.length === 0 ? (
              <p className="empty-text">Belum ada galeri.</p>
            ) : (
              galeri.map((item) => (
                <article className="gallery-card" key={item.id}>
                  <div className="gallery-photo">
                    <img src={item.image || "/logo.svg"} alt={item.title} />
                  </div>

                  <div className="gallery-info">
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

export default Galeri;
