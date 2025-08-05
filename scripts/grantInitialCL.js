// scripts/grantInitialCL.js
const { Employee, EmployeeLeaveBalance, LeaveType } = require('../models');

const grantCLToAll = async () => {
  try {
    const clType = await LeaveType.findOne({ where: { name: 'Casual Leave' } });

    if (!clType) {
      console.error("❌ Casual Leave not found.");
      return;
    }

    const employees = await Employee.findAll();

    for (const emp of employees) {
      const [balance, created] = await EmployeeLeaveBalance.findOrCreate({
        where: {
          employee_id: emp.id,
          leave_type_id: clType.id,
        },
        defaults: { balance: 12 }
      });

      if (!created) {
        balance.balance = 12;
        await balance.save();
      }

      console.log(`✅ Set 12 CL for ${emp.name}`);
    }

    console.log("🎉 Casual Leave granted to all employees.");
  } catch (err) {
    console.error("❌ Error:", err);
  }
};

grantCLToAll();
