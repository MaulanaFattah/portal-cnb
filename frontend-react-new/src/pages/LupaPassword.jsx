import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

function LupaPassword() {
  const [email, setEmail] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    console.log({ email });

    alert("Permintaan reset password nanti disambungkan ke backend.");
  };

  return (
    <>
      <Navbar />

      <main className="auth-page container">
        <div className="auth-card">
          <h1>Lupa Password</h1>

          <p>
            Masukkan email akun kamu. Sistem akan memproses permintaan reset
            password.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email</label>

              <input
                type="email"
                placeholder="Masukkan email akun"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="submit-btn">
              Kirim Permintaan
            </button>
          </form>

          <Link to="/login" className="auth-link auth-back-link">Kembali ke Login</Link>
        </div>
      </main>

      <Footer />
    </>
  );
}

export default LupaPassword;
