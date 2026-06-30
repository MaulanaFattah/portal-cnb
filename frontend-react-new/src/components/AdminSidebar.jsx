import { Link } from "react-router-dom";

/**
 * Daftar item menu sidebar administrator.
 * Setiap entri berupa pasangan [path tujuan, label yang ditampilkan].
 * Urutan array menentukan urutan tampil menu pada sidebar.
 */
const menu = [
  ["/dashboard-admin", "Dasbor"],
  ["/admin/profil-sekolah", "Profil Sekolah"],
  ["/admin/kegiatan", "Kegiatan"],
  ["/admin/pengumuman", "Pengumuman"],
  ["/admin/galeri", "Galeri"],
  ["/admin/fasilitas", "Fasilitas"],
  ["/admin/ppdb", "PPDB"],
  ["/admin/guru", "Guru"],
  ["/admin/verifikasi-guru", "Verifikasi Guru"],
  ["/admin/kepala-sekolah", "Kepala Sekolah"],
  ["/admin/reset-password", "Reset Password"],
  ["/admin/kelas", "Kelas"],
  ["/admin/akun-siswa", "Manajemen Siswa & Orang Tua"]
];

/**
 * Komponen AdminSidebar.
 *
 * Peran: menampilkan panel navigasi samping (sidebar) untuk halaman-halaman admin.
 * Merender seluruh item dari konstanta `menu` sebagai tautan navigasi, dan menandai
 * tautan yang sedang aktif dengan kelas "active".
 *
 * @param {Object} props - Properti komponen.
 * @param {string} props.active - Path menu yang sedang aktif (untuk penanda kelas "active").
 * @returns {JSX.Element} Elemen sidebar administrator.
 */
function AdminSidebar({ active }) {
  return (
    <aside className="admin-sidebar-card">
      <span className="sidebar-title">Dasbor</span>
      <h3>Administrator</h3>
      <nav className="admin-menu">
        {menu.map(([to, label]) => (
          <Link key={to} className={active === to ? "active" : ""} to={to}>{label}</Link>
        ))}
      </nav>
    </aside>
  );
}

export default AdminSidebar;
