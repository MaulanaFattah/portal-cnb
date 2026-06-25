import schoolLogo from "../assets/logo-transparent.png";
import schoolPhoto from "../assets/school-photo.jpeg";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { getFasilitas, getGaleri, getKegiatan, getProfilSekolah, resolveMediaUrl } from "../services/api";
import { schoolFacilities } from "../data/facilities";

const fallbackHomeProfile = {
  nama_sekolah: "Cipta Nusa Bakti",
  sejarah: "Cipta Nusa Bakti hadir sebagai lingkungan pendidikan yang mendampingi siswa tumbuh dengan karakter, disiplin, dan kemampuan akademik yang kuat."
};

function formatTanggal(value) {
  if (!value) return "";
  const date = new Date(value);
  if (isNaN(date)) return value;
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

function Home() {
  const [galeri, setGaleri] = useState([]);
  const [profile, setProfile] = useState(fallbackHomeProfile);
  const [facilities, setFacilities] = useState(schoolFacilities);
  const [kegiatan, setKegiatan] = useState([]);
  const galleryRef = useRef(null);

  const scrollGallery = (direction) => {
    const node = galleryRef.current;
    if (!node) return;
    const amount = Math.max(node.clientWidth * 0.8, 280);
    node.scrollBy({ left: direction * amount, behavior: "smooth" });
  };


  useEffect(() => {
    (async () => {
      const [galleryResult, profileResult, facilityResult, kegiatanResult] = await Promise.allSettled([
        getGaleri(),
        getProfilSekolah(),
        getFasilitas(),
        getKegiatan()
      ]);

      if (galleryResult.status === "fulfilled" && galleryResult.value.success) setGaleri(galleryResult.value.data || []);
      if (profileResult.status === "fulfilled" && profileResult.value.success && profileResult.value.data) {
        setProfile({ ...fallbackHomeProfile, ...profileResult.value.data });
      }
      if (facilityResult.status === "fulfilled" && facilityResult.value.success) {
        setFacilities(facilityResult.value.data || []);
      }
      if (kegiatanResult.status === "fulfilled" && kegiatanResult.value.success) {
        setKegiatan(kegiatanResult.value.data || []);
      }
    })();
  }, []);

  return (
    <>
      <Navbar />

      <main className="home-page">
        <section className="hero container">
          <div className="hero-content">
            <span className="badge">TK / SD / SMP</span>

            <h1>
              Portal Sekolah Modern
              <br />
              Cipta Nusa Bakti
            </h1>

            <p>
              Portal resmi Cipta Nusa Bakti untuk mengenal sekolah, fasilitas, galeri kegiatan, PPDB online, dan layanan kontak.
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
              <img src={schoolPhoto} alt="Kepala Yayasan Cipta Nusa Bakti" />
              <figcaption>Kepala Yayasan Cipta Nusa Bakti</figcaption>
            </figure>
            <div className="profile-card home-profile-card">
              <span className="section-kicker">Yayasan & Sekolah</span>
              <h3>{profile.nama_sekolah || "Cipta Nusa Bakti"}</h3>
              <p>
                {profile.sejarah || fallbackHomeProfile.sejarah}
              </p>
              <p>
                Yayasan dan sekolah berkomitmen menghadirkan layanan pendidikan yang dekat dengan siswa,
                orang tua, dan masyarakat melalui pembelajaran yang tertib, aman, dan berkarakter.
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
            {facilities.length === 0 ? (
              <p className="empty-text">Belum ada fasilitas yang ditampilkan.</p>
            ) : facilities.slice(0, 3).map((item) => (
              <article className="facility-card" key={item.id}>
                <img
                  src={resolveMediaUrl(item.image, schoolPhoto)}
                  alt={item.name}
                  loading="lazy"
                  onError={(event) => { event.currentTarget.src = schoolPhoto; }}
                />
                <div>
                  <h3>{item.name}</h3>
                  <p>{item.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="section container home-activity-section">
          <div className="section-header">
            <div>
              <span className="section-kicker">Kegiatan</span>
              <h2>Kegiatan Sekolah</h2>
            </div>
            <Link to="/kegiatan">Lihat Semua</Link>
          </div>

          <p className="section-intro">
            Kabar terbaru seputar aktivitas, program, dan agenda sekolah.
          </p>

          <div className="activity-grid">
            {kegiatan.length === 0 ? (
              <p className="empty-text">Belum ada kegiatan.</p>
            ) : kegiatan.slice(0, 3).map((item) => (
              <article className="activity-card" key={item.id}>
                <img
                  src={resolveMediaUrl(item.image, schoolPhoto)}
                  alt={item.title}
                  loading="lazy"
                  onError={(event) => { event.currentTarget.src = schoolPhoto; }}
                />
                <div className="activity-content">
                  <div className="activity-date">{formatTanggal(item.date)}</div>
                  <h3>{item.title}</h3>
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
