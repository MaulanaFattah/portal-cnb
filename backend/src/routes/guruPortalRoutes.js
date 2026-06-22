const express = require("express");
const router = express.Router();

const guruPortalController = require("../controllers/guruPortalController");
const { verifyToken, onlyGuru } = require("../middlewares/authMiddleware");

router.get("/dashboard", verifyToken, onlyGuru, guruPortalController.getDashboard);
router.put("/profile", verifyToken, onlyGuru, guruPortalController.updateProfile);
router.post("/absensi", verifyToken, onlyGuru, guruPortalController.submitAbsensi);
router.get("/rekap", verifyToken, onlyGuru, guruPortalController.getRekapAbsensi);
router.post("/akun-siswa", verifyToken, onlyGuru, guruPortalController.createStudentAccounts);

module.exports = router;
