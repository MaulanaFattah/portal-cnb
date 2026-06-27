import schoolLogo from "../assets/logo-transparent.png";
import { Link, NavLink } from "react-router-dom";

/**
 * Komponen Navbar.
 *
 * Peran: menampilkan bilah navigasi utama (header) situs publik. Berisi brand
 * (logo & nama sekolah) yang menautkan ke beranda, menu navigasi utama
 * (Beranda, Pengumuman, Galeri, PPDB, Kontak) menggunakan NavLink agar tautan aktif
 * dapat ditandai, serta tombol "Masuk" menuju halaman login.
 *
 * @returns {JSX.Element} Elemen header navigasi situs.
 */
function Navbar() {
  return (
    <header className="header">
      <div className="container nav">
        <Link to="/" className="brand">
          <img src={schoolLogo} alt="Logo Sekolah" className="brand-logo" />

          <div>
            <h1>Cipta Nusa Bakti</h1>
            <p>Portal Sekolah</p>
          </div>
        </Link>

        <nav className="menu">
          <NavLink to="/">Beranda</NavLink>
          <NavLink to="/pengumuman">Pengumuman</NavLink>
          <NavLink to="/galeri">Galeri</NavLink>
          <NavLink to="/ppdb">PPDB</NavLink>
          <NavLink to="/kontak">Kontak</NavLink>
        </nav>

        <Link to="/login" className="login-btn">
          Masuk
        </Link>
      </div>
    </header>
  );
}

export default Navbar;
