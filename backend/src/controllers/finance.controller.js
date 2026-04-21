const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const SalePayment = require('../models/SalePayment');
const { sendSuccess, sendError } = require('../utils/response');

const CATEGORY_GROUPS = {
  'Materiais':        ['Ferro/Aço', 'Alumínio', 'Vidro', 'Tintas e Acabamentos', 'Soldas e Gases', 'Ferragens e Parafusos', 'Outros Materiais'],
  'Funcionários':     ['Salários', 'Horas Extras', 'Benefícios (VT/VR)', 'Encargos (FGTS/INSS)', '13º Salário', 'Férias'],
  'Instalações':      ['Aluguel', 'Condomínio', 'IPTU', 'Manutenção do Espaço'],
  'Utilidades':       ['Energia Elétrica', 'Água/Esgoto', 'Internet/Telefone', 'Gás'],
  'Veículos':         ['Combustível', 'Manutenção Veicular', 'IPVA/Seguro Veicular', 'Pedágio/Estacionamento', 'Aluguel de Veículo'],
  'Equipamentos':     ['Compra de Máquinas', 'Manutenção de Equipamentos', 'Ferramentas', 'EPI/Segurança'],
  'Impostos e Taxas': ['Simples Nacional/DAS', 'ISS', 'Contador/Contabilidade', 'Taxas Bancárias', 'Alvará e Licenças'],
  'Marketing':        ['Propaganda', 'Redes Sociais', 'Material Impresso'],
  'Financeiro':       ['Parcela de Empréstimo', 'Juros Bancários', 'Tarifas'],
  'Outros':           ['Outros'],
};

const CATEGORIES = {
  receita: ['Orçamento', 'Serviço Avulso', 'Venda de Material', 'Outros'],
  despesa: Object.values(CATEGORY_GROUPS).flat(),
};

// ─────────────────────────────────────────────
// GET /api/s/finance/summary?month=YYYY-MM
// ─────────────────────────────────────────────
const getSummary = async (req, res) => {
  try {
    const company = new mongoose.Types.ObjectId(req.user.company);
    const { month, dateFrom, dateTo } = req.query;

    const now = new Date();
    let start, end, year, mon;

    if (dateFrom || dateTo) {
      start = dateFrom ? new Date(dateFrom) : new Date(now.getFullYear(), 0, 1);
      end   = dateTo   ? new Date(dateTo)   : new Date();
      end.setHours(23, 59, 59, 999);
      year = end.getFullYear();
      mon  = end.getMonth() + 1;
    } else {
      year  = month ? parseInt(month.split('-')[0]) : now.getFullYear();
      mon   = month ? parseInt(month.split('-')[1]) : now.getMonth() + 1;
      start = new Date(year, mon - 1, 1);
      end   = new Date(year, mon, 1);
    }

    // Faz todas as queries em paralelo para melhor performance
    const sixMonthsAgo = new Date(year, mon - 7, 1);

    const [agg, monthly, fiadosAgg, despesasAgendadasAgg] = await Promise.all([
      // Agregação por tipo/categoria no mês
      Transaction.aggregate([
        { $match: { company: company, date: { $gte: start, $lt: end } } },
        {
          $group: {
            _id: { type: '$type', category: '$category' },
            total: { $sum: '$amount' },
          },
        },
        { $sort: { total: -1 } },
      ]),

      // Últimos 6 meses para o gráfico de evolução
      Transaction.aggregate([
        { $match: { company: company, date: { $gte: sixMonthsAgo, $lt: end } } },
        {
          $group: {
            _id: { year: { $year: '$date' }, month: { $month: '$date' }, type: '$type' },
            total: { $sum: '$amount' },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),

      // Total de fiados pendentes
      SalePayment.aggregate([
        { $match: { company: company, status: 'fiado_pendente' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),

      // Total de despesas agendadas (não pagas com dueDate definida)
      Transaction.aggregate([
        { $match: { company: company, type: 'despesa', isPaid: false, dueDate: { $exists: true, $ne: null } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    let totalReceitas = 0, totalDespesas = 0;
    const byCategory = { receita: [], despesa: [] };

    agg.forEach(item => {
      const { type, category } = item._id;
      if (type === 'receita') { totalReceitas += item.total; byCategory.receita.push({ category, total: item.total }); }
      if (type === 'despesa') { totalDespesas += item.total; byCategory.despesa.push({ category, total: item.total }); }
    });

    // Faturamento: receitas da categoria 'Orçamento' no mês
    const totalFaturado = byCategory.receita
      .filter(r => r.category === 'Orçamento')
      .reduce((s, r) => s + r.total, 0);

    const totalFiadoPendente = fiadosAgg[0]?.total ?? 0;
    const totalDespesasAgendadas = despesasAgendadasAgg[0]?.total ?? 0;
    const lucroLiquido = totalReceitas - totalDespesas;
    const margemLucro = totalReceitas > 0 ? ((totalReceitas - totalDespesas) / totalReceitas * 100) : 0;

    return sendSuccess(res, {
      totalReceitas,
      totalDespesas,
      saldo: totalReceitas - totalDespesas,
      byCategory,
      monthly,
      period: { year, month: mon },
      totalFaturado,
      totalFiadoPendente,
      totalDespesasAgendadas,
      lucroLiquido,
      margemLucro,
    });
  } catch (error) {
    console.error('Erro ao buscar resumo financeiro:', error);
    return sendError(res, 'Erro ao buscar resumo financeiro', 500);
  }
};

// ─────────────────────────────────────────────
// GET /api/s/finance?month=YYYY-MM&type=&page=
// ─────────────────────────────────────────────
const getTransactions = async (req, res) => {
  try {
    const company = req.user.company;
    const { month, type, page = 1, limit = 20, pending, dateFrom, dateTo } = req.query;

    const filter = { company };
    if (type) filter.type = type;
    if (pending === 'true') filter.isPaid = false;

    if (dateFrom || dateTo) {
      // Filtro por intervalo de datas personalizado (ignora month)
      filter.date = {};
      if (dateFrom) filter.date.$gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    } else if (month) {
      const [y, m] = month.split('-').map(Number);
      filter.date = { $gte: new Date(y, m - 1, 1), $lt: new Date(y, m, 1) };
    }

    const total = await Transaction.countDocuments(filter);
    const transactions = await Transaction.find(filter)
      .populate('budget', 'number')
      .sort({ date: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    return sendSuccess(res, {
      transactions,
      total,
      pages: Math.ceil(total / limit),
      currentPage: Number(page),
      categories: CATEGORIES,
      categoryGroups: CATEGORY_GROUPS,
    });
  } catch (error) {
    return sendError(res, 'Erro ao listar transações', 500);
  }
};

// ─────────────────────────────────────────────
// POST /api/s/finance
// ─────────────────────────────────────────────
const createTransaction = async (req, res) => {
  try {
    const { type, category, description, amount, date, budgetId, dueDate, isPaid, supplier, recorrente, diaVencimento, paymentMethod } = req.body;
    const company = req.user.company;

    // Valida tipo e categoria
    if (!['receita', 'despesa'].includes(type)) {
      return sendError(res, 'Tipo inválido', 400);
    }
    if (!category) return sendError(res, 'Categoria é obrigatória', 400);
    if (!amount || Number(amount) <= 0) {
      return sendError(res, 'Valor deve ser maior que zero', 400);
    }

    const isScheduled = isPaid === false || isPaid === 'false';

    // Se agendada, dueDate é obrigatório; senão, date é obrigatório
    if (isScheduled && !dueDate) {
      return sendError(res, 'Data de vencimento é obrigatória para despesas agendadas', 400);
    }
    if (!isScheduled && !date && !dueDate) {
      return sendError(res, 'Data é obrigatória', 400);
    }

    // Se referencia um orçamento, valida que pertence à mesma empresa
    let budgetRef = null;
    if (budgetId) {
      const budget = await Budget.findOne({ _id: budgetId, company });
      if (!budget) return sendError(res, 'Orçamento não encontrado', 404);
      budgetRef = budgetId;
    }

    const transaction = await Transaction.create({
      company,
      type,
      category,
      description,
      amount: Number(amount),
      date: date ? new Date(date) : (dueDate ? new Date(dueDate) : new Date()),
      budget: budgetRef,
      isPaid: isScheduled ? false : true,
      dueDate: dueDate ? new Date(dueDate) : null,
      paidAt: isScheduled ? null : new Date(),
      createdBy: req.user.id,
      supplier: supplier || null,
      paymentMethod: paymentMethod || null,
      recorrente: recorrente === true || recorrente === 'true',
      diaVencimento: diaVencimento ? Number(diaVencimento) : null,
      recorrenciaId: null,
    });

    return sendSuccess(res, { transaction }, 'Lançamento registrado com sucesso', 201);
  } catch (error) {
    console.error('Erro ao criar transação:', error);
    return sendError(res, 'Erro ao registrar lançamento', 500);
  }
};

// ─────────────────────────────────────────────
// PUT /api/s/finance/:id
// ─────────────────────────────────────────────
const updateTransaction = async (req, res) => {
  try {
    const tx = await Transaction.findOne({ _id: req.params.id, company: req.user.company });
    if (!tx) return sendError(res, 'Lançamento não encontrado', 404);

    const { type, category, description, amount, date, supplier, diaVencimento } = req.body;
    if (type) tx.type = type;
    if (category) tx.category = category;
    if (description) tx.description = description;
    if (amount) tx.amount = Number(amount);
    if (date) tx.date = new Date(date);
    if (supplier !== undefined) tx.supplier = supplier || null;
    if (diaVencimento !== undefined) tx.diaVencimento = diaVencimento ? Number(diaVencimento) : null;

    await tx.save();
    return sendSuccess(res, { transaction: tx }, 'Lançamento atualizado');
  } catch (error) {
    return sendError(res, 'Erro ao atualizar lançamento', 500);
  }
};

// ─────────────────────────────────────────────
// DELETE /api/s/finance/:id
// ─────────────────────────────────────────────
const deleteTransaction = async (req, res) => {
  try {
    const tx = await Transaction.findOne({ _id: req.params.id, company: req.user.company });
    if (!tx) return sendError(res, 'Lançamento não encontrado', 404);
    await tx.deleteOne();
    return sendSuccess(res, {}, 'Lançamento excluído');
  } catch (error) {
    return sendError(res, 'Erro ao excluir lançamento', 500);
  }
};

// ─────────────────────────────────────────────
// GET /api/s/finance/due?period=day|week|month
// ─────────────────────────────────────────────
const getDueExpenses = async (req, res) => {
  try {
    const company = req.user.company;
    const { period = 'month' } = req.query;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(today);
    if (period === 'day') end.setDate(end.getDate() + 1);
    else if (period === 'week') end.setDate(end.getDate() + 7);
    else { end.setMonth(end.getMonth() + 1); }

    // Inclui também as vencidas (dueDate < today)
    const expenses = await Transaction.find({
      company,
      type: 'despesa',
      isPaid: false,
      dueDate: { $lt: end },
    }).sort({ dueDate: 1 });

    const totalDue = expenses.reduce((s, e) => s + e.amount, 0);
    const overdue  = expenses.filter(e => e.dueDate < today).length;

    return sendSuccess(res, { expenses, totalDue, overdue });
  } catch (err) {
    return sendError(res, 'Erro ao buscar despesas a vencer', 500);
  }
};

// ─────────────────────────────────────────────
// POST /api/s/finance/:id/pay — Marcar despesa como paga
// ─────────────────────────────────────────────
const markExpensePaid = async (req, res) => {
  try {
    const tx = await Transaction.findOne({
      _id: req.params.id,
      company: req.user.company,
      isPaid: false,
    });
    if (!tx) return sendError(res, 'Despesa não encontrada', 404);

    tx.isPaid = true;
    tx.paidAt = new Date();
    await tx.save();

    return sendSuccess(res, { transaction: tx }, 'Despesa marcada como paga');
  } catch (err) {
    return sendError(res, 'Erro ao marcar como paga', 500);
  }
};

// ─────────────────────────────────────────────
// POST /api/s/finance/generate-recurring
// Gera automaticamente as despesas recorrentes do mês atual se ainda não existirem
// ─────────────────────────────────────────────
const generateRecurring = async (req, res) => {
  try {
    const company = req.user.company;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12

    const monthStart = new Date(currentYear, currentMonth - 1, 1);
    const monthEnd   = new Date(currentYear, currentMonth, 1);

    // Busca todos os templates recorrentes desta empresa (recorrente: true, sem recorrenciaId = são os templates)
    const templates = await Transaction.find({ company, recorrente: true, recorrenciaId: null });

    let generated = 0;
    for (const tpl of templates) {
      // Verifica se já foi gerada para este mês
      const exists = await Transaction.findOne({
        company,
        recorrenciaId: tpl._id,
        dueDate: { $gte: monthStart, $lt: monthEnd },
      });
      if (exists) continue;

      // Garante que o dia não ultrapasse o último dia do mês
      const lastDay = new Date(currentYear, currentMonth, 0).getDate();
      const day = Math.min(tpl.diaVencimento || 1, lastDay);
      const dueDate = new Date(currentYear, currentMonth - 1, day);

      await Transaction.create({
        company,
        type: tpl.type,
        category: tpl.category,
        description: tpl.description,
        amount: tpl.amount,
        date: dueDate,
        dueDate,
        isPaid: false,
        supplier: tpl.supplier || null,
        recorrente: false,       // cópia mensal não é template
        recorrenciaId: tpl._id, // aponta para o template
        createdBy: tpl.createdBy,
      });
      generated++;
    }

    return sendSuccess(res, { generated }, `${generated} despesa(s) recorrente(s) gerada(s)`);
  } catch (error) {
    console.error('Erro ao gerar recorrentes:', error);
    return sendError(res, 'Erro ao gerar despesas recorrentes', 500);
  }
};

module.exports = { getSummary, getTransactions, createTransaction, updateTransaction, deleteTransaction, getDueExpenses, markExpensePaid, generateRecurring };
