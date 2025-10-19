const mongoose = require('mongoose');
const { Schema } = mongoose;

const programSchema = new Schema({
  name: { type: String, required: true, trim: true, index: true },
  department: { type: Schema.Types.ObjectId, ref: 'Department' }
}, { timestamps: true });

programSchema.index({ name: 1 });

module.exports = mongoose.model('Program', programSchema);
