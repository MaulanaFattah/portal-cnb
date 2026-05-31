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

