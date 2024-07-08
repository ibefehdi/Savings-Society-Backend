const mongoose = require('mongoose');
const Tenant = require('../models/tenantSchema');
const Address = require('../models/addressSchema');

exports.getAllTenants = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const resultsPerPage = parseInt(req.query.resultsPerPage, 10) || 10;
        const skip = (page - 1) * resultsPerPage;

        const tenants = await Tenant.find()
            .populate('flatId')
            .skip(skip)
            .limit(resultsPerPage)
            .lean();

        const count = await Tenant.countDocuments();

        const tenantsWithFrom = tenants.map(tenant => ({
            ...tenant,
            tenantFrom: tenant.flatId ? "Flat" : "Hall"
        }));

        res.status(200).json({
            data: tenantsWithFrom,
            count: count,
            metadata: { total: count },
        });
    } catch (error) {
        res.status(500).json({
            message: 'An error occurred while fetching tenants',
            error: error.message,
        });
    }
};