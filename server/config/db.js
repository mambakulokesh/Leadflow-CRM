const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            tls: true,
            tlsAllowInvalidCertificates: true,
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        await seedRoles();
    } catch (error) {
        console.error(`Error connecting to MongoDB: ${error.message}`);
        process.exit(1);
    }
};

const seedRoles = async () => {
    const Role = require('../models/Role');
    const defaults = [
        { key: 'admin', label: 'Admin' },
        { key: 'sales-person', label: 'Sales Person' },
        { key: 'user', label: 'User' },
        { key: 'customer', label: 'Customer' },
    ];
    for (const role of defaults) {
        await Role.updateOne({ key: role.key }, role, { upsert: true });
    }
};

module.exports = connectDB;
