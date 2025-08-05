const { LessonPlan, Class, Subject } = require("../models");

// Create a new lesson plan
exports.createLessonPlan = async (req, res) => {
  try {
    // Logged in teacher's id is available from req.user
    const teacherId = req.user.id;
    const {
      classIds,
      subjectId,
      weekNumber,
      startDate,
      endDate,
      topic,
      objectives,
      activities,
      resources,
      homework,
      assessmentMethods,
      status, // Optional: defaults to "Pending"
      remarks,
      publish // New field from request body
    } = req.body;

    // Log incoming request for debugging
    console.log("Incoming request body:", req.body);

    // Create the lesson plan record including the publish field.
    const lessonPlan = await LessonPlan.create({
      teacherId,
      classIds: (classIds && classIds.length) ? classIds : [], // ensures non-null
      subjectId,
      weekNumber,
      startDate,
      endDate,
      topic,
      objectives,
      activities,
      resources,
      homework,
      assessmentMethods,
      status: status || "Pending",
      remarks,
      publish: typeof publish !== 'undefined' ? publish : false
    });

    // Set many-to-many associations for Classes if classIds are provided
    if (classIds && classIds.length) {
      await lessonPlan.setClasses(classIds);
    }

    res.status(201).json(lessonPlan);
  } catch (error) {
    console.error("Error creating lesson plan:", error);
    res.status(500).json({ error: "Failed to create lesson plan" });
  }
};

// Get all lesson plans for the logged in teacher (including associated classes and subject)
exports.getLessonPlans = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const lessonPlans = await LessonPlan.findAll({
      where: { teacherId },
      include: [
        {
          model: Class,
          as: 'Classes', // Use alias as defined in LessonPlan model association
        },
        {
          model: Subject,
          as: 'Subject', // Alias as defined in LessonPlan model association
        },
      ],
    });
    res.status(200).json(lessonPlans);
  } catch (error) {
    console.error("Error fetching lesson plans:", error);
    res.status(500).json({ error: "Failed to fetch lesson plans" });
  }
};

// Get a single lesson plan by its ID (only if it belongs to the logged in teacher)
exports.getLessonPlanById = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { id } = req.params;
    const lessonPlan = await LessonPlan.findOne({
      where: { id, teacherId },
      include: [
        {
          model: Class,
          as: 'Classes', // Use alias as defined in LessonPlan model association
        },
        {
          model: Subject,
          as: 'Subject', // Alias as defined in LessonPlan model association
        },
      ],
    });
    if (!lessonPlan) {
      return res.status(404).json({ error: "Lesson plan not found" });
    }
    res.status(200).json(lessonPlan);
  } catch (error) {
    console.error("Error fetching lesson plan:", error);
    res.status(500).json({ error: "Failed to fetch lesson plan" });
  }
};

// Update a lesson plan (only if it belongs to the logged in teacher)
exports.updateLessonPlan = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { id } = req.params;
    const lessonPlan = await LessonPlan.findOne({
      where: { id, teacherId },
    });
    if (!lessonPlan) {
      return res.status(404).json({ error: "Lesson plan not found" });
    }

    // Update fields with data from req.body including publish if provided.
    await lessonPlan.update(req.body);

    // Update associated classes if classIds provided
    if (req.body.classIds) {
      await lessonPlan.setClasses(req.body.classIds);
    }

    res.status(200).json(lessonPlan);
  } catch (error) {
    console.error("Error updating lesson plan:", error);
    res.status(500).json({ error: "Failed to update lesson plan" });
  }
};

// Delete a lesson plan (only if it belongs to the logged in teacher)
exports.deleteLessonPlan = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { id } = req.params;
    const lessonPlan = await LessonPlan.findOne({
      where: { id, teacherId },
    });
    if (!lessonPlan) {
      return res.status(404).json({ error: "Lesson plan not found" });
    }
    await lessonPlan.destroy();
    res.status(200).json({ message: "Lesson plan deleted successfully" });
  } catch (error) {
    console.error("Error deleting lesson plan:", error);
    res.status(500).json({ error: "Failed to delete lesson plan" });
  }
};
