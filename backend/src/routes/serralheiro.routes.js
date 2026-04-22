const express = require('express');
const { protect, restrict, requireCompany } = require('../middleware/auth.middleware');
const { getDashboard } = require('../controllers/dashboard.controller');
const { getClients, getClient, createClient, updateClient, deleteClient } = require('../controllers/client.controller');
const { getProducts, getProduct, createProduct, updateProduct, deleteProduct, deleteProductImage, getCategories, adjustStock } = require('../controllers/product.controller');
const { upload } = require('../config/cloudinary');
const { getBudgets, getBudget, createBudget, updateBudget, deleteBudget, duplicateBudget } = require('../controllers/budget.controller');
const { getUsers, createUser, updateUser, kickUser, getProfile, updateProfile, changePassword } = require('../controllers/user.controller');
const { getSummary, getTransactions, createTransaction, updateTransaction, deleteTransaction, getDueExpenses, markExpensePaid, generateRecurring } = require('../controllers/finance.controller');
const { getPaymentsByBudget, addPayment, receiveFiado, deletePayment, getFiados, getCheques, compensarCheque, devolverCheque, getNotificationCount } = require('../controllers/payment.controller');
const { getMyCompany, updateMyCompany } = require('../controllers/company.controller');
const {
  getEmployees, createEmployee, updateEmployee, deleteEmployee,
  getVales, createVale, signVale, deleteVale, getPayroll,
} = require('../controllers/employee.controller');
const { getOSList, getOS, createOS, updateOS, deleteOS, getOSStats } = require('../controllers/os.controller');
const { getAgendamentos, createAgendamento, updateAgendamento, deleteAgendamento } = require('../controllers/agendamento.controller');

const router = express.Router();

// Todas as rotas exigem login, papel de serralheiro e empresa vinculada
router.use(protect);
router.use(restrict('owner', 'employee'));
router.use(requireCompany);

// Dashboard
router.get('/dashboard', getDashboard);

// Empresa (owner only para editar)
router.get('/company', getMyCompany);
router.put('/company', restrict('owner'), updateMyCompany);

// Perfil do usuário logado
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.put('/profile/password', changePassword);

// Clientes
router.get('/clients', getClients);
router.get('/clients/:id', getClient);
router.post('/clients', createClient);
router.put('/clients/:id', updateClient);
router.delete('/clients/:id', deleteClient);

// Produtos
router.get('/products/categories', getCategories);
router.get('/products', getProducts);
router.get('/products/:id', getProduct);
router.post('/products', upload.single('image'), createProduct);
router.put('/products/:id', upload.single('image'), updateProduct);
router.delete('/products/:id', deleteProduct);
router.delete('/products/:id/image', deleteProductImage);
router.post('/products/:id/stock', adjustStock);

// Orçamentos
router.get('/budgets', getBudgets);
router.get('/budgets/:id', getBudget);
router.post('/budgets', createBudget);
router.put('/budgets/:id', updateBudget);
router.delete('/budgets/:id', deleteBudget);
router.post('/budgets/:id/duplicate', duplicateBudget);

// Financeiro
router.get('/finance/summary', getSummary);
router.get('/finance/due', getDueExpenses);
router.post('/finance/generate-recurring', generateRecurring);
router.get('/finance', getTransactions);
router.post('/finance', createTransaction);
router.put('/finance/:id', updateTransaction);
router.delete('/finance/:id', deleteTransaction);
router.post('/finance/:id/pay', markExpensePaid);

// Pagamentos de orçamento
router.get('/payments/fiados', getFiados);
router.get('/payments/cheques', getCheques);
router.get('/payments/budget/:budgetId', getPaymentsByBudget);
router.post('/payments', addPayment);
router.post('/payments/:id/receive', receiveFiado);
router.post('/payments/:id/compensar-cheque', compensarCheque);
router.post('/payments/:id/devolver-cheque', devolverCheque);
router.delete('/payments/:id', deletePayment);

// Notificações
router.get('/notifications/count', getNotificationCount);

// Funcionários
router.get('/employees', getEmployees);
router.post('/employees', restrict('owner'), createEmployee);
router.put('/employees/:id', restrict('owner'), updateEmployee);
router.delete('/employees/:id', restrict('owner'), deleteEmployee);
router.get('/employees/:id/vales', getVales);
router.post('/employees/:id/vales', restrict('owner'), createVale);
router.get('/employees/:id/payroll', getPayroll);
router.put('/vales/:id/sign', restrict('owner'), signVale);
router.delete('/vales/:id', restrict('owner'), deleteVale);

// Ordens de Serviço
router.get('/os/stats', getOSStats);
router.get('/os', getOSList);
router.get('/os/:id', getOS);
router.post('/os', createOS);
router.put('/os/:id', updateOS);
router.delete('/os/:id', restrict('owner'), deleteOS);

// Agendamentos
router.get('/agendamentos', getAgendamentos);
router.post('/agendamentos', createAgendamento);
router.put('/agendamentos/:id', updateAgendamento);
router.delete('/agendamentos/:id', deleteAgendamento);

// Usuários (somente owner pode gerenciar)
router.get('/users', restrict('owner'), getUsers);
router.post('/users', restrict('owner'), createUser);
router.put('/users/:id', restrict('owner'), updateUser);
router.delete('/users/:id/kick', restrict('owner'), kickUser);

module.exports = router;
