const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    name: { type: String, required: [true, 'Nome é obrigatório'], trim: true },
    type: { type: String, enum: ['pessoa_fisica', 'pessoa_juridica'], default: 'pessoa_fisica' },
    cpfCnpj: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    phone2: { type: String, trim: true },
    address: {
      street: String,
      number: String,
      complement: String,
      neighborhood: String,
      city: String,
      state: String,
      zipCode: String,
    },
    notes: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

clientSchema.index({ company: 1, name: 1 });
clientSchema.index({ company: 1, cpfCnpj: 1 });

module.exports = mongoose.model('Client', clientSchema);
