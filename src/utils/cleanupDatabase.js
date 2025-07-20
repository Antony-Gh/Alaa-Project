const dbManager = require('./database');
const logger = require('./logger');

async function cleanupDatabase() {
  try {
    await dbManager.initialize();

    console.log('🧹 Starting database cleanup...');

    // Get all departments
    const allDepartments = await dbManager.query(
      'SELECT * FROM departments ORDER BY id'
    );
    console.log(`Found ${allDepartments.length} departments in database`);

    // Group departments by name to find duplicates
    const departmentGroups = {};
    allDepartments.forEach(dept => {
      if (!departmentGroups[dept.name]) {
        departmentGroups[dept.name] = [];
      }
      departmentGroups[dept.name].push(dept);
    });

    // Handle similar department names (IT departments)
    const itDept1 = allDepartments.find(d => d.name === 'قسم تقنية المعلومات');
    const itDept2 = allDepartments.find(
      d => d.name === 'قسم تكنولوجيا المعلومات'
    );

    if (itDept1 && itDept2) {
      // Merge IT departments into one group
      if (!departmentGroups['قسم تقنية المعلومات']) {
        departmentGroups['قسم تقنية المعلومات'] = [];
      }
      // Clear existing entries and add both IT departments
      departmentGroups['قسم تقنية المعلومات'] = [itDept1, itDept2];
      delete departmentGroups['قسم تكنولوجيا المعلومات'];
    }

    // Find departments with duplicates
    const duplicates = Object.entries(departmentGroups)
      .filter(([name, depts]) => depts.length > 1)
      .map(([name, depts]) => ({ name, departments: depts }));

    if (duplicates.length === 0) {
      console.log('✅ No duplicate departments found');
      return;
    }

    console.log(`Found ${duplicates.length} departments with duplicates:`);
    duplicates.forEach(({ name, departments }) => {
      console.log(`  - "${name}": ${departments.length} instances`);
    });

    // Keep the first department of each name and update references
    for (const { name, departments } of duplicates) {
      const keepDept = departments[0]; // Keep the first one
      const deleteDepts = departments.slice(1); // Delete the rest

      console.log(`\n🔄 Processing "${name}":`);
      console.log(`  Keeping department ID: ${keepDept.id}`);
      console.log(
        `  Deleting department IDs: ${deleteDepts.map(d => d.id).join(', ')}`
      );

      // Update user references to point to the kept department
      for (const deleteDept of deleteDepts) {
        await dbManager.run(
          'UPDATE users SET department_id = ? WHERE department_id = ?',
          [keepDept.id, deleteDept.id]
        );

        // Update appointment references
        await dbManager.run(
          'UPDATE appointments SET department_id = ? WHERE department_id = ?',
          [keepDept.id, deleteDept.id]
        );

        // Delete the duplicate department
        await dbManager.run('DELETE FROM departments WHERE id = ?', [
          deleteDept.id,
        ]);
      }
    }

    // Verify cleanup
    const finalDepartments = await dbManager.query(
      'SELECT * FROM departments ORDER BY id'
    );
    console.log(
      `\n✅ Cleanup complete! Final department count: ${finalDepartments.length}`
    );
    console.log('\nFinal departments:');
    finalDepartments.forEach(dept => {
      console.log(`  ${dept.id}: ${dept.name}`);
    });
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await dbManager.close();
  }
}

// Run cleanup if this file is executed directly
if (require.main === module) {
  cleanupDatabase();
}

module.exports = { cleanupDatabase };
