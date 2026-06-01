import { Link } from "react-router-dom";

function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-simple">

        <div className="footer-logo-box">
          <img src="/logo.png" alt="Logo Sekolah" />
        </div>

        <div className="footer-menu">
          <h3>Menu</h3>

          <Link to="/">Beranda</Link>
          <Link to="/profil">Profil</Link>
          <Link to="/kegiatan">Kegiatan</Link>
          <Link to="/pengumuman">Pengumuman</Link>
          <Link to="/galeri">Galeri</Link>
        </div>

        <div className="footer-contact">
          <h3>Kontak</h3>

          <p>Jl. Pendidikan No. 01</p>
          <p>0812-0000-0000</p>
          <p>sekolah@example.com</p>
        </div>
      </div>

      <div className="container footer-bottom">
        © 2025 Cipta Nusa Bakti. All rights reserved.
      </div>
    </footer>
  );
}

export default Footer;