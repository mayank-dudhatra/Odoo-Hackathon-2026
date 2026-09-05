require("dotenv").config();
const { pool } = require("../db/pool");
const { hashPassword } = require("../src/utils/password");

async function resetDb() {
  console.log("=========================================================");
  console.log("      PEOPLEPAY360 DATABASE RESET (PRODUCTION START)    ");
  console.log("=========================================================");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    console.log("1. Truncating all application tables...");
    await client.query(`
      TRUNCATE TABLE
        payslip_lines,
        payslips,
        payrun_employees,
        payruns,
        contracts,
        salary_structure_rules,
        salary_rules,
        salary_structures,
        leave_requests,
        leave_allocations,
        leave_types,
        attendance,
        attendance_monthly_counters,
        schedule_days,
        working_schedules,
        attendance_policies,
        user_sessions,
        audit_logs,
        users,
        employees,
        employee_types,
        positions,
        departments,
        companies
      RESTART IDENTITY CASCADE;
    `);

    console.log("2. Ensuring default roles exist...");
    await client.query(`
      INSERT INTO roles (role_name, description)
      VALUES
        ('Admin', 'Full system administration access'),
        ('HR Manager', 'HR management role'),
        ('Payroll Manager', 'Payroll supervision and approval role'),
        ('Payroll User', 'Payroll operations role'),
        ('Employee', 'Employee self-service role')
      ON CONFLICT (role_name) DO NOTHING;
    `);

    const adminRoleRes = await client.query(`SELECT role_id FROM roles WHERE role_name = 'Admin' LIMIT 1`);
    const adminRoleId = adminRoleRes.rows[0].role_id;

    console.log("3. Creating single initial Company...");
    const compRes = await client.query(`
      INSERT INTO companies (name, email, phone, address, timezone, currency_code, is_active)
      VALUES ($1, $2, $3, $4, 'UTC', 'USD', TRUE)
      RETURNING company_id, name, email
    `, [
      "PeoplePay360 Inc.",
      "admin@gmail.com",
      "+1-800-555-0199",
      "Corporate HeadOffice, Suite 100",
    ]);
    const company = compRes.rows[0];
    console.log(`✔ Company Created: ${company.name} (ID: ${company.company_id})`);

    console.log("4. Creating single Admin user...");
    const adminEmail = "admin@gmail.com";
    const adminPassword = "Admin@123";
    const passwordHash = await hashPassword(adminPassword);

    const userRes = await client.query(`
      INSERT INTO users (
        company_id,
        username,
        email,
        password_hash,
        role_id,
        status,
        must_change_password,
        email_verified_at
      )
      VALUES ($1, 'admin', $2, $3, $4, 'ACTIVE', FALSE, NOW())
      RETURNING user_id, username, email, role_id, status
    `, [
      company.company_id,
      adminEmail,
      passwordHash,
      adminRoleId,
    ]);

    const adminUser = userRes.rows[0];
    console.log(`✔ Admin User Created: ${adminUser.username} (${adminUser.email})`);

    await client.query("COMMIT");

    console.log("\n=========================================================");
    console.log("SUCCESS: Database successfully reset for Production!");
    console.log("---------------------------------------------------------");
    console.log(`Company  : ${company.name}`);
    console.log(`Email    : ${adminEmail}`);
    console.log(`Username : admin`);
    console.log(`Password : ${adminPassword}`);
    console.log("=========================================================");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Database reset failed:", error);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
}

resetDb();
