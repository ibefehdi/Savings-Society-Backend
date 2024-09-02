const mongoose = require('mongoose');
const Tenant = require('../models/tenantSchema');
const Address = require('../models/addressSchema');
const { stringify } = require('csv-stringify');
const Flat = require('../models/flatSchema');
exports.getAllTenants = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const resultsPerPage = parseInt(req.query.resultsPerPage, 10) || 10;
        const skip = (page - 1) * resultsPerPage;
        const searchCivilId = req.query.searchCivilId || '';
        console.log(searchCivilId)
        let query = {};
        if (searchCivilId) {
            query.civilId = { $regex: searchCivilId, $options: 'i' };
        }

        const tenants = await Tenant.find(query)
            .populate({
                path: 'flatId',
                populate: {
                    path: 'buildingId'
                }
            })
            .skip(skip)
            .limit(resultsPerPage)
            .lean();

        const count = await Tenant.countDocuments(query);

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
exports.getAllTenantsCount = async (req, res) => {
    try {
        const count = await Tenant.countDocuments();
        res.status(200).send({ count: count });
    } catch (error) {
        res.status(500).json({ message: "Error fetching active tenants", error: error.message });
    }
}
exports.getAllActiveTenants = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const resultsPerPage = parseInt(req.query.resultsPerPage, 10) || 10;
        const skip = (page - 1) * resultsPerPage;
        const searchCivilId = req.query.searchCivilId || '';
        const contactNumber = req.query.searchContactNumber || '';
        const name = req.query.searchName || '';
        const buildingId = req.query.buildingId || '';

        // Base query for active tenants
        let query = {
            $or: [
                { active: true },
                { active: { $exists: false } },
                { active: null }
            ]
        };

        // Add search criteria to the query
        if (searchCivilId) {
            query.civilId = { $regex: searchCivilId, $options: 'i' };
        }
        if (contactNumber) {
            query.contactNumber = { $regex: contactNumber, $options: 'i' };
        }
        if (name) {
            query.name = { $regex: name, $options: 'i' };
        }

        // Add a stable sort
        const sortField = req.query.sortField || 'name';
        const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1;

        let tenantQuery = Tenant.find(query);

        // If buildingId is provided, filter by it
        if (buildingId) {
            const flatIds = await Flat.find({ buildingId }).distinct('_id');
            query.flatId = { $in: flatIds };
        }

        tenantQuery = Tenant.find(query).populate({
            path: 'flatId',
            populate: {
                path: 'buildingId'
            }
        });

        const activeTenants = await tenantQuery
            .skip(skip)
            .sort({ [sortField]: sortOrder, _id: 1 })
            .limit(resultsPerPage)
            .lean()
            .exec();

        // Count tenants with the applied filters
        const count = await Tenant.countDocuments(query);

        console.log(`Active Tenants: ${activeTenants.length}, Total Count: ${count}`);
        const tenantsWithFrom = activeTenants.map(tenant => ({
            ...tenant,
            tenantFrom: tenant.flatId ? "Flat" : "Hall"
        }));
        res.status(200).json({
            data: tenantsWithFrom,
            count: count,
            metadata: { total: count, page: page, resultsPerPage: resultsPerPage },
        });
    } catch (error) {
        console.error("Error fetching active tenants:", error);
        res.status(500).json({ message: "Error fetching active tenants", error: error.message });
    }
};

exports.getAllActiveTenantsCSV = async (req, res) => {
    try {
        const activeTenants = await Tenant.find({
            $or: [
                { active: true },
                { active: { $exists: false } },
                { active: null }
            ]
        })
            .populate({
                path: 'flatId',
                populate: {
                    path: 'buildingId'
                }
            })
            .sort({ name: 1, _id: 1 })
            .lean()
            .exec();

        const csvStringifier = stringify({
            header: true,
            columns: [
                'اسم المستأجر',
                'رقم الاتصال',
                'الرقم المدني',
                'رقم الشقة',
                'رقم الطابق',
                'اسم المبنى'
            ]
        });

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="active_tenants.csv"');
        res.write('\uFEFF');  // UTF-8 BOM
        csvStringifier.pipe(res);

        activeTenants.forEach((tenant) => {
            const row = {
                'اسم المستأجر': tenant.name || 'N/A',
                'رقم الاتصال': tenant.contactNumber || 'N/A',
                'الرقم المدني': tenant.civilId || 'N/A',
                'رقم الشقة': tenant.flatId ? tenant.flatId.flatNumber : 'N/A',
                'رقم الطابق': tenant.flatId ? tenant.flatId.floorNumber : 'N/A',
                'اسم المبنى': tenant.flatId && tenant.flatId.buildingId ? tenant.flatId.buildingId.name : 'N/A'
            };

            csvStringifier.write(row);
        });

        csvStringifier.end();

    } catch (error) {
        console.error("Error exporting active tenants to CSV:", error);
        res.status(500).json({ message: "Error exporting active tenants to CSV", error: error.message });
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
        tenant.active = true;
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
exports.deactivateTenant = async (req, res) => {
    try {
        const { tenantId } = req.params;

        const updatedTenant = await Tenant.findByIdAndUpdate(
            tenantId,
            { active: false },
            { new: true }
        );
        console.log(updatedTenant);
        if (!updatedTenant) {
            return res.status(404).json({ message: "Tenant not found" });
        }

        res.status(200).json({ message: "Tenant deactivated successfully", tenant: updatedTenant });
    } catch (error) {
        res.status(500).json({ message: "Error deactivating tenant", error: error.message });
    }
};