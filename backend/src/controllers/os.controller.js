const OrdemServico = require('../models/OrdemServico');
const Budget       = require('../models/Budget');
const Client       = require('../models/Client');
const Employee     = require('../models/Employee');
const { sendSuccess, sendError } = require('../utils/response');

// ─────────────────────────────────────────────
// GET /api/s/os — Listar ordens de serviço
// ─────────────────────────────────────────────
const getOSList = async (req, res) => {
  try {
    const { search, status, page = 1, limit = 15 } = req.query;
    const company = req.user.company;

    const filter = { company };
    if (status) filter.status = status;

    if (search) {
      const num = parseInt(search.replace(/\D/g, ''), 10);
      const clients = await Client.find({ company, name: { $regex: search, $options: 'i' } }).select('_id');
      filter.$or = [
        { client: { $in: clients.map(c => c._id) } },
        { title: { $regex: search, $options: 'i' } },
        ...(num ? [{ number: num }] : []),
      ];
    }

    const total = await OrdemServico.countDocuments(filter);
    const list  = await OrdemServico.find(filter)
      .populate('client',     'name phone')
      .populate('budget',     'number total')
      .populate('assignedTo', 'name')
      .populate('createdBy',  'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    return sendSuccess(res, { os: list, total, pages: Math.ceil(total / limit), currentPage: Number(page) });
  } catch (err) {
    console.error('Erro ao listar OS:', err);
    return sendError(res, 'Erro ao listar ordens de serviço', 500);
  }
};

// ─────────────────────────────────────────────
// GET /api/s/os/:id
// ─────────────────────────────────────────────
const getOS = async (req, res) => {
  try {
    const os = await OrdemServico.findOne({ _id: req.params.id, company: req.user.company })
      .populate('client',     'name phone email address cpfCnpj')
      .populate('budget',     'number total items subtotal discount notes validUntil')
      .populate('company',    'name cnpj phone address')
      .populate('assignedTo', 'name cargo phone')
      .populate('createdBy',  'name');

    if (!os) return sendError(res, 'Ordem de serviço não encontrada', 404);
    return sendSuccess(res, { os });
  } catch {
    return sendError(res, 'Erro ao buscar OS', 500);
  }
};

// ─────────────────────────────────────────────
// POST /api/s/os — Criar OS a partir de orçamento
// ─────────────────────────────────────────────
const createOS = async (req, res) => {
  try {
    const company = req.user.company;
    const { budgetId, title, description, assignedToId, assignedUserName, dueDate, notes } = req.body;

    const budget = await Budget.findOne({ _id: budgetId, company }).populate('client', 'name');
    if (!budget) return sendError(res, 'Orçamento não encontrado', 404);
    if (!['aprovado'].includes(budget.status)) return sendError(res, 'Só é possível criar OS para orçamentos aprovados', 400);

    // Bloqueia criação de OS duplicada
    const osExistente = await OrdemServico.findOne({ budget: budgetId, company, status: { $nin: ['cancelado'] } });
    if (osExistente) return sendError(res, `Já existe uma OS (OS-${String(osExistente.number).padStart(3,'0')}) para este orçamento`, 400);

    // Valida funcionário (se informado e não for referência de usuário)
    let empId = null;
    let responsavelNome = assignedUserName || '';
    if (assignedToId) {
      const emp = await Employee.findOne({ _id: assignedToId, company, isActive: true });
      if (!emp) return sendError(res, 'Funcionário não encontrado', 404);
      empId = assignedToId;
      responsavelNome = emp.name;
    }

    const last   = await OrdemServico.findOne({ company }).sort({ number: -1 }).select('number');
    const number = (last?.number ?? 0) + 1;

    const os = await OrdemServico.create({
      company,
      budget: budgetId,
      client: budget.client._id,
      number,
      title:            title || `OS referente ao ORC-${String(budget.number).padStart(3, '0')}`,
      description,
      assignedTo:       empId,
      assignedUserName: responsavelNome,
      dueDate:          dueDate || null,
      notes,
      createdBy:        req.user.id,
    });

    // Marca orçamento como "em OS"
    await Budget.findByIdAndUpdate(budgetId, { status: 'em_os' });

    await os.populate([
      { path: 'client',     select: 'name phone' },
      { path: 'budget',     select: 'number total' },
      { path: 'assignedTo', select: 'name cargo' },
    ]);

    return sendSuccess(res, { os }, 'Ordem de serviço criada com sucesso', 201);
  } catch (err) {
    console.error('Erro ao criar OS:', err);
    return sendError(res, 'Erro ao criar OS', 500);
  }
};

// ─────────────────────────────────────────────
// PUT /api/s/os/:id
// ─────────────────────────────────────────────
const updateOS = async (req, res) => {
  try {
    const os = await OrdemServico.findOne({ _id: req.params.id, company: req.user.company });
    if (!os) return sendError(res, 'OS não encontrada', 404);

    const { status, title, description, assignedToId, assignedUserName, dueDate, notes } = req.body;

    if (title       !== undefined) os.title       = title;
    if (description !== undefined) os.description = description;
    if (notes       !== undefined) os.notes       = notes;
    if (dueDate     !== undefined) os.dueDate     = dueDate || null;

    if (assignedToId !== undefined || assignedUserName !== undefined) {
      if (assignedToId) {
        const emp = await Employee.findOne({ _id: assignedToId, company: req.user.company, isActive: true });
        if (!emp) return sendError(res, 'Funcionário não encontrado', 404);
        os.assignedTo       = assignedToId;
        os.assignedUserName = emp.name;
      } else {
        os.assignedTo       = null;
        os.assignedUserName = assignedUserName || '';
      }
    }

    if (status) {
      os.status = status;
      if (status === 'concluido' && !os.completedAt) {
        os.completedAt = new Date();
        // Marca orçamento como finalizado
        if (os.budget) await Budget.findByIdAndUpdate(os.budget, { status: 'finalizado' });
      }
    }

    await os.save();
    await os.populate([
      { path: 'client',     select: 'name phone' },
      { path: 'budget',     select: 'number total' },
      { path: 'assignedTo', select: 'name cargo' },
    ]);

    return sendSuccess(res, { os }, 'OS atualizada com sucesso');
  } catch (err) {
    console.error('Erro ao atualizar OS:', err);
    return sendError(res, 'Erro ao atualizar OS', 500);
  }
};

// ─────────────────────────────────────────────
// DELETE /api/s/os/:id
// ─────────────────────────────────────────────
const deleteOS = async (req, res) => {
  try {
    const os = await OrdemServico.findOne({ _id: req.params.id, company: req.user.company });
    if (!os) return sendError(res, 'OS não encontrada', 404);

    if (os.status !== 'pendente') {
      return sendError(res, 'Só é possível excluir OS pendentes', 400);
    }

    await os.deleteOne();
    return sendSuccess(res, {}, 'OS excluída com sucesso');
  } catch {
    return sendError(res, 'Erro ao excluir OS', 500);
  }
};

// ─────────────────────────────────────────────
// GET /api/s/os/stats — Contadores p/ dashboard
// ─────────────────────────────────────────────
const getOSStats = async (req, res) => {
  try {
    const company = req.user.company;
    const [total, pendente, em_execucao, concluido] = await Promise.all([
      OrdemServico.countDocuments({ company }),
      OrdemServico.countDocuments({ company, status: 'pendente' }),
      OrdemServico.countDocuments({ company, status: 'em_execucao' }),
      OrdemServico.countDocuments({ company, status: 'concluido' }),
    ]);
    return sendSuccess(res, { total, pendente, em_execucao, concluido });
  } catch {
    return sendError(res, 'Erro ao buscar estatísticas de OS', 500);
  }
};

module.exports = { getOSList, getOS, createOS, updateOS, deleteOS, getOSStats };
