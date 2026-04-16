const express = require('express');
const { protect, restrict } = require('../middleware/auth.middleware');
const {
  getStats,
  getCompanies, createCompany, updateCompany,
  getCompanyUsers, createCompanyUser, resetUserPassword, toggleUserStatus,
  getPlans, createPlan, updatePlan, deletePlan,
  getAlerts,
} = require('../controllers/admin.controller');

const router = express.Router();

router.use(protect);
router.use(restrict('superadmin'));

router.get('/stats', getStats);
router.get('/alerts', getAlerts);

router.get('/companies', getCompanies);
router.post('/companies', createCompany);
router.put('/companies/:id', updateCompany);

router.get('/companies/:id/users', getCompanyUsers);
router.post('/companies/:id/users', createCompanyUser);
router.put('/companies/:id/users/:userId/reset-password', resetUserPassword);
router.put('/companies/:id/users/:userId/status', toggleUserStatus);

router.get('/plans', getPlans);
router.post('/plans', createPlan);
router.put('/plans/:id', updatePlan);
router.delete('/plans/:id', deletePlan);

module.exports = router;
