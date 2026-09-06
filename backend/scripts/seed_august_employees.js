require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
const { hashPassword } = require("../src/utils/password");

const connectionString = process.env.DATABASE_URL || process.env.DB_CONNECTION_STRING || process.env.POSTGRES_URL;
const dedicatedPool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  max: 5,
  connectionTimeoutMillis: 30000,
  idleTimeoutMillis: 60000,
});

async function getClientWithRetry(maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await dedicatedPool.connect();
    } catch (err) {
      console.warn(`Connection attempt ${attempt} failed: ${err.message}. Retrying in 2s...`);
      if (attempt === maxRetries) throw err;
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

async function seedAugustEmployees() {
  console.log("=========================================================");
  console.log("   SEEDING 10 EMPLOYEES WITH AUGUST ATTENDANCE DATA      ");
  console.log("=========================================================");

  const dataPath = path.join(__dirname, "data", "august_employees.json");
  if (!fs.existsSync(dataPath)) {
    throw new Error(`Data file not found at ${dataPath}`);
  }
  const employeeDataList = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

  const client = await getClientWithRetry();
  try {
    await client.query("BEGIN");

    // 1. Resolve Company 1
    const compRes = await client.query("SELECT company_id, name FROM companies WHERE company_id = 1");
    if (!compRes.rows[0]) throw new Error("Company ID 1 does not exist.");
    const companyId = compRes.rows[0].company_id;
    console.log(`✔ Company: ${compRes.rows[0].name} (ID: ${companyId})`);

    // 2. Resolve Attendance Policy (Policy ID 21 "normal")
    let policyRes = await client.query("SELECT * FROM attendance_policies WHERE policy_id = 21 AND company_id = $1", [companyId]);
    if (!policyRes.rows[0]) {
      policyRes = await client.query("SELECT * FROM attendance_policies WHERE name = 'normal' AND company_id = $1", [companyId]);
    }
    if (!policyRes.rows[0]) throw new Error("Attendance policy 'normal' not found for company 1.");
    const policy = policyRes.rows[0];
    console.log(`✔ Attendance Policy: ${policy.name} (ID: ${policy.policy_id}, Grace: ${policy.grace_period_minutes}m, Beyond: ${policy.beyond_grace_penalty})`);

    // 3. Resolve Working Schedule (Schedule ID 36 "Flexible Office Schedule")
    let scheduleRes = await client.query("SELECT * FROM working_schedules WHERE schedule_id = 36 AND company_id = $1", [companyId]);
    if (!scheduleRes.rows[0]) {
      scheduleRes = await client.query("SELECT * FROM working_schedules WHERE attendance_policy_id = $1 AND company_id = $2 LIMIT 1", [policy.policy_id, companyId]);
    }
    if (!scheduleRes.rows[0]) throw new Error("Working schedule associated with policy 'normal' not found.");
    const schedule = scheduleRes.rows[0];
    console.log(`✔ Working Schedule: ${schedule.name} (ID: ${schedule.schedule_id})`);

    // 4. Resolve Department ("ENgineering" ID 28)
    let deptRes = await client.query("SELECT department_id, name, manager_id FROM departments WHERE department_id = 28 AND company_id = $1", [companyId]);
    if (!deptRes.rows[0]) {
      deptRes = await client.query("SELECT department_id, name, manager_id FROM departments WHERE company_id = $1 LIMIT 1", [companyId]);
    }
    const department = deptRes.rows[0];
    console.log(`✔ Department: ${department.name} (ID: ${department.department_id})`);

    // 5. Resolve Position ("SDE-1" ID 33)
    let posRes = await client.query("SELECT position_id, title FROM positions WHERE position_id = 33 AND company_id = $1", [companyId]);
    if (!posRes.rows[0]) {
      posRes = await client.query("SELECT position_id, title FROM positions WHERE department_id = $1 AND company_id = $2 LIMIT 1", [department.department_id, companyId]);
    }
    const position = posRes.rows[0];
    console.log(`✔ Position: ${position.title} (ID: ${position.position_id})`);

    // 6. Resolve Salary Structure (Structure ID 35 "Full Time Employee Salary")
    let structRes = await client.query("SELECT salary_structure_id, name FROM salary_structures WHERE salary_structure_id = 35 AND company_id = $1", [companyId]);
    if (!structRes.rows[0]) {
      structRes = await client.query("SELECT salary_structure_id, name FROM salary_structures WHERE company_id = $1 LIMIT 1", [companyId]);
    }
    const salaryStructure = structRes.rows[0];
    console.log(`✔ Salary Structure: ${salaryStructure.name} (ID: ${salaryStructure.salary_structure_id})`);

    // 7. Resolve Employee Type ("Full-Time" ID 33)
    let empTypeRes = await client.query("SELECT employee_type_id, name FROM employee_types WHERE employee_type_id = 33 AND company_id = $1", [companyId]);
    if (!empTypeRes.rows[0]) {
      empTypeRes = await client.query("SELECT employee_type_id, name FROM employee_types WHERE company_id = $1 LIMIT 1", [companyId]);
    }
    const employeeType = empTypeRes.rows[0];
    console.log(`✔ Employee Type: ${employeeType.name} (ID: ${employeeType.employee_type_id})`);

    // 8. Resolve Manager ID (114 or department manager)
    let managerId = department.manager_id || 114;
    const mgrCheck = await client.query("SELECT employee_id FROM employees WHERE employee_id = $1 AND company_id = $2", [managerId, companyId]);
    if (!mgrCheck.rows[0]) {
      const anyMgr = await client.query("SELECT employee_id FROM employees WHERE company_id = $1 LIMIT 1", [companyId]);
      managerId = anyMgr.rows[0] ? anyMgr.rows[0].employee_id : null;
    }
    console.log(`✔ Manager ID: ${managerId}`);

    // Resolve Employee Role (ID 5)
    const roleRes = await client.query("SELECT role_id FROM roles WHERE role_name = 'Employee' LIMIT 1");
    const employeeRoleId = roleRes.rows[0] ? roleRes.rows[0].role_id : 5;

    const defaultPasswordHash = await hashPassword("Employee@123");
    const creatorUserId = 1;

    console.log("\n--- Inserting/Updating 10 Employees & Contracts ---");

    const createdEmployees = [];

    for (let i = 0; i < employeeDataList.length; i++) {
      const item = employeeDataList[i];
      const username = `emp_aug_${String(i + 1).padStart(3, "0")}`;

      // Check if user already exists
      let userRes = await client.query(
        "SELECT user_id FROM users WHERE company_id = $1 AND (email = $2 OR username = $3)",
        [companyId, item.email, username]
      );
      let userId;
      if (userRes.rows[0]) {
        userId = userRes.rows[0].user_id;
        await client.query(`
          UPDATE users SET
            username = $1,
            password_hash = $2,
            role_id = $3,
            status = 'ACTIVE',
            invitation_token_hash = 'seeded_token_hash',
            invitation_expires_at = '2026-12-31 23:59:59',
            password_reset_token_hash = 'seeded_reset_hash',
            password_reset_expires_at = '2026-12-31 23:59:59',
            must_change_password = FALSE,
            email_verified_at = '2026-07-01 00:00:00',
            last_login_at = '2026-08-01 09:00:00',
            updated_at = NOW()
          WHERE user_id = $4
        `, [username, defaultPasswordHash, employeeRoleId, userId]);
      } else {
        const newUser = await client.query(`
          INSERT INTO users (
            company_id,
            username,
            email,
            password_hash,
            role_id,
            status,
            invitation_token_hash,
            invitation_expires_at,
            password_reset_token_hash,
            password_reset_expires_at,
            must_change_password,
            email_verified_at,
            last_login_at,
            created_at,
            updated_at
          )
          VALUES (
            $1, $2, $3, $4, $5, 'ACTIVE',
            'seeded_token_hash', '2026-12-31 23:59:59',
            'seeded_reset_hash', '2026-12-31 23:59:59',
            FALSE, '2026-07-01 00:00:00', '2026-08-01 09:00:00',
            '2026-07-01 00:00:00', '2026-07-01 00:00:00'
          )
          RETURNING user_id
        `, [companyId, username, item.email, defaultPasswordHash, employeeRoleId]);
        userId = newUser.rows[0].user_id;
      }

      // Check if employee already exists
      let empRes = await client.query(
        "SELECT employee_id FROM employees WHERE company_id = $1 AND (employee_code = $2 OR email = $3)",
        [companyId, item.code, item.email]
      );
      let employeeId;
      if (empRes.rows[0]) {
        employeeId = empRes.rows[0].employee_id;
        await client.query(`
          UPDATE employees SET
            user_id = $1,
            employee_code = $2,
            first_name = $3,
            last_name = $4,
            email = $5,
            phone = $6,
            date_of_birth = $7,
            gender = $8,
            address = $9,
            hire_date = '2026-07-01',
            department_id = $10,
            position_id = $11,
            employee_type_id = $12,
            schedule_id = $13,
            manager_id = $14,
            status = 'ACTIVE',
            created_by = $15,
            updated_at = NOW()
          WHERE employee_id = $16
        `, [
          userId, item.code, item.firstName, item.lastName, item.email, item.phone,
          item.dob, item.gender, item.address, department.department_id, position.position_id,
          employeeType.employee_type_id, schedule.schedule_id, managerId, creatorUserId, employeeId
        ]);
      } else {
        const newEmp = await client.query(`
          INSERT INTO employees (
            company_id,
            user_id,
            employee_code,
            first_name,
            last_name,
            email,
            phone,
            date_of_birth,
            gender,
            address,
            hire_date,
            department_id,
            position_id,
            employee_type_id,
            schedule_id,
            manager_id,
            status,
            created_by,
            created_at,
            updated_at
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            '2026-07-01', $11, $12, $13, $14, $15,
            'ACTIVE', $16, '2026-07-01 00:00:00', '2026-07-01 00:00:00'
          )
          RETURNING employee_id
        `, [
          companyId, userId, item.code, item.firstName, item.lastName, item.email,
          item.phone, item.dob, item.gender, item.address, department.department_id,
          position.position_id, employeeType.employee_type_id, schedule.schedule_id,
          managerId, creatorUserId
        ]);
        employeeId = newEmp.rows[0].employee_id;
      }

      // Link user.employee_id
      await client.query("UPDATE users SET employee_id = $1 WHERE user_id = $2", [employeeId, userId]);

      // Check or create contract (Same contract terms across all 10 employees)
      const existingContract = await client.query(
        "SELECT contract_id FROM contracts WHERE company_id = $1 AND employee_id = $2",
        [companyId, employeeId]
      );
      if (existingContract.rows[0]) {
        await client.query(`
          UPDATE contracts SET
            position_id = $1,
            department_id = $2,
            schedule_id = $3,
            salary_structure_id = $4,
            wage = $5,
            wage_type = 'MONTHLY',
            start_date = '2026-08-01',
            end_date = '2027-07-31',
            status = 'ACTIVE',
            created_by = $6,
            updated_at = NOW()
          WHERE contract_id = $7
        `, [
          position.position_id, department.department_id, schedule.schedule_id,
          salaryStructure.salary_structure_id, item.wage, creatorUserId,
          existingContract.rows[0].contract_id
        ]);
      } else {
        await client.query(`
          INSERT INTO contracts (
            company_id,
            employee_id,
            position_id,
            department_id,
            schedule_id,
            salary_structure_id,
            wage,
            wage_type,
            start_date,
            end_date,
            status,
            created_by,
            created_at,
            updated_at
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            'MONTHLY', '2026-08-01', '2027-07-31', 'ACTIVE',
            $8, '2026-08-01 00:00:00', '2026-08-01 00:00:00'
          )
        `, [
          companyId, employeeId, position.position_id, department.department_id,
          schedule.schedule_id, salaryStructure.salary_structure_id, item.wage,
          creatorUserId
        ]);
      }

      createdEmployees.push({
        employeeId,
        userId,
        code: item.code,
        name: `${item.firstName} ${item.lastName}`,
        pattern: item.pattern
      });

      console.log(`✔ [${item.code}] ${item.firstName} ${item.lastName} (Emp ID: ${employeeId}, Contract: Active, Wage: ${item.wage})`);
    }

    console.log("\n--- Generating August 2026 Check-in & Check-out Data ---");

    // All working days in August 2026 (Mon-Fri, 21 days total)
    const workingDays = [
      "2026-08-03", "2026-08-04", "2026-08-05", "2026-08-06", "2026-08-07",
      "2026-08-10", "2026-08-11", "2026-08-12", "2026-08-13", "2026-08-14",
      "2026-08-17", "2026-08-18", "2026-08-19", "2026-08-20", "2026-08-21",
      "2026-08-24", "2026-08-25", "2026-08-26", "2026-08-27", "2026-08-28",
      "2026-08-31"
    ];

    let totalAttendanceInserted = 0;

    for (const emp of createdEmployees) {
      let monthlyGraceCount = 0;
      let monthlyHalfDayCount = 0;

      for (let d = 0; d < workingDays.length; d++) {
        const workDate = workingDays[d];

        let checkInTime;
        let checkOutTime;
        let lateMinutes = 0;
        let lateStatus = "ON_TIME";
        let graceOccurrenceNo = 0;
        let deductionType = "NONE";
        let deductionDays = 0.00;
        let status = "PRESENT";
        let hoursWorked = 8.00;
        let remarks = "Regular on-time attendance completed";

        // Apply distinct behavior patterns based on employee specification
        if (emp.pattern === "ALWAYS_ON_TIME") {
          // Check-in around 09:50 - 09:56 AM, checkout 19:00 - 19:10 PM
          checkInTime = `${workDate} 09:52:00`;
          checkOutTime = `${workDate} 19:02:00`;
          hoursWorked = 8.17;
          lateStatus = "ON_TIME";
          remarks = "Regular on-time shift completed";
        } else if (emp.pattern === "WITHIN_GRACE_2") {
          // Late on Aug 06 (10:08) and Aug 18 (10:12) -> Within 15-min grace window (occurrence 1 and 2)
          if (workDate === "2026-08-06") {
            monthlyGraceCount++;
            checkInTime = `${workDate} 10:08:00`;
            checkOutTime = `${workDate} 19:10:00`;
            lateMinutes = 8;
            lateStatus = "WITHIN_GRACE";
            graceOccurrenceNo = monthlyGraceCount;
            status = "LATE";
            hoursWorked = 8.03;
            remarks = `Arrival within 15-min grace window (occurrence #${monthlyGraceCount}) - no penalty`;
          } else if (workDate === "2026-08-18") {
            monthlyGraceCount++;
            checkInTime = `${workDate} 10:12:00`;
            checkOutTime = `${workDate} 19:15:00`;
            lateMinutes = 12;
            lateStatus = "WITHIN_GRACE";
            graceOccurrenceNo = monthlyGraceCount;
            status = "LATE";
            hoursWorked = 8.05;
            remarks = `Arrival within 15-min grace window (occurrence #${monthlyGraceCount}) - no penalty`;
          } else {
            checkInTime = `${workDate} 09:55:00`;
            checkOutTime = `${workDate} 19:05:00`;
            hoursWorked = 8.17;
            lateStatus = "ON_TIME";
            remarks = "Regular on-time shift completed";
          }
        } else if (emp.pattern === "WITHIN_GRACE_3") {
          // Late on Aug 04 (10:05), Aug 11 (10:10), Aug 18 (10:14) -> Within 15-min grace window (occurrences 1, 2, 3)
          if (workDate === "2026-08-04" || workDate === "2026-08-11" || workDate === "2026-08-18") {
            monthlyGraceCount++;
            const mins = workDate === "2026-08-04" ? 5 : workDate === "2026-08-11" ? 10 : 14;
            checkInTime = `${workDate} 10:${String(mins).padStart(2, "0")}:00`;
            checkOutTime = `${workDate} 19:15:00`;
            lateMinutes = mins;
            lateStatus = "WITHIN_GRACE";
            graceOccurrenceNo = monthlyGraceCount;
            status = "LATE";
            hoursWorked = 8.00;
            remarks = `Arrival within 15-min grace window (occurrence #${monthlyGraceCount}) - no penalty`;
          } else {
            checkInTime = `${workDate} 09:54:00`;
            checkOutTime = `${workDate} 19:00:00`;
            hoursWorked = 8.10;
            lateStatus = "ON_TIME";
            remarks = "Regular on-time shift completed";
          }
        } else if (emp.pattern === "LATE_BEYOND_GRACE_1") {
          // Late beyond grace on a specific day (e.g. 35 to 40 mins late) -> HALF_DAY deduction!
          const lateDay = emp.code === "EMP-AUG-005" ? "2026-08-10" : emp.code === "EMP-AUG-006" ? "2026-08-14" : "2026-08-21";
          if (workDate === lateDay) {
            const mins = emp.code === "EMP-AUG-005" ? 40 : emp.code === "EMP-AUG-006" ? 35 : 30;
            monthlyHalfDayCount++;
            checkInTime = `${workDate} 10:${mins}:00`;
            checkOutTime = `${workDate} 19:00:00`;
            lateMinutes = mins;
            lateStatus = "BEYOND_GRACE";
            graceOccurrenceNo = 0;
            deductionType = "HALF_DAY";
            deductionDays = 0.50;
            status = "HALF_DAY";
            hoursWorked = Number((8 - mins / 60).toFixed(2));
            remarks = `Late arrival beyond 15-min grace window (${mins} mins late) - HALF DAY salary deducted per policy`;
          } else {
            checkInTime = `${workDate} 09:52:00`;
            checkOutTime = `${workDate} 19:02:00`;
            hoursWorked = 8.17;
            lateStatus = "ON_TIME";
            remarks = "Regular on-time shift completed";
          }
        } else if (emp.pattern === "LATE_BEYOND_GRACE_2") {
          // Two separate late arrivals beyond grace (Aug 07: 50m late, Aug 25: 45m late) -> 2 HALF_DAY deductions!
          if (workDate === "2026-08-07" || workDate === "2026-08-25") {
            const mins = workDate === "2026-08-07" ? 50 : 45;
            monthlyHalfDayCount++;
            checkInTime = `${workDate} 10:${mins}:00`;
            checkOutTime = `${workDate} 19:00:00`;
            lateMinutes = mins;
            lateStatus = "BEYOND_GRACE";
            graceOccurrenceNo = 0;
            deductionType = "HALF_DAY";
            deductionDays = 0.50;
            status = "HALF_DAY";
            hoursWorked = Number((8 - mins / 60).toFixed(2));
            remarks = `Late arrival beyond 15-min grace window (${mins} mins late) - HALF DAY salary deducted per policy`;
          } else {
            checkInTime = `${workDate} 09:50:00`;
            checkOutTime = `${workDate} 19:00:00`;
            hoursWorked = 8.17;
            lateStatus = "ON_TIME";
            remarks = "Regular on-time shift completed";
          }
        } else if (emp.pattern === "GRACE_EXCEEDED_HALF_DAY") {
          // Uses grace 3 times (Aug 05, Aug 12, Aug 19), then on 4th late (Aug 26: 10:11 AM) grace occurrences exceeded -> HALF_DAY deduction!
          if (workDate === "2026-08-05" || workDate === "2026-08-12" || workDate === "2026-08-19") {
            monthlyGraceCount++;
            const mins = workDate === "2026-08-05" ? 10 : workDate === "2026-08-12" ? 12 : 9;
            checkInTime = `${workDate} 10:${String(mins).padStart(2, "0")}:00`;
            checkOutTime = `${workDate} 19:10:00`;
            lateMinutes = mins;
            lateStatus = "WITHIN_GRACE";
            graceOccurrenceNo = monthlyGraceCount;
            status = "LATE";
            hoursWorked = 8.00;
            remarks = `Arrival within 15-min grace window (occurrence #${monthlyGraceCount}) - no penalty`;
          } else if (workDate === "2026-08-26") {
            // 4th late occurrence -> Exceeds max 3 allowed grace occurrences -> BEYOND_GRACE penalty applied!
            monthlyHalfDayCount++;
            checkInTime = `${workDate} 10:11:00`;
            checkOutTime = `${workDate} 19:00:00`;
            lateMinutes = 11;
            lateStatus = "BEYOND_GRACE";
            graceOccurrenceNo = 0;
            deductionType = "HALF_DAY";
            deductionDays = 0.50;
            status = "HALF_DAY";
            hoursWorked = 7.82;
            remarks = `Exceeded monthly allowed grace occurrences (4th occurrence) - HALF DAY salary deducted per policy`;
          } else {
            checkInTime = `${workDate} 09:53:00`;
            checkOutTime = `${workDate} 19:03:00`;
            hoursWorked = 8.17;
            lateStatus = "ON_TIME";
            remarks = "Regular on-time shift completed";
          }
        } else if (emp.pattern === "WITHIN_GRACE_1") {
          // 1 grace late on Aug 13 (10:07)
          if (workDate === "2026-08-13") {
            monthlyGraceCount++;
            checkInTime = `${workDate} 10:07:00`;
            checkOutTime = `${workDate} 19:07:00`;
            lateMinutes = 7;
            lateStatus = "WITHIN_GRACE";
            graceOccurrenceNo = 1;
            status = "LATE";
            hoursWorked = 8.00;
            remarks = "Arrival within 15-min grace window (occurrence #1) - no penalty";
          } else {
            checkInTime = `${workDate} 09:51:00`;
            checkOutTime = `${workDate} 19:01:00`;
            hoursWorked = 8.17;
            lateStatus = "ON_TIME";
            remarks = "Regular on-time shift completed";
          }
        }

        // Upsert attendance record with ALL non-null values
        await client.query(`
          INSERT INTO attendance (
            company_id,
            employee_id,
            work_date,
            check_in,
            check_out,
            hours_worked,
            status,
            scheduled_start_time,
            scheduled_end_time,
            scheduled_break_minutes,
            late_minutes,
            early_leave_minutes,
            late_status,
            grace_occurrence_no,
            deduction_type,
            deduction_days,
            remarks,
            created_by,
            created_at,
            updated_at
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            '10:00:00', '19:00:00', 60,
            $8, 0, $9, $10, $11, $12, $13,
            $14, $4, $5
          )
          ON CONFLICT (company_id, employee_id, work_date)
          DO UPDATE SET
            check_in = EXCLUDED.check_in,
            check_out = EXCLUDED.check_out,
            hours_worked = EXCLUDED.hours_worked,
            status = EXCLUDED.status,
            scheduled_start_time = EXCLUDED.scheduled_start_time,
            scheduled_end_time = EXCLUDED.scheduled_end_time,
            scheduled_break_minutes = EXCLUDED.scheduled_break_minutes,
            late_minutes = EXCLUDED.late_minutes,
            early_leave_minutes = EXCLUDED.early_leave_minutes,
            late_status = EXCLUDED.late_status,
            grace_occurrence_no = EXCLUDED.grace_occurrence_no,
            deduction_type = EXCLUDED.deduction_type,
            deduction_days = EXCLUDED.deduction_days,
            remarks = EXCLUDED.remarks,
            updated_at = NOW()
        `, [
          companyId, emp.employeeId, workDate, checkInTime, checkOutTime,
          hoursWorked, status, lateMinutes, lateStatus, graceOccurrenceNo,
          deductionType, deductionDays, remarks, creatorUserId
        ]);

        totalAttendanceInserted++;
      }

      // Upsert monthly counter for August 2026 (Year: 2026, Month: 8) with NO NULL fields
      await client.query(`
        INSERT INTO attendance_monthly_counters (
          company_id,
          employee_id,
          year,
          month,
          grace_late_count,
          half_day_deductions,
          full_day_deductions,
          early_leave_count,
          created_at,
          updated_at
        )
        VALUES (
          $1, $2, 2026, 8,
          $3, $4, 0, 0,
          '2026-08-01 00:00:00', '2026-08-31 23:59:59'
        )
        ON CONFLICT (company_id, employee_id, year, month)
        DO UPDATE SET
          grace_late_count = EXCLUDED.grace_late_count,
          half_day_deductions = EXCLUDED.half_day_deductions,
          full_day_deductions = EXCLUDED.full_day_deductions,
          early_leave_count = EXCLUDED.early_leave_count,
          updated_at = NOW()
      `, [companyId, emp.employeeId, monthlyGraceCount, monthlyHalfDayCount]);

      console.log(`✔ [${emp.code}] Attendance seeded: 21 days (Grace lates: ${monthlyGraceCount}, Half-day deductions: ${monthlyHalfDayCount})`);
    }

    await client.query("COMMIT");

    console.log("\n=========================================================");
    console.log("             SEEDING COMPLETED SUCCESSFULLY!             ");
    console.log("=========================================================");
    console.log(`- 10 Employees created/updated with non-null profiles`);
    console.log(`- 10 Active Contracts created with wage 65,000 & structure '${salaryStructure.name}'`);
    console.log(`- 10 Employees linked to schedule '${schedule.name}' (Policy: '${policy.name}')`);
    console.log(`- ${totalAttendanceInserted} August 2026 check-in/out records inserted`);
    console.log(`- Monthly counters configured with half-day deductions calculated`);
    console.log("=========================================================");

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Seed failed with error:", err);
    throw err;
  } finally {
    client.release();
    process.exit(0);
  }
}

seedAugustEmployees();
