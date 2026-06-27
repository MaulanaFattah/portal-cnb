import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AdminSidebar from "../components/AdminSidebar";
import schoolPhoto from "../assets/school-photo.jpeg";
import {
  createFasilitas,
  deleteFasilitas,
  getFasilitasAdmin,
  logout,
  resolveMediaUrl,
  updateFasilitas
} from "../services/api";

const emptyForm = {
  name: "",
  description: "",
  sortOrder: 0,
  status: "tampil",
  image: ""
};

const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxImageSize = 4 * 1024 * 1024;

/**
 * Halaman Admin Fasilitas.
 *
 * Halaman ini digunakan oleh admin sekolah untuk mengelola data fasilitas
 * yang tampil di halaman Beranda dan menu "Fasilitas Sekolah" pada situs publik.
 * Admin dapat menambah, mengubah, dan menghapus fasilitas, mengatur urutan
 * tampil (sortOrder), status (tampil/sembunyi), serta mengunggah fotonya.
 *
 * Peran/akses: hanya admin (halaman berada di area dashboard admin dan
 * memerlukan sesi login admin yang valid).
 */
function AdminFasilitas() {
  const navigate = useNavigate();
  const [fasilitas, setFasilitas] = useState([]);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [imagePreview, setImagePreview] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  /**
   * Memuat ulang daftar fasilitas dari server (versi admin, termasuk yang
   * berstatus sembunyi).
   *
   * Parameter: tidak ada.
   * Efek: memanggil API getFasilitasAdmin(); mengubah state isLoading,
   * error, dan fasilitas sesuai hasil. Dipakai setelah create/update/delete
   * untuk menyegarkan tampilan.
   */
  const loadFasilitas = async () => {
    setIsLoading(true);
    setError("");

    try {
      const result = await getFasilitasAdmin();
      if (result.success) {
        setFasilitas(result.data || []);
      } else {
        setError(result.message || "Gagal memuat data fasilitas.");
      }
    } catch {
      setError("Gagal terhubung ke server fasilitas.");
    } finally {
      setIsLoading(false);
    }
  };

  // Memuat data fasilitas pertama kali saat komponen dipasang. Memakai flag
  // isActive agar tidak mengubah state bila komponen sudah dilepas (unmount).
  useEffect(() => {
    let isActive = true;

    (async () => {
      try {
        const result = await getFasilitasAdmin();
        if (!isActive) return;

        if (result.success) {
          setFasilitas(result.data || []);
          setError("");
        } else {
          setError(result.message || "Gagal memuat data fasilitas.");
        }
      } catch {
        if (isActive) setError("Gagal terhubung ke server fasilitas.");
      } finally {
        if (isActive) setIsLoading(false);
      }
    })();

    return () => {
      isActive = false;
    };
  }, []);

  // Membersihkan URL object (blob) pratinjau foto saat berubah/unmount agar
  // tidak terjadi kebocoran memori.
  useEffect(() => () => {
    if (imagePreview.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
  }, [imagePreview]);

  /**
   * Menangani perubahan input teks/textarea/select pada form fasilitas.
   *
   * Parameter: event - event perubahan input (memakai name & value).
   * Efek: memperbarui field terkait pada state formData.
   */
  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  /**
   * Menangani pemilihan berkas foto fasilitas dari input file.
   *
   * Parameter: event - event input file (mengambil file pertama).
   * Efek: memvalidasi tipe (JPG/PNG/WebP) dan ukuran (maks 4 MB); bila valid
   * menyimpan file ke formData.image dan membuat URL pratinjau (imagePreview).
   * Bila tidak valid, menampilkan alert dan mengosongkan input.
   */
  const handleImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!allowedImageTypes.has(file.type)) {
      alert("Foto harus berformat JPG, PNG, atau WebP.");
      event.target.value = "";
      return;
    }

    if (file.size > maxImageSize) {
      alert("Ukuran foto maksimal 4 MB.");
      event.target.value = "";
      return;
    }

    if (imagePreview.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    setFormData((current) => ({ ...current, image: file }));
    setImagePreview(URL.createObjectURL(file));
  };

  /**
   * Mengembalikan form ke kondisi kosong (mode tambah).
   *
   * Parameter: tidak ada.
   * Efek: melepas URL blob pratinjau, mereset editId, formData, dan imagePreview.
   */
  const resetForm = () => {
    if (imagePreview.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    setEditId(null);
    setFormData(emptyForm);
    setImagePreview("");
  };

  /**
   * Menyimpan data fasilitas (tambah baru atau perbarui).
   *
   * Parameter: event - event submit form (dicegah reload-nya).
   * Efek: memvalidasi nama, deskripsi, dan foto (wajib saat tambah baru);
   * memanggil API updateFasilitas (bila editId ada) atau createFasilitas;
   * menampilkan alert hasil; bila sukses, mereset form dan memuat ulang data.
   * Mengubah state isSubmitting selama proses.
   */
  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.name.trim() || !formData.description.trim()) {
      alert("Nama dan deskripsi fasilitas wajib diisi.");
      return;
    }

    if (!editId && !formData.image) {
      alert("Foto fasilitas wajib dipilih saat menambah data baru.");
      return;
    }

    setIsSubmitting(true);
    const payload = {
      ...formData,
      sortOrder: Number(formData.sortOrder) || 0
    };

    try {
      const result = editId ? await updateFasilitas(editId, payload) : await createFasilitas(payload);
      alert(result.error ? `${result.message}: ${result.error}` : result.message);

      if (result.success) {
        resetForm();
        await loadFasilitas();
      }
    } catch {
      alert("Gagal menyimpan fasilitas. Periksa koneksi server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Mengisi form dengan data fasilitas terpilih untuk diubah (mode edit).
   *
   * Parameter: item - objek fasilitas yang akan diedit.
   * Efek: melepas URL blob lama, mengeset editId, mengisi formData dari item,
   * dan menampilkan pratinjau foto yang sudah ada.
   */
  const handleEdit = (item) => {
    if (imagePreview.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    setEditId(item.id);
    setFormData({
      name: item.name || "",
      description: item.description || "",
      sortOrder: item.sortOrder ?? 0,
      status: item.status || "tampil",
      image: item.image || ""
    });
    setImagePreview(resolveMediaUrl(item.image, schoolPhoto));
  };

  /**
   * Menghapus sebuah fasilitas setelah konfirmasi pengguna.
   *
   * Parameter: item - objek fasilitas yang akan dihapus.
   * Efek: meminta konfirmasi; bila disetujui memanggil API deleteFasilitas,
   * menampilkan alert hasil, dan memuat ulang data bila sukses.
   */
  const handleDelete = async (item) => {
    if (!confirm(`Yakin ingin menghapus fasilitas "${item.name}"?`)) return;

    const result = await deleteFasilitas(item.id);
    alert(result.message);
    if (result.success) await loadFasilitas();
  };

  /**
   * Keluar dari sesi admin.
   *
   * Parameter: tidak ada.
   * Efek: memanggil logout() (menghapus token sesi) lalu mengarahkan ke
   * halaman login admin.
   */
  const handleLogout = () => {
    logout();
    navigate("/admin-login");
  };

  return (
    <div className="dashboard-layout">
      <AdminSidebar active="/admin/fasilitas" />

      <main className="dashboard-content">
        <div className="dashboard-header">
          <div>
            <h1>Fasilitas Sekolah</h1>
            <p>Kelola fasilitas yang tampil di halaman Beranda dan menu Fasilitas Sekolah.</p>
          </div>

          <div className="dashboard-actions">
            <Link to="/fasilitas" className="btn secondary">Lihat Halaman</Link>
            <button onClick={handleLogout} className="btn primary">Keluar</button>
          </div>
        </div>

        <section className="admin-kegiatan-card facility-admin-card">
          <div className="kegiatan-form-area facility-form-area">
            <span className="section-kicker">Data Fasilitas</span>
            <h2>{editId ? "Ubah Fasilitas" : "Tambah Fasilitas"}</h2>
            <p className="form-helper-text">Isi nama, deskripsi singkat, foto, status tampil, dan urutan fasilitas.</p>

            <form onSubmit={handleSubmit} className="facility-admin-form">
              <div className="form-group">
                <label>Nama Fasilitas</label>
                <input
                  type="text"
                  name="name"
                  placeholder="Contoh: Ruang Kelas Nyaman"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Deskripsi Singkat</label>
                <textarea
                  name="description"
                  placeholder="Jelaskan fasilitas secara singkat"
                  value={formData.description}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="facility-form-inline">
                <div className="form-group">
                  <label>Urutan</label>
                  <input
                    type="number"
                    name="sortOrder"
                    min="0"
                    value={formData.sortOrder}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <select name="status" value={formData.status} onChange={handleChange}>
                    <option value="tampil">Tampil</option>
                    <option value="sembunyi">Sembunyi</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Foto Fasilitas</label>
                <label className="upload-box facility-upload-box">
                  {imagePreview || formData.image ? (
                    <img src={imagePreview || resolveMediaUrl(formData.image, schoolPhoto)} alt="Pratinjau fasilitas" />
                  ) : (
                    <div>
                      <strong>Unggah Foto Fasilitas</strong>
                      <span>JPG / PNG / WebP, maksimal 4 MB</span>
                    </div>
                  )}
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImage} required={!editId} />
                </label>
              </div>

              <div className="button-row">
                <button type="submit" className="save-btn" disabled={isSubmitting}>
                  {isSubmitting ? "Menyimpan..." : editId ? "Simpan Perubahan" : "Tambah Fasilitas"}
                </button>
                {editId && <button type="button" onClick={resetForm} className="cancel-btn">Batal</button>}
              </div>
            </form>
          </div>

          <div className="kegiatan-list-area facility-list-area">
            <div className="student-list-title">
              <h2>Daftar Fasilitas</h2>
              <p>Fasilitas berstatus tampil akan muncul di Beranda dan halaman Fasilitas Sekolah.</p>
            </div>

            {error && <p className="auth-error">{error}</p>}

            <div className="facility-admin-grid">
              {isLoading ? (
                <p className="empty-text">Memuat fasilitas...</p>
              ) : fasilitas.length === 0 ? (
                <p className="empty-text">Belum ada fasilitas. Tambahkan fasilitas pertama dari form di samping.</p>
              ) : fasilitas.map((item) => (
                <article className="facility-admin-item" key={item.id}>
                  <img
                    src={resolveMediaUrl(item.image, schoolPhoto)}
                    alt={item.name || "Foto fasilitas"}
                    loading="lazy"
                    onError={(event) => { event.currentTarget.src = schoolPhoto; }}
                  />
                  <div className="facility-admin-info">
                    <div className="facility-admin-title-row">
                      <h3>{item.name}</h3>
                      <span className={`facility-status ${item.status === "tampil" ? "show" : "hide"}`}>
                        {item.status === "tampil" ? "Tampil" : "Sembunyi"}
                      </span>
                    </div>
                    <p>{item.description}</p>
                    <small>Urutan: {item.sortOrder ?? 0}</small>
                  </div>
                  <div className="admin-action facility-admin-actions">
                    <button type="button" onClick={() => handleEdit(item)}>Ubah</button>
                    <button type="button" onClick={() => handleDelete(item)}>Hapus</button>
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

export default AdminFasilitas;
