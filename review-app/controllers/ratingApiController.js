const { Rating, User } = require('../models');

// GET /api/ratings
// query: minMarks, minStars, search, sort (createdAt|overallRating|obtainedMarks), order (asc|desc), page, limit
exports.list = async (req, res) => {
  try {
    const q = {};

    const { minMarks, minStars, search, sort='createdAt', order='desc', page=1, limit=25, student } = req.query;
  // optionally filter ratings to only offerings belonging to the active term when requested
  const termActiveFilter = req.query.termActive || req.query.activeTerm || null; // accept either param name
  if (minMarks) q.obtainedMarks = { $gte: Number(minMarks) };
    if (minStars) q.overallRating = { $gte: Number(minStars) };
  if (student) q.student = student;
    // search in comment or student email
    let userIds = null;
    if (search) {
      const s = String(search).trim();
      // find users matching email or name
      const users = await User.find({ $or: [{ 'email': { $regex: s, $options: 'i' } }, { 'name.first': { $regex: s, $options: 'i' } }, { 'name.last': { $regex: s, $options: 'i' } }] }).select('_id').lean();
      userIds = users.map(u => u._id);
      q.$or = [{ comment: { $regex: s, $options: 'i' } }, { student: { $in: userIds } }];
    }
    const sortObj = {};
    sortObj[sort] = order === 'asc' ? 1 : -1;
    const pg = Math.max(1, Number(page) || 1);
    const lim = Math.min(200, Number(limit) || 25);
    const skip = (pg - 1) * lim;
    // if caller requested only active-term ratings, resolve offering ids for active term
    if (termActiveFilter && String(termActiveFilter) === 'true') {
      try {
        const Term = require('../models').Term;
        const Offering = require('../models').Offering;
        const activeTerm = await Term.findOne({ isActive: true }).select('_id').lean();
        if (activeTerm && activeTerm._id) {
          const offeringDocs = await Offering.find({ term: activeTerm._id }).select('_id').lean();
          const offeringIds = offeringDocs.map(o => o._id);
          // restrict ratings to those offerings
          q.offering = offeringIds.length ? { $in: offeringIds } : { $in: [] };
        } else {
          // no active term -> no results
          q.offering = { $in: [] };
        }
      } catch (e) { /* ignore filter failures */ }
    }

    const [items, total, agg] = await Promise.all([
      Rating.find(q).populate('student', 'email name').populate({ path: 'offering', populate: [{ path: 'course' }, { path: 'teacher' }] }).sort(sortObj).skip(skip).limit(lim).lean(),
      Rating.countDocuments(q),
      Rating.aggregate([
        { $match: q },
        { $group: { _id: null, avgOverall: { $avg: '$overallRating' }, avgMarks: { $avg: '$obtainedMarks' }, count: { $sum: 1 } } }
      ])
    ]);
    const aggResult = (agg && agg[0]) ? { avgOverall: agg[0].avgOverall || 0, avgMarks: agg[0].avgMarks || 0, count: agg[0].count || 0 } : { avgOverall: 0, avgMarks: 0, count: 0 };
    return res.json({ success: true, data: { items, total, page: pg, limit: lim, aggregates: aggResult } });
  } catch (err) {
    console.error('api.ratings.list', err);
    return res.status(500).json({ success: false, error: { message: 'Server error' } });
  }
};

// GET /api/ratings/:id
// Fetch a single rating (used by student edit page).
exports.getOne = async (req, res) => {
  try {
    const id = req.params.id;
    const rating = await Rating.findById(id)
      .populate({ path: 'offering', populate: [{ path: 'course' }, { path: 'teacher' }] })
      .lean();
    if (!rating) return res.status(404).json({ success: false, error: { message: 'Not found' } });
    return res.json({ success: true, data: rating });
  } catch (err) {
    console.error('api.ratings.getOne', err);
    return res.status(500).json({ success: false, error: { message: 'Server error' } });
  }
};

// GET /api/ratings/give-options
// Returns the list of offerings the current student can rate in the active term,
// mirroring the logic from ratingController.renderGiveList but as JSON.
exports.giveOptions = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: { message: 'Please log in to give reviews' } });
    }

    const Term = require('../models').Term;
    const Offering = require('../models').Offering;

    const activeTerm = await Term.findOne({ isActive: true }).lean();
    if (!activeTerm) {
      return res.json({
        success: true,
        data: {
          offerings: [],
          activeTerm: null,
          nextTerm: null,
          selectedTerm: null,
          user: req.user,
          error: 'No active term found'
        }
      });
    }

    const filter = { term: activeTerm._id };

    if (!req.user.role || req.user.role !== 'admin') {
      const userSection = (req.user.section || '').toString().trim();
      const userSemester = req.user.semesterNumber;

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

    const ratedOfferings = await Rating.distinct('offering', { student: req.user._id });
    filter._id = { $nin: ratedOfferings };

    const offerings = await Offering.find(filter)
      .populate({ path: 'course', select: 'title code' })
      .populate({ path: 'teacher', select: 'name email' })
      .populate('term')
      .lean();

    const nextTerm = await Term.findOne({ isNext: true }).lean();

    return res.json({
      success: true,
      data: {
        offerings,
        activeTerm,
        nextTerm,
        selectedTerm: activeTerm._id,
        user: req.user
      }
    });
  } catch (err) {
    console.error('api.ratings.giveOptions', err);
    return res.status(500).json({ success: false, error: { message: 'Server error' } });
  }
};

// admin update - update any rating (admin only middleware should protect)
exports.adminUpdate = async (req, res) => {
  try {
    const id = req.params.id;
    const rating = await Rating.findById(id);
    if (!rating) return res.status(404).json({ success: false, error: { message: 'Not found' } });
    const { overallRating, obtainedMarks, anonymized, comment } = req.body;
    if (typeof overallRating !== 'undefined') rating.overallRating = Number(overallRating);
    if (typeof obtainedMarks !== 'undefined') rating.obtainedMarks = Number(obtainedMarks);
    if (typeof anonymized !== 'undefined') rating.anonymized = !!anonymized;
    if (typeof comment !== 'undefined') rating.comment = comment;
    await rating.save();
    return res.json({ success: true, data: { message: 'Updated' } });
  } catch (err) {
    console.error('api.ratings.adminUpdate', err);
    return res.status(500).json({ success: false, error: { message: 'Server error' } });
  }
};

// GET /api/ratings/summary?offering=...
// NOTE: This endpoint no longer performs on-demand summarization. It will return a stored
// RatingSummary (generated during admin Promote) when available. If the offering belongs to
// the active term, the endpoint returns status 'active' (no summary). If the offering is from
// a past term and no stored summary exists, the endpoint returns status 'pending' (no runtime
// summarization is performed here).
exports.summary = async (req, res) => {
  console.log('api.ratings.summary called');
  try {
    const offeringId = req.query.offering;
    if (!offeringId)
      return res.status(400).json({ success: false, error: { message: 'offering required' } });

    // Load offering and its term to determine active state
    const Offering = require('../models').Offering;
    const RatingSummary = require('../models').RatingSummary;
    const offering = await Offering.findById(offeringId).populate('term').lean();

    // If offering not found, return 404
    if (!offering) return res.status(404).json({ success: false, error: { message: 'Offering not found' } });

    const term = offering.term;

    // If term is present and active, do NOT provide a summary (ratings are live and changing)
    if (term && term.isActive) {
      return res.json({ success: true, data: { status: 'active', message: 'Offering belongs to active term; no stored summary.' } });
    }

    // Try to fetch a stored summary for this offering+term
    const termId = term ? term._id : null;
    const stored = await RatingSummary.findOne({ offering: offeringId, term: termId }).lean();
    if (stored) {
      return res.json({ success: true, data: { status: 'stored', summary: stored.summary, avgOverall: stored.avgOverall, avgMarks: stored.avgMarks, count: stored.count, updatedAt: stored.updatedAt, createdAt: stored.createdAt } });
    }

    // No stored summary. Return pending status — do not run heavy summarization here.
    // Provide lightweight aggregates (counts/averages) for display if useful.
    const ratings = await Rating.find({ offering: offeringId }).select('overallRating obtainedMarks').lean();
    const count = ratings.length;
    const avgOverall = count ? (ratings.reduce((s, r) => s + (r.overallRating || 0), 0) / count) : 0;
    const avgMarks = count ? (ratings.reduce((s, r) => s + (r.obtainedMarks || 0), 0) / count) : 0;
    return res.json({ success: true, data: { status: 'pending', message: 'No stored summary', count, avgOverall, avgMarks } });
  } catch (err) {
    console.error('api.ratings.summary', err);
    return res.status(500).json({ success: false, error: { message: 'Server error' } });
  }
};

// GET /api/ratings/summaries
// Lists stored RatingSummary records for inactive terms only.
// query: search, page, limit
exports.listSummaries = async (req, res) => {
  try {
    const RatingSummary = require('../models').RatingSummary;
    const Term = require('../models').Term;

    const { search, page = 1, limit = 25 } = req.query;
    const pg = Math.max(1, Number(page) || 1);
    const lim = Math.min(200, Number(limit) || 25);

    const inactiveTermIds = (await Term.find({ isActive: false }).select('_id').lean()).map((t) => t._id);

    const raw = await RatingSummary.find({ term: { $in: inactiveTermIds } })
      .populate('term', 'name isActive')
      .populate({
        path: 'offering',
        populate: [
          { path: 'course', select: 'code title name' },
          { path: 'teacher', select: 'name email' }
        ]
      })
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean();

    let items = (raw || []).filter((it) => it && it.offering && it.term && it.term.isActive === false);

    if (search) {
      const s = String(search).toLowerCase().trim();
      items = items.filter((it) => {
        const c = it?.offering?.course;
        const t = it?.offering?.teacher;
        const termName = it?.term?.name || '';
        const teacherName = t && t.name ? `${t.name.first || ''} ${t.name.last || ''}`.trim() : (t?.email || '');
        const courseLabel = c ? `${c.code || ''} ${c.title || c.name || ''}`.trim() : '';
        const summaryText = it?.summary || '';
        const hay = `${courseLabel} ${teacherName} ${termName} ${summaryText}`.toLowerCase();
        return hay.includes(s);
      });
    }

    const total = items.length;
    const start = (pg - 1) * lim;
    const paged = items.slice(start, start + lim);

    return res.json({ success: true, data: { items: paged, total, page: pg, limit: lim } });
  } catch (err) {
    console.error('api.ratings.listSummaries', err);
    return res.status(500).json({ success: false, error: { message: 'Server error' } });
  }
};
