const express = require("express");
const multer = require("multer");
const path = require("path");

const router = express.Router();

// Configure storage for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Store uploaded files in the "uploads" folder
  },
  filename: (req, file, cb) => {
    // Generate a unique filename using Date.now()
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

// File upload route – if you need a separate route for file uploads
router.post("/upload", upload.single("profilePhoto"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded." });
  }
  res.json({ fileUrl: `/uploads/${req.file.filename}` });
});

// Profile update route which includes handling the profile photo upload
router.put("/edit-profile", upload.single("profilePhoto"), async (req, res) => {
  console.log("Received file:", req.file); // Debug log
  try {
    // Extract profile data from req.body
    const { name, email } = req.body;
    // If a file is uploaded, build its URL
    let profilePhotoUrl = "";
    if (req.file) {
      profilePhotoUrl = `/uploads/${req.file.filename}`;
    }
    
    // Here, implement your logic to update the user in your database.
    // For demonstration, we are returning the updated data directly.
    
    // Example: updateUserInDB(userId, { name, email, profilePhoto: profilePhotoUrl });
    
    return res.json({
      message: "Profile updated successfully!",
      user: { name, email, profilePhoto: profilePhotoUrl },
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return res.status(500).json({ message: "Error updating profile" });
  }
});

module.exports = router;
