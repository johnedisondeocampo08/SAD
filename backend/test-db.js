
const db = require('./config/db');

async function testConnection() {
  try {
    const [rows] = await db.query(
      'SELECT DATABASE() AS database_name, VERSION() AS mysql_version'
    );

    console.log('MySQL Connection Successful!');
    console.log('Database:', rows[0].database_name);
    console.log('MySQL Version:', rows[0].mysql_version);
  } catch (error) {
    console.error('MySQL Connection Failed!');
    console.error('Error Code:', error.code);
    console.error('Error Message:', error.message);
    process.exitCode = 1;
  } finally {
    await db.end();
  }
}

testConnection();
