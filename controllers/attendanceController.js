const { Attendance, Student, User } = require('../models');

// Create a new attendance record with createdBy from the authenticated user
exports.createAttendance = async (req, res) => {
  try {
    const { studentId, date, status, remarks } = req.body;
    
    // Verify that the student exists
    const student = await Student.findByPk(studentId);
    if (!student) {
      return res.status(400).json({ message: 'Student not found' });
    }

    // Prevent duplicate attendance records for the same student on the same date
    const existingAttendance = await Attendance.findOne({ where: { studentId, date } });
    if (existingAttendance) {
      return res.status(409).json({
        message: 'Attendance record already exists for this student on the selected date'
      });
    }

    // Create the attendance record with createdBy taken from req.user (set by auth middleware)
    const attendance = await Attendance.create({ 
      studentId, 
      date, 
      status, 
      remarks,
      createdBy: req.user.id 
    });

    // Emit a real-time notification for new attendance
    const io = req.app.get('socketio');
    if (io) {
      const studentRecord = await Student.findByPk(studentId);
      if (studentRecord && studentRecord.admission_number) {
        // Find the corresponding user using the student's admission_number as username
        const studentUser = await User.findOne({ where: { username: studentRecord.admission_number } });
        if (studentUser) {
          const roomName = studentUser.username.toString();
          const payload = {
            attendanceId: attendance.id,
            title: "Attendance Marked",
            status: attendance.status,
            date: attendance.date,
            remarks: attendance.remarks,
            message: `Your attendance for ${attendance.date} has been marked as ${attendance.status}.`
          };
          io.to(roomName).emit('attendanceCreated', payload);
          console.log(`Socket attendance creation notification sent to room: ${roomName}`);
        } else {
          console.warn(`No matching user found for admission_number: ${studentRecord.admission_number}`);
        }
      }
    }

    res.status(201).json({ message: 'Attendance recorded successfully', attendance });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all attendance records
exports.getAllAttendance = async (req, res) => {
  try {
    const attendances = await Attendance.findAll({
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    // Add hyperlink for the creator if exists
    const modifiedAttendances = attendances.map(record => {
      const json = record.toJSON();
      if (json.creator) {
        json.creatorLink = `${req.protocol}://${req.get('host')}/users/${json.creator.id}`;
      }
      return json;
    });

    res.status(200).json(modifiedAttendances);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get a single attendance record by its ID
exports.getAttendanceById = async (req, res) => {
  try {
    const { id } = req.params;
    const attendance = await Attendance.findByPk(id, {
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'name']
        }
      ]
    });
    if (!attendance) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }
    res.status(200).json(attendance);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get attendance records by date
exports.getAttendanceByDate = async (req, res) => {
  try {
    const { date } = req.params; // Expecting URL: /attendance/date/:date
    const attendances = await Attendance.findAll({
      where: { date },
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        }
      ]
    });
    
    res.status(200).json(attendances);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update an existing attendance record (notification is sent on update)
exports.updateAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const { studentId, date, status, remarks } = req.body;

    const attendance = await Attendance.findByPk(id);
    if (!attendance) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }

    // If updating studentId, verify the student exists
    if (studentId && studentId !== attendance.studentId) {
      const student = await Student.findByPk(studentId);
      if (!student) {
        return res.status(400).json({ message: 'Student not found' });
      }
    }

    // Prevent duplicate records if studentId or date is changed
    if ((studentId && studentId !== attendance.studentId) || (date && date !== attendance.date)) {
      const duplicate = await Attendance.findOne({ 
        where: { 
          studentId: studentId || attendance.studentId, 
          date: date || attendance.date 
        } 
      });
      if (duplicate && duplicate.id !== attendance.id) {
        return res.status(409).json({
          message: 'Another attendance record exists for this student on the selected date'
        });
      }
    }

    await attendance.update({ studentId, date, status, remarks });

    // Emit a real-time update notification after updating attendance
    const io = req.app.get('socketio');
    if (io) {
      const student = await Student.findByPk(attendance.studentId);
      if (student && student.admission_number) {
        // Match user using the student's admission_number as username
        const studentUser = await User.findOne({ where: { username: student.admission_number } });
        if (studentUser) {
          const roomName = studentUser.username.toString();
          const payload = {
            attendanceId: attendance.id,
            title: "Attendance Updated",
            status: attendance.status,
            date: attendance.date,
            remarks: attendance.remarks,
            updatedAt: attendance.updatedAt,
            message: `Your attendance for ${attendance.date} has been updated to ${attendance.status}.`
          };
          io.to(roomName).emit('attendanceUpdated', payload);
          console.log(`Socket attendance update notification sent to room: ${roomName}`);
        } else {
          console.warn(`No matching user found for admission_number: ${student.admission_number}`);
        }
      }
    }

    res.status(200).json({ message: 'Attendance record updated successfully', attendance });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete an attendance record
exports.deleteAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const attendance = await Attendance.findByPk(id);
    if (!attendance) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }
    await attendance.destroy();
    res.status(200).json({ message: 'Attendance record deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get attendance records by date and class
exports.getAttendanceByDateAndClass = async (req, res) => {
  try {
    const { date, classId } = req.params; // Expecting URL: /attendance/date/:date/:classId

    const attendances = await Attendance.findAll({
      where: { date },
      include: [
        {
          model: Student,
          as: 'student',
          where: { class_id: classId },  // Filter by class_id
          attributes: ['id', 'name', 'class_id']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    res.status(200).json(attendances);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get attendance records for the logged-in student
exports.getAttendanceForLoggedInStudent = async (req, res) => {
  try {
    // Use the username from the token, which corresponds to the student's admission_number
    const admissionNumber = req.user.username;

    // Verify that the student exists by searching using the admission_number field
    const student = await Student.findOne({ where: { admission_number: admissionNumber } });
    if (!student) {
      return res.status(404).json({ message: 'Student record not found' });
    }

    // Retrieve all attendance records for the student using the student's unique id
    const attendances = await Attendance.findAll({
      where: { studentId: student.id },
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'name', 'class_id']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name']
        }
      ]
    });

    res.status(200).json(attendances);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get class-wise summary of attendance for today's date
exports.getClassAndSectionWiseSummaryForToday = async (req, res) => {
  try {
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split("T")[0];

    // Retrieve all attendance records for today,
    // including the student's class_id and section_id,
    // as well as the Class and Section models to get their names.
    const attendances = await Attendance.findAll({
      where: { date: today },
      include: [
        {
          model: Student,
          as: "student",
          attributes: ["class_id", "section_id"],
          include: [
            {
              model: require("../models").Class,
              as: "Class",
              attributes: ["class_name"],
            },
            {
              model: require("../models").Section,
              as: "Section",
              attributes: ["section_name"],
            },
          ],
        },
      ],
    });

    // Group the records by class and section
    const summaryMap = {};
    attendances.forEach((record) => {
      if (!record.student) return;
      const classId = record.student.class_id;
      const sectionId = record.student.section_id;
      const className = record.student.Class ? record.student.Class.class_name : "Unknown";
      const sectionName = record.student.Section ? record.student.Section.section_name : "Unknown";
      const key = `${classId}_${sectionId}`;
      if (!summaryMap[key]) {
        summaryMap[key] = {
          class_id: classId,
          class_name: className,
          section_id: sectionId,
          section_name: sectionName,
          total: 0,
          absent: 0,
          leave: 0,
        };
      }
      summaryMap[key].total += 1;
      if (record.status.toLowerCase() === "absent") {
        summaryMap[key].absent += 1;
      } else if (record.status.toLowerCase() === "leave") {
        summaryMap[key].leave += 1;
      }
    });

    const summaryArray = Object.values(summaryMap).sort((a, b) => {
      if (a.class_id === b.class_id) {
        return (a.section_id || 0) - (b.section_id || 0);
      }
      return a.class_id - b.class_id;
    });

    res.status(200).json({ date: today, summary: summaryArray });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get class-wise summary of attendance by a given date
exports.getClassAndSectionWiseSummaryByDate = async (req, res) => {
  try {
    const { date } = req.params;
    const attendances = await Attendance.findAll({
      where: { date },
      include: [
        {
          model: Student,
          as: "student",
          attributes: ["class_id", "section_id"],
          include: [
            {
              model: require("../models").Class,
              as: "Class",
              attributes: ["class_name"],
            },
            {
              model: require("../models").Section,
              as: "Section",
              attributes: ["section_name"],
            },
          ],
        },
      ],
    });

    const summaryMap = {};
    attendances.forEach((record) => {
      if (!record.student) return;
      const classId = record.student.class_id;
      const sectionId = record.student.section_id;
      const className = record.student.Class ? record.student.Class.class_name : "Unknown";
      const sectionName = record.student.Section ? record.student.Section.section_name : "Unknown";
      const key = `${classId}_${sectionId}`;
      if (!summaryMap[key]) {
        summaryMap[key] = {
          class_id: classId,
          class_name: className,
          section_id: sectionId,
          section_name: sectionName,
          total: 0,
          absent: 0,
          leave: 0,
        };
      }
      summaryMap[key].total += 1;
      if (record.status.toLowerCase() === "absent") {
        summaryMap[key].absent += 1;
      } else if (record.status.toLowerCase() === "leave") {
        summaryMap[key].leave += 1;
      }
    });

    const summaryArray = Object.values(summaryMap).sort((a, b) => {
      if (a.class_id === b.class_id) {
        return (a.section_id || 0) - (b.section_id || 0);
      }
      return a.class_id - b.class_id;
    });

    res.status(200).json({ date, summary: summaryArray });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
