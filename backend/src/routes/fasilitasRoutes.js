const express = require("express");
const router = express.Router();

const fasilitasController = require("../controllers/fasilitasController");
const { verifyToken, onlyAdmin } = require("../middlewares/authMiddleware");
const { handleUploadError, imageUpload } = require("../middlewares/uploadMiddleware");

router.get("/", fasilitasController.getAllFasilitas);
router.get("/admin/all", verifyToken, onlyAdmin, fasilitasController.getAllFasilitasAdmin);
router.post("/", verifyToken, onlyAdmin, imageUpload("fasilitas").single("image"), handleUploadError, fasilitasController.createFasilitas);
router.put("/:id", verifyToken, onlyAdmin, imageUpload("fasilitas").single("image"), handleUploadError, fasilitasController.updateFasilitas);
router.delete("/:id", verifyToken, onlyAdmin, fasilitasController.deleteFasilitas);

module.exports = router;