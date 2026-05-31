import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

function FormPPDB() {
  return (
    <>
      <Navbar />

      <main className="container">

        <section className="page-hero">
          <span className="badge">Formulir PPDB</span>

          <h1>Form Pendaftaran</h1>

          <p>
            Lengkapi data calon peserta didik dengan benar.
          </p>
        </section>

        <form className="registration-form">

          <div className="form-group">
            <label>Nama Lengkap</label>
            <input type="text" />
          </div>

          <div className="form-group">
            <label>NISN</label>
            <input type="text" />
          </div>

          <div className="form-group">
            <label>Tempat Lahir</label>
            <input type="text" />
          </div>

          <div className="form-group">
            <label>Tanggal Lahir</label>
            <input type="date" />
          </div>

          <div className="form-group full">
            <label>Alamat</label>
            <textarea rows="4"></textarea>
          </div>

          <div className="form-group">
            <label>Nama Orang Tua</label>
            <input type="text" />
          </div>

          <div className="form-group">
            <label>No WhatsApp</label>
            <input type="text" />
          </div>

          <button type="submit" className="submit-btn">
            Kirim Pendaftaran
          </button>

        </form>

      </main>

      <Footer />
    </>
  );
}

export default FormPPDB;