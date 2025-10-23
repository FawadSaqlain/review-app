const { Rating, Question, Audit, Offering } = require('../models');

// helper to check edit window (7 days)
const canEdit = (doc) => {
  if (!doc || !doc.createdAt) return false;
  const created = new Date(doc.createdAt).getTime();
  const now = Date.now();
  const sevenDays = 1000 * 60 * 60 * 24 * 7;
  return (now - created) <= sevenDays;
};

// render form to rate an offering
exports.renderForm = async (req, res) => {
  try {
    const offeringId = req.query.offering;
    if (!offeringId) return res.status(400).send('offering required');
    // load questions (simple all questions for now)
    const questions = await Question.find().lean();
    // check if user already rated
    const existing = await Rating.findOne({ student: req.user._id, offering: offeringId });
    return res.render('rating-form', { title: 'Rate Course', questions, offeringId, existing });
  } catch (err) {
    console.error('renderForm', err);
    return res.status(500).send('Server error');
  }
};

// submit a new rating (create)
exports.create = async (req, res) => {
  try {
    const { offering, answers, comment, anonymized, overallRating, obtainedMarks } = req.body;
    if (!offering) return res.status(400).json({ success: false, error: { message: 'offering required' } });

    // Authorization: ensure only students who were taught in this offering can submit a review.
    // Admins are still allowed to create ratings (for testing/management) — adjust if needed.
    // Load offering to check section/semester/teacher
    const offeringDoc = await Offering.findById(offering).lean();
    if (!offeringDoc) return res.status(404).json({ success: false, error: { message: 'Offering not found' } });

    // If the requester is not an admin, enforce that their section and semesterNumber match the offering.
    if (!req.user || req.user.role !== 'admin') {
      // require user to be authenticated student
      if (!req.user) return res.status(401).json({ success: false, error: { message: 'Authentication required' } });

      const userSection = (req.user.section || '').toString().trim();
      const offeringSection = (offeringDoc.section || '').toString().trim();

      // If offering has a semesterNumber, require user's semesterNumber to match
      const offeringSem = offeringDoc.semesterNumber;
      const userSem = req.user.semesterNumber;

      const sectionMatches = offeringSection === '' || userSection === offeringSection;
      const semesterMatches = (typeof offeringSem === 'undefined' || offeringSem === null) || (typeof userSem !== 'undefined' && userSem === offeringSem);

      if (!sectionMatches || !semesterMatches) {
        return res.status(403).json({ success: false, error: { message: 'Not allowed to review this offering — you were not enrolled in this class/section' } });
      }
    }
  // overallRating required and must be 1-5
  const or = parseInt(overallRating, 10);
  if (!or || or < 1 || or > 5) return res.status(400).json({ success: false, error: { message: 'overallRating (1-5) required' } });
  // obtainedMarks required
  if (typeof obtainedMarks === 'undefined' || obtainedMarks === null || obtainedMarks === '') return res.status(400).json({ success: false, error: { message: 'obtainedMarks required' } });
    const ratingData = { student: req.user._id, offering, overallRating: or, anonymized: !!anonymized };
    if (answers && Array.isArray(answers) && answers.length) ratingData.answers = answers;
    if (typeof comment !== 'undefined') ratingData.comment = comment;
    if (typeof obtainedMarks !== 'undefined' && obtainedMarks !== null && obtainedMarks !== '') ratingData.obtainedMarks = Number(obtainedMarks);
    const rating = new Rating(ratingData);
    await rating.save();
    await Audit.create({ action: 'rating.create', actor: req.user._id, targetType: 'Rating', targetId: rating._id });
    return res.status(201).json({ success: true, data: { message: 'Rating submitted' } });
  } catch (err) {
    console.error('rating.create error', err);
    if (err && err.code === 11000) return res.status(409).json({ success: false, error: { message: 'You have already rated this offering' } });
    return res.status(500).json({ success: false, error: { message: 'Server error' } });
  }
};

// update an existing rating (only within 7 days)
exports.update = async (req, res) => {
  try {
    const id = req.params.id;
    const rating = await Rating.findById(id);
    if (!rating) return res.status(404).json({ success: false, error: { message: 'Rating not found' } });
    if (rating.student.toString() !== req.user._id.toString()) return res.status(403).json({ success: false, error: { message: 'Not allowed' } });
    if (!canEdit(rating)) return res.status(403).json({ success: false, error: { message: 'Edit window expired' } });
    const { answers, comment, anonymized, overallRating, obtainedMarks } = req.body;
    if (answers && Array.isArray(answers)) rating.answers = answers;
    if (typeof comment !== 'undefined') rating.comment = comment;
    if (typeof anonymized !== 'undefined') rating.anonymized = !!anonymized;
    if (typeof overallRating !== 'undefined') {
      const or = parseInt(overallRating, 10);
      if (!or || or < 1 || or > 5) return res.status(400).json({ success: false, error: { message: 'overallRating must be 1-5' } });
      rating.overallRating = or;
    }
    if (typeof obtainedMarks !== 'undefined' && obtainedMarks !== null && obtainedMarks !== '') {
      const om = Number(obtainedMarks);
      if (isNaN(om) || om < 0) return res.status(400).json({ success: false, error: { message: 'obtainedMarks must be a number' } });
      rating.obtainedMarks = om;
    }
    await rating.save();
    await Audit.create({ action: 'rating.update', actor: req.user._id, targetType: 'Rating', targetId: rating._id });
    return res.status(200).json({ success: true, data: { message: 'Rating updated' } });
  } catch (err) {
    console.error('rating.update error', err);
    return res.status(500).json({ success: false, error: { message: 'Server error' } });
  }
};

// view ratings for an offering (aggregate basic stats)
exports.viewForOffering = async (req, res) => {
  try {
    const offering = req.query.offering || req.params.offering;
    if (!offering) {
      // No offering provided: render a table-driven ratings index page (with offerings list for a filter)
      const offerings = await Offering.find().populate('course').populate('teacher').limit(200).lean();
      return res.render('ratings-index', { title: 'Ratings', offerings });
    }
    const ratings = await Rating.find({ offering }).populate('student', 'email name').lean();
    return res.render('rating-list', { title: 'Ratings', ratings });
  } catch (err) {
    console.error('rating.viewForOffering error', err);
    return res.status(500).send('Server error');
  }
};

// render list of offerings for student to pick and give a rating
exports.renderGiveList = async (req, res) => {
  try {
    // show offerings (populate course and teacher)
    // Only show offerings the current student is allowed to review.
    // Admins see all offerings.
    let filter = {};
    if (!req.user) {
      // should be protected by loginRequire, but guard defensively
      return res.redirect('/login?next=' + encodeURIComponent(req.originalUrl));
    }

    // prepare term-related variables in outer scope so both admin and normal users can reference them
    let activeTerm = null;
    let nextTerm = null;
    let termFilter = null;

    if (req.user.role !== 'admin') {
      const userSection = (req.user.section || '').toString().trim();
      const userSem = req.user.semesterNumber;

      // if we don't have a section for the user, they cannot give reviews for specific sections
      if (!userSection) {
        return res.render('rating-give-list', { title: 'Give Review', offerings: [] });
      }

      // determine term: allow override via ?term=<id>, otherwise use active term
      const Term = require('../models').Term;
      activeTerm = await Term.findOne({ isActive: true }).lean();
      // compute next term name and ensure it exists (do not create here; only lookup)
      if (activeTerm && activeTerm.name) {
        const m = String(activeTerm.name).toLowerCase().match(/^(fa|sp)(\d{2})$/);
        if (m) {
          const season = m[1];
          const y = parseInt(m[2], 10);
          let nextName = null;
          if (season === 'fa') nextName = 'sp' + String((y + 1)).padStart(2, '0');
          else nextName = 'fa' + String(y).padStart(2, '0');
          nextTerm = await Term.findOne({ name: nextName }).lean();
        }
      }

      if (req.query && req.query.term) {
        termFilter = req.query.term;
      } else {
        termFilter = activeTerm ? activeTerm._id : null;
      }

      // match offerings where section equals the student's section and term matches
      filter = {
        section: userSection,
        term: termFilter,
        $or: [ { semesterNumber: { $exists: false } }, { semesterNumber: null }, { semesterNumber: userSem } ]
      };
    } else {
      // admin: allow optional term filter via query
      if (req.query && req.query.term) termFilter = req.query.term;
    }

    let offerings = await Offering.find(filter).populate('course').populate('teacher').populate('term').limit(200).lean();

    // Remove offerings the student has already rated (they can view/edit those on the dashboard)
    if (req.user && req.user.role !== 'admin' && offerings.length) {
      const offeringIds = offerings.map(o => o._id);
      const existingRatings = await Rating.find({ student: req.user._id, offering: { $in: offeringIds } }).select('offering').lean();
      const existingSet = new Set(existingRatings.map(r => r.offering.toString()));
      offerings = offerings.filter(o => !existingSet.has(o._id.toString()));
    }

  return res.render('rating-give-list', { title: 'Give Review', offerings, activeTerm: activeTerm || null, nextTerm: nextTerm || null, selectedTerm: termFilter });
  } catch (err) {
    console.error('renderGiveList error', err);
    return res.status(500).send('Server error');
  }
};

// render prefilled edit form for a rating
exports.renderEditForm = async (req, res) => {
  try {
    const id = req.params.id;
    const rating = await Rating.findById(id).lean();
    if (!rating) return res.status(404).send('Rating not found');
    // ensure owner
    if (!req.user || rating.student.toString() !== req.user._id.toString()) return res.status(403).send('Not allowed');
    // check edit window
    const sevenDays = 1000 * 60 * 60 * 24 * 7;
    const created = new Date(rating.createdAt).getTime();
    if ((Date.now() - created) > sevenDays) return res.status(403).send('Edit window expired');
    // load questions for possible answers editing
    const questions = await Question.find().lean();
    return res.render('rating-edit-form', { title: 'Edit Rating', rating, questions });
  } catch (err) {
    console.error('renderEditForm', err);
    return res.status(500).send('Server error');
  }
};
