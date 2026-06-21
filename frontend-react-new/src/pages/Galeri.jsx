import schoolLogo from "../assets/logo-transparent.png";
import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { getGaleri, resolveMediaUrl } from "../services/api";

const ITEMS_PER_PAGE = 6;

function Galeri() {
  const [galeri, setGaleri] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

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

  const totalPages = Math.max(1, Math.ceil(galeri.length / ITEMS_PER_PAGE));
  const currentItems = galeri.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const goToPage = (targetPage) => {
    setPage(targetPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

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
              currentItems.map((item, index) => (
                <article className="gallery-card gallery-photo-only-card" key={item.id}>
                  <div className="gallery-photo">
                    <img
                      src={resolveMediaUrl(item.image, schoolLogo)}
                      alt={item.title || `Foto galeri ${index + 1}`}
                      loading="lazy"
                      onError={(event) => { event.currentTarget.src = schoolLogo; }}
                    />
                  </div>
                </article>
              ))
            )}
          </div>

          {!loading && galeri.length > ITEMS_PER_PAGE && (
            <div className="gallery-pagination" aria-label="Navigasi halaman galeri">
              {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                <button
                  key={pageNumber}
                  className={pageNumber === page ? "active" : ""}
                  onClick={() => goToPage(pageNumber)}
                  type="button"
                >
                  {pageNumber}
                </button>
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </>
  );
}

export default Galeri;
