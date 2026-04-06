const express = require('express');
const { protect, restrict } = require('../middleware/auth.middleware');
const {
  getStats, getCompanies, createCompany, updateCompany, getPlans, updatePlan,
} = require('../controllers/admin.controller');

const router = express.Router();

// Todas as rotas admin exigem login E papel superadmin
router.use(protect);
router.use(restrict('superadmin'));

router.get('/stats', getStats);
router.get('/companies', getCompanies);
router.post('/companies', createCompany);
router.put('/companies/:id', updateCompany);
router.get('/plans', getPlans);
router.put('/plans/:id', updatePlan);

module.exports = router;
