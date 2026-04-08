const express = require('express');
const {
    getLeads,
    getLead,
    createLead,
    updateLead,
    deleteLead,
    convertLead,
    importLeads,
    bulkDeleteLeads,
    getLeadCounts,
    assignLead,
    bulkAssignLeads
} = require('../controllers/leadController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.route('/').get(getLeads).post(createLead).delete(authorize('admin'), bulkDeleteLeads);
router.route('/counts').get(getLeadCounts);
router.route('/import').post(authorize('admin'), importLeads);
router.route('/assign-bulk').put(authorize('admin'), bulkAssignLeads);
router.route('/:id/assign').put(authorize('admin'), assignLead);
router.route('/:id/convert').post(convertLead);
router.route('/:id').get(getLead).put(updateLead).delete(authorize('admin'), deleteLead);

module.exports = router;
