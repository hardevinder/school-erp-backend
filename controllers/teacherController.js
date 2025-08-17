// controllers/teacherController.js
const { Op } = require('sequelize');
const { User, Role, Employee, Department } = require('../models');

/**
 * GET /teachers
 * Query:
 *  - q: search (employee.name, user.name, username, email)
 *  - active: "true"/"1" or "false"/"0"
 *  - minimal: "1" -> [{ id, name }]
 *
 * Notes:
 * - Aliases must match your models: User.hasOne(Employee, { as: 'employee' }), Employee.belongsTo(Department, { as: 'department' })
 * - Uses Op.like for MySQL (case-insensitive with common collations).
 */
exports.getTeachers = async (req, res) => {
  try {
    const { q, active, minimal } = req.query;

    const userWhere = {};

    // Optional active filter (adapt if your status is different)
    if (typeof active === 'string') {
      if (active === 'true' || active === '1') userWhere.status = { [Op.or]: [true, 1, 'ENABLED'] };
      if (active === 'false' || active === '0') userWhere.status = { [Op.or]: [false, 0, 'DISABLED'] };
    }

    const search = (q || '').trim();
    if (search) {
      userWhere[Op.or] = [
        { name:     { [Op.like]: `%${search}%` } },
        { username: { [Op.like]: `%${search}%` } },
        { email:    { [Op.like]: `%${search}%` } },
      ];
    }

    const rows = await User.findAll({
      attributes: ['id', 'name', 'username', 'email', 'status'],
      where: userWhere,
      include: [
        // Must be teachers
        {
          model: Role,
          as: 'roles',
          required: true,
          where: { slug: 'teacher' },
          attributes: [],
          through: { attributes: [] },
        },
        // Optional Employee record (for display name/department)
        {
          model: Employee,
          as: 'employee',
          attributes: ['id', 'name', 'department_id'], // removed employee_code
          required: false,
          include: [
            {
              model: Department,
              as: 'department',
              attributes: ['id', 'name'],
              required: false,
            },
          ],
          // Allow search to match employee.name too
          ...(search && { where: { name: { [Op.like]: `%${search}%` } } }),
        },
      ],
      order: [
        [{ model: Employee, as: 'employee' }, 'name', 'ASC'],
        ['name', 'ASC'],
      ],
    });

    const teachers = rows.map((u) => {
      const emp = u.employee;
      const displayName = (emp?.name || u.name || '').trim();
      return {
        id: emp?.id ?? u.id,          // prefer Employee.id for dropdowns/availability
        employee_id: emp?.id ?? null,
        user_id: u.id,
        name: displayName,
        username: u.username,
        email: u.email,
        status: u.status,
        department: emp?.department
          ? { id: emp.department.id, name: emp.department.name }
          : null,
      };
    });

    if (minimal === '1') {
      return res.status(200).json({
        teachers: teachers.map((t) => ({ id: t.employee_id || t.user_id, name: t.name })),
      });
    }

    res.status(200).json({ teachers });
  } catch (error) {
    console.error('Error fetching teachers:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
