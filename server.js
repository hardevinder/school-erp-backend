require('dotenv').config();
const cors = require('cors');
const express = require('express');
const bodyParser = require('body-parser');
const sequelize = require('./config/database');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Import Routes
const userRoutes = require('./routes/userRoutes');
const classRoutes = require("./routes/classes");
const studentRoutes = require('./routes/students');
const feeStructureRoutes = require('./routes/feeStructureRoutes');
const feeHeadingRoutes = require('./routes/feeHeadingRoutes');
const sectionRoutes = require("./routes/sectionRoutes");
const transportationRoutes = require("./routes/transportationRoutes");
const transactionRoutes = require('./routes/transactionRoutes');
const schoolRoutes = require('./routes/schoolRoutes');
const uploadRoutes = require("./routes/uploadRoutes");
const concessionsRoutes = require("./routes/concessions");
const feeRoutes = require('./routes/feeDueRoutes');
const feeCategoryRoutes = require('./routes/feeCategoryRoutes');
const reportRoutes = require('./routes/reportRoutes');
const superAdminRoutes = require("./routes/superAdminRoutes");
const StudentAppRoutes = require("./routes/StudentAppRoutes");
const paymentRoutes = require("./routes/payment");
const studentFeeRoutes = require('./routes/studentFeeRoutes');
const subjectRoutes = require("./routes/subjects");
const teacherRoutes = require("./routes/teacherRoutes");
const inchargeRoutes = require('./routes/inchargeRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const holidayRoutes = require("./routes/holidayRoutes");
const leaveRoutes = require('./routes/leaveRoutes');
const assignmentRoutes = require('./routes/assignmentRoutes');
const teacherStudentRoutes = require("./routes/teacherStudentRoutes");
const studentAssignmentRoutes = require('./routes/studentAssignmentRoutes');
const razorpayWebhookRoutes = require("./routes/razorpayWebhookRoutes");
const classSubjectTeacherRoutes = require("./routes/classSubjectTeacherRoutes");
const periodRoutes = require('./routes/periodRoutes');
const pctRoutes = require('./routes/periodClassTeacherSubjectRoutes');
const substitutionRoutes = require('./routes/substitutionRoutes');
const lessonPlanRoutes = require('./routes/lessonPlans');
const chatUploadRoutes = require("./routes/chatUploadRoutes");
const circularRoutes = require("./routes/circularRoutes");
const feeStatusRoutes = require('./routes/feeStatusRoutes'); // ✅ Add this
const roles = require('./routes/roles'); // ✅ Add this
const openaiRoutes = require('./routes/openaiRoutes'); // ✅ Add this
const fcmRoutes = require('./routes/fcmRoutes'); // ✅ Add this
const chatRoutes = require('./routes/chatRoutes');
const employeeRoutes = require("./routes/employees"); // ✅ NEW
const departmentRoutes = require("./routes/departments"); // ✅ NEW
const employeeAttendanceRoutes = require('./routes/employeeAttendance'); // ✅ NEW
const employeeLeaveTypeRoutes = require('./routes/employeeLeaveTypeRoutes'); // ✅ This is your actual file
const employeeLeaveBalanceRoutes = require('./routes/employeeLeaveBalanceRoutes');
const employeeLeaveRequestRoutes = require('./routes/employeeLeaveRequestRoutes'); // ✅ NEW
const examResultRoutes = require('./routes/examResultRoutes');
const gradeRoutes = require('./routes/gradeSchemeRoutes');
const examSchemeRoutes = require("./routes/examSchemeRoutes");
const termRoutes = require("./routes/termRoutes");
const assessmentComponentRoutes = require("./routes/assessmentComponentRoutes");
const academicYearRoutes = require("./routes/academicYearRoutes"); // ✅ NEW
const examScheduleRoutes = require("./routes/examScheduleRoutes"); // ✅ NEW
const examRoutes = require("./routes/examRoutes"); // ✅ NEW
const studentRollRoutes = require('./routes/studentRollRoutes'); // ✅ NEW
const marksEntryRoutes = require("./routes/marksEntryRoutes"); // 📌 Import at top
const resultReportRoutes = require('./routes/resultReportRoutes'); // ✅ NEW
const studentResultReportRoutes = require("./routes/studentResultReportRoutes");
const combinedExamSchemeRoutes = require('./routes/combinedExamSchemeRoutes'); // ✅ NEW
const finalReportRoutes = require('./routes/finalReportRoutes'); // ✅ NEW
const finalPDFReportRoute = require('./routes/finalPDFReportRoute'); // ✅ NEW
const coScholasticAreaRoutes = require("./routes/coScholasticAreaRoutes");
const coScholasticGradeRoutes = require("./routes/coScholasticGradeRoutes"); // ✅ NEW
const classCoScholasticAreaRoutes = require('./routes/classCoScholasticAreaRoutes'); // ✅ NEW
const studentCoScholasticEvaluationRoutes = require('./routes/studentCoScholasticEvaluationRoutes'); // ✅ NEW
const studentRemarkRoutes = require('./routes/studentRemarkRoutes'); // ✅ NEW
const reportCardFormatRoutes = require('./routes/reportCardFormatRoutes'); // ✅ NEW
const reportCardRoutes = require('./routes/reportCardRoutes'); // ✅ NEW














const app = express();
const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});
app.set('socketio', io);

io.on('connection', socket => {
  console.log('A user connected via Socket.io:', socket.id);

  const token = socket.handshake.query.token;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (decoded.role === "teacher" || decoded.role === "academic_coordinator") {
        const teacherRoom = `teacher-${decoded.id}`;
        socket.join(teacherRoom);
        socket.join('teachers');
        console.log(`Socket ${socket.id} joined rooms ${teacherRoom} & teachers`);
      } else {
        socket.join(decoded.username);
        socket.join('students');
        console.log(`Socket ${socket.id} joined rooms ${decoded.username} & students`);
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      socket.disconnect(true);
      return;
    }
  } else {
    socket.on('joinRoom', ({ room }) => {
      socket.join(room);
      console.log(`Socket ${socket.id} joined room ${room}`);
    });
  }

  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);
  });
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());

app.get('/', (req, res) => res.send('Server is running!'));

app.post('/send-notification', async (req, res) => {
  const { token, title, body } = req.body;
  try {
    const response = await admin.messaging().send({ notification: { title, body }, token });
    res.status(200).json({ success: true, response });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({ success: false, error: error.toString() });
  }
});

app.use('/users', userRoutes);
app.use('/classes', classRoutes);
app.use('/students', studentRoutes);
app.use('/fee-structures', feeStructureRoutes);
app.use('/fee-headings', feeHeadingRoutes);
app.use('/sections', sectionRoutes);
app.use('/transportations', transportationRoutes);
app.use('/transactions', transactionRoutes);
app.use('/schools', schoolRoutes);
app.use('/upload', uploadRoutes);
app.use('/concessions', concessionsRoutes);
app.use('/feedue', feeRoutes);
app.use('/feedue-status', feeStatusRoutes); 
app.use('/fee_categories', feeCategoryRoutes);
app.use('/reports', reportRoutes);
app.use('/super-admin', superAdminRoutes);
app.use('/StudentsApp', StudentAppRoutes);
app.use('/api', paymentRoutes);
app.use('/student-fee', studentFeeRoutes);
app.use('/subjects', subjectRoutes);
app.use('/attendance', attendanceRoutes);
app.use('/leave', leaveRoutes);
app.use('/razorpay', razorpayWebhookRoutes);
app.use('/class-subject-teachers', classSubjectTeacherRoutes);
app.use('/teachers', teacherRoutes);
app.use('/incharges', inchargeRoutes);
app.use('/holidays', holidayRoutes);
app.use('/assignments', assignmentRoutes);
app.use('/teacher-students', teacherStudentRoutes);
app.use('/student-assignments', studentAssignmentRoutes);
app.use('/periods', periodRoutes);
app.use('/period-class-teacher-subject', pctRoutes);
app.use('/substitutions', substitutionRoutes);
app.use('/lesson-plans', lessonPlanRoutes);
app.use("/upload", chatUploadRoutes);
app.use('/circulars', circularRoutes);
app.use('/openai', openaiRoutes); // ✅ Add this line below other routes
app.use('/fcm', fcmRoutes); // ✅ Add this
app.use('/chat', chatRoutes);
app.use('/roles', roles);
app.use('/exam-results', examResultRoutes);
app.use('/grade-schemes', gradeRoutes);
app.use('/employees', employeeRoutes); // ✅ NEW
app.use('/departments', departmentRoutes); // ✅ NEW
app.use('/employee-attendance', employeeAttendanceRoutes); // ✅ NEW
app.use('/employee-leave-types', employeeLeaveTypeRoutes);
app.use('/employee-leave-balances', employeeLeaveBalanceRoutes);
app.use('/employee-leave-requests', employeeLeaveRequestRoutes); // ✅ NEW
app.use("/exam-schemes", examSchemeRoutes);
app.use("/terms", termRoutes);
app.use("/assessment-components", assessmentComponentRoutes);
app.use("/academic-years", academicYearRoutes); // ✅ NEW
app.use("/exam-schedules", examScheduleRoutes); // ✅ NEW
app.use("/exams", examRoutes); // ✅ Add this line
app.use('/student-roll', studentRollRoutes); // ✅ NEW
app.use("/marks-entry", marksEntryRoutes); // 📌 Add in route section
app.use('/result-report', resultReportRoutes); // ✅ Mount result report generator
app.use("/student-result-report", studentResultReportRoutes);
app.use('/combined-exam-schemes', combinedExamSchemeRoutes); // ✅ Mount combined exam routes
app.use('/final-report', finalReportRoutes); // ✅ Consistent style
app.use('/final-report', finalPDFReportRoute); // ✅ NEW: PDF Final Report Export
app.use("/co-scholastic-areas", coScholasticAreaRoutes);
app.use("/co-scholastic-grades", coScholasticGradeRoutes);
app.use('/class-co-scholastic-areas', classCoScholasticAreaRoutes); // ✅ NEW
app.use('/coscholastic-evaluations', studentCoScholasticEvaluationRoutes); // ✅ NEW
app.use('/student-remarks', studentRemarkRoutes); // ✅ Add this line
app.use('/report-card-formats', reportCardFormatRoutes);
app.use('/report-card', reportCardRoutes); 



sequelize.authenticate()
  .then(() => console.log('✅ Database connected...'))
  .catch(err => console.error('❌ Unable to connect:', err));

sequelize.sync().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
});
