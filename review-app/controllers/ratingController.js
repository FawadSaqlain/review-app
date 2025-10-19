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
    const offerings = await Offering.find().populate('course').populate('teacher').limit(200).lean();
    return res.render('rating-give-list', { title: 'Give Review', offerings });
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
