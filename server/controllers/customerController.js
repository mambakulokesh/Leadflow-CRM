const Customer = require('../models/Customer');
const Lead = require('../models/Lead');

// @desc    Get all customers
// @route   GET /api/customers
// @access  Private
exports.getCustomers = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 9;
        const search = req.query.search || '';
        const status = req.query.status; // 'active' | 'inactive'

        let filter = {};

        if (status === 'active') filter.isActive = { $ne: false };
        else if (status === 'inactive') filter.isActive = false;

        if (req.user.role !== 'admin') {
            const myLeadIds = await Lead.find({ assignedTo: req.user._id }).distinct('_id');
            filter.convertedFromLead = { $in: myLeadIds };
        }

        if (search) {
            filter.$or = [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }];
        }

        const total = await Customer.countDocuments(filter);
        const customers = await Customer.find(filter)
            .sort('-createdAt')
            .skip((page - 1) * limit)
            .limit(limit)
            .populate({ path: 'convertedFromLead', select: 'assignedTo', populate: { path: 'assignedTo', select: 'name' } });
        res.status(200).json({ success: true, count: total, totalPages: Math.ceil(total / limit), page, data: customers });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

// @desc    Get single customer
// @route   GET /api/customers/:id
// @access  Private
exports.getCustomer = async (req, res) => {
    try {
        const customer = await Customer.findById(req.params.id);

        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        res.status(200).json({ success: true, data: customer });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

// @desc    Create new customer
// @route   POST /api/customers
// @access  Private
exports.createCustomer = async (req, res) => {
    try {
        const customer = await Customer.create(req.body);
        res.status(201).json({ success: true, data: customer });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

// @desc    Update customer
// @route   PUT /api/customers/:id
// @access  Private
exports.updateCustomer = async (req, res) => {
    try {
        const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        res.status(200).json({ success: true, data: customer });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

// @desc    Delete customer
// @route   DELETE /api/customers/:id
// @access  Private (Admin Role)
exports.deleteCustomer = async (req, res) => {
    try {
        const customer = await Customer.findById(req.params.id);

        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        await customer.deleteOne();

        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};
