const mongoose = require('mongoose');
const Flat = require('../models/flatSchema');
const Tenant = require('../models/tenantSchema');
const Building = require('../models/buildingSchema');
const Contract = require('../models/contractSchema');
const path = require('path');
const fs = require('fs');
const { stringify } = require('csv-stringify');
const ExcelJS = require('exceljs');

const ContractHistory = require('../models/contractHistorySchema')
exports.createFlat = async (req, res) => {
    try {
        const {
            buildingId,
            flatNumber,
            tenantName,
            tenantContactNumber,
            tenantCivilId,
            startDate,
            rentAmount,
            collectionDay,
            floorNumber
        } = req.body;

        console.log('Received request body:', req.body);

        const flat = await Flat.create({
            buildingId: buildingId,
            flatNumber: flatNumber,
            floorNumber: floorNumber,
            vacant: true
        });

        console.log('Created new flat:', flat);

        let tenant = null;
        let contract = null;
        if (!tenantName || !tenantContactNumber || !startDate || !rentAmount || !collectionDay) {
            console.log('Missing required fields:', {
                tenantName,
                tenantContactNumber,
                startDate,
                rentAmount,
                collectionDay
            });
            return res.status(400).json({ error: 'Missing required fields' });
        }
        if (tenantName && tenantContactNumber) {
            let civilIdDocument = undefined;
            if (req.files && req.files['civilIdDocument']) {
                const file = req.files['civilIdDocument'][0];
                const fileExtension = path.extname(file.originalname);
                const newFileName = `${tenantCivilId}${fileExtension}`;
                const newPath = path.join(path.dirname(file.path), newFileName);

                fs.renameSync(file.path, newPath);

                const fileUrl = `${req.protocol}://${req.get('host')}/uploads/civilIDs/${newFileName}`;

                civilIdDocument = {
                    path: fileUrl,
                    fileType: fileExtension.toLowerCase() === '.pdf' ? 'pdf' : 'image'
                };

                console.log('Uploaded civil ID document:', civilIdDocument);
            }

            tenant = await Tenant.create({
                name: tenantName,
                contactNumber: tenantContactNumber,
                civilId: tenantCivilId,
                flatId: flat._id,
                civilIdDocument: civilIdDocument,
                active: true
            });

            console.log('Created new tenant:', tenant);

            if (tenant) {
                flat.vacant = false;
                flat.tenant = tenant._id;
                await flat.save();
                console.log('Updated flat with tenant information:', flat);

                if (startDate && rentAmount && collectionDay) {
                    let contractDocument = undefined;
                    if (req.files && req.files['contractDocument']) {
                        const file = req.files['contractDocument'][0];
                        const fileExtension = path.extname(file.originalname);
                        const newFileName = `contract_${flat._id}${fileExtension}`;
                        const newPath = path.join(path.dirname(file.path), newFileName);

                        fs.renameSync(file.path, newPath);

                        const fileUrl = `${req.protocol}://${req.get('host')}/uploads/contracts/${newFileName}`;

                        contractDocument = {
                            path: fileUrl,
                            fileType: fileExtension.toLowerCase() === '.pdf' ? 'pdf' : 'image'
                        };

                        console.log('Uploaded contract document:', contractDocument);
                    }
                    console.log('Flat ID before creating contract:', flat._id);

                    // Calculate endDate as 1 year from startDate
                    const endDate = new Date(startDate);
                    endDate.setFullYear(endDate.getFullYear() + 1);

                    contract = await Contract.create({
                        flatId: flat._id,
                        tenantId: tenant._id,
                        startDate: startDate,
                        endDate: endDate,
                        rentAmount: rentAmount,
                        collectionDay: collectionDay,
                        expired: false,
                        contractDocument: contractDocument
                    });

                    console.log('Created new contract:', contract);

                    flat.contract = contract._id;
                    await flat.save();
                    console.log('Updated flat with contract information:', flat);
                }
            }
        }

        const populatedFlat = await Flat.findById(flat._id)
            .populate('tenant')
            .populate('buildingId');

        console.log('Populated flat information:', populatedFlat);

        res.status(201).json({
            tenant: tenant,
            flat: populatedFlat,
            building: populatedFlat.buildingId,
            contract: contract,
        });
    } catch (err) {
        console.error('Error occurred:', err);
        if (err.name === 'ValidationError') {
            res.status(400).json({ error: err.message });
        } else {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
};
exports.editFlat = async (req, res) => {
    try {
        const flatId = req.params.id;
        const {
            flatNumber,
            tenantName,
            tenantContactNumber,
            tenantCivilId,
            startDate,
            rentAmount,
            collectionDay,
            floorNumber
        } = req.body;
        console.log(req.body)
        // Find and update the flat
        let flat = await Flat.findById(flatId).populate('tenant')
            .populate('buildingId');

        if (!flat) {
            return res.status(404).json({ error: 'Flat not found' });
        }

        flat.flatNumber = flatNumber || flat.flatNumber;
        flat.floorNumber = floorNumber || flat.floorNumber;

        // Handle tenant information
        if (tenantName && tenantContactNumber) {
            let civilIdDocument = undefined;
            if (req.files && req.files['civilIdDocument']) {
                const file = req.files['civilIdDocument'][0];
                const fileExtension = path.extname(file.originalname);
                const newFileName = `${tenantCivilId}${fileExtension}`;
                const newPath = path.join(path.dirname(file.path), newFileName);

                fs.renameSync(file.path, newPath);

                const fileUrl = `${req.protocol}://${req.get('host')}/uploads/civilIDs/${newFileName}`;

                civilIdDocument = {
                    path: fileUrl,
                    fileType: fileExtension.toLowerCase() === '.pdf' ? 'pdf' : 'image'
                };
            }

            if (flat.tenant) {
                // Update existing tenant
                await Tenant.findByIdAndUpdate(flat.tenant, {
                    name: tenantName,
                    contactNumber: tenantContactNumber,
                    civilId: tenantCivilId,
                    civilIdDocument: civilIdDocument || flat.tenant.civilIdDocument
                });
            } else {
                // Create new tenant
                const newTenant = await Tenant.create({
                    name: tenantName,
                    contactNumber: tenantContactNumber,
                    civilId: tenantCivilId,
                    active: true,
                    flatId: flat._id,
                    civilIdDocument: civilIdDocument
                });
                flat.tenant = newTenant._id;
                flat.vacant = false;
            }
        } else if (flat.tenant && (!tenantName || !tenantContactNumber)) {
            // Remove tenant if tenant info is cleared
            await Tenant.findByIdAndRemove(flat.tenant);
            flat.tenant = null;
            flat.vacant = true;
        }

        // Handle contract information
        if (startDate || rentAmount || collectionDay) {
            let contractDocument = undefined;
            if (req.files && req.files['contractDocument']) {
                const file = req.files['contractDocument'][0];
                const fileExtension = path.extname(file.originalname);
                const newFileName = `contract_${flat._id}${fileExtension}`;
                const newPath = path.join(path.dirname(file.path), newFileName);

                fs.renameSync(file.path, newPath);

                const fileUrl = `${req.protocol}://${req.get('host')}/uploads/contracts/${newFileName}`;

                contractDocument = {
                    path: fileUrl,
                    fileType: fileExtension.toLowerCase() === '.pdf' ? 'pdf' : 'image'
                };
            }

            // Find existing contract or create new one
            let contract = await Contract.findOne({ flatId: flat._id });

            if (contract) {
                // Update existing contract
                if (startDate) {
                    contract.startDate = startDate;
                    // Calculate new endDate
                    const endDate = new Date(startDate);
                    endDate.setFullYear(endDate.getFullYear() + 1);
                    contract.endDate = endDate;
                }
                contract.rentAmount = rentAmount === undefined ? null : rentAmount;
                contract.collectionDay = collectionDay;

                // Normalize dates to ensure correct comparison
                const today = new Date();
                today.setHours(0, 0, 0, 0); // Set current date to midnight
                const normalizedEndDate = new Date(contract.endDate);
                normalizedEndDate.setHours(0, 0, 0, 0); // Set end date to midnight

                contract.expired = normalizedEndDate < today;

                contract.contractDocument = contractDocument || contract.contractDocument;
                await contract.save();
            } else {
                // Create new contract
                const endDate = new Date(startDate);
                endDate.setFullYear(endDate.getFullYear() + 1);

                contract = await Contract.create({
                    flatId: flat._id,
                    tenantId: flat.tenant,
                    startDate: startDate,
                    endDate: endDate,
                    rentAmount: rentAmount,
                    collectionDay: collectionDay,
                    expired: false,
                    contractDocument: contractDocument
                });
            }
        }

        await flat.save();

        const populatedFlat = await Flat.findById(flatId)
            .populate('tenant')
            .populate('buildingId');

        const contract = await Contract.findOne({ flatId: flatId, expired: false });

        res.status(200).json({
            flat: populatedFlat,
            building: populatedFlat.buildingId,
            tenant: populatedFlat.tenant,
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
        const flatId = req.params.id;
        const { tenantName, tenantContactNumber, tenantCivilId, startDate, endDate, rentAmount, collectionDay } = req.body;
        console.log(req.body)
        const flat = await Flat.findById(flatId);

        if (!flat) {
            return res.status(404).json({ error: 'Flat not found' });
        }

        if (!flat.vacant) {
            return res.status(400).json({ error: 'Flat is not vacant' });
        }

        let civilIdDocument = undefined;
        if (req.files && req.files['civilIdDocument']) {
            const file = req.files['civilIdDocument'][0];
            const fileExtension = path.extname(file.originalname);
            const newFileName = `${tenantCivilId}${fileExtension}`;
            const newPath = path.join(path.dirname(file.path), newFileName);

            fs.renameSync(file.path, newPath);

            const fileUrl = `${req.protocol}://${req.get('host')}/uploads/civilIDs/${newFileName}`;

            civilIdDocument = {
                path: fileUrl,
                fileType: fileExtension.toLowerCase() === '.pdf' ? 'pdf' : 'image'
            };
        }

        const tenant = await Tenant.create({
            name: tenantName,
            contactNumber: tenantContactNumber,
            civilId: tenantCivilId,
            flatId: flatId,
            active: true,
            civilIdDocument: civilIdDocument
        });

        if (tenant) {
            flat.vacant = false;
            flat.tenant = tenant._id;
            await flat.save();

            let contract = null;
            if (startDate && endDate && rentAmount && collectionDay) {
                let contractDocument = undefined;
                if (req.files && req.files['contractDocument']) {
                    const file = req.files['contractDocument'][0];
                    const fileExtension = path.extname(file.originalname);
                    const newFileName = `contract_${flatId}${fileExtension}`;
                    const newPath = path.join(path.dirname(file.path), newFileName);

                    fs.renameSync(file.path, newPath);

                    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/contracts/${newFileName}`;

                    contractDocument = {
                        path: fileUrl,
                        fileType: fileExtension.toLowerCase() === '.pdf' ? 'pdf' : 'image'
                    };
                }

                contract = await Contract.create({
                    flatId: flatId,
                    tenantId: tenant._id,
                    startDate: startDate,
                    endDate: endDate,
                    rentAmount: rentAmount,
                    collectionDay: collectionDay,
                    expired: false,
                    contractDocument: contractDocument
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

        // Use aggregation to convert flatNumber to integer and sort numerically
        const flats = await Flat.aggregate([
            {
                $match: {
                    buildingId: new mongoose.Types.ObjectId(buildingId),
                },
            },
            {
                $addFields: {
                    flatNumberInt: { $toInt: "$flatNumber" },
                },
            },
            {
                $sort: {
                    flatNumberInt: 1,
                },
            },
            {
                $lookup: {
                    from: "tenants",
                    localField: "tenant",
                    foreignField: "_id",
                    as: "tenant",
                },
            },
            {
                $unwind: {
                    path: "$tenant",
                    preserveNullAndEmptyArrays: true,
                },
            },
        ]);

        // Fetch the contracts associated with each flat
        const flatsWithContracts = await Promise.all(
            flats.map(async (flat) => {
                const contract = await Contract.findOne({ flatId: flat._id });
                return {
                    ...flat,
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
        console.error("Error retrieving flats:", error);
        res.status(500).json({ error: "An error occurred while retrieving flats" });
    }
};


exports.getFlatsByBuildingIdFormatted = async (req, res) => {
    try {
        const buildingId = req.params.buildingId;
        const flats = await Flat.aggregate([
            {
                $match: {
                    buildingId: new mongoose.Types.ObjectId(buildingId),
                },
            },
            {
                $addFields: {
                    flatNumberInt: { $toInt: "$flatNumber" },
                },
            },
            {
                $sort: {
                    flatNumberInt: 1,
                },
            },
            {
                $lookup: {
                    from: "tenants",
                    localField: "tenant",
                    foreignField: "_id",
                    as: "tenant",
                },
            },
            {
                $unwind: {
                    path: "$tenant",
                    preserveNullAndEmptyArrays: true,
                },
            },
        ]);

        const flatsWithContracts = await Promise.all(
            flats.map(async (flat) => {
                const contract = await Contract.findOne({ flatId: flat._id });
                return { ...flat, contract: contract };
            })
        );

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Flats');
        const formatDate = (date) => {
            if (!date) return 'N/A';
            const d = new Date(date);
            return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
        };
        worksheet.columns = [
            { header: 'رقم الشقة', key: 'flatNumber', width: 15 },
            { header: 'رقم الطابق', key: 'floorNumber', width: 15 },
            { header: 'اسم المستأجر', key: 'tenantName', width: 20 },
            { header: 'تاريخ بداية العقد', key: 'startDate', width: 20 },
            { header: 'تاريخ نهاية العقد', key: 'endDate', width: 20 },
            { header: 'قيمة الإيجار', key: 'rentAmount', width: 15 }
        ];

        let totalRentAmount = 0;

        flatsWithContracts.forEach((flat) => {
            const rentAmount = flat.contract ? flat.contract.rentAmount : 0;
            totalRentAmount += rentAmount;

            worksheet.addRow({
                flatNumber: flat.flatNumber || 'N/A',
                floorNumber: flat.floorNumber || 'N/A',
                tenantName: flat.tenant ? `${flat.tenant.name}` : 'N/A',
                startDate: flat.contract ? formatDate(flat.contract.startDate) : 'N/A',
                endDate: flat.contract ? formatDate(flat.contract.endDate) : 'N/A',
                rentAmount: rentAmount || 'N/A'
            });
        });

        // Add grand total row
        worksheet.addRow({
            flatNumber: '',
            floorNumber: '',
            tenantName: '',
            startDate: '',
            endDate: 'المجموع الكلي',
            rentAmount: totalRentAmount
        });

        // Style the header row
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

        // Style the grand total row
        const lastRow = worksheet.lastRow;
        lastRow.font = { bold: true };
        lastRow.getCell('endDate').alignment = { horizontal: 'right' };
        lastRow.getCell('rentAmount').alignment = { horizontal: 'left' };

        // Set text direction for the entire sheet to RTL
        worksheet.views = [{ rightToLeft: true }];

        // Generate Excel file
        const buffer = await workbook.xlsx.writeBuffer();
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="flats.xlsx"');
        res.send(buffer);
    } catch (error) {
        console.error("Error exporting flats:", error);
        res.status(500).json({ error: "An error occurred while exporting flats" });
    }
};
exports.removeTenant = async (req, res) => {
    try {
        const flat = await Flat.findById(req.params.id);

        if (!flat) {
            return res.status(404).json({ error: 'Flat not found' });
        }

        // Find all contracts associated with the flat
        const contracts = await Contract.find({ flatId: flat._id }).populate();

        for (let contract of contracts) {
            // Create a new contract history document for each contract
            await ContractHistory.create({
                flatId: contract.flatId,
                tenantId: contract.tenantId,
                startDate: contract.startDate,
                endDate: contract.endDate,
                expired: true,
                rentAmount: contract.rentAmount,
                collectionDay: contract.collectionDay,
            });

            // Update the contract as expired
            contract.flatId = null;
            contract.expired = true;
            contract.rentAmount = null;
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
        const { tenantName, tenantContactNumber, startDate, endDate, rentAmount, collectionDay } = req.body;
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
            active: true,
            // type: tenantType,
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
exports.createFlatBackup = async (req, res) => {
    try {
        const {
            buildingNo,
            tenantName,
            tenantContactNumber,
            tenantCivilId,
            startDate,
            endDate,
            rentAmount,
            floorNumber,
            flatNumber
        } = req.body;
        console.log(req.body)
        // Find the building using buildingNo
        const building = await Building.findOne({ no: buildingNo });
        if (!building) {
            return res.status(404).json({ error: 'Building not found' });
        }

        const flat = await Flat.create({
            buildingId: building._id,
            floorNumber: floorNumber,
            flatNumber: flatNumber,
            vacant: true
        });

        let tenant = null;
        let contract = null;

        if (tenantName && tenantContactNumber && tenantCivilId) {
            tenant = await Tenant.create({
                name: tenantName,
                contactNumber: tenantContactNumber,
                civilId: tenantCivilId,
                active: true,
                flatId: flat._id,
            });

            if (tenant) {
                // Create a contract if tenant and contract details are provided
                if (startDate && endDate && rentAmount) {
                    const today = new Date();
                    const parsedEndDate = new Date(endDate);
                    const expired = false

                    contract = await Contract.create({
                        flatId: flat._id,
                        tenantId: tenant._id,
                        startDate: startDate,
                        endDate: endDate,
                        rentAmount: rentAmount,
                        expired: expired,
                        collectionDay: 5
                    });

                    // Update flat status based on contract
                    flat.vacant = false;
                    flat.tenant = tenant._id;
                    flat.rentAmount = rentAmount;
                    await flat.save();
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
exports.getAllFlatCount = async (req, res) => {
    try {
        const count = await Flat.countDocuments();
        res.status(200).send({ count: count });
    } catch (error) {
        res.status(500).json({ message: "Error fetching active tenants", error: error.message });
    }
}
exports.deleteFlatController = async (req, res) => {


    try {
        const flatId = req.params.id;
        const flat = await Flat.findById(flatId);

        if (!flat) {

            return res.status(404).json({ message: 'Flat not found' });
        }
        const contract = await Contract.findOneAndDelete({ flatId: flatId, tenantId: flat.tenant });
        console.log(contract)
        // Delete the tenant if it exists
        if (flat.tenant) {
            await Tenant.findByIdAndDelete(flat.tenant);
        }

        // Delete the flat
        await Flat.findByIdAndDelete(flatId);


        res.status(200).json({ message: 'Flat and tenant deleted successfully' });
    } catch (error) {

        res.status(500).json({ message: 'An error occurred', error: error.message });
    }
};