import schoolLogo from "../assets/logo-transparent.png";
import { Link } from "react-router-dom";
import { schoolContact } from "../data/schoolContact";

function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-simple">

        <div className="footer-logo-box">
          <img src={schoolLogo} alt="Logo Sekolah" />
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

          <p>{schoolContact.address}</p>
          <p>{schoolContact.phone}</p>
          <p>{schoolContact.email}</p>
        </div>
      </div>

      <div className="container footer-bottom">
        © 2025 Cipta Nusa Bakti. Seluruh hak cipta dilindungi.
      </div>
    </footer>
  );
}

export default Footer;