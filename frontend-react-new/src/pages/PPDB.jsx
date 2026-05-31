import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

function PPDB() {
  return (
    <>
      <Navbar />

      <main>
        <section className="page-hero container">
          <span className="badge">PPDB Online</span>

          <h1>Penerimaan Peserta Didik Baru</h1>

          <p>
            Dapatkan informasi lengkap mengenai pendaftaran peserta didik
            baru Cipta Nusa Bakti secara online.
          </p>
        </section>

        <section className="container">
          <div className="ppdb-grid">

            <div className="ppdb-card">
              <h3>Persyaratan</h3>

              <ul>
                <li>Fotokopi Kartu Keluarga</li>
                <li>Fotokopi Akta Kelahiran</li>
                <li>Pas Foto 3x4</li>
                <li>Raport terakhir</li>
              </ul>
            </div>

            <div className="ppdb-card">
              <h3>Jadwal Pendaftaran</h3>

              <ul>
                <li>Pendaftaran: 1 Juni 2026</li>
                <li>Seleksi: 15 Juni 2026</li>
                <li>Pengumuman: 25 Juni 2026</li>
                <li>Daftar Ulang: 1 Juli 2026</li>
              </ul>
            </div>

          </div>

          <div className="ppdb-action">
            <Link to="/form-ppdb" className="btn primary">
              Daftar Sekarang
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

export default PPDB;