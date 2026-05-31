import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const galeriData = [
  {
    image: "/images/galeri1.jpg",
    title: "Dokumentasi Sekolah",
    desc: "Kumpulan foto kegiatan, pembelajaran, dan lingkungan sekolah."
  },
  {
    image: "/images/galeri2.jpg",
    title: "Kunjungan Edukasi",
    desc: "Dokumentasi kunjungan edukasi untuk memperluas wawasan siswa."
  },
  {
    image: "/images/galeri3.jpg",
    title: "Upacara Sekolah",
    desc: "Dokumentasi kegiatan upacara dan agenda sekolah."
  },
  {
    image: "/images/galeri4.jpg",
    title: "Peringatan Maulid Nabi",
    desc: "Dokumentasi peringatan Maulid Nabi Muhammad SAW."
  }
];

function Galeri() {
  return (
    <>
      <Navbar />

      <main>
        <section className="page-hero container">
          <span className="badge">Dokumentasi</span>
          <h1>Galeri</h1>
          <p>Dokumentasi foto kegiatan dan suasana sekolah.</p>
        </section>

        <section className="container">
          <div className="gallery-page-grid">
            {galeriData.map((item, index) => (
              <article className="gallery-card" key={index}>
                <div className="gallery-photo">
                  <img src={item.image} alt={item.title} />
                </div>

                <div className="gallery-info">
                  <h3>{item.title}</h3>
                  <p>{item.desc}</p>
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

export default Galeri;