const mongoose = require('mongoose');

const agendamentoSchema = new mongoose.Schema({
  company:       { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  title:         { type: String, required: true },
  description:   { type: String, default: '' },
  date:          { type: Date, required: true },
  endDate:       { type: Date },
  type:          {
    type: String,
    enum: ['visita', 'reuniao', 'entrega', 'instalacao', 'outro'],
    default: 'visita',
  },
  status:        {
    type: String,
    enum: ['pendente', 'confirmado', 'concluido', 'cancelado'],
    default: 'pendente',
  },
  relatedOS:     { type: mongoose.Schema.Types.ObjectId, ref: 'OrdemServico', default: null },
  relatedBudget: { type: mongoose.Schema.Types.ObjectId, ref: 'Budget', default: null },
  notes:         { type: String, default: '' },
  createdBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Agendamento', agendamentoSchema);
