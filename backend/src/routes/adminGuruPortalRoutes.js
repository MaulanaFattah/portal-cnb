const express = require("express");
const router = express.Router();

const guruPortalController = require("../controllers/guruPortalController");
const { verifyToken, onlyAdmin } = require("../middlewares/authMiddleware");

router.get("/registrations", verifyToken, onlyAdmin, guruPortalController.getGuruRegistrations);
router.put("/registrations/:userId", verifyToken, onlyAdmin, guruPortalController.verifyGuruRegistration);
router.delete("/registrations/:userId", verifyToken, onlyAdmin, guruPortalController.deleteGuruRegistration);
router.get("/jadwal", verifyToken, onlyAdmin, guruPortalController.getJadwalAdmin);
router.post("/jadwal", verifyToken, onlyAdmin, guruPortalController.createJadwal);
router.put("/jadwal/:id", verifyToken, onlyAdmin, guruPortalController.updateJadwal);
router.delete("/jadwal/:id", verifyToken, onlyAdmin, guruPortalController.deleteJadwal);

module.exports = router;
