const { PeriodClassTeacherSubject, User, Class, Period, Subject, Student, Substitution } = require('../models');
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
    // Compute combinationId as "classId_day_periodId"
    const combinationId = `${classId}_${day}_${periodId}`;
    
    // Search for an existing record with the same periodId, classId, and day.
    const existingRecord = await PeriodClassTeacherSubject.findOne({
      where: { periodId, classId, day }
    });
    
    // Use null for extra fields if they are not provided.
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
      // Normalize the effectFrom values for a proper comparison.
      const existingEffectFrom = existingRecord.effectFrom ? new Date(existingRecord.effectFrom).toISOString() : null;
      const newEffectFrom = effectFrom ? new Date(effectFrom).toISOString() : null;
      
      if (existingEffectFrom === newEffectFrom) {
        // If effectFrom is the same, update the existing record.
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
        // If effectFrom is different, create a new record.
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
      // No record found, so create a new one.
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
// Also updates the combinationId field.
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
    // Compute combinationId
    const combinationId = `${classId}_${day}_${periodId}`;

    // Use null for extra fields if not provided.
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
    // Query for published records for any teacher column matching teacherId,
    // ordered by effectFrom descending.
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
        { model: User, as: 'Teacher', attributes: ['name'] },
        { model: Subject, as: 'Subject', attributes: ['id', 'name', 'description'] } // New include for Subject
      ]
    });

    // Filter to keep only the first record for each unique combination.
    // Here, we assume combinationId uniquely identifies a group.
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
    // Assuming authentication middleware attaches the logged in user to req.user.
    const teacherId = req.user && req.user.id;
    if (!teacherId) {
      return res.status(401).json({ error: "Unauthorized: Teacher not authenticated." });
    }

    // Fetch only published records and order by combinationId and descending effectFrom.
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

    // Group by combinationId: because of the ordering, the first record per group is the latest.
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
    // Get the student's identifier from the authenticated token.
    const admissionNumber = req.user.username;
    
    // Find the student record by the unique admission number.
    const student = await Student.findOne({ where: { admission_number: admissionNumber } });
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }
    
    // Extract the class ID from the student's record.
    const classId = student.class_id;
    
    // Fetch the timetable for the student's class where published is true.
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
        { model: Subject, as: 'Subject5', attributes: ['name'] }
      ],
      order: [
        ['day', 'ASC'],
        ['periodId', 'ASC']
      ]
    });
    
    // Group records by combinationId and keep only the record with the latest effectFrom date.
    const latestRecordsMap = {};
    timetableRecords.forEach(record => {
      const key = record.combinationId;
      // Convert effectFrom to a Date; if missing, treat as very old.
      const currentEffectDate = record.effectFrom ? new Date(record.effectFrom) : new Date(0);
      if (!latestRecordsMap[key] || currentEffectDate > new Date(latestRecordsMap[key].effectFrom)) {
        latestRecordsMap[key] = record;
      }
    });
    
    // Convert the grouped records to an array.
    let result = Object.values(latestRecordsMap);
    
    // Optional: Sort the results by day (using a custom day order) and then by periodId.
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

    // Fetch all published records for this teacher, ordered by effectFrom (latest first)
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

    // Group records by combinationId so that only the first (latest) record is kept per group.
    const uniqueRecords = {};
    records.forEach(record => {
      const key = record.combinationId;
      if (!uniqueRecords[key]) {
        uniqueRecords[key] = record;
      }
    });
    const uniqueArr = Object.values(uniqueRecords);

    // (Optional) Ensure the unique records are in descending order by effectFrom
    uniqueArr.sort((a, b) => new Date(b.effectFrom) - new Date(a.effectFrom));

    // Weekly workload is the count of unique records.
    const weeklyWorkload = uniqueArr.length;

    // Daily workload: count unique records per day.
    const dailyWorkload = {};
    uniqueArr.forEach(record => {
      const day = record.day;
      dailyWorkload[day] = (dailyWorkload[day] || 0) + 1;
    });

    // Sort daily workload entries in ascending order by count.
    // For example, if Monday has 2 records and Tuesday has 5, Monday will come first.
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



exports.getTeacherAvailability = async (req, res) => {
  try {
    const { day, periodId } = req.query;
    if (!day || !periodId) {
      return res.status(400).json({ error: "Query parameters 'day' and 'periodId' are required." });
    }
    
    // Convert periodId to number for consistency
    const numericPeriodId = Number(periodId);
    console.log("Searching availability for day:", day, "and periodId:", numericPeriodId);

    // Fetch all published records for the given day and period, ordered by effectFrom descending.
    const records = await PeriodClassTeacherSubject.findAll({
      where: {
        day: day,
        periodId: numericPeriodId,
        published: true
      },
      order: [['effectFrom', 'DESC']]
    });

    console.log("Found", records.length, "records for day:", day, "and period:", numericPeriodId);

    // Group records by combinationId so that only the latest record per group is considered.
    const groupedRecords = {};
    records.forEach(record => {
      const key = record.combinationId;
      if (!groupedRecords[key]) {
        groupedRecords[key] = record;
      }
    });
    const uniqueRecords = Object.values(groupedRecords);

    // Extract busy teacher IDs from each unique record (convert to Number for consistency).
    const busyTeacherIds = new Set();
    uniqueRecords.forEach(record => {
      if (record.teacherId) busyTeacherIds.add(Number(record.teacherId));
      if (record.teacherId_2) busyTeacherIds.add(Number(record.teacherId_2));
      if (record.teacherId_3) busyTeacherIds.add(Number(record.teacherId_3));
      if (record.teacherId_4) busyTeacherIds.add(Number(record.teacherId_4));
      if (record.teacherId_5) busyTeacherIds.add(Number(record.teacherId_5));
    });

    console.log("Busy teacher IDs:", Array.from(busyTeacherIds));

    // Retrieve all teachers with role "teacher"
    const allTeachers = await User.findAll({
      where: { role: "teacher" },
      attributes: ["id", "name", "email"]
    });

    // Filter out teachers that are busy.
    const availableTeachers = allTeachers.filter(teacher => !busyTeacherIds.has(Number(teacher.id)));

    return res.status(200).json({ availableTeachers });
  } catch (error) {
    console.error("Error fetching teacher availability:", error);
    return res.status(500).json({ error: error.message });
  }
};


// Example: controllers/teacherAvailabilityController.js



exports.getTeacherAvailabilityForDate = async (req, res) => {
  try {
    const { date, periodId } = req.query;
    if (!date || !periodId) {
      return res.status(400).json({ error: "Query parameters 'date' and 'periodId' are required." });
    }
    
    const numericPeriodId = Number(periodId);
    const inputDate = new Date(date);
    
    // Determine day (e.g., Monday, Tuesday) from the provided date.
    const options = { weekday: 'long' };
    const day = inputDate.toLocaleDateString('en-US', options);
    
    console.log("Searching availability for date:", date, "day:", day, "periodId:", numericPeriodId);

    // 1. Fetch busy teacher IDs from published records in PeriodClassTeacherSubject.
    const records = await PeriodClassTeacherSubject.findAll({
      where: {
        day: day,
        periodId: numericPeriodId,
        published: true
      },
      order: [['effectFrom', 'DESC']]
    });
    
    // Group records by combinationId to use only the latest record per group.
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

    // 2. Fetch substitutions for the given date, day and period.
    const substitutions = await Substitution.findAll({
      where: {
        date: date,
        day: day,
        periodId: numericPeriodId,
        published: true  // Adjust if you want to consider only published substitutions
      }
    });
    substitutions.forEach(sub => {
      if (sub.teacherId) busyTeacherIds.add(Number(sub.teacherId));
    });
    
    console.log("Combined busy teacher IDs:", Array.from(busyTeacherIds));

    // 3. Retrieve all teachers with role "teacher"
    const allTeachers = await User.findAll({
      where: { role: "teacher" },
      attributes: ["id", "name", "email"]
    });

    // Filter out teachers that are busy.
    const availableTeachers = allTeachers.filter(teacher => !busyTeacherIds.has(Number(teacher.id)));

    return res.status(200).json({ availableTeachers });
  } catch (error) {
    console.error("Error fetching teacher availability for date:", error);
    return res.status(500).json({ error: error.message });
  }
};
