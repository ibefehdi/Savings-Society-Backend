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
exports.getTenantByCivilId = async (req, res) => {
    try {
        const civilId = req.body.civilId;
        const tenant = await Tenant.findOne({ civilId: civilId }).populate('flatId');
        res.status(200).json({
            tenant: tenant
        });
    } catch (error) {
        res.status(500).json({
            message: "An Error Occured While Fetching Tenant",
            error: error.message
        })
    }
}

exports.editTenant = async (req, res) => {
    try {
        const id = req.params.id;
        const tenant = await Tenant.findById(id);
        if (!tenant) {
            return res.status(404).json({ message: "Tenant not found" });
        }

        const { name, contactNumber, flatId, civilId } = req.body;

        if (name) tenant.name = name;
        if (contactNumber) tenant.contactNumber = contactNumber; // Fixed this line
        if (flatId) tenant.flatId = flatId;
        if (civilId) tenant.civilId = civilId;

        // Handle civilIdDocument upload
        if (req.files && req.files.civilIdDocument) {
            const file = req.files.civilIdDocument[0];
            tenant.civilIdDocument = {
                path: file.path,
                fileType: file.mimetype.startsWith('image/') ? 'image' : 'pdf'
            };
        }

        await tenant.save(); // await the save operation

        res.status(200).json({
            message: "Tenant Updated Successfully",
            tenant
        });
    } catch (error) {
        res.status(500).json({
            message: "An Error Occurred While Updating Tenant",
            error: error.message
        });
    }
};