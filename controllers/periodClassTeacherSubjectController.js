// controllers/periodClassTeacherSubjectController.js
const {
  PeriodClassTeacherSubject,
  User,
  Class,
  Period,
  Subject,
  Student,
  Substitution,
  Employee,
  Role,
} = require('../models');
const { Op } = require("sequelize");

// Create or update a record based on periodId, classId, and day.
// If a matching record exists and its effectFrom value is the same, update it.
// Otherwise, create a new record.
// The combinationId is computed as: ClassId_Day_PeriodId
exports.createRecord = async (req, res) => {
  try {
    const { 
      periodId, 
      classId, 
      teacherId, 
      subjectId, 
      day, 
      effectFrom, 
      published,
      teacherId_2,
      subjectId_2,
      teacherId_3,
      subjectId_3,
      teacherId_4,
      subjectId_4,
      teacherId_5,
      subjectId_5
    } = req.body;

    const combinationId = `${classId}_${day}_${periodId}`;
    
    const existingRecord = await PeriodClassTeacherSubject.findOne({
      where: { periodId, classId, day }
    });
    
    const extras = {
      teacherId_2: teacherId_2 || null,
      subjectId_2: subjectId_2 || null,
      teacherId_3: teacherId_3 || null,
      subjectId_3: subjectId_3 || null,
      teacherId_4: teacherId_4 || null,
      subjectId_4: subjectId_4 || null,
      teacherId_5: teacherId_5 || null,
      subjectId_5: subjectId_5 || null
    };
    
    if (existingRecord) {
      const existingEffectFrom = existingRecord.effectFrom ? new Date(existingRecord.effectFrom).toISOString() : null;
      const newEffectFrom = effectFrom ? new Date(effectFrom).toISOString() : null;
      
      if (existingEffectFrom === newEffectFrom) {
        await existingRecord.update({ 
          teacherId, 
          subjectId, 
          published, 
          effectFrom,
          combinationId,
          ...extras
        });
        return res.status(200).json(existingRecord);
      } else {
        const newRecord = await PeriodClassTeacherSubject.create({
          periodId,
          classId,
          teacherId,
          subjectId,
          day,
          effectFrom,
          published,
          combinationId,
          ...extras
        });
        return res.status(201).json(newRecord);
      }
    } else {
      const newRecord = await PeriodClassTeacherSubject.create({
        periodId,
        classId,
        teacherId,
        subjectId,
        day,
        effectFrom,
        published,
        combinationId,
        ...extras
      });
      return res.status(201).json(newRecord);
    }
  } catch (error) {
    console.error("Error in createRecord:", error);
    return res.status(500).json({ error: error.message });
  }
};

// Get all published records
exports.getAllRecords = async (req, res) => {
  try {
    const records = await PeriodClassTeacherSubject.findAll({
      where: { published: true }
    });
    return res.status(200).json(records);
  } catch (error) {
    console.error("Error fetching records:", error);
    return res.status(500).json({ error: error.message });
  }
};

// Get a single record by id
exports.getRecordById = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await PeriodClassTeacherSubject.findByPk(id);
    if (!record) {
      return res.status(404).json({ error: "Record not found" });
    }
    return res.status(200).json(record);
  } catch (error) {
    console.error("Error fetching record:", error);
    return res.status(500).json({ error: error.message });
  }
};

// Update a record by id (without conflict checks)
exports.updateRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      periodId, 
      classId, 
      teacherId, 
      subjectId, 
      day, 
      effectFrom, 
      published,
      teacherId_2,
      subjectId_2,
      teacherId_3,
      subjectId_3,
      teacherId_4,
      subjectId_4,
      teacherId_5,
      subjectId_5
    } = req.body;

    const combinationId = `${classId}_${day}_${periodId}`;

    const extras = {
      teacherId_2: teacherId_2 || null,
      subjectId_2: subjectId_2 || null,
      teacherId_3: teacherId_3 || null,
      subjectId_3: subjectId_3 || null,
      teacherId_4: teacherId_4 || null,
      subjectId_4: subjectId_4 || null,
      teacherId_5: teacherId_5 || null,
      subjectId_5: subjectId_5 || null
    };

    const record = await PeriodClassTeacherSubject.findByPk(id);
    if (!record) {
      return res.status(404).json({ error: "Record not found" });
    }

    await record.update({
      periodId,
      classId,
      teacherId,
      subjectId,
      day,
      effectFrom,
      published,
      combinationId,
      ...extras
    });
    return res.status(200).json(record);
  } catch (error) {
    console.error("Error updating record:", error);
    return res.status(500).json({ error: error.message });
  }
};

// Delete a record by id
exports.deleteRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await PeriodClassTeacherSubject.findByPk(id);
    if (!record) {
      return res.status(404).json({ error: "Record not found" });
    }
    await record.destroy();
    return res.status(200).json({ message: "Record deleted successfully" });
  } catch (error) {
    console.error("Error deleting record:", error);
    return res.status(500).json({ error: error.message });
  }
};

// Get timetable details by class id
exports.getDetailsByClassId = async (req, res) => {
  try {
    const { classId } = req.params;
    if (!classId) {
      return res.status(400).json({ error: "Class ID is required" });
    }
    const records = await PeriodClassTeacherSubject.findAll({
      where: { classId },
    });
    return res.status(200).json(records);
  } catch (error) {
    console.error("Error fetching details by class id:", error);
    return res.status(500).json({ error: error.message });
  }
};

exports.getDetailsByTeacherId = async (req, res) => {
  try {
    const { teacherId } = req.params;
    if (!teacherId) {
      return res.status(400).json({ error: "Teacher ID is required" });
    }
    const records = await PeriodClassTeacherSubject.findAll({
      where: {
        published: true,
        [Op.or]: [
          { teacherId: teacherId },
          { teacherId_2: teacherId },
          { teacherId_3: teacherId },
          { teacherId_4: teacherId },
          { teacherId_5: teacherId }
        ]
      },
      order: [['effectFrom', 'DESC']],
      include: [
        { model: Class, as: 'Class', attributes: ['class_name'] },
        { model: Period, as: 'Period', attributes: ['period_name'] },
        // NOTE: If you changed associations to Employee, update these includes accordingly.
        { model: User, as: 'Teacher', attributes: ['name'] },
        { model: Subject, as: 'Subject', attributes: ['id', 'name', 'description'] }
      ]
    });

    const uniqueRecords = [];
    const seenCombinationIds = new Set();
    records.forEach(record => {
      if (!seenCombinationIds.has(record.combinationId)) {
        seenCombinationIds.add(record.combinationId);
        uniqueRecords.push(record);
      }
    });

    return res.status(200).json(uniqueRecords);
  } catch (error) {
    console.error("Error fetching details by teacher id:", error);
    return res.status(500).json({ error: error.message });
  }
};

exports.getLoggedInTeacherDetails = async (req, res) => {
  try {
    const teacherId = req.user && req.user.id;
    if (!teacherId) {
      return res.status(401).json({ error: "Unauthorized: Teacher not authenticated." });
    }

    const records = await PeriodClassTeacherSubject.findAll({
      where: {
        published: true,
        [Op.or]: [
          { teacherId: teacherId },
          { teacherId_2: teacherId },
          { teacherId_3: teacherId },
          { teacherId_4: teacherId },
          { teacherId_5: teacherId }
        ]
      },
      order: [
        ['combinationId', 'ASC'],
        ['effectFrom', 'DESC']
      ],
      include: [
        { model: Class, as: 'Class', attributes: ['class_name'] },
        { model: Period, as: 'Period', attributes: ['period_name'] },
        // Update to Employee includes if associations were changed:
        { model: User, as: 'Teacher', attributes: ['name'] },
        { model: Subject, as: 'Subject', attributes: ['name'] },
        { model: User, as: 'Teacher2', attributes: ['name'] },
        { model: Subject, as: 'Subject2', attributes: ['name'] },
        { model: User, as: 'Teacher3', attributes: ['name'] },
        { model: Subject, as: 'Subject3', attributes: ['name'] },
        { model: User, as: 'Teacher4', attributes: ['name'] },
        { model: Subject, as: 'Subject4', attributes: ['name'] },
        { model: User, as: 'Teacher5', attributes: ['name'] },
        { model: Subject, as: 'Subject5', attributes: ['name'] }
      ]
    });

    const grouped = {};
    records.forEach(record => {
      const key = record.combinationId;
      if (!grouped[key]) {
        grouped[key] = record;
      }
    });
    const latestRecords = Object.values(grouped);

    return res.status(200).json(latestRecords);
  } catch (error) {
    console.error("Error fetching logged in teacher details:", error);
    return res.status(500).json({ error: error.message });
  }
};

// Student Time Table
exports.getStudentTimetable = async (req, res) => {
  try {
    const admissionNumber = req.user.username;
    const student = await Student.findOne({ where: { admission_number: admissionNumber } });
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }
    const classId = student.class_id;
    
    const timetableRecords = await PeriodClassTeacherSubject.findAll({
      where: { classId, published: true },
      include: [
        { model: Class, as: 'Class', attributes: ['class_name'] },
        { model: Period, as: 'Period', attributes: ['period_name'] },
        // If you migrated associations to Employee, change these includes:
        { model: User, as: 'Teacher', attributes: ['name'] },
        { model: Subject, as: 'Subject', attributes: ['name'] },
        { model: User, as: 'Teacher2', attributes: ['name'] },
        { model: Subject, as: 'Subject2', attributes: ['name'] },
        { model: User, as: 'Teacher3', attributes: ['name'] },
        { model: Subject, as: 'Subject3', attributes: ['name'] },
        { model: User, as: 'Teacher4', attributes: ['name'] },
        { model: Subject, as: 'Subject4', attributes: ['name'] },
        { model: User, as: 'Teacher5', attributes: ['name'] },
        { model: Subject, as: 'Subject5', attributes: ['name'] }
      ],
      order: [
        ['day', 'ASC'],
        ['periodId', 'ASC']
      ]
    });
    
    const latestRecordsMap = {};
    timetableRecords.forEach(record => {
      const key = record.combinationId;
      const currentEffectDate = record.effectFrom ? new Date(record.effectFrom) : new Date(0);
      if (!latestRecordsMap[key] || currentEffectDate > new Date(latestRecordsMap[key].effectFrom)) {
        latestRecordsMap[key] = record;
      }
    });
    
    let result = Object.values(latestRecordsMap);
    
    const dayOrder = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6, Sunday: 7 };
    result.sort((a, b) => {
      if (a.day === b.day) {
        return a.periodId - b.periodId;
      }
      return (dayOrder[a.day] || 999) - (dayOrder[b.day] || 999);
    });
    
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching student's timetable:", error);
    return res.status(500).json({ error: error.message });
  }
};

exports.getTeacherWorkload = async (req, res) => {
  try {
    const { teacherId } = req.params;
    if (!teacherId) {
      return res.status(400).json({ error: "Teacher ID is required" });
    }

    const records = await PeriodClassTeacherSubject.findAll({
      where: {
        published: true,
        [Op.or]: [
          { teacherId },
          { teacherId_2: teacherId },
          { teacherId_3: teacherId },
          { teacherId_4: teacherId },
          { teacherId_5: teacherId }
        ]
      },
      order: [['effectFrom', 'DESC']]
    });

    const uniqueRecords = {};
    records.forEach(record => {
      const key = record.combinationId;
      if (!uniqueRecords[key]) {
        uniqueRecords[key] = record;
      }
    });
    const uniqueArr = Object.values(uniqueRecords);

    uniqueArr.sort((a, b) => new Date(b.effectFrom) - new Date(a.effectFrom));

    const weeklyWorkload = uniqueArr.length;

    const dailyWorkload = {};
    uniqueArr.forEach(record => {
      const day = record.day;
      dailyWorkload[day] = (dailyWorkload[day] || 0) + 1;
    });

    const sortedDailyWorkload = Object.entries(dailyWorkload)
      .sort(([, countA], [, countB]) => countA - countB)
      .reduce((acc, [day, count]) => {
        acc[day] = count;
        return acc;
      }, {});

    return res.status(200).json({ teacherId, weeklyWorkload, dailyWorkload: sortedDailyWorkload });
  } catch (error) {
    console.error("Error fetching teacher workload:", error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Availability endpoints updated to use Employee (with role 'teacher')
 *
 * IMPORTANT ID NOTE:
 * - If PeriodClassTeacherSubject.teacherId stores EMPLOYEE IDs (recommended), leave as-is.
 * - If it stores USER IDs, compare busy IDs to e.userAccount.id instead (see comments below).
 */
// controllers/... 
// Assumes: const { PeriodClassTeacherSubject, Employee, User, Role } = require('../models');

// Assumes: const models = require('../models');
// and you call models.Employee.findAll below

exports.getTeacherAvailability = async (req, res) => {
  try {
    let { day, date, periodId } = req.query;

    // ---- sanity checks on associations (better error than Sequelize's generic one) ----
    if (!models.Employee?.associations?.userAccount) {
      throw new Error("Association missing: Employee.associations.userAccount. Define Employee.belongsTo(User, { as: 'userAccount', foreignKey: 'user_id' })");
    }
    if (!models.User?.associations?.roles) {
      throw new Error("Association missing: User.associations.roles. Define User.belongsToMany(Role, { through: 'UserRoles', as: 'roles', foreignKey: 'userId', otherKey: 'roleId' })");
    }

    // ---- validate inputs ----
    if (!periodId) return res.status(400).json({ error: "Query parameter 'periodId' is required." });
    const numericPeriodId = Number(periodId);
    if (!Number.isInteger(numericPeriodId) || numericPeriodId <= 0) {
      return res.status(400).json({ error: "Invalid 'periodId'." });
    }

    if (!day && date) {
      const d = new Date(date);
      if (Number.isNaN(d.getTime())) return res.status(400).json({ error: "Invalid 'date' (YYYY-MM-DD)." });
      day = d.toLocaleDateString('en-US', { weekday: 'long' });
    }
    if (!day) return res.status(400).json({ error: "Provide either 'date' (YYYY-MM-DD) or 'day' (Monday..Saturday)." });

    const VALID_DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
    const normDay = VALID_DAYS.find(v => v.toLowerCase() === String(day).toLowerCase());
    if (!normDay) return res.status(400).json({ error: "Invalid 'day'. Expected Monday..Sunday." });

    // ---- pull latest assignments per combinationId ----
    const pct = models.PeriodClassTeacherSubject;
    const records = await pct.findAll({
      where: { day: normDay, periodId: numericPeriodId, published: true },
      order: [['effectFrom', 'DESC']],
    });

    const seen = new Set();
    const uniqueRecords = [];
    for (const rec of records) {
      if (!seen.has(rec.combinationId)) {
        seen.add(rec.combinationId);
        uniqueRecords.push(rec);
      }
    }

    // busy EMPLOYEE ids (assuming teacherId* are Employee IDs)
    const busy = new Set();
    for (const r of uniqueRecords) {
      if (r.teacherId)   busy.add(Number(r.teacherId));
      if (r.teacherId_2) busy.add(Number(r.teacherId_2));
      if (r.teacherId_3) busy.add(Number(r.teacherId_3));
      if (r.teacherId_4) busy.add(Number(r.teacherId_4));
      if (r.teacherId_5) busy.add(Number(r.teacherId_5));
    }

    // ---- main query using association refs (no string 'as') ----
    const teacherEmployees = await models.Employee.findAll({
      attributes: ['id', 'name', 'email'],
      include: [
        {
          association: models.Employee.associations.userAccount,  // 'userAccount'
          required: true,
          attributes: ['id'],
          include: [
            {
              association: models.User.associations.roles,        // 'roles'
              required: true,
              through: { attributes: [] },
              where: { name: 'teacher' },
              attributes: ['id', 'name'],
            },
          ],
        },
      ],
    });

    const availableTeachers = teacherEmployees
      .filter(e => !busy.has(Number(e.id)))
      .map(e => ({
        id: e.id,                             // EMPLOYEE id
        name: e.name,
        email: e.email,
        user_id: e.userAccount?.id ?? null,   // user id as extra, if needed
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return res.status(200).json({ availableTeachers });
  } catch (error) {
    console.error("Error fetching teacher availability:", error);
    return res.status(500).json({ error: error.message || "Failed to fetch teacher availability." });
  }
};

exports.getTeacherAvailabilityForDate = async (req, res) => {
  try {
    const { date, periodId } = req.query;
    if (!date || !periodId) {
      return res.status(400).json({ error: "Query parameters 'date' and 'periodId' are required." });
    }
    
    const numericPeriodId = Number(periodId);
    const inputDate = new Date(date);
    const day = inputDate.toLocaleDateString('en-US', { weekday: 'long' });

    const records = await PeriodClassTeacherSubject.findAll({
      where: {
        day,
        periodId: numericPeriodId,
        published: true
      },
      order: [['effectFrom', 'DESC']]
    });
    
    const groupedRecords = {};
    records.forEach(record => {
      const key = record.combinationId;
      if (!groupedRecords[key]) {
        groupedRecords[key] = record;
      }
    });
    const uniqueRecords = Object.values(groupedRecords);
    
    const busyTeacherIds = new Set();
    uniqueRecords.forEach(record => {
      if (record.teacherId) busyTeacherIds.add(Number(record.teacherId));
      if (record.teacherId_2) busyTeacherIds.add(Number(record.teacherId_2));
      if (record.teacherId_3) busyTeacherIds.add(Number(record.teacherId_3));
      if (record.teacherId_4) busyTeacherIds.add(Number(record.teacherId_4));
      if (record.teacherId_5) busyTeacherIds.add(Number(record.teacherId_5));
    });

    const substitutions = await Substitution.findAll({
      where: {
        date,
        day,
        periodId: numericPeriodId,
        published: true
      }
    });
    substitutions.forEach(sub => {
      if (sub.teacherId) busyTeacherIds.add(Number(sub.teacherId));
    });

    // Pull teachers from Employee where linked User has role 'teacher'
    const teacherEmployees = await Employee.findAll({
      attributes: ['id', 'name', 'email'],
      include: [
        {
          model: User,
          as: 'userAccount',
          required: true,
          attributes: ['id'],
          include: [
            {
              model: Role,
              required: true,
              through: { attributes: [] },
              where: { name: 'teacher' },
              attributes: ['id', 'name'],
            },
          ],
        },
      ],
    });

    // If PeriodClassTeacherSubject.teacherId holds EMPLOYEE IDs (recommended):
    let availableTeachers = teacherEmployees
      .filter(e => !busyTeacherIds.has(Number(e.id)))
      .map(e => ({
        id: e.id,
        name: e.name,
        email: e.email,
        user_id: e.userAccount?.id,
      }));

    // If instead PeriodClassTeacherSubject.teacherId stores USER IDs, switch to this:
    // availableTeachers = teacherEmployees
    //   .filter(e => !busyTeacherIds.has(Number(e.userAccount?.id)))
    //   .map(e => ({
    //     id: e.userAccount?.id,
    //     name: e.name,
    //     email: e.email,
    //     employee_id: e.id,
    //   }));

    return res.status(200).json({ availableTeachers });
  } catch (error) {
    console.error("Error fetching teacher availability for date:", error);
    return res.status(500).json({ error: error.message });
  }
};
