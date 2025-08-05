const { Transaction, Student, FeeHeading, sequelize } = require("../models");
const razorpay = require("../razorpayInstance"); // Razorpay Instance
const crypto = require("crypto");

const studentFeeController = {
  // 📌 2️⃣ Create Razorpay Order for Student Payment
  createOrder: async (req, res) => {
    try {
      // Extract feeHeadId in addition to admissionNumber and amount
      let { admissionNumber, amount, feeHeadId } = req.body;

      // Validate required fields
      if (!admissionNumber || !amount || feeHeadId === undefined) {
        return res.status(400).json({
          success: false,
          message: "Admission number, amount and feeHeadId are required.",
        });
      }

      // Ensure feeHeadId is numeric
      feeHeadId = Number(feeHeadId);
      if (isNaN(feeHeadId)) {
        return res.status(400).json({
          success: false,
          message: "feeHeadId must be a numeric value.",
        });
      }

      // Convert and validate amount
      amount = Number(amount);
      if (isNaN(amount) || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: "Amount must be a valid number greater than zero.",
        });
      }

      // 🔹 Ensure the authenticated user is a student and their username matches the admissionNumber.
      if (!req.user || req.user.role !== "student") {
        return res.status(403).json({
          success: false,
          message: "Access Denied. Not a student.",
        });
      }
      if (req.user.username !== admissionNumber) {
        return res.status(403).json({
          success: false,
          message: "Username mismatch. You are not authorized to create an order for another student.",
        });
      }

      // 🔹 Fetch Student Details using admission_number
      const student = await Student.findOne({ where: { admission_number: admissionNumber } });
      if (!student) {
        return res.status(404).json({ success: false, message: "Student not found" });
      }

      // Create Razorpay order options with feeHeadId in notes (convert feeHeadId to string if needed)
      const options = {
        amount: amount * 100, // Convert amount from ₹ to paise
        currency: "INR",
        receipt: `receipt_${admissionNumber}_${Date.now()}`,
        payment_capture: 1,
        notes: {
          admissionNumber,
          feeHeadId: feeHeadId.toString(),
        },
      };

      const order = await razorpay.orders.create(options);

      return res.json({ success: true, order });
    } catch (error) {
      console.error("❌ Error creating Razorpay order:", error);
      return res.status(500).json({ success: false, message: "Failed to create order" });
    }
  },

  // 📌 3️⃣ Verify Payment & Update Fee Status
  verifyPayment: async (req, res) => {
    try {
      let {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        admissionNumber,
        amount,
        feeHeadId, // Extract feeHeadId from the request body
        // Removing userId from request body in favor of req.user for security.
      } = req.body;
  
      // Validate required fields
      if (
        !razorpay_order_id ||
        !razorpay_payment_id ||
        !razorpay_signature ||
        !admissionNumber ||
        !amount ||
        feeHeadId === undefined
      ) {
        return res.status(400).json({
          success: false,
          message: "Required payment parameters are missing.",
        });
      }
  
      // Ensure feeHeadId is numeric
      feeHeadId = Number(feeHeadId);
      if (isNaN(feeHeadId)) {
        return res.status(400).json({
          success: false,
          message: "feeHeadId must be a numeric value.",
        });
      }
  
      // 🔹 Ensure the authenticated user is a student and their username matches the admissionNumber.
      if (!req.user || req.user.role !== "student") {
        return res.status(403).json({
          success: false,
          message: "Access Denied. Not a student.",
        });
      }
      if (req.user.username !== admissionNumber) {
        return res.status(403).json({
          success: false,
          message: "Username mismatch. You are not authorized to verify payment for another student.",
        });
      }
  
      const secret = process.env.RAZORPAY_KEY_SECRET;
      const hmac = crypto.createHmac("sha256", secret);
      hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
      const generated_signature = hmac.digest("hex");
  
      if (generated_signature === razorpay_signature) {
        // 🔹 Fetch Student Details using admission_number
        const student = await Student.findOne({ where: { admission_number: admissionNumber } });
        if (!student) {
          return res.status(404).json({ success: false, message: "Student not found" });
        }
  
        // Get the current maximum Slip_ID and increment it by 1
        const maxSlip = await Transaction.max("Slip_ID");
        const newSlipId = (maxSlip || 0) + 1;
  
        // Use the authenticated user's ID as creator
        const creatorId = req.user.id;
  
        // ✅ Payment verified; record the successful payment.
        await Transaction.create({
          Student_ID: admissionNumber,         // Student_ID is same as admission_number
          AdmissionNumber: admissionNumber,      // Saving AdmissionNumber separately
          Class_ID: student.class_id,            // Fetch Class_ID from student record
          Fee_Recieved: amount,                  // Storing the paid amount
          PaymentMode: "Online",
          Transaction_ID: razorpay_payment_id,
          status: "paid",
          DateOfTransaction: new Date().toISOString(),
          Slip_ID: newSlipId,
          Fee_Head: feeHeadId,                   // Store Fee_Head ID (numeric)
          VanFee: 0,                           // Set VanFee to 0
          Van_Fee_Concession: 0,               // Set Van_Fee_Concession to 0
          Concession: 0,
          CreatedBy: creatorId,                // Use the authenticated user's ID
        });
  
        // Emit a WebSocket event so the front end can refresh automatically.
        if (global.io) {
          global.io.emit("payment-updated", { admissionNumber });
        }
  
        return res.json({
          success: true,
          message: "Payment Successful",
          payment_id: razorpay_payment_id,
        });
      } else {
        console.error("❌ Payment verification failed for order:", razorpay_order_id);
        return res.status(400).json({ success: false, message: "Payment verification failed" });
      }
    } catch (error) {
      console.error("❌ Error verifying payment:", error);
      return res.status(500).json({ success: false, message: "Failed to verify payment" });
    }
  },
  
  // 📌 4️⃣ Handle Razorpay Webhook (For Automated Payment Capture)
  handleWebhook: async (req, res) => {
    try {
      const secret = process.env.RAZORPAY_KEY_SECRET;
      const shasum = crypto.createHmac("sha256", secret);
      shasum.update(JSON.stringify(req.body));
      const generatedSignature = shasum.digest("hex");

      if (generatedSignature !== req.headers["x-razorpay-signature"]) {
        console.error("❌ Invalid Razorpay Signature for Webhook");
        return res.status(400).json({ success: false, message: "Invalid Webhook Signature" });
      }

      console.log("✅ Webhook Signature Verified");

      const event = req.body;
      if (event.event === "payment.captured") {
        const { id, amount, order_id } = event.payload.payment.entity;

        // 🔹 Extract Admission Number from Receipt ID (assuming format: receipt_admissionNumber_timestamp)
        const admissionNumber = order_id.split("_")[1];

        // 🔹 Fetch Student Details using admission_number
        const student = await Student.findOne({ where: { admission_number: admissionNumber } });
        if (!student) {
          console.error("❌ Student not found for AdmissionNumber:", admissionNumber);
          return res.status(404).json({ success: false, message: "Student not found" });
        }

        // Attempt to retrieve feeHeadId from the order's notes via Razorpay
        let feeHeadId = null;
        try {
          const orderDetails = await razorpay.orders.fetch(order_id);
          feeHeadId = Number(orderDetails.notes.feeHeadId);
        } catch (err) {
          console.error("Error fetching order details for feeHeadId:", err);
        }

        // Get the current maximum Slip_ID and increment by 1
        const maxSlip = await Transaction.max("Slip_ID");
        const newSlipId = (maxSlip || 0) + 1;

        // ✅ Save the transaction in the database along with Slip_ID and Fee_Head.
        await Transaction.create({
          Student_ID: admissionNumber,
          AdmissionNumber: admissionNumber, // Save AdmissionNumber here
          Class_ID: student.class_id,
          Fee_Recieved: amount / 100, // Convert from paise to INR
          PaymentMode: "Online",
          Transaction_ID: id,
          status: "paid",
          DateOfTransaction: new Date().toISOString(),
          Slip_ID: newSlipId,
          Fee_Head: feeHeadId,
        });

        // Emit WebSocket event for real-time updates.
        if (global.io) {
          global.io.emit("payment-updated", { admissionNumber });
        }

        console.log("✅ Webhook Payment Captured & Saved in Database");
      }

      return res.json({ success: true, message: "Webhook processed successfully" });
    } catch (error) {
      console.error("❌ Error Processing Webhook:", error);
      return res.status(500).json({ success: false, message: "Webhook processing failed" });
    }
  },
};

module.exports = studentFeeController;
