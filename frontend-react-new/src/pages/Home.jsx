import schoolLogo from "../assets/logo.jpeg";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { getKegiatan, getPengumuman, getGaleri, resolveMediaUrl } from "../services/api";

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

function Home() {
  const [kegiatan, setKegiatan] = useState([]);
  const [pengumuman, setPengumuman] = useState([]);
  const [galeri, setGaleri] = useState([]);

  const heroPhoto = galeri.find((item) => item.image)?.image || kegiatan.find((item) => item.image)?.image || "";

  useEffect(() => {
    (async () => {
      const [k, p, g] = await Promise.all([
        getKegiatan(),
        getPengumuman(),
        getGaleri()
      ]);
      if (k.success) setKegiatan((k.data || []).slice(0, 3));
      if (p.success) setPengumuman((p.data || []).slice(0, 3));
      if (g.success) setGaleri(g.data || []);
    })();
  }, []);

  return (
    <>
      <Navbar />

      <main>
        <section className="hero container">
          <div className="hero-content">
            <span className="badge">TK • SD • SMP</span>

            <h1>
              Portal Sekolah Modern
              <br />
              Cipta Nusa Bakti
            </h1>

            <p>
              Sistem informasi sekolah untuk profil, kegiatan, pengumuman,
              galeri, PPDB online, dan layanan kontak sekolah.
            </p>

            <div className="hero-actions">
              <Link to="/ppdb" className="btn primary">Daftar PPDB</Link>
              <Link to="/profil" className="btn secondary">Profil Sekolah</Link>
            </div>
          </div>

          <div className="hero-image home-hero-photo">
            <img
              src={resolveMediaUrl(heroPhoto, schoolLogo)}
              alt="Foto Sekolah Cipta Nusa Bakti"
              onError={(event) => { event.currentTarget.src = schoolLogo; }}
            />
          </div>
        </section>

        <section className="section container home-profile-section">
          <div className="section-header">
            <h2>Profil Sekolah</h2>
            <Link to="/profil">Lihat Semua</Link>
          </div>

          <div className="profile-card home-profile-card">
            <h3>Cipta Nusa Bakti</h3>
            <p>
              Sekolah yang berkomitmen membentuk siswa yang cerdas,
              berkarakter, disiplin, dan siap menghadapi masa depan.
            </p>
          </div>
        </section>

        <section className="section container">
          <div className="section-header">
            <h2>Kegiatan Sekolah</h2>
            <Link to="/kegiatan">Lihat Semua</Link>
          </div>

          <div className="activity-grid">
            {kegiatan.length === 0 ? (
              <p className="empty-text">Belum ada kegiatan.</p>
            ) : (
              kegiatan.map((item) => (
                <div className="activity-card" key={item.id}>
                  <img src={resolveMediaUrl(item.image, schoolLogo)} alt={item.title} loading="lazy" onError={(event) => { event.currentTarget.src = schoolLogo; }} />
                  <div className="activity-content">
                    <span className="activity-date">{formatTanggal(item.date)}</span>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="section container">
          <div className="section-header">
            <h2>Pengumuman Terbaru</h2>
            <Link to="/pengumuman">Lihat Semua</Link>
          </div>

          <div className="cards home-announcement-grid">
            {pengumuman.length === 0 ? (
              <p className="empty-text">Belum ada pengumuman.</p>
            ) : (
              pengumuman.map((item) => (
                <div className="card home-announcement-card" key={item.id}>
                  <small>{formatTanggal(item.date)}</small>
                  <h3>{item.title}</h3>
                  <p>{item.content}</p>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="section container">
          <div className="section-header">
            <h2>Galeri Sekolah</h2>
            <Link to="/galeri">Lihat Semua</Link>
          </div>

          <div className="home-gallery-carousel" aria-label="Slider foto galeri sekolah">
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
        </section>

        <section className="section container ppdb-landing-section">
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

          <div className="ppdb-grid ppdb-landing-grid">
            <div className="ppdb-card ppdb-feature-card">
              <span className="ppdb-card-mark">01</span>
              <h3>Informasi Pendaftaran</h3>
              <p>
                Isi formulir sesuai jenis pendaftaran, lengkapi data calon siswa,
                lalu tunggu proses verifikasi dari pihak sekolah.
              </p>
            </div>

            <div className="ppdb-card ppdb-feature-card">
              <span className="ppdb-card-mark">02</span>
              <h3>Persyaratan Utama</h3>
              <ul>
                <li>Fotokopi kartu keluarga</li>
                <li>Fotokopi akta kelahiran</li>
                <li>Foto calon siswa</li>
                <li>Raport terakhir untuk jenjang SD dan SMP</li>
              </ul>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

export default Home;
