module.exports = (sequelize, DataTypes) => {
  const StudentRemark = sequelize.define("StudentRemark", {
    student_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    class_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    section_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    term_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    remark: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  });

  // ✅ Add association to Student model
  StudentRemark.associate = (models) => {
    StudentRemark.belongsTo(models.Student, {
      foreignKey: "student_id",
      as: "student", // 👈 Make sure you use this alias in includes
    });
  };

  return StudentRemark;
};
