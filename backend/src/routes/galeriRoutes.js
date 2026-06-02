const express = require("express");
const router = express.Router();

const galeriController = require("../controllers/galeriController");
const { verifyToken, onlyAdmin } = require("../middlewares/authMiddleware");

router.get("/", galeriController.getAllGaleri);
router.post("/", verifyToken, onlyAdmin, galeriController.createGaleri);
router.put("/:id", verifyToken, onlyAdmin, galeriController.updateGaleri);
router.delete("/:id", verifyToken, onlyAdmin, galeriController.deleteGaleri);

module.exports = router;
