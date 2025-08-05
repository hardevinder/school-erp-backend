const express = require("express");
const router = express.Router();
const controller = require("../controllers/examResultController");

const { authenticateUser } = require("../middlewares/authMiddleware");

router.post("/enter-marks", authenticateUser, controller.enterMarks);

module.exports = router;
