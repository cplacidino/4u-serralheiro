const Agendamento = require('../models/Agendamento');
const OrdemServico = require('../models/OrdemServico');
const Budget = require('../models/Budget');
const { sendSuccess, sendError } = require('../utils/response');

// ─────────────────────────────────────────────
// GET /api/s/agendamentos?from=YYYY-MM-DD&to=YYYY-MM-DD
// Retorna agendamentos manuais + eventos sincronizados de OS e Orçamentos
// ─────────────────────────────────────────────
const getAgendamentos = async (req, res) => {
  try {
    const company = req.user.company;
    const { from, to } = req.query;

    const start = from ? new Date(from) : new Date();
    const end   = to   ? new Date(to)   : new Date();
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    // Agendamentos manuais no período
    const [manual, osWithDue, budgets] = await Promise.all([
      Agendamento.find({
        company,
        date: { $gte: start, $lte: end },
      })
        .populate('relatedOS', 'number title status')
        .populate('relatedBudget', 'number client')
        .populate('createdBy', 'name')
        .sort({ date: 1 }),

      // OS com prazo no período (sincronização automática)
      OrdemServico.find({
        company,
        dueDate: { $gte: start, $lte: end },
        status: { $nin: ['concluido', 'cancelado'] },
      })
        .populate('client', 'name')
        .populate('budget', 'number')
        .select('number title dueDate status client budget')
        .sort({ dueDate: 1 }),

      // Orçamentos pendentes/em_andamento com datas no período
      Budget.find({
        company,
        status: { $in: ['pendente', 'em_andamento', 'aprovado'] },
        updatedAt: { $gte: start, $lte: end },
      })
        .populate('client', 'name')
        .select('number total status client updatedAt')
        .sort({ updatedAt: 1 }),
    ]);

    // Converte OS em eventos virtuais
    const osEvents = osWithDue.map(os => ({
      _id: `os-${os._id}`,
      title: `OS-${String(os.number).padStart(3,'0')}: ${os.title}`,
      date: os.dueDate,
      type: 'entrega_os',
      status: os.status,
      isVirtual: true,
      relatedOS: { _id: os._id, number: os.number, title: os.title, status: os.status },
      client: os.client,
    }));

    return sendSuccess(res, { agendamentos: manual, osEvents });
  } catch (error) {
    console.error('Erro ao buscar agendamentos:', error);
    return sendError(res, 'Erro ao buscar agendamentos', 500);
  }
};

// ─────────────────────────────────────────────
// POST /api/s/agendamentos
// ─────────────────────────────────────────────
const createAgendamento = async (req, res) => {
  try {
    const { title, description, date, endDate, type, status, relatedOS, relatedBudget, notes } = req.body;
    const company = req.user.company;

    if (!title?.trim()) return sendError(res, 'Título é obrigatório', 400);
    if (!date)          return sendError(res, 'Data é obrigatória', 400);

    const ag = await Agendamento.create({
      company,
      title: title.trim(),
      description: description || '',
      date: new Date(date),
      endDate: endDate ? new Date(endDate) : null,
      type: type || 'visita',
      status: status || 'pendente',
      relatedOS: relatedOS || null,
      relatedBudget: relatedBudget || null,
      notes: notes || '',
      createdBy: req.user.id,
    });

    return sendSuccess(res, { agendamento: ag }, 'Agendamento criado', 201);
  } catch (error) {
    return sendError(res, 'Erro ao criar agendamento', 500);
  }
};

// ─────────────────────────────────────────────
// PUT /api/s/agendamentos/:id
// ─────────────────────────────────────────────
const updateAgendamento = async (req, res) => {
  try {
    const ag = await Agendamento.findOne({ _id: req.params.id, company: req.user.company });
    if (!ag) return sendError(res, 'Agendamento não encontrado', 404);

    const { title, description, date, endDate, type, status, notes } = req.body;
    if (title)       ag.title       = title.trim();
    if (description !== undefined) ag.description = description;
    if (date)        ag.date        = new Date(date);
    if (endDate !== undefined) ag.endDate = endDate ? new Date(endDate) : null;
    if (type)        ag.type        = type;
    if (status)      ag.status      = status;
    if (notes !== undefined) ag.notes = notes;

    await ag.save();
    return sendSuccess(res, { agendamento: ag }, 'Agendamento atualizado');
  } catch (error) {
    return sendError(res, 'Erro ao atualizar agendamento', 500);
  }
};

// ─────────────────────────────────────────────
// DELETE /api/s/agendamentos/:id
// ─────────────────────────────────────────────
const deleteAgendamento = async (req, res) => {
  try {
    const ag = await Agendamento.findOne({ _id: req.params.id, company: req.user.company });
    if (!ag) return sendError(res, 'Agendamento não encontrado', 404);
    await ag.deleteOne();
    return sendSuccess(res, {}, 'Agendamento excluído');
  } catch (error) {
    return sendError(res, 'Erro ao excluir agendamento', 500);
  }
};

module.exports = { getAgendamentos, createAgendamento, updateAgendamento, deleteAgendamento };
