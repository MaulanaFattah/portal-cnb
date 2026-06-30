import { useMemo, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { resubmitPPDBBerkas } from "../services/api";

/**
 * Label ramah untuk tiap key berkas pendaftaran PPDB.
 */
const DOCUMENT_LABEL = {
  berkas_akta: "Akta Kelahiran",
  berkas_kk: "Kartu Keluarga",
  berkas_ktp_ortu: "KTP Orang Tua/Wali",
  foto_siswa: "Pas Foto Calon Siswa",
  berkas_raport: "Raport Terakhir",
  berkas_surat_pindah: "Surat Pindahan"
};

const ALL_DOCUMENT_KEYS = Object.keys(DOCUMENT_LABEL);

/**
 * Katalog field DATA (biodata) yang dapat diperbaiki, beserta tipe input.
 */
const DATA_FIELDS = {
  nama_lengkap: { label: "Nama Lengkap", type: "text" },
  nisn: { label: "NISN", type: "numeric" },
  nik: { label: "NIK", type: "numeric" },
  no_kk: { label: "No. Kartu Keluarga", type: "numeric" },
  tempat_lahir: { label: "Tempat Lahir", type: "text" },
  tanggal_lahir: { label: "Tanggal Lahir", type: "date" },
  jenis_kelamin: { label: "Jenis Kelamin", type: "select" },
  agama: { label: "Agama", type: "text" },
  alamat: { label: "Alamat", type: "textarea" },
  nama_orang_tua: { label: "Nama Orang Tua/Wali", type: "text" },
  no_telepon: { label: "No. HP Orang Tua", type: "text" },
  nama_ayah: { label: "Nama Ayah", type: "text" },
  nama_ibu: { label: "Nama Ibu", type: "text" }
};

const ALL_DATA_KEYS = Object.keys(DATA_FIELDS);

/**
 * Membaca berkas (File) menjadi data URL (base64) secara asinkron.
 * @param {File} file Berkas yang akan dibaca.
 * @returns {Promise<string>} Promise berisi data URL hasil pembacaan.
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
 * Input berkas dengan tampilan "chip" (mengikuti gaya FormPPDB).
 */
function FileInput({ label, name, value, fileName, onFile, onClear }) {
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
          <input type="file" accept="image/jpeg,image/png,image/webp,.pdf" onChange={(e) => onFile(name, e.target.files?.[0])} />
        </label>
      )}
      <small className="file-chip-hint">Format: JPG, PNG, atau PDF. Maksimal 5MB.</small>
    </div>
  );
}

/**
 * Halaman Perbaiki Berkas/Data PPDB - halaman publik.
 * Akses: umum (tanpa login), dibuka dari kartu "Cek Status Pendaftaran" pada
 * halaman PPDB ketika status pendaftar adalah "revisi_berkas".
 *
 * Fungsi: menampilkan field berkas DAN/ATAU data biodata yang diminta admin
 * untuk diperbaiki, lalu mengirim ulang ke server. Bila dibuka tanpa data
 * identitas (state), pengguna diarahkan kembali ke halaman PPDB.
 */
function PerbaikiBerkasPPDB() {
  const location = useLocation();
  const info = location.state || null;

  const [files, setFiles] = useState({});
  const [fileNames, setFileNames] = useState({});
  const [data, setData] = useState(() => info?.data_values || {});
  const [status, setStatus] = useState({ type: "", message: "" });
  const [loading, setLoading] = useState(false);

  // Daftar berkas yang ditampilkan: yang diminta admin; bila tidak ada permintaan
  // data maupun berkas, tampilkan semua berkas sebagai fallback.
  const documentKeys = useMemo(() => {
    const requestedDocs = Array.isArray(info?.berkas_revisi) ? info.berkas_revisi.filter((k) => ALL_DOCUMENT_KEYS.includes(k)) : [];
    const requestedData = Array.isArray(info?.data_revisi) ? info.data_revisi.filter((k) => ALL_DATA_KEYS.includes(k)) : [];
    if (requestedDocs.length === 0 && requestedData.length === 0) return ALL_DOCUMENT_KEYS;
    return requestedDocs;
  }, [info]);

  // Daftar field data yang diminta diperbaiki.
  const dataKeys = useMemo(
    () => (Array.isArray(info?.data_revisi) ? info.data_revisi.filter((k) => ALL_DATA_KEYS.includes(k)) : []),
    [info]
  );

  /**
   * Memvalidasi & membaca berkas terpilih menjadi data URL.
   */
  const handleFile = async (name, file) => {
    if (!file) return;
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      alert("Format berkas harus JPG, PNG, atau PDF");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Ukuran file maksimal 5MB");
      return;
    }
    const value = await readFileAsDataUrl(file);
    setFiles((current) => ({ ...current, [name]: value }));
    setFileNames((current) => ({ ...current, [name]: file.name }));
  };

  /**
   * Menghapus berkas yang sudah dipilih pada field tertentu.
   */
  const handleClearFile = (name) => {
    setFiles((current) => {
      const next = { ...current };
      delete next[name];
      return next;
    });
    setFileNames((current) => {
      const next = { ...current };
      delete next[name];
      return next;
    });
  };

  /**
   * Menangani perubahan input data biodata.
   */
  const handleDataChange = (key, value) => {
    setData((current) => ({ ...current, [key]: value }));
  };

  /**
   * Merender satu input data sesuai tipe field.
   */
  const renderDataField = (key) => {
    const field = DATA_FIELDS[key];
    if (!field) return null;
    const value = data[key] ?? "";
    return (
      <div className={`form-group${field.type === "textarea" ? " full" : ""}`} key={key}>
        <label>{field.label}</label>
        {field.type === "textarea" ? (
          <textarea rows="3" value={value} onChange={(e) => handleDataChange(key, e.target.value)} />
        ) : field.type === "select" ? (
          <select value={value} onChange={(e) => handleDataChange(key, e.target.value)}>
            <option value="">Pilih</option>
            <option value="L">Laki-laki</option>
            <option value="P">Perempuan</option>
          </select>
        ) : (
          <input
            type={field.type === "date" ? "date" : "text"}
            inputMode={field.type === "numeric" ? "numeric" : undefined}
            value={value}
            onChange={(e) => handleDataChange(key, e.target.value)}
          />
        )}
      </div>
    );
  };

  /**
   * Mengirim berkas/data baru ke server (resubmit).
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Hanya kirim field data yang diminta dan terisi.
    const dataPayload = {};
    dataKeys.forEach((key) => {
      const value = String(data[key] ?? "").trim();
      if (value !== "") dataPayload[key] = value;
    });

    if (Object.keys(files).length === 0 && Object.keys(dataPayload).length === 0) {
      setStatus({ type: "error", message: "Lengkapi minimal satu berkas atau data yang perlu diperbaiki." });
      return;
    }

    setLoading(true);
    setStatus({ type: "", message: "" });
    try {
      const result = await resubmitPPDBBerkas({
        email: info.email,
        nama_lengkap: info.nama_lengkap,
        berkas: files,
        data: dataPayload
      });
      if (result.success) {
        setStatus({ type: "success", message: result.message || "Perbaikan berhasil dikirim." });
        setFiles({});
        setFileNames({});
      } else {
        setStatus({ type: "error", message: result.message || "Gagal mengirim perbaikan." });
      }
    } catch {
      setStatus({ type: "error", message: "Tidak dapat terhubung ke server." });
    } finally {
      setLoading(false);
    }
  };

  if (!info || !info.email || !info.nama_lengkap) {
    return (
      <>
        <Navbar />
        <main className="container">
          <section className="page-hero">
            <h1>Perbaiki Data PPDB</h1>
            <p>Silakan buka halaman ini melalui menu "Cek Status Pendaftaran" pada halaman PPDB.</p>
            <Link to="/ppdb" className="btn primary">Ke Halaman PPDB</Link>
          </section>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="container">
        <section className="page-hero ppdb-form-hero">
          <span className="badge">Perbaikan PPDB</span>
          <h1>Perbaiki Berkas & Data</h1>
          <p>Atas nama <strong>{info.nama_lengkap}</strong>. Perbaiki bagian yang diminta admin, lalu kirim untuk diverifikasi kembali.</p>
        </section>

        {status.message && status.type === "success" && (
          <div className="form-alert success">{status.message}</div>
        )}

        <form className="registration-form modern-form" onSubmit={handleSubmit}>
          {dataKeys.length > 0 && (
            <>
              <div className="form-section-title full">
                <h2>Data yang Perlu Diperbaiki</h2>
              </div>
              {dataKeys.map((key) => renderDataField(key))}
            </>
          )}

          {documentKeys.length > 0 && (
            <>
              <div className="form-section-title full">
                <h2>Berkas yang Perlu Diperbaiki</h2>
              </div>
              {documentKeys.map((key) => (
                <FileInput
                  key={key}
                  label={DOCUMENT_LABEL[key] || key}
                  name={key}
                  value={files[key]}
                  fileName={fileNames[key]}
                  onFile={handleFile}
                  onClear={handleClearFile}
                />
              ))}
            </>
          )}

          <div className="form-group full ppdb-note-box">
            <strong>Catatan</strong>
            <span>Setelah dikirim, status pendaftaran akan kembali menjadi "Menunggu Verifikasi" agar admin dapat memeriksa perbaikan Anda.</span>
          </div>

          <button className="submit-btn full" type="submit" disabled={loading}>{loading ? "Mengirim..." : "Kirim Perbaikan"}</button>

          {status.message && status.type === "error" && (
            <div className="form-alert error full" role="alert">{status.message}</div>
          )}
        </form>
      </main>
      <Footer />
    </>
  );
}

export default PerbaikiBerkasPPDB;
