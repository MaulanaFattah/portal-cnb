import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AdminSidebar from "../components/AdminSidebar";
import schoolLogo from "../assets/logo-transparent.png";
import { getGaleri, createGaleri, updateGaleri, deleteGaleri, logout, resolveMediaUrl } from "../services/api";

const emptyForm = { image: "" };
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxImageSize = 4 * 1024 * 1024;

/**
 * Memformat tanggal foto galeri ke format lokal Indonesia.
 *
 * Parameter: value - tanggal (string/Date).
 * Mengembalikan: teks tanggal lokal; "Tanggal belum tersedia" bila kosong
 * atau tidak valid.
 */
function formatGalleryDate(value) {
  if (!value) return "Tanggal belum tersedia";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Tanggal belum tersedia";
  return date.toLocaleDateString("id-ID");
}

/**
 * Halaman Admin Galeri Foto.
 *
 * Halaman ini dipakai admin untuk mengunggah, mengubah, dan menghapus foto
 * galeri sekolah. Foto yang tersimpan akan tampil di slider Beranda dan
 * halaman Galeri publik (galeri hanya berupa foto, tanpa judul/deskripsi).
 *
 * Peran/akses: hanya admin (area dashboard admin, butuh sesi login admin).
 */
function AdminGaleri() {
  const navigate = useNavigate();
  const [galeri, setGaleri] = useState([]);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [imagePreview, setImagePreview] = useState("");

  /**
   * Memuat daftar foto galeri dari server.
   * Efek: memanggil API getGaleri(); mengisi state galeri bila sukses.
   */
  const loadGaleri = async () => {
    const result = await getGaleri();
    if (result.success) setGaleri(result.data || []);
  };

  // Memuat data galeri sekali saat komponen dipasang.
  useEffect(() => { (async () => { await loadGaleri(); })(); }, []);

  // Membersihkan URL blob pratinjau saat berubah/unmount agar tidak bocor memori.
  useEffect(() => () => {
    if (imagePreview.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
  }, [imagePreview]);

  /**
   * Menangani pemilihan berkas foto dari input file.
   * Parameter: e - event input file.
   * Efek: memvalidasi tipe (JPG/PNG/WebP) dan ukuran (maks 4 MB); bila valid
   * menyimpan file ke formData.image dan membuat URL pratinjau.
   */
  const handleImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!allowedImageTypes.has(file.type)) {
      alert("Foto harus berformat JPG, PNG, atau WebP.");
      e.target.value = "";
      return;
    }

    if (file.size > maxImageSize) {
      alert("Ukuran foto maksimal 4 MB.");
      e.target.value = "";
      return;
    }

    setFormData({ image: file });
    setImagePreview(URL.createObjectURL(file));
  };

  /**
   * Mengembalikan form ke kondisi kosong (mode tambah).
   * Efek: mereset editId, formData, dan imagePreview.
   */
  const resetForm = () => {
    setEditId(null);
    setFormData(emptyForm);
    setImagePreview("");
  };

  /**
   * Menyimpan foto galeri (tambah baru atau perbarui).
   * Parameter: e - event submit form (dicegah reload-nya).
   * Efek: validasi foto wajib ada; memanggil API updateGaleri (bila editId)
   * atau createGaleri; menampilkan alert; bila sukses mereset form & memuat ulang.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.image) {
      alert("Foto wajib dipilih terlebih dahulu.");
      return;
    }

    const result = editId ? await updateGaleri(editId, formData) : await createGaleri(formData);
    alert(result.error ? `${result.message}: ${result.error}` : result.message);
    if (result.success) {
      resetForm();
      loadGaleri();
    }
  };

  /**
   * Mengisi form dengan foto terpilih untuk diubah (mode edit).
   * Parameter: item - objek foto galeri.
   * Efek: mengeset editId, mengisi formData.image, dan menampilkan pratinjau.
   */
  const handleEdit = (item) => {
    setEditId(item.id);
    setFormData({ image: item.image || "" });
    setImagePreview(resolveMediaUrl(item.image, schoolLogo));
  };

  /**
   * Menghapus sebuah foto galeri setelah konfirmasi.
   * Parameter: id - id foto galeri.
   * Efek: konfirmasi; memanggil API deleteGaleri; alert; memuat ulang daftar.
   */
  const handleDelete = async (id) => {
    if (!confirm("Yakin ingin menghapus foto galeri ini?")) return;
    const result = await deleteGaleri(id);
    alert(result.message);
    loadGaleri();
  };

  /**
   * Keluar dari sesi admin.
   * Efek: memanggil logout() lalu mengarahkan ke halaman login admin.
   */
  const handleLogout = () => { logout(); navigate("/admin-login"); };

  return (
    <div className="dashboard-layout">
      <AdminSidebar active="/admin/galeri" />
      <main className="dashboard-content">
        <div className="dashboard-header">
          <div>
            <h1>Galeri Foto</h1>
            <p>Upload foto sekolah untuk ditampilkan di slider Beranda dan halaman Galeri.</p>
          </div>
          <div className="dashboard-actions">
            <Link to="/galeri" className="btn secondary">Lihat Galeri</Link>
            <button onClick={handleLogout} className="btn primary">Keluar</button>
          </div>
        </div>

        <section className="admin-kegiatan-card gallery-photo-admin-card">
          <div className="kegiatan-form-area gallery-photo-form">
            <span className="section-kicker">Foto Galeri</span>
            <h2>{editId ? "Ubah Foto" : "Tambah Foto"}</h2>
            <p className="form-helper-text">Pilih satu foto dengan kualitas jelas. Judul dan deskripsi tidak diperlukan karena galeri hanya dipakai untuk posting foto.</p>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Foto</label>
                <label className="upload-box gallery-upload-box">
                  {imagePreview || formData.image ? (
                    <img src={imagePreview || resolveMediaUrl(formData.image, schoolLogo)} alt="Pratinjau foto galeri" />
                  ) : (
                    <div>
                      <strong>Unggah Foto Galeri</strong>
                      <span>JPG / PNG / WebP, disarankan rasio 4:3 atau 16:9</span>
                    </div>
                  )}
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImage} required={!editId} />
                </label>
              </div>

              <div className="button-row">
                <button type="submit" className="save-btn" disabled={!formData.image}>{editId ? "Simpan Foto" : "Upload Foto"}</button>
                {editId && <button type="button" onClick={resetForm} className="cancel-btn">Batal</button>}
              </div>
            </form>
          </div>

          <div className="kegiatan-list-area">
            <div className="student-list-title gallery-list-title">
              <h2>Daftar Foto</h2>
              <p>Urutan terbaru tampil lebih dulu dan otomatis masuk ke slider Beranda.</p>
            </div>

            <div className="gallery-admin-grid">
              {galeri.length === 0 ? <p className="empty-text">Belum ada foto galeri.</p> : galeri.map((item, index) => (
                <article className="gallery-admin-photo-card" key={item.id}>
                  <img src={resolveMediaUrl(item.image, schoolLogo)} alt={item.title || `Foto galeri ${index + 1}`} loading="lazy" onError={(event) => { event.currentTarget.src = schoolLogo; }} />
                  <div className="gallery-admin-photo-meta">
                    <strong>Foto {index + 1}</strong>
                    <span>{formatGalleryDate(item.createdAt || item.updatedAt)}</span>
                  </div>
                  <div className="admin-action gallery-photo-actions">
                    <button type="button" onClick={() => handleEdit(item)}>Ubah</button>
                    <button type="button" onClick={() => handleDelete(item.id)}>Hapus</button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default AdminGaleri;
