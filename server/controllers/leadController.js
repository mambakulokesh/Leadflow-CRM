const Lead = require('../models/Lead');

// @desc    Get all leads
// @route   GET /api/leads
// @access  Private
exports.getLeads = async (req, res) => {
    try {
        let query;

        // Copy req.query
        const reqQuery = { ...req.query };

        // Fields to exclude
        const removeFields = ['select', 'sort', 'page', 'limit', 'search'];

        // Loop over removeFields and delete them from reqQuery
        removeFields.forEach(param => delete reqQuery[param]);

        // Create query string
        let queryStr = JSON.stringify(reqQuery);

        // Finding resource
        query = Lead.find(JSON.parse(queryStr));

        // Filter by assignedTo for non-admin users
        if (req.user.role !== 'admin') {
            query = query.find({ assignedTo: req.user.id });
        }

        // Exclude not_interested from default listing unless explicitly filtered
        if (!req.query.status) {
            query = query.find({ status: { $ne: 'not_interested' } });
        }

        // Search by name or email if 'search' param exists
        if (req.query.search) {
            const search = req.query.search;
            query = query.find({
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } }
                ]
            });
        }

        // Select Fields
        if (req.query.select) {
            const fields = req.query.select.split(',').join(' ');
            query = query.select(fields);
        }

        // Sort
        if (req.query.sort) {
            const sortBy = req.query.sort.split(',').join(' ');
            query = query.sort(sortBy);
        } else {
            query = query.sort('-createdAt');
        }

        // Pagination
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;

        // Build count filter matching all applied filters
        const countFilter = { ...JSON.parse(queryStr) };
        if (req.user.role !== 'admin') countFilter.assignedTo = req.user.id;
        if (!req.query.status) countFilter.status = { $ne: 'not_interested' };
        if (req.query.search) {
            const s = req.query.search;
            countFilter.$or = [{ name: { $regex: s, $options: 'i' } }, { email: { $regex: s, $options: 'i' } }];
        }
        const total = await Lead.countDocuments(countFilter);

        query = query.skip(startIndex).limit(limit);

        // Executing query
        const leads = await query.populate({
            path: 'assignedTo',
            select: 'name email'
        });

        // Pagination result
        const pagination = {};

        if (endIndex < total) {
            pagination.next = {
                page: page + 1,
                limit
            };
        }

        if (startIndex > 0) {
            pagination.prev = {
                page: page - 1,
                limit
            };
        }

        res.status(200).json({
            success: true,
            count: total,
            totalPages: Math.ceil(total / limit),
            page,
            data: leads
        });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

// @desc    Get single lead
// @route   GET /api/leads/:id
// @access  Private
exports.getLead = async (req, res) => {
    try {
        const lead = await Lead.findById(req.params.id).populate('assignedTo', 'name email');

        if (!lead) {
            return res.status(404).json({ message: 'Lead not found' });
        }

        res.status(200).json({ success: true, data: lead });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

// @desc    Create new lead
// @route   POST /api/leads
// @access  Private
exports.createLead = async (req, res) => {
    try {
        // Add user to req.body
        req.body.assignedTo = req.user.id;

        const lead = await Lead.create(req.body);

        res.status(201).json({ success: true, data: lead });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

// @desc    Update lead
// @route   PUT /api/leads/:id
// @access  Private
exports.updateLead = async (req, res) => {
    try {
        let lead = await Lead.findById(req.params.id);

        if (!lead) {
            return res.status(404).json({ message: 'Lead not found' });
        }

        lead = await Lead.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        res.status(200).json({ success: true, data: lead });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

// @desc    Bulk import leads
// @route   POST /api/leads/import
// @access  Private
exports.importLeads = async (req, res) => {
    try {
        const leads = req.body.leads;
        if (!Array.isArray(leads) || leads.length === 0)
            return res.status(400).json({ message: 'No leads data provided' });

        const toInsert = leads.map(l => ({ ...l, assignedTo: req.user.id }));
        let inserted = [];
        try {
            const result = await Lead.insertMany(toInsert, { ordered: false });
            inserted = result;
        } catch (bulkErr) {
            // ordered:false — some docs may have inserted despite errors (e.g. duplicates)
            inserted = bulkErr.insertedDocs || [];
            if (inserted.length === 0)
                return res.status(400).json({ message: bulkErr.message || 'Import failed. Check for duplicate emails or invalid data.' });
        }
        res.status(201).json({ success: true, count: inserted.length, data: inserted });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

// @desc    Convert lead to customer
// @route   POST /api/leads/:id/convert
// @access  Private
exports.convertLead = async (req, res) => {
    try {
        const lead = await Lead.findById(req.params.id);
        if (!lead) return res.status(404).json({ message: 'Lead not found' });
        if (lead.status === 'converted') return res.status(400).json({ message: 'Lead already converted' });

        const Customer = require('../models/Customer');
        const customer = await Customer.create({
            ...req.body,
            convertedFromLead: lead._id,
        });

        await Lead.findByIdAndUpdate(req.params.id, { status: 'converted' });

        res.status(201).json({ success: true, data: customer });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};
// @desc    Get lead counts grouped by status
// @route   GET /api/leads/counts
// @access  Private
exports.getLeadCounts = async (req, res) => {
    try {
        const search = req.query.search || '';
        const matchFilter = {};
        if (req.user.role !== 'admin') matchFilter.assignedTo = req.user._id;
        if (search) matchFilter.$or = [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
        ];
        const groups = await require('../models/Lead').aggregate([
            { $match: matchFilter },
            { $group: { _id: '$status', count: { $sum: 1 } } },
        ]);
        const counts = { all: 0, new: 0, contacted: 0, interested: 0, not_interested: 0, converted: 0 };
        groups.forEach(g => { if (g._id in counts) counts[g._id] = g.count; });
        counts.all = Object.entries(counts).filter(([k]) => k !== 'all' && k !== 'not_interested').reduce((s, [, v]) => s + v, 0);
        res.status(200).json({ success: true, data: counts });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

// @desc    Assign lead to a sales person
// @route   PUT /api/leads/:id/assign
// @access  Private (Admin only)
exports.assignLead = async (req, res) => {
    try {
        const { assignedTo } = req.body;
        if (!assignedTo) return res.status(400).json({ message: 'assignedTo is required' });
        const lead = await Lead.findByIdAndUpdate(
            req.params.id,
            { assignedTo },
            { new: true, runValidators: true }
        ).populate('assignedTo', 'name email');
        if (!lead) return res.status(404).json({ message: 'Lead not found' });
        res.status(200).json({ success: true, data: lead });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

// @desc    Bulk assign leads to a sales person
// @route   PUT /api/leads/assign-bulk
// @access  Private (Admin only)
exports.bulkAssignLeads = async (req, res) => {
    try {
        const { ids, assignedTo } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ message: 'No lead IDs provided' });
        if (!assignedTo) return res.status(400).json({ message: 'assignedTo is required' });
        await Lead.updateMany({ _id: { $in: ids } }, { assignedTo });
        res.status(200).json({ success: true, count: ids.length });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

// @desc    Bulk delete leads
// @route   DELETE /api/leads
// @access  Private (Admin)
exports.bulkDeleteLeads = async (req, res) => {
    try {
        const { ids } = req.body;
        if (!Array.isArray(ids) || ids.length === 0)
            return res.status(400).json({ message: 'No lead IDs provided' });
        const result = await Lead.deleteMany({ _id: { $in: ids } });
        res.status(200).json({ success: true, deleted: result.deletedCount });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

// @access  Private (Admin only recommended, but let's keep it Private for now)
exports.deleteLead = async (req, res) => {
    try {
        const lead = await Lead.findById(req.params.id);

        if (!lead) {
            return res.status(404).json({ message: 'Lead not found' });
        }

        await lead.deleteOne();

        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};
