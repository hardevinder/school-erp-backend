const { Substitution, User, Class, Subject, Student, Period } = require('../models');

// Create or update a substitution
exports.createSubstitution = async (req, res) => {
  try {
    const { date, periodId, classId, teacherId, original_teacherId, subjectId, day, published } = req.body;
    
    // Check for an existing substitution with the same date, day, periodId, and classId.
    const existingSubstitution = await Substitution.findOne({
      where: { date, day, periodId, classId }
    });
    
    let substitution;
    if (existingSubstitution) {
      // If found, update the existing record.
      substitution = await existingSubstitution.update({ teacherId, original_teacherId, subjectId, published });
      res.status(200).json(substitution);
    } else {
      // Otherwise, create a new substitution record.
      substitution = await Substitution.create({
        date,
        periodId,
        classId,
        teacherId,
        original_teacherId,
        subjectId,
        day,
        published
      });
      res.status(201).json(substitution);
    }
    
    // Emit notification to the substitute teacher.
    const io = req.app.get("socketio");
    if (io) {
      // Fetch Period and Class details
      const periodRecord = await Period.findByPk(periodId, { attributes: ['period_name'] });
      const classRecord = await Class.findByPk(classId, { attributes: ['class_name'] });
      const message = existingSubstitution 
        ? `Substitution updated for ${date} in period ${periodRecord?.period_name} and class ${classRecord?.class_name}.`
        : `You have been assigned a substitution on ${date} in period ${periodRecord?.period_name} and class ${classRecord?.class_name}.`;
      const payload = {
        substitutionId: substitution.id,
        date,
        periodId,
        classId,
        subjectId,
        periodName: periodRecord?.period_name,
        className: classRecord?.class_name,
        message
      };
      // For new substitution, emit "newSubstitution"; for updates, emit "substitutionUpdated".
      const eventName = existingSubstitution ? "substitutionUpdated" : "newSubstitution";
      io.to(`teacher-${teacherId}`).emit(eventName, payload);
      console.log(`Notification sent to room teacher-${teacherId} for event ${eventName}:`, payload);
    }
    
  } catch (error) {
    console.error('Error creating/updating substitution:', error);
    res.status(500).json({ error: 'Failed to create/update substitution' });
  }
};

exports.getAllSubstitutions = async (req, res) => {
  try {
    const substitutions = await Substitution.findAll({
      include: [
        {
          model: User,
          as: 'Teacher', // Substitute teacher
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'OriginalTeacher', // Regular/original teacher
          attributes: ['id', 'name']
        },
        {
          model: Subject,
          as: 'Subject',
          attributes: ['id', 'name']
        },
        {
          model: Class,
          as: 'Class',
          attributes: ['class_name']
        },
        {
          model: Period,
          as: 'Period',
          attributes: ['period_name']
        }
      ]
    });
    res.status(200).json(substitutions);
  } catch (error) {
    console.error('Error retrieving substitutions:', error);
    res.status(500).json({ error: 'Failed to retrieve substitutions' });
  }
};

// Retrieve a single substitution by id
exports.getSubstitutionById = async (req, res) => {
  try {
    const { id } = req.params;
    const substitution = await Substitution.findByPk(id);
    if (!substitution) {
      return res.status(404).json({ error: 'Substitution not found' });
    }
    res.status(200).json(substitution);
  } catch (error) {
    console.error('Error retrieving substitution:', error);
    res.status(500).json({ error: 'Failed to retrieve substitution' });
  }
};

// Update a substitution by id
exports.updateSubstitution = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, periodId, classId, teacherId, original_teacherId, subjectId, day, published } = req.body;

    const substitution = await Substitution.findByPk(id);
    if (!substitution) {
      return res.status(404).json({ error: 'Substitution not found' });
    }

    await substitution.update({
      date,
      periodId,
      classId,
      teacherId,
      original_teacherId,
      subjectId,
      day,
      published
    });

    res.status(200).json(substitution);

    // Emit notification for substitution update.
    const io = req.app.get("socketio");
    if (io) {
      // Fetch updated Period and Class details.
      const periodRecord = await Period.findByPk(periodId, { attributes: ['period_name'] });
      const classRecord = await Class.findByPk(classId, { attributes: ['class_name'] });
      const payload = {
        substitutionId: substitution.id,
        date,
        periodId,
        classId,
        subjectId,
        periodName: periodRecord?.period_name,
        className: classRecord?.class_name,
        message: `Substitution updated for ${date} in period ${periodRecord?.period_name} and class ${classRecord?.class_name}.`
      };
      io.to(`teacher-${teacherId}`).emit("substitutionUpdated", payload);
      console.log(`Notification sent to room teacher-${teacherId} for substitution update:`, payload);
    }
  } catch (error) {
    console.error('Error updating substitution:', error);
    res.status(500).json({ error: 'Failed to update substitution' });
  }
};

// Delete a substitution by id
exports.deleteSubstitution = async (req, res) => {
  try {
    const { id } = req.params;
    const substitution = await Substitution.findByPk(id);
    if (!substitution) {
      return res.status(404).json({ error: 'Substitution not found' });
    }

    // Preserve substitution data for notification before deletion.
    const { teacherId, date, periodId, classId } = substitution;
    // Fetch Period and Class details.
    const periodRecord = await Period.findByPk(periodId, { attributes: ['period_name'] });
    const classRecord = await Class.findByPk(classId, { attributes: ['class_name'] });
    
    await substitution.destroy();
    res.status(200).json({ message: 'Substitution deleted successfully' });

    // Emit notification for substitution deletion.
    const io = req.app.get("socketio");
    if (io) {
      const payload = {
        substitutionId: id,
        date,
        periodId,
        classId,
        periodName: periodRecord?.period_name,
        className: classRecord?.class_name,
        message: `Substitution on ${date} in period ${periodRecord?.period_name} and class ${classRecord?.class_name} has been removed.`
      };
      io.to(`teacher-${teacherId}`).emit("substitutionDeleted", payload);
      console.log(`Notification sent to room teacher-${teacherId} for substitution deletion:`, payload);
    }
  } catch (error) {
    console.error('Error deleting substitution:', error);
    res.status(500).json({ error: 'Failed to delete substitution' });
  }
};

// By Date
exports.getSubstitutionsByDate = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ error: 'Date query parameter is required' });
    }

    // Find substitutions that match the provided date, including the associated Teacher, Class, and Subject details.
    const substitutions = await Substitution.findAll({
      where: { date },
      include: [
        {
          model: User,
          as: 'Teacher',
          attributes: ['id', 'name']
        },
        {
          model: Class,
          as: 'Class', // Make sure this alias matches the association defined in your Substitution model
          attributes: ['class_name']
        },
        {
          model: Subject,
          as: 'Subject', // Likewise, ensure this alias matches your association
          attributes: ['name']
        }
      ]
    });

    res.status(200).json(substitutions);
  } catch (error) {
    console.error('Error retrieving substitutions by date:', error);
    res.status(500).json({ error: 'Failed to retrieve substitutions by date' });
  }
};

// By Date for Original Teacher
exports.getSubstitutionsForOriginalTeacherByDate = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ error: 'Date query parameter is required' });
    }

    // Assuming req.user contains the logged in teacher's info.
    const loggedInTeacherId = req.user.id;

    // Find substitutions where the date matches and the logged in teacher is the original teacher.
    const substitutions = await Substitution.findAll({
      where: { 
        date,
        original_teacherId: loggedInTeacherId 
      },
      include: [
        {
          model: User,
          as: 'Teacher',
          attributes: ['id', 'name']
        },
        {
          model: Class,
          as: 'Class',
          attributes: ['class_name']
        },
        {
          model: Subject,
          as: 'Subject',
          attributes: ['name']
        }
      ]
    });

    res.status(200).json(substitutions);
  } catch (error) {
    console.error('Error retrieving substitutions for original teacher by date:', error);
    res.status(500).json({ error: 'Failed to retrieve substitutions for original teacher by date' });
  }
};

// By Date for Teacher (when teacherId matches logged in teacher)
exports.getSubstitutionsForTeacherByDate = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ error: 'Date query parameter is required' });
    }

    // Assuming req.user contains the logged in teacher's info.
    const loggedInTeacherId = req.user.id;

    // Find substitutions where the date matches and the logged in teacher is the substitute (teacherId).
    const substitutions = await Substitution.findAll({
      where: { 
        date,
        teacherId: loggedInTeacherId 
      },
      include: [
        {
          model: User,
          as: 'Teacher',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'OriginalTeacher', // This alias must match your association in the Substitution model.
          attributes: ['id', 'name']
        },
        {
          model: Class,
          as: 'Class',
          attributes: ['class_name']
        },
        {
          model: Subject,
          as: 'Subject',
          attributes: ['name']
        }
      ]
    });

    res.status(200).json(substitutions);
  } catch (error) {
    console.error('Error retrieving substitutions for teacher by date:', error);
    res.status(500).json({ error: 'Failed to retrieve substitutions for teacher by date' });
  }
};

// Retrieves substitutions for a student based on their class and, optionally, a provided date.
exports.getStudentSubstitutions = async (req, res) => {
  try {
    // Get the student's admission number from the authenticated token.
    const admissionNumber = req.user.username;

    // Find the student record by the unique admission number.
    const student = await Student.findOne({ where: { admission_number: admissionNumber } });
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    // Extract the class ID from the student's record.
    const classId = student.class_id;

    // Optionally, filter substitutions by date if a date query parameter is provided.
    const { date } = req.query;
    const whereClause = { classId };
    if (date) {
      whereClause.date = date;
    }

    // Fetch the substitution records for the student's class.
    const substitutionRecords = await Substitution.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'Teacher', // The substitute teacher.
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'OriginalTeacher', // The teacher who is being substituted.
          attributes: ['id', 'name']
        },
        {
          model: Class,
          as: 'Class',
          attributes: ['class_name']
        },
        {
          model: Subject,
          as: 'Subject',
          attributes: ['name']
        }
      ],
      order: [
        ['date', 'ASC'],
        ['periodId', 'ASC']
      ]
    });

    // Group records by combinationId and keep only the record with the latest effectFrom date.
    const latestRecordsMap = {};
    substitutionRecords.forEach(record => {
      const key = record.combinationId;
      // If effectFrom is missing, treat it as a very old date.
      const currentEffectDate = record.effectFrom ? new Date(record.effectFrom) : new Date(0);
      if (!latestRecordsMap[key] || currentEffectDate > new Date(latestRecordsMap[key].effectFrom)) {
        latestRecordsMap[key] = record;
      }
    });

    // Convert the grouped records map to an array.
    const latestSubstitutions = Object.values(latestRecordsMap);

    res.status(200).json(latestSubstitutions);
  } catch (error) {
    console.error('Error retrieving substitutions for student:', error);
    res.status(500).json({ error: 'Failed to retrieve substitutions for student' });
  }
};


// Logged in Teachers's Information.
exports.getTeacherSubstitutions = async (req, res) => {
  try {
    // Assuming your auth middleware sets req.user
    const loggedInTeacherId = req.user.id;
    
    const substitutions = await Substitution.findAll({
      where: { teacherId: loggedInTeacherId }, // Only substitutions for the logged in teacher
      include: [
        {
          model: User,
          as: 'Teacher', // Substitute teacher
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'OriginalTeacher', // Original teacher
          attributes: ['id', 'name']
        },
        {
          model: Subject,
          as: 'Subject',
          attributes: ['id', 'name']
        },
        {
          model: Class,
          as: 'Class',
          attributes: ['class_name']
        },
        {
          model: Period,
          as: 'Period',
          attributes: ['period_name']
        }
      ]
    });
    
    res.status(200).json(substitutions);
  } catch (error) {
    console.error('Error retrieving teacher substitutions:', error);
    res.status(500).json({ error: 'Failed to retrieve substitutions' });
  }
};

// Teacher Substituted (Original Teacher View)
exports.getOriginalTeacherSubstitutions = async (req, res) => {
  try {
    // Assuming your auth middleware sets req.user
    const loggedInTeacherId = req.user.id;
    
    const substitutions = await Substitution.findAll({
      where: { original_teacherId: loggedInTeacherId }, // Only substitutions where logged in teacher is the original teacher
      include: [
        {
          model: User,
          as: 'Teacher', // Substitute teacher
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'OriginalTeacher', // Original teacher
          attributes: ['id', 'name']
        },
        {
          model: Subject,
          as: 'Subject',
          attributes: ['id', 'name']
        },
        {
          model: Class,
          as: 'Class',
          attributes: ['class_name']
        },
        {
          model: Period,
          as: 'Period',
          attributes: ['period_name']
        }
      ]
    });
    
    res.status(200).json(substitutions);
  } catch (error) {
    console.error('Error retrieving original teacher substitutions:', error);
    res.status(500).json({ error: 'Failed to retrieve substitutions' });
  }
};
