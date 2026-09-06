const assert = require('node:assert/strict');
const dbModule = require('../../src/db');
const { createPayrun } = require('../../src/repositories/payrun.repository');

(async () => {
  const originalQuery = dbModule.query;
  try {
    dbModule.query = async (sql, params) => {
      assert.match(sql, /INSERT INTO payruns/i);
      assert.deepEqual(params, [
        7,
        'Sept 2026',
        2,
        '2026-09-01',
        '2026-09-30',
        'DRAFT',
        11,
      ]);
      return {
        rows: [{
          payrun_id: 99,
          company_id: 7,
          name: 'Sept 2026',
          salary_structure_id: 2,
          period_start: '2026-09-01',
          period_end: '2026-09-30',
          status: 'DRAFT',
          created_by: 11,
        }],
      };
    };

    const result = await createPayrun(null, {
      company_id: 7,
      name: 'Sept 2026',
      salary_structure_id: 2,
      period_start: '2026-09-01',
      period_end: '2026-09-30',
      created_by: 11,
    });

    assert.equal(result.payrun_id, 99);
    assert.equal(result.name, 'Sept 2026');
    console.log('payrun.repository null-payload regression test: PASS');
  } finally {
    dbModule.query = originalQuery;
  }
})().catch((error) => {
  console.error('payrun.repository null-payload regression test: FAIL');
  console.error(error);
  process.exit(1);
});
