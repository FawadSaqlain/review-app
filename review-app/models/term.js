const mongoose = require('mongoose');
const { Schema } = mongoose;

const termSchema = new Schema({
  name: { type: String, required: true, unique: true, trim: true },
  startDate: { type: Date },
  endDate: { type: Date },
  isActive: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Term', termSchema);
