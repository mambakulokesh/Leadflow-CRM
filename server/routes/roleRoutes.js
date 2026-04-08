const express = require('express');
const { getRoles, createRole, updateRole, deleteRole } = require('../controllers/roleController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect, authorize('admin'));

router.route('/').get(getRoles).post(createRole);
router.route('/:id').put(updateRole).delete(deleteRole);

module.exports = router;
