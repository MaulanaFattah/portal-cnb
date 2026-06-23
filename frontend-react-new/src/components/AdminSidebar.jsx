import { Link } from "react-router-dom";

const menu = [
  ["/dashboard-admin", "Dasbor"],
  ["/admin/profil-sekolah", "Profil Sekolah"],
  ["/admin/kegiatan", "Kegiatan"],
  ["/admin/pengumuman", "Pengumuman"],
  ["/admin/galeri", "Galeri"],
  ["/admin/ppdb", "PPDB"],
  ["/admin/verifikasi-guru", "Verifikasi Guru"],
  ["/admin/kepala-sekolah", "Kepala Sekolah"],
  ["/admin/reset-password", "Reset Password"],
  ["/admin/kelas", "Kelas"],
  ["/admin/akun-siswa", "Manajemen Siswa & Orang Tua"]
];

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
