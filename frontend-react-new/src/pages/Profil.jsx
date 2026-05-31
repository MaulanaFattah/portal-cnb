import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

function Profil() {
  return (
    <>
      <Navbar />

      <main>
        <section className="page-hero container">
          <span className="badge">Profil Sekolah</span>

          <h1>Mengenal Cipta Nusa Bakti</h1>

          <p>
            Visi, misi, sejarah, fasilitas, struktur organisasi, dan
            prestasi sekolah.
          </p>
        </section>

        <section className="container">
          <div className="profile-wrapper">
            <article className="profile-card">
              <h3>Visi</h3>
              <p>
                Menjadi sekolah unggulan yang berkomitmen menciptakan generasi
                yang berkarakter, berakhlak mulia, cerdas, kreatif, inovatif,
                serta mampu mengembangkan potensi diri secara optimal.
              </p>
            </article>

            <article className="profile-card">
              <h3>Misi</h3>
              <p>
                Menyelenggarakan pendidikan yang bermutu dan berorientasi pada
                pengembangan karakter, kompetensi, serta keterampilan peserta
                didik secara menyeluruh.
              </p>
            </article>

            <article className="profile-card">
              <h3>Sejarah</h3>
              <p>
                Cipta Nusa Bakti hadir sebagai lembaga pendidikan yang
                berkomitmen memberikan layanan pendidikan terbaik bagi
                masyarakat.
              </p>
            </article>

            <article className="profile-card">
              <h3>Fasilitas</h3>
              <p>
                Sekolah menyediakan fasilitas yang memadai seperti ruang kelas,
                ruang guru, ruang administrasi, perpustakaan, area olahraga,
                serta lingkungan sekolah yang bersih dan aman.
              </p>
            </article>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

export default Profil;