const Lead = require('../models/Lead');
const Customer = require('../models/Customer');
const User = require('../models/User');

// @desc    Get dashboard stats
// @route   GET /api/dashboard/stats
// @access  Private
exports.getDashboardStats = async (req, res) => {
    try {
        const isAdmin = req.user.role === 'admin';
        const userId = req.user.id;

        if (isAdmin) {
            const [totalLeads, totalCustomers, totalUsers, convertedLeads] = await Promise.all([
                Lead.countDocuments(),
                Customer.countDocuments(),
                User.countDocuments(),
                Lead.countDocuments({ status: 'converted' }),
            ]);

            const conversionRate = totalLeads > 0
                ? ((convertedLeads / totalLeads) * 100).toFixed(1)
                : 0;

            // Status breakdown
            const statusBreakdown = await Lead.aggregate([
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ]);

            // Top sales persons by conversions
            const topSalesPersons = await Lead.aggregate([
                { $match: { status: 'converted' } },
                { $group: { _id: '$assignedTo', converted: { $sum: 1 } } },
                { $sort: { converted: -1 } },
                { $limit: 5 },
                { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
                { $unwind: '$user' },
                { $project: { name: '$user.name', email: '$user.email', converted: 1 } }
            ]);

            // Monthly leads for last 6 months
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
            sixMonthsAgo.setDate(1);

            const monthlyLeads = await Lead.aggregate([
                { $match: { createdAt: { $gte: sixMonthsAgo } } },
                { $group: {
                    _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
                    leads: { $sum: 1 },
                    converted: { $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] } }
                }},
                { $sort: { '_id.year': 1, '_id.month': 1 } }
            ]);

            const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            const chartData = monthlyLeads.map(m => ({
                name: months[m._id.month - 1],
                leads: m.leads,
                converted: m.converted,
            }));

            return res.status(200).json({
                success: true,
                role: 'admin',
                data: {
                    totalLeads,
                    totalCustomers,
                    totalUsers,
                    convertedLeads,
                    conversionRate: `${conversionRate}%`,
                    statusBreakdown,
                    topSalesPersons,
                    chartData,
                }
            });
        }

        // Sales person — only their assigned leads
        const [myLeads, myConverted, myInterested, myContacted] = await Promise.all([
            Lead.countDocuments({ assignedTo: userId }),
            Lead.countDocuments({ assignedTo: userId, status: 'converted' }),
            Lead.countDocuments({ assignedTo: userId, status: 'interested' }),
            Lead.countDocuments({ assignedTo: userId, status: 'contacted' }),
        ]);

        const conversionRate = myLeads > 0
            ? ((myConverted / myLeads) * 100).toFixed(1)
            : 0;

        // Monthly breakdown for this sales person
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);

        const monthlyLeads = await Lead.aggregate([
            { $match: { assignedTo: require('mongoose').Types.ObjectId.createFromHexString(userId), createdAt: { $gte: sixMonthsAgo } } },
            { $group: {
                _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
                leads: { $sum: 1 },
                converted: { $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] } }
            }},
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const chartData = monthlyLeads.map(m => ({
            name: months[m._id.month - 1],
            leads: m.leads,
            converted: m.converted,
        }));

        return res.status(200).json({
            success: true,
            role: 'sales-person',
            data: {
                myLeads,
                myConverted,
                myInterested,
                myContacted,
                conversionRate: `${conversionRate}%`,
                chartData,
            }
        });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
