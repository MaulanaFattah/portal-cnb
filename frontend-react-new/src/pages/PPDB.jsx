import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { checkPPDBStatus } from "../services/api";

const STATUS_LABEL = { pending: "Menunggu Verifikasi", diterima: "Diterima", ditolak: "Ditolak" };
const LEVEL_LABEL = { tk: "TK", sd: "SD", smp: "SMP" };

function PPDBStatusCheck() {
  const [form, setForm] = useState({ nama_lengkap: "", email: "" });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

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
        </div>
      )}
    </div>
  );
}

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

          <PPDBStatusCheck />
        </section>
      </main>

      <Footer />
    </>
  );
}

export default PPDB;