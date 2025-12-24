const { Rating, Audit, Offering } = require('../models');

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
    
    // Check if user already rated this offering
    const existing = await Rating.findOne({ student: req.user._id, offering: offeringId });
    if (existing) {
      // If already rated, redirect to the ratings dashboard where they can edit their existing ratings
      return res.redirect('/ratings');
    }
    
    // If not rated yet, show the rating form
    return res.render('student/rating-form', { title: 'Rate Course', offeringId, existing: null });
  } catch (err) {
    console.error('renderForm', err);
    return res.status(500).send('Server error');
  }
};

// submit a new rating (create)
exports.create = async (req, res) => {
  try {
    const { offering, comment, anonymized, overallRating, obtainedMarks } = req.body;
    if (!offering) return res.status(400).json({ success: false, error: { message: 'offering required' } });

    // Authorization: ensure only students who were taught in this offering can submit a review.
    // Admins are still allowed to create ratings (for testing/management) — adjust if needed.
    // Load offering to check section/semester/teacher
    const offeringDoc = await Offering.findById(offering).lean();
    if (!offeringDoc) return res.status(404).json({ success: false, error: { message: 'Offering not found' } });

    // ensure offering's term is active — ratings are only allowed while the term is active
    try {
      const Term = require('../models').Term;
      let termDoc = null;
      if (offeringDoc.term && typeof offeringDoc.term === 'object' && offeringDoc.term.isActive !== undefined) termDoc = offeringDoc.term;
      else if (offeringDoc.term) termDoc = await Term.findById(offeringDoc.term).lean();
      if (termDoc && !termDoc.isActive) {
        return res.status(403).json({ success: false, error: { message: 'Ratings for this offering are closed (term has been promoted)' } });
      }
    } catch (e) { /* ignore term lookup failures */ }

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
  // Ratings are always anonymous in this system — enforce server-side
  const ratingData = { student: req.user._id, offering, overallRating: or, anonymized: true };
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
    // ensure the offering's term is still active — once admin promotes the term, editing is closed
    try {
      const offeringDoc = await Offering.findById(rating.offering).populate('term').lean();
      if (offeringDoc && offeringDoc.term && offeringDoc.term.isActive === false) {
        return res.status(403).json({ success: false, error: { message: 'Cannot edit rating: term has been promoted and ratings are closed' } });
      }
    } catch (e) { /* ignore */ }
  const { comment, anonymized, overallRating, obtainedMarks } = req.body;
    if (typeof comment !== 'undefined') rating.comment = comment;
  // anonymized is always true for this app — do not allow changing
  rating.anonymized = true;
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
      return res.render('student/ratings-index', { title: 'Ratings', offerings });
    }
    // load offering to inspect term
    const offeringDoc = await Offering.findById(offering).populate('term').lean();
    if (!offeringDoc) return res.status(404).send('Offering not found');

    // if offering belongs to a non-active (previous) term, prefer to show stored summary if available
    const TermModel = require('../models').Term;
    const RatingSummary = require('../models').RatingSummary;
    let termIsActive = false;
    if (offeringDoc.term && offeringDoc.term._id) {
      const termDoc = offeringDoc.term;
      termIsActive = !!termDoc.isActive;
    } else if (offeringDoc.term) {
      const tdoc = await TermModel.findById(offeringDoc.term).lean();
      termIsActive = !!(tdoc && tdoc.isActive);
    }

    if (!termIsActive) {
      // try to fetch a pre-generated summary
      const summary = await RatingSummary.findOne({ offering: offering }).lean();
      if (summary) {
        return res.render('student/rating-list', { title: 'Ratings', summary });
      }
      const userSection = (req.user.section || '').toString().trim();
      const userSem = req.user.semesterNumber;

      // if we don't have a section for the user, they cannot give reviews for specific sections
      if (!userSection) {
        // Ensure template variables are always present (avoid ReferenceError in EJS)
        return res.render('student/rating-give-list', { title: 'Give Review', offerings: [], activeTerm: null, nextTerm: null, selectedTerm: null, user: req.user || null });
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
    const rated = await Rating.find({ 
      student: req.user._id,
      offering: { $in: offerings.map(o => o._id) }
    }).distinct('offering');
      
    offerings = offerings.filter(o => !rated.includes(o._id.toString()));

    // Get next term info for display if needed
    if (!nextTerm && activeTerm) {
      const nextTermName = activeTerm.name.toLowerCase().startsWith('fa') 
        ? 'sp' + String(parseInt(activeTerm.name.slice(2)) + 1).padStart(2, '0')
        : 'fa' + activeTerm.name.slice(2);
      nextTerm = await Term.findOne({ name: nextTermName }).lean();
    }

    console.log(`Found ${offerings.length} offerings to rate for user ${req.user._id}`);

    return res.render('student/rating-give-list', { 
      title: 'Give Review',
      offerings,
      activeTerm: activeTerm || null,
      nextTerm: nextTerm || null,
      selectedTerm: termFilter,
      user: req.user
    });
  } catch (err) {
    console.error('renderGiveList error', err);
    return res.status(500).send('Server error');
  }
};

// Export the renderGiveList function
exports.renderGiveList = async (req, res) => {
  try {
    // First check if user has required profile data
    if (!req.user) {
      return res.status(401).send('Please log in to give reviews');
    }

    // Get active term
    const Term = require('../models').Term;
    const activeTerm = await Term.findOne({ isActive: true }).lean();
    if (!activeTerm) {
      return res.render('student/rating-give-list', { 
        title: 'Give Review',
        offerings: [],
        activeTerm: null,
        nextTerm: null,
        selectedTerm: null,
        user: req.user,
        error: 'No active term found'
      });
    }

    // Build base query for offerings in active term
    const filter = {
      term: activeTerm._id
    };

    // For regular students (non-admin), filter by their section and semester
    if (!req.user.role || req.user.role !== 'admin') {
      const userSection = (req.user.section || '').toString().trim();
      const userSemester = req.user.semesterNumber;

      // Match either:
      // 1. Offering matches user's section exactly OR offering has no section requirement
      // 2. Semester matches OR offering has no semester requirement 
      filter.$or = [{
        $and: [
          { 
            $or: [
              { section: userSection },
              { section: { $exists: false } },
              { section: null },
              { section: '' }
            ]
          },
          {
            $or: [
              { semesterNumber: userSemester },
              { semesterNumber: { $exists: false } },
              { semesterNumber: null }
            ]
          }
        ]
      }];
    }

    // Get the list of offerings already rated by this user
    const ratedOfferings = await Rating.distinct('offering', { 
      student: req.user._id 
    });

    // Add the filter to exclude already rated offerings
    filter._id = { $nin: ratedOfferings };

    // Get all offerings matching the filter
    let offerings = await Offering.find(filter)
      .populate({
        path: 'course',
        select: 'title code'
      })
      .populate({
        path: 'teacher',
        select: 'name'
      })
      .populate('term')
      .lean();

    // Offerings are already filtered at the database level
    // No need for additional filtering here

    // Get next term info for display
    const nextTerm = await Term.findOne({ 
      isNext: true
    }).lean();

    console.log(`Found ${offerings.length} offerings to rate for user ${req.user._id}`);

    return res.render('student/rating-give-list', { 
      title: 'Give Review', 
      offerings,
      activeTerm: activeTerm,
      nextTerm: nextTerm, 
      selectedTerm: activeTerm._id,
      user: req.user
    });
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
    // ensure the offering's term is active — edits are only allowed while the term is active
    try {
      const offeringDoc = await Offering.findById(rating.offering).populate('term').lean();
      if (offeringDoc && offeringDoc.term && offeringDoc.term.isActive === false) {
        return res.status(403).send('Edit not allowed: term has been promoted and ratings are closed');
      }
    } catch (e) { /* ignore */ }
  return res.render('student/rating-edit-form', { title: 'Edit Rating', rating });
  } catch (err) {
    console.error('renderEditForm', err);
    return res.status(500).send('Server error');
  }
};
