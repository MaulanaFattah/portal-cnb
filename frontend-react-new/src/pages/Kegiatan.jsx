import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const kegiatanData = [
  {
    image: "/images/kegiatan-belajar.jpg",
    date: "24 Mei 2026",
    title: "Kegiatan Belajar Mengajar",
    desc: "Aktivitas pembelajaran berlangsung aktif, kreatif, dan menyenangkan di lingkungan sekolah."
  },
  {
    image: "/images/kegiatan-komputer.jpg",
    date: "20 Mei 2026",
    title: "Pembelajaran TIK",
    desc: "Siswa belajar menggunakan komputer dan teknologi digital sebagai penunjang proses pembelajaran."
  },
  {
    image: "/images/kunjungan.jpg",
    date: "10 Mei 2026",
    title: "Kunjungan Edukasi",
    desc: "Kunjungan edukasi membantu siswa belajar langsung dari lingkungan sekitar."
  },
  {
    image: "/images/upacara.jpg",
    date: "17 Agustus 2025",
    title: "Upacara 17 Agustus",
    desc: "Seluruh warga sekolah mengikuti upacara bendera untuk memperingati Hari Kemerdekaan Republik Indonesia."
  },
  {
    image: "/images/maulid.jpg",
    date: "16 September 2024",
    title: "Peringatan Maulid Nabi Muhammad SAW",
    desc: "Dokumentasi kegiatan Maulid Nabi Muhammad SAW yang diikuti oleh seluruh warga sekolah."
  }
];

function Kegiatan() {
  return (
    <>
      <Navbar />

      <main>
        <section className="page-hero container">
          <span className="badge">Kegiatan Sekolah</span>
          <h1>Kegiatan</h1>
          <p>Kabar terbaru seputar aktivitas, program, dan agenda sekolah.</p>
        </section>

        <section className="container">
          <div className="activity-grid">
            {kegiatanData.map((item, index) => (
              <article className="activity-card" key={index}>
                <img src={item.image} alt={item.title} />

                <div className="activity-content">
                  <div className="activity-date">{item.date}</div>
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

export default Kegiatan;