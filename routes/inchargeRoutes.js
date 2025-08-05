const express = require('express');
const router = express.Router();
const inchargeController = require('../controllers/inchargeController');
const { authenticateUser, authorizeRole } = require("../middlewares/authMiddleware");

router.post('/assign', authenticateUser, authorizeRole(["academic_coordinator", "superadmin"]), inchargeController.assignIncharge);
router.get('/all', authenticateUser, authorizeRole(["academic_coordinator", "superadmin","teacher"]), inchargeController.getAllIncharges);
router.put('/update/:id', authenticateUser, authorizeRole(["academic_coordinator", "superadmin"]), inchargeController.updateIncharge); // NEW
router.delete('/remove/:id', authenticateUser, authorizeRole(["academic_coordinator", "superadmin"]), inchargeController.removeIncharge);
router.get('/students', authenticateUser, authorizeRole(['teacher', 'superadmin', 'academic_coordinator']), inchargeController.getStudentsForIncharge);



module.exports = router;
