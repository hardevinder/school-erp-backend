const { User, Role, UserRoles, sequelize } = require('../models');

(async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection successful');

    const roles = await Role.findAll();
    const roleMap = roles.reduce((map, role) => {
      map[role.name.toLowerCase()] = role.id;
      return map;
    }, {});

    const users = await User.findAll();

    let assigned = 0, skipped = 0;

    for (const user of users) {
      const roleName = user.role?.toLowerCase(); // from the old 'role' column

      if (!roleName || !roleMap[roleName]) {
        console.log(`⏭ Skipping user '${user.username}': Invalid or missing role '${roleName}'`);
        skipped++;
        continue;
      }

      const roleId = roleMap[roleName];

      const [existing] = await UserRoles.findOrCreate({
        where: { userId: user.id, roleId: roleId },
        defaults: { userId: user.id, roleId: roleId },
      });

      if (existing) {
        assigned++;
        console.log(`✅ Assigned role '${roleName}' to '${user.username}'`);
      }
    }

    console.log(`\n🎉 Reassignment complete. ${assigned} roles assigned, ${skipped} skipped.`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Error reassigning user roles:", error);
    process.exit(1);
  }
})();
