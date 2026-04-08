const Role = require('../models/Role');
const User = require('../models/User');

// @desc    Get all roles
// @route   GET /api/roles
// @access  Admin
exports.getRoles = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const total = await Role.countDocuments();
        const roles = await Role.find()
            .sort({ createdAt: 1 })
            .skip((page - 1) * limit)
            .limit(limit);
        res.status(200).json({ success: true, count: total, totalPages: Math.ceil(total / limit), page, data: roles });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Create role
// @route   POST /api/roles
// @access  Admin
exports.createRole = async (req, res) => {
    try {
        const role = await Role.create(req.body);
        res.status(201).json({ success: true, data: role });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

// @desc    Update role
// @route   PUT /api/roles/:id
// @access  Admin
exports.updateRole = async (req, res) => {
    try {
        const role = await Role.findByIdAndUpdate(req.params.id, { label: req.body.label }, {
            new: true,
            runValidators: true,
        });
        if (!role) return res.status(404).json({ message: 'Role not found' });
        res.status(200).json({ success: true, data: role });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

// @desc    Delete role
// @route   DELETE /api/roles/:id
// @access  Admin
exports.deleteRole = async (req, res) => {
    try {
        const role = await Role.findById(req.params.id);
        if (!role) return res.status(404).json({ message: 'Role not found' });

        const usersWithRole = await User.countDocuments({ role: role.key });
        if (usersWithRole > 0)
            return res.status(400).json({ message: `Cannot delete. ${usersWithRole} user(s) are assigned this role.` });

        await role.deleteOne();
        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
