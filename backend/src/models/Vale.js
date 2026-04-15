const mongoose = require('mongoose');

const valeSchema = new mongoose.Schema(
  {
    company:    { type: mongoose.Schema.Types.ObjectId, ref: 'Company',  required: true },
    employee:   { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    amount:     { type: Number, required: true, min: 0.01 },
    reason:     { type: String, trim: true, default: '' },
    date:       { type: Date, required: true, default: Date.now },
    signed:     { type: Boolean, default: false },
    signedAt:   { type: Date, default: null },
    notes:      { type: String, trim: true },
    createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

valeSchema.index({ company: 1, employee: 1, date: -1 });

module.exports = mongoose.model('Vale', valeSchema);
