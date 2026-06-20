import { useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { createPPDB } from "../services/api";

const currentYear = new Date().getFullYear();

const initialForm = {
  jenis_pendaftaran: "pendaftaran_baru",
  target_jenjang: "tk",
  nama_lengkap: "",
  tanggal_lahir: "",
  email: "",
  jenis_kelamin: "L",
  alamat: "",
  nama_orang_tua: "",
  no_telepon: "",
  tahun_ajaran: `${currentYear}/${currentYear + 1}`,
  berkas_kk: "",
  berkas_raport: "",
  foto_siswa: "",
  berkas_surat_pindah: ""
};

const levelLabel = { tk: "TK", sd: "SD", smp: "SMP" };
const typeLabel = { pendaftaran_baru: "Pendaftaran Baru", siswa_pindahan: "Siswa Pindahan" };

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function FileInput({ label, name, value, onFile, required }) {
  return (
    <div className="form-group">
      <label>{label}</label>
      <label className={`file-chip ${value ? "filled" : ""}`}>
        <span>{value ? "Berkas sudah dipilih" : "Pilih berkas"}</span>
        <input type="file" accept="image/*,.pdf" onChange={(e) => onFile(name, e.target.files?.[0])} required={required && !value} />
      </label>
    </div>
  );
}

function FormPPDB() {
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [loading, setLoading] = useState(false);

  const needsReport = useMemo(() => ["sd", "smp"].includes(form.target_jenjang), [form.target_jenjang]);
  const needsTransferLetter = form.jenis_pendaftaran === "siswa_pindahan";

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFile = async (name, file) => {
    if (!file) return;
    const value = await readFileAsDataUrl(file);
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: "", message: "" });

    try {
      const payload = {
        ...form,
        nama_ayah: form.nama_orang_tua,
        nama_ibu: form.nama_orang_tua,
        agama: "-",
        tempat_lahir: "-"
      };
      const result = await createPPDB(payload);
      if (result.success) {
        setStatus({
          type: "success",
          message: "Pendaftaran berhasil dikirim. Jika dinyatakan lulus, nama calon siswa akan diumumkan di halaman Pengumuman sekolah."
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
        <section className="page-hero ppdb-form-hero">
          <span className="badge">Formulir PPDB</span>
          <h1>Form Pendaftaran {levelLabel[form.target_jenjang]}</h1>
          <p>{typeLabel[form.jenis_pendaftaran]} — lengkapi data calon siswa dan unggah berkas yang diminta.</p>
        </section>

        {status.message && <div className={`form-alert ${status.type}`}>{status.message}</div>}

        <form className="registration-form modern-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Jenis Pendaftaran</label>
            <select name="jenis_pendaftaran" value={form.jenis_pendaftaran} onChange={handleChange} required>
              <option value="pendaftaran_baru">Pendaftaran Baru</option>
              <option value="siswa_pindahan">Siswa Pindahan</option>
            </select>
          </div>

          <div className="form-group">
            <label>Target Jenjang</label>
            <select name="target_jenjang" value={form.target_jenjang} onChange={handleChange} required>
              <option value="tk">TK</option>
              <option value="sd">SD</option>
              <option value="smp">SMP</option>
            </select>
          </div>

          <div className="form-group">
            <label>Nama Lengkap Calon Siswa</label>
            <input type="text" name="nama_lengkap" value={form.nama_lengkap} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label>Tanggal Lahir</label>
            <input type="date" name="tanggal_lahir" value={form.tanggal_lahir} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label>Email Orang Tua/Wali</label>
            <input type="email" name="email" value={form.email} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label>Jenis Kelamin</label>
            <select name="jenis_kelamin" value={form.jenis_kelamin} onChange={handleChange} required>
              <option value="L">Laki-laki</option>
              <option value="P">Perempuan</option>
            </select>
          </div>

          <div className="form-group full">
            <label>Alamat</label>
            <textarea rows="3" name="alamat" value={form.alamat} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label>Nama Orang Tua/Wali</label>
            <input type="text" name="nama_orang_tua" value={form.nama_orang_tua} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label>No HP Orang Tua</label>
            <input type="tel" name="no_telepon" value={form.no_telepon} onChange={handleChange} required />
          </div>

          <FileInput label="Berkas Fotokopi KK" name="berkas_kk" value={form.berkas_kk} onFile={handleFile} required />
          {needsReport && <FileInput label="Berkas Raport Terakhir" name="berkas_raport" value={form.berkas_raport} onFile={handleFile} required />}
          <FileInput label="Foto Calon Siswa" name="foto_siswa" value={form.foto_siswa} onFile={handleFile} required />
          {needsTransferLetter && <FileInput label="Berkas Surat Pindahan" name="berkas_surat_pindah" value={form.berkas_surat_pindah} onFile={handleFile} required />}

          <div className="form-group full ppdb-note-box">
            <strong>Pemberitahuan hasil</strong>
            <span>Jika data sudah diverifikasi admin, informasi diterima/ditolak akan disampaikan melalui email orang tua/wali atau WhatsApp.</span>
          </div>

          <button className="submit-btn full" type="submit" disabled={loading}>{loading ? "Mengirim..." : "Kirim Pendaftaran"}</button>
        </form>
      </main>

      <Footer />
    </>
  );
}

export default FormPPDB;
