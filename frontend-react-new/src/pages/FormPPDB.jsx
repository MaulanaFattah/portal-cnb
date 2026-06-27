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

/**
 * Membaca berkas (File) dan mengubahnya menjadi data URL (base64) secara asinkron.
 * @param {File} file Berkas yang akan dibaca.
 * @returns {Promise<string>} Promise berisi data URL hasil pembacaan; reject bila error.
 * Efek: tidak mengubah state (utilitas murni berbasis FileReader).
 */
function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Komponen input berkas dengan tampilan "chip": menampilkan tombol pilih berkas atau
 * nama berkas terpilih beserta tombol hapus.
 * @param {object} props
 * @param {string} props.label Label field.
 * @param {string} props.name Nama field (dipakai sebagai kunci pada form).
 * @param {string} props.value Nilai berkas saat ini (data URL); kosong jika belum dipilih.
 * @param {string} props.fileName Nama berkas terpilih untuk ditampilkan.
 * @param {(name:string, file:File)=>void} props.onFile Callback saat berkas dipilih.
 * @param {(name:string)=>void} props.onClear Callback saat berkas dihapus.
 * @param {boolean} props.required Menandai field wajib diisi.
 * @returns {JSX.Element} Elemen input berkas.
 */
function FileInput({ label, name, value, fileName, onFile, onClear, required }) {
  return (
    <div className="form-group">
      <label>{label}</label>
      {value ? (
        <div className="file-chip filled file-chip-selected">
          <span className="file-chip-name" title={fileName || "Berkas dipilih"}>{fileName || "Berkas dipilih"}</span>
          <button type="button" className="file-chip-remove" aria-label="Hapus berkas" onClick={() => onClear(name)}>&times;</button>
        </div>
      ) : (
        <label className="file-chip">
          <span>Pilih berkas</span>
          <input type="file" accept="image/*,.pdf" onChange={(e) => onFile(name, e.target.files?.[0])} required={required} />
        </label>
      )}
      <small className="file-chip-hint">Format yang diterima: gambar atau PDF.</small>
    </div>
  );
}

/**
 * Halaman Formulir PPDB - halaman publik.
 * Akses: umum (tidak perlu login).
 * Fungsi halaman: menyediakan formulir pendaftaran peserta didik baru/pindahan, termasuk
 * unggah berkas (KK, raport, foto, surat pindah), lalu mengirim data ke server.
 */
function FormPPDB() {
  const [form, setForm] = useState(initialForm);
  const [fileNames, setFileNames] = useState({});
  const [status, setStatus] = useState({ type: "", message: "" });
  const [loading, setLoading] = useState(false);

  // Apakah jenjang membutuhkan berkas raport (SD/SMP).
  const needsReport = useMemo(() => ["sd", "smp"].includes(form.target_jenjang), [form.target_jenjang]);
  const needsTransferLetter = form.jenis_pendaftaran === "siswa_pindahan";

  /**
   * Menangani perubahan input teks/select pada form.
   * @param {Event} e Event perubahan input (membawa name & value).
   * Efek state: memperbarui field terkait pada form.
   */
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  /**
   * Menangani pemilihan berkas: membaca berkas menjadi data URL lalu menyimpannya.
   * @param {string} name Nama field berkas.
   * @param {File} file Berkas yang dipilih.
   * Memanggil: readFileAsDataUrl(file).
   * Efek state: menyimpan data URL ke form[name] dan nama berkas ke fileNames[name].
   */
  const handleFile = async (name, file) => {
    if (!file) return;
    const value = await readFileAsDataUrl(file);
    setForm((current) => ({ ...current, [name]: value }));
    setFileNames((current) => ({ ...current, [name]: file.name }));
  };

  /**
   * Menghapus berkas yang sebelumnya dipilih pada field tertentu.
   * @param {string} name Nama field berkas.
   * Efek state: mengosongkan form[name] dan menghapus entri fileNames[name].
   */
  const handleClearFile = (name) => {
    setForm((current) => ({ ...current, [name]: "" }));
    setFileNames((current) => {
      const next = { ...current };
      delete next[name];
      return next;
    });
  };

  /**
   * Mengirim data pendaftaran PPDB ke server.
   * @param {Event} e Event submit form (dicegah default-nya).
   * Memanggil API: createPPDB(payload) (payload menambahkan nama_ayah/nama_ibu/agama/tempat_lahir).
   * Efek state: setLoading, setStatus (sukses/gagal); bila sukses mereset form ke initialForm.
   */
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
          message: "Pendaftaran berhasil dikirim. Pemberitahuan hasil PPDB akan diumumkan di halaman Pengumuman sekolah setelah diverifikasi admin."
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

          <FileInput label="Berkas Fotokopi KK" name="berkas_kk" value={form.berkas_kk} fileName={fileNames.berkas_kk} onFile={handleFile} onClear={handleClearFile} required />
          {needsReport && <FileInput label="Berkas Raport Terakhir" name="berkas_raport" value={form.berkas_raport} fileName={fileNames.berkas_raport} onFile={handleFile} onClear={handleClearFile} required />}
          <FileInput label="Foto Calon Siswa" name="foto_siswa" value={form.foto_siswa} fileName={fileNames.foto_siswa} onFile={handleFile} onClear={handleClearFile} required />
          {needsTransferLetter && <FileInput label="Berkas Surat Pindahan" name="berkas_surat_pindah" value={form.berkas_surat_pindah} fileName={fileNames.berkas_surat_pindah} onFile={handleFile} onClear={handleClearFile} required />}

          <div className="form-group full ppdb-note-box">
            <strong>Pemberitahuan hasil</strong>
            <span>Hasil PPDB akan diumumkan di halaman Pengumuman sekolah setelah admin melakukan verifikasi. Jika diterima, nama calon siswa akan tercantum di pengumuman dan diminta datang ke sekolah untuk pendaftaran ulang.</span>
          </div>

          <button className="submit-btn full" type="submit" disabled={loading}>{loading ? "Mengirim..." : "Kirim Pendaftaran"}</button>
        </form>
      </main>

      <Footer />
    </>
  );
}

export default FormPPDB;
