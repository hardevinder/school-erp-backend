const express = require("express");
const router = express.Router();
const controller = require("../controllers/studentRemarksController");
const { authenticateUser } = require("../middlewares/authMiddleware");

// ✅ GET: Fetch students + existing remarks
router.get("/", authenticateUser, controller.getRemarks);

// ✅ POST: Save or update student remarks
router.post("/", authenticateUser, controller.saveRemarks);

module.exports = router;
