const mongoose = require('mongoose');

const osSchema = new mongoose.Schema(
  {
    company:  { type: mongoose.Schema.Types.ObjectId, ref: 'Company',  required: true },
    budget:   { type: mongoose.Schema.Types.ObjectId, ref: 'Budget',   required: true },
    client:   { type: mongoose.Schema.Types.ObjectId, ref: 'Client',   required: true },
    number:   { type: Number, required: true },

    title:       { type: String, required: true },
    description: { type: String },
    status: {
      type: String,
      enum: ['pendente', 'em_execucao', 'concluido', 'cancelado'],
      default: 'pendente',
    },

    assignedTo:  { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    dueDate:     { type: Date },
    completedAt: { type: Date },
    notes:       { type: String },
    createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

osSchema.index({ company: 1, number: 1 }, { unique: true });

module.exports = mongoose.model('OrdemServico', osSchema);
