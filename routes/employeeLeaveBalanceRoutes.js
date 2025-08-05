const express = require('express');
const router = express.Router();
const controller = require('../controllers/employeeLeaveBalanceController');
const { authenticateUser, authorizeRole } = require('../middlewares/authMiddleware');

const allowHR = authorizeRole(['hr', 'superadmin']);

router.get('/', authenticateUser, allowHR, controller.getEmployeeLeaveBalances);
router.post('/', authenticateUser, allowHR, controller.createEmployeeLeaveBalance);
router.put('/:id', authenticateUser, allowHR, controller.updateEmployeeLeaveBalance);
router.delete('/:id', authenticateUser, allowHR, controller.deleteEmployeeLeaveBalance);

module.exports = router;
