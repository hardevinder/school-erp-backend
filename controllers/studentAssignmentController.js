const { Op } = require("sequelize");
const axios = require('axios');
const admin = require('../utils/firebaseAdmin');
const { 
  Assignment, 
  StudentAssignment, 
  AssignmentFile, 
  Student, 
  Class, 
  Section, 
  Subject, 
  User 
} = require('../models');
console.log(StudentAssignment); // Debugging: Check if it's undefined

// Assign an assignment to multiple students, now including optional remarks and real-time notifications
exports.assignToStudents = async (req, res) => {
  try {
    const { id: assignmentId } = req.params; // Assignment ID from URL params
    const { studentIds, dueDate, remarks } = req.body; // Expect an array of student IDs, optional dueDate and remarks

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ error: 'No student IDs provided.' });
    }

    // Validate that the assignment exists and re-fetch with Subject and Teacher info
    const assignment = await Assignment.findByPk(assignmentId, {
      include: [
        { model: Subject, as: 'subject', attributes: ['name'] },
        { model: User, as: 'Teacher', attributes: ['name'] },
      ]
    });
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found.' });
    }

    // Create a record for each student, including remarks if provided
    const assignmentRecords = studentIds.map((studentId) => ({
      assignmentId,
      studentId,
      status: 'pending',
      createdBy: req.user.id,
      dueDate: dueDate || null,
      remarks: remarks || null,
    }));

    // Use bulkCreate with the returning option (supported in PostgreSQL, for example)
    const newAssignments = await StudentAssignment.bulkCreate(assignmentRecords, { returning: true });

    // Retrieve the Socket.IO instance from the Express app
    const io = req.app.get('socketio');
    if (io) {
      // For each new assignment, retrieve the student's record, then find the corresponding User
      // by matching studentRecord.admission_number with User.username.
      for (const assignmentRecord of newAssignments) {
        const studentRecord = await Student.findByPk(assignmentRecord.studentId);
        if (studentRecord && studentRecord.admission_number) {
          // Find the User whose username matches the student's admission_number
          const studentUser = await User.findOne({ where: { username: studentRecord.admission_number } });
          if (studentUser) {
            const roomName = studentUser.username.toString(); // should equal studentRecord.admission_number
            // Build complete notification payload
            const notificationPayload = {
              assignmentId: assignmentRecord.assignmentId,
              title: assignment.title,
              subject: assignment.subject ? assignment.subject.name : "N/A",
              teacher: assignment.Teacher ? assignment.Teacher.name : "N/A",
              dueDate: dueDate || null,
              remarks: remarks || null,
              createdAt: assignmentRecord.createdAt,
            };
            io.to(roomName).emit('assignmentAssigned', notificationPayload);
            console.log(`Socket notification sent to room: ${roomName}`);
            // 🔔 Send FCM Notification
            const fcmDoc = await admin.firestore().collection('users').doc(studentUser.username).get();
            const fcmToken = fcmDoc.exists ? fcmDoc.data().fcmToken : null;

            if (fcmToken) {
              await axios.post(`${process.env.BASE_URL || 'http://localhost:3000'}/send-notification`, {
                fcmToken,
                title: '📚 New Assignment Assigned',
                body: `${assignment.title} - Due: ${dueDate ? dueDate.slice(0, 10) : 'No due date'}`
              }).then(() => {
                console.log(`✅ FCM push sent to ${studentUser.username}`);
              }).catch(err => {
                console.warn(`❌ FCM push failed for ${studentUser.username}:`, err.message);
              });
            } else {
              console.warn(`FCM token not found for ${studentUser.username}`);
            }

          } else {
            console.warn(`No matching user found for admission_number: ${studentRecord.admission_number}`);
          }
        } else {
          console.warn(`Student record not found or missing admission_number for studentId: ${assignmentRecord.studentId}`);
        }
      }
    } else {
      console.warn("Socket.io instance not found in app locals.");
    }

    // Set no-cache headers to ensure fresh data on subsequent GET requests
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');

    return res.status(201).json({ 
      message: 'Assignment assigned successfully.',
      newAssignments 
    });
  } catch (error) {
    console.error("Error assigning assignment:", error);
    if (error.original) {
      console.error("Original error:", error.original);
    }
    return res.status(500).json({ error: error.message });
  }
};

// Get assignments created by the authenticated teacher, including student details with Class and Section
exports.getAssignmentsForTeacher = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const assignments = await Assignment.findAll({
      where: { teacherId },
      include: [
        {
          model: StudentAssignment,
          as: 'StudentAssignments',
          include: [
            {
              model: Student,
              as: 'Student',
              include: [
                { model: Class, as: 'Class' },
                { model: Section, as: 'Section' }
              ]
            }
          ]
        },
        {
          model: AssignmentFile,
          as: 'AssignmentFiles'
        },
        {
          model: Subject,
          as: 'subject',
          attributes: ['name']
        }
      ]
    });

    res.status(200).json({ assignments });
  } catch (error) {
    console.error("Error fetching teacher assignments:", error.stack);
    res.status(500).json({ error: error.message });
  }
};

// Update assignment status (and optionally dueDate, grade, remarks) for a student assignment
exports.updateAssignmentStatus = async (req, res) => {
  try {
    const { id } = req.params; // StudentAssignment record ID
    const { status, submittedAt, grade, dueDate, remarks } = req.body;

    const studentAssignment = await StudentAssignment.findByPk(id);
    if (!studentAssignment) {
      return res.status(404).json({ error: 'Student assignment not found.' });
    }

    await studentAssignment.update({ status, submittedAt, grade, dueDate, remarks });

    // Emit a real-time update notification to the student
    const io = req.app.get('socketio');
    if (io) {
      const studentRecord = await Student.findByPk(studentAssignment.studentId);
      if (studentRecord && studentRecord.admission_number) {
        const studentUser = await User.findOne({ where: { username: studentRecord.admission_number } });
        if (studentUser) {
          const roomName = studentUser.username.toString();
          // Re-fetch assignment details to include title, subject, teacher, etc.
          const assignment = await Assignment.findByPk(studentAssignment.assignmentId, {
            include: [
              { model: Subject, as: 'subject', attributes: ['name'] },
              { model: User, as: 'Teacher', attributes: ['name'] },
            ]
          });
          // Build payload with assignment details if available
          const payload = assignment ? {
            assignmentId: studentAssignment.assignmentId,
            title: assignment.title,
            subject: assignment.subject ? assignment.subject.name : "N/A",
            teacher: assignment.Teacher ? assignment.Teacher.name : "N/A",
            dueDate: studentAssignment.dueDate,
            remarks: studentAssignment.remarks,
            studentAssignment, // full assignment record
            message: "Assignment has been updated.",
          } : {
            studentAssignment,
            message: "Assignment has been updated.",
          };

          io.to(roomName).emit('assignmentUpdated', payload);
          console.log(`Socket update notification sent to room: ${roomName}`);
        } else {
          console.warn(`No matching user found for admission_number: ${studentRecord.admission_number}`);
        }
      }
    }

    res.status(200).json({
      message: 'Student assignment updated successfully.',
      studentAssignment,
    });
  } catch (error) {
    console.error("Error updating student assignment:", error.stack);
    res.status(500).json({ error: error.message });
  }
};

// Delete student assignments by exact datetime (provided as full ISO string)
exports.deleteStudentAssignmentsByDate = async (req, res) => {
  try {
    const { date } = req.params;
    const targetDate = new Date(date);
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ error: "Invalid datetime format." });
    }

    // Find all student assignments with an exact match on createdAt.
    const studentAssignments = await StudentAssignment.findAll({
      where: { createdAt: targetDate }
    });

    if (!studentAssignments || studentAssignments.length === 0) {
      return res.status(404).json({ error: "No student assignments found for that exact datetime." });
    }

    const io = req.app.get('socketio');

    // Delete all found records in parallel and send notifications for each deletion
    await Promise.all(studentAssignments.map(async (sa) => {
      await sa.destroy();
      if (io) {
        const studentRecord = await Student.findByPk(sa.studentId);
        if (studentRecord && studentRecord.admission_number) {
          const studentUser = await User.findOne({ where: { username: studentRecord.admission_number } });
          if (studentUser) {
            const roomName = studentUser.username.toString();
            io.to(roomName).emit('assignmentDeleted', {
              assignmentId: sa.assignmentId,
              deletedAt: new Date().toISOString(),
              message: "An assignment has been removed.",
            });
            console.log(`Socket deletion notification sent to room: ${roomName}`);
          } else {
            console.warn(`No matching user found for admission_number: ${studentRecord.admission_number}`);
          }
        }
      }
    }));

    res.status(200).json({ message: "Student assignments deleted successfully." });
  } catch (error) {
    console.error("Error deleting student assignments by datetime:", error.stack);
    res.status(500).json({ error: error.message });
  }
};

// Get assignments for the authenticated student
exports.getAssignmentsForStudent = async (req, res) => {
  try {
    const { username } = req.user;
    if (!username) {
      return res.status(400).json({ error: "Logged in user's username is missing." });
    }

    // Find the student record by matching the admission_number with the username
    const student = await Student.findOne({ where: { admission_number: username } });
    if (!student) {
      return res.status(404).json({ error: "Student not found." });
    }

    const assignments = await Assignment.findAll({
      include: [
        {
          model: StudentAssignment,
          as: 'StudentAssignments',
          where: { studentId: student.id },
          required: true
        },
        {
          model: AssignmentFile,
          as: 'AssignmentFiles'
        },
        {
          model: Subject,
          as: 'subject',
          attributes: ['name']
        },
        {
          model: User,
          as: 'Teacher',
          attributes: ['name']
        }
      ]
    });

    res.status(200).json({ assignments });
  } catch (error) {
    console.error("Error fetching assignments for student:", error);
    res.status(500).json({ error: error.message });
  }
};
