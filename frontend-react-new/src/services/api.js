const API_URL = "http://localhost:4000/api";

export async function loginUser(data) {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  });

  return response.json();
}

export async function registerGuru(data) {
  const response = await fetch(`${API_URL}/auth/register-guru`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  });

  return response.json();
}

export function saveAuth(token, user) {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
}

export function getToken() {
  return localStorage.getItem("token");
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

export async function getAdminDashboard() {
  const token = localStorage.getItem("token");

  const response = await fetch("http://localhost:4000/api/admin/dashboard", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  return response.json();
}

export async function getKegiatan() {
  const response = await fetch("http://localhost:4000/api/kegiatan");
  return response.json();
}

export async function getKegiatanAdmin() {
  const token = localStorage.getItem("token");
  const response = await fetch("http://localhost:4000/api/kegiatan/admin/all", {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.json();
}

export async function createKegiatan(data) {
  const token = localStorage.getItem("token");

  const response = await fetch("http://localhost:4000/api/kegiatan", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });

  return response.json();
}

export async function updateKegiatan(id, data) {
  const token = localStorage.getItem("token");

  const response = await fetch(`http://localhost:4000/api/kegiatan/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });

  return response.json();
}

export async function deleteKegiatan(id) {
  const token = localStorage.getItem("token");

  const response = await fetch(`http://localhost:4000/api/kegiatan/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  return response.json();
}

// ========== PENGUMUMAN API ==========
export async function getPengumuman() {
  const response = await fetch("http://localhost:4000/api/pengumuman");
  return response.json();
}

export async function createPengumuman(data) {
  const token = localStorage.getItem("token");
  const response = await fetch("http://localhost:4000/api/pengumuman", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  return response.json();
}

export async function updatePengumuman(id, data) {
  const token = localStorage.getItem("token");
  const response = await fetch(`http://localhost:4000/api/pengumuman/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  return response.json();
}

export async function deletePengumuman(id) {
  const token = localStorage.getItem("token");
  const response = await fetch(`http://localhost:4000/api/pengumuman/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return response.json();
}

// ========== GALERI API ==========
export async function getGaleri() {
  const response = await fetch("http://localhost:4000/api/galeri");
  return response.json();
}

export async function createGaleri(data) {
  const token = localStorage.getItem("token");
  const response = await fetch("http://localhost:4000/api/galeri", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  return response.json();
}

export async function updateGaleri(id, data) {
  const token = localStorage.getItem("token");
  const response = await fetch(`http://localhost:4000/api/galeri/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  return response.json();
}

export async function deleteGaleri(id) {
  const token = localStorage.getItem("token");
  const response = await fetch(`http://localhost:4000/api/galeri/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return response.json();
}

// ========== PPDB API ==========
export async function getPPDB() {
  const token = localStorage.getItem("token");
  const response = await fetch("http://localhost:4000/api/ppdb", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return response.json();
}

export async function createPPDB(data) {
  const response = await fetch("http://localhost:4000/api/ppdb", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  });
  return response.json();
}

export async function updatePPDB(id, data) {
  const token = localStorage.getItem("token");
  const response = await fetch(`http://localhost:4000/api/ppdb/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  return response.json();
}

export async function deletePPDB(id) {
  const token = localStorage.getItem("token");
  const response = await fetch(`http://localhost:4000/api/ppdb/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return response.json();
}

// ========== GURU API ==========
export async function getGuru() {
  const response = await fetch("http://localhost:4000/api/guru");
  return response.json();
}

export async function createGuru(data) {
  const token = localStorage.getItem("token");
  const response = await fetch("http://localhost:4000/api/guru", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  return response.json();
}

export async function updateGuru(id, data) {
  const token = localStorage.getItem("token");
  const response = await fetch(`http://localhost:4000/api/guru/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  return response.json();
}

export async function deleteGuru(id) {
  const token = localStorage.getItem("token");
  const response = await fetch(`http://localhost:4000/api/guru/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return response.json();
}

// ========== KEPALA SEKOLAH API ==========
export async function getKepalaSekolah() {
  const response = await fetch("http://localhost:4000/api/kepala-sekolah");
  return response.json();
}

export async function createKepalaSekolah(data) {
  const token = localStorage.getItem("token");
  const response = await fetch("http://localhost:4000/api/kepala-sekolah", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  return response.json();
}

export async function updateKepalaSekolah(id, data) {
  const token = localStorage.getItem("token");
  const response = await fetch(`http://localhost:4000/api/kepala-sekolah/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  return response.json();
}

export async function deleteKepalaSekolah(id) {
  const token = localStorage.getItem("token");
  const response = await fetch(`http://localhost:4000/api/kepala-sekolah/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return response.json();
}

// ========== KELAS API ==========
export async function getKelas() {
  const response = await fetch("http://localhost:4000/api/kelas");
  return response.json();
}

export async function createKelas(data) {
  const token = localStorage.getItem("token");
  const response = await fetch("http://localhost:4000/api/kelas", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  return response.json();
}

export async function updateKelas(id, data) {
  const token = localStorage.getItem("token");
  const response = await fetch(`http://localhost:4000/api/kelas/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  return response.json();
}

export async function deleteKelas(id) {
  const token = localStorage.getItem("token");
  const response = await fetch(`http://localhost:4000/api/kelas/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return response.json();
}

// ========== SISWA API ==========
export async function getSiswa() {
  const token = localStorage.getItem("token");
  const response = await fetch("http://localhost:4000/api/siswa", {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.json();
}

export async function createSiswa(data) {
  const token = localStorage.getItem("token");
  const response = await fetch("http://localhost:4000/api/siswa", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  return response.json();
}

export async function updateSiswa(id, data) {
  const token = localStorage.getItem("token");
  const response = await fetch(`http://localhost:4000/api/siswa/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  return response.json();
}

export async function deleteSiswa(id) {
  const token = localStorage.getItem("token");
  const response = await fetch(`http://localhost:4000/api/siswa/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return response.json();
}

// ========== PROFIL SEKOLAH API ==========
export async function getProfilSekolah() {
  const response = await fetch("http://localhost:4000/api/profil-sekolah");
  return response.json();
}

export async function createProfilSekolah(data) {
  const token = localStorage.getItem("token");
  const response = await fetch("http://localhost:4000/api/profil-sekolah", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  return response.json();
}

export async function updateProfilSekolah(data) {
  const token = localStorage.getItem("token");
  const response = await fetch("http://localhost:4000/api/profil-sekolah", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  return response.json();
}

// ========== ADMIN USERS API ==========
export async function getUsersByRole(role) {
  const token = localStorage.getItem("token");
  const response = await fetch(`http://localhost:4000/api/admin/users?role=${role}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return response.json();
}

export async function createUser(data) {
  const token = localStorage.getItem("token");
  const response = await fetch("http://localhost:4000/api/admin/users", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  return response.json();
}

export async function updateUser(id, data) {
  const token = localStorage.getItem("token");
  const response = await fetch(`http://localhost:4000/api/admin/users/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  return response.json();
}

export async function deleteUser(id) {
  const token = localStorage.getItem("token");
  const response = await fetch(`http://localhost:4000/api/admin/users/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return response.json();
}

// ========== GURU VERIFICATION & ATTENDANCE API ==========
export async function getGuruRegistrations() {
  const token = localStorage.getItem("token");
  const response = await fetch("http://localhost:4000/api/admin-guru/registrations", {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.json();
}

export async function verifyGuruRegistration(userId, data) {
  const token = localStorage.getItem("token");
  const response = await fetch(`http://localhost:4000/api/admin-guru/registrations/${userId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  return response.json();
}

export async function getGuruJadwalAdmin() {
  const token = localStorage.getItem("token");
  const response = await fetch("http://localhost:4000/api/admin-guru/jadwal", {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.json();
}

export async function createGuruJadwal(data) {
  const token = localStorage.getItem("token");
  const response = await fetch("http://localhost:4000/api/admin-guru/jadwal", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  return response.json();
}

export async function updateGuruJadwal(id, data) {
  const token = localStorage.getItem("token");
  const response = await fetch(`http://localhost:4000/api/admin-guru/jadwal/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  return response.json();
}

export async function deleteGuruJadwal(id) {
  const token = localStorage.getItem("token");
  const response = await fetch(`http://localhost:4000/api/admin-guru/jadwal/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.json();
}

export async function getGuruDashboard() {
  const token = localStorage.getItem("token");
  const response = await fetch("http://localhost:4000/api/guru-portal/dashboard", {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.json();
}

export async function submitAbsensiGuru(data) {
  const token = localStorage.getItem("token");
  const response = await fetch("http://localhost:4000/api/guru-portal/absensi", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  return response.json();
}

export async function getRekapAbsensiGuru(params = {}) {
  const token = localStorage.getItem("token");
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.append(key, value);
  });

  const suffix = query.toString() ? `?${query.toString()}` : "";
  const response = await fetch(`http://localhost:4000/api/guru-portal/rekap${suffix}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.json();
}

export async function createGuruStudentAccounts(data) {
  const token = localStorage.getItem("token");
  const response = await fetch("http://localhost:4000/api/guru-portal/akun-siswa", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  return response.json();
}


// ========== PORTAL SISWA / ORANG TUA / KEPALA SEKOLAH API ==========
function buildQuery(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.append(key, value);
  });
  const text = query.toString();
  return text ? `?${text}` : "";
}

export async function getSiswaDashboard() {
  const token = localStorage.getItem("token");
  const response = await fetch("http://localhost:4000/api/portal/siswa/dashboard", {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.json();
}

export async function updateSiswaProfile(data) {
  const token = localStorage.getItem("token");
  const response = await fetch("http://localhost:4000/api/portal/siswa/profile", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  return response.json();
}

export async function getSiswaAbsensi(params = {}) {
  const token = localStorage.getItem("token");
  const response = await fetch(`http://localhost:4000/api/portal/siswa/absensi${buildQuery(params)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.json();
}

export async function getOrangTuaDashboard() {
  const token = localStorage.getItem("token");
  const response = await fetch("http://localhost:4000/api/portal/orangtua/dashboard", {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.json();
}

export async function updateOrangTuaProfile(data) {
  const token = localStorage.getItem("token");
  const response = await fetch("http://localhost:4000/api/portal/orangtua/profile", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  return response.json();
}

export async function getOrangTuaAbsensi(params = {}) {
  const token = localStorage.getItem("token");
  const response = await fetch(`http://localhost:4000/api/portal/orangtua/absensi${buildQuery(params)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.json();
}

export async function getKepalaSekolahDashboard(params = {}) {
  const token = localStorage.getItem("token");
  const response = await fetch(`http://localhost:4000/api/portal/kepala-sekolah/dashboard${buildQuery(params)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.json();
}
