const mongoose = require('mongoose');
const { Schema } = mongoose;

const departmentSchema = new Schema({
  name: { type: String, required: true, trim: true, index: true }
}, { timestamps: true });

departmentSchema.index({ name: 1 }, { unique: true });

module.exports = mongoose.model('Department', departmentSchema);
