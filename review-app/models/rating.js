const mongoose = require('mongoose');
const { Schema } = mongoose;

const ratingSchema = new Schema({
  student: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  offering: { type: Schema.Types.ObjectId, ref: 'Offering', required: true, index: true },
  // overall rating 1-5 (required)
  overallRating: { type: Number, min: 1, max: 5, required: true, index: true },
  // obtained marks (required, 0-100)
  obtainedMarks: { type: Number, required: true, min: 0 },
  comment: { type: String },
  ipHash: { type: String },
  anonymized: { type: Boolean, default: false }
}, { timestamps: true });

// prevent duplicate rating per student per offering
ratingSchema.index({ student: 1, offering: 1 }, { unique: true });
ratingSchema.index({ offering: 1 });

module.exports = mongoose.model('Rating', ratingSchema);
