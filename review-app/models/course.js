const mongoose = require('mongoose');
const { Schema } = mongoose;

const courseSchema = new Schema({
  code: { type: String, required: true, trim: true, index: true },
  title: { type: String, required: true, trim: true },
  description: { type: String }
}, { timestamps: true });

courseSchema.index({ code: 1 }, { unique: true });

module.exports = mongoose.model('Course', courseSchema);
