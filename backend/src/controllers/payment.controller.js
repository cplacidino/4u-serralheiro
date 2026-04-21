const SalePayment = require('../models/SalePayment');
const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');
const Product = require('../models/Product');
const { sendSuccess, sendError } = require('../utils/response');

const PAYMENT_LABELS = {
  dinheiro: 'Dinheiro', pix: 'PIX', 'cartão_débito': 'Cartão Débito',
  'cartão_crédito': 'Cartão Crédito', transferência: 'Transferência',
  cheque: 'Cheque', fiado: 'Fiado', outro: 'Outro',
};

// Recalcula totalPaid e paymentStatus do orçamento
const recalcBudget = async (budgetId) => {
  const payments = await SalePayment.find({ budget: budgetId });
  const totalPaid = payments
    .filter(p => p.status === 'pago')
    .reduce((s, p) => s + p.amount, 0);
  const budget = await Budget.findById(budgetId);
  if (!budget) return;
  budget.totalPaid = totalPaid;
  if (totalPaid <= 0) budget.paymentStatus = 'sem_venda';
  else if (totalPaid < budget.total) budget.paymentStatus = 'parcial';
  else budget.paymentStatus = 'pago';
  await budget.save();
};

// GET /api/s/payments/budget/:budgetId
const getPaymentsByBudget = async (req, res) => {
  try {
    const payments = await SalePayment.find({
      budget: req.params.budgetId,
      company: req.user.company,
    }).populate('createdBy', 'name').sort({ createdAt: 1 });
    return sendSuccess(res, { payments, labels: PAYMENT_LABELS });
  } catch (err) {
    return sendError(res, 'Erro ao buscar pagamentos', 500);
  }
};

// POST /api/s/payments — Adicionar pagamento ao orçamento
const addPayment = async (req, res) => {
  try {
    const company = req.user.company;
    const {
      budgetId, method, amount, note, dueDate,
      chequeNumero, chequeBanco, chequeAgencia, chequeConta, chequeTitular,
      chequeDestino, chequeFornecedor,
    } = req.body;

    const budget = await Budget.findOne({ _id: budgetId, company }).populate('client');
    if (!budget) return sendError(res, 'Orçamento não encontrado', 404);
    if (!['aprovado', 'em_os', 'finalizado'].includes(budget.status))
      return sendError(res, 'Orçamento precisa estar aprovado para registrar pagamento', 400);

    const isFiado  = method === 'fiado';
    const isCheque = method === 'cheque';

    const payment = await SalePayment.create({
      company,
      budget: budgetId,
      client: budget.client._id,
      method,
      amount: Number(amount),
      status: isFiado ? 'fiado_pendente' : isCheque ? 'cheque_pendente' : 'pago',
      note,
      dueDate: (isFiado || isCheque) ? dueDate : null,
      chequeNumero:    isCheque ? chequeNumero    : null,
      chequeBanco:     isCheque ? chequeBanco     : null,
      chequeAgencia:   isCheque ? chequeAgencia   : null,
      chequeConta:     isCheque ? chequeConta     : null,
      chequeTitular:   isCheque ? chequeTitular   : null,
      chequeDestino:   isCheque ? (chequeDestino || 'depositar') : null,
      chequeFornecedor:isCheque && chequeDestino === 'fornecedor' ? chequeFornecedor : null,
      createdBy: req.user.id,
    });

    // Se não for fiado nem cheque pendente, registra como receita imediatamente
    if (!isFiado && !isCheque) {
      const tx = await Transaction.create({
        company,
        type: 'receita',
        category: 'Orçamento',
        description: `ORC-${String(budget.number).padStart(3, '0')} — ${PAYMENT_LABELS[method]}`,
        amount: Number(amount),
        date: new Date(),
        budget: budgetId,
        isPaid: true,
        paidAt: new Date(),
        paymentMethod: method,
        createdBy: req.user.id,
      });
      payment.incomeTransactionId = tx._id;
      await payment.save();
    }

    // Deduz estoque na primeira venda (qualquer forma de pagamento)
    if (!budget.stockDeducted) {
      for (const item of budget.items) {
        if (item.product) {
          await Product.findByIdAndUpdate(item.product, {
            $inc: { stock: -item.quantity },
          });
        }
      }
      budget.stockDeducted = true;
      await budget.save();
    }

    await recalcBudget(budgetId);

    await payment.populate('createdBy', 'name');
    return sendSuccess(res, { payment }, 'Pagamento registrado com sucesso', 201);
  } catch (err) {
    console.error('Erro ao adicionar pagamento:', err);
    return sendError(res, 'Erro ao registrar pagamento', 500);
  }
};

// POST /api/s/payments/:id/receive — Receber fiado
const receiveFiado = async (req, res) => {
  try {
    const payment = await SalePayment.findOne({
      _id: req.params.id,
      company: req.user.company,
      status: 'fiado_pendente',
    });
    if (!payment) return sendError(res, 'Fiado não encontrado', 404);

    const budget = await Budget.findById(payment.budget);

    payment.status = 'pago';
    payment.paidAt = new Date();

    // Registra como receita
    const tx = await Transaction.create({
      company: req.user.company,
      type: 'receita',
      category: 'Orçamento',
      description: `Fiado recebido — ORC-${budget ? String(budget.number).padStart(3, '0') : ''}`,
      amount: payment.amount,
      date: new Date(),
      budget: payment.budget,
      isPaid: true,
      paidAt: new Date(),
      createdBy: req.user.id,
    });

    payment.incomeTransactionId = tx._id;
    await payment.save();
    await recalcBudget(payment.budget);

    return sendSuccess(res, { payment }, 'Fiado recebido com sucesso');
  } catch (err) {
    console.error('Erro ao receber fiado:', err);
    return sendError(res, 'Erro ao receber fiado', 500);
  }
};

// DELETE /api/s/payments/:id
const deletePayment = async (req, res) => {
  try {
    const payment = await SalePayment.findOne({
      _id: req.params.id,
      company: req.user.company,
    });
    if (!payment) return sendError(res, 'Pagamento não encontrado', 404);

    // Se havia receita vinculada, remove também
    if (payment.incomeTransactionId) {
      await Transaction.findByIdAndDelete(payment.incomeTransactionId);
    }

    const budgetId = payment.budget;
    await payment.deleteOne();
    await recalcBudget(budgetId);

    return sendSuccess(res, {}, 'Pagamento removido');
  } catch (err) {
    return sendError(res, 'Erro ao remover pagamento', 500);
  }
};

// GET /api/s/payments/fiados — Listar todos os fiados pendentes
const getFiados = async (req, res) => {
  try {
    const company = req.user.company;

    const fiados = await SalePayment.find({ company, status: 'fiado_pendente' })
      .populate('client', 'name phone')
      .populate('budget', 'number total')
      .populate('createdBy', 'name')
      .sort({ dueDate: 1, createdAt: 1 });

    // Agrupa por cliente
    const byClient = {};
    fiados.forEach(f => {
      const cid = f.client._id.toString();
      if (!byClient[cid]) {
        byClient[cid] = { client: f.client, total: 0, items: [] };
      }
      byClient[cid].total += f.amount;
      byClient[cid].items.push(f);
    });

    return sendSuccess(res, {
      fiados,
      byClient: Object.values(byClient),
      totalPendente: fiados.reduce((s, f) => s + f.amount, 0),
    });
  } catch (err) {
    return sendError(res, 'Erro ao buscar fiados', 500);
  }
};

// GET /api/s/payments/cheques — Listar cheques com filtros: status, destino
const getCheques = async (req, res) => {
  try {
    const company = req.user.company;
    const { status, destino } = req.query;

    const filter = { company, method: 'cheque' };
    if (status) {
      filter.status = status;
    } else {
      filter.status = { $in: ['cheque_pendente', 'cheque_compensado', 'cheque_devolvido'] };
    }
    if (destino) filter.chequeDestino = destino;

    const cheques = await SalePayment.find(filter)
      .populate('client', 'name phone')
      .populate('budget', 'number total')
      .populate('createdBy', 'name')
      .sort({ dueDate: 1, createdAt: -1 });

    // Resumo geral (sempre sem filtro de status/destino para mostrar totais corretos)
    const todos = await SalePayment.find({ company, method: 'cheque' });
    const resumo = {
      totalPendenteDepositar: todos
        .filter(c => c.status === 'cheque_pendente' && c.chequeDestino === 'depositar')
        .reduce((s, c) => s + c.amount, 0),
      totalPendenteFornecedor: todos
        .filter(c => c.status === 'cheque_pendente' && c.chequeDestino === 'fornecedor')
        .reduce((s, c) => s + c.amount, 0),
      totalCompensado: todos
        .filter(c => c.status === 'cheque_compensado')
        .reduce((s, c) => s + c.amount, 0),
      countDevolvido: todos.filter(c => c.status === 'cheque_devolvido').length,
      countAtrasado: todos.filter(c =>
        c.status === 'cheque_pendente' && c.dueDate && new Date(c.dueDate) < new Date()
      ).length,
    };

    return sendSuccess(res, { cheques, resumo });
  } catch (err) {
    return sendError(res, 'Erro ao buscar cheques', 500);
  }
};

// POST /api/s/payments/:id/compensar-cheque — Compensar cheque
const compensarCheque = async (req, res) => {
  try {
    const payment = await SalePayment.findOne({
      _id: req.params.id,
      company: req.user.company,
      status: 'cheque_pendente',
    });
    if (!payment) return sendError(res, 'Cheque não encontrado ou já processado', 404);

    const budget = await Budget.findById(payment.budget);

    payment.status = 'cheque_compensado';
    payment.paidAt = new Date();

    // Registra como receita ao compensar
    const tx = await Transaction.create({
      company: req.user.company,
      type: 'receita',
      category: 'Orçamento',
      description: `Cheque compensado — ORC-${budget ? String(budget.number).padStart(3, '0') : ''} (Nº ${payment.chequeNumero || 'S/N'})`,
      amount: payment.amount,
      date: new Date(),
      budget: payment.budget,
      isPaid: true,
      paidAt: new Date(),
      paymentMethod: 'cheque',
      createdBy: req.user.id,
    });

    payment.incomeTransactionId = tx._id;
    await payment.save();
    await recalcBudget(payment.budget);

    return sendSuccess(res, { payment }, 'Cheque compensado com sucesso');
  } catch (err) {
    console.error('Erro ao compensar cheque:', err);
    return sendError(res, 'Erro ao compensar cheque', 500);
  }
};

// POST /api/s/payments/:id/devolver-cheque — Marcar cheque como devolvido
const devolverCheque = async (req, res) => {
  try {
    const payment = await SalePayment.findOne({
      _id: req.params.id,
      company: req.user.company,
      status: 'cheque_pendente',
    });
    if (!payment) return sendError(res, 'Cheque não encontrado ou já processado', 404);

    payment.status = 'cheque_devolvido';
    payment.note = req.body.motivo ? `Devolvido: ${req.body.motivo}` : payment.note;
    await payment.save();

    return sendSuccess(res, { payment }, 'Cheque marcado como devolvido');
  } catch (err) {
    return sendError(res, 'Erro ao devolver cheque', 500);
  }
};

// GET /api/s/notifications/count — Para o sino de notificações
const getNotificationCount = async (req, res) => {
  try {
    const company = req.user.company;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [overdueExpenses, dueTodayExpenses, overduefiados, overdueCheques] = await Promise.all([
      Transaction.countDocuments({ company, type: 'despesa', isPaid: false, dueDate: { $lt: today } }),
      Transaction.countDocuments({ company, type: 'despesa', isPaid: false, dueDate: { $gte: today, $lt: tomorrow } }),
      SalePayment.countDocuments({ company, status: 'fiado_pendente', dueDate: { $lt: today } }),
      SalePayment.countDocuments({ company, status: 'cheque_pendente', dueDate: { $lt: today } }),
    ]);

    return sendSuccess(res, {
      overdueExpenses,
      dueTodayExpenses,
      overduefiados,
      overdueCheques,
      total: overdueExpenses + dueTodayExpenses + overduefiados + overdueCheques,
    });
  } catch (err) {
    return sendError(res, 'Erro ao buscar notificações', 500);
  }
};

module.exports = { getPaymentsByBudget, addPayment, receiveFiado, deletePayment, getFiados, getCheques, compensarCheque, devolverCheque, getNotificationCount };
