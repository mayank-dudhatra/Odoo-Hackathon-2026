CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS companies (
  company_id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(150),
  phone VARCHAR(30),
  address TEXT,
  timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',
  currency_code CHAR(3) NOT NULL DEFAULT 'USD',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_companies_name UNIQUE (name),
  CONSTRAINT chk_companies_currency_code CHECK (currency_code ~ '^[A-Z]{3}$')
);

CREATE TABLE IF NOT EXISTS roles (
  role_id SERIAL PRIMARY KEY,
  role_name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permissions (
  permission_id SERIAL PRIMARY KEY,
  module VARCHAR(50) NOT NULL,
  action VARCHAR(20) NOT NULL,
  CONSTRAINT uq_permissions_module_action UNIQUE (module, action)
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id INT NOT NULL,
  permission_id INT NOT NULL,
  scope VARCHAR(20) NOT NULL DEFAULT 'OWN',
  PRIMARY KEY (role_id, permission_id),
  CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE CASCADE,
  CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions(permission_id) ON DELETE CASCADE,
  CONSTRAINT chk_role_permissions_scope CHECK (scope IN ('ALL', 'OWN'))
);

CREATE TABLE IF NOT EXISTS attendance_policies (
  policy_id SERIAL PRIMARY KEY,
  company_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  grace_period_minutes INT NOT NULL DEFAULT 0,
  grace_occurrences_allowed INT NOT NULL DEFAULT 0,
  grace_period_penalty VARCHAR(20) NOT NULL DEFAULT 'NONE',
  beyond_grace_penalty VARCHAR(20) NOT NULL DEFAULT 'NONE',
  early_leave_grace_minutes INT NOT NULL DEFAULT 0,
  early_leave_penalty VARCHAR(20) NOT NULL DEFAULT 'NONE',
  stack_deductions BOOLEAN NOT NULL DEFAULT FALSE,
  paid_leave_days_count INT NOT NULL DEFAULT 20,
  sick_leave_days_count INT NOT NULL DEFAULT 10,
  casual_leave_days_count INT NOT NULL DEFAULT 7,
  max_unexcused_absences INT NOT NULL DEFAULT 3,
  leave_type_quotas JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_attendance_policies_company FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE,
  CONSTRAINT uq_attendance_policies_company_name UNIQUE (company_id, name),
  CONSTRAINT chk_attendance_policies_grace_penalty CHECK (grace_period_penalty IN ('NONE', 'HALF_DAY', 'FULL_DAY')),
  CONSTRAINT chk_attendance_policies_beyond_penalty CHECK (beyond_grace_penalty IN ('NONE', 'HALF_DAY', 'FULL_DAY')),
  CONSTRAINT chk_attendance_policies_early_penalty CHECK (early_leave_penalty IN ('NONE', 'HALF_DAY', 'FULL_DAY'))
);

CREATE TABLE IF NOT EXISTS working_schedules (
  schedule_id SERIAL PRIMARY KEY,
  company_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',
  hours_per_week NUMERIC(6,2) NOT NULL DEFAULT 0,
  attendance_policy_id INT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_working_schedules_company FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE,
  CONSTRAINT fk_working_schedules_attendance_policy FOREIGN KEY (attendance_policy_id) REFERENCES attendance_policies(policy_id) ON DELETE SET NULL,
  CONSTRAINT uq_working_schedules_company_name UNIQUE (company_id, name)
);

CREATE TABLE IF NOT EXISTS schedule_days (
  schedule_day_id SERIAL PRIMARY KEY,
  schedule_id INT NOT NULL,
  day_of_week SMALLINT NOT NULL,
  is_working_day BOOLEAN NOT NULL DEFAULT TRUE,
  start_time TIME,
  end_time TIME,
  break_minutes INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_schedule_days_schedule FOREIGN KEY (schedule_id) REFERENCES working_schedules(schedule_id) ON DELETE CASCADE,
  CONSTRAINT uq_schedule_days_schedule_day UNIQUE (schedule_id, day_of_week),
  CONSTRAINT chk_schedule_days_day_of_week CHECK (day_of_week BETWEEN 1 AND 7),
  CONSTRAINT chk_schedule_days_break_minutes CHECK (break_minutes >= 0)
);

CREATE TABLE IF NOT EXISTS departments (
  department_id SERIAL PRIMARY KEY,
  company_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  parent_department_id INT,
  manager_id INT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_departments_company FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE,
  CONSTRAINT fk_departments_parent FOREIGN KEY (parent_department_id) REFERENCES departments(department_id) ON DELETE SET NULL,
  CONSTRAINT uq_departments_company_name UNIQUE (company_id, name)
);

CREATE TABLE IF NOT EXISTS positions (
  position_id SERIAL PRIMARY KEY,
  company_id INT NOT NULL,
  title VARCHAR(100) NOT NULL,
  department_id INT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_positions_company FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE,
  CONSTRAINT fk_positions_department FOREIGN KEY (department_id) REFERENCES departments(department_id) ON DELETE SET NULL,
  CONSTRAINT uq_positions_company_title UNIQUE (company_id, title)
);

CREATE TABLE IF NOT EXISTS employee_types (
  employee_type_id SERIAL PRIMARY KEY,
  company_id INT NOT NULL,
  name VARCHAR(50) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_employee_types_company FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE,
  CONSTRAINT uq_employee_types_company_name UNIQUE (company_id, name)
);

CREATE TABLE IF NOT EXISTS users (
  user_id SERIAL PRIMARY KEY,
  company_id INT NOT NULL,
  employee_id INT UNIQUE,
  username VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL,
  password_hash TEXT,
  role_id INT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'INVITED',
  invitation_token_hash TEXT,
  invitation_expires_at TIMESTAMP,
  password_reset_token_hash TEXT,
  password_reset_expires_at TIMESTAMP,
  must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
  email_verified_at TIMESTAMP,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_users_company FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE,
  CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(role_id),
  CONSTRAINT uq_users_company_username UNIQUE (company_id, username),
  CONSTRAINT uq_users_company_email UNIQUE (company_id, email),
  CONSTRAINT chk_users_status CHECK (status IN ('INVITED', 'ACTIVE', 'DISABLED'))
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS user_id INT UNIQUE REFERENCES users(user_id) ON DELETE SET NULL;


CREATE TABLE IF NOT EXISTS user_sessions (
  session_id BIGSERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  company_id INT NOT NULL,
  refresh_token_hash TEXT NOT NULL,
  user_agent TEXT,
  ip_address VARCHAR(64),
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_user_sessions_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_user_sessions_company FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS salary_structures (
  salary_structure_id SERIAL PRIMARY KEY,
  company_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by INT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_salary_structures_company FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE,
  CONSTRAINT fk_salary_structures_created_by FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL,
  CONSTRAINT uq_salary_structures_company_name UNIQUE (company_id, name)
);

CREATE TABLE IF NOT EXISTS salary_rules (
  salary_rule_id SERIAL PRIMARY KEY,
  company_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(30) NOT NULL,
  category VARCHAR(20) NOT NULL,
  computation_type VARCHAR(20) NOT NULL,
  amount NUMERIC(12,2),
  percentage_of VARCHAR(30),
  percentage_value NUMERIC(7,3),
  formula TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_salary_rules_company FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE,
  CONSTRAINT uq_salary_rules_company_code UNIQUE (company_id, code),
  CONSTRAINT chk_salary_rules_category CHECK (category IN ('BASIC', 'ALLOWANCE', 'GROSS', 'DEDUCTION', 'TAX', 'CONTRIBUTION', 'NET', 'REIMBURSEMENT')),
  CONSTRAINT chk_salary_rules_computation_type CHECK (computation_type IN ('FIXED', 'PERCENTAGE', 'FORMULA'))
);

CREATE TABLE IF NOT EXISTS salary_structure_rules (
  salary_structure_id INT NOT NULL,
  salary_rule_id INT NOT NULL,
  sequence INT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (salary_structure_id, salary_rule_id),
  CONSTRAINT fk_salary_structure_rules_structure FOREIGN KEY (salary_structure_id) REFERENCES salary_structures(salary_structure_id) ON DELETE CASCADE,
  CONSTRAINT fk_salary_structure_rules_rule FOREIGN KEY (salary_rule_id) REFERENCES salary_rules(salary_rule_id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS employees (
  employee_id SERIAL PRIMARY KEY,
  company_id INT NOT NULL,
  user_id INT UNIQUE,
  employee_code VARCHAR(20) NOT NULL,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  email VARCHAR(150),
  phone VARCHAR(30),
  date_of_birth DATE,
  gender VARCHAR(20),
  address TEXT,
  hire_date DATE NOT NULL,
  department_id INT,
  position_id INT,
  employee_type_id INT,
  schedule_id INT,
  manager_id INT,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  created_by INT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_employees_company FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE,
  CONSTRAINT fk_employees_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
  CONSTRAINT fk_employees_department FOREIGN KEY (department_id) REFERENCES departments(department_id) ON DELETE SET NULL,
  CONSTRAINT fk_employees_position FOREIGN KEY (position_id) REFERENCES positions(position_id) ON DELETE SET NULL,
  CONSTRAINT fk_employees_employee_type FOREIGN KEY (employee_type_id) REFERENCES employee_types(employee_type_id) ON DELETE SET NULL,
  CONSTRAINT fk_employees_schedule FOREIGN KEY (schedule_id) REFERENCES working_schedules(schedule_id) ON DELETE SET NULL,
  CONSTRAINT fk_employees_manager FOREIGN KEY (manager_id) REFERENCES employees(employee_id) ON DELETE SET NULL,
  CONSTRAINT fk_employees_created_by FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL,
  CONSTRAINT uq_employees_company_code UNIQUE (company_id, employee_code),
  CONSTRAINT uq_employees_company_email UNIQUE (company_id, email),
  CONSTRAINT chk_employees_status CHECK (status IN ('ACTIVE', 'INACTIVE', 'TERMINATED'))
);

CREATE OR REPLACE FUNCTION validate_company_scope_department()
RETURNS TRIGGER AS $$
DECLARE
  parent_company_id INT;
  manager_company_id INT;
BEGIN
  IF NEW.parent_department_id IS NOT NULL THEN
    SELECT company_id INTO parent_company_id
    FROM departments
    WHERE department_id = NEW.parent_department_id;

    IF parent_company_id IS NULL OR parent_company_id <> NEW.company_id THEN
      RAISE EXCEPTION 'Parent department must belong to the same company';
    END IF;
  END IF;

  IF NEW.manager_id IS NOT NULL THEN
    SELECT company_id INTO manager_company_id
    FROM employees
    WHERE employee_id = NEW.manager_id;

    IF manager_company_id IS NULL OR manager_company_id <> NEW.company_id THEN
      RAISE EXCEPTION 'Department manager must belong to the same company';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION validate_company_scope_position()
RETURNS TRIGGER AS $$
DECLARE
  department_company_id INT;
BEGIN
  IF NEW.department_id IS NOT NULL THEN
    SELECT company_id INTO department_company_id
    FROM departments
    WHERE department_id = NEW.department_id;

    IF department_company_id IS NULL OR department_company_id <> NEW.company_id THEN
      RAISE EXCEPTION 'Position department must belong to the same company';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION validate_company_scope_employee_type()
RETURNS TRIGGER AS $$
BEGIN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION validate_company_scope_employee()
RETURNS TRIGGER AS $$
DECLARE
  related_company_id INT;
BEGIN
  IF NEW.department_id IS NOT NULL THEN
    SELECT company_id INTO related_company_id FROM departments WHERE department_id = NEW.department_id;
    IF related_company_id IS NULL OR related_company_id <> NEW.company_id THEN
      RAISE EXCEPTION 'Employee department must belong to the same company';
    END IF;
  END IF;

  IF NEW.position_id IS NOT NULL THEN
    SELECT company_id INTO related_company_id FROM positions WHERE position_id = NEW.position_id;
    IF related_company_id IS NULL OR related_company_id <> NEW.company_id THEN
      RAISE EXCEPTION 'Employee position must belong to the same company';
    END IF;
  END IF;

  IF NEW.employee_type_id IS NOT NULL THEN
    SELECT company_id INTO related_company_id FROM employee_types WHERE employee_type_id = NEW.employee_type_id;
    IF related_company_id IS NULL OR related_company_id <> NEW.company_id THEN
      RAISE EXCEPTION 'Employee type must belong to the same company';
    END IF;
  END IF;

  IF NEW.schedule_id IS NOT NULL THEN
    SELECT company_id INTO related_company_id FROM working_schedules WHERE schedule_id = NEW.schedule_id;
    IF related_company_id IS NULL OR related_company_id <> NEW.company_id THEN
      RAISE EXCEPTION 'Employee schedule must belong to the same company';
    END IF;
  END IF;

  IF NEW.manager_id IS NOT NULL THEN
    IF NEW.manager_id = NEW.employee_id THEN
      RAISE EXCEPTION 'Employee cannot manage themselves';
    END IF;

    SELECT company_id INTO related_company_id FROM employees WHERE employee_id = NEW.manager_id;
    IF related_company_id IS NULL OR related_company_id <> NEW.company_id THEN
      RAISE EXCEPTION 'Employee manager must belong to the same company';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION validate_company_scope_user()
RETURNS TRIGGER AS $$
DECLARE
  employee_company_id INT;
BEGIN
  IF NEW.employee_id IS NOT NULL THEN
    SELECT company_id INTO employee_company_id FROM employees WHERE employee_id = NEW.employee_id;
    IF employee_company_id IS NULL OR employee_company_id <> NEW.company_id THEN
      RAISE EXCEPTION 'User employee link must belong to the same company';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION validate_company_scope_working_schedule()
RETURNS TRIGGER AS $$
DECLARE
  policy_company_id INT;
BEGIN
  IF NEW.attendance_policy_id IS NOT NULL THEN
    SELECT company_id INTO policy_company_id FROM attendance_policies WHERE policy_id = NEW.attendance_policy_id;
    IF policy_company_id IS NULL OR policy_company_id <> NEW.company_id THEN
      RAISE EXCEPTION 'Attendance policy must belong to the same company';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION validate_company_scope_contract()
RETURNS TRIGGER AS $$
DECLARE
  related_company_id INT;
BEGIN
  IF NEW.employee_id IS NOT NULL THEN
    SELECT company_id INTO related_company_id FROM employees WHERE employee_id = NEW.employee_id;
    IF related_company_id IS NULL OR related_company_id <> NEW.company_id THEN
      RAISE EXCEPTION 'Contract employee must belong to the same company';
    END IF;
  END IF;

  IF NEW.position_id IS NOT NULL THEN
    SELECT company_id INTO related_company_id FROM positions WHERE position_id = NEW.position_id;
    IF related_company_id IS NULL OR related_company_id <> NEW.company_id THEN
      RAISE EXCEPTION 'Contract position must belong to the same company';
    END IF;
  END IF;

  IF NEW.department_id IS NOT NULL THEN
    SELECT company_id INTO related_company_id FROM departments WHERE department_id = NEW.department_id;
    IF related_company_id IS NULL OR related_company_id <> NEW.company_id THEN
      RAISE EXCEPTION 'Contract department must belong to the same company';
    END IF;
  END IF;

  IF NEW.schedule_id IS NOT NULL THEN
    SELECT company_id INTO related_company_id FROM working_schedules WHERE schedule_id = NEW.schedule_id;
    IF related_company_id IS NULL OR related_company_id <> NEW.company_id THEN
      RAISE EXCEPTION 'Contract schedule must belong to the same company';
    END IF;
  END IF;

  SELECT company_id INTO related_company_id FROM salary_structures WHERE salary_structure_id = NEW.salary_structure_id;
  IF related_company_id IS NULL OR related_company_id <> NEW.company_id THEN
    RAISE EXCEPTION 'Salary structure must belong to the same company';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_departments_company_scope ON departments;
CREATE TRIGGER trg_departments_company_scope
BEFORE INSERT OR UPDATE ON departments
FOR EACH ROW EXECUTE FUNCTION validate_company_scope_department();

DROP TRIGGER IF EXISTS trg_positions_company_scope ON positions;
CREATE TRIGGER trg_positions_company_scope
BEFORE INSERT OR UPDATE ON positions
FOR EACH ROW EXECUTE FUNCTION validate_company_scope_position();

DROP TRIGGER IF EXISTS trg_employee_types_company_scope ON employee_types;
CREATE TRIGGER trg_employee_types_company_scope
BEFORE INSERT OR UPDATE ON employee_types
FOR EACH ROW EXECUTE FUNCTION validate_company_scope_employee_type();

DROP TRIGGER IF EXISTS trg_employees_company_scope ON employees;
CREATE TRIGGER trg_employees_company_scope
BEFORE INSERT OR UPDATE ON employees
FOR EACH ROW EXECUTE FUNCTION validate_company_scope_employee();

DROP TRIGGER IF EXISTS trg_users_company_scope ON users;
CREATE TRIGGER trg_users_company_scope
BEFORE INSERT OR UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION validate_company_scope_user();

DROP TRIGGER IF EXISTS trg_working_schedules_company_scope ON working_schedules;
CREATE TRIGGER trg_working_schedules_company_scope
BEFORE INSERT OR UPDATE ON working_schedules
FOR EACH ROW EXECUTE FUNCTION validate_company_scope_working_schedule();

DROP TRIGGER IF EXISTS trg_contracts_company_scope ON contracts;
CREATE TRIGGER trg_contracts_company_scope
BEFORE INSERT OR UPDATE ON contracts
FOR EACH ROW EXECUTE FUNCTION validate_company_scope_contract();

ALTER TABLE departments
  DROP CONSTRAINT IF EXISTS fk_departments_manager,
  ADD CONSTRAINT fk_departments_manager FOREIGN KEY (manager_id) REFERENCES employees(employee_id) ON DELETE SET NULL;

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS fk_users_employee,
  ADD CONSTRAINT fk_users_employee FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS contracts (
  contract_id SERIAL PRIMARY KEY,
  company_id INT NOT NULL,
  employee_id INT,
  position_id INT,
  department_id INT,
  schedule_id INT,
  salary_structure_id INT NOT NULL,
  wage NUMERIC(12,2) NOT NULL,
  wage_type VARCHAR(20) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  created_by INT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_contracts_company FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE,
  CONSTRAINT fk_contracts_employee FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE SET NULL,
  CONSTRAINT fk_contracts_position FOREIGN KEY (position_id) REFERENCES positions(position_id) ON DELETE SET NULL,
  CONSTRAINT fk_contracts_department FOREIGN KEY (department_id) REFERENCES departments(department_id) ON DELETE SET NULL,
  CONSTRAINT fk_contracts_schedule FOREIGN KEY (schedule_id) REFERENCES working_schedules(schedule_id) ON DELETE SET NULL,
  CONSTRAINT fk_contracts_salary_structure FOREIGN KEY (salary_structure_id) REFERENCES salary_structures(salary_structure_id) ON DELETE RESTRICT,
  CONSTRAINT fk_contracts_created_by FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL,
  CONSTRAINT chk_contracts_wage_type CHECK (wage_type IN ('MONTHLY', 'HOURLY', 'ANNUAL')),
  CONSTRAINT chk_contracts_status CHECK (status IN ('DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED')),
  CONSTRAINT chk_contracts_date_window CHECK (end_date IS NULL OR end_date >= start_date)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ex_contracts_no_overlap'
  ) THEN
    ALTER TABLE contracts
      ADD CONSTRAINT ex_contracts_no_overlap
      EXCLUDE USING gist (
        employee_id WITH =,
        daterange(start_date, COALESCE(end_date, 'infinity'::date), '[]') WITH &&
      )
      WHERE (status = 'ACTIVE');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS attendance_monthly_counters (
  counter_id SERIAL PRIMARY KEY,
  company_id INT NOT NULL,
  employee_id INT NOT NULL,
  year INT NOT NULL,
  month INT NOT NULL,
  grace_late_count INT NOT NULL DEFAULT 0,
  half_day_deductions INT NOT NULL DEFAULT 0,
  full_day_deductions INT NOT NULL DEFAULT 0,
  early_leave_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_attendance_monthly_counters_company FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE,
  CONSTRAINT fk_attendance_monthly_counters_employee FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
  CONSTRAINT uq_attendance_monthly_counter_scope UNIQUE (company_id, employee_id, year, month),
  CONSTRAINT chk_attendance_monthly_counters_year CHECK (year >= 1900),
  CONSTRAINT chk_attendance_monthly_counters_month CHECK (month BETWEEN 1 AND 12)
);

CREATE TABLE IF NOT EXISTS attendance (
  attendance_id SERIAL PRIMARY KEY,
  company_id INT NOT NULL,
  employee_id INT NOT NULL,
  work_date DATE NOT NULL,
  check_in TIMESTAMP,
  check_out TIMESTAMP,
  hours_worked NUMERIC(6,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL,
  scheduled_start_time TIME,
  scheduled_end_time TIME,
  scheduled_break_minutes INT NOT NULL DEFAULT 0,
  late_minutes INT NOT NULL DEFAULT 0,
  early_leave_minutes INT NOT NULL DEFAULT 0,
  late_status VARCHAR(20),
  grace_occurrence_no INT,
  deduction_type VARCHAR(20) NOT NULL DEFAULT 'NONE',
  deduction_days NUMERIC(3,2) NOT NULL DEFAULT 0,
  remarks TEXT,
  created_by INT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_attendance_company FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE,
  CONSTRAINT fk_attendance_employee FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
  CONSTRAINT fk_attendance_created_by FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL,
  CONSTRAINT uq_attendance_company_employee_date UNIQUE (company_id, employee_id, work_date),
  CONSTRAINT chk_attendance_status CHECK (status IN ('PRESENT', 'ABSENT', 'HALF_DAY', 'LATE', 'ON_LEAVE', 'OVERTIME')),
  CONSTRAINT chk_attendance_late_status CHECK (late_status IS NULL OR late_status IN ('ON_TIME', 'WITHIN_GRACE', 'BEYOND_GRACE')),
  CONSTRAINT chk_attendance_deduction_type CHECK (deduction_type IN ('NONE', 'HALF_DAY', 'FULL_DAY')),
  CONSTRAINT chk_attendance_deduction_days CHECK (deduction_days IN (0, 0.5, 1))
);

CREATE TABLE IF NOT EXISTS leave_types (
  leave_type_id SERIAL PRIMARY KEY,
  company_id INT NOT NULL,
  name VARCHAR(50) NOT NULL,
  unit VARCHAR(10) NOT NULL,
  requires_allocation BOOLEAN NOT NULL DEFAULT TRUE,
  is_paid BOOLEAN NOT NULL DEFAULT TRUE,
  default_days_year NUMERIC(5,2) NOT NULL DEFAULT 0,
  approval_required BOOLEAN NOT NULL DEFAULT TRUE,
  payroll_integration BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_leave_types_company FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE,
  CONSTRAINT uq_leave_types_company_name UNIQUE (company_id, name),
  CONSTRAINT chk_leave_types_unit CHECK (unit IN ('DAYS', 'HOURS'))
);

CREATE TABLE IF NOT EXISTS leave_allocations (
  allocation_id SERIAL PRIMARY KEY,
  company_id INT NOT NULL,
  employee_id INT NOT NULL,
  leave_type_id INT NOT NULL,
  year INT NOT NULL,
  allocated_days NUMERIC(6,2) NOT NULL DEFAULT 0,
  used_days NUMERIC(6,2) NOT NULL DEFAULT 0,
  remaining_days NUMERIC(6,2) GENERATED ALWAYS AS (allocated_days - used_days) STORED,
  valid_from DATE,
  valid_to DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  approved_by INT,
  approved_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_leave_allocations_company FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE,
  CONSTRAINT fk_leave_allocations_employee FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
  CONSTRAINT fk_leave_allocations_leave_type FOREIGN KEY (leave_type_id) REFERENCES leave_types(leave_type_id) ON DELETE CASCADE,
  CONSTRAINT fk_leave_allocations_approved_by FOREIGN KEY (approved_by) REFERENCES users(user_id) ON DELETE SET NULL,
  CONSTRAINT uq_leave_allocations_scope UNIQUE (company_id, employee_id, leave_type_id, year),
  CONSTRAINT chk_leave_allocations_status CHECK (status IN ('DRAFT', 'APPROVED', 'EXPIRED', 'CANCELLED')),
  CONSTRAINT chk_leave_allocations_validity CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from)
);

CREATE TABLE IF NOT EXISTS leave_requests (
  leave_request_id SERIAL PRIMARY KEY,
  company_id INT NOT NULL,
  employee_id INT NOT NULL,
  leave_type_id INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_requested NUMERIC(6,2) NOT NULL,
  reason TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  approved_by INT,
  approved_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_leave_requests_company FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE,
  CONSTRAINT fk_leave_requests_employee FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
  CONSTRAINT fk_leave_requests_leave_type FOREIGN KEY (leave_type_id) REFERENCES leave_types(leave_type_id) ON DELETE RESTRICT,
  CONSTRAINT fk_leave_requests_approved_by FOREIGN KEY (approved_by) REFERENCES users(user_id) ON DELETE SET NULL,
  CONSTRAINT chk_leave_requests_status CHECK (status IN ('PENDING', 'APPROVED', 'REFUSED', 'CANCELLED')),
  CONSTRAINT chk_leave_requests_date_window CHECK (end_date >= start_date)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ex_leave_requests_no_overlap'
  ) THEN
    ALTER TABLE leave_requests
      ADD CONSTRAINT ex_leave_requests_no_overlap
      EXCLUDE USING gist (
        employee_id WITH =,
        daterange(start_date, end_date, '[]') WITH &&
      )
      WHERE (status IN ('PENDING', 'APPROVED'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS payruns (
  payrun_id SERIAL PRIMARY KEY,
  company_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  salary_structure_id INT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  created_by INT,
  validated_by INT,
  paid_by INT,
  validated_at TIMESTAMP,
  paid_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_payruns_company FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE,
  CONSTRAINT fk_payruns_salary_structure FOREIGN KEY (salary_structure_id) REFERENCES salary_structures(salary_structure_id) ON DELETE RESTRICT,
  CONSTRAINT fk_payruns_created_by FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL,
  CONSTRAINT fk_payruns_validated_by FOREIGN KEY (validated_by) REFERENCES users(user_id) ON DELETE SET NULL,
  CONSTRAINT fk_payruns_paid_by FOREIGN KEY (paid_by) REFERENCES users(user_id) ON DELETE SET NULL,
  CONSTRAINT chk_payruns_status CHECK (status IN ('DRAFT', 'PROCESSING', 'COMPUTED', 'VALIDATED', 'PAID', 'CANCELLED')),
  CONSTRAINT chk_payruns_period CHECK (period_end >= period_start)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_payruns_company_period_structure'
  ) THEN
    ALTER TABLE payruns
      ADD CONSTRAINT uq_payruns_company_period_structure UNIQUE (company_id, salary_structure_id, period_start, period_end);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS payrun_employees (
  payrun_employee_id SERIAL PRIMARY KEY,
  payrun_id INT NOT NULL,
  employee_id INT NOT NULL,
  contract_id INT,
  status VARCHAR(20) NOT NULL DEFAULT 'SELECTED',
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_payrun_employees_payrun FOREIGN KEY (payrun_id) REFERENCES payruns(payrun_id) ON DELETE CASCADE,
  CONSTRAINT fk_payrun_employees_employee FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE RESTRICT,
  CONSTRAINT fk_payrun_employees_contract FOREIGN KEY (contract_id) REFERENCES contracts(contract_id) ON DELETE SET NULL,
  CONSTRAINT uq_payrun_employees_payrun_employee UNIQUE (payrun_id, employee_id),
  CONSTRAINT chk_payrun_employees_status CHECK (status IN ('SELECTED', 'COMPUTED', 'ERROR', 'EXCLUDED'))
);

CREATE TABLE IF NOT EXISTS payslips (
  payslip_id SERIAL PRIMARY KEY,
  company_id INT NOT NULL,
  payrun_id INT NOT NULL,
  employee_id INT NOT NULL,
  contract_id INT NOT NULL,
  salary_structure_id INT NOT NULL,
  employee_name_snapshot VARCHAR(120) NOT NULL,
  employee_code_snapshot VARCHAR(30) NOT NULL,
  structure_name_snapshot VARCHAR(120) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  worked_days NUMERIC(6,2) NOT NULL DEFAULT 0,
  gross_pay NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_deductions NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_pay NUMERIC(12,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  pdf_file_path TEXT,
  email_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  email_sent_at TIMESTAMP,
  email_error_message TEXT,
  snapshot_data JSONB,
  generated_at TIMESTAMP,
  created_by INT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_payslips_company FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE,
  CONSTRAINT fk_payslips_payrun FOREIGN KEY (payrun_id) REFERENCES payruns(payrun_id) ON DELETE CASCADE,
  CONSTRAINT fk_payslips_employee FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE RESTRICT,
  CONSTRAINT fk_payslips_contract FOREIGN KEY (contract_id) REFERENCES contracts(contract_id) ON DELETE RESTRICT,
  CONSTRAINT fk_payslips_salary_structure FOREIGN KEY (salary_structure_id) REFERENCES salary_structures(salary_structure_id) ON DELETE RESTRICT,
  CONSTRAINT fk_payslips_created_by FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL,
  CONSTRAINT uq_payslips_payrun_employee UNIQUE (payrun_id, employee_id),
  CONSTRAINT chk_payslips_status CHECK (status IN ('DRAFT', 'COMPUTED', 'VALIDATED', 'PAID', 'GENERATED', 'SENT', 'FAILED', 'CANCELLED')),
  CONSTRAINT chk_payslips_email_status CHECK (email_status IN ('PENDING', 'SENT', 'FAILED')),
  CONSTRAINT chk_payslips_period CHECK (period_end >= period_start)
);

ALTER TABLE payslips ADD COLUMN IF NOT EXISTS pdf_file_path TEXT;
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS email_status VARCHAR(20) NOT NULL DEFAULT 'PENDING';
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMP;
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS email_error_message TEXT;
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS snapshot_data JSONB;

CREATE TABLE IF NOT EXISTS payslip_lines (
  payslip_line_id SERIAL PRIMARY KEY,
  payslip_id INT NOT NULL,
  salary_rule_id INT,
  rule_code_snapshot VARCHAR(30) NOT NULL,
  label VARCHAR(100) NOT NULL,
  category VARCHAR(20) NOT NULL,
  sequence INT NOT NULL,
  calculation_input NUMERIC(12,2),
  calculation_rate NUMERIC(7,3),
  amount NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_payslip_lines_payslip FOREIGN KEY (payslip_id) REFERENCES payslips(payslip_id) ON DELETE CASCADE,
  CONSTRAINT fk_payslip_lines_salary_rule FOREIGN KEY (salary_rule_id) REFERENCES salary_rules(salary_rule_id) ON DELETE SET NULL,
  CONSTRAINT chk_payslip_lines_category CHECK (category IN ('BASIC', 'ALLOWANCE', 'GROSS', 'DEDUCTION', 'TAX', 'CONTRIBUTION', 'NET', 'REIMBURSEMENT'))
);

CREATE TABLE IF NOT EXISTS audit_logs (
  log_id SERIAL PRIMARY KEY,
  company_id INT,
  user_id INT,
  module VARCHAR(50) NOT NULL,
  action VARCHAR(30) NOT NULL,
  record_id INT,
  details JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_audit_logs_company FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE SET NULL,
  CONSTRAINT fk_audit_logs_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

INSERT INTO roles (role_name, description)
VALUES
  ('Admin', 'Full system administration access'),
  ('HR Manager', 'HR management role'),
  ('Payroll Manager', 'Payroll supervision and approval role'),
  ('Payroll User', 'Payroll operations role'),
  ('Employee', 'Employee self-service role')
ON CONFLICT (role_name) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_status_company ON users(company_id, status);
CREATE INDEX IF NOT EXISTS idx_users_invitation_expires ON users(invitation_expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_company ON user_sessions(company_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_refresh_hash ON user_sessions(refresh_token_hash);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(user_id, revoked_at, expires_at);
CREATE INDEX IF NOT EXISTS idx_departments_company_id ON departments(company_id);
CREATE INDEX IF NOT EXISTS idx_positions_company_id ON positions(company_id);
CREATE INDEX IF NOT EXISTS idx_employees_company_id ON employees(company_id);
CREATE INDEX IF NOT EXISTS idx_employees_manager_id ON employees(manager_id);
CREATE INDEX IF NOT EXISTS idx_contracts_company_employee_dates ON contracts(company_id, employee_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_attendance_company_employee_date ON attendance(company_id, employee_id, work_date);
CREATE INDEX IF NOT EXISTS idx_leave_requests_company_status ON leave_requests(company_id, status);
CREATE INDEX IF NOT EXISTS idx_payruns_company_period ON payruns(company_id, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_payslips_company_payrun ON payslips(company_id, payrun_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_company_module ON audit_logs(company_id, module, created_at);
CREATE INDEX IF NOT EXISTS idx_employees_company_dept ON employees(company_id, department_id, status);
CREATE INDEX IF NOT EXISTS idx_employees_company_type ON employees(company_id, employee_type_id, status);
CREATE INDEX IF NOT EXISTS idx_payslips_company_dates ON payslips(company_id, period_start, period_end, status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_company_dates ON leave_requests(company_id, start_date, end_date, status);
CREATE INDEX IF NOT EXISTS idx_contracts_company_status ON contracts(company_id, status, end_date);

INSERT INTO companies (name, email, phone, address, timezone, currency_code, is_active)
VALUES (
  'PeoplePay360 Demo Pvt Ltd',
  'admin@peoplepay360.demo',
  '+91-9000000000',
  'Bengaluru, India',
  'Asia/Kolkata',
  'INR',
  TRUE
)
ON CONFLICT (name) DO NOTHING;

INSERT INTO permissions (module, action)
VALUES
  ('DASHBOARD', 'READ'),
  ('COMPANY', 'READ'),
  ('COMPANY', 'UPDATE'),
  ('USERS', 'CREATE'),
  ('USERS', 'READ'),
  ('USERS', 'UPDATE'),
  ('USERS', 'DELETE'),
  ('USERS', 'APPROVE'),
  ('USERS', 'REFUSE'),
  ('USERS', 'PROCESS'),
  ('USERS', 'VALIDATE'),
  ('USERS', 'PAY'),
  ('USERS', 'EXPORT'),
  ('ROLES', 'CREATE'),
  ('ROLES', 'READ'),
  ('ROLES', 'UPDATE'),
  ('ROLES', 'DELETE'),
  ('ROLES', 'APPROVE'),
  ('ROLES', 'REFUSE'),
  ('ROLES', 'PROCESS'),
  ('ROLES', 'VALIDATE'),
  ('ROLES', 'PAY'),
  ('ROLES', 'EXPORT'),
  ('EMPLOYEES', 'CREATE'),
  ('EMPLOYEES', 'READ'),
  ('EMPLOYEES', 'UPDATE'),
  ('EMPLOYEES', 'DELETE'),
  ('EMPLOYEES', 'UPDATE_STATUS'),
  ('EMPLOYEES', 'APPROVE'),
  ('EMPLOYEES', 'REFUSE'),
  ('EMPLOYEES', 'PROCESS'),
  ('EMPLOYEES', 'VALIDATE'),
  ('EMPLOYEES', 'PAY'),
  ('EMPLOYEES', 'EXPORT'),
  ('DEPARTMENTS', 'CREATE'),
  ('DEPARTMENTS', 'READ'),
  ('DEPARTMENTS', 'UPDATE'),
  ('DEPARTMENTS', 'DELETE'),
  ('DEPARTMENTS', 'APPROVE'),
  ('DEPARTMENTS', 'REFUSE'),
  ('DEPARTMENTS', 'PROCESS'),
  ('DEPARTMENTS', 'VALIDATE'),
  ('DEPARTMENTS', 'PAY'),
  ('DEPARTMENTS', 'EXPORT'),
  ('POSITIONS', 'CREATE'),
  ('POSITIONS', 'READ'),
  ('POSITIONS', 'UPDATE'),
  ('POSITIONS', 'DELETE'),
  ('POSITIONS', 'APPROVE'),
  ('POSITIONS', 'REFUSE'),
  ('POSITIONS', 'PROCESS'),
  ('POSITIONS', 'VALIDATE'),
  ('POSITIONS', 'PAY'),
  ('POSITIONS', 'EXPORT'),
  ('EMPLOYEE_TYPES', 'CREATE'),
  ('EMPLOYEE_TYPES', 'READ'),
  ('EMPLOYEE_TYPES', 'UPDATE'),
  ('EMPLOYEE_TYPES', 'DELETE'),
  ('CONTRACTS', 'CREATE'),
  ('CONTRACTS', 'READ'),
  ('CONTRACTS', 'UPDATE'),
  ('CONTRACTS', 'DELETE'),
  ('CONTRACTS', 'APPROVE'),
  ('CONTRACTS', 'REFUSE'),
  ('CONTRACTS', 'PROCESS'),
  ('CONTRACTS', 'VALIDATE'),
  ('CONTRACTS', 'PAY'),
  ('CONTRACTS', 'EXPORT'),
  ('WORKING_SCHEDULES', 'CREATE'),
  ('WORKING_SCHEDULES', 'READ'),
  ('WORKING_SCHEDULES', 'UPDATE'),
  ('WORKING_SCHEDULES', 'DELETE'),
  ('WORKING_SCHEDULES', 'APPROVE'),
  ('WORKING_SCHEDULES', 'REFUSE'),
  ('WORKING_SCHEDULES', 'PROCESS'),
  ('WORKING_SCHEDULES', 'VALIDATE'),
  ('WORKING_SCHEDULES', 'PAY'),
  ('WORKING_SCHEDULES', 'EXPORT'),
  ('ATTENDANCE', 'CREATE'),
  ('ATTENDANCE', 'READ'),
  ('ATTENDANCE', 'UPDATE'),
  ('ATTENDANCE', 'DELETE'),
  ('ATTENDANCE', 'APPROVE'),
  ('ATTENDANCE', 'REFUSE'),
  ('ATTENDANCE', 'PROCESS'),
  ('ATTENDANCE', 'VALIDATE'),
  ('ATTENDANCE', 'PAY'),
  ('ATTENDANCE', 'EXPORT'),
  ('ATTENDANCE_POLICIES', 'CREATE'),
  ('ATTENDANCE_POLICIES', 'READ'),
  ('ATTENDANCE_POLICIES', 'UPDATE'),
  ('ATTENDANCE_POLICIES', 'DELETE'),
  ('ATTENDANCE_POLICIES', 'APPROVE'),
  ('ATTENDANCE_POLICIES', 'REFUSE'),
  ('ATTENDANCE_POLICIES', 'PROCESS'),
  ('ATTENDANCE_POLICIES', 'VALIDATE'),
  ('ATTENDANCE_POLICIES', 'PAY'),
  ('ATTENDANCE_POLICIES', 'EXPORT'),
  ('LEAVE_TYPES', 'CREATE'),
  ('LEAVE_TYPES', 'READ'),
  ('LEAVE_TYPES', 'UPDATE'),
  ('LEAVE_TYPES', 'DELETE'),
  ('LEAVE_TYPES', 'APPROVE'),
  ('LEAVE_TYPES', 'REFUSE'),
  ('LEAVE_TYPES', 'PROCESS'),
  ('LEAVE_TYPES', 'VALIDATE'),
  ('LEAVE_TYPES', 'PAY'),
  ('LEAVE_TYPES', 'EXPORT'),
  ('LEAVE_ALLOCATIONS', 'CREATE'),
  ('LEAVE_ALLOCATIONS', 'READ'),
  ('LEAVE_ALLOCATIONS', 'UPDATE'),
  ('LEAVE_ALLOCATIONS', 'DELETE'),
  ('LEAVE_ALLOCATIONS', 'APPROVE'),
  ('LEAVE_ALLOCATIONS', 'REFUSE'),
  ('LEAVE_ALLOCATIONS', 'PROCESS'),
  ('LEAVE_ALLOCATIONS', 'VALIDATE'),
  ('LEAVE_ALLOCATIONS', 'PAY'),
  ('LEAVE_ALLOCATIONS', 'EXPORT'),
  ('LEAVE_REQUESTS', 'CREATE'),
  ('LEAVE_REQUESTS', 'READ'),
  ('LEAVE_REQUESTS', 'UPDATE'),
  ('LEAVE_REQUESTS', 'DELETE'),
  ('LEAVE_REQUESTS', 'APPROVE'),
  ('LEAVE_REQUESTS', 'REFUSE'),
  ('LEAVE_REQUESTS', 'PROCESS'),
  ('LEAVE_REQUESTS', 'VALIDATE'),
  ('LEAVE_REQUESTS', 'PAY'),
  ('LEAVE_REQUESTS', 'EXPORT'),
  ('SALARY_STRUCTURES', 'CREATE'),
  ('SALARY_STRUCTURES', 'READ'),
  ('SALARY_STRUCTURES', 'UPDATE'),
  ('SALARY_STRUCTURES', 'DELETE'),
  ('SALARY_STRUCTURES', 'APPROVE'),
  ('SALARY_STRUCTURES', 'REFUSE'),
  ('SALARY_STRUCTURES', 'PROCESS'),
  ('SALARY_STRUCTURES', 'VALIDATE'),
  ('SALARY_STRUCTURES', 'PAY'),
  ('SALARY_STRUCTURES', 'EXPORT'),
  ('SALARY_RULES', 'CREATE'),
  ('SALARY_RULES', 'READ'),
  ('SALARY_RULES', 'UPDATE'),
  ('SALARY_RULES', 'DELETE'),
  ('SALARY_RULES', 'APPROVE'),
  ('SALARY_RULES', 'REFUSE'),
  ('SALARY_RULES', 'PROCESS'),
  ('SALARY_RULES', 'VALIDATE'),
  ('SALARY_RULES', 'PAY'),
  ('SALARY_RULES', 'EXPORT'),
  ('PAYRUNS', 'CREATE'),
  ('PAYRUNS', 'READ'),
  ('PAYRUNS', 'UPDATE'),
  ('PAYRUNS', 'DELETE'),
  ('PAYRUNS', 'APPROVE'),
  ('PAYRUNS', 'REFUSE'),
  ('PAYRUNS', 'PROCESS'),
  ('PAYRUNS', 'VALIDATE'),
  ('PAYRUNS', 'PAY'),
  ('PAYRUNS', 'EXPORT'),
  ('PAYSLIPS', 'CREATE'),
  ('PAYSLIPS', 'READ'),
  ('PAYSLIPS', 'UPDATE'),
  ('PAYSLIPS', 'DELETE'),
  ('PAYSLIPS', 'APPROVE'),
  ('PAYSLIPS', 'REFUSE'),
  ('PAYSLIPS', 'PROCESS'),
  ('PAYSLIPS', 'VALIDATE'),
  ('PAYSLIPS', 'PAY'),
  ('PAYSLIPS', 'EXPORT'),
  ('REPORTS', 'CREATE'),
  ('REPORTS', 'READ'),
  ('REPORTS', 'UPDATE'),
  ('REPORTS', 'DELETE'),
  ('REPORTS', 'APPROVE'),
  ('REPORTS', 'REFUSE'),
  ('REPORTS', 'PROCESS'),
  ('REPORTS', 'VALIDATE'),
  ('REPORTS', 'PAY'),
  ('REPORTS', 'EXPORT'),
  ('COMPANY_SETTINGS', 'CREATE'),
  ('COMPANY_SETTINGS', 'READ'),
  ('COMPANY_SETTINGS', 'UPDATE'),
  ('COMPANY_SETTINGS', 'DELETE'),
  ('COMPANY_SETTINGS', 'APPROVE'),
  ('COMPANY_SETTINGS', 'REFUSE'),
  ('COMPANY_SETTINGS', 'PROCESS'),
  ('COMPANY_SETTINGS', 'VALIDATE'),
  ('COMPANY_SETTINGS', 'PAY'),
  ('COMPANY_SETTINGS', 'EXPORT'),
  ('AUDIT_LOGS', 'CREATE'),
  ('AUDIT_LOGS', 'READ'),
  ('AUDIT_LOGS', 'UPDATE'),
  ('AUDIT_LOGS', 'DELETE'),
  ('AUDIT_LOGS', 'APPROVE'),
  ('AUDIT_LOGS', 'REFUSE'),
  ('AUDIT_LOGS', 'PROCESS'),
  ('AUDIT_LOGS', 'VALIDATE'),
  ('AUDIT_LOGS', 'PAY'),
  ('AUDIT_LOGS', 'EXPORT')
ON CONFLICT (module, action) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id, scope)
SELECT r.role_id, p.permission_id, 'ALL'
FROM roles r
CROSS JOIN permissions p
WHERE r.role_name = 'Admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id, scope)
SELECT r.role_id, p.permission_id, 'ALL'
FROM roles r
JOIN permissions p
  ON (
    (p.module = 'DASHBOARD' AND p.action = 'READ') OR
    (p.module = 'COMPANY' AND p.action = 'READ') OR
    (p.module = 'USERS' AND p.action IN ('READ')) OR
    (p.module = 'EMPLOYEES' AND p.action IN ('CREATE', 'READ', 'UPDATE', 'DELETE', 'EXPORT')) OR
    (p.module = 'EMPLOYEES' AND p.action = 'UPDATE_STATUS') OR
    (p.module = 'DEPARTMENTS' AND p.action IN ('CREATE', 'READ', 'UPDATE', 'DELETE')) OR
    (p.module = 'POSITIONS' AND p.action IN ('CREATE', 'READ', 'UPDATE', 'DELETE')) OR
    (p.module = 'EMPLOYEE_TYPES' AND p.action IN ('CREATE', 'READ', 'UPDATE', 'DELETE')) OR
    (p.module = 'CONTRACTS' AND p.action IN ('CREATE', 'READ', 'UPDATE', 'DELETE', 'VALIDATE')) OR
    (p.module = 'WORKING_SCHEDULES' AND p.action IN ('CREATE', 'READ', 'UPDATE', 'DELETE')) OR
    (p.module = 'ATTENDANCE' AND p.action IN ('CREATE', 'READ', 'UPDATE', 'APPROVE', 'REFUSE', 'EXPORT')) OR
    (p.module = 'ATTENDANCE_POLICIES' AND p.action IN ('READ')) OR
    (p.module = 'LEAVE_TYPES' AND p.action IN ('READ')) OR
    (p.module = 'LEAVE_ALLOCATIONS' AND p.action IN ('CREATE', 'READ', 'UPDATE', 'APPROVE', 'REFUSE')) OR
    (p.module = 'LEAVE_REQUESTS' AND p.action IN ('READ', 'APPROVE', 'REFUSE', 'EXPORT')) OR
    (p.module = 'PAYSLIPS' AND p.action IN ('READ')) OR
    (p.module = 'REPORTS' AND p.action IN ('READ', 'EXPORT'))
  )
WHERE r.role_name = 'HR Manager'
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id, scope)
SELECT r.role_id, p.permission_id, 'ALL'
FROM roles r
JOIN permissions p
  ON (
    (p.module = 'DASHBOARD' AND p.action = 'READ') OR
    (p.module = 'COMPANY' AND p.action = 'READ') OR
    (p.module = 'USERS' AND p.action IN ('READ')) OR
    (p.module = 'EMPLOYEES' AND p.action IN ('READ', 'EXPORT')) OR
    (p.module = 'EMPLOYEES' AND p.action = 'UPDATE_STATUS') OR
    (p.module = 'EMPLOYEE_TYPES' AND p.action IN ('READ')) OR
    (p.module = 'CONTRACTS' AND p.action IN ('READ')) OR
    (p.module = 'SALARY_STRUCTURES' AND p.action IN ('CREATE', 'READ', 'UPDATE', 'DELETE', 'VALIDATE')) OR
    (p.module = 'SALARY_RULES' AND p.action IN ('CREATE', 'READ', 'UPDATE', 'DELETE', 'VALIDATE')) OR
    (p.module = 'PAYRUNS' AND p.action IN ('CREATE', 'READ', 'UPDATE', 'DELETE', 'PROCESS', 'VALIDATE', 'PAY', 'EXPORT')) OR
    (p.module = 'PAYSLIPS' AND p.action IN ('CREATE', 'READ', 'UPDATE', 'PROCESS', 'VALIDATE', 'PAY', 'EXPORT')) OR
    (p.module = 'ATTENDANCE' AND p.action IN ('READ')) OR
    (p.module = 'LEAVE_REQUESTS' AND p.action IN ('READ')) OR
    (p.module = 'REPORTS' AND p.action IN ('READ', 'EXPORT'))
  )
WHERE r.role_name = 'Payroll Manager'
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id, scope)
SELECT r.role_id, p.permission_id, 'OWN'
FROM roles r
JOIN permissions p
  ON (
    (p.module = 'DASHBOARD' AND p.action = 'READ') OR
    (p.module = 'COMPANY' AND p.action = 'READ') OR
    (p.module = 'EMPLOYEES' AND p.action IN ('READ')) OR
    (p.module = 'CONTRACTS' AND p.action IN ('READ')) OR
    (p.module = 'PAYRUNS' AND p.action IN ('CREATE', 'READ', 'PROCESS')) OR
    (p.module = 'PAYSLIPS' AND p.action IN ('READ', 'PROCESS', 'EXPORT')) OR
    (p.module = 'REPORTS' AND p.action IN ('READ'))
  )
WHERE r.role_name = 'Payroll User'
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id, scope)
SELECT r.role_id, p.permission_id, 'OWN'
FROM roles r
JOIN permissions p
  ON (
    (p.module = 'DASHBOARD' AND p.action = 'READ') OR
    (p.module = 'COMPANY' AND p.action = 'READ') OR
    (p.module = 'EMPLOYEES' AND p.action IN ('READ', 'UPDATE')) OR
    (p.module = 'ATTENDANCE' AND p.action IN ('READ')) OR
    (p.module = 'LEAVE_REQUESTS' AND p.action IN ('CREATE', 'READ', 'UPDATE')) OR
    (p.module = 'LEAVE_ALLOCATIONS' AND p.action IN ('READ')) OR
    (p.module = 'PAYSLIPS' AND p.action IN ('READ', 'EXPORT'))
  )
WHERE r.role_name = 'Employee'
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO attendance_policies (
  company_id,
  name,
  grace_period_minutes,
  grace_occurrences_allowed,
  grace_period_penalty,
  beyond_grace_penalty,
  early_leave_grace_minutes,
  early_leave_penalty,
  stack_deductions,
  is_active
)
SELECT
  c.company_id,
  'Standard Attendance Policy',
  10,
  3,
  'NONE',
  'HALF_DAY',
  10,
  'HALF_DAY',
  FALSE,
  TRUE
FROM companies c
WHERE c.name = 'PeoplePay360 Demo Pvt Ltd'
ON CONFLICT (company_id, name) DO NOTHING;

INSERT INTO working_schedules (
  company_id,
  name,
  timezone,
  hours_per_week,
  attendance_policy_id,
  is_active
)
SELECT
  c.company_id,
  'General Shift (Mon-Fri)',
  'Asia/Kolkata',
  40.00,
  ap.policy_id,
  TRUE
FROM companies c
JOIN attendance_policies ap
  ON ap.company_id = c.company_id
 AND ap.name = 'Standard Attendance Policy'
WHERE c.name = 'PeoplePay360 Demo Pvt Ltd'
ON CONFLICT (company_id, name) DO NOTHING;

INSERT INTO schedule_days (
  schedule_id,
  day_of_week,
  is_working_day,
  start_time,
  end_time,
  break_minutes
)
SELECT s.schedule_id, v.day_of_week, v.is_working_day, v.start_time, v.end_time, v.break_minutes
FROM working_schedules s
JOIN companies c ON c.company_id = s.company_id
JOIN (
  VALUES
    (1, TRUE, '09:00'::time, '18:00'::time, 60),
    (2, TRUE, '09:00'::time, '18:00'::time, 60),
    (3, TRUE, '09:00'::time, '18:00'::time, 60),
    (4, TRUE, '09:00'::time, '18:00'::time, 60),
    (5, TRUE, '09:00'::time, '18:00'::time, 60),
    (6, FALSE, NULL::time, NULL::time, 0),
    (7, FALSE, NULL::time, NULL::time, 0)
) AS v(day_of_week, is_working_day, start_time, end_time, break_minutes) ON TRUE
WHERE c.name = 'PeoplePay360 Demo Pvt Ltd'
  AND s.name = 'General Shift (Mon-Fri)'
ON CONFLICT (schedule_id, day_of_week) DO NOTHING;

INSERT INTO departments (company_id, name)
SELECT c.company_id, v.name
FROM companies c
JOIN (
  VALUES
    ('Human Resources'),
    ('Payroll'),
    ('Engineering')
) AS v(name) ON TRUE
WHERE c.name = 'PeoplePay360 Demo Pvt Ltd'
ON CONFLICT (company_id, name) DO NOTHING;

INSERT INTO positions (company_id, title, department_id)
SELECT c.company_id, v.title, d.department_id
FROM companies c
JOIN (
  VALUES
    ('HR Manager', 'Human Resources'),
    ('Payroll Manager', 'Payroll'),
    ('Payroll Executive', 'Payroll'),
    ('Software Engineer', 'Engineering')
) AS v(title, dept_name) ON TRUE
JOIN departments d
  ON d.company_id = c.company_id
 AND d.name = v.dept_name
WHERE c.name = 'PeoplePay360 Demo Pvt Ltd'
ON CONFLICT (company_id, title) DO NOTHING;

INSERT INTO employee_types (company_id, name)
SELECT c.company_id, v.name
FROM companies c
JOIN (
  VALUES
    ('Full-Time'),
    ('Part-Time'),
    ('Contract'),
    ('Intern')
) AS v(name) ON TRUE
WHERE c.name = 'PeoplePay360 Demo Pvt Ltd'
ON CONFLICT (company_id, name) DO NOTHING;

INSERT INTO leave_types (
  company_id,
  name,
  unit,
  requires_allocation,
  is_paid,
  default_days_year,
  approval_required,
  payroll_integration,
  is_active
)
SELECT c.company_id, v.name, v.unit, v.requires_allocation, v.is_paid, v.default_days_year, TRUE, TRUE, TRUE
FROM companies c
JOIN (
  VALUES
    ('Sick Leave', 'DAYS', TRUE, TRUE, 12.00),
    ('Casual Leave', 'DAYS', TRUE, TRUE, 8.00),
    ('Earned Leave', 'DAYS', TRUE, TRUE, 15.00),
    ('Unpaid Leave', 'DAYS', FALSE, FALSE, 0.00)
) AS v(name, unit, requires_allocation, is_paid, default_days_year) ON TRUE
WHERE c.name = 'PeoplePay360 Demo Pvt Ltd'
ON CONFLICT (company_id, name) DO NOTHING;

INSERT INTO users (company_id, username, email, password_hash, role_id, status, email_verified_at)
SELECT c.company_id, v.username, v.email, v.password_hash, r.role_id, 'ACTIVE', NOW()
FROM companies c
JOIN (
  VALUES
    ('admin', 'admin@peoplepay360.demo', '$2b$10$7zT3N9R0kX71n4M6jIf8BOgYJ4eNQ3Xv8M7w2PcqYxmpM6NLfYx1W', 'Admin'),
    ('hr.manager', 'hr.manager@peoplepay360.demo', '$2b$10$7zT3N9R0kX71n4M6jIf8BOgYJ4eNQ3Xv8M7w2PcqYxmpM6NLfYx1W', 'HR Manager'),
    ('payroll.manager', 'payroll.manager@peoplepay360.demo', '$2b$10$7zT3N9R0kX71n4M6jIf8BOgYJ4eNQ3Xv8M7w2PcqYxmpM6NLfYx1W', 'Payroll Manager'),
    ('payroll.user', 'payroll.user@peoplepay360.demo', '$2b$10$7zT3N9R0kX71n4M6jIf8BOgYJ4eNQ3Xv8M7w2PcqYxmpM6NLfYx1W', 'Payroll User'),
    ('employee.user', 'employee.user@peoplepay360.demo', '$2b$10$7zT3N9R0kX71n4M6jIf8BOgYJ4eNQ3Xv8M7w2PcqYxmpM6NLfYx1W', 'Employee')
) AS v(username, email, password_hash, role_name) ON TRUE
JOIN roles r ON r.role_name = v.role_name
WHERE c.name = 'PeoplePay360 Demo Pvt Ltd'
ON CONFLICT (company_id, username) DO NOTHING;

INSERT INTO salary_structures (company_id, name, description, is_active, created_by)
SELECT c.company_id, 'Regular Salary', 'Standard monthly payroll structure', TRUE, u.user_id
FROM companies c
JOIN users u
  ON u.company_id = c.company_id
 AND u.username = 'admin'
WHERE c.name = 'PeoplePay360 Demo Pvt Ltd'
ON CONFLICT (company_id, name) DO NOTHING;

INSERT INTO salary_rules (
  company_id,
  name,
  code,
  category,
  computation_type,
  amount,
  percentage_of,
  percentage_value,
  formula,
  is_active
)
SELECT c.company_id, v.name, v.code, v.category, v.computation_type, v.amount, v.percentage_of, v.percentage_value, v.formula, TRUE
FROM companies c
JOIN (
  VALUES
    ('Basic Pay', 'BASIC', 'BASIC', 'FIXED', 30000.00::numeric, NULL::varchar, NULL::numeric, NULL::text),
    ('House Rent Allowance', 'HRA', 'ALLOWANCE', 'PERCENTAGE', NULL::numeric, 'BASIC', 40.000::numeric, NULL::text),
    ('Provident Fund', 'PF', 'DEDUCTION', 'PERCENTAGE', NULL::numeric, 'BASIC', 12.000::numeric, NULL::text),
    ('Professional Tax', 'PT', 'DEDUCTION', 'FIXED', 200.00::numeric, NULL::varchar, NULL::numeric, NULL::text),
    ('Net Salary', 'NET', 'NET', 'FORMULA', NULL::numeric, NULL::varchar, NULL::numeric, 'BASIC + HRA - PF - PT')
) AS v(name, code, category, computation_type, amount, percentage_of, percentage_value, formula) ON TRUE
WHERE c.name = 'PeoplePay360 Demo Pvt Ltd'
ON CONFLICT (company_id, code) DO NOTHING;

INSERT INTO salary_structure_rules (salary_structure_id, salary_rule_id, sequence, is_active)
SELECT ss.salary_structure_id, sr.salary_rule_id, v.sequence, TRUE
FROM companies c
JOIN salary_structures ss
  ON ss.company_id = c.company_id
 AND ss.name = 'Regular Salary'
JOIN (
  VALUES
    ('BASIC', 10),
    ('HRA', 20),
    ('PF', 30),
    ('PT', 40),
    ('NET', 50)
) AS v(code, sequence) ON TRUE
JOIN salary_rules sr
  ON sr.company_id = c.company_id
 AND sr.code = v.code
WHERE c.name = 'PeoplePay360 Demo Pvt Ltd'
ON CONFLICT (salary_structure_id, salary_rule_id) DO NOTHING;

INSERT INTO employees (
  company_id,
  employee_code,
  first_name,
  last_name,
  email,
  phone,
  hire_date,
  department_id,
  position_id,
  employee_type_id,
  schedule_id,
  manager_id,
  status,
  created_by
)
SELECT
  c.company_id,
  v.employee_code,
  v.first_name,
  v.last_name,
  v.email,
  v.phone,
  v.hire_date,
  d.department_id,
  p.position_id,
  et.employee_type_id,
  ws.schedule_id,
  m.employee_id,
  'ACTIVE',
  admin_u.user_id
FROM companies c
JOIN users admin_u
  ON admin_u.company_id = c.company_id
 AND admin_u.username = 'admin'
JOIN working_schedules ws
  ON ws.company_id = c.company_id
 AND ws.name = 'General Shift (Mon-Fri)'
JOIN employee_types et
  ON et.company_id = c.company_id
 AND et.name = 'Full-Time'
JOIN (
  VALUES
    ('EMP-0001', 'Aarav', 'Sharma', 'hr.manager@peoplepay360.demo', '+91-9000000001', '2025-01-10'::date, 'Human Resources', 'HR Manager', NULL::varchar),
    ('EMP-0002', 'Neha', 'Iyer', 'payroll.manager@peoplepay360.demo', '+91-9000000002', '2025-01-12'::date, 'Payroll', 'Payroll Manager', NULL::varchar),
    ('EMP-0003', 'Rohan', 'Mehta', 'payroll.user@peoplepay360.demo', '+91-9000000003', '2025-01-15'::date, 'Payroll', 'Payroll Executive', 'EMP-0002'),
    ('EMP-0004', 'Vikram', 'Rao', 'employee.user@peoplepay360.demo', '+91-9000000004', '2025-02-01'::date, 'Engineering', 'Software Engineer', NULL::varchar)
) AS v(employee_code, first_name, last_name, email, phone, hire_date, department_name, position_title, manager_code) ON TRUE
JOIN departments d
  ON d.company_id = c.company_id
 AND d.name = v.department_name
JOIN positions p
  ON p.company_id = c.company_id
 AND p.title = v.position_title
LEFT JOIN employees m
  ON m.company_id = c.company_id
 AND m.employee_code = v.manager_code
WHERE c.name = 'PeoplePay360 Demo Pvt Ltd'
ON CONFLICT (company_id, employee_code) DO NOTHING;

UPDATE users u
SET employee_id = e.employee_id,
    updated_at = NOW()
FROM employees e
WHERE u.company_id = e.company_id
  AND u.email = e.email
  AND u.employee_id IS DISTINCT FROM e.employee_id;

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
  created_by
)
SELECT
  e.company_id,
  e.employee_id,
  e.position_id,
  e.department_id,
  e.schedule_id,
  ss.salary_structure_id,
  CASE
    WHEN e.employee_code = 'EMP-0001' THEN 90000.00
    WHEN e.employee_code = 'EMP-0002' THEN 85000.00
    WHEN e.employee_code = 'EMP-0003' THEN 55000.00
    ELSE 45000.00
  END,
  'MONTHLY',
  DATE '2025-01-01',
  NULL,
  'ACTIVE',
  admin_u.user_id
FROM employees e
JOIN companies c ON c.company_id = e.company_id
JOIN users admin_u
  ON admin_u.company_id = e.company_id
 AND admin_u.username = 'admin'
JOIN salary_structures ss
  ON ss.company_id = e.company_id
 AND ss.name = 'Regular Salary'
WHERE c.name = 'PeoplePay360 Demo Pvt Ltd'
  AND NOT EXISTS (
    SELECT 1
    FROM contracts cx
    WHERE cx.employee_id = e.employee_id
      AND cx.company_id = e.company_id
      AND cx.status IN ('DRAFT', 'ACTIVE')
      AND daterange(cx.start_date, COALESCE(cx.end_date, 'infinity'::date), '[]')
          && daterange(DATE '2025-01-01', 'infinity'::date, '[]')
  );
