const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    name:    { type: String, required: [true, 'Nome é obrigatório'], trim: true },
    cpf:     { type: String, trim: true },
    phone:   { type: String, trim: true },
    cargo:   { type: String, trim: true, default: '' },
    salary:  { type: Number, default: 0, min: 0 },   // Salário base mensal
    admissionDate: { type: Date, default: null },
    notes:   { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

employeeSchema.index({ company: 1, name: 1 });

module.exports = mongoose.model('Employee', employeeSchema);
