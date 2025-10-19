const { Rating, User } = require('../models');

// GET /api/ratings
// query: minMarks, minStars, search, sort (createdAt|overallRating|obtainedMarks), order (asc|desc), page, limit
exports.list = async (req, res) => {
  try {
    const q = {};
  const { minMarks, minStars, search, sort='createdAt', order='desc', page=1, limit=25, student } = req.query;
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
/*
// GET /api/ratings/summary?offering=...
exports.summary = async (req, res) => {
  try {
    const offering = req.query.offering;
    if (!offering) return res.status(400).json({ success: false, error: { message: 'offering required' } });
    // gather comments
    const ratings = await Rating.find({ offering }).select('comment overallRating obtainedMarks').lean();
    const comments = ratings.map(r => r.comment).filter(Boolean).slice(0, 200);
    // simple local summary: join top 5 comments or produce basic stats
    const avgOverall = ratings.length ? (ratings.reduce((s,r)=>s+(r.overallRating||0),0)/ratings.length) : 0;
    const avgMarks = ratings.length ? (ratings.reduce((s,r)=>s+(r.obtainedMarks||0),0)/ratings.length) : 0;
    // If a Gemini API key is configured, try using Google GenAI. Otherwise fall back to local summary.
    const key = process.env.GAMINI_API_KEY || process.env.GENAI_API_KEY;
    if (key) {
      try {
        // lazy-require the SDK; please run `npm install @google/genai` to enable this path
        const { GoogleGenAI } = require('@google/genai');
        const ai = new GoogleGenAI({ apiKey: key });
        const prompt = `Summarize these student comments into a short concise paragraph (3-4 sentences):\n\n${comments.slice(0,10).join('\n\n')}`;
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
        const text = response && (response.text || response.outputText || response.result) ? (response.text || response.outputText || response.result) : null;
        if (text) return res.json({ success: true, data: { summary: text, avgOverall, avgMarks, count: ratings.length } });
      } catch (e) {
        console.warn('GenAI summarization failed, falling back to local summary:', e && e.message ? e.message : e);
      }
    }
    const summarizer = require('../lib/commentSummarizer');
    const result = summarizer.summarizeComments(comments, avgOverall, avgMarks);
    return res.json({ success: true, data: { summary: result.summary, avgOverall, avgMarks, count: ratings.length } });
  } catch (err) {
    console.error('api.ratings.summary', err);
    return res.status(500).json({ success: false, error: { message: 'Server error' } });
  }
};
*/


// GET /api/ratings/summary?offering=...
exports.summary = async (req, res) => {
  try {
    const offering = req.query.offering;
    if (!offering)
      return res.status(400).json({ success: false, error: { message: 'offering required' } });

    const ratings = await Rating.find({ offering }).select('comment overallRating obtainedMarks').lean();
    if (!ratings.length)
      return res.json({ success: true, data: { summary: 'No ratings yet.', avgOverall: 0, avgMarks: 0, count: 0 } });

    const comments = ratings.map(r => r.comment).filter(Boolean).slice(0, 200);
    const avgOverall = ratings.reduce((s, r) => s + (r.overallRating || 0), 0) / ratings.length;
    const avgMarks = ratings.reduce((s, r) => s + (r.obtainedMarks || 0), 0) / ratings.length;

    const key = process.env.GEMINI_API_KEY || process.env.GENAI_API_KEY;

    if (key) {
      try {
        const { GoogleGenAI } = require('@google/genai');
        const ai = new GoogleGenAI({ apiKey: key });
        const prompt = `Summarize these student comments into a short concise paragraph (3-4 sentences):\n\n${comments.slice(0, 10).join('\n\n')}`;
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
        const text = typeof response.text === 'function'
          ? await response.text()
          : (response.text || response.outputText || response.result || null);

        if (text)
          return res.json({ success: true, data: { summary: text, avgOverall, avgMarks, count: ratings.length } });
      } catch (e) {
        console.warn(`GenAI summarization failed: ${e?.message || e}`);
      }
    }

    const summarizer = require('../lib/commentSummarizer');
    const result = summarizer.summarizeComments(comments, avgOverall, avgMarks);
console.log(result);
    return res.json({
      success: true,
      data: { summary: result.summary, avgOverall, avgMarks, count: ratings.length }
    });
  } catch (err) {
    console.error('api.ratings.summary', err);
    return res.status(500).json({ success: false, error: { message: 'Server error' } });
  }
};
