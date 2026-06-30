import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { checkPPDBStatus } from "../services/api";

const STATUS_LABEL = {
  pending: "Menunggu Verifikasi",
  diterima: "Diterima",
  ditolak: "Ditolak",
  revisi_berkas: "Berkas Perlu Diperbaiki"
};
const LEVEL_LABEL = { tk: "TK", sd: "SD", smp: "SMP" };

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

/**
 * Label ramah untuk tiap key DATA (biodata) pendaftaran PPDB.
 */
const DATA_LABEL = {
  nama_lengkap: "Nama Lengkap",
  nisn: "NISN",
  nik: "NIK",
  no_kk: "No. Kartu Keluarga",
  tempat_lahir: "Tempat Lahir",
  tanggal_lahir: "Tanggal Lahir",
  jenis_kelamin: "Jenis Kelamin",
  agama: "Agama",
  alamat: "Alamat",
  nama_orang_tua: "Nama Orang Tua/Wali",
  no_telepon: "No. HP Orang Tua",
  nama_ayah: "Nama Ayah",
  nama_ibu: "Nama Ibu"
};

/**
 * Komponen kartu "Cek Status Pendaftaran" PPDB (dipakai di dalam halaman PPDB).
 * Akses: umum (tidak perlu login).
 * Fungsi: menerima nama lengkap & email calon siswa, lalu menampilkan hasil verifikasi
 * berkas pendaftaran.
 */
function PPDBStatusCheck() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ nama_lengkap: "", email: "" });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  /**
   * Menangani perubahan input form cek status.
   * @param {Event} event Event perubahan input (membawa name & value).
   * Efek state: memperbarui field terkait pada form.
   */
  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  /**
   * Mengirim permintaan cek status pendaftaran PPDB ke server.
   * @param {Event} event Event submit form (dicegah default-nya).
   * Memanggil API: checkPPDBStatus(form).
   * Efek state: setLoading, setError, dan setResult sesuai respons server.
   */
  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    const response = await checkPPDBStatus(form);
    setLoading(false);

    if (!response.success) {
      setError(response.message || "Gagal mengambil status pendaftaran.");
      return;
    }
    setResult(response.data);
  };

  return (
    <div className="ppdb-card ppdb-status-card">
      <h3>Cek Status Pendaftaran</h3>
      <p>Masukkan nama lengkap dan email calon siswa sesuai formulir untuk melihat hasil verifikasi berkas.</p>

      <form className="ppdb-status-form" onSubmit={handleSubmit}>
        <label className="teacher-field">Nama Lengkap Calon Siswa
          <input name="nama_lengkap" value={form.nama_lengkap} onChange={handleChange} placeholder="Nama sesuai formulir" required />
        </label>
        <label className="teacher-field">Email Pendaftaran
          <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="Email yang diisi saat mendaftar" required />
        </label>
        <button type="submit" className="btn primary" disabled={loading}>
          {loading ? "Memeriksa..." : "Cek Status"}
        </button>
      </form>

      {error && <p className="ppdb-status-error">{error}</p>}

      {result && (
        <div className={`ppdb-status-result status-${result.status}`}>
          <div className="ppdb-status-result-head">
            <strong>{result.nama_lengkap}</strong>
            <span className={`status-badge ${result.status}`}>{STATUS_LABEL[result.status] || result.status}</span>
          </div>
          <p className="ppdb-status-level">Jenjang tujuan: {LEVEL_LABEL[result.target_jenjang] || "-"}</p>
          <p className="ppdb-status-note">{result.catatan}</p>

          {result.status === "revisi_berkas" && (
            <div className="ppdb-status-revisi">
              {Array.isArray(result.berkas_revisi) && result.berkas_revisi.length > 0 && (
                <>
                  <p className="ppdb-status-revisi-title">Berkas yang harus diperbaiki:</p>
                  <ul className="ppdb-status-revisi-list">
                    {result.berkas_revisi.map((key) => (
                      <li key={key}>{DOCUMENT_LABEL[key] || key}</li>
                    ))}
                  </ul>
                </>
              )}
              {Array.isArray(result.data_revisi) && result.data_revisi.length > 0 && (
                <>
                  <p className="ppdb-status-revisi-title">Data yang harus diperbaiki:</p>
                  <ul className="ppdb-status-revisi-list">
                    {result.data_revisi.map((key) => (
                      <li key={key}>{DATA_LABEL[key] || key}</li>
                    ))}
                  </ul>
                </>
              )}
              <button
                type="button"
                className="btn primary"
                onClick={() => navigate("/perbaiki-berkas", {
                  state: {
                    email: result.email || form.email,
                    nama_lengkap: result.nama_lengkap,
                    target_jenjang: result.target_jenjang,
                    jenis_pendaftaran: result.jenis_pendaftaran,
                    berkas_revisi: result.berkas_revisi || [],
                    data_revisi: result.data_revisi || [],
                    data_values: result.data_values || {}
                  }
                })}
              >
                Perbaiki Sekarang
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Halaman PPDB (Penerimaan Peserta Didik Baru) - halaman publik.
 * Akses: umum (tidak perlu login).
 * Fungsi halaman: menampilkan informasi PPDB (persyaratan, jadwal), kartu cek status
 * pendaftaran, dan tautan menuju formulir pendaftaran (/form-ppdb).
 */
function PPDB() {
  return (
    <>
      <Navbar />

      <main>
        <section className="page-hero container">
          <span className="badge">PPDB Online</span>

          <h1>Penerimaan Peserta Didik Baru</h1>

          <p>
            Dapatkan informasi lengkap mengenai pendaftaran peserta didik
            baru Cipta Nusa Bakti secara online.
          </p>
        </section>

        <section className="container">
          <div className="ppdb-top-row">
            <PPDBStatusCheck />
          </div>

          <div className="ppdb-grid">

            <div className="ppdb-card">
              <h3>Persyaratan</h3>

              <ul>
                <li>Fotokopi Kartu Keluarga</li>
                <li>Fotokopi Akta Kelahiran</li>
                <li>Pas Foto 3x4</li>
                <li>Raport terakhir</li>
              </ul>
            </div>

            <div className="ppdb-card">
              <h3>Jadwal Pendaftaran</h3>

              <ul>
                <li>Pendaftaran: 1 Juni 2026</li>
                <li>Seleksi: 15 Juni 2026</li>
                <li>Pengumuman: 25 Juni 2026</li>
                <li>Daftar Ulang: 1 Juli 2026</li>
              </ul>
            </div>

          </div>

          <div className="ppdb-action">
            <Link to="/form-ppdb" className="btn primary">
              Daftar Sekarang
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

export default PPDB;