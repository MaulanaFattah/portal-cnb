import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

function Pengumuman() {
  return (
    <>
      <Navbar />

      <main>
        <section className="page-hero container">
          <span className="badge">Informasi Sekolah</span>
          <h1>Pengumuman</h1>
          <p>Informasi resmi dan terbaru dari Cipta Nusa Bakti.</p>
        </section>

        <section className="container">
          <div className="announcement-list">
            <article className="announcement-card">
              <div>
                <span className="announcement-label">Pengumuman</span>
                <h3>PPDB Tahun Ajaran Baru Dibuka</h3>
                <p>
                  Pendaftaran peserta didik baru telah dibuka secara online
                  melalui portal sekolah.
                </p>
              </div>

              <span className="announcement-date">24 Mei 2026</span>
            </article>

            <article className="announcement-card">
              <div>
                <span className="announcement-label">Pengumuman</span>
                <h3>Jadwal Ujian Semester</h3>
                <p>
                  Jadwal ujian semester akan diumumkan melalui portal sekolah
                  dan wali kelas masing-masing.
                </p>
              </div>

              <span className="announcement-date">20 Mei 2026</span>
            </article>

            <article className="announcement-card">
              <div>
                <span className="announcement-label">Pengumuman</span>
                <h3>Rapat Orang Tua Siswa</h3>
                <p>
                  Rapat orang tua siswa akan dilaksanakan untuk membahas
                  perkembangan akademik peserta didik.
                </p>
              </div>

              <span className="announcement-date">15 Mei 2026</span>
            </article>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

export default Pengumuman;