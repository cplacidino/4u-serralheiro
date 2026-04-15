const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    type: { type: String, enum: ['receita', 'despesa'], required: true },
    category: { type: String, required: true },
    description: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0.01 },
    date: { type: Date, required: true },
    // Orçamento relacionado (opcional — para receitas vindas de orçamentos)
    budget: { type: mongoose.Schema.Types.ObjectId, ref: 'Budget', default: null },
    // Campos para despesas agendadas / a vencer
    dueDate: { type: Date, default: null },     // data de vencimento
    isPaid:  { type: Boolean, default: true },   // false = agendada/a vencer
    paidAt:  { type: Date, default: null },      // quando foi paga
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    // Fornecedor ou funcionário relacionado (texto livre)
    supplier:       { type: String, default: null },
    // Recorrência mensal
    recorrente:     { type: Boolean, default: false },
    diaVencimento:  { type: Number, default: null },   // dia do mês: 1-31
    recorrenciaId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', default: null }, // aponta para o template
  },
  { timestamps: true }
);

transactionSchema.index({ company: 1, date: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
