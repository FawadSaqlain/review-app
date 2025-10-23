const { Department, Program } = require('../models');

// mapping of degree short codes (as appear in CUI email local-part) to department/program names
// extend this object as needed
const MAP = {
  bse: { department: 'Computer Science', program: 'Software Engineering' },
  ben: { department: 'Computer Science', program: 'Computer Engineering' },
  bcs: { department: 'Computer Science', program: 'Computer Science' },
  bba: { department: 'Business', program: 'Business Administration' },
  // add more mappings here
};

/**
 * Given a normalized email (lowercase), attempt to extract the degree short code
 * from the CUI Vehari pattern and resolve or create Department and Program.
 * Returns null if no mapping is found.
 *
 * Example: fa22-bse-031@cuivehari.edu.pk -> degreeShort 'bse' -> map to Computer Science / Software Engineering
 */
async function resolveByEmail(email) {
  if (!email || typeof email !== 'string') return null;
  const m = email.toLowerCase().match(/^(?:fa|sp)\d{2}-([a-z]{2,4})-\d{3}@cuivehari\.edu\.pk$/i);
  if (!m) return null;
  const degree = m[1].toLowerCase();
  const entry = MAP[degree];
  if (!entry) return null;

  // find or create department
  let dept = await Department.findOne({ name: entry.department });
  if (!dept) {
    dept = new Department({ name: entry.department });
    await dept.save();
  }

  // find or create program under department
  let prog = await Program.findOne({ name: entry.program, department: dept._id });
  if (!prog) {
    prog = new Program({ name: entry.program, department: dept._id });
    await prog.save();
  }

  return { departmentId: dept._id, programId: prog._id, departmentName: dept.name, programName: prog.name };
}

module.exports = { resolveByEmail, MAP };
