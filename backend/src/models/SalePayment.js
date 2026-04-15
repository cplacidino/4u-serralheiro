const mongoose = require('mongoose');

const salePaymentSchema = new mongoose.Schema({
  company:  { type: mongoose.Schema.Types.ObjectId, ref: 'Company',     required: true },
  budget:   { type: mongoose.Schema.Types.ObjectId, ref: 'Budget',      required: true },
  client:   { type: mongoose.Schema.Types.ObjectId, ref: 'Client',      required: true },
  method:   { type: String, enum: ['dinheiro','pix','cartão_débito','cartão_crédito','transferência','cheque','fiado','outro'], required: true },
  amount:   { type: Number, required: true, min: 0.01 },
  status:   { type: String, enum: ['pago','fiado_pendente'], default: 'pago' },
  note:     { type: String },
  dueDate:  { type: Date },       // para fiado: quando espera receber
  paidAt:   { type: Date },       // quando fiado foi recebido
  incomeTransactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
  createdBy:{ type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

salePaymentSchema.index({ company: 1, status: 1 });
salePaymentSchema.index({ company: 1, budget: 1 });

module.exports = mongoose.model('SalePayment', salePaymentSchema);
