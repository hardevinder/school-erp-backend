// controllers/substitutionController.js
const { UniqueConstraintError, fn, col } = require('sequelize');
const models = require('../models');
const { Substitution, User, Class, Subject, Student, Period } = models;

/** When teacherId/original_teacherId are Users.id, we don't need Employee mapping here */
function getUserIdFromReq(req) {
  return req.user?.id || null;
}

/** Create or update a substitution (teacherId & original_teacherId are USERS IDs) */
exports.createSubstitution = async (req, res) => {
  try {
    const { date, periodId, classId, teacherId, original_teacherId, subjectId, day, published } = req.body;

    const where = { date, day, periodId, classId };
    const existing = await Substitution.findOne({ where });

    let substitution;
    if (existing) {
      substitution = await existing.update({ teacherId, original_teacherId, subjectId, published });
      res.status(200).json(substitution);
    } else {
      try {
        substitution = await Substitution.create({
          date, periodId, classId, teacherId, original_teacherId, subjectId, day, published
        });
        res.status(201).json(substitution);
      } catch (err) {
        if (err instanceof UniqueConstraintError) {
          const again = await Substitution.findOne({ where });
          substitution = await again.update({ teacherId, original_teacherId, subjectId, published });
          res.status(200).json(substitution);
        } else {
          throw err;
        }
      }
    }

    // Notifications (rooms keyed by user id still fine)
    const io = req.app.get('socketio');
    if (io) {
      const [periodRecord, classRecord] = await Promise.all([
        Period.findByPk(periodId, { attributes: ['period_name'] }),
        Class.findByPk(classId, { attributes: ['class_name'] })
      ]);

      const message = existing
        ? `Substitution updated for ${date} in period ${periodRecord?.period_name} and class ${classRecord?.class_name}.`
        : `You have been assigned a substitution on ${date} in period ${periodRecord?.period_name} and class ${classRecord?.class_name}.`;

      const payload = {
        substitutionId: substitution.id,
        date, periodId, classId, subjectId,
        periodName: periodRecord?.period_name,
        className: classRecord?.class_name,
        message,
      };

      const eventName = existing ? 'substitutionUpdated' : 'newSubstitution';
      io.to(`teacher-${teacherId}`).emit(eventName, payload);
      console.log(`Notification sent to teacher-${teacherId} (${eventName})`, payload);
    }
  } catch (error) {
    console.error('Error creating/updating substitution:', error);
    res.status(500).json({ error: 'Failed to create/update substitution' });
  }
};

/** Helper: attributes to compute display names from User includes */
const displayNameAttrs = {
  include: [
    [ col('Teacher.name'), 'teacher_display_name' ],
    [ col('OriginalTeacher.name'), 'original_teacher_display_name' ],
  ],
};

exports.getAllSubstitutions = async (req, res) => {
  try {
    const substitutions = await Substitution.findAll({
      attributes: { include: displayNameAttrs.include },
      include: [
        { model: User,    as: 'Teacher',         attributes: ['id', 'name', 'email'] },
        { model: User,    as: 'OriginalTeacher', attributes: ['id', 'name', 'email'] },
        { model: Subject, as: 'Subject',         attributes: ['id', 'name'] },
        { model: Class,   as: 'Class',           attributes: ['class_name'] },
        { model: Period,  as: 'Period',          attributes: ['period_name'] },
      ],
      order: [['date', 'ASC'], ['periodId', 'ASC']]
    });
    return res.status(200).json(substitutions);
  } catch (error) {
    console.error('getAllSubstitutions error:', error);
    return res.status(500).json({ error: error.message });
  }
};

exports.getSubstitutionById = async (req, res) => {
  try {
    const { id } = req.params;
    const substitution = await Substitution.findByPk(id, {
      attributes: { include: displayNameAttrs.include },
      include: [
        { model: User,    as: 'Teacher',         attributes: ['id', 'name', 'email'] },
        { model: User,    as: 'OriginalTeacher', attributes: ['id', 'name', 'email'] },
        { model: Subject, as: 'Subject',         attributes: ['id', 'name'] },
        { model: Class,   as: 'Class',           attributes: ['class_name'] },
        { model: Period,  as: 'Period',          attributes: ['period_name'] }
      ]
    });
    if (!substitution) return res.status(404).json({ error: 'Substitution not found' });
    res.status(200).json(substitution);
  } catch (error) {
    console.error('Error retrieving substitution:', error);
    res.status(500).json({ error: 'Failed to retrieve substitution' });
  }
};

exports.updateSubstitution = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, periodId, classId, teacherId, original_teacherId, subjectId, day, published } = req.body;

    const substitution = await Substitution.findByPk(id);
    if (!substitution) return res.status(404).json({ error: 'Substitution not found' });

    await substitution.update({ date, periodId, classId, teacherId, original_teacherId, subjectId, day, published });
    res.status(200).json(substitution);

    // Notifications
    const io = req.app.get('socketio');
    if (io) {
      const [periodRecord, classRecord] = await Promise.all([
        Period.findByPk(periodId, { attributes: ['period_name'] }),
        Class.findByPk(classId, { attributes: ['class_name'] })
      ]);

      const payload = {
        substitutionId: substitution.id,
        date, periodId, classId, subjectId,
        periodName: periodRecord?.period_name,
        className: classRecord?.class_name,
        message: `Substitution updated for ${date} in period ${periodRecord?.period_name} and class ${classRecord?.class_name}.`,
      };

      io.to(`teacher-${teacherId}`).emit('substitutionUpdated', payload);
      console.log(`Notification sent to teacher-${teacherId} (update)`, payload);
    }
  } catch (error) {
    console.error('Error updating substitution:', error);
    res.status(500).json({ error: 'Failed to update substitution' });
  }
};

exports.deleteSubstitution = async (req, res) => {
  try {
    const { id } = req.params;
    const substitution = await Substitution.findByPk(id);
    if (!substitution) return res.status(404).json({ error: 'Substitution not found' });

    const { teacherId, date, periodId, classId } = substitution;

    const [periodRecord, classRecord] = await Promise.all([
      Period.findByPk(periodId, { attributes: ['period_name'] }),
      Class.findByPk(classId, { attributes: ['class_name'] })
    ]);

    await substitution.destroy();
    res.status(200).json({ message: 'Substitution deleted successfully' });

    const io = req.app.get('socketio');
    if (io) {
      const payload = {
        substitutionId: id,
        date, periodId, classId,
        periodName: periodRecord?.period_name,
        className: classRecord?.class_name,
        message: `Substitution on ${date} in period ${periodRecord?.period_name} and class ${classRecord?.class_name} has been removed.`,
      };
      io.to(`teacher-${teacherId}`).emit('substitutionDeleted', payload);
      console.log(`Notification sent to teacher-${teacherId} (delete)`, payload);
    }
  } catch (error) {
    console.error('Error deleting substitution:', error);
    res.status(500).json({ error: 'Failed to delete substitution' });
  }
};

/** GET /substitutions/by-date?date=YYYY-MM-DD [&published=true] */
exports.getSubstitutionsByDate = async (req, res) => {
  try {
    const { date, published } = req.query;
    if (!date) return res.status(400).json({ error: 'Date query parameter is required' });

    const where = { date };
    if (published === 'true') where.published = true;

    const substitutions = await Substitution.findAll({
      where,
      attributes: { include: displayNameAttrs.include },
      include: [
        { model: User,    as: 'Teacher',         attributes: ['id', 'name', 'email'] },
        { model: User,    as: 'OriginalTeacher', attributes: ['id', 'name', 'email'] }, // ✅ ensure join
        { model: Class,   as: 'Class',           attributes: ['class_name'] },
        { model: Subject, as: 'Subject',         attributes: ['name'] },
        { model: Period,  as: 'Period',          attributes: ['period_name'] }
      ],
      order: [['periodId', 'ASC']]
    });

    res.status(200).json(substitutions);
  } catch (error) {
    console.error('Error retrieving substitutions by date:', error);
    res.status(500).json({ error: 'Failed to retrieve substitutions by date' });
  }
};

/** GET /substitutions/by-date/original?date=YYYY-MM-DD */
exports.getSubstitutionsForOriginalTeacherByDate = async (req, res) => {
  try {
    const { date, published } = req.query;
    if (!date) return res.status(400).json({ error: 'Date query parameter is required' });

    const userId = getUserIdFromReq(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const where = { date, original_teacherId: userId };
    if (published === 'true') where.published = true;

    const substitutions = await Substitution.findAll({
      where,
      attributes: { include: displayNameAttrs.include },
      include: [
        { model: User,    as: 'Teacher',         attributes: ['id', 'name', 'email'] },
        { model: User,    as: 'OriginalTeacher', attributes: ['id', 'name', 'email'] }, // ✅ ensure join
        { model: Class,   as: 'Class',           attributes: ['class_name'] },
        { model: Subject, as: 'Subject',         attributes: ['name'] },
        { model: Period,  as: 'Period',          attributes: ['period_name'] },
      ],
      order: [['periodId', 'ASC']]
    });

    res.status(200).json(substitutions);
  } catch (error) {
    console.error('Error retrieving substitutions for original teacher by date:', error);
    res.status(500).json({ error: 'Failed to retrieve substitutions for original teacher by date' });
  }
};

/** GET /substitutions/by-date/teacher?date=YYYY-MM-DD */
exports.getSubstitutionsForTeacherByDate = async (req, res) => {
  try {
    const { date, published } = req.query;
    if (!date) return res.status(400).json({ error: 'Date query parameter is required' });

    const userId = getUserIdFromReq(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const where = { date, teacherId: userId };
    if (published === 'true') where.published = true;

    const substitutions = await Substitution.findAll({
      where,
      attributes: { include: displayNameAttrs.include },
      include: [
        { model: User,    as: 'Teacher',         attributes: ['id', 'name', 'email'] },
        { model: User,    as: 'OriginalTeacher', attributes: ['id', 'name', 'email'] },
        { model: Class,   as: 'Class',           attributes: ['class_name'] },
        { model: Subject, as: 'Subject',         attributes: ['name'] },
        { model: Period,  as: 'Period',          attributes: ['period_name'] },
      ],
      order: [['periodId', 'ASC']]
    });

    res.status(200).json(substitutions);
  } catch (error) {
    console.error('Error retrieving substitutions for teacher by date:', error);
    res.status(500).json({ error: 'Failed to retrieve substitutions for teacher by date' });
  }
};

/** Student view: GET /substitutions/student[?date=YYYY-MM-DD] */
exports.getStudentSubstitutions = async (req, res) => {
  try {
    const admissionNumber = req.user.username;
    const student = await Student.findOne({ where: { admission_number: admissionNumber } });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const classId = student.class_id;
    const { date, published } = req.query;

    const where = { classId };
    if (date) where.date = date;
    if (published === 'true') where.published = true;

    const substitutionRecords = await Substitution.findAll({
      where,
      attributes: { include: displayNameAttrs.include },
      include: [
        { model: User,    as: 'Teacher',         attributes: ['id', 'name', 'email'] },
        { model: User,    as: 'OriginalTeacher', attributes: ['id', 'name', 'email'] },
        { model: Class,   as: 'Class',           attributes: ['class_name'] },
        { model: Subject, as: 'Subject',         attributes: ['name'] },
        { model: Period,  as: 'Period',          attributes: ['period_name'] },
      ],
      order: [['date', 'ASC'], ['periodId', 'ASC']]
    });

    res.status(200).json(substitutionRecords);
  } catch (error) {
    console.error('Error retrieving substitutions for student:', error);
    res.status(500).json({ error: 'Failed to retrieve substitutions for student' });
  }
};

/** Logged-in teacher: all their assigned substitutions */
exports.getTeacherSubstitutions = async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const substitutions = await Substitution.findAll({
      where: { teacherId: userId },
      attributes: { include: displayNameAttrs.include },
      include: [
        { model: User,    as: 'Teacher',         attributes: ['id', 'name', 'email'] },
        { model: User,    as: 'OriginalTeacher', attributes: ['id', 'name', 'email'] },
        { model: Subject, as: 'Subject',         attributes: ['id', 'name'] },
        { model: Class,   as: 'Class',           attributes: ['class_name'] },
        { model: Period,  as: 'Period',          attributes: ['period_name'] }
      ],
      order: [['date', 'ASC'], ['periodId', 'ASC']]
    });

    res.status(200).json(substitutions);
  } catch (error) {
    console.error('Error retrieving teacher substitutions:', error);
    res.status(500).json({ error: 'Failed to retrieve substitutions' });
  }
};

/** Logged-in original teacher: where they were substituted */
exports.getOriginalTeacherSubstitutions = async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const substitutions = await Substitution.findAll({
      where: { original_teacherId: userId },
      attributes: { include: displayNameAttrs.include },
      include: [
        { model: User,    as: 'Teacher',         attributes: ['id', 'name', 'email'] },
        { model: User,    as: 'OriginalTeacher', attributes: ['id', 'name', 'email'] },
        { model: Subject, as: 'Subject',         attributes: ['id', 'name'] },
        { model: Class,   as: 'Class',           attributes: ['class_name'] },
        { model: Period,  as: 'Period',          attributes: ['period_name'] }
      ],
      order: [['date', 'ASC'], ['periodId', 'ASC']]
    });

    res.status(200).json(substitutions);
  } catch (error) {
    console.error('Error retrieving original teacher substitutions:', error);
    res.status(500).json({ error: 'Failed to retrieve substitutions' });
  }
};
