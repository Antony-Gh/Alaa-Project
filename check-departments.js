const dbManager = require('./src/utils/database');

async function checkDepartments() {
  try {
    await dbManager.initialize();

    const departments = await dbManager.query(
      'SELECT * FROM departments ORDER BY id'
    );
    console.log('Current departments:');
    departments.forEach(dept => {
      console.log(`${dept.id}: ${dept.name}`);
    });

    // Add IT department if missing
    const itDept = departments.find(
      d => d.name.includes('تقنية') || d.name.includes('تكنولوجيا')
    );
    if (!itDept) {
      console.log('\nAdding IT department...');
      await dbManager.run(
        'INSERT INTO departments (name, description) VALUES (?, ?)',
        ['قسم تقنية المعلومات', 'Department of Information Technology']
      );
      console.log('✅ IT department added');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await dbManager.close();
  }
}

checkDepartments();
