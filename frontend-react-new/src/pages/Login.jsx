import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import schoolLogo from "../assets/logo.jpeg";

const loginRoles = [
  {
    to: "/login-siswa",
    code: "SW",
    title: "Siswa",
    description: "Lihat informasi akademik, data pribadi, dan riwayat absensi."
  },
  {
    to: "/login-guru",
    code: "GR",
    title: "Guru",
    description: "Kelola absensi, pembelajaran, jadwal mengajar, dan administrasi guru."
  },
  {
    to: "/login-orangtua",
    code: "OT",
    title: "Orang Tua",
    description: "Pantau perkembangan dan absensi anak secara aman."
  },
  {
    to: "/admin-login",
    code: "AD",
    title: "Administrator",
    description: "Kelola data sekolah, akun portal, PPDB, dan konten situs web.",
    highlight: true
  },
  {
    to: "/login-kepala-sekolah",
    code: "KS",
    title: "Kepala Sekolah",
    description: "Monitor data guru, siswa, kegiatan, dan rekap absensi sekolah."
  }
];

function Login() {
  return (
    <>
      <Navbar />

      <main className="container login-page-shell">
        <section className="login-hero-card">
          <div className="login-hero-copy">
            <span className="login-eyebrow">Portal Masuk CNB</span>
            <h1>Masuk ke Portal Sekolah</h1>
            <p>
              Pilih akses sesuai peran kamu. Setiap portal dibuat terpisah agar data tetap rapi,
              aman, dan mudah digunakan.
            </p>
          </div>

          <div className="login-hero-panel" aria-label="Informasi portal sekolah">
            <img src={schoolLogo} alt="Logo sekolah" className="login-hero-logo" />
            <div>
              <strong>Satu pintu akses sekolah</strong>
              <span>Siswa, guru, orang tua, administrator, dan kepala sekolah.</span>
            </div>
          </div>
        </section>

        <section className="login-role-section" aria-labelledby="login-role-title">
          <div className="login-section-heading">
            <div>
              <span>Pilih Portal</span>
              <h2 id="login-role-title">Masuk sesuai kebutuhan</h2>
            </div>
            <p>Gunakan akun yang sudah terdaftar dan terverifikasi oleh sekolah.</p>
          </div>

          <div className="login-grid login-role-grid">
            {loginRoles.map((role) => (
              <Link
                key={role.to}
                to={role.to}
                className={`login-role-card${role.highlight ? " admin-card" : ""}`}
              >
                <span className="role-mark" aria-hidden="true">{role.code}</span>
                <h3>Masuk {role.title}</h3>
                <p>{role.description}</p>
                <span className="role-action">Masuk <span aria-hidden="true">›</span></span>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

export default Login;
