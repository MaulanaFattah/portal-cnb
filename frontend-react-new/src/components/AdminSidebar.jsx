import { Link } from "react-router-dom";

const menu = [
  ["/dashboard-admin", "Dashboard"],
  ["/admin/profil-sekolah", "Profil Sekolah"],
  ["/admin/pengumuman", "Pengumuman"],
  ["/admin/galeri", "Galeri"],
  ["/admin/ppdb", "PPDB"],
  ["/admin/verifikasi-guru", "Verifikasi Guru"],
  ["/admin/kelas", "Kelas"],
  ["/admin/siswa", "Siswa"],
  ["/admin/akun-siswa", "Akun Siswa & Orang Tua"]
];

function AdminSidebar({ active }) {
  return (
    <aside className="admin-sidebar-card">
      <span className="sidebar-title">Dashboard</span>
      <h3>Admin</h3>
      <nav className="admin-menu">
        {menu.map(([to, label]) => (
          <Link key={to} className={active === to ? "active" : ""} to={to}>{label}</Link>
        ))}
      </nav>
    </aside>
  );
}

export default AdminSidebar;
