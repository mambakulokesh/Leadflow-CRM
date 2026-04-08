const User = require('../models/User');

// @desc    Get users by role
// @route   GET /api/users?role=admin
// @access  Admin
exports.getUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const filter = req.query.role ? { role: req.query.role } : {};
        const total = await User.countDocuments(filter);
        const users = await User.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);
        res.status(200).json({ success: true, count: total, totalPages: Math.ceil(total / limit), page, data: users });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Create user
// @route   POST /api/users
// @access  Admin
exports.createUser = async (req, res) => {
    try {
        const user = await User.create(req.body);
        res.status(201).json({ success: true, data: user });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Admin
exports.updateUser = async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.status(200).json({ success: true, data: user });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Admin
exports.deleteUser = async (req, res) => {
    try {
        if (req.params.id === req.user.id)
            return res.status(400).json({ message: 'Cannot delete your own account' });
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
