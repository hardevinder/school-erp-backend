const { Holiday, Class, User } = require("../models");


exports.createHoliday = async (req, res) => {
  try {
    const { classId, date, description } = req.body;

    // Optional: Prevent duplicate holiday for same class and date
    const existingHoliday = await Holiday.findOne({ where: { classId, date } });
    if (existingHoliday) {
      return res.status(409).json({
        message: "Holiday already marked for this class on the selected date",
      });
    }

    // Create the holiday marking; assume req.user is set by your auth middleware
    const holiday = await Holiday.create({
      classId,
      date,
      description,
      createdBy: req.user.id,
    });

    res.status(201).json({ message: "Holiday marked successfully", holiday });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


exports.getAllHolidays = async (req, res) => {
  try {
    const holidays = await Holiday.findAll({
      include: [
        {
          model: Class,
          as: "class",
          attributes: ["id", "class_name"], // Adjust attributes as needed
        },
        {
          model: User,
          as: "creator",
          attributes: ["id", "name", "email"],
        },
      ],
    });
    res.status(200).json(holidays);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getHolidayById = async (req, res) => {
  try {
    const { id } = req.params;
    const holiday = await Holiday.findByPk(id, {
      include: [
        {
          model: Class,
          as: "class",
          attributes: ["id", "class_name"],
        },
        {
          model: User,
          as: "creator",
          attributes: ["id", "name", "email"],
        },
      ],
    });
    if (!holiday) {
      return res.status(404).json({ message: "Holiday not found" });
    }
    res.status(200).json(holiday);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.updateHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    const { classId, date, description } = req.body;
    const holiday = await Holiday.findByPk(id);
    if (!holiday) {
      return res.status(404).json({ message: "Holiday not found" });
    }

    // Optional: Check for duplicate if updating class or date
    if ((classId && classId !== holiday.classId) || (date && date !== holiday.date)) {
      const duplicate = await Holiday.findOne({
        where: { classId: classId || holiday.classId, date: date || holiday.date },
      });
      if (duplicate && duplicate.id !== holiday.id) {
        return res.status(409).json({
          message: "Another holiday already exists for this class on the selected date",
        });
      }
    }

    await holiday.update({ classId, date, description });
    res.status(200).json({ message: "Holiday updated successfully", holiday });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.deleteHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    const holiday = await Holiday.findByPk(id);
    if (!holiday) {
      return res.status(404).json({ message: "Holiday not found" });
    }
    await holiday.destroy();
    res.status(200).json({ message: "Holiday deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


exports.getHolidaySummaryByMonth = async (req, res) => {
  try {
    // Retrieve all holiday records along with associated class information.
    const holidays = await Holiday.findAll({
      include: [
        {
          model: Class,
          as: "class",
          attributes: ["id", "class_name"],
        },
      ],
    });

    // Group holidays by month (YYYY-MM)
    const summaryByMonth = holidays.reduce((acc, holiday) => {
      const month = holiday.date.substring(0, 7); // e.g., "2025-02"
      if (!acc[month]) {
        acc[month] = {
          classes: {},
          allDates: new Set(),
        };
      }
      // Add the holiday date to the overall month's set.
      acc[month].allDates.add(holiday.date);

      // Group by class.
      const classId = holiday.classId;
      if (!acc[month].classes[classId]) {
        acc[month].classes[classId] = {
          classId,
          class_name: holiday.class ? holiday.class.class_name : null,
          holidayDates: new Set(),
        };
      }
      acc[month].classes[classId].holidayDates.add(holiday.date);

      return acc;
    }, {});

    // Convert the grouped data into an array of summary objects.
    const result = Object.keys(summaryByMonth).map((month) => {
      const monthData = summaryByMonth[month];
      const classesSummary = Object.values(monthData.classes).map((cls) => ({
        classId: cls.classId,
        class_name: cls.class_name,
        holidayDates: Array.from(cls.holidayDates),
        totalHolidays: cls.holidayDates.size,
      }));

      return {
        month,
        classes: classesSummary,
        totalHolidays: monthData.allDates.size,
      };
    });

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
