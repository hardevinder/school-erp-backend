const { LeaveRequest, Student, Attendance, Incharge, Class } = require("../models");
const sequelize = require("../config/database"); // Adjust path if necessary

// Create a new leave request using the logged-in student's admission_number.
exports.createLeaveRequest = async (req, res) => {
  try {
    console.log("Authenticated user:", req.user);
    console.log("Request body:", req.body);

    const { date, reason } = req.body;
    if (!date || !reason) {
      return res.status(400).json({ error: "Both date and reason are required." });
    }

    // Lookup the student by their admission_number (stored in req.user.username)
    const studentRecord = await Student.findOne({
      where: { admission_number: req.user.username }
    });

    if (!studentRecord) {
      return res.status(404).json({ error: "Student not found." });
    }

    // Use the actual student's id from the record for the foreign key.
    const student_id = studentRecord.id;

    const leaveRequest = await LeaveRequest.create({
      student_id,
      date,
      reason,
      status: "pending"
    });

    // Emit notification to teacher(s) for realtime update.
    const io = req.app.get("socketio");
    if (io) {
      // Find teacher(s) in charge for the student's class and section.
      const inchargeRecords = await Incharge.findAll({
        where: {
          classId: studentRecord.class_id,
          sectionId: studentRecord.section_id
        }
      });
      inchargeRecords.forEach(record => {
        // Assumes that teacher clients have joined a socket room named "teacher-<teacherId>"
        const roomName = `teacher-${record.teacherId}`;
        const payload = {
          leaveRequestId: leaveRequest.id,
          student: {
            id: studentRecord.id,
            name: studentRecord.name,
            admission_number: studentRecord.admission_number,
          },
          date: leaveRequest.date,
          reason: leaveRequest.reason,
          status: leaveRequest.status,
          message: `New leave request from ${studentRecord.name} for ${leaveRequest.date}.`
        };
        io.to(roomName).emit("newLeaveRequest", payload);
        console.log(`Notification sent to teacher room ${roomName}:`, payload);
      });
    }

    return res.status(201).json(leaveRequest);
  } catch (error) {
    console.error("Error creating leave request:", error);
    return res.status(500).json({ error: error.message });
  }
};

// Get all pending leave requests (for teacher/admin/academic_coordinator use)
exports.getPendingLeaveRequests = async (req, res) => {
  try {
    if (req.user.role === "teacher") {
      const teacherId = req.user.id;

      // Fetch classes & sections where the teacher is in charge.
      const inchargeClasses = await Incharge.findAll({
        where: { teacherId },
        attributes: ["classId", "sectionId"]
      });

      if (inchargeClasses.length === 0) {
        return res.status(403).json({ error: "You are not in charge of any classes." });
      }

      // Fetch all pending leave requests with student details.
      const requests = await LeaveRequest.findAll({
        where: { status: "pending" },
        include: [
          {
            model: Student,
            as: "Student",
            attributes: ["id", "name", "class_id", "section_id"],
            include: [
              {
                model: Class,
                as: "Class",
                attributes: ["class_name"]
              }
            ]
          }
        ],
        order: [["created_at", "DESC"]]
      });

      return res.json(requests);
    }

    // For admin, superadmin, or academic_coordinator, return all pending leave requests.
    if (["admin", "superadmin", "academic_coordinator"].includes(req.user.role)) {
      const requests = await LeaveRequest.findAll({
        where: { status: "pending" },
        include: [
          {
            model: Student,
            as: "Student",
            attributes: ["id", "name", "class_id", "section_id"]
          }
        ],
        order: [["created_at", "DESC"]]
      });

      return res.json(requests);
    }

    return res.status(403).json({ error: "You are not authorized to view leave requests." });
  } catch (error) {
    console.error("Error fetching pending leave requests:", error);
    return res.status(500).json({ error: error.message });
  }
};

// Get a single leave request by its ID.
exports.getLeaveRequestById = async (req, res) => {
  try {
    const leaveRequest = await LeaveRequest.findByPk(req.params.id);
    if (!leaveRequest) {
      return res.status(404).json({ error: "Leave request not found." });
    }
    return res.json(leaveRequest);
  } catch (error) {
    console.error("Error fetching leave request:", error);
    return res.status(500).json({ error: error.message });
  }
};

// Update a leave request's status or details.
exports.updateLeaveRequest = async (req, res) => {
  try {
    const requestId = req.params.id;
    const { status, date, reason } = req.body;

    // Find the leave request.
    const leaveRequest = await LeaveRequest.findByPk(requestId);
    if (!leaveRequest) {
      return res.status(404).json({ error: "Leave request not found." });
    }

    console.log("Leave Request student_id:", leaveRequest.student_id, typeof leaveRequest.student_id);
    console.log("Logged in user's username:", req.user.username, typeof req.user.username);

    // For students, ensure they update only their own pending request.
    if (req.user.role === "student") {
      // Lookup student record by admission_number to compare IDs.
      const studentRecord = await Student.findOne({
        where: { admission_number: req.user.username }
      });
      if (!studentRecord || String(leaveRequest.student_id) !== String(studentRecord.id)) {
        console.log("Mismatch: ", leaveRequest.student_id, studentRecord ? studentRecord.id : "undefined");
        return res.status(403).json({ error: "You are not authorized to update this leave request." });
      }

      if (leaveRequest.status !== "pending") {
        return res.status(400).json({ error: "Cannot update a leave request that has been processed." });
      }

      // Allow student to update only date and reason.
      leaveRequest.date = date || leaveRequest.date;
      leaveRequest.reason = reason || leaveRequest.reason;
    } else {
      // For teacher/admin updates, allow updating the status.
      leaveRequest.status = status || leaveRequest.status;
    }

    await leaveRequest.save();

    // If the leave request is processed (accepted or rejected), send a notification.
    if (status && status !== "pending") {
      // For accepted status, update attendance accordingly.
      if (status === "accepted") {
        await updateAttendanceForLeave(leaveRequest, req.user.id);
      }

      // Emit notification to the student via Socket.io.
      const io = req.app.get("socketio");
      if (io) {
        // Look up the student's record.
        const studentRecord = await Student.findByPk(leaveRequest.student_id);
        if (studentRecord) {
          // Use the student's admission_number as the room name.
          const roomName = studentRecord.admission_number;
          const payload = {
            leaveRequestId: leaveRequest.id,
            status: leaveRequest.status,
            message: `Your leave request for ${leaveRequest.date} has been ${leaveRequest.status}.`
          };
          io.to(roomName).emit("leaveStatusUpdated", payload);
          console.log(`Notification sent to room ${roomName}:`, payload);
        }
      }
    }

    return res.json(leaveRequest);
  } catch (error) {
    console.error("Error updating leave request:", error);
    return res.status(500).json({ error: error.message });
  }
};

// Helper function: Update or create attendance records for a leave request.
const updateAttendanceForLeave = async (leaveRequest, updaterId) => {
  // Find an existing attendance record for the student on the leave date.
  const existingAttendance = await Attendance.findOne({
    where: {
      studentId: leaveRequest.student_id,
      date: leaveRequest.date,
    },
  });

  if (existingAttendance) {
    existingAttendance.status = "leave";
    existingAttendance.createdBy = updaterId || existingAttendance.createdBy;
    await existingAttendance.save();
  } else {
    // Lookup the student record by admission_number.
    const studentRecord = await Student.findOne({
      where: { admission_number: leaveRequest.student_id }
    });
    if (studentRecord) {
      await Attendance.create({
        studentId: studentRecord.id,
        date: leaveRequest.date,
        status: "leave",
        createdBy: updaterId,
      });
    }
  }
};

// Delete a leave request by its ID.
exports.deleteLeaveRequest = async (req, res) => {
  try {
    const leaveRequest = await LeaveRequest.findByPk(req.params.id);
    if (!leaveRequest) {
      return res.status(404).json({ error: "Leave request not found." });
    }
    await leaveRequest.destroy();
    return res.json({ message: "Leave request deleted successfully." });
  } catch (error) {
    console.error("Error deleting leave request:", error);
    return res.status(500).json({ error: error.message });
  }
};

// Get a summary of leave requests grouped by month using PostgreSQL's DATE_TRUNC.
exports.getLeaveSummaryByMonth = async (req, res) => {
  try {
    const summary = await LeaveRequest.findAll({
      attributes: [
        [sequelize.fn("DATE_TRUNC", "month", sequelize.col("date")), "month"],
        [sequelize.fn("COUNT", sequelize.col("id")), "count"]
      ],
      group: ["month"],
      raw: true,
    });
    return res.json(summary);
  } catch (error) {
    console.error("Error fetching leave summary:", error);
    return res.status(500).json({ error: error.message });
  }
};

// Get leave requests for the logged-in student.
exports.getLeaveRequestsByLoggedInStudent = async (req, res) => {
  try {
    // Lookup the student record using the admission_number stored in req.user.username
    const studentRecord = await Student.findOne({
      where: { admission_number: req.user.username }
    });
    
    if (!studentRecord) {
      return res.status(404).json({ error: "Student not found." });
    }

    // Retrieve leave requests using the student's id (foreign key in LeaveRequest)
    const leaveRequests = await LeaveRequest.findAll({
      where: { student_id: studentRecord.id },
      order: [["created_at", "DESC"]]
    });

    if (!leaveRequests.length) {
      return res.status(404).json({ message: "No leave requests found." });
    }

    return res.json(leaveRequests);
  } catch (error) {
    console.error("Error fetching leave requests for student:", error);
    return res.status(500).json({ error: error.message });
  }
};
