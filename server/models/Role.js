const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
    key: {
        type: String,
        required: [true, 'Please add a role key'],
        unique: true,
        lowercase: true,
        trim: true,
    },
    label: {
        type: String,
        required: [true, 'Please add a role label'],
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('Role', roleSchema);
