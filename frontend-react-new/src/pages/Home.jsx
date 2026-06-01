import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

function Home() {
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
              <Link to="/ppdb" className="btn primary">
                Daftar PPDB
              </Link>

              <Link to="/profil" className="btn secondary">
                Profil Sekolah
              </Link>
            </div>
          </div>

          <div className="hero-image">
            <img src="/logo.png" alt="Logo Sekolah" />
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
            <div className="activity-card">
              <img src="/logo.png" alt="Kegiatan Sekolah" />
              <div className="activity-content">
                <span className="activity-date">20 Juli 2025</span>
                <h3>Upacara Sekolah</h3>
                <p>Kegiatan rutin untuk meningkatkan disiplin siswa.</p>
              </div>
            </div>

            <div className="activity-card">
              <img src="/logo.png" alt="Kegiatan Sekolah" />
              <div className="activity-content">
                <span className="activity-date">18 Juli 2025</span>
                <h3>Lomba Siswa</h3>
                <p>Kompetisi antar siswa dalam bidang akademik dan kreativitas.</p>
              </div>
            </div>

            <div className="activity-card">
              <img src="/logo.png" alt="Kegiatan Sekolah" />
              <div className="activity-content">
                <span className="activity-date">15 Juli 2025</span>
                <h3>Kegiatan Pramuka</h3>
                <p>Pelatihan karakter, kerja sama, dan kemandirian siswa.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="section container">
          <div className="section-header">
            <h2>Pengumuman Terbaru</h2>
            <Link to="/pengumuman">Lihat Semua</Link>
          </div>

          <div className="cards">
            <div className="card">
              <small>12 Juli 2025</small>
              <h3>PPDB Dibuka</h3>
              <p>Pendaftaran peserta didik baru telah dibuka secara online.</p>
            </div>

            <div className="card">
              <small>10 Juli 2025</small>
              <h3>Jadwal MPLS</h3>
              <p>Jadwal kegiatan MPLS dapat dilihat melalui portal sekolah.</p>
            </div>

            <div className="card">
              <small>08 Juli 2025</small>
              <h3>Rapat Orang Tua</h3>
              <p>Rapat wali murid akan dilaksanakan minggu depan.</p>
            </div>
          </div>
        </section>

        <section className="section container">
          <div className="section-header">
            <h2>Galeri Sekolah</h2>
            <Link to="/galeri">Lihat Semua</Link>
          </div>

          <div className="gallery-page-grid">
            <div className="gallery-card">
              <div className="gallery-photo">
                <img src="/logo.png" alt="Galeri Sekolah" />
              </div>
              <div className="gallery-info">
                <h3>Kegiatan Belajar</h3>
                <p>Dokumentasi kegiatan belajar siswa di sekolah.</p>
              </div>
            </div>

            <div className="gallery-card">
              <div className="gallery-photo">
                <img src="/logo.png" alt="Galeri Sekolah" />
              </div>
              <div className="gallery-info">
                <h3>Acara Sekolah</h3>
                <p>Momen kebersamaan siswa, guru, dan orang tua.</p>
              </div>
            </div>
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