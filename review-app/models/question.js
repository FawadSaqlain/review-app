const mongoose = require('mongoose');
const { Schema } = mongoose;

const questionSchema = new Schema({
  text: { type: String, required: true },
  type: { type: String, enum: ['numeric', 'text'], default: 'numeric' },
  required: { type: Boolean, default: true },
  order: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Question', questionSchema);
