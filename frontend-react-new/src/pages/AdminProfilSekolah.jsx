import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AdminSidebar from "../components/AdminSidebar";
import { getProfilSekolah, createProfilSekolah, updateProfilSekolah, logout } from "../services/api";

const emptyProfile = {
  nama_sekolah: "",
  visi: "",
  misi: "",
  sejarah: "",
  struktur_sekolah: ""
};

/**
 * Halaman Admin Profil Sekolah.
 *
 * Halaman ini dipakai admin untuk mengelola konten profil sekolah (nama
 * sekolah, visi, misi, sejarah, dan struktur sekolah) yang tampil di halaman
 * publik. Bila profil sudah ada akan masuk mode ubah, jika belum maka mode buat.
 *
 * Peran/akses: hanya admin (area dashboard admin, butuh sesi login admin).
 */
function AdminProfilSekolah() {
  const navigate = useNavigate();
  const [isEdit, setIsEdit] = useState(false);
  const [formData, setFormData] = useState(emptyProfile);

  /**
   * Memuat data profil sekolah dari server.
   * Efek: memanggil API getProfilSekolah(); bila ada data, mengisi formData
   * dan mengaktifkan mode ubah (isEdit = true).
   */
  const loadProfil = async () => {
    const result = await getProfilSekolah();
    if (result.success && result.data) {
      setFormData({
        nama_sekolah: result.data.nama_sekolah || "",
        visi: result.data.visi || "",
        misi: result.data.misi || "",
        sejarah: result.data.sejarah || "",
        struktur_sekolah: result.data.struktur_sekolah || ""
      });
      setIsEdit(true);
    }
  };

  // Memuat profil sekolah sekali saat komponen dipasang.
  useEffect(() => { (async () => { await loadProfil(); })(); }, []);

  /**
   * Menangani perubahan input pada form profil sekolah.
   * Parameter: e - event input (memakai name & value).
   * Efek: memperbarui field terkait pada formData.
   */
  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  /**
   * Menyimpan profil sekolah (buat baru atau perbarui).
   * Parameter: e - event submit form (dicegah reload-nya).
   * Efek: memanggil API updateProfilSekolah (bila isEdit) atau
   * createProfilSekolah; alert; bila sukses memuat ulang profil.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = isEdit ? await updateProfilSekolah(formData) : await createProfilSekolah(formData);
    alert(result.message);
    if (result.success) loadProfil();
  };

  /**
   * Keluar dari sesi admin.
   * Efek: memanggil logout() lalu mengarahkan ke halaman login admin.
   */
  const handleLogout = () => { logout(); navigate("/admin-login"); };

  return (
    <div className="dashboard-layout">
      <AdminSidebar active="/admin/profil-sekolah" />
      <main className="dashboard-content">
        <div className="dashboard-header">
          <div>
            <h1>Profil Sekolah</h1>
            <p>Kelola profil sekolah yang tampil di halaman publik.</p>
          </div>
          <div className="dashboard-actions">
            <Link to="/profil" className="btn secondary">Lihat Profil</Link>
            <button onClick={handleLogout} className="btn primary">Keluar</button>
          </div>
        </div>

        <section className="admin-kegiatan-card profile-editor-card">
          <div className="kegiatan-form-area profile-editor-area">
            <h2>{isEdit ? "Ubah Profil Sekolah" : "Buat Profil Sekolah"}</h2>
            <form className="profile-editor-grid" onSubmit={handleSubmit}>
              <div className="form-group"><label>Nama Sekolah</label><input type="text" name="nama_sekolah" value={formData.nama_sekolah} onChange={handleChange} required /></div>
              <div className="form-group"><label>Visi</label><textarea name="visi" value={formData.visi} onChange={handleChange} rows="3" /></div>
              <div className="form-group"><label>Misi</label><textarea name="misi" value={formData.misi} onChange={handleChange} rows="5" /></div>
              <div className="form-group"><label>Sejarah</label><textarea name="sejarah" value={formData.sejarah} onChange={handleChange} rows="5" /></div>
              <div className="form-group"><label>Struktur Sekolah</label><textarea name="struktur_sekolah" value={formData.struktur_sekolah} onChange={handleChange} rows="4" /></div>
              <div className="button-row full"><button type="submit" className="save-btn">Simpan</button></div>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}

export default AdminProfilSekolah;
