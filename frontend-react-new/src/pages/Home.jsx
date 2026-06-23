import schoolLogo from "../assets/logo-transparent.png";
import schoolPhoto from "../assets/school-photo.jpeg";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { getGaleri, resolveMediaUrl } from "../services/api";
import { schoolFacilities } from "../data/facilities";

function Home() {
  const [galeri, setGaleri] = useState([]);
  const galleryRef = useRef(null);

  const scrollGallery = (direction) => {
    const node = galleryRef.current;
    if (!node) return;
    const amount = Math.max(node.clientWidth * 0.8, 280);
    node.scrollBy({ left: direction * amount, behavior: "smooth" });
  };


  useEffect(() => {
    (async () => {
      const g = await getGaleri();
      if (g.success) setGaleri(g.data || []);
    })();
  }, []);

  return (
    <>
      <Navbar />

      <main>
        <section className="hero container">
          <div className="hero-content">
            <span className="badge">TK / SD / SMP</span>

            <h1>
              Portal Sekolah Modern
              <br />
              Cipta Nusa Bakti
            </h1>

            <p>
              Sistem informasi sekolah untuk profil, fasilitas, galeri, PPDB online, dan layanan kontak sekolah
            </p>
          </div>

          <div className="hero-image home-hero-photo">
            <img
              src={schoolPhoto}
              alt="Foto Sekolah Cipta Nusa Bakti"
              onError={(event) => { event.currentTarget.src = schoolPhoto; }}
            />
          </div>
        </section>

        <section className="section container ppdb-landing-section home-ppdb-top">
          <div className="ppdb-landing-panel">
            <div className="ppdb-landing-copy">
              <span className="section-kicker">PPDB Online</span>
              <h2>Pendaftaran peserta didik baru jadi lebih mudah</h2>
              <p>
                Daftar dari rumah melalui portal sekolah. Data pendaftar akan masuk ke admin PPDB
                untuk diverifikasi dan diinformasikan kembali kepada orang tua/wali.
              </p>
              <div className="ppdb-landing-actions">
                <Link to="/ppdb" className="btn primary">Daftar Sekarang</Link>
                <span>Jenjang tersedia: TK, SD, dan SMP</span>
              </div>
            </div>

            <div className="ppdb-highlight-card" aria-label="Ringkasan PPDB">
              <span>Tahun Ajaran</span>
              <strong>2026/2027</strong>
              <p>Pendaftaran baru dan siswa pindahan tersedia sesuai jenjang pilihan.</p>
            </div>
          </div>

        </section>

        <section className="section container home-profile-section">
          <div className="section-header">
            <h2>Profil Sekolah</h2>
            <Link to="/profil">Lihat Semua</Link>
          </div>

          <div className="home-profile-showcase">
            <figure className="home-foundation-photo">
              <img src={schoolLogo} alt="Kepala Yayasan Cipta Nusa Bakti" />
              <figcaption>Kepala Yayasan Cipta Nusa Bakti</figcaption>
            </figure>
            <div className="profile-card home-profile-card">
              <h3>Cipta Nusa Bakti</h3>
              <p>
                Cipta Nusa Bakti adalah lingkungan belajar yang mendampingi siswa tumbuh
                dengan karakter, disiplin, dan kemampuan akademik yang kuat. Yayasan dan sekolah
                berkomitmen menghadirkan layanan pendidikan yang dekat dengan siswa dan orang tua.
              </p>
            </div>
          </div>
        </section>

        <section className="section container home-facility-section">
          <div className="section-header">
            <div>
              <span className="section-kicker">Fasilitas</span>
              <h2>Fasilitas Sekolah</h2>
            </div>
            <Link to="/fasilitas">Lihat Semua</Link>
          </div>

          <p className="section-intro">
            Fasilitas sekolah disiapkan untuk mendukung pembelajaran, pembiasaan karakter,
            kegiatan literasi, olahraga, dan layanan administrasi yang rapi.
          </p>

          <div className="facility-grid home-facility-grid">
            {schoolFacilities.slice(0, 3).map((item) => (
              <article className="facility-card" key={item.id}>
                <img src={item.image} alt={item.name} loading="lazy" />
                <div>
                  <h3>{item.name}</h3>
                  <p>{item.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="section container">
          <div className="section-header gallery-link-only">
            <span aria-hidden="true"></span>
            <Link to="/galeri">Lihat Semua</Link>
          </div>

          <div className="home-gallery-shell">
            {galeri.length > 1 && (
              <button type="button" className="home-gallery-nav prev" aria-label="Foto sebelumnya" onClick={() => scrollGallery(-1)}>
                &#8249;
              </button>
            )}
            <div className="home-gallery-carousel" aria-label="Slider foto galeri sekolah" ref={galleryRef}>
              {galeri.length === 0 ? (
                <p className="empty-text">Belum ada galeri.</p>
              ) : (
                <div className="home-gallery-track">
                  {galeri.map((item, index) => (
                    <figure className="home-gallery-slide" key={item.id}>
                      <img
                        src={resolveMediaUrl(item.image, schoolLogo)}
                        alt={item.title || `Foto galeri ${index + 1}`}
                        loading="lazy"
                        onError={(event) => { event.currentTarget.src = schoolLogo; }}
                      />
                    </figure>
                  ))}
                </div>
              )}
            </div>
            {galeri.length > 1 && (
              <button type="button" className="home-gallery-nav next" aria-label="Foto berikutnya" onClick={() => scrollGallery(1)}>
                &#8250;
              </button>
            )}
          </div>
        </section>

      </main>

      <Footer />
    </>
  );
}

export default Home;
