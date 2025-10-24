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

// Unique per course+teacher+term+section to avoid duplicate identical offerings across terms
// Note: if your database already has a different unique index (older schema), you'll need to drop it
// in the database (mongo shell or Mongo GUI) before this new index can be created without error.
offeringSchema.index({ course: 1, teacher: 1, term: 1, section: 1 }, { unique: true });

module.exports = mongoose.model('Offering', offeringSchema);
