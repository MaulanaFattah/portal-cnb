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
              Portal Sekolah yang Rapi, Cepat, dan Modern.
            </h1>

            <p>
              Informasi sekolah terpusat, PPDB online, kegiatan sekolah,
              pengumuman, galeri, dan layanan digital Cipta Nusa Bakti.
            </p>

            <div className="hero-actions">
              <Link to="/ppdb" className="btn primary">
                Daftar PPDB
              </Link>

              <Link to="/profil" className="btn secondary">
                Lihat Profil
              </Link>
            </div>
          </div>

          <div className="hero-image">
            <img src="/logo.png" alt="Logo Sekolah" />
          </div>
        </section>

        <section className="section container">
          <h2>Pengumuman Terbaru</h2>
          <p>Informasi penting dari sekolah.</p>

          <div className="cards">
            <div className="card">
              <h3>PPDB Tahun Ajaran Baru Dibuka</h3>
              <p>Pendaftaran peserta didik baru sudah dapat dilakukan secara online.</p>
            </div>

            <div className="card">
              <h3>Jadwal Ujian Semester</h3>
              <p>Jadwal ujian semester akan diumumkan melalui portal sekolah.</p>
            </div>

            <div className="card">
              <h3>Rapat Orang Tua</h3>
              <p>Rapat koordinasi orang tua siswa akan dilaksanakan bulan ini.</p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

export default Home;