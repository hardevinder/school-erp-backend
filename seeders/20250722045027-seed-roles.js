'use strict';

module.exports = {
  up: async (queryInterface) => {
    const roles = [
      'superadmin',
      'academic_coordinator',
      'student',
      'hr',
      'teacher',
      'admin',
    ].map(name => ({
      name,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    return queryInterface.bulkInsert('Roles', roles);
  },

  down: async (queryInterface) => {
    return queryInterface.bulkDelete('Roles', {
      name: [
        'superadmin',
        'academic_coordinator',
        'student',
        'hr',
        'teacher',
        'admin',
      ]
    });
  }
};
