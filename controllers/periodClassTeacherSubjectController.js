// controllers/periodClassTeacherSubjectController.js
const models = require('../models');
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
} = models;
const { Op } = require('sequelize');

/* -------------------------------------------------------
   Helper: include tree for Employees whose linked User
   has role 'teacher'. Honors your association aliases.
------------------------------------------------------- */
const teacherEmployeesInclude = (m) => ([
  {
    // Employee -> User (must match your alias, e.g. 'userAccount')
    association: m.Employee.associations.userAccount,
    required: true,
    attributes: ['id'], // user id
    include: [
      {
        // User -> Role (must match your alias, e.g. 'roles')
        association: m.User.associations.roles,
        as: m.User.associations.roles?.as || 'roles',
        required: true,
        through: { attributes: [] },
        where: { name: 'teacher' },
        attributes: ['id', 'name'],
      },
    ],
  },
]);

/* -------------------------------------------------------
   NEW: Teaching map (detailed)
   Builds a map: employeeId -> [{ classId, class_name, subjectId, subject_name }]
   from the latest published records per (classId, day, periodId).
   Assumes PCS.teacherId* are EMPLOYEE IDs.
------------------------------------------------------- */
async function buildTeachingMapDetailed() {
  const rows = await PeriodClassTeacherSubject.findAll({
    where: { published: true },
    include: [
      { model: Class,  as: 'Class',  attributes: ['id', 'class_name'] },
      { model: Subject, as: 'Subject', attributes: ['id', 'name'] },
    ],
    order: [['effectFrom', 'DESC']],
  });

  // Latest per combinationId
  const latestByCombo = new Map();
  for (const r of rows) {
    if (!latestByCombo.has(r.combinationId)) latestByCombo.set(r.combinationId, r);
  }

  const map = new Map(); // empId -> array of { classId, class_name, subjectId, subject_name }

  const add = (empId, cls, subj, r) => {
    if (!empId || !cls || !subj) return;
    const entry = {
      classId: r.classId,
      class_name: cls.class_name,
      subjectId: r.subjectId,
      subject_name: subj.name,
    };
    if (!map.has(empId)) map.set(empId, []);
    // prevent duplicates
    const arr = map.get(empId);
    if (!arr.some(e =>
      e.classId === entry.classId &&
      e.subjectId === entry.subjectId
    )) {
      arr.push(entry);
    }
  };

  for (const r of latestByCombo.values()) {
    const cls = r.Class;
    const subj = r.Subject;
    if (!cls || !subj) continue;

    if (r.teacherId)   add(Number(r.teacherId),   cls, subj, r);
    if (r.teacherId_2) add(Number(r.teacherId_2), cls, subj, r);
    if (r.teacherId_3) add(Number(r.teacherId_3), cls, subj, r);
    if (r.teacherId_4) add(Number(r.teacherId_4), cls, subj, r);
    if (r.teacherId_5) add(Number(r.teacherId_5), cls, subj, r);
  }

  // Sort each teacher's list nicely by class then subject
  for (const [empId, arr] of map.entries()) {
    arr.sort((a, b) => {
      if (a.class_name === b.class_name) return a.subject_name.localeCompare(b.subject_name);
      return a.class_name.localeCompare(b.class_name);
    });
  }

  return map;
}

/* -------------------------------------------------------
   Create or update a record based on (periodId, classId, day).
   If existing effectFrom === new effectFrom => update same row,
   else create a new row (versioned by effectFrom).
   combinationId = `${classId}_${day}_${periodId}`
------------------------------------------------------- */
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
      subjectId_5,
    } = req.body;

    const combinationId = `${classId}_${day}_${periodId}`;

    const existingRecord = await PeriodClassTeacherSubject.findOne({
      where: { periodId, classId, day },
    });

    const extras = {
      teacherId_2: teacherId_2 || null,
      subjectId_2: subjectId_2 || null,
      teacherId_3: teacherId_3 || null,
      subjectId_3: subjectId_3 || null,
      teacherId_4: teacherId_4 || null,
      subjectId_4: subjectId_4 || null,
      teacherId_5: teacherId_5 || null,
      subjectId_5: subjectId_5 || null,
    };

    if (existingRecord) {
      const existingEffectFromIso = existingRecord.effectFrom
        ? new Date(existingRecord.effectFrom).toISOString()
        : null;
      const newEffectFromIso = effectFrom
        ? new Date(effectFrom).toISOString()
        : null;

      if (existingEffectFromIso === newEffectFromIso) {
        await existingRecord.update({
          periodId,
          classId,
          teacherId,
          subjectId,
          day,
          effectFrom,
          published,
          combinationId,
          ...extras,
        });
        return res.status(200).json(existingRecord);
      }

      const newRecord = await PeriodClassTeacherSubject.create({
        periodId,
        classId,
        teacherId,
        subjectId,
        day,
        effectFrom,
        published,
        combinationId,
        ...extras,
      });
      return res.status(201).json(newRecord);
    }

    const newRecord = await PeriodClassTeacherSubject.create({
      periodId,
      classId,
      teacherId,
      subjectId,
      day,
      effectFrom,
      published,
      combinationId,
      ...extras,
    });
    return res.status(201).json(newRecord);
  } catch (error) {
    console.error('Error in createRecord:', error);
    return res.status(500).json({ error: error.message });
  }
};

/* -------------------------------------------------------
   Get all published records
------------------------------------------------------- */
exports.getAllRecords = async (req, res) => {
  try {
    const records = await PeriodClassTeacherSubject.findAll({
      where: { published: true },
    });
    return res.status(200).json(records);
  } catch (error) {
    console.error('Error fetching records:', error);
    return res.status(500).json({ error: error.message });
  }
};

/* -------------------------------------------------------
   Get a single record by id
------------------------------------------------------- */
exports.getRecordById = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await PeriodClassTeacherSubject.findByPk(id);
    if (!record) return res.status(404).json({ error: 'Record not found' });
    return res.status(200).json(record);
  } catch (error) {
    console.error('Error fetching record:', error);
    return res.status(500).json({ error: error.message });
  }
};

/* -------------------------------------------------------
   Update a record by id (no conflict checks)
------------------------------------------------------- */
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
      subjectId_5,
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
      subjectId_5: subjectId_5 || null,
    };

    const record = await PeriodClassTeacherSubject.findByPk(id);
    if (!record) return res.status(404).json({ error: 'Record not found' });

    await record.update({
      periodId,
      classId,
      teacherId,
      subjectId,
      day,
      effectFrom,
      published,
      combinationId,
      ...extras,
    });
    return res.status(200).json(record);
  } catch (error) {
    console.error('Error updating record:', error);
    return res.status(500).json({ error: error.message });
  }
};

/* -------------------------------------------------------
   Delete a record by id
------------------------------------------------------- */
exports.deleteRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await PeriodClassTeacherSubject.findByPk(id);
    if (!record) return res.status(404).json({ error: 'Record not found' });
    await record.destroy();
    return res.status(200).json({ message: 'Record deleted successfully' });
  } catch (error) {
    console.error('Error deleting record:', error);
    return res.status(500).json({ error: error.message });
  }
};

/* -------------------------------------------------------
   Timetable details by class id
------------------------------------------------------- */
exports.getDetailsByClassId = async (req, res) => {
  try {
    const { classId } = req.params;
    if (!classId) return res.status(400).json({ error: 'Class ID is required' });

    const records = await PeriodClassTeacherSubject.findAll({
      where: { classId },
    });
    return res.status(200).json(records);
  } catch (error) {
    console.error('Error fetching details by class id:', error);
    return res.status(500).json({ error: error.message });
  }
};

/* -------------------------------------------------------
   Timetable details by teacher id (unique by combinationId)
------------------------------------------------------- */
exports.getDetailsByTeacherId = async (req, res) => {
  try {
    const { teacherId } = req.params;
    if (!teacherId) return res.status(400).json({ error: 'Teacher ID is required' });

    const records = await PeriodClassTeacherSubject.findAll({
      where: {
        published: true,
        [Op.or]: [
          { teacherId },
          { teacherId_2: teacherId },
          { teacherId_3: teacherId },
          { teacherId_4: teacherId },
          { teacherId_5: teacherId },
        ],
      },
      order: [['effectFrom', 'DESC']],
      include: [
        { model: Class, as: 'Class', attributes: ['class_name'] },
        { model: Period, as: 'Period', attributes: ['period_name'] },
        { model: User, as: 'Teacher', attributes: ['name'] },
        { model: Subject, as: 'Subject', attributes: ['id', 'name', 'description'] },
      ],
    });

    const unique = [];
    const seen = new Set();
    for (const r of records) {
      if (!seen.has(r.combinationId)) {
        seen.add(r.combinationId);
        unique.push(r);
      }
    }

    return res.status(200).json(unique);
  } catch (error) {
    console.error('Error fetching details by teacher id:', error);
    return res.status(500).json({ error: error.message });
  }
};

/* -------------------------------------------------------
   Logged-in teacher timetable (latest per combinationId)
------------------------------------------------------- */
exports.getLoggedInTeacherDetails = async (req, res) => {
  try {
    const teacherId = req.user && req.user.id;
    if (!teacherId) {
      return res.status(401).json({ error: 'Unauthorized: Teacher not authenticated.' });
    }

    const records = await PeriodClassTeacherSubject.findAll({
      where: {
        published: true,
        [Op.or]: [
          { teacherId },
          { teacherId_2: teacherId },
          { teacherId_3: teacherId },
          { teacherId_4: teacherId },
          { teacherId_5: teacherId },
        ],
      },
      order: [
        ['combinationId', 'ASC'],
        ['effectFrom', 'DESC'],
      ],
      include: [
        { model: Class, as: 'Class', attributes: ['class_name'] },
        { model: Period, as: 'Period', attributes: ['period_name'] },
        { model: User, as: 'Teacher', attributes: ['name'] },
        { model: Subject, as: 'Subject', attributes: ['name'] },
        { model: User, as: 'Teacher2', attributes: ['name'] },
        { model: Subject, as: 'Subject2', attributes: ['name'] },
        { model: User, as: 'Teacher3', attributes: ['name'] },
        { model: Subject, as: 'Subject3', attributes: ['name'] },
        { model: User, as: 'Teacher4', attributes: ['name'] },
        { model: Subject, as: 'Subject4', attributes: ['name'] },
        { model: User, as: 'Teacher5', attributes: ['name'] },
        { model: Subject, as: 'Subject5', attributes: ['name'] },
      ],
    });

    const latestByCombo = {};
    for (const r of records) {
      const key = r.combinationId;
      if (!latestByCombo[key]) latestByCombo[key] = r; // first due to DESC on effectFrom
    }
    const latestRecords = Object.values(latestByCombo);

    return res.status(200).json(latestRecords);
  } catch (error) {
    console.error('Error fetching logged in teacher details:', error);
    return res.status(500).json({ error: error.message });
  }
};

/* -------------------------------------------------------
   Student Timetable (class-based, latest per combinationId)
------------------------------------------------------- */
exports.getStudentTimetable = async (req, res) => {
  try {
    const admissionNumber = req.user.username;
    const student = await Student.findOne({ where: { admission_number: admissionNumber } });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const classId = student.class_id;
    const timetableRecords = await PeriodClassTeacherSubject.findAll({
      where: { classId, published: true },
      include: [
        { model: Class, as: 'Class', attributes: ['class_name'] },
        { model: Period, as: 'Period', attributes: ['period_name'] },
        { model: User, as: 'Teacher', attributes: ['name'] },
        { model: Subject, as: 'Subject', attributes: ['name'] },
        { model: User, as: 'Teacher2', attributes: ['name'] },
        { model: Subject, as: 'Subject2', attributes: ['name'] },
        { model: User, as: 'Teacher3', attributes: ['name'] },
        { model: Subject, as: 'Subject3', attributes: ['name'] },
        { model: User, as: 'Teacher4', attributes: ['name'] },
        { model: Subject, as: 'Subject4', attributes: ['name'] },
        { model: User, as: 'Teacher5', attributes: ['name'] },
        { model: Subject, as: 'Subject5', attributes: ['name'] },
      ],
      order: [
        ['day', 'ASC'],
        ['periodId', 'ASC'],
      ],
    });

    const latestMap = {};
    for (const r of timetableRecords) {
      const key = r.combinationId;
      const curEff = r.effectFrom ? new Date(r.effectFrom) : new Date(0);
      const prevEff = latestMap[key]?.effectFrom ? new Date(latestMap[key].effectFrom) : new Date(0);
      if (!latestMap[key] || curEff > prevEff) latestMap[key] = r;
    }

    const result = Object.values(latestMap);
    const dayOrder = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6, Sunday: 7 };
    result.sort((a, b) => {
      if (a.day === b.day) return a.periodId - b.periodId;
      return (dayOrder[a.day] || 999) - (dayOrder[b.day] || 999);
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching student's timetable:", error);
    return res.status(500).json({ error: error.message });
  }
};

/* -------------------------------------------------------
   Teacher Workload (unique by combinationId)
------------------------------------------------------- */
exports.getTeacherWorkload = async (req, res) => {
  try {
    const { teacherId } = req.params;
    if (!teacherId) return res.status(400).json({ error: 'Teacher ID is required' });

    const records = await PeriodClassTeacherSubject.findAll({
      where: {
        published: true,
        [Op.or]: [
          { teacherId },
          { teacherId_2: teacherId },
          { teacherId_3: teacherId },
          { teacherId_4: teacherId },
          { teacherId_5: teacherId },
        ],
      },
      order: [['effectFrom', 'DESC']],
    });

    const unique = {};
    for (const r of records) {
      if (!unique[r.combinationId]) unique[r.combinationId] = r;
    }
    const uniqueArr = Object.values(unique).sort(
      (a, b) => new Date(b.effectFrom) - new Date(a.effectFrom)
    );

    const weeklyWorkload = uniqueArr.length;
    const dailyWorkload = {};
    for (const r of uniqueArr) {
      dailyWorkload[r.day] = (dailyWorkload[r.day] || 0) + 1;
    }

    // optional: sorted by count asc
    const sortedDailyWorkload = Object.entries(dailyWorkload)
      .sort(([, A], [, B]) => A - B)
      .reduce((acc, [d, c]) => ((acc[d] = c), acc), {});

    return res.status(200).json({ teacherId, weeklyWorkload, dailyWorkload: sortedDailyWorkload });
  } catch (error) {
    console.error('Error fetching teacher workload:', error);
    return res.status(500).json({ error: error.message });
  }
};

/* -------------------------------------------------------
   Availability: by day or date, for a given periodId
   Assumes PeriodClassTeacherSubject.teacherId* are EMPLOYEE IDs.
   (If they store USER IDs, see the alt block below.)
   ✅ Now returns availableTeachers with detailed "teaches".
------------------------------------------------------- */
exports.getTeacherAvailability = async (req, res) => {
  try {
    let { day, date, periodId } = req.query;

    // Friendly alias sanity
    if (!models.Employee?.associations?.userAccount) {
      throw new Error(
        "Association missing: Employee.belongsTo(User, { as: 'userAccount', foreignKey: 'user_id' })"
      );
    }
    if (!models.User?.associations?.roles) {
      throw new Error(
        "Association missing: User.belongsToMany(Role, { through: 'UserRoles', as: 'roles', foreignKey: 'userId', otherKey: 'roleId' })"
      );
    }

    if (!periodId) return res.status(400).json({ error: "Query parameter 'periodId' is required." });
    const numericPeriodId = Number(periodId);
    if (!Number.isInteger(numericPeriodId) || numericPeriodId <= 0) {
      return res.status(400).json({ error: 'Invalid periodId' });
    }

    if (!day && date) {
      const d = new Date(date);
      if (Number.isNaN(d.getTime())) {
        return res.status(400).json({ error: "Invalid 'date' (YYYY-MM-DD)." });
      }
      day = d.toLocaleDateString('en-US', { weekday: 'long' });
    }
    if (!day) return res.status(400).json({ error: "Provide either 'date' (YYYY-MM-DD) or 'day'." });

    const VALID_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const normDay = VALID_DAYS.find((v) => v.toLowerCase() === String(day).toLowerCase());
    if (!normDay) return res.status(400).json({ error: 'Invalid day. Expected Monday..Sunday.' });

    // Pull latest assignments per combination for that day+period
    const records = await PeriodClassTeacherSubject.findAll({
      where: { day: normDay, periodId: numericPeriodId, published: true },
      order: [['effectFrom', 'DESC']],
      include: [
        { model: Class, as: 'Class', attributes: ['id','class_name'] },
        { model: Subject, as: 'Subject', attributes: ['id','name'] },
      ],
    });

    const seen = new Set();
    const latestPerCombo = [];
    for (const r of records) {
      if (!seen.has(r.combinationId)) {
        seen.add(r.combinationId);
        latestPerCombo.push(r);
      }
    }

    const busy = new Set();
    for (const r of latestPerCombo) {
      if (r.teacherId) busy.add(Number(r.teacherId));
      if (r.teacherId_2) busy.add(Number(r.teacherId_2));
      if (r.teacherId_3) busy.add(Number(r.teacherId_3));
      if (r.teacherId_4) busy.add(Number(r.teacherId_4));
      if (r.teacherId_5) busy.add(Number(r.teacherId_5));
    }

    const teacherEmployees = await Employee.findAll({
      attributes: ['id', 'name', 'email'],
      include: teacherEmployeesInclude(models),
      order: [['name','ASC']],
    });

    // Build detailed teaching map (latest published overall)
    const teachingMap = await buildTeachingMapDetailed();

    // EMPLOYEE-ID storage (default)
    let availableTeachers = teacherEmployees
      .filter((e) => !busy.has(Number(e.id)))
      .map((e) => ({
        id: e.id, // employee id
        name: e.name,
        email: e.email,
        user_id: e.userAccount?.id ?? null, // linked user id
        teaches: teachingMap.get(Number(e.id)) || [], // [{ classId, class_name, subjectId, subject_name }]
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    // If instead teacherId fields store USER IDs, switch to:
    // let availableTeachers = teacherEmployees
    //   .filter((e) => !busy.has(Number(e.userAccount?.id)))
    //   .map((e) => ({
    //     id: e.userAccount?.id, // user id
    //     name: e.name,
    //     email: e.email,
    //     employee_id: e.id,
    //     teaches: teachingMapByUser.get(Number(e.userAccount?.id)) || []
    //   }))
    //   .sort((a, b) => a.name.localeCompare(b.name));

    return res.status(200).json({ availableTeachers });
  } catch (error) {
    console.error('Error fetching teacher availability:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch teacher availability.' });
  }
};

/* -------------------------------------------------------
   Availability: specific date + periodId
   ✅ Also returns "teaches" for each available teacher.
------------------------------------------------------- */
exports.getTeacherAvailabilityForDate = async (req, res) => {
  try {
    const { date, periodId } = req.query;
    if (!date || !periodId) {
      return res.status(400).json({ error: "Query parameters 'date' and 'periodId' are required." });
    }

    // Friendly alias sanity
    if (!Employee?.associations?.userAccount) {
      throw new Error(
        "Association missing: Employee.belongsTo(User, { as: 'userAccount', foreignKey: 'user_id' })"
      );
    }
    if (!User?.associations?.roles) {
      throw new Error(
        "Association missing: User.belongsToMany(Role, { through: 'UserRoles', as: 'roles', foreignKey: 'userId', otherKey: 'roleId' })"
      );
    }

    const numericPeriodId = Number(periodId);
    const inputDate = new Date(date);
    if (Number.isNaN(inputDate.getTime())) {
      return res.status(400).json({ error: "Invalid 'date' (YYYY-MM-DD)." });
    }
    const day = inputDate.toLocaleDateString('en-US', { weekday: 'long' });

    // Latest per combination for that day+period
    const records = await PeriodClassTeacherSubject.findAll({
      where: { day, periodId: numericPeriodId, published: true },
      order: [['effectFrom', 'DESC']],
    });

    const grouped = {};
    for (const r of records) {
      if (!grouped[r.combinationId]) grouped[r.combinationId] = r;
    }
    const uniqueRecords = Object.values(grouped);

    const busyTeacherIds = new Set();
    for (const r of uniqueRecords) {
      if (r.teacherId) busyTeacherIds.add(Number(r.teacherId));
      if (r.teacherId_2) busyTeacherIds.add(Number(r.teacherId_2));
      if (r.teacherId_3) busyTeacherIds.add(Number(r.teacherId_3));
      if (r.teacherId_4) busyTeacherIds.add(Number(r.teacherId_4));
      if (r.teacherId_5) busyTeacherIds.add(Number(r.teacherId_5));
    }

    // Add already-substituted teachers as busy for that date/period
    const substitutions = await Substitution.findAll({
      where: { date, day, periodId: numericPeriodId, published: true },
    });
    for (const s of substitutions) {
      if (s.teacherId) busyTeacherIds.add(Number(s.teacherId)); // if userId, this will be resolved by mapping if you prefer; here we only exclude employee ids used in PCS
    }

    const teacherEmployees = await Employee.findAll({
      attributes: ['id', 'name', 'email'],
      include: teacherEmployeesInclude(models),
      order: [['name','ASC']],
    });

    // Build detailed teaching map
    const teachingMap = await buildTeachingMapDetailed();

    // EMPLOYEE-ID storage (default)
    let availableTeachers = teacherEmployees
      .filter((e) => !busyTeacherIds.has(Number(e.id)))
      .map((e) => ({
        id: e.id, // employee id
        name: e.name,
        email: e.email,
        user_id: e.userAccount?.id,
        teaches: teachingMap.get(Number(e.id)) || [], // [{ classId, class_name, subjectId, subject_name }]
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    // If PCS.teacherId* store USER IDs, adapt as in the other method.

    return res.status(200).json({ availableTeachers });
  } catch (error) {
    console.error('Error fetching teacher availability for date:', error);
    return res.status(500).json({ error: error.message });
  }
};
