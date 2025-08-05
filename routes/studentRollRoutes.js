const express = require("express");
const router = express.Router();
const studentRollController = require("../controllers/studentRollController");
const { authenticateUser } = require("../middlewares/authMiddleware");

// ✅ Only authenticated users allowed (Incharge checked via DB in controller)
router.get(
  "/roll-numbers",
  authenticateUser,
  studentRollController.getStudentsForRollNumber
);

router.post(
  "/roll-numbers/update",
  authenticateUser,
  studentRollController.updateRollNumbers
);

router.put(
  "/:student_id/toggle-visibility",
  authenticateUser,
  studentRollController.toggleVisibility
);

module.exports = router;
