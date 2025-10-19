const mongoose = require('mongoose');
const { Schema } = mongoose;

const verificationTokenSchema = new Schema({
  email: { type: String, required: true, lowercase: true, index: true },
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  tokenHash: { type: String, required: true },
  purpose: { type: String, enum: ['signup', 'password'], default: 'signup' },
  campus: { type: String },
  expiresAt: { type: Date, required: true }
}, { timestamps: true });

verificationTokenSchema.index({ tokenHash: 1 });

module.exports = mongoose.model('VerificationToken', verificationTokenSchema);
