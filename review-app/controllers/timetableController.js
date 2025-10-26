const pdfParse = require('pdf-parse');
const mongoose = require('mongoose');
const { Course, Teacher, Offering } = require('../models');
const Audit = require('../models').Audit;
const Term = require('../models').Term;
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

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
        try {
          await offering.save();
          summary.createdOfferings++;
        } catch (saveErr) {
          // handle duplicate key errors gracefully during bulk operations
          if (saveErr && (saveErr.code === 11000 || saveErr.code === 11001)) {
            summary.skipped++;
            summary.details.push({ entry: e, reason: 'duplicate offering', error: (saveErr.keyValue || saveErr.message) });
          } else {
            throw saveErr;
          }
        }
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
    // provide active term and next term for admin selection
    const active = await Term.findOne({ isActive: true }).lean();
    let next = null;
    if (active && active.name) {
      // compute next term name: if active starts with 'fa' -> next = 'sp' with year+1; if 'sp' -> next = 'fa' same year
      const m = String(active.name).toLowerCase().match(/^(fa|sp)(\d{2})$/);
      if (m) {
        const season = m[1];
        const y = parseInt(m[2], 10);
        let nextName = null;
        if (season === 'fa') nextName = 'sp' + String((y + 1)).padStart(2, '0');
        else nextName = 'fa' + String(y).padStart(2, '0');
        // try find next term; create it if missing (inactive)
        let nextDoc = await Term.findOne({ name: nextName });
        if (!nextDoc) {
          nextDoc = new Term({ name: nextName, isActive: false });
          await nextDoc.save();
        }
        next = nextDoc.toObject();
      }
    }

    let terms = [];
    if (active) terms.push(active);
    if (next) terms.push(next);
    // If there is no active term, fall back to listing all known terms (latest first)
    if (!terms.length) {
      const all = await Term.find().sort({ startDate: -1 }).lean();
      terms = all || [];
    }

    return res.render('admin-add-class', { terms, user: req.user });
  } catch (err) {
    console.error('renderAddClassForm error', err && err.stack ? err.stack : err);
    return res.status(500).send('Server error');
  }
};

// List terms (admin)
exports.listTerms = async (req, res) => {
  try {
    const terms = await Term.find().sort({ startDate: -1 }).lean();
    // pass optional messages from query string (used after redirects)
    const message = req.query && req.query.message ? req.query.message : null;
    const error = req.query && req.query.error ? req.query.error : null;
    return res.render('admin-terms', { title: 'Terms', terms, message, error });
    // return res.json({ title: 'Terms', terms, message, error });
  } catch (err) {
    console.error('listTerms error', err);
    return res.status(500).send('Server error');
  }
};

// Create a term (admin) - expects { name, startDate, endDate }
exports.createTerm = async (req, res) => {
  try {
    const { name, startDate, endDate, isActive } = req.body;
    if (!name) return res.status(400).json({ success: false, error: { message: 'name required' } });
    const t = new Term({ name: String(name).trim(), startDate: startDate ? new Date(startDate) : undefined, endDate: endDate ? new Date(endDate) : undefined, isActive: !!isActive });
    // if isActive true, deactivate others
    if (t.isActive) await Term.updateMany({ _id: { $ne: t._id } }, { isActive: false });
    await t.save();
    await Audit.create({ action: 'term.create', actor: req.user ? req.user._id : null, targetType: 'Term', targetId: t._id });
    return res.status(201).json({ success: true, data: { term: t } });
  } catch (err) {
    console.error('createTerm error', err);
    return res.status(500).json({ success: false, error: { message: 'Server error' } });
  }
};

// Activate an existing term
exports.activateTerm = async (req, res) => {
  try {
    const id = req.params.id;
  const term = await Term.findById(id);
  // capture currently active term (if any) so we can generate summaries for it after activation
  const prevActiveTerm = await Term.findOne({ isActive: true }).lean();
    if (!term) return res.status(404).json({ success: false, error: { message: 'Term not found' } });
    // enforce start and end dates before activation
    if (!term.startDate || !term.endDate) return res.status(400).json({ success: false, error: { message: 'Term must have startDate and endDate before activation' } });
    await Term.updateMany({}, { isActive: false });
    term.isActive = true;
    await term.save();
    await Audit.create({ action: 'term.activate', actor: req.user ? req.user._id : null, targetType: 'Term', targetId: term._id });
    return res.json({ success: true, data: { term } });
  } catch (err) {
    console.error('activateTerm error', err);
    return res.status(500).json({ success: false, error: { message: 'Server error' } });
  }
};

// Promote term: activate the term and create the following next term (with optional start/end dates)
exports.promoteTerm = async (req, res) => {
  try {
    const id = req.params.id;
    const { nextStartDate, nextEndDate } = req.body || {};
    const term = await Term.findById(id);
    // capture currently active term BEFORE we change anything so summaries can be generated for it
    const prevActiveTerm = await Term.findOne({ isActive: true }).lean();
    if (!term) return res.status(404).json({ success: false, error: { message: 'Term not found' } });

    // If the request provided start/end dates (from the UI), persist them first
    if (req.body && (req.body.startDate || req.body.endDate)) {
      if (req.body.startDate) term.startDate = new Date(req.body.startDate);
      if (req.body.endDate) term.endDate = new Date(req.body.endDate);
      await term.save();
    }

    // Enforce that the selected term has startDate and endDate before activating
    if (!term.startDate || !term.endDate) {
      const accept = req.headers && req.headers.accept ? req.headers.accept : '';
      const errMsg = 'Selected term must have Start and End dates before it can be activated.';
      if (accept.indexOf('text/html') !== -1) {
        // redirect back with an error query so the UI can display the message
        return res.redirect('/admin/terms?error=' + encodeURIComponent(errMsg));
      }
      return res.status(400).json({ success: false, error: { message: errMsg } });
    }

    // activate selected term
    await Term.updateMany({}, { isActive: false });
    term.isActive = true;
    await term.save();
    await Audit.create({ action: 'term.activate', actor: req.user ? req.user._id : null, targetType: 'Term', targetId: term._id });

  // compute next term name from activated term name
    let nextName = null;
    const m = String(term.name).toLowerCase().match(/^(fa|sp)(\d{2})$/);
    if (m) {
      const season = m[1];
      const y = parseInt(m[2], 10);
      if (season === 'fa') nextName = 'sp' + String(y + 1).padStart(2, '0');
      else nextName = 'fa' + String(y).padStart(2, '0');
    }

    let createdNext = null;
    if (nextName) {
      let next = await Term.findOne({ name: nextName });
      if (!next) {
        next = new Term({ name: nextName, isActive: false });
        // next term dates may be provided optionally, but not required
        if (nextStartDate) next.startDate = new Date(nextStartDate);
        if (nextEndDate) next.endDate = new Date(nextEndDate);
        await next.save();
        createdNext = next;
        await Audit.create({ action: 'term.create', actor: req.user ? req.user._id : null, targetType: 'Term', targetId: next._id });
      }
    }

    // generate and store comment summaries for the previous term (if any)
    try {
      const prevTerm = prevActiveTerm; // captured earlier
      if (prevTerm && prevTerm._id) {
        const Rating = require('../models').Rating;
        const RatingSummary = require('../models').RatingSummary;
        const Offering = require('../models').Offering;
        const { summarizeComments } = require('../lib/commentSummarizer');

        const offerings = await Offering.find({ term: prevTerm._id }).select('_id').lean();
        for (const o of offerings) {
          try {
            const ratings = await Rating.find({ offering: o._id }).lean();
            if (!ratings || ratings.length === 0) continue;
            const comments = ratings.map(r => r.comment).filter(Boolean);
            const avgOverall = ratings.reduce((s, r) => s + (r.overallRating || 0), 0) / ratings.length;
            const avgMarks = ratings.reduce((s, r) => s + (typeof r.obtainedMarks !== 'undefined' && r.obtainedMarks !== null ? r.obtainedMarks : 0), 0) / ratings.length;
            const summaryObj = summarizeComments(comments, avgOverall || 0, avgMarks || 0);
            await RatingSummary.findOneAndUpdate({ offering: o._id, term: prevTerm._id }, { summary: summaryObj.summary, avgOverall: summaryObj.avgOverall, avgMarks: summaryObj.avgMarks, count: summaryObj.count }, { upsert: true, new: true });
          } catch (inner) {
            console.warn('Could not generate summary for offering', o._id, inner && inner.message);
          }
        }
      }
    } catch (e) {
      console.error('Error generating summaries for previous term', e && e.stack ? e.stack : e);
    }

    // If request comes from browser form, redirect back to terms page with success message
    const accept = req.headers && req.headers.accept ? req.headers.accept : '';
    if (accept.indexOf('text/html') !== -1) return res.redirect('/admin/terms?message=' + encodeURIComponent('Term activated and next term created'));

    return res.json({ success: true, data: { activated: term, next: createdNext } });
  } catch (err) {
    console.error('promoteTerm error', err);
    return res.status(500).json({ success: false, error: { message: 'Server error' } });
  }
};

// Update term (set start/end dates and optionally activate)
exports.updateTerm = async (req, res) => {
  try {
    const id = req.params.id;
    const { startDate, endDate, activate } = req.body || {};
    const term = await Term.findById(id);
    if (!term) return res.status(404).json({ success: false, error: { message: 'Term not found' } });
    if (startDate) term.startDate = new Date(startDate);
    if (endDate) term.endDate = new Date(endDate);
    if (activate) {
      // require dates
      if (!term.startDate || !term.endDate) return res.status(400).json({ success: false, error: { message: 'Start and End dates required to activate' } });
      await Term.updateMany({}, { isActive: false });
      term.isActive = true;
    }
    await term.save();
    await Audit.create({ action: 'term.update', actor: req.user ? req.user._id : null, targetType: 'Term', targetId: term._id });
    const accept = req.headers && req.headers.accept ? req.headers.accept : '';
    if (accept.indexOf('text/html') !== -1) return res.redirect('/admin/terms');
    return res.json({ success: true, data: { term } });
  } catch (err) {
    console.error('updateTerm error', err);
    return res.status(500).json({ success: false, error: { message: 'Server error' } });
  }
};

// helper: resolve the term to use (req.body.term or req.query.term or active term)
async function resolveTermFromRequest(req) {
  const TermModel = Term;
  const termId = (req.body && req.body.term) || (req.query && req.query.term);
  if (termId) {
    const t = await TermModel.findById(termId);
    if (t) return t;
  }
  // fallback to active term
  const active = await TermModel.findOne({ isActive: true });
  return active || null;
}

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

  // resolve term (body may include term id)
  const resolvedTerm = await resolveTermFromRequest(req);
  if (!resolvedTerm) return res.status(400).json({ success: false, error: { code: 'ERR_NO_TERM', message: 'No active term and no term provided' } });

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
      const offeringQuery = { course: course._id, teacher: teacher._id, term: resolvedTerm._id };
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
        offering.term = resolvedTerm._id;
        try {
          await offering.save();
          summary.createdOfferings++;
        } catch (saveErr) {
          if (saveErr && (saveErr.code === 11000 || saveErr.code === 11001)) {
            summary.skipped++;
            summary.details.push({ row: r, reason: 'duplicate offering', error: (saveErr.keyValue || saveErr.message) });
          } else {
            throw saveErr;
          }
        }
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

// List offerings filtered by term (admin view)
exports.listOfferingsByTerm = async (req, res) => {
  try {
    const termId = req.query.term;
    let term = null;
    if (termId) term = await Term.findById(termId).lean();
    if (!term) term = await Term.findOne({ isActive: true }).lean();
    const filter = {};
    if (term && term._id) filter.term = term._id;
    const offerings = await Offering.find(filter).populate('course teacher department program term').sort({ 'course.code': 1 }).lean();
    const terms = await Term.find().sort({ startDate: -1 }).lean();
  return res.render('admin/admin-offerings', { title: 'Offerings', offerings, terms, currentTerm: term, user: req.user });
  // return res.json({ title: 'Offerings', offerings, terms, currentTerm: term, user: req.user });
  } catch (err) {
    console.error('listOfferingsByTerm error', err);
    return res.status(500).send('Server error');
  }
};

// Render offering edit form
exports.renderOfferingEditForm = async (req, res) => {
  try {
    const id = req.params.id;
    const offering = await Offering.findById(id).populate('course teacher department program term').lean();
    if (!offering) return res.status(404).send('Offering not found');
    const terms = await Term.find().sort({ startDate: -1 }).lean();
    const departments = await require('../models').Department.find().lean();
    const programs = await require('../models').Program.find().lean();
  return res.render('admin/admin-offering-edit', { title: 'Edit Offering', offering, terms, departments, programs, user: req.user });
  } catch (err) {
    console.error('renderOfferingEditForm error', err);
    return res.status(500).send('Server error');
  }
};

// Update offering (admin)
exports.updateOffering = async (req, res) => {
  try {
    const id = req.params.id;
    const offering = await Offering.findById(id);
    if (!offering) return res.status(404).json({ success: false, error: { message: 'Offering not found' } });
    const { department: deptId, program: programId, semesterNumber, section, term: termId } = req.body;
  const courseId = req.body.courseId;
  const courseTitle = req.body.courseTitle;
    if (deptId) offering.department = deptId;
    if (programId) offering.program = programId;
    if (typeof semesterNumber !== 'undefined') offering.semesterNumber = Number(semesterNumber) || offering.semesterNumber;
    if (typeof section !== 'undefined') offering.section = section || offering.section;
    if (termId) offering.term = termId;
    // update course title if requested
    if (courseId && courseTitle) {
      try {
        const Course = require('../models').Course;
        await Course.findByIdAndUpdate(courseId, { title: String(courseTitle).trim() });
      } catch (e) { console.warn('Could not update course title', e && e.message); }
    }
    await offering.save();
    await Audit.create({ action: 'offering.update', actor: req.user ? req.user._id : null, targetType: 'Offering', targetId: offering._id });
    // If request expects HTML (form submit), redirect back to listings for a smoother UX
    const accept = req.headers && req.headers.accept ? req.headers.accept : '';
    if (accept.indexOf('text/html') !== -1) {
      return res.redirect('/admin/offerings');
    }
    return res.json({ success: true, data: { offering } });
  } catch (err) {
    console.error('updateOffering error', err);
    return res.status(500).json({ success: false, error: { message: 'Server error' } });
  }
};

// Delete offering (admin)
exports.deleteOffering = async (req, res) => {
  try {
    const id = req.params.id;
    const offering = await Offering.findByIdAndDelete(id);
    if (!offering) return res.status(404).json({ success: false, error: { message: 'Offering not found' } });
    await Audit.create({ action: 'offering.delete', actor: req.user ? req.user._id : null, targetType: 'Offering', targetId: id });
    const accept = req.headers && req.headers.accept ? req.headers.accept : '';
    if (accept.indexOf('text/html') !== -1) {
      return res.redirect('/admin/offerings');
    }
    return res.json({ success: true, data: { id } });
  } catch (err) {
    console.error('deleteOffering error', err);
    return res.status(500).json({ success: false, error: { message: 'Server error' } });
  }
};

// POST handler: parse uploaded XLSX and add classes in bulk
exports.addClassesFromXlsx = async (req, res) => {
  try {
    // Support multer-style (req.file.buffer), express-fileupload (req.files.file.data),
    // and express-fileupload with useTempFiles (req.files.file.tempFilePath).
    let buffer = null;
    let tempPath = null;
    if (req.file && req.file.buffer) {
      buffer = req.file.buffer;
    } else if (req.files && req.files.file) {
      const f = req.files.file;
      if (f.data && f.data.length && f.data.length > 0) {
        buffer = f.data;
      } else if (f.tempFilePath) {
        tempPath = f.tempFilePath;
      }
    }

    if (!buffer && !tempPath) return res.status(400).json({ success: false, error: { code: 'ERR_NO_FILE', message: 'Excel file required' } });

    // extra diagnostics: check buffer length or temp file stats
    // optional diagnostics removed - keep code minimal

    const workbook = new ExcelJS.Workbook();
    try {
      if (buffer) {
        if (!buffer || buffer.length === 0) throw new Error('uploaded buffer empty');
        await workbook.xlsx.load(buffer);
      } else {
        // read from temp file path
        const st = fs.statSync(tempPath);
        if (!st || st.size === 0) throw new Error('uploaded temp file empty');
        await workbook.xlsx.readFile(tempPath);
      }
    } finally {
      // cleanup temp file if present
      try { if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath); } catch (e) { /* ignore cleanup errors */ }
    }
    const worksheet = workbook.worksheets && workbook.worksheets[0];
    if (!worksheet) return res.status(400).json({ success: false, error: { code: 'ERR_EMPTY', message: 'No sheets found in workbook' } });

    // Convert rows to objects using header row (first non-empty row assumed headers)
    const rows = [];
    let headerMap = null;
    const maxRows = 2000; // safety cap
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rows.length > maxRows) return; // stop collecting beyond cap
      const values = row.values ? row.values.slice(1) : [];
      if (!headerMap) {
        // build header map from this row
        headerMap = values.map(h => (h || '').toString().trim());
        return;
      }
      const obj = {};
      for (let i = 0; i < headerMap.length; i++) {
        const key = headerMap[i] || `col${i}`;
        obj[key] = values[i] !== undefined ? values[i] : '';
      }
      rows.push(obj);
    });

    if (!rows || rows.length === 0) return res.status(400).json({ success: false, error: { code: 'ERR_EMPTY', message: 'No data rows found in sheet' } });

    const summary = { createdCourses: 0, createdTeachers: 0, createdOfferings: 0, skipped: 0, details: [] };

  // resolve term (may be provided as a column 'term' or passed in body)
  const resolvedTerm = await resolveTermFromRequest(req);
  if (!resolvedTerm) return res.status(400).json({ success: false, error: { code: 'ERR_NO_TERM', message: 'No active term and no term provided' } });

  const seenKeys = new Set(); // in-memory dedupe for rows within the same uploaded file
  for (const r of rows) {
      // attempt to find common header keys
      const code = r.code || r.Code || r['Course Code'] || r['course code'] || r['Code'] || r['code'] || r['course_code'];
      const title = r.title || r.Title || r['Course Title'] || r['course title'] || r['Title'] || r['title'];
      const teacherName = r.teacher || r.Teacher || r['Teacher Name'] || r['teacher name'] || r['Instructor'] || r['instructor'];
      const deptName = r.department || r.Department || r['Department'] || 'Unknown';
      const programName = r.program || r.Program || r['Program'] || 'Unknown';
      const semesterNumber = r.semesterNumber || r.Semester || r['Semester Number'] || 1;
      const section = r.section || r.Section || r['Section'] || undefined;

      const codeNorm = code ? String(code).replace(/\s+/g, '').toUpperCase() : null;
      const teacherNorm = teacherName ? normalizeName(String(teacherName)) : null;

      // in-file dedupe key: courseCode|teacherNormalized|section
      const fileKey = `${codeNorm || ''}|${teacherNorm || ''}|${(section || '')}`;
      if (seenKeys.has(fileKey)) {
        summary.skipped++;
        summary.details.push({ row: r, reason: 'duplicate in uploaded file' });
        continue;
      }
      seenKeys.add(fileKey);

      if (!codeNorm || !teacherNorm) { summary.skipped++; summary.details.push({ row: r, reason: 'missing code or teacher' }); continue; }

      let department = await require('../models').Department.findOne({ name: String(deptName).trim() });
      if (!department) { department = new (require('../models').Department)({ name: String(deptName).trim() }); await department.save(); }
      let program = await require('../models').Program.findOne({ name: String(programName).trim(), department: department._id });
      if (!program) { program = new (require('../models').Program)({ name: String(programName).trim(), department: department._id }); await program.save(); }

      let course = await Course.findOne({ code: codeNorm });
      if (!course) { course = new Course({ code: codeNorm, title: String(title || codeNorm) }); await course.save(); summary.createdCourses++; }

      const parts = teacherNorm.split(/\s+/).filter(Boolean);
      const first = parts[0] || '';
      const last = parts.slice(1).join(' ') || '';
      let teacher = await Teacher.findOne({ 'name.first': new RegExp('^' + escapeRegExp(first) + '$', 'i'), 'name.last': new RegExp('^' + escapeRegExp(last) + '$', 'i') });
      if (!teacher) { teacher = new Teacher({ name: { first, last } }); await teacher.save(); summary.createdTeachers++; }

      const offeringQuery = { course: course._id, teacher: teacher._id, term: resolvedTerm._id };
      if (section) offeringQuery.section = String(section).trim();
      let existing = await Offering.findOne(offeringQuery);
      if (!existing) {
        const offering = new Offering({ course: course._id, teacher: teacher._id, section: section ? String(section).trim() : undefined, department: department._id, program: program._id, semesterNumber: Number(semesterNumber) });
        offering.term = resolvedTerm._id;
        try {
          await offering.save();
          summary.createdOfferings++;
        } catch (saveErr) {
          // handle duplicate key errors gracefully during bulk operations
          if (saveErr && (saveErr.code === 11000 || saveErr.code === 11001)) {
            summary.skipped++;
            summary.details.push({ row: r, reason: 'duplicate offering', error: (saveErr.keyValue || saveErr.message) });
          } else {
            // record and continue to avoid aborting the entire bulk upload
            summary.skipped++;
            summary.details.push({ row: r, reason: 'save error', error: (saveErr && saveErr.message) || String(saveErr) });
          }
        }
      }
      summary.details.push({ row: r, courseId: course._id, teacherId: teacher._id });
    }

    await Audit.create({ action: 'timetable.bulkUpload', actor: req.user ? req.user._id : null, targetType: 'BulkUpload', details: summary });

    return res.status(200).json({ success: true, data: summary });
  } catch (err) {
    console.error('addClassesFromXlsx error', err && err.stack ? err.stack : err);
    const isProd = process.env.NODE_ENV === 'production';
    const payload = { code: 'ERR_INTERNAL', message: isProd ? 'Server error' : (err && err.message) || 'Server error' };
    if (!isProd && err && err.stack) payload.stack = err.stack;
    return res.status(500).json({ success: false, error: payload });
  }
};

// debug endpoint removed
