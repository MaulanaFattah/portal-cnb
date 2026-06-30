const API_URL = import.meta.env.VITE_API_URL || "/api";
const BACKEND_URL = API_URL.startsWith("http") ? API_URL.replace(/\/api$/, "") : "";

/**
 * Helper internal untuk mengubah objek data biasa menjadi instance FormData.
 * Dipakai oleh endpoint yang menerima multipart/form-data (mis. upload gambar
 * pada kegiatan, galeri, fasilitas, dan siswa).
 *
 * Hanya field yang nilainya bukan `undefined` dan bukan `null` yang ditambahkan
 * agar tidak mengirim field kosong yang tidak diinginkan ke backend.
 *
 * @param {Object} data - Objek key-value yang akan dikonversi ke FormData.
 * @returns {FormData} Instance FormData berisi seluruh field yang valid.
 */
function toFormData(data) {
  const formData = new FormData();
  Object.entries(data || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) formData.append(key, value);
  });
  return formData;
}

/**
 * Menyusun URL media yang dapat diakses dari frontend.
 *
 * Jika nilai berupa path upload backend (diawali "/uploads/"), maka path tersebut
 * digabungkan dengan BACKEND_URL agar menjadi URL absolut. Jika nilai sudah berupa
 * URL lengkap atau path lain, nilai dikembalikan apa adanya. Bila nilai kosong,
 * dikembalikan nilai fallback.
 *
 * @param {string} value - Path atau URL media (mis. "/uploads/galeri/x.jpg").
 * @param {string} [fallback=""] - Nilai yang dikembalikan jika `value` kosong.
 * @returns {string} URL media yang siap dipakai pada atribut src.
 */
export function resolveMediaUrl(value, fallback = "") {
  if (!value) return fallback;
  if (String(value).startsWith("/uploads/")) return `${BACKEND_URL}${value}`;
  return value;
}

/**
 * Melakukan proses login pengguna.
 *
 * Endpoint : POST {API_URL}/auth/login
 * Method   : POST
 * Header    : Content-Type: application/json (tanpa token, endpoint publik)
 * Parameter : `data` berisi kredensial login (mis. { username/email, password }).
 *
 * @param {Object} data - Data kredensial login yang dikirim sebagai JSON body.
 * @returns {Promise<Object>} Respons JSON backend (umumnya berisi token & data user).
 */
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

/**
 * Mendaftarkan akun guru baru (registrasi mandiri guru).
 *
 * Endpoint : POST {API_URL}/auth/register-guru
 * Method   : POST
 * Header    : Content-Type: application/json (endpoint publik, tanpa token)
 * Parameter : `data` berisi data pendaftaran guru.
 *
 * @param {Object} data - Data registrasi guru yang dikirim sebagai JSON body.
 * @returns {Promise<Object>} Respons JSON backend (status pendaftaran guru).
 */
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

/**
 * Mendaftarkan akun kepala sekolah baru (registrasi mandiri kepala sekolah).
 *
 * Endpoint : POST {API_URL}/auth/register-kepala-sekolah
 * Method   : POST
 * Header    : Content-Type: application/json (endpoint publik, tanpa token)
 * Parameter : `data` berisi data pendaftaran kepala sekolah.
 *
 * @param {Object} data - Data registrasi kepala sekolah yang dikirim sebagai JSON body.
 * @returns {Promise<Object>} Respons JSON backend (status pendaftaran kepala sekolah).
 */
export async function registerKepalaSekolah(data) {
  const response = await fetch(`${API_URL}/auth/register-kepala-sekolah`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  });

  return response.json();
}

/**
 * Menyimpan kredensial autentikasi ke localStorage browser.
 *
 * Tidak memanggil endpoint apa pun; hanya menyimpan token dan data user secara lokal
 * sehingga sesi pengguna tetap aktif setelah refresh halaman.
 *
 * @param {string} token - JWT token yang diperoleh dari proses login.
 * @param {Object} user - Objek data pengguna yang akan disimpan (di-stringify ke JSON).
 * @returns {void}
 */
export function saveAuth(token, user) {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
}

/**
 * Mengambil JWT token yang tersimpan di localStorage.
 *
 * Tidak memanggil endpoint apa pun; hanya membaca nilai lokal. Token ini dipakai
 * sebagai header Authorization Bearer pada permintaan yang membutuhkan autentikasi.
 *
 * @returns {string|null} Token yang tersimpan, atau null bila belum login.
 */
export function getToken() {
  return localStorage.getItem("token");
}

/**
 * Menghapus kredensial autentikasi dari localStorage (proses logout lokal).
 *
 * Tidak memanggil endpoint apa pun; hanya membersihkan token dan data user lokal.
 *
 * @returns {void}
 */
export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

/**
 * Mengubah kata sandi pengguna yang sedang login.
 *
 * Endpoint : PUT {API_URL}/auth/change-password
 * Method   : PUT
 * Header    : Content-Type: application/json, Authorization: Bearer <token>
 * Parameter : `data` berisi kata sandi lama dan baru.
 *
 * @param {Object} data - Data perubahan kata sandi (mis. { oldPassword, newPassword }).
 * @returns {Promise<Object>} Respons JSON backend (status perubahan kata sandi).
 */
export async function changePassword(data) {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/auth/change-password`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  return response.json();
}

/**
 * Mengirim permintaan reset kata sandi (lupa password) ke admin.
 *
 * Endpoint : POST {API_URL}/auth/forgot-password
 * Method   : POST
 * Header    : Content-Type: application/json (endpoint publik, tanpa token)
 * Parameter : `data` berisi identitas pengguna yang meminta reset.
 *
 * @param {Object} data - Data permintaan reset (mis. { username/email/identitas }).
 * @returns {Promise<Object>} Respons JSON backend (status pengajuan reset password).
 */
export async function requestPasswordReset(data) {
  const response = await fetch(`${API_URL}/auth/forgot-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  });
  return response.json();
}

/**
 * Mengambil data ringkasan dashboard administrator.
 *
 * Endpoint : GET {API_URL}/admin/dashboard
 * Method   : GET
 * Header    : Authorization: Bearer <token>
 * Parameter : -
 *
 * @returns {Promise<Object>} Respons JSON berisi statistik/ringkasan dashboard admin.
 */
export async function getAdminDashboard() {
  const token = localStorage.getItem("token");

  const response = await fetch(`${API_URL}/admin/dashboard`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  return response.json();
}

/**
 * Mengambil daftar kegiatan untuk tampilan publik.
 *
 * Endpoint : GET {API_URL}/kegiatan
 * Method   : GET
 * Header    : - (endpoint publik, tanpa token)
 * Parameter : -
 *
 * @returns {Promise<Object>} Respons JSON berisi daftar kegiatan publik.
 */
export async function getKegiatan() {
  const response = await fetch(`${API_URL}/kegiatan`);
  return response.json();
}

/**
 * Mengambil seluruh data kegiatan untuk keperluan administrasi (termasuk draft).
 *
 * Endpoint : GET {API_URL}/kegiatan/admin/all
 * Method   : GET
 * Header    : Authorization: Bearer <token>
 * Parameter : -
 *
 * @returns {Promise<Object>} Respons JSON berisi seluruh kegiatan untuk admin.
 */
export async function getKegiatanAdmin() {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/kegiatan/admin/all`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.json();
}

/**
 * Membuat kegiatan baru beserta unggahan gambar (multipart/form-data).
 *
 * Endpoint : POST {API_URL}/kegiatan
 * Method   : POST
 * Header    : Authorization: Bearer <token> (Content-Type otomatis oleh FormData)
 * Parameter : `data` berisi field kegiatan; dikonversi via toFormData().
 *
 * @param {Object} data - Data kegiatan baru (termasuk file gambar bila ada).
 * @returns {Promise<Object>} Respons JSON backend (kegiatan yang dibuat).
 */
export async function createKegiatan(data) {
  const token = localStorage.getItem("token");

  const response = await fetch(`${API_URL}/kegiatan`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: toFormData(data)
  });

  return response.json();
}

/**
 * Memperbarui kegiatan berdasarkan id beserta unggahan gambar (multipart/form-data).
 *
 * Endpoint : PUT {API_URL}/kegiatan/{id}
 * Method   : PUT
 * Header    : Authorization: Bearer <token> (Content-Type otomatis oleh FormData)
 * Parameter : `id` id kegiatan; `data` field kegiatan yang diperbarui.
 *
 * @param {string|number} id - ID kegiatan yang akan diperbarui.
 * @param {Object} data - Data kegiatan yang diperbarui (termasuk file gambar bila ada).
 * @returns {Promise<Object>} Respons JSON backend (kegiatan yang diperbarui).
 */
export async function updateKegiatan(id, data) {
  const token = localStorage.getItem("token");

  const response = await fetch(`${API_URL}/kegiatan/${id}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: toFormData(data)
  });

  return response.json();
}

/**
 * Menghapus kegiatan berdasarkan id.
 *
 * Endpoint : DELETE {API_URL}/kegiatan/{id}
 * Method   : DELETE
 * Header    : Authorization: Bearer <token>
 * Parameter : `id` id kegiatan yang akan dihapus.
 *
 * @param {string|number} id - ID kegiatan yang akan dihapus.
 * @returns {Promise<Object>} Respons JSON backend (status penghapusan).
 */
export async function deleteKegiatan(id) {
  const token = localStorage.getItem("token");

  const response = await fetch(`${API_URL}/kegiatan/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  return response.json();
}

// ========== PENGUMUMAN API ==========
/**
 * Mengambil daftar pengumuman untuk tampilan publik.
 *
 * Endpoint : GET {API_URL}/pengumuman
 * Method   : GET
 * Header    : - (endpoint publik, tanpa token)
 * Parameter : -
 *
 * @returns {Promise<Object>} Respons JSON berisi daftar pengumuman.
 */
export async function getPengumuman() {
  const response = await fetch(`${API_URL}/pengumuman`);
  return response.json();
}

/**
 * Membuat pengumuman baru.
 *
 * Endpoint : POST {API_URL}/pengumuman
 * Method   : POST
 * Header    : Content-Type: application/json, Authorization: Bearer <token>
 * Parameter : `data` berisi field pengumuman.
 *
 * @param {Object} data - Data pengumuman baru yang dikirim sebagai JSON body.
 * @returns {Promise<Object>} Respons JSON backend (pengumuman yang dibuat).
 */
export async function createPengumuman(data) {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/pengumuman`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  return response.json();
}

/**
 * Memperbarui pengumuman berdasarkan id.
 *
 * Endpoint : PUT {API_URL}/pengumuman/{id}
 * Method   : PUT
 * Header    : Content-Type: application/json, Authorization: Bearer <token>
 * Parameter : `id` id pengumuman; `data` field yang diperbarui.
 *
 * @param {string|number} id - ID pengumuman yang akan diperbarui.
 * @param {Object} data - Data pengumuman yang diperbarui sebagai JSON body.
 * @returns {Promise<Object>} Respons JSON backend (pengumuman yang diperbarui).
 */
export async function updatePengumuman(id, data) {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/pengumuman/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  return response.json();
}

/**
 * Menghapus pengumuman berdasarkan id.
 *
 * Endpoint : DELETE {API_URL}/pengumuman/{id}
 * Method   : DELETE
 * Header    : Authorization: Bearer <token>
 * Parameter : `id` id pengumuman yang akan dihapus.
 *
 * @param {string|number} id - ID pengumuman yang akan dihapus.
 * @returns {Promise<Object>} Respons JSON backend (status penghapusan).
 */
export async function deletePengumuman(id) {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/pengumuman/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return response.json();
}

// ========== GALERI API ==========
/**
 * Mengambil daftar galeri untuk tampilan publik.
 *
 * Endpoint : GET {API_URL}/galeri
 * Method   : GET
 * Header    : - (endpoint publik, tanpa token)
 * Parameter : -
 *
 * @returns {Promise<Object>} Respons JSON berisi daftar item galeri.
 */
export async function getGaleri() {
  const response = await fetch(`${API_URL}/galeri`);
  return response.json();
}

/**
 * Membuat item galeri baru beserta unggahan gambar (multipart/form-data).
 *
 * Endpoint : POST {API_URL}/galeri
 * Method   : POST
 * Header    : Authorization: Bearer <token> (Content-Type otomatis oleh FormData)
 * Parameter : `data` berisi field galeri; dikonversi via toFormData().
 *
 * @param {Object} data - Data galeri baru (termasuk file gambar bila ada).
 * @returns {Promise<Object>} Respons JSON backend (item galeri yang dibuat).
 */
export async function createGaleri(data) {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/galeri`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: toFormData(data)
  });
  return response.json();
}

/**
 * Memperbarui item galeri berdasarkan id beserta unggahan gambar (multipart/form-data).
 *
 * Endpoint : PUT {API_URL}/galeri/{id}
 * Method   : PUT
 * Header    : Authorization: Bearer <token> (Content-Type otomatis oleh FormData)
 * Parameter : `id` id galeri; `data` field yang diperbarui.
 *
 * @param {string|number} id - ID item galeri yang akan diperbarui.
 * @param {Object} data - Data galeri yang diperbarui (termasuk file gambar bila ada).
 * @returns {Promise<Object>} Respons JSON backend (item galeri yang diperbarui).
 */
export async function updateGaleri(id, data) {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/galeri/${id}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: toFormData(data)
  });
  return response.json();
}

/**
 * Menghapus item galeri berdasarkan id.
 *
 * Endpoint : DELETE {API_URL}/galeri/{id}
 * Method   : DELETE
 * Header    : Authorization: Bearer <token>
 * Parameter : `id` id item galeri yang akan dihapus.
 *
 * @param {string|number} id - ID item galeri yang akan dihapus.
 * @returns {Promise<Object>} Respons JSON backend (status penghapusan).
 */
export async function deleteGaleri(id) {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/galeri/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return response.json();
}


// ========== FASILITAS API ==========
/**
 * Mengambil daftar fasilitas untuk tampilan publik.
 *
 * Endpoint : GET {API_URL}/fasilitas
 * Method   : GET
 * Header    : - (endpoint publik, tanpa token)
 * Parameter : -
 *
 * @returns {Promise<Object>} Respons JSON berisi daftar fasilitas publik.
 */
export async function getFasilitas() {
  const response = await fetch(`${API_URL}/fasilitas`);
  return response.json();
}

/**
 * Mengambil seluruh data fasilitas untuk keperluan administrasi.
 *
 * Endpoint : GET {API_URL}/fasilitas/admin/all
 * Method   : GET
 * Header    : Authorization: Bearer <token>
 * Parameter : -
 *
 * @returns {Promise<Object>} Respons JSON berisi seluruh fasilitas untuk admin.
 */
export async function getFasilitasAdmin() {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/fasilitas/admin/all`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.json();
}

/**
 * Membuat fasilitas baru beserta unggahan gambar (multipart/form-data).
 *
 * Endpoint : POST {API_URL}/fasilitas
 * Method   : POST
 * Header    : Authorization: Bearer <token> (Content-Type otomatis oleh FormData)
 * Parameter : `data` berisi field fasilitas; dikonversi via toFormData().
 *
 * @param {Object} data - Data fasilitas baru (termasuk file gambar bila ada).
 * @returns {Promise<Object>} Respons JSON backend (fasilitas yang dibuat).
 */
export async function createFasilitas(data) {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/fasilitas`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: toFormData(data)
  });
  return response.json();
}

/**
 * Memperbarui fasilitas berdasarkan id beserta unggahan gambar (multipart/form-data).
 *
 * Endpoint : PUT {API_URL}/fasilitas/{id}
 * Method   : PUT
 * Header    : Authorization: Bearer <token> (Content-Type otomatis oleh FormData)
 * Parameter : `id` id fasilitas; `data` field yang diperbarui.
 *
 * @param {string|number} id - ID fasilitas yang akan diperbarui.
 * @param {Object} data - Data fasilitas yang diperbarui (termasuk file gambar bila ada).
 * @returns {Promise<Object>} Respons JSON backend (fasilitas yang diperbarui).
 */
export async function updateFasilitas(id, data) {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/fasilitas/${id}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: toFormData(data)
  });
  return response.json();
}

/**
 * Menghapus fasilitas berdasarkan id.
 *
 * Endpoint : DELETE {API_URL}/fasilitas/{id}
 * Method   : DELETE
 * Header    : Authorization: Bearer <token>
 * Parameter : `id` id fasilitas yang akan dihapus.
 *
 * @param {string|number} id - ID fasilitas yang akan dihapus.
 * @returns {Promise<Object>} Respons JSON backend (status penghapusan).
 */
export async function deleteFasilitas(id) {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/fasilitas/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.json();
}

// ========== PPDB API ==========
/**
 * Mengambil daftar pendaftaran PPDB (Penerimaan Peserta Didik Baru) untuk admin.
 *
 * Endpoint : GET {API_URL}/ppdb
 * Method   : GET
 * Header    : Authorization: Bearer <token>
 * Parameter : -
 *
 * @returns {Promise<Object>} Respons JSON berisi daftar pendaftar PPDB.
 */
export async function getPPDB() {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/ppdb`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return response.json();
}

/**
 * Mengirim formulir pendaftaran PPDB baru (diajukan oleh calon peserta didik).
 *
 * Endpoint : POST {API_URL}/ppdb
 * Method   : POST
 * Header    : Content-Type: application/json (endpoint publik, tanpa token)
 * Parameter : `data` berisi data formulir pendaftaran.
 *
 * @param {Object} data - Data pendaftaran PPDB yang dikirim sebagai JSON body.
 * @returns {Promise<Object>} Respons JSON backend (status pendaftaran PPDB).
 */
export async function createPPDB(data) {
  const response = await fetch(`${API_URL}/ppdb`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  });
  return response.json();
}

/**
 * Mengecek status pendaftaran PPDB milik calon peserta didik.
 *
 * Endpoint : POST {API_URL}/ppdb/status
 * Method   : POST
 * Header    : Content-Type: application/json (endpoint publik, tanpa token)
 * Parameter : `data` berisi identitas pendaftar untuk pencarian status.
 *
 * @param {Object} data - Data pencarian status (mis. nomor pendaftaran/identitas).
 * @returns {Promise<Object>} Respons JSON backend (status pendaftaran yang dicari).
 */
export async function checkPPDBStatus(data) {
  const response = await fetch(`${API_URL}/ppdb/status`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  });
  return response.json();
}

/**
 * Mengunggah ulang berkas pendaftaran PPDB saat status "revisi_berkas".
 *
 * Endpoint : POST {API_URL}/ppdb/resubmit
 * Method   : POST
 * Header    : Content-Type: application/json (endpoint publik, tanpa token)
 * Parameter : `data` berisi { email, nama_lengkap, berkas: { <key>: dataUrl } }.
 *
 * @param {Object} data - Identitas pendaftar dan berkas baru (base64 data URL).
 * @returns {Promise<Object>} Respons JSON backend (status perbaikan berkas).
 */
export async function resubmitPPDBBerkas(data) {
  const response = await fetch(`${API_URL}/ppdb/resubmit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  });
  return response.json();
}

/**
 * Memperbarui data/status pendaftaran PPDB berdasarkan id (oleh admin).
 *
 * Endpoint : PUT {API_URL}/ppdb/{id}
 * Method   : PUT
 * Header    : Content-Type: application/json, Authorization: Bearer <token>
 * Parameter : `id` id pendaftaran; `data` field yang diperbarui.
 *
 * @param {string|number} id - ID pendaftaran PPDB yang akan diperbarui.
 * @param {Object} data - Data PPDB yang diperbarui sebagai JSON body.
 * @returns {Promise<Object>} Respons JSON backend (pendaftaran yang diperbarui).
 */
export async function updatePPDB(id, data) {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/ppdb/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  return response.json();
}

/**
 * Menghapus pendaftaran PPDB berdasarkan id.
 *
 * Endpoint : DELETE {API_URL}/ppdb/{id}
 * Method   : DELETE
 * Header    : Authorization: Bearer <token>
 * Parameter : `id` id pendaftaran PPDB yang akan dihapus.
 *
 * @param {string|number} id - ID pendaftaran PPDB yang akan dihapus.
 * @returns {Promise<Object>} Respons JSON backend (status penghapusan).
 */
export async function deletePPDB(id) {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/ppdb/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return response.json();
}

// ========== GURU API ==========
/**
 * Mengambil daftar guru untuk tampilan publik.
 *
 * Endpoint : GET {API_URL}/guru
 * Method   : GET
 * Header    : - (endpoint publik, tanpa token)
 * Parameter : -
 *
 * @returns {Promise<Object>} Respons JSON berisi daftar guru.
 */
export async function getGuru() {
  const response = await fetch(`${API_URL}/guru`);
  return response.json();
}

/**
 * Membuat data guru baru (oleh admin).
 *
 * Endpoint : POST {API_URL}/guru
 * Method   : POST
 * Header    : Content-Type: application/json, Authorization: Bearer <token>
 * Parameter : `data` berisi field data guru.
 *
 * @param {Object} data - Data guru baru yang dikirim sebagai JSON body.
 * @returns {Promise<Object>} Respons JSON backend (guru yang dibuat).
 */
export async function createGuru(data) {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/guru`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  return response.json();
}

/**
 * Memperbarui data guru berdasarkan id (oleh admin).
 *
 * Endpoint : PUT {API_URL}/guru/{id}
 * Method   : PUT
 * Header    : Content-Type: application/json, Authorization: Bearer <token>
 * Parameter : `id` id guru; `data` field yang diperbarui.
 *
 * @param {string|number} id - ID guru yang akan diperbarui.
 * @param {Object} data - Data guru yang diperbarui sebagai JSON body.
 * @returns {Promise<Object>} Respons JSON backend (guru yang diperbarui).
 */
export async function updateGuru(id, data) {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/guru/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  return response.json();
}

/**
 * Menghapus data guru berdasarkan id (oleh admin).
 *
 * Endpoint : DELETE {API_URL}/guru/{id}
 * Method   : DELETE
 * Header    : Authorization: Bearer <token>
 * Parameter : `id` id guru yang akan dihapus.
 *
 * @param {string|number} id - ID guru yang akan dihapus.
 * @returns {Promise<Object>} Respons JSON backend (status penghapusan).
 */
export async function deleteGuru(id) {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/guru/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return response.json();
}

// ========== KEPALA SEKOLAH API ==========
/**
 * Mengambil daftar kepala sekolah untuk tampilan publik.
 *
 * Endpoint : GET {API_URL}/kepala-sekolah
 * Method   : GET
 * Header    : - (endpoint publik, tanpa token)
 * Parameter : -
 *
 * @returns {Promise<Object>} Respons JSON berisi daftar kepala sekolah.
 */
export async function getKepalaSekolah() {
  const response = await fetch(`${API_URL}/kepala-sekolah`);
  return response.json();
}

/**
 * Membuat data kepala sekolah baru (oleh admin).
 *
 * Endpoint : POST {API_URL}/kepala-sekolah
 * Method   : POST
 * Header    : Content-Type: application/json, Authorization: Bearer <token>
 * Parameter : `data` berisi field data kepala sekolah.
 *
 * @param {Object} data - Data kepala sekolah baru yang dikirim sebagai JSON body.
 * @returns {Promise<Object>} Respons JSON backend (kepala sekolah yang dibuat).
 */
export async function createKepalaSekolah(data) {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/kepala-sekolah`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  return response.json();
}

/**
 * Memperbarui data kepala sekolah berdasarkan id (oleh admin).
 *
 * Endpoint : PUT {API_URL}/kepala-sekolah/{id}
 * Method   : PUT
 * Header    : Content-Type: application/json, Authorization: Bearer <token>
 * Parameter : `id` id kepala sekolah; `data` field yang diperbarui.
 *
 * @param {string|number} id - ID kepala sekolah yang akan diperbarui.
 * @param {Object} data - Data kepala sekolah yang diperbarui sebagai JSON body.
 * @returns {Promise<Object>} Respons JSON backend (kepala sekolah yang diperbarui).
 */
export async function updateKepalaSekolah(id, data) {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/kepala-sekolah/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  return response.json();
}

/**
 * Menghapus data kepala sekolah berdasarkan id (oleh admin).
 *
 * Endpoint : DELETE {API_URL}/kepala-sekolah/{id}
 * Method   : DELETE
 * Header    : Authorization: Bearer <token>
 * Parameter : `id` id kepala sekolah yang akan dihapus.
 *
 * @param {string|number} id - ID kepala sekolah yang akan dihapus.
 * @returns {Promise<Object>} Respons JSON backend (status penghapusan).
 */
export async function deleteKepalaSekolah(id) {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/kepala-sekolah/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return response.json();
}

// ========== KELAS API ==========
/**
 * Mengambil daftar kelas.
 *
 * Endpoint : GET {API_URL}/kelas
 * Method   : GET
 * Header    : - (endpoint publik, tanpa token)
 * Parameter : -
 *
 * @returns {Promise<Object>} Respons JSON berisi daftar kelas.
 */
export async function getKelas() {
  const response = await fetch(`${API_URL}/kelas`);
  return response.json();
}

/**
 * Membuat data kelas baru (oleh admin).
 *
 * Endpoint : POST {API_URL}/kelas
 * Method   : POST
 * Header    : Content-Type: application/json, Authorization: Bearer <token>
 * Parameter : `data` berisi field data kelas.
 *
 * @param {Object} data - Data kelas baru yang dikirim sebagai JSON body.
 * @returns {Promise<Object>} Respons JSON backend (kelas yang dibuat).
 */
export async function createKelas(data) {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/kelas`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  return response.json();
}

/**
 * Memperbarui data kelas berdasarkan id (oleh admin).
 *
 * Endpoint : PUT {API_URL}/kelas/{id}
 * Method   : PUT
 * Header    : Content-Type: application/json, Authorization: Bearer <token>
 * Parameter : `id` id kelas; `data` field yang diperbarui.
 *
 * @param {string|number} id - ID kelas yang akan diperbarui.
 * @param {Object} data - Data kelas yang diperbarui sebagai JSON body.
 * @returns {Promise<Object>} Respons JSON backend (kelas yang diperbarui).
 */
export async function updateKelas(id, data) {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/kelas/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  return response.json();
}

/**
 * Menghapus data kelas berdasarkan id (oleh admin).
 *
 * Endpoint : DELETE {API_URL}/kelas/{id}
 * Method   : DELETE
 * Header    : Authorization: Bearer <token>
 * Parameter : `id` id kelas yang akan dihapus.
 *
 * @param {string|number} id - ID kelas yang akan dihapus.
 * @returns {Promise<Object>} Respons JSON backend (status penghapusan).
 */
export async function deleteKelas(id) {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/kelas/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return response.json();
}

// ========== SISWA API ==========
/**
 * Mengambil daftar siswa (membutuhkan autentikasi).
 *
 * Endpoint : GET {API_URL}/siswa
 * Method   : GET
 * Header    : Authorization: Bearer <token>
 * Parameter : -
 *
 * @returns {Promise<Object>} Respons JSON berisi daftar siswa.
 */
export async function getSiswa() {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/siswa`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.json();
}

/**
 * Membuat data siswa baru beserta unggahan berkas (multipart/form-data).
 *
 * Endpoint : POST {API_URL}/siswa
 * Method   : POST
 * Header    : Authorization: Bearer <token> (Content-Type otomatis oleh FormData)
 * Parameter : `data` berisi field siswa; dikonversi via toFormData().
 *
 * @param {Object} data - Data siswa baru (termasuk file/foto bila ada).
 * @returns {Promise<Object>} Respons JSON backend (siswa yang dibuat).
 */
export async function createSiswa(data) {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/siswa`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: toFormData(data)
  });
  return response.json();
}

/**
 * Memperbarui data siswa berdasarkan id beserta unggahan berkas (multipart/form-data).
 *
 * Endpoint : PUT {API_URL}/siswa/{id}
 * Method   : PUT
 * Header    : Authorization: Bearer <token> (Content-Type otomatis oleh FormData)
 * Parameter : `id` id siswa; `data` field yang diperbarui.
 *
 * @param {string|number} id - ID siswa yang akan diperbarui.
 * @param {Object} data - Data siswa yang diperbarui (termasuk file/foto bila ada).
 * @returns {Promise<Object>} Respons JSON backend (siswa yang diperbarui).
 */
export async function updateSiswa(id, data) {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/siswa/${id}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: toFormData(data)
  });
  return response.json();
}

/**
 * Menghapus data siswa berdasarkan id.
 *
 * Endpoint : DELETE {API_URL}/siswa/{id}
 * Method   : DELETE
 * Header    : Authorization: Bearer <token>
 * Parameter : `id` id siswa yang akan dihapus.
 *
 * @param {string|number} id - ID siswa yang akan dihapus.
 * @returns {Promise<Object>} Respons JSON backend (status penghapusan).
 */
export async function deleteSiswa(id) {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/siswa/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return response.json();
}

/**
 * Memproses kenaikan kelas (promosi) sejumlah siswa.
 *
 * Endpoint : POST {API_URL}/siswa/naik-kelas
 * Method   : POST
 * Header    : Content-Type: application/json, Authorization: Bearer <token>
 * Parameter : `data` berisi informasi kenaikan kelas (daftar siswa & kelas tujuan).
 *
 * @param {Object} data - Data promosi kenaikan kelas sebagai JSON body.
 * @returns {Promise<Object>} Respons JSON backend (hasil proses kenaikan kelas).
 */
export async function promoteSiswa(data) {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/siswa/naik-kelas`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  return response.json();
}

/**
 * Mengambil data arsip kelas (riwayat kelas terdahulu).
 *
 * Endpoint : GET {API_URL}/siswa/arsip-kelas
 * Method   : GET
 * Header    : Authorization: Bearer <token>
 * Parameter : -
 *
 * @returns {Promise<Object>} Respons JSON berisi data arsip kelas.
 */
export async function getArsipKelas() {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/siswa/arsip-kelas`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.json();
}

export async function updateSiswaNIS(id, data) {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/siswa/${id}/nis`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
  return response.json();
}

export async function getRekapPPDB() {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/ppdb/rekap`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.json();
}

export async function setPPDBDaftarUlang(id, data) {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/ppdb/${id}/daftar-ulang`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
  return response.json();
}

export async function createGuruAccount(data) {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/admin-guru/accounts`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
  return response.json();
}

export async function getReports() {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/admin/reports`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.json();
}

export async function getAuditLogs(limit = 100) {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/admin/audit-logs?limit=${limit}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.json();
}

// ========== PROFIL SEKOLAH API ==========
/**
 * Mengambil data profil sekolah untuk tampilan publik.
 *
 * Endpoint : GET {API_URL}/profil-sekolah
 * Method   : GET
 * Header    : - (endpoint publik, tanpa token)
 * Parameter : -
 *
 * @returns {Promise<Object>} Respons JSON berisi data profil sekolah.
 */
export async function getProfilSekolah() {
  const response = await fetch(`${API_URL}/profil-sekolah`);
  return response.json();
}

/**
 * Membuat data profil sekolah (oleh admin).
 *
 * Endpoint : POST {API_URL}/profil-sekolah
 * Method   : POST
 * Header    : Content-Type: application/json, Authorization: Bearer <token>
 * Parameter : `data` berisi field profil sekolah.
 *
 * @param {Object} data - Data profil sekolah baru yang dikirim sebagai JSON body.
 * @returns {Promise<Object>} Respons JSON backend (profil sekolah yang dibuat).
 */
export async function createProfilSekolah(data) {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/profil-sekolah`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  return response.json();
}

/**
 * Memperbarui data profil sekolah (oleh admin).
 *
 * Endpoint : PUT {API_URL}/profil-sekolah
 * Method   : PUT
 * Header    : Content-Type: application/json, Authorization: Bearer <token>
 * Parameter : `data` berisi field profil sekolah yang diperbarui.
 *
 * @param {Object} data - Data profil sekolah yang diperbarui sebagai JSON body.
 * @returns {Promise<Object>} Respons JSON backend (profil sekolah yang diperbarui).
 */
export async function updateProfilSekolah(data) {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/profil-sekolah`, {
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
/**
 * Mengambil daftar pengguna (user) yang difilter berdasarkan peran (role).
 *
 * Endpoint : GET {API_URL}/admin/users?role={role}
 * Method   : GET
 * Header    : Authorization: Bearer <token>
 * Parameter : `role` peran pengguna yang dijadikan filter query string.
 *
 * @param {string} role - Peran pengguna yang akan difilter (mis. "guru", "siswa").
 * @returns {Promise<Object>} Respons JSON berisi daftar pengguna sesuai role.
 */
export async function getUsersByRole(role) {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/admin/users?role=${role}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return response.json();
}

/**
 * Membuat akun pengguna (user) baru (oleh admin).
 *
 * Endpoint : POST {API_URL}/admin/users
 * Method   : POST
 * Header    : Content-Type: application/json, Authorization: Bearer <token>
 * Parameter : `data` berisi field akun pengguna.
 *
 * @param {Object} data - Data pengguna baru yang dikirim sebagai JSON body.
 * @returns {Promise<Object>} Respons JSON backend (pengguna yang dibuat).
 */
export async function createUser(data) {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/admin/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  return response.json();
}

/**
 * Memperbarui akun pengguna (user) berdasarkan id (oleh admin).
 *
 * Endpoint : PUT {API_URL}/admin/users/{id}
 * Method   : PUT
 * Header    : Content-Type: application/json, Authorization: Bearer <token>
 * Parameter : `id` id pengguna; `data` field yang diperbarui.
 *
 * @param {string|number} id - ID pengguna yang akan diperbarui.
 * @param {Object} data - Data pengguna yang diperbarui sebagai JSON body.
 * @returns {Promise<Object>} Respons JSON backend (pengguna yang diperbarui).
 */
export async function updateUser(id, data) {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/admin/users/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  return response.json();
}

/**
 * Menghapus akun pengguna (user) berdasarkan id (oleh admin).
 *
 * Endpoint : DELETE {API_URL}/admin/users/{id}
 * Method   : DELETE
 * Header    : Authorization: Bearer <token>
 * Parameter : `id` id pengguna yang akan dihapus.
 *
 * @param {string|number} id - ID pengguna yang akan dihapus.
 * @returns {Promise<Object>} Respons JSON backend (status penghapusan).
 */
export async function deleteUser(id) {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/admin/users/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return response.json();
}

/**
 * Mereset kata sandi seorang pengguna berdasarkan id (oleh admin).
 *
 * Endpoint : PUT {API_URL}/admin/users/{id}/reset-password
 * Method   : PUT
 * Header    : Content-Type: application/json, Authorization: Bearer <token>
 * Parameter : `id` id pengguna; `data` opsional berisi kata sandi baru.
 *
 * @param {string|number} id - ID pengguna yang kata sandinya direset.
 * @param {Object} [data={}] - Data reset password opsional sebagai JSON body.
 * @returns {Promise<Object>} Respons JSON backend (status reset password).
 */
export async function resetUserPassword(id, data = {}) {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/admin/users/${id}/reset-password`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  return response.json();
}

/**
 * Mengambil daftar permintaan reset kata sandi yang masuk (untuk admin).
 *
 * Endpoint : GET {API_URL}/admin/password-reset-requests?status={status}
 * Method   : GET
 * Header    : Authorization: Bearer <token>
 * Parameter : `status` filter status permintaan (default "pending").
 *
 * @param {string} [status="pending"] - Status permintaan yang difilter.
 * @returns {Promise<Object>} Respons JSON berisi daftar permintaan reset password.
 */
export async function getPasswordResetRequests(status = "pending") {
  const token = localStorage.getItem("token");
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  const response = await fetch(`${API_URL}/admin/password-reset-requests?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.json();
}

/**
 * Menyetujui & memproses sebuah permintaan reset kata sandi (oleh admin).
 *
 * Endpoint : PUT {API_URL}/admin/password-reset-requests/{id}/reset
 * Method   : PUT
 * Header    : Content-Type: application/json, Authorization: Bearer <token>
 * Parameter : `id` id permintaan; `data` opsional berisi kata sandi baru.
 *
 * @param {string|number} id - ID permintaan reset yang diproses.
 * @param {Object} [data={}] - Data pemrosesan opsional sebagai JSON body.
 * @returns {Promise<Object>} Respons JSON backend (status pemrosesan permintaan).
 */
export async function processPasswordResetRequest(id, data = {}) {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/admin/password-reset-requests/${id}/reset`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  return response.json();
}

/**
 * Menolak sebuah permintaan reset kata sandi (oleh admin).
 *
 * Endpoint : PUT {API_URL}/admin/password-reset-requests/{id}/reject
 * Method   : PUT
 * Header    : Content-Type: application/json, Authorization: Bearer <token>
 * Parameter : `id` id permintaan; `data` opsional berisi alasan penolakan.
 *
 * @param {string|number} id - ID permintaan reset yang ditolak.
 * @param {Object} [data={}] - Data penolakan opsional sebagai JSON body.
 * @returns {Promise<Object>} Respons JSON backend (status penolakan permintaan).
 */
export async function rejectPasswordResetRequest(id, data = {}) {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/admin/password-reset-requests/${id}/reject`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  return response.json();
}

// ========== GURU VERIFICATION & ATTENDANCE API ==========
/**
 * Mengambil daftar pendaftaran guru yang menunggu verifikasi admin.
 *
 * Endpoint : GET {API_URL}/admin-guru/registrations
 * Method   : GET
 * Header    : Authorization: Bearer <token>
 * Parameter : -
 *
 * @returns {Promise<Object>} Respons JSON berisi daftar pendaftaran guru.
 */
export async function getGuruRegistrations() {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/admin-guru/registrations`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.json();
}

/**
 * Memverifikasi (menyetujui/menolak) pendaftaran guru berdasarkan userId.
 *
 * Endpoint : PUT {API_URL}/admin-guru/registrations/{userId}
 * Method   : PUT
 * Header    : Content-Type: application/json, Authorization: Bearer <token>
 * Parameter : `userId` id pengguna guru; `data` keputusan verifikasi.
 *
 * @param {string|number} userId - ID pengguna guru yang diverifikasi.
 * @param {Object} data - Data keputusan verifikasi sebagai JSON body.
 * @returns {Promise<Object>} Respons JSON backend (status verifikasi).
 */
export async function verifyGuruRegistration(userId, data) {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/admin-guru/registrations/${userId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  return response.json();
}

/**
 * Menghapus pendaftaran guru berdasarkan userId (oleh admin).
 *
 * Endpoint : DELETE {API_URL}/admin-guru/registrations/{userId}
 * Method   : DELETE
 * Header    : Authorization: Bearer <token>
 * Parameter : `userId` id pengguna guru yang dihapus.
 *
 * @param {string|number} userId - ID pengguna guru yang akan dihapus.
 * @returns {Promise<Object>} Respons JSON backend (status penghapusan).
 */
export async function deleteGuruRegistration(userId) {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/admin-guru/registrations/${userId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.json();
}

/**
 * Mengambil daftar jadwal mengajar guru (sudut pandang admin).
 *
 * Endpoint : GET {API_URL}/admin-guru/jadwal
 * Method   : GET
 * Header    : Authorization: Bearer <token>
 * Parameter : -
 *
 * @returns {Promise<Object>} Respons JSON berisi daftar jadwal mengajar.
 */
export async function getGuruJadwalAdmin() {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/admin-guru/jadwal`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.json();
}

/**
 * Membuat jadwal mengajar guru baru (oleh admin).
 *
 * Endpoint : POST {API_URL}/admin-guru/jadwal
 * Method   : POST
 * Header    : Content-Type: application/json, Authorization: Bearer <token>
 * Parameter : `data` berisi field jadwal mengajar.
 *
 * @param {Object} data - Data jadwal mengajar baru sebagai JSON body.
 * @returns {Promise<Object>} Respons JSON backend (jadwal yang dibuat).
 */
export async function createGuruJadwal(data) {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/admin-guru/jadwal`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  return response.json();
}

/**
 * Memperbarui jadwal mengajar guru berdasarkan id (oleh admin).
 *
 * Endpoint : PUT {API_URL}/admin-guru/jadwal/{id}
 * Method   : PUT
 * Header    : Content-Type: application/json, Authorization: Bearer <token>
 * Parameter : `id` id jadwal; `data` field yang diperbarui.
 *
 * @param {string|number} id - ID jadwal mengajar yang akan diperbarui.
 * @param {Object} data - Data jadwal yang diperbarui sebagai JSON body.
 * @returns {Promise<Object>} Respons JSON backend (jadwal yang diperbarui).
 */
export async function updateGuruJadwal(id, data) {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/admin-guru/jadwal/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  return response.json();
}

/**
 * Menghapus jadwal mengajar guru berdasarkan id (oleh admin).
 *
 * Endpoint : DELETE {API_URL}/admin-guru/jadwal/{id}
 * Method   : DELETE
 * Header    : Authorization: Bearer <token>
 * Parameter : `id` id jadwal yang akan dihapus.
 *
 * @param {string|number} id - ID jadwal mengajar yang akan dihapus.
 * @returns {Promise<Object>} Respons JSON backend (status penghapusan).
 */
export async function deleteGuruJadwal(id) {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/admin-guru/jadwal/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.json();
}

/**
 * Mengambil data dashboard portal guru (untuk guru yang sedang login).
 *
 * Endpoint : GET {API_URL}/guru-portal/dashboard
 * Method   : GET
 * Header    : Authorization: Bearer <token>
 * Parameter : -
 *
 * @returns {Promise<Object>} Respons JSON berisi ringkasan dashboard guru.
 */
export async function getGuruDashboard() {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/guru-portal/dashboard`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.json();
}

/**
 * Memperbarui profil guru yang sedang login (portal guru).
 *
 * Endpoint : PUT {API_URL}/guru-portal/profile
 * Method   : PUT
 * Header    : Content-Type: application/json, Authorization: Bearer <token>
 * Parameter : `data` berisi field profil guru yang diperbarui.
 *
 * @param {Object} data - Data profil guru yang diperbarui sebagai JSON body.
 * @returns {Promise<Object>} Respons JSON backend (profil guru yang diperbarui).
 */
export async function updateGuruProfile(data) {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/guru-portal/profile`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  return response.json();
}

/**
 * Mengirim data absensi siswa yang dicatat oleh guru (portal guru).
 *
 * Endpoint : POST {API_URL}/guru-portal/absensi
 * Method   : POST
 * Header    : Content-Type: application/json, Authorization: Bearer <token>
 * Parameter : `data` berisi data absensi (mis. kelas, tanggal, daftar kehadiran).
 *
 * @param {Object} data - Data absensi siswa sebagai JSON body.
 * @returns {Promise<Object>} Respons JSON backend (status penyimpanan absensi).
 */
export async function submitAbsensiGuru(data) {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/guru-portal/absensi`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  return response.json();
}

/**
 * Mengambil rekapitulasi absensi (portal guru) dengan filter query opsional.
 *
 * Endpoint : GET {API_URL}/guru-portal/rekap[?<query>]
 * Method   : GET
 * Header    : Authorization: Bearer <token>
 * Parameter : `params` objek filter yang diubah menjadi query string; field
 *             dengan nilai undefined/null/"" diabaikan.
 *
 * @param {Object} [params={}] - Parameter filter rekap (mis. { kelas, bulan, tahun }).
 * @returns {Promise<Object>} Respons JSON berisi data rekap absensi.
 */
export async function getRekapAbsensiGuru(params = {}) {
  const token = localStorage.getItem("token");
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.append(key, value);
  });

  const suffix = query.toString() ? `?${query.toString()}` : "";
  const response = await fetch(`${API_URL}/guru-portal/rekap${suffix}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.json();
}

/**
 * Membuat akun siswa secara massal oleh guru (portal guru).
 *
 * Endpoint : POST {API_URL}/guru-portal/akun-siswa
 * Method   : POST
 * Header    : Content-Type: application/json, Authorization: Bearer <token>
 * Parameter : `data` berisi daftar/identitas siswa yang akan dibuatkan akun.
 *
 * @param {Object} data - Data pembuatan akun siswa sebagai JSON body.
 * @returns {Promise<Object>} Respons JSON backend (hasil pembuatan akun siswa).
 */
export async function createGuruStudentAccounts(data) {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/guru-portal/akun-siswa`, {
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
/**
 * Helper internal untuk membangun query string dari objek parameter.
 *
 * Field dengan nilai undefined/null/string kosong ("") diabaikan. Jika tidak ada
 * field valid, dikembalikan string kosong; jika ada, dikembalikan diawali "?".
 *
 * @param {Object} [params={}] - Objek key-value yang akan dijadikan query string.
 * @returns {string} Query string siap pakai (mis. "?a=1&b=2") atau "" bila kosong.
 */
function buildQuery(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.append(key, value);
  });
  const text = query.toString();
  return text ? `?${text}` : "";
}

/**
 * Mengambil data dashboard portal siswa (untuk siswa yang sedang login).
 *
 * Endpoint : GET {API_URL}/portal/siswa/dashboard
 * Method   : GET
 * Header    : Authorization: Bearer <token>
 * Parameter : -
 *
 * @returns {Promise<Object>} Respons JSON berisi ringkasan dashboard siswa.
 */
export async function getSiswaDashboard() {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/portal/siswa/dashboard`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.json();
}

/**
 * Memperbarui profil siswa yang sedang login (portal siswa).
 *
 * Endpoint : PUT {API_URL}/portal/siswa/profile
 * Method   : PUT
 * Header    : Content-Type: application/json, Authorization: Bearer <token>
 * Parameter : `data` berisi field profil siswa yang diperbarui.
 *
 * @param {Object} data - Data profil siswa yang diperbarui sebagai JSON body.
 * @returns {Promise<Object>} Respons JSON backend (profil siswa yang diperbarui).
 */
export async function updateSiswaProfile(data) {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/portal/siswa/profile`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  return response.json();
}

/**
 * Mengambil data absensi siswa yang sedang login (portal siswa) dengan filter opsional.
 *
 * Endpoint : GET {API_URL}/portal/siswa/absensi[?<query>]
 * Method   : GET
 * Header    : Authorization: Bearer <token>
 * Parameter : `params` objek filter yang diubah menjadi query string via buildQuery().
 *
 * @param {Object} [params={}] - Parameter filter absensi (mis. { bulan, tahun }).
 * @returns {Promise<Object>} Respons JSON berisi data absensi siswa.
 */
export async function getSiswaAbsensi(params = {}) {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/portal/siswa/absensi${buildQuery(params)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.json();
}

/**
 * Mengambil data dashboard portal orang tua (untuk orang tua yang sedang login).
 *
 * Endpoint : GET {API_URL}/portal/orangtua/dashboard
 * Method   : GET
 * Header    : Authorization: Bearer <token>
 * Parameter : -
 *
 * @returns {Promise<Object>} Respons JSON berisi ringkasan dashboard orang tua.
 */
export async function getOrangTuaDashboard() {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/portal/orangtua/dashboard`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.json();
}

/**
 * Memperbarui profil orang tua yang sedang login (portal orang tua).
 *
 * Endpoint : PUT {API_URL}/portal/orangtua/profile
 * Method   : PUT
 * Header    : Content-Type: application/json, Authorization: Bearer <token>
 * Parameter : `data` berisi field profil orang tua yang diperbarui.
 *
 * @param {Object} data - Data profil orang tua yang diperbarui sebagai JSON body.
 * @returns {Promise<Object>} Respons JSON backend (profil orang tua yang diperbarui).
 */
export async function updateOrangTuaProfile(data) {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/portal/orangtua/profile`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  return response.json();
}

/**
 * Mengambil data absensi anak (portal orang tua) dengan filter opsional.
 *
 * Endpoint : GET {API_URL}/portal/orangtua/absensi[?<query>]
 * Method   : GET
 * Header    : Authorization: Bearer <token>
 * Parameter : `params` objek filter yang diubah menjadi query string via buildQuery().
 *
 * @param {Object} [params={}] - Parameter filter absensi (mis. { bulan, tahun }).
 * @returns {Promise<Object>} Respons JSON berisi data absensi anak.
 */
export async function getOrangTuaAbsensi(params = {}) {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/portal/orangtua/absensi${buildQuery(params)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.json();
}

/**
 * Mengambil data dashboard portal kepala sekolah dengan filter opsional.
 *
 * Endpoint : GET {API_URL}/portal/kepala-sekolah/dashboard[?<query>]
 * Method   : GET
 * Header    : Authorization: Bearer <token>
 * Parameter : `params` objek filter yang diubah menjadi query string via buildQuery().
 *
 * @param {Object} [params={}] - Parameter filter dashboard (mis. { periode }).
 * @returns {Promise<Object>} Respons JSON berisi ringkasan dashboard kepala sekolah.
 */
export async function getKepalaSekolahDashboard(params = {}) {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/portal/kepala-sekolah/dashboard${buildQuery(params)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.json();
}

/**
 * Memperbarui profil kepala sekolah yang sedang login (portal kepala sekolah).
 *
 * Endpoint : PUT {API_URL}/portal/kepala-sekolah/profile
 * Method   : PUT
 * Header    : Content-Type: application/json, Authorization: Bearer <token>
 * Parameter : `data` berisi field profil kepala sekolah yang diperbarui.
 *
 * @param {Object} data - Data profil kepala sekolah yang diperbarui sebagai JSON body.
 * @returns {Promise<Object>} Respons JSON backend (profil kepala sekolah yang diperbarui).
 */
export async function updateKepalaSekolahProfile(data) {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/portal/kepala-sekolah/profile`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  return response.json();
}
