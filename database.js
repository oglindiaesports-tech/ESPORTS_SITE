const mysql = require('mysql2/promise');
const crypto = require('crypto');

const pool = mysql.createPool({
  host: process.env.MYSQLHOST,
  port: process.env.MYSQLPORT,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  waitForConnections: true,
  connectionLimit: 10,
});

async function ensureTables() {
  const createSql = `
    CREATE TABLE IF NOT EXISTS teams (
      id INT AUTO_INCREMENT PRIMARY KEY,
      team_name VARCHAR(255) NOT NULL,
      captain_ign VARCHAR(255) NOT NULL,
      player2_ign VARCHAR(255),
      player3_ign VARCHAR(255),
      player4_ign VARCHAR(255),
      player5_ign VARCHAR(255),
      contact_number VARCHAR(50) NOT NULL,
      unique_code VARCHAR(16) NOT NULL UNIQUE,
      payment_status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  await pool.execute(createSql);
}

function generate16DigitCode() {
  const bytes = crypto.randomBytes(8);
  const big = BigInt('0x' + bytes.toString('hex'));
  let code = big.toString(10);
  code = code.length < 16 ? code.padStart(16, '0') : code.substring(0, 16);
  return code;
}

async function generateUniqueCode() {
  let code;
  let isUnique = false;
  while (!isUnique) {
    code = generate16DigitCode();
    const [rows] = await pool.execute('SELECT 1 FROM teams WHERE unique_code = ?', [code]);
    isUnique = rows.length === 0;
  }
  return code;
}

async function createTeam({ teamName, captainIgn, player2Ign, player3Ign, player4Ign, player5Ign, contactNumber }) {
  const uniqueCode = await generateUniqueCode();
  const sql = `INSERT INTO teams (team_name, captain_ign, player2_ign, player3_ign, player4_ign, player5_ign, contact_number, unique_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
  const [result] = await pool.execute(sql, [
    teamName, captainIgn, player2Ign || null, player3Ign || null, player4Ign || null, player5Ign || null, contactNumber, uniqueCode
  ]);
  return { teamId: result.insertId, uniqueCode };
}

async function confirmPayment(teamId) {
  await pool.execute('UPDATE teams SET payment_status = ? WHERE id = ?', ['completed', teamId]);
  const [rows] = await pool.execute('SELECT unique_code FROM teams WHERE id = ?', [teamId]);
  return rows[0];
}

async function getTeamById(teamId) {
  const [rows] = await pool.execute('SELECT * FROM teams WHERE id = ?', [teamId]);
  return rows[0];
}

async function getTeamByCode(code) {
  const [rows] = await pool.execute('SELECT * FROM teams WHERE unique_code = ?', [code]);
  return rows[0];
}

module.exports = { pool, ensureTables, createTeam, confirmPayment, getTeamById, getTeamByCode };
