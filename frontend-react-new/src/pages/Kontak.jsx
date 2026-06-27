import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { schoolContact } from "../data/schoolContact";

/**
 * Halaman Kontak - halaman publik.
 * Akses: umum (tidak perlu login).
 * Fungsi halaman: menampilkan informasi kontak sekolah (alamat, telepon, email, jam
 * operasional) dari data statis schoolContact.
 */
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

            <div className="contact-card contact-card-wide">
              <h3>Alamat</h3>
              <p>{schoolContact.address}</p>
            </div>

            <div className="contact-card">
              <h3>Telepon</h3>
              <p>{schoolContact.phone}</p>
            </div>

            <div className="contact-card">
              <h3>Email</h3>
              <p>{schoolContact.email}</p>
            </div>

            <div className="contact-card">
              <h3>Jam Operasional</h3>
              <p>{schoolContact.operationalDays}</p>
              <p>{schoolContact.operationalHours}</p>
            </div>

          </div>

        </section>
      </main>

      <Footer />
    </>
  );
}

export default Kontak;