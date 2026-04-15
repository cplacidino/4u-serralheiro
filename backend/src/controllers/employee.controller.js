const Employee = require('../models/Employee');
const Vale     = require('../models/Vale');
const Company  = require('../models/Company');
const { sendSuccess, sendError } = require('../utils/response');

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const monthRange = (monthStr) => {
  // monthStr = "YYYY-MM"
  const [y, m] = monthStr.split('-').map(Number);
  const start = new Date(y, m - 1, 1);
  const end   = new Date(y, m, 1);
  return { start, end };
};

// ─────────────────────────────────────────────
// GET /s/employees
// ─────────────────────────────────────────────
const getEmployees = async (req, res) => {
  try {
    const { search, active } = req.query;
    const filter = { company: req.user.company };

    if (search) {
      filter.$or = [
        { name:  { $regex: search, $options: 'i' } },
        { cargo: { $regex: search, $options: 'i' } },
        { cpf:   { $regex: search, $options: 'i' } },
      ];
    }
    if (active === 'false') filter.isActive = false;
    else filter.isActive = true;

    const employees = await Employee.find(filter).sort({ name: 1 });

    // Para cada funcionário, busca total de vales do mês atual
    const now      = new Date();
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const { start, end } = monthRange(monthStr);

    const withVales = await Promise.all(
      employees.map(async (e) => {
        const vales = await Vale.aggregate([
          { $match: { employee: e._id, company: e.company, date: { $gte: start, $lt: end } } },
          { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
        ]);
        return {
          ...e.toObject(),
          currentMonthVales: vales[0]?.total ?? 0,
          currentMonthValesCount: vales[0]?.count ?? 0,
        };
      })
    );

    return sendSuccess(res, { employees: withVales });
  } catch (error) {
    console.error('Erro ao listar funcionários:', error);
    return sendError(res, 'Erro ao listar funcionários', 500);
  }
};

// ─────────────────────────────────────────────
// POST /s/employees
// ─────────────────────────────────────────────
const createEmployee = async (req, res) => {
  try {
    const { name, cpf, phone, cargo, salary, admissionDate, notes } = req.body;
    if (!name?.trim()) return sendError(res, 'Nome é obrigatório', 400);

    const employee = await Employee.create({
      company: req.user.company,
      name: name.trim(),
      cpf: cpf?.trim() || null,
      phone: phone?.trim() || null,
      cargo: cargo?.trim() || '',
      salary: Number(salary) || 0,
      admissionDate: admissionDate || null,
      notes: notes?.trim() || '',
    });

    return sendSuccess(res, { employee }, 'Funcionário cadastrado com sucesso', 201);
  } catch (error) {
    return sendError(res, error.message || 'Erro ao cadastrar funcionário', 400);
  }
};

// ─────────────────────────────────────────────
// PUT /s/employees/:id
// ─────────────────────────────────────────────
const updateEmployee = async (req, res) => {
  try {
    const { name, cpf, phone, cargo, salary, admissionDate, notes, isActive } = req.body;
    const employee = await Employee.findOne({ _id: req.params.id, company: req.user.company });
    if (!employee) return sendError(res, 'Funcionário não encontrado', 404);

    if (name)                       employee.name = name.trim();
    if (cpf !== undefined)          employee.cpf  = cpf?.trim() || null;
    if (phone !== undefined)        employee.phone = phone?.trim() || null;
    if (cargo !== undefined)        employee.cargo = cargo?.trim() || '';
    if (salary !== undefined)       employee.salary = Number(salary) || 0;
    if (admissionDate !== undefined) employee.admissionDate = admissionDate || null;
    if (notes !== undefined)        employee.notes = notes?.trim() || '';
    if (typeof isActive === 'boolean') employee.isActive = isActive;

    await employee.save();
    return sendSuccess(res, { employee }, 'Funcionário atualizado com sucesso');
  } catch (error) {
    return sendError(res, error.message || 'Erro ao atualizar funcionário', 400);
  }
};

// ─────────────────────────────────────────────
// DELETE /s/employees/:id  (desativa)
// ─────────────────────────────────────────────
const deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findOne({ _id: req.params.id, company: req.user.company });
    if (!employee) return sendError(res, 'Funcionário não encontrado', 404);
    employee.isActive = false;
    await employee.save();
    return sendSuccess(res, {}, 'Funcionário desativado com sucesso');
  } catch {
    return sendError(res, 'Erro ao desativar funcionário', 500);
  }
};

// ─────────────────────────────────────────────
// GET /s/employees/:id/vales?month=YYYY-MM
// ─────────────────────────────────────────────
const getVales = async (req, res) => {
  try {
    const employee = await Employee.findOne({ _id: req.params.id, company: req.user.company });
    if (!employee) return sendError(res, 'Funcionário não encontrado', 404);

    const now      = new Date();
    const monthStr = req.query.month
      || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const { start, end } = monthRange(monthStr);

    const vales = await Vale.find({
      employee: employee._id,
      company:  req.user.company,
      date: { $gte: start, $lt: end },
    }).sort({ date: -1 });

    const totalVales = vales.reduce((s, v) => s + v.amount, 0);

    return sendSuccess(res, { vales, totalVales, employee });
  } catch (error) {
    return sendError(res, 'Erro ao listar vales', 500);
  }
};

// ─────────────────────────────────────────────
// POST /s/employees/:id/vales
// ─────────────────────────────────────────────
const createVale = async (req, res) => {
  try {
    const employee = await Employee.findOne({ _id: req.params.id, company: req.user.company });
    if (!employee) return sendError(res, 'Funcionário não encontrado', 404);

    const { amount, reason, date, notes } = req.body;
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return sendError(res, 'Valor inválido', 400);
    }

    const vale = await Vale.create({
      company:   req.user.company,
      employee:  employee._id,
      amount:    Number(amount),
      reason:    reason?.trim() || '',
      date:      date ? new Date(date) : new Date(),
      notes:     notes?.trim() || '',
      createdBy: req.user.id,
    });

    return sendSuccess(res, { vale, employee }, 'Vale emitido com sucesso', 201);
  } catch (error) {
    return sendError(res, error.message || 'Erro ao emitir vale', 400);
  }
};

// ─────────────────────────────────────────────
// PUT /s/vales/:id/sign  — marca como assinado
// ─────────────────────────────────────────────
const signVale = async (req, res) => {
  try {
    const vale = await Vale.findOne({ _id: req.params.id, company: req.user.company });
    if (!vale) return sendError(res, 'Vale não encontrado', 404);

    vale.signed   = true;
    vale.signedAt = new Date();
    await vale.save();

    return sendSuccess(res, { vale }, 'Vale marcado como assinado');
  } catch {
    return sendError(res, 'Erro ao assinar vale', 500);
  }
};

// ─────────────────────────────────────────────
// DELETE /s/vales/:id
// ─────────────────────────────────────────────
const deleteVale = async (req, res) => {
  try {
    const vale = await Vale.findOne({ _id: req.params.id, company: req.user.company });
    if (!vale) return sendError(res, 'Vale não encontrado', 404);
    await vale.deleteOne();
    return sendSuccess(res, {}, 'Vale excluído com sucesso');
  } catch {
    return sendError(res, 'Erro ao excluir vale', 500);
  }
};

// ─────────────────────────────────────────────
// GET /s/employees/:id/payroll?month=YYYY-MM
// Resumo de pagamento: salário - vales = líquido
// ─────────────────────────────────────────────
const getPayroll = async (req, res) => {
  try {
    const employee = await Employee.findOne({ _id: req.params.id, company: req.user.company });
    if (!employee) return sendError(res, 'Funcionário não encontrado', 404);

    const now      = new Date();
    const monthStr = req.query.month
      || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const { start, end } = monthRange(monthStr);

    const [vales, company] = await Promise.all([
      Vale.find({
        employee: employee._id,
        company:  req.user.company,
        date: { $gte: start, $lt: end },
      }).sort({ date: 1 }),
      Company.findById(req.user.company),
    ]);

    const totalVales = vales.reduce((s, v) => s + v.amount, 0);
    const netPay     = Math.max(0, employee.salary - totalVales);

    return sendSuccess(res, {
      employee,
      company,
      monthStr,
      vales,
      salary:     employee.salary,
      totalVales,
      netPay,
    });
  } catch (error) {
    return sendError(res, 'Erro ao gerar resumo de pagamento', 500);
  }
};

module.exports = {
  getEmployees, createEmployee, updateEmployee, deleteEmployee,
  getVales, createVale, signVale, deleteVale,
  getPayroll,
};
