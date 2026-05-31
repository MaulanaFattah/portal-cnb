import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

function Login() {
  return (
    <>
      <Navbar />

      <main className="container">
        <section className="page-hero">
          <span className="badge">Portal Login</span>

          <h1>Masuk ke Sistem</h1>

          <p>
            Pilih jenis akun yang ingin digunakan untuk mengakses portal sekolah.
          </p>
        </section>

        <div className="login-grid">

          <Link to="/login-siswa" className="login-role-card">
            <h3>🎓 Login Siswa</h3>
            <p>Akses informasi akademik dan data siswa.</p>
          </Link>

          <Link to="/login-guru" className="login-role-card">
            <h3>👨‍🏫 Login Guru</h3>
            <p>Akses data pembelajaran dan administrasi guru.</p>
          </Link>

          <Link to="/login-orangtua" className="login-role-card">
            <h3>👨‍👩‍👧 Login Orang Tua</h3>
            <p>Monitoring perkembangan dan informasi siswa.</p>
          </Link>

          <Link to="/admin-login" className="login-role-card admin-card">
            <h3>⚙️ Login Admin</h3>
            <p>Kelola seluruh data portal sekolah.</p>
          </Link>

        </div>
      </main>

      <Footer />
    </>
  );
}

export default Login;