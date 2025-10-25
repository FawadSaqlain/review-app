const mongoose = require('mongoose');
const { Schema } = mongoose;

const ratingSummarySchema = new Schema({
  offering: { type: Schema.Types.ObjectId, ref: 'Offering', required: true, index: true },
  term: { type: Schema.Types.ObjectId, ref: 'Term', required: true, index: true },
  summary: { type: String },
  avgOverall: { type: Number },
  avgMarks: { type: Number },
  count: { type: Number },
}, { timestamps: true });

ratingSummarySchema.index({ offering: 1, term: 1 }, { unique: true });

module.exports = mongoose.model('RatingSummary', ratingSummarySchema);
