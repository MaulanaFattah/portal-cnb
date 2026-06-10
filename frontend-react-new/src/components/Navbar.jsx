import schoolLogo from "../assets/logo.jpeg";
import { Link, NavLink } from "react-router-dom";

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
          <NavLink to="/profil">Profil</NavLink>
          <NavLink to="/kegiatan">Kegiatan</NavLink>
          <NavLink to="/pengumuman">Pengumuman</NavLink>
          <NavLink to="/galeri">Galeri</NavLink>
          <NavLink to="/ppdb">PPDB</NavLink>
          <NavLink to="/kontak">Kontak</NavLink>
        </nav>

        <Link to="/login" className="login-btn">
          Login
        </Link>
      </div>
    </header>
  );
}

export default Navbar;