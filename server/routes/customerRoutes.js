const express = require('express');
const {
    getCustomers,
    getCustomer,
    createCustomer,
    updateCustomer,
    deleteCustomer
} = require('../controllers/customerController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes protected
router.use(protect);

router
    .route('/')
    .get(getCustomers)
    .post(authorize('admin'), createCustomer); // Only Admins can add customers

router
    .route('/:id')
    .get(getCustomer)
    .put(authorize('admin'), updateCustomer) // Only Admins can update customers
    .delete(authorize('admin'), deleteCustomer); // Only Admins can delete customers

module.exports = router;
