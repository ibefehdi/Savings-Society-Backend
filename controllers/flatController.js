const mongoose = require('mongoose');
const Flat = require('../models/flatSchema');
const Tenant = require('../models/tenantSchema');
const Contract = require('../models/contractSchema');
exports.createFlat = async (req, res) => {
    try {
        const {
            buildingId,
            flatNumber,
            tenantName,
            tenantContactNumber,
            tenantCivilId,
            tenantType,
            startDate,
            endDate,
            rentAmount,
            collectionDay,
        } = req.body;

        const flat = await Flat.create({
            buildingId: buildingId,
            flatNumber: flatNumber,
            vacant: true
        });

        let tenant = null;
        let contract = null;

        if (tenantName && tenantContactNumber && tenantType) {
            tenant = await Tenant.create({
                name: tenantName,
                contactNumber: tenantContactNumber,
                civilId: tenantCivilId,
                type: tenantType,
                flatId: flat._id,
            });

            if (tenant) {
                flat.vacant = false;
                flat.tenant = tenant._id;
                await flat.save();

                // Create a contract if tenant and contract details are provided
                if (startDate && endDate && rentAmount && collectionDay) {
                    contract = await Contract.create({
                        flatId: flat._id,
                        tenantId: tenant._id,
                        startDate: startDate,
                        endDate: endDate,
                        rentAmount: rentAmount,
                        collectionDay: collectionDay,
                        expired: false,
                    });
                }
            }
        }

        const populatedFlat = await Flat.findById(flat._id)
            .populate('tenant')
            .populate('buildingId');

        res.status(201).json({
            tenant: tenant,
            flat: populatedFlat,
            building: populatedFlat.buildingId,
            contract: contract,
        });
    } catch (err) {
        console.error(err);
        if (err.name === 'ValidationError') {
            res.status(400).json({ error: err.message });
        } else {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
};
exports.assignTenantToFlat = async (req, res) => {
    try {
        const flatId = req.params.id
        const { tenantName, tenantContactNumber, tenantType, startDate, endDate, rentAmount, collectionDay } = req.body;

        // Find the flat by its ID
        const flat = await Flat.findById(flatId);

        if (!flat) {
            return res.status(404).json({ error: 'Flat not found' });
        }

        if (!flat.vacant) {
            return res.status(400).json({ error: 'Flat is not vacant' });
        }

        // Create a new tenant
        const tenant = await Tenant.create({
            name: tenantName,
            contactNumber: tenantContactNumber,
            type: tenantType,
            flatId: flatId,
        });

        if (tenant) {
            flat.vacant = false;
            flat.tenant = tenant._id;
            await flat.save();

            // Create a contract if contract details are provided
            let contract = null;
            if (startDate && endDate && rentAmount && collectionDay) {
                contract = await Contract.create({
                    flatId: flatId,
                    tenantId: tenant._id,
                    startDate: startDate,
                    endDate: endDate,
                    rentAmount: rentAmount,
                    collectionDay: collectionDay,
                    expired: false,
                });
            }

            const populatedFlat = await Flat.findById(flatId)
                .populate('tenant')
                .populate('buildingId');

            res.status(200).json({
                tenant: tenant,
                flat: populatedFlat,
                building: populatedFlat.buildingId,
                contract: contract,
            });
        } else {
            res.status(500).json({ error: 'Failed to create tenant' });
        }
    } catch (err) {
        console.error(err);
        if (err.name === 'ValidationError') {
            res.status(400).json({ error: err.message });
        } else {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
};

// Get all flats with populated fields
exports.getAllFlats = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const count = await Flat.countDocuments();

        const flats = await Flat.find()
            .populate('buildingId', 'name address')
            .populate('tenant', 'name contactNumber type')
            .skip((page - 1) * limit)
            .limit(limit);

        // Fetch the contract for each flat
        const flatsWithContracts = await Promise.all(
            flats.map(async (flat) => {
                const contract = await Contract.findOne({ flatId: flat._id });
                return {
                    ...flat.toObject(),
                    contract: contract,
                };
            })
        );

        res.status(200).json({
            data: flatsWithContracts,
            count: flatsWithContracts.length,
            metadata: {
                total: count,
            },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.getAllFlatsDropdown = async (req, res) => {
    try {

        const flats = await Flat.find()
            .populate('buildingId', 'name address')
            .populate('tenant', 'name contactNumber type')


        // Fetch the contract for each flat
        const flatsWithContracts = await Promise.all(
            flats.map(async (flat) => {
                const contract = await Contract.findOne({ flatId: flat._id });
                return {
                    ...flat.toObject(),
                    contract: contract,
                };
            })
        );

        res.status(200).json({
            data: flatsWithContracts,

        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
// Get a flat by ID with populated fields
exports.getFlatById = async (req, res) => {
    try {
        const flat = await Flat.findById(req.params.id)
            .populate({
                path: 'buildingId',
                populate: {
                    path: 'address',
                    model: 'Address' // Make sure to reference the model name correctly
                }
            })
            .populate('tenant');

        if (!flat) {
            return res.status(404).json({ error: 'Flat not found' });
        }

        // Fetch the contract associated with the flat
        const contract = await Contract.findOne({ flatId: flat._id });

        // Add the contract to the flat object
        const flatWithContract = {
            ...flat.toObject(),
            contract: contract,
        };

        res.status(200).json(flatWithContract);
    } catch (err) {
        console.error(err);
        if (err.name === 'CastError') {
            res.status(400).json({ error: 'Invalid flat ID' });
        } else {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
};
exports.getFlatsByBuildingId = async (req, res) => {
    try {
        const buildingId = req.params.buildingId;

        // Find all flats with the specified building ID
        const flats = await Flat.find({ buildingId })
            .populate('tenant')
            .exec();

        // Fetch the contracts associated with each flat
        const flatsWithContracts = await Promise.all(
            flats.map(async (flat) => {
                const contract = await Contract.findOne({ flatId: flat._id });
                return {
                    ...flat.toObject(),
                    contract: contract,
                };
            })
        );

        const count = flatsWithContracts.length;

        // Format the response
        const response = {
            data: flatsWithContracts,
            count: count,
            metadata: {
                total: count,
            },
        };

        res.status(200).json(response);
    } catch (error) {
        console.error('Error retrieving flats:', error);
        res.status(500).json({ error: 'An error occurred while retrieving flats' });
    }
};
exports.removeTenant = async (req, res) => {
    try {
        const flat = await Flat.findById(req.params.id);

        if (!flat) {
            return res.status(404).json({ error: 'Flat not found' });
        }

        // Find the contract associated with the flat
        const contract = await Contract.findOne({ flatId: flat._id });

        if (contract) {
            // Update the contract as expired
            contract.expired = true;
            await contract.save();
        }

        flat.tenant = null;
        flat.vacant = true;
        await flat.save();

        res.status(200).json({
            flat: flat,
            message: "Tenant Removed",
        });
    } catch (err) {
        console.error(err);
        if (err.name === 'CastError') {
            res.status(400).json({ error: 'Invalid flat ID' });
        } else {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
};
exports.replaceTenant = async (req, res) => {
    try {
        const { tenantName, tenantContactNumber, tenantType, startDate, endDate, rentAmount, collectionDay } = req.body;
        const flatId = req.params.id;

        const flat = await Flat.findById(flatId);

        if (!flat) {
            return res.status(404).json({ error: 'Flat not found' });
        }

        // Find the old contract associated with the flat
        const oldContract = await Contract.findOne({ flatId: flat._id, expired: false });

        if (oldContract) {
            // Update the old contract as expired
            oldContract.expired = true;
            await oldContract.save();
        }

        // Create a new tenant
        const newTenant = await Tenant.create({
            name: tenantName,
            contactNumber: tenantContactNumber,
            type: tenantType,
            flatId: flat._id,
        });

        // Create a new contract
        const newContract = await Contract.create({
            flatId: flat._id,
            tenantId: newTenant._id,
            startDate: startDate,
            endDate: endDate,
            rentAmount: rentAmount,
            collectionDay: collectionDay,
            expired: false,
        });

        flat.tenant = newTenant._id;
        flat.vacant = false;
        await flat.save();

        res.status(200).json({
            flat: flat,
            oldContract: oldContract,
            newTenant: newTenant,
            newContract: newContract,
            message: "Tenant Replaced",
        });
    } catch (err) {
        console.error(err);
        if (err.name === 'CastError') {
            res.status(400).json({ error: 'Invalid flat ID' });
        } else {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
};
exports.getTenantByFlatId = async (req, res) => {
    try {
        const flatId = req.params.id;

        // Find the flat by its ID
        const flat = await Flat.findById(flatId);
        if (!flat) {
            return res.status(404).json({ message: 'Flat not found' });
        }

        // Find the tenant associated with the flat
        const tenant = await Tenant.findOne({ flatId: flat._id });
        if (!tenant) {
            return res.status(404).json({ message: 'Tenant not found for the specified flat' });
        }

        // Find the contract associated with the flat
        const contract = await Contract.findOne({ flatId: flat._id });

        // Create an object containing the flat, tenant, and contract
        const flatWithTenantAndContract = {
            ...flat.toObject(),
            tenant: tenant,
            contract: contract,
        };

        res.status(200).json({ data: [flatWithTenantAndContract] });
    } catch (error) {
        console.error('Error retrieving tenant and contract by flat ID:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};