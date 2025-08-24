const { ClassSubjectTeacher, Student, Class, User } = require('../models');
const { Op } = require('sequelize');

const getStudentsForTeacherClasses = async (req, res) => {
  try {
    // Support either req.authUser (your newer pattern) or req.user
    const teacherId = req?.authUser?.id || req?.user?.id;
    if (!teacherId) {
      return res.status(401).json({ error: 'Unauthenticated: teacher id missing.' });
    }

    // Find all class/section assignments for this teacher
    const assignments = await ClassSubjectTeacher.findAll({
      where: { teacher_id: teacherId },
      attributes: ['class_id', 'section_id'],
      raw: true,
    });

    if (!assignments.length) {
      // No classes assigned → return empty list (200) instead of 404
      return res.status(200).json({ students: [] });
    }

    // Deduplicate (class_id, section_id) pairs
    const uniq = new Map();
    for (const a of assignments) {
      uniq.set(`${a.class_id}-${a.section_id}`, a);
    }
    const conditions = Array.from(uniq.values()).map(a => ({
      class_id: a.class_id,
      section_id: a.section_id,
    }));

    // Fetch students in those class/section pairs
    const students = await Student.findAll({
      where: { [Op.or]: conditions },
      include: [
        {
          model: Class,
          as: 'Class',
          attributes: ['class_name'],
        },
        {
          // IMPORTANT: alias must match your association on Student
          // e.g., Student.belongsTo(User, { as: 'userAccount', foreignKey: 'user_id' })
          model: User,
          as: 'userAccount',
          attributes: ['id'],
        },
      ],
      order: [['name', 'ASC']], // optional: stable ordering if you have a 'name' field
    });

    return res.status(200).json({ students });
  } catch (error) {
    console.error('Error fetching students for teacher:', error);
    return res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getStudentsForTeacherClasses,
};
