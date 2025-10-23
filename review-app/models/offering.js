const mongoose = require('mongoose');
const { Schema } = mongoose;

const offeringSchema = new Schema({
  course: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  teacher: { type: Schema.Types.ObjectId, ref: 'Teacher', required: true, index: true },
  section: { type: String },
  term: { type: Schema.Types.ObjectId, ref: 'Term' },
  department: { type: Schema.Types.ObjectId, ref: 'Department' },
  program: { type: Schema.Types.ObjectId, ref: 'Program' },
  semesterNumber: { type: Number }
}, { timestamps: true });

// Unique per course+teacher+section to avoid duplicate identical offerings
offeringSchema.index({ course: 1, teacher: 1, section: 1 }, { unique: true });

module.exports = mongoose.model('Offering', offeringSchema);
