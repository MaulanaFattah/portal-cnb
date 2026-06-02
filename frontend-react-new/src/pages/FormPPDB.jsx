import { useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { createPPDB } from "../services/api";

const initialForm = {
  nama_lengkap: "",
  nisn: "",
  jenis_kelamin: "L",
  tempat_lahir: "",
  tanggal_lahir: "",
  agama: "",
  alamat: "",
  asal_sekolah: "",
  nama_ayah: "",
  nama_ibu: "",
  pekerjaan_ayah: "",
  pekerjaan_ibu: "",
  no_telepon: "",
  email: "",
  tahun_ajaran: ""
};

function FormPPDB() {
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: "", message: "" });

    try {
      const result = await createPPDB(form);
      if (result.success) {
        setStatus({
          type: "success",
          message: "Pendaftaran berhasil dikirim. Status Anda menunggu verifikasi admin."
        });
        setForm(initialForm);
      } else {
        setStatus({ type: "error", message: result.message || "Pendaftaran gagal." });
      }
    } catch {
      setStatus({ type: "error", message: "Tidak dapat terhubung ke server." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />

      <main className="container">
        <section className="page-hero">
          <span className="badge">Formulir PPDB</span>
          <h1>Form Pendaftaran</h1>
          <p>Lengkapi data calon peserta didik dengan benar.</p>
        </section>

        {status.message && (
          <div className={`form-alert ${status.type}`}>{status.message}</div>
        )}

        <form className="registration-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nama Lengkap</label>
            <input type="text" name="nama_lengkap" value={form.nama_lengkap} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label>NISN</label>
            <input type="text" name="nisn" value={form.nisn} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>Jenis Kelamin</label>
            <select name="jenis_kelamin" value={form.jenis_kelamin} onChange={handleChange} required>
              <option value="L">Laki-laki</option>
              <option value="P">Perempuan</option>
            </select>
          </div>

          <div className="form-group">
            <label>Tempat Lahir</label>
            <input type="text" name="tempat_lahir" value={form.tempat_lahir} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label>Tanggal Lahir</label>
            <input type="date" name="tanggal_lahir" value={form.tanggal_lahir} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label>Agama</label>
            <input type="text" name="agama" value={form.agama} onChange={handleChange} required />
          </div>

          <div className="form-group full">
            <label>Alamat</label>
            <textarea rows="3" name="alamat" value={form.alamat} onChange={handleChange} required></textarea>
          </div>

          <div className="form-group">
            <label>Asal Sekolah</label>
            <input type="text" name="asal_sekolah" value={form.asal_sekolah} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>Tahun Ajaran</label>
            <input type="text" name="tahun_ajaran" placeholder="2026/2027" value={form.tahun_ajaran} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label>Nama Ayah</label>
            <input type="text" name="nama_ayah" value={form.nama_ayah} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label>Nama Ibu</label>
            <input type="text" name="nama_ibu" value={form.nama_ibu} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label>Pekerjaan Ayah</label>
            <input type="text" name="pekerjaan_ayah" value={form.pekerjaan_ayah} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>Pekerjaan Ibu</label>
            <input type="text" name="pekerjaan_ibu" value={form.pekerjaan_ibu} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>No WhatsApp</label>
            <input type="text" name="no_telepon" value={form.no_telepon} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input type="email" name="email" value={form.email} onChange={handleChange} />
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? "Mengirim..." : "Kirim Pendaftaran"}
          </button>
        </form>
      </main>

      <Footer />
    </>
  );
}

export default FormPPDB;
