const mongoose = require('mongoose');
const { Schema } = mongoose;

const auditSchema = new Schema({
  action: { type: String, required: true },
  actor: { type: Schema.Types.ObjectId, ref: 'User' },
  targetType: { type: String },
  targetId: { type: Schema.Types.ObjectId },
  details: { type: Schema.Types.Mixed }
}, { timestamps: true });

module.exports = mongoose.model('Audit', auditSchema);
