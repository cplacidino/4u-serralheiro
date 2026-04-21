const mongoose = require('mongoose');

const salePaymentSchema = new mongoose.Schema({
  company:  { type: mongoose.Schema.Types.ObjectId, ref: 'Company',     required: true },
  budget:   { type: mongoose.Schema.Types.ObjectId, ref: 'Budget',      required: true },
  client:   { type: mongoose.Schema.Types.ObjectId, ref: 'Client',      required: true },
  method:   { type: String, enum: ['dinheiro','pix','cartão_débito','cartão_crédito','transferência','cheque','fiado','outro'], required: true },
  amount:   { type: Number, required: true, min: 0.01 },
  status:   { type: String, enum: ['pago','fiado_pendente','cheque_pendente','cheque_compensado','cheque_devolvido'], default: 'pago' },
  note:     { type: String },
  dueDate:  { type: Date },       // fiado: vencimento; cheque: data de compensação
  paidAt:   { type: Date },       // quando fiado/cheque foi recebido/compensado
  // Dados específicos de cheque
  chequeNumero:    { type: String },
  chequeBanco:     { type: String },
  chequeAgencia:   { type: String },
  chequeConta:     { type: String },
  chequeTitular:   { type: String },
  // Destino do cheque: 'depositar' = ficará em carteira até depositar | 'fornecedor' = repassado a fornecedor
  chequeDestino:   { type: String, enum: ['depositar', 'fornecedor'], default: 'depositar' },
  chequeFornecedor:{ type: String }, // nome do fornecedor quando repassado
  incomeTransactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
  createdBy:{ type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

salePaymentSchema.index({ company: 1, status: 1 });
salePaymentSchema.index({ company: 1, budget: 1 });

module.exports = mongoose.model('SalePayment', salePaymentSchema);
