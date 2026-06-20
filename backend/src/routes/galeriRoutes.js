const express = require("express");
const router = express.Router();

const galeriController = require("../controllers/galeriController");
const { verifyToken, onlyAdmin } = require("../middlewares/authMiddleware");
const { handleUploadError, imageUpload } = require("../middlewares/uploadMiddleware");

router.get("/", galeriController.getAllGaleri);
router.post("/", verifyToken, onlyAdmin, imageUpload("galeri").single("image"), handleUploadError, galeriController.createGaleri);
router.put("/:id", verifyToken, onlyAdmin, imageUpload("galeri").single("image"), handleUploadError, galeriController.updateGaleri);
router.delete("/:id", verifyToken, onlyAdmin, galeriController.deleteGaleri);

module.exports = router;
