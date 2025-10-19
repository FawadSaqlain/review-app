const mongoose = require('mongoose');
const { Schema } = mongoose;

const teacherSchema = new Schema({
  name: { first: String, last: String },
  staffId: { type: String, index: true },
  email: { type: String, lowercase: true, trim: true },
  department: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Teacher', teacherSchema);
