const mongoose = require('mongoose');

const budgetItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  description: { type: String, required: true },
  unit: { type: String, default: 'un' },
  quantity: { type: Number, required: true, min: 0.01 },
  unitPrice: { type: Number, required: true, min: 0 },
  total: { type: Number, required: true },
}, { _id: true });

const budgetSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    // Número sequencial por empresa (ex: ORC-001)
    number: { type: Number, required: true },
    status: {
      type: String,
      enum: ['rascunho', 'enviado', 'aprovado', 'em_os', 'finalizado', 'rejeitado', 'cancelado'],
      default: 'rascunho',
    },
    items: [budgetItemSchema],
    subtotal: { type: Number, default: 0 },
    // Desconto em reais
    discount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    notes: { type: String },
    // Data de validade do orçamento
    validUntil: { type: Date },
    // Rastreamento de pagamentos
    paymentStatus: { type: String, enum: ['sem_venda', 'parcial', 'pago'], default: 'sem_venda' },
    totalPaid: { type: Number, default: 0 },
    stockDeducted: { type: Boolean, default: false }, // para não deduzir estoque duas vezes
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Índice único: número do orçamento por empresa
budgetSchema.index({ company: 1, number: 1 }, { unique: true });

module.exports = mongoose.model('Budget', budgetSchema);
