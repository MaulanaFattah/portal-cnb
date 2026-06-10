import schoolLogo from "../assets/logo.jpeg";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { getKegiatan, getPengumuman, getGaleri } from "../services/api";

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

  useEffect(() => {
    (async () => {
      const [k, p, g] = await Promise.all([
        getKegiatan(),
        getPengumuman(),
        getGaleri()
      ]);
      if (k.success) setKegiatan((k.data || []).slice(0, 3));
      if (p.success) setPengumuman((p.data || []).slice(0, 3));
      if (g.success) setGaleri((g.data || []).slice(0, 2));
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

          <div className="hero-image">
            <img src={schoolLogo} alt="Logo Sekolah" />
          </div>
        </section>

        <section className="section container">
          <div className="section-header">
            <h2>Profil Sekolah</h2>
            <Link to="/profil">Lihat Semua</Link>
          </div>

          <div className="profile-card">
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
                  <img src={item.image || schoolLogo} alt={item.title} />
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

          <div className="cards">
            {pengumuman.length === 0 ? (
              <p className="empty-text">Belum ada pengumuman.</p>
            ) : (
              pengumuman.map((item) => (
                <div className="card" key={item.id}>
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

          <div className="gallery-page-grid">
            {galeri.length === 0 ? (
              <p className="empty-text">Belum ada galeri.</p>
            ) : (
              galeri.map((item) => (
                <div className="gallery-card" key={item.id}>
                  <div className="gallery-photo">
                    <img src={item.image || schoolLogo} alt={item.title} />
                  </div>
                  <div className="gallery-info">
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
            <h2>PPDB Online</h2>
            <Link to="/ppdb">Daftar Sekarang</Link>
          </div>

          <div className="ppdb-grid">
            <div className="ppdb-card">
              <h3>Informasi Pendaftaran</h3>
              <p>
                Pendaftaran peserta didik baru dapat dilakukan secara online
                melalui portal sekolah.
              </p>
            </div>

            <div className="ppdb-card">
              <h3>Persyaratan</h3>
              <ul>
                <li>Fotokopi kartu keluarga</li>
                <li>Fotokopi akta kelahiran</li>
                <li>Pas foto siswa</li>
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
