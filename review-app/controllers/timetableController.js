const pdfParse = require('pdf-parse');
const mongoose = require('mongoose');
const { Course, Teacher, Offering } = require('../models');
const Audit = require('../models').Audit;

// Helper: normalize name "First Last"
function normalizeName(name) {
  if (!name) return null;
  return name.trim().split(/\s+/).map(s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()).join(' ');
}

// Escape string to safely use inside RegExp
function escapeRegExp(str) {
  if (str === undefined || str === null) return '';
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Heuristic parser that tries to extract course code, title, teacher from lines
function parseLinesToEntries(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const entries = [];

  // Match common code forms: CS-2, CS LAB-1, BCS-FA25-1A, etc.
  const courseCodeRe = /^([A-Z]{1,5}(?:\sLAB)?[-][A-Z0-9-]+[A-Z0-9]?)$/i;
  // Teacher line heuristics: starts with Dr. or contains a personal name (2+ words) and optional dept in parentheses
  const teacherLineRe = /^(Dr\.?\s+|[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)(?:\s*\([A-Za-z0-9\- ]+\))?$/;
  const headerBlacklist = [
    'COMSATS', 'TIMETABLE', 'BREAK', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY',
    'SATURDAY', 'SUNDAY', 'CENTRALIZED', 'TIMETABLES', 'BCS', 'CS-5', 'CS-4', 'CS-3', 'CS-2'
  ];

  function isHeaderLine(l) {
    const up = l.toUpperCase();
    for (const h of headerBlacklist) if (up.includes(h)) return true;
    return false;
  }

  function isLikelyTeacher(l) {
    if (!l) return false;
    if (isHeaderLine(l)) return false;
    if (/Dr\.?/i.test(l)) return true;
    // contains two capitalized words (First Last) and not too long
    const words = l.split(/\s+/).filter(Boolean);
    if (words.length >= 2 && words.length <= 4) {
      const capWords = words.filter(w => /^[A-Z][a-z]/.test(w));
      if (capWords.length >= 2) return true;
    }
    // lines like "Name (DEPT)" => likely teacher
    if (/\([A-Za-z0-9\- ]+\)$/.test(l) && words.length <= 6) return true;
    return false;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // detect a line that looks like a course/location/section code
    const codeMatch = line.match(courseCodeRe);
    if (codeMatch) {
      const codeRaw = codeMatch[1];
      const code = codeRaw.replace(/\s+/g, '').toUpperCase();

      // Collect title lines: look ahead up to 3 lines that are not codes or teacher lines
      let titleParts = [];
      let teacher = null;
      for (let j = i + 1; j <= i + 4 && j < lines.length; j++) {
        const l = lines[j];
        // stop if next code encountered
        if (courseCodeRe.test(l)) break;
        // if this line looks like a teacher line, capture and stop
        if (isLikelyTeacher(l) || teacherLineRe.test(l) || /Dr\.?/i.test(l) || /\([A-Za-z]{2,}\)$/.test(l)) {
          // remove dept parentheses and honorifics, but only if the line looks like a person
          const cleaned = l.replace(/\([A-Za-z0-9\- ]+\)/, '').replace(/Dr\.?\s*/i, '').trim();
          teacher = isLikelyTeacher(cleaned) ? normalizeName(cleaned) : null;
          // advance i so we skip processed lines
          i = j;
          break;
        }
        // otherwise, assume part of the title
        titleParts.push(l);
        i = j; // advance pointer to consume these lines
      }

      const title = titleParts.join(' ').replace(/\s+/g, ' ').trim();
      entries.push({ code, title: title || null, teacher: teacher });
      continue;
    }

    // Also try to detect inline patterns where code and title on same line (e.g., "CS-2 Programming Fundamentals")
    const inlineMatch = line.match(/([A-Z]{1,5}(?:\sLAB)?[-][A-Z0-9-]+)\s+(.+)/i);
    if (inlineMatch) {
      const code = inlineMatch[1].replace(/\s+/g, '').toUpperCase();
      const rest = inlineMatch[2].trim();
      // try to split rest into title and teacher if possible
      const parts = rest.split(/\s{2,}| - | -|\s\|\s/).map(p => p.trim()).filter(Boolean);
      let title = parts[0] || null;
      let teacher = null;
      if (parts.length > 1) {
        teacher = normalizeName(parts[parts.length - 1].replace(/Dr\.?\s*/i, ''));
      } else {
        // attempt to find teacher pattern inside rest
        const tmatch = rest.match(teacherLineRe);
        if (tmatch) teacher = normalizeName(tmatch[0].replace(/Dr\.?\s*/i, ''));
      }
      entries.push({ code, title, teacher });
    }
  }

  return entries;
}

// Controller: upload timetable PDF, parse, and upsert DB records
exports.uploadTimetable = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: { code: 'ERR_NO_FILE', message: 'PDF file required' } });
    // no term concept — proceed without requiring termId

  const data = await pdfParse(req.file.buffer);
  const text = data && data.text ? data.text : '';
  // debug: log extracted text length and preview
  console.log('uploadTimetable: extracted text length=', text.length);
  if (text.length > 0) console.log('uploadTimetable: preview=', text.slice(0, 1000));
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  console.log('uploadTimetable: extracted lines count=', lines.length);
  const entries = parseLinesToEntries(text);

  const summary = { createdCourses: 0, createdTeachers: 0, createdOfferings: 0, skipped: 0, details: [] };

    for (const e of entries) {
      if (!e.code) { summary.skipped++; summary.details.push({ entry: e, reason: 'no code' }); continue; }

      // Upsert course by code
      let course = await Course.findOne({ code: e.code });
      if (!course) {
        course = new Course({ code: e.code, title: e.title || e.code });
        await course.save();
        summary.createdCourses++;
      }

      // Upsert teacher if name present
      let teacher = null;
      if (e.teacher) {
        // match by full name (escape special regex chars coming from parsed text)
        const parts = String(e.teacher).split(/\s+/).filter(Boolean);
        const firstPart = parts[0] || '';
        const lastPart = parts.slice(-1)[0] || '';
        try {
          teacher = await Teacher.findOne({
            'name.first': new RegExp('^' + escapeRegExp(firstPart) + '$', 'i'),
            'name.last': new RegExp('^' + escapeRegExp(lastPart) + '$', 'i')
          });
        } catch (reErr) {
          // fallback: avoid crashing when RegExp construction somehow fails
          console.warn('uploadTimetable: RegExp match failed for teacher lookup', e.teacher, reErr && reErr.message);
          teacher = await Teacher.findOne({ 'name.first': firstPart });
        }
        if (!teacher) {
          const first = parts[0] || '';
          const last = parts.slice(1).join(' ') || '';
          teacher = new Teacher({ name: { first, last } });
          await teacher.save();
          summary.createdTeachers++;
        }
      } else {
        summary.skipped++; summary.details.push({ entry: e, reason: 'no teacher name' });
        continue;
      }

      // Create offering if not exists for course+teacher+term
      const existing = await Offering.findOne({ course: course._id, teacher: teacher._id, term: term._id });
      if (!existing) {
        const offering = new Offering({ course: course._id, teacher: teacher._id, term: term._id });
        await offering.save();
        summary.createdOfferings++;
      }

      summary.details.push({ entry: e, courseId: course._id, teacherId: teacher._id });
    }

    await Audit.create({ action: 'timetable.upload', actor: req.user ? req.user._id : null, targetType: 'Term', targetId: term._id, details: summary });

    // If parser didn't find anything, return debug info so we can inspect the extracted text and lines
    if (summary.details.length === 0 && summary.createdCourses === 0 && summary.createdTeachers === 0 && summary.createdOfferings === 0) {
      return res.status(200).json({
        success: true,
        data: summary,
        debug: {
          extractedTextLength: text.length,
          extractedTextPreview: text.slice(0, 2000),
          extractedLinesCount: lines.length,
          extractedLinesSample: lines.slice(0, 20)
        }
      });
    }

    return res.status(200).json({ success: true, data: summary });
  } catch (err) {
    console.error('uploadTimetable error', err && err.stack ? err.stack : err);
    // handle common Mongo duplicate key errors gracefully
    if (err && err.code === 11000) {
      const key = err.keyValue ? JSON.stringify(err.keyValue) : 'duplicate key';
      return res.status(409).json({ success: false, error: { code: 'ERR_DUPLICATE', message: 'Duplicate key error', details: key } });
    }

    const isProd = process.env.NODE_ENV === 'production';
    const payload = { code: 'ERR_INTERNAL', message: isProd ? 'Server error' : (err && err.message) || 'Server error' };
    if (!isProd && err && err.stack) payload.stack = err.stack;

    return res.status(500).json({ success: false, error: payload });
  }
};

// Render manual add-class form for admin
exports.renderAddClassForm = async (req, res) => {
  try {
    // no term concept — render form without term list
    return res.render('admin-add-class', { terms: [], user: req.user });
  } catch (err) {
    console.error('renderAddClassForm error', err && err.stack ? err.stack : err);
    return res.status(500).send('Server error');
  }
};

// POST handler to add a single class manually (course + teacher + offering)
exports.addClassManually = async (req, res) => {
  try {
    // Accept either a batch of subjects (subjects: [{code,title,teacherName}, ...])
    // or single-subject fields (code, title, teacherName)
    const { department: deptName, program: programName, semesterNumber, section } = req.body;

    let subjects = [];
    if (Array.isArray(req.body.subjects) && req.body.subjects.length > 0) {
      subjects = req.body.subjects;
    } else if (req.body.code && req.body.teacherName) {
      subjects = [{ code: req.body.code, title: req.body.title, teacherName: req.body.teacherName }];
    } else {
      return res.status(400).json({ success: false, error: { code: 'ERR_NO_SUBJECTS', message: 'No subjects provided' } });
    }

    if (!deptName) return res.status(400).json({ success: false, error: { code: 'ERR_NO_DEPARTMENT', message: 'department required' } });
    if (!programName) return res.status(400).json({ success: false, error: { code: 'ERR_NO_PROGRAM', message: 'program required' } });
    if (!semesterNumber) return res.status(400).json({ success: false, error: { code: 'ERR_NO_SEMESTER', message: 'semesterNumber required' } });

    // resolve or create department and program
    const dn = String(deptName).trim();
    let department = await require('../models').Department.findOne({ name: dn });
    if (!department) { department = new (require('../models').Department)({ name: dn }); await department.save(); }

    const pn = String(programName).trim();
    let program = await require('../models').Program.findOne({ name: pn, department: department._id });
    if (!program) { program = new (require('../models').Program)({ name: pn, department: department._id }); await program.save(); }

    const summary = { createdCourses: 0, createdTeachers: 0, createdOfferings: 0, skipped: 0, details: [] };

    for (const s of subjects) {
      const code = s.code ? String(s.code).replace(/\s+/g, '').toUpperCase() : null;
      const title = s.title ? String(s.title).trim() : code;
      const teacherName = s.teacherName ? normalizeName(String(s.teacherName)) : null;

      if (!code) { summary.skipped++; summary.details.push({ subject: s, reason: 'no code' }); continue; }
      if (!teacherName) { summary.skipped++; summary.details.push({ subject: s, reason: 'no teacher' }); continue; }

      // upsert course
      let course = await Course.findOne({ code });
      if (!course) { course = new Course({ code, title }); await course.save(); summary.createdCourses++; }

      // upsert teacher
      const parts = teacherName.split(/\s+/).filter(Boolean);
      const first = parts[0] || '';
      const last = parts.slice(1).join(' ') || '';
      let teacher = await Teacher.findOne({ 'name.first': new RegExp('^' + escapeRegExp(first) + '$', 'i'), 'name.last': new RegExp('^' + escapeRegExp(last) + '$', 'i') });
      if (!teacher) { teacher = new Teacher({ name: { first, last } }); await teacher.save(); summary.createdTeachers++; }

      // create offering if not exists
      const offeringQuery = { course: course._id, teacher: teacher._id };
      if (section) offeringQuery.section = String(section).trim();
      let existing = await Offering.findOne(offeringQuery);
      if (!existing) {
        const offering = new Offering({
          course: course._id,
          teacher: teacher._id,
          section: section ? String(section).trim() : undefined,
          department: department._id,
          program: program._id,
          semesterNumber: Number(semesterNumber)
        });
        await offering.save();
        summary.createdOfferings++;
      }

      summary.details.push({ subject: s, courseId: course._id, teacherId: teacher._id });
    }

    await Audit.create({ action: 'timetable.manualAddBatch', actor: req.user ? req.user._id : null, targetType: 'Program', targetId: program._id, details: summary });

    return res.status(200).json({ success: true, data: summary });
  } catch (err) {
    console.error('addClassManually error', err && err.stack ? err.stack : err);
    const isProd = process.env.NODE_ENV === 'production';
    const payload = { code: 'ERR_INTERNAL', message: isProd ? 'Server error' : (err && err.message) || 'Server error' };
    if (!isProd && err && err.stack) payload.stack = err.stack;
    return res.status(500).json({ success: false, error: payload });
  }
};
