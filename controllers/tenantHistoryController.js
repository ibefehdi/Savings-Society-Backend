const mongoose = require('mongoose');
const Tenant = require('../models/tenantSchema');
const Flat = require('../models/flatSchema');
const TenantHistory = require('../models/tenantHistorySchema');
exports.createTenantAndHistory = async (req, res) => {
    console.log('started');

    try {
        const { name, contactNumber, civilId, flatId, startDate, endDate, rentAmount } = req.body;
        console.log(req.body);

        // Validate required fields
        if (!name || !contactNumber || !civilId || !flatId) {
            return res.status(400).json({ error: 'Missing required fields', missing: req.body });
        }

        // Check if the flat exists
        const flat = await Flat.findById(flatId);
        if (!flat) {
            return res.status(404).json({ error: 'Flat not found' });
        }

        // Create new tenant
        const tenant = new Tenant({
            name,
            contactNumber,
            civilId,
            flatId,
            active: true
        });

        await tenant.save();

        // Create tenant history
        const tenantHistory = new TenantHistory({
            tenantId: tenant._id,
            flatId: flatId,
            startDate,
            endDate,
            rentAmount
        });

        await tenantHistory.save();

        // Update flat with new tenant
        flat.tenant = tenant._id;
        flat.vacant = false;
        await flat.save();

        // Populate the tenant and flat details
        const populatedTenant = await Tenant.findById(tenant._id)
            .populate({
                path: 'flatId',
                populate: {
                    path: 'buildingId'
                }
            });

        res.status(201).json({
            message: 'Tenant created and history recorded successfully',
            tenant: populatedTenant,
            tenantHistory: tenantHistory
        });

    } catch (error) {
        console.error('Error in createTenantAndHistory:', error);
        res.status(500).json({
            message: 'An error occurred while creating tenant and history',
            error: error.message
        });
    }
};

exports.getAllTenantHistories = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const resultsPerPage = parseInt(req.query.resultsPerPage, 10) || 10;
        const skip = (page - 1) * resultsPerPage;

        // Build the aggregation pipeline
        const pipeline = [];

        // Lookup tenant data
        pipeline.push({
            $lookup: {
                from: 'tenants',
                localField: 'tenantId',
                foreignField: '_id',
                as: 'tenantId'
            }
        });
        pipeline.push({ $unwind: { path: '$tenantId', preserveNullAndEmptyArrays: false } });

        // Lookup flat data
        pipeline.push({
            $lookup: {
                from: 'flats',
                localField: 'flatId',
                foreignField: '_id',
                as: 'flatId'
            }
        });
        pipeline.push({ $unwind: { path: '$flatId', preserveNullAndEmptyArrays: false } });

        // Lookup building data for the flat
        pipeline.push({
            $lookup: {
                from: 'buildings',
                localField: 'flatId.buildingId',
                foreignField: '_id',
                as: 'flatId.buildingId'
            }
        });
        pipeline.push({ $unwind: { path: '$flatId.buildingId', preserveNullAndEmptyArrays: true } });

        // Build match conditions based on search filters
        const matchConditions = {};

        if (req.query.tenantName) {
            // Split the name into words and create a regex that matches all words in any order
            const nameWords = req.query.tenantName.split(' ').filter(word => word.length > 0);
            const nameRegex = nameWords.map(word => `(?=.*${word})`).join('');
            matchConditions['tenantId.name'] = { $regex: nameRegex, $options: 'i' };
        }

        if (req.query.flatNumber) {
            matchConditions['flatId.flatNumber'] = req.query.flatNumber;
        }

        if (req.query.buildingId) {
            matchConditions['flatId.buildingId._id'] = new mongoose.Types.ObjectId(req.query.buildingId);
        }

        // Apply match conditions if any filters exist
        if (Object.keys(matchConditions).length > 0) {
            pipeline.push({ $match: matchConditions });
        }

        console.log('Applied filters:', matchConditions);

        // Use facet to get both count and paginated data
        pipeline.push({
            $facet: {
                data: [
                    { $sort: { _id: -1 } },
                    { $skip: skip },
                    { $limit: resultsPerPage }
                ],
                totalCount: [
                    { $count: 'count' }
                ]
            }
        });

        const result = await TenantHistory.aggregate(pipeline);

        const tenantHistories = result[0].data;
        const count = result[0].totalCount[0]?.count || 0;

        res.status(200).json({
            data: tenantHistories,
            count: count,
            metadata: { total: count },
        });
    } catch (error) {
        console.error('Error in getAllTenantHistories:', error);
        res.status(500).json({
            message: 'An error occurred while fetching tenant histories',
            error: error.message,
        });
    }
};

exports.getTenantHistoryById = async (req, res) => {
    try {
        const tenantHistory = await TenantHistory.findById(req.params.id)
            .populate('tenantId')
            .populate({
                path: 'flatId',
                populate: {
                    path: 'buildingId'
                }
            });

        if (!tenantHistory) {
            return res.status(404).json({ message: 'Tenant history not found' });
        }

        res.status(200).json(tenantHistory);
    } catch (error) {
        console.error('Error in getTenantHistoryById:', error);
        res.status(500).json({
            message: 'An error occurred while fetching tenant history',
            error: error.message,
        });
    }
};

// exports.createTenantAndHistory = async (req, res) => {
//     const session = await mongoose.startSession();
//     session.startTransaction();

//     try {
//         const {
//             name,
//             contactNumber,
//             civilId,
//             flatId,
//             civilIdDocument
//         } = req.body;

//         // Validate required fields
//         if (!name || !contactNumber || !civilId || !flatId) {
//             return res.status(400).json({ error: 'Missing required fields' });
//         }

//         // Check if the flat exists
//         const flat = await Flat.findById(flatId);
//         if (!flat) {
//             return res.status(404).json({ error: 'Flat not found' });
//         }

//         // Create new tenant
//         const tenant = new Tenant({
//             name,
//             contactNumber,
//             civilId,
//             flatId,
//             civilIdDocument,
//             active: true
//         });

//         await tenant.save({ session });

//         // Create tenant history
//         const tenantHistory = new TenantHistory({
//             tenantId: tenant._id,
//             flatId: flatId
//         });

//         await tenantHistory.save({ session });

//         // Update flat with new tenant
//         flat.tenant = tenant._id;
//         flat.vacant = false;
//         await flat.save({ session });

//         await session.commitTransaction();
//         session.endSession();

//         // Populate the tenant and flat details
//         const populatedTenant = await Tenant.findById(tenant._id)
//             .populate({
//                 path: 'flatId',
//                 populate: {
//                     path: 'buildingId'
//                 }
//             });

//         res.status(201).json({
//             message: 'Tenant created and history recorded successfully',
//             tenant: populatedTenant,
//             tenantHistory: tenantHistory
//         });

//     } catch (error) {
//         await session.abortTransaction();
//         session.endSession();

//         console.error('Error in createTenantAndHistory:', error);
//         res.status(500).json({
//             message: 'An error occurred while creating tenant and history',
//             error: error.message
//         });
//     }
// };

// exports.getAllTenantHistories = async (req, res) => {
//     try {
//         const page = parseInt(req.query.page, 10) || 1;
//         const resultsPerPage = parseInt(req.query.resultsPerPage, 10) || 10;
//         const skip = (page - 1) * resultsPerPage;

//         const tenantHistories = await TenantHistory.find()
//             .populate('tenantId')
//             .populate({
//                 path: 'flatId',
//                 populate: {
//                     path: 'buildingId'
//                 }
//             })
//             .skip(skip)
//             .limit(resultsPerPage)
//             .lean();

//         const count = await TenantHistory.countDocuments();

//         res.status(200).json({
//             data: tenantHistories,
//             count: count,
//             metadata: { total: count },
//         });
//     } catch (error) {
//         console.error('Error in getAllTenantHistories:', error);
//         res.status(500).json({
//             message: 'An error occurred while fetching tenant histories',
//             error: error.message,
//         });
//     }
// };

exports.getTenantHistoryById = async (req, res) => {
    try {
        const tenantHistory = await TenantHistory.findById(req.params.id)
            .populate('tenantId')
            .populate({
                path: 'flatId',
                populate: {
                    path: 'buildingId'
                }
            });

        if (!tenantHistory) {
            return res.status(404).json({ message: 'Tenant history not found' });
        }

        res.status(200).json(tenantHistory);
    } catch (error) {
        console.error('Error in getTenantHistoryById:', error);
        res.status(500).json({
            message: 'An error occurred while fetching tenant history',
            error: error.message,
        });
    }
};

// New controller: Get all tenant histories by flat
exports.getTenantHistoriesByFlat = async (req, res) => {
    try {
        const { flatId } = req.params;
        const page = parseInt(req.query.page, 10) || 1;
        const resultsPerPage = parseInt(req.query.resultsPerPage, 10) || 10;
        const skip = (page - 1) * resultsPerPage;

        const tenantHistories = await TenantHistory.find({ flatId })
            .populate('tenantId')
            .populate({
                path: 'flatId',
                populate: {
                    path: 'buildingId'
                }
            })
            .sort({ createdAt: -1 }) // Sort by most recent first
            .skip(skip)
            .limit(resultsPerPage)
            .lean();

        const count = await TenantHistory.countDocuments({ flatId });

        res.status(200).json({
            data: tenantHistories,
            count: count,
            metadata: { total: count },
        });
    } catch (error) {
        console.error('Error in getTenantHistoriesByFlat:', error);
        res.status(500).json({
            message: 'An error occurred while fetching tenant histories for the flat',
            error: error.message,
        });
    }
};

// New controller: Get all flats by tenant
exports.getFlatsByTenant = async (req, res) => {
    try {
        const { tenantId } = req.params;
        const page = parseInt(req.query.page, 10) || 1;
        const resultsPerPage = parseInt(req.query.resultsPerPage, 10) || 10;
        const skip = (page - 1) * resultsPerPage;

        const tenantHistories = await TenantHistory.find({ tenantId })
            .populate('tenantId')
            .populate({
                path: 'flatId',
                populate: {
                    path: 'buildingId'
                }
            })
            .sort({ createdAt: -1 }) // Sort by most recent first
            .skip(skip)
            .limit(resultsPerPage)
            .lean();

        const count = await TenantHistory.countDocuments({ tenantId });

        // Extract unique flats from tenant histories
        const uniqueFlats = Array.from(new Set(tenantHistories.map(history => history.flatId._id)))
            .map(flatId => tenantHistories.find(history => history.flatId._id.equals(flatId)).flatId);

        res.status(200).json({
            data: uniqueFlats,
            count: uniqueFlats.length,
            metadata: { total: count },
        });
    } catch (error) {
        console.error('Error in getFlatsByTenant:', error);
        res.status(500).json({
            message: 'An error occurred while fetching flats for the tenant',
            error: error.message,
        });
    }
};