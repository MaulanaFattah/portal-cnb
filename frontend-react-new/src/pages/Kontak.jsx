import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

function Kontak() {
  return (
    <>
      <Navbar />

      <main>
        <section className="page-hero container">
          <span className="badge">Kontak Sekolah</span>

          <h1>Hubungi Kami</h1>

          <p>
            Silakan hubungi kami untuk informasi lebih lanjut mengenai
            sekolah dan layanan pendidikan.
          </p>
        </section>

        <section className="container">

          <div className="contact-grid">

            <div className="contact-card">
              <h3>Alamat</h3>
              <p>
                Jl. Pendidikan No.123,
                Bekasi, Jawa Barat
              </p>
            </div>

            <div className="contact-card">
              <h3>Telepon</h3>
              <p>021-12345678</p>
            </div>

            <div className="contact-card">
              <h3>Email</h3>
              <p>info@ciptanusabakti.sch.id</p>
            </div>

            <div className="contact-card">
              <h3>Jam Operasional</h3>
              <p>Senin - Jumat</p>
              <p>07.00 - 16.00 WIB</p>
            </div>

          </div>

        </section>
      </main>

      <Footer />
    </>
  );
}

export default Kontak;