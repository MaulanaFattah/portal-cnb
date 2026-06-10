import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AdminSidebar from "../components/AdminSidebar";
import { getAdminDashboard, logout } from "../services/api";

function DashboardAdmin() {
    const navigate = useNavigate();

    const [dashboard, setDashboard] = useState({
        admin: "",
        totalGuru: 0,
        totalSiswa: 0,
        totalAdmin: 0,
        loginHariIni: 0
    });

    useEffect(() => {
        async function fetchDashboard() {
            const result = await getAdminDashboard();

            if (!result.success) {
                alert(result.message);
                navigate("/admin-login");
                return;
            }

            setDashboard(result.data);
        }

        fetchDashboard();
    }, [navigate]);

    const handleLogout = () => {
        logout();
        navigate("/admin-login");
    };

    return (
        <div className="dashboard-layout">
      <AdminSidebar active="/dashboard-admin" />

<main className="dashboard-content">
                <div className="dashboard-header">
                    <div>
                        <h1>Dashboard Admin</h1>
                        <p>Selamat datang, {dashboard.admin}</p>
                    </div>

                    <div className="dashboard-actions">
                        <Link to="/" className="btn secondary">
                            Website
                        </Link>

                        <button onClick={handleLogout} className="btn primary">
                            Logout
                        </button>
                    </div>
                </div>

                <div className="dashboard-stats">
                    <div className="stat-box">
                        <h4>Total Guru</h4>
                        <h2>{dashboard.totalGuru}</h2>
                    </div>

                    <div className="stat-box">
                        <h4>Total Siswa</h4>
                        <h2>{dashboard.totalSiswa}</h2>
                    </div>

                    <div className="stat-box">
                        <h4>Total Admin</h4>
                        <h2>{dashboard.totalAdmin}</h2>
                    </div>

                    <div className="stat-box">
                        <h4>Login Hari Ini</h4>
                        <h2>{dashboard.loginHariIni}</h2>
                    </div>
                </div>

                <div className="dashboard-card">
                    <h3>Aktivitas Terbaru</h3>

                    <ul>
                        <li>Dashboard berhasil terhubung ke backend.</li>
                        <li>Data admin diambil dari database MySQL.</li>
                        <li>Token JWT aktif dan tervalidasi.</li>
                    </ul>
                </div>
            </main>
        </div>
    );
}

export default DashboardAdmin;
