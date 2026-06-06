const express = require("express");
const router = express.Router();

const portalController = require("../controllers/portalController");
const { verifyToken, onlyAdmin, onlySiswa, onlyOrangTua } = require("../middlewares/authMiddleware");

router.get("/kepala-sekolah/dashboard", verifyToken, onlyAdmin, portalController.getKepalaSekolahDashboard);

router.get("/siswa/dashboard", verifyToken, onlySiswa, portalController.getSiswaDashboard);
router.put("/siswa/profile", verifyToken, onlySiswa, portalController.updateSiswaProfile);
router.get("/siswa/absensi", verifyToken, onlySiswa, portalController.getSiswaAbsensi);

router.get("/orangtua/dashboard", verifyToken, onlyOrangTua, portalController.getOrangTuaDashboard);
router.put("/orangtua/profile", verifyToken, onlyOrangTua, portalController.updateOrangTuaProfile);
router.get("/orangtua/absensi", verifyToken, onlyOrangTua, portalController.getOrangTuaAbsensi);

module.exports = router;
