import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { schoolFacilities } from "../data/facilities";

function Fasilitas() {
  return (
    <>
      <Navbar />

      <main>
        <section className="page-hero container facility-hero">
          <span className="badge">Fasilitas Sekolah</span>
          <h1>Fasilitas untuk belajar, berkegiatan, dan bertumbuh</h1>
          <p>
            Daftar fasilitas utama Cipta Nusa Bakti yang mendukung proses belajar,
            literasi, kegiatan sekolah, olahraga, dan layanan administrasi.
          </p>
        </section>

        <section className="container facility-page-section">
          <div className="facility-grid facility-page-grid">
            {schoolFacilities.map((item) => (
              <article className="facility-card facility-page-card" key={item.id}>
                <img src={item.image} alt={item.name} loading="lazy" />
                <div>
                  <span className="section-kicker">Fasilitas</span>
                  <h2>{item.name}</h2>
                  <p>{item.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

export default Fasilitas;
