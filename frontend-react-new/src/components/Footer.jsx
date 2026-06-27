import schoolLogo from "../assets/logo-transparent.png";
import { Link } from "react-router-dom";
import { schoolContact } from "../data/schoolContact";

/**
 * Komponen Footer.
 *
 * Peran: menampilkan bagian kaki halaman (footer) situs publik. Berisi logo sekolah,
 * menu navigasi cepat, informasi kontak (alamat, telepon, email), tautan media sosial
 * (Instagram & Facebook), serta baris hak cipta. Data kontak diambil dari
 * konstanta `schoolContact`.
 *
 * @returns {JSX.Element} Elemen footer situs.
 */
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
          <Link to="/fasilitas">Fasilitas Sekolah</Link>
          <Link to="/galeri">Galeri</Link>
          <Link to="/ppdb">PPDB</Link>
          <Link to="/kontak">Kontak</Link>
        </div>

        <div className="footer-contact">
          <h3>Kontak</h3>

          <p>{schoolContact.address}</p>
          <p>{schoolContact.phone}</p>
          <p>{schoolContact.email}</p>

          <div className="footer-social">
            <a
              href={schoolContact.instagram}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
            >
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
                <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16Zm0 1.62c-3.15 0-3.52.01-4.76.07-.99.04-1.53.21-1.89.35-.47.18-.81.4-1.17.76-.36.36-.58.7-.76 1.17-.14.36-.31.9-.35 1.89-.06 1.24-.07 1.61-.07 4.76s.01 3.52.07 4.76c.04.99.21 1.53.35 1.89.18.47.4.81.76 1.17.36.36.7.58 1.17.76.36.14.9.31 1.89.35 1.24.06 1.61.07 4.76.07s3.52-.01 4.76-.07c.99-.04 1.53-.21 1.89-.35.47-.18.81-.4 1.17-.76.36-.36.58-.7.76-1.17.14-.36.31-.9.35-1.89.06-1.24.07-1.61.07-4.76s-.01-3.52-.07-4.76c-.04-.99-.21-1.53-.35-1.89a3.15 3.15 0 0 0-.76-1.17 3.15 3.15 0 0 0-1.17-.76c-.36-.14-.9-.31-1.89-.35-1.24-.06-1.61-.07-4.76-.07Zm0 2.76a5.3 5.3 0 1 1 0 10.6 5.3 5.3 0 0 1 0-10.6Zm0 1.62a3.68 3.68 0 1 0 0 7.36 3.68 3.68 0 0 0 0-7.36Zm5.48-.43a1.24 1.24 0 1 1-2.48 0 1.24 1.24 0 0 1 2.48 0Z" />
              </svg>
            </a>
            <a
              href={schoolContact.facebook}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
            >
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
                <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.52 1.49-3.91 3.78-3.91 1.1 0 2.24.2 2.24.2v2.47h-1.26c-1.24 0-1.63.78-1.63 1.57v1.88h2.78l-.44 2.91h-2.34V22c4.78-.76 8.44-4.92 8.44-9.94Z" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      <div className="container footer-bottom">
        © 2025 Cipta Nusa Bakti. Seluruh hak cipta dilindungi.
      </div>
    </footer>
  );
}

export default Footer;
