import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import Profil from "./pages/Profil";
import Kegiatan from "./pages/Kegiatan";
import Pengumuman from "./pages/Pengumuman";
import Galeri from "./pages/Galeri";
import PPDB from "./pages/PPDB";
import FormPPDB from "./pages/FormPPDB";
import Kontak from "./pages/Kontak";
import Login from "./pages/Login";
import AdminLogin from "./pages/AdminLogin";
import DashboardAdmin from "./pages/DashboardAdmin";
import LoginGuru from "./pages/LoginGuru";
import RegisterGuru from "./pages/RegisterGuru";
import LoginSiswa from "./pages/LoginSiswa";
import LoginOrangTua from "./pages/LoginOrangTua";
import LoginKepalaSekolah from "./pages/LoginKepalaSekolah";
import LupaPassword from "./pages/LupaPassword";
import ChangePassword from "./pages/ChangePassword";
import AdminKegiatan from "./pages/AdminKegiatan";
import AdminPengumuman from "./pages/AdminPengumuman";
import AdminGaleri from "./pages/AdminGaleri";
import AdminPPDB from "./pages/AdminPPDB";
import AdminKelas from "./pages/AdminKelas";
import AdminAkunSiswa from "./pages/AdminAkunSiswa";
import AdminProfilSekolah from "./pages/AdminProfilSekolah";
import AdminVerifikasiGuru from "./pages/AdminVerifikasiGuru";
import AdminResetPasswordRequests from "./pages/AdminResetPasswordRequests";
import DashboardGuru from "./pages/DashboardGuru";
import DashboardSiswa from "./pages/DashboardSiswa";
import DashboardOrangTua from "./pages/DashboardOrangTua";
import DashboardKepalaSekolah from "./pages/DashboardKepalaSekolah";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/profil" element={<Profil />} />
        <Route path="/kegiatan" element={<Kegiatan />} />
        <Route path="/pengumuman" element={<Pengumuman />} />
        <Route path="/galeri" element={<Galeri />} />
        <Route path="/ppdb" element={<PPDB />} />
        <Route path="/form-ppdb" element={<FormPPDB />} />
        <Route path="/kontak" element={<Kontak />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/dashboard-admin" element={<DashboardAdmin />} />
        <Route path="/login-guru" element={<LoginGuru />} />
        <Route path="/dashboard-guru" element={<DashboardGuru />} />
        <Route path="/dashboard-siswa" element={<DashboardSiswa />} />
        <Route path="/dashboard-orangtua" element={<DashboardOrangTua />} />
        <Route path="/dashboard-kepala-sekolah" element={<DashboardKepalaSekolah />} />
        <Route path="/register-guru" element={<RegisterGuru />} />
        <Route path="/login-siswa" element={<LoginSiswa />} />
        <Route path="/login-orangtua" element={<LoginOrangTua />} />
        <Route path="/login-kepala-sekolah" element={<LoginKepalaSekolah />} />
        <Route path="/lupa-password" element={<LupaPassword />} />
        <Route path="/change-password" element={<ChangePassword />} />
        <Route path="/admin/kegiatan" element={<AdminKegiatan />} />
        <Route path="/admin/pengumuman" element={<AdminPengumuman />} />
        <Route path="/admin/galeri" element={<AdminGaleri />} />
        <Route path="/admin/ppdb" element={<AdminPPDB />} />
        <Route path="/admin/kelas" element={<AdminKelas />} />
        <Route path="/admin/siswa" element={<AdminAkunSiswa />} />
        <Route path="/admin/akun-siswa" element={<AdminAkunSiswa />} />
        <Route path="/admin/profil-sekolah" element={<AdminProfilSekolah />} />
        <Route path="/admin/verifikasi-guru" element={<AdminVerifikasiGuru />} />
        <Route path="/admin/reset-password" element={<AdminResetPasswordRequests />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
