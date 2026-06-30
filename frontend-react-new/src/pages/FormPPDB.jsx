import { useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { createPPDB } from "../services/api";

const currentYear = new Date().getFullYear();

const initialForm = {
  jenis_pendaftaran: "pendaftaran_baru",
  target_jenjang: "",
  nama_lengkap: "",
  nisn: "",
  tempat_lahir: "",
  tanggal_lahir: "",
  email: "",
  jenis_kelamin: "",
  agama: "",
  alamat: "",
  // ===== Data calon peserta didik (tambahan form mitra) =====
  nik: "",
  no_kk: "",
  anak_ke: "",
  jumlah_saudara_kandung: "",
  jumlah_saudara_tiri: "",
  jumlah_saudara_angkat: "",
  // ===== Kontak orang tua/wali utama =====
  nama_orang_tua: "",
  no_telepon: "",
  // ===== Data orang tua kandung (tambahan form mitra) =====
  nama_ayah: "",
  nama_ibu: "",
  tempat_lahir_ayah: "",
  tanggal_lahir_ayah: "",
  tempat_lahir_ibu: "",
  tanggal_lahir_ibu: "",
  pendidikan_ayah: "",
  pendidikan_ibu: "",
  pekerjaan_ayah: "",
  pekerjaan_ibu: "",
  penghasilan_ayah: "",
  penghasilan_ibu: "",
  // ===== Data wali (tambahan form mitra) =====
  nama_wali: "",
  jenis_kelamin_wali: "",
  tempat_lahir_wali: "",
  tanggal_lahir_wali: "",
  pendidikan_wali: "",
  pekerjaan_wali: "",
  alamat_wali: "",
  tahun_ajaran: `${currentYear}/${currentYear + 1}`,
  // ===== Berkas upload =====
  berkas_kk: "",
  berkas_akta: "",
  berkas_ktp_ortu: "",
  berkas_raport: "",
  foto_siswa: "",
  berkas_surat_pindah: ""
};

const levelLabel = { tk: "TK", sd: "SD", smp: "SMP" };
const typeLabel = { pendaftaran_baru: "Pendaftaran Baru", siswa_pindahan: "Siswa Pindahan" };

/**
 * Usia minimal calon siswa per jenjang (dalam tahun) sesuai ketentuan PPDB.
 */
const MIN_AGE_BY_JENJANG = { tk: 5, sd: 6, smp: 12 };

/**
 * Mengambil tahun awal dari string tahun ajaran (mis. "2025/2026" -> 2025).
 * @param {string} tahunAjaran Tahun ajaran.
 * @returns {number} Tahun awal; fallback ke tahun berjalan bila tidak valid.
 */
function academicStartYear(tahunAjaran) {
  const startYear = parseInt(String(tahunAjaran || "").split("/")[0], 10);
  return Number.isFinite(startYear) ? startYear : currentYear;
}

/**
 * Menghitung tanggal lahir maksimal (paling muda) yang masih memenuhi usia minimal
 * jenjang pada acuan 1 Juli tahun awal tahun ajaran.
 * @param {string} jenjang "tk" | "sd" | "smp".
 * @param {string} tahunAjaran Tahun ajaran (mis. "2025/2026").
 * @returns {string} Tanggal format YYYY-MM-DD, atau "" bila jenjang belum dipilih.
 */
function maxBirthDateForJenjang(jenjang, tahunAjaran) {
  const minAge = MIN_AGE_BY_JENJANG[jenjang];
  if (minAge === undefined) return "";
  const year = academicStartYear(tahunAjaran) - minAge;
  return `${year}-07-01`;
}

/**
 * Menghitung usia (tahun penuh) pada 1 Juli tahun awal tahun ajaran.
 * @param {string} birthDate Tanggal lahir (YYYY-MM-DD).
 * @param {string} tahunAjaran Tahun ajaran.
 * @returns {number} Usia tahun penuh; NaN bila tanggal lahir tidak valid.
 */
function ageAtAcademicYear(birthDate, tahunAjaran) {
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return NaN;
  const ref = new Date(academicStartYear(tahunAjaran), 6, 1);
  let age = ref.getFullYear() - birth.getFullYear();
  const monthDiff = ref.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && ref.getDate() < birth.getDate())) age -= 1;
  return age;
}

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
 * @param {boolean} props.imageOnly Bila true, hanya menerima JPG/PNG (maks 2MB) dan memvalidasi berkas.
 * @returns {JSX.Element} Elemen input berkas.
 */
function FileInput({ label, name, value, fileName, onFile, onClear, required, imageOnly }) {
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
          <input
            type="file"
            accept={imageOnly ? "image/jpeg,image/png" : "image/*,.pdf"}
            onChange={(e) => onFile(name, e.target.files?.[0], imageOnly)}
            required={required}
          />
        </label>
      )}
      <small className="file-chip-hint">{imageOnly ? "Format: JPG atau PNG, maksimal 2MB." : "Format yang diterima: gambar atau PDF."}</small>
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
  // Batas tanggal lahir maksimal sesuai usia minimal jenjang yang dipilih.
  const maxBirthDate = useMemo(
    () => maxBirthDateForJenjang(form.target_jenjang, form.tahun_ajaran),
    [form.target_jenjang, form.tahun_ajaran]
  );

  /**
   * Menangani perubahan input teks/select pada form.
   * @param {Event} e Event perubahan input (membawa name & value).
   * Efek state: memperbarui field terkait pada form.
   */
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  /**
   * Menangani pemilihan berkas: memvalidasi (opsional) lalu membaca berkas menjadi data URL.
   * @param {string} name Nama field berkas.
   * @param {File} file Berkas yang dipilih.
   * @param {boolean} imageOnly Bila true, hanya menerima JPG/PNG dengan ukuran maksimal 2MB.
   * Memanggil: readFileAsDataUrl(file).
   * Efek state: menyimpan data URL ke form[name] dan nama berkas ke fileNames[name].
   *   Bila validasi gagal, menampilkan alert dan tidak mengubah state.
   */
  const handleFile = async (name, file, imageOnly = false) => {
    if (!file) return;
    if (imageOnly) {
      const allowedTypes = ["image/jpeg", "image/png"];
      if (!allowedTypes.includes(file.type)) {
        alert("Format berkas harus JPG atau PNG");
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        alert("Ukuran file maksimal 2MB");
        return;
      }
    }
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
   * Memanggil API: createPPDB(payload). Sebelum dikirim, field NIK/No KK/NISN
   *   divalidasi harus berupa angka bila diisi.
   * Efek state: setLoading, setStatus (sukses/gagal); bila sukses mereset form ke initialForm.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validasi: NIK, No KK, NISN bila diisi harus berupa angka.
    const numericChecks = [
      { value: form.nik, label: "NIK" },
      { value: form.no_kk, label: "No KK" },
      { value: form.nisn, label: "NISN" }
    ];
    for (const { value, label } of numericChecks) {
      if (value && !/^\d+$/.test(String(value).trim())) {
        alert(`${label} harus berupa angka`);
        return;
      }
    }

    // Validasi usia minimal sesuai jenjang (TK >=5, SD >=6, SMP >=12).
    const minAge = MIN_AGE_BY_JENJANG[form.target_jenjang];
    if (minAge !== undefined && form.tanggal_lahir) {
      const age = ageAtAcademicYear(form.tanggal_lahir, form.tahun_ajaran);
      if (Number.isNaN(age) || age < minAge) {
        setStatus({
          type: "error",
          message: "Usia calon siswa belum memenuhi syarat minimal untuk jenjang yang dipilih."
        });
        return;
      }
    }

    setLoading(true);
    setStatus({ type: "", message: "" });

    try {
      const payload = {
        ...form,
        // Selaraskan nama_ayah/nama_ibu dengan kontak utama bila belum diisi.
        nama_ayah: form.nama_ayah || form.nama_orang_tua,
        nama_ibu: form.nama_ibu || form.nama_orang_tua,
        agama: form.agama || "-",
        tempat_lahir: form.tempat_lahir || "-",
        // TK tidak memakai NISN.
        nisn: form.target_jenjang === "tk" ? "" : form.nisn
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
          <h1>Form Pendaftaran {levelLabel[form.target_jenjang] || "PPDB"}</h1>
          <p>{typeLabel[form.jenis_pendaftaran]} — lengkapi data calon siswa dan unggah berkas yang diminta.</p>
        </section>

        {status.message && status.type === "success" && <div className={`form-alert ${status.type}`}>{status.message}</div>}

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
              <option value="">Pilih jenjang</option>
              <option value="tk">TK</option>
              <option value="sd">SD</option>
              <option value="smp">SMP</option>
            </select>
          </div>

          <div className="form-section-title full">
            <h2>Data Calon Peserta Didik</h2>
          </div>

          <div className="form-group">
            <label>Nama Lengkap Calon Siswa</label>
            <input type="text" name="nama_lengkap" value={form.nama_lengkap} onChange={handleChange} required />
          </div>

          {form.target_jenjang !== "tk" && (
            <div className="form-group">
              <label>NISN</label>
              <input type="text" inputMode="numeric" name="nisn" value={form.nisn} onChange={handleChange} />
            </div>
          )}

          <div className="form-group">
            <label>NIK</label>
            <input type="text" inputMode="numeric" name="nik" value={form.nik} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>No KK</label>
            <input type="text" inputMode="numeric" name="no_kk" value={form.no_kk} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>Tempat Lahir</label>
            <input type="text" name="tempat_lahir" value={form.tempat_lahir} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label>Tanggal Lahir</label>
            <input type="date" name="tanggal_lahir" value={form.tanggal_lahir} onChange={handleChange} max={maxBirthDate || undefined} required />
            {form.target_jenjang && (
              <small className="file-chip-hint">Usia minimal jenjang {levelLabel[form.target_jenjang]} adalah {MIN_AGE_BY_JENJANG[form.target_jenjang]} tahun (per Juli {academicStartYear(form.tahun_ajaran)}).</small>
            )}
          </div>

          <div className="form-group">
            <label>Jenis Kelamin</label>
            <select name="jenis_kelamin" value={form.jenis_kelamin} onChange={handleChange} required>
              <option value="">Pilih</option>
              <option value="L">Laki-laki</option>
              <option value="P">Perempuan</option>
            </select>
          </div>

          <div className="form-group">
            <label>Agama</label>
            <input type="text" name="agama" value={form.agama} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>Anak Ke-</label>
            <input type="number" min="0" name="anak_ke" value={form.anak_ke} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>Jumlah Saudara Kandung</label>
            <input type="number" min="0" name="jumlah_saudara_kandung" value={form.jumlah_saudara_kandung} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>Jumlah Saudara Tiri</label>
            <input type="number" min="0" name="jumlah_saudara_tiri" value={form.jumlah_saudara_tiri} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>Jumlah Saudara Angkat</label>
            <input type="number" min="0" name="jumlah_saudara_angkat" value={form.jumlah_saudara_angkat} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>Email Orang Tua/Wali</label>
            <input type="email" name="email" value={form.email} onChange={handleChange} required />
          </div>

          <div className="form-group full">
            <label>Alamat (sesuai Kartu Keluarga)</label>
            <textarea rows="3" name="alamat" value={form.alamat} onChange={handleChange} placeholder="Tulis alamat sesuai yang tertera pada Kartu Keluarga (KK)" required />
          </div>

          <div className="form-group">
            <label>Nama Orang Tua/Wali</label>
            <input type="text" name="nama_orang_tua" value={form.nama_orang_tua} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label>No HP Orang Tua</label>
            <input type="tel" name="no_telepon" value={form.no_telepon} onChange={handleChange} required />
          </div>

          <div className="form-section-title full">
            <h2>Data Orang Tua Kandung</h2>
          </div>

          <div className="form-group">
            <label>Nama Ayah</label>
            <input type="text" name="nama_ayah" value={form.nama_ayah} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>Nama Ibu</label>
            <input type="text" name="nama_ibu" value={form.nama_ibu} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>Tempat Lahir Ayah</label>
            <input type="text" name="tempat_lahir_ayah" value={form.tempat_lahir_ayah} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>Tempat Lahir Ibu</label>
            <input type="text" name="tempat_lahir_ibu" value={form.tempat_lahir_ibu} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>Tanggal Lahir Ayah</label>
            <input type="date" name="tanggal_lahir_ayah" value={form.tanggal_lahir_ayah} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>Tanggal Lahir Ibu</label>
            <input type="date" name="tanggal_lahir_ibu" value={form.tanggal_lahir_ibu} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>Pendidikan Ayah</label>
            <input type="text" name="pendidikan_ayah" value={form.pendidikan_ayah} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>Pendidikan Ibu</label>
            <input type="text" name="pendidikan_ibu" value={form.pendidikan_ibu} onChange={handleChange} />
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
            <label>Penghasilan Ayah</label>
            <input type="text" name="penghasilan_ayah" value={form.penghasilan_ayah} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>Penghasilan Ibu</label>
            <input type="text" name="penghasilan_ibu" value={form.penghasilan_ibu} onChange={handleChange} />
          </div>

          <div className="form-section-title full">
            <h2>Data Wali</h2>
          </div>

          <div className="form-group">
            <label>Nama Wali</label>
            <input type="text" name="nama_wali" value={form.nama_wali} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>Jenis Kelamin Wali</label>
            <select name="jenis_kelamin_wali" value={form.jenis_kelamin_wali} onChange={handleChange}>
              <option value="">Pilih</option>
              <option value="L">Laki-laki</option>
              <option value="P">Perempuan</option>
            </select>
          </div>

          <div className="form-group">
            <label>Tempat Lahir Wali</label>
            <input type="text" name="tempat_lahir_wali" value={form.tempat_lahir_wali} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>Tanggal Lahir Wali</label>
            <input type="date" name="tanggal_lahir_wali" value={form.tanggal_lahir_wali} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>Pendidikan Wali</label>
            <input type="text" name="pendidikan_wali" value={form.pendidikan_wali} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>Pekerjaan Wali</label>
            <input type="text" name="pekerjaan_wali" value={form.pekerjaan_wali} onChange={handleChange} />
          </div>

          <div className="form-group full">
            <label>Alamat Wali</label>
            <textarea rows="3" name="alamat_wali" value={form.alamat_wali} onChange={handleChange} />
          </div>

          <div className="form-section-title full">
            <h2>Upload Berkas</h2>
          </div>

          <FileInput label="Akta Kelahiran" name="berkas_akta" value={form.berkas_akta} fileName={fileNames.berkas_akta} onFile={handleFile} onClear={handleClearFile} imageOnly required />
          <FileInput label="Kartu Keluarga" name="berkas_kk" value={form.berkas_kk} fileName={fileNames.berkas_kk} onFile={handleFile} onClear={handleClearFile} imageOnly required />
          <FileInput label="KTP Orang Tua" name="berkas_ktp_ortu" value={form.berkas_ktp_ortu} fileName={fileNames.berkas_ktp_ortu} onFile={handleFile} onClear={handleClearFile} imageOnly required />
          <FileInput label="Pas Foto" name="foto_siswa" value={form.foto_siswa} fileName={fileNames.foto_siswa} onFile={handleFile} onClear={handleClearFile} imageOnly required />
          {needsReport && <FileInput label="Berkas Raport Terakhir (opsional)" name="berkas_raport" value={form.berkas_raport} fileName={fileNames.berkas_raport} onFile={handleFile} onClear={handleClearFile} />}
          {needsTransferLetter && <FileInput label="Berkas Surat Pindahan" name="berkas_surat_pindah" value={form.berkas_surat_pindah} fileName={fileNames.berkas_surat_pindah} onFile={handleFile} onClear={handleClearFile} required />}

          <div className="form-group full ppdb-note-box">
            <strong>Pemberitahuan hasil</strong>
            <span>Hasil PPDB akan diumumkan di halaman Pengumuman sekolah setelah admin melakukan verifikasi. Jika diterima, nama calon siswa akan tercantum di pengumuman dan diminta datang ke sekolah untuk pendaftaran ulang.</span>
          </div>

          <button className="submit-btn full" type="submit" disabled={loading}>{loading ? "Mengirim..." : "Kirim Pendaftaran"}</button>

          {status.message && status.type === "error" && (
            <div className="form-alert error full" role="alert">{status.message}</div>
          )}
        </form>
      </main>

      <Footer />
    </>
  );
}

export default FormPPDB;
