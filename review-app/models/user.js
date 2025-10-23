const mongoose = require('mongoose');
const { Schema } = mongoose;

const nameSchema = new Schema({
  first: { type: String },
  last: { type: String }
}, { _id: false });

const userSchema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  // Note: teachers are stored in a separate Teacher collection and do not have user logins.
  role: { type: String, required: true, enum: ['student', 'admin'], index: true },
  name: { type: nameSchema },
  intake: { season: String, year: Number },
  degreeShort: { type: String },
  rollNumber: { type: String },
  semesterNumber: { type: Number },
  department: { type: Schema.Types.ObjectId, ref: 'Department' },
  program: { type: Schema.Types.ObjectId, ref: 'Program' },
  // profile fields
  section: { type: String },
  phone: { type: String },
  cgpa: { type: Number },
  profileComplete: { type: Boolean, default: false },
  idCardImage: { type: String },
  studentId: { type: String, index: true, sparse: true },
  staffId: { type: String, index: true, sparse: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
