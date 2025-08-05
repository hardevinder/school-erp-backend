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

  return StudentRemark;
};
