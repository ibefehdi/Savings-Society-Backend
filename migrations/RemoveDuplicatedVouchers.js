const mongoose = require('mongoose');
const Voucher = require('../models/voucherSchema'); // Adjust this path as needed
const Building = require('../models/buildingSchema'); // Adjust this path as needed
const Flat = require('../models/flatSchema'); // Adjust this path as needed
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') }); // Adjust the path as needed
const mongoURI = process.env.MONGODB_CONNECTION_STRING;

async function deleteDuplicateVouchers(buildingId, flatId, month, year) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const vouchers = await Voucher.find({
        buildingId: buildingId,
        flatId: flatId,
        $or: [
            { pendingDate: { $gte: startDate, $lte: endDate } },
            { paidDate: { $gte: startDate, $lte: endDate } }
        ]
    }).sort({ paidDate: -1, pendingDate: -1 });

    if (vouchers.length <= 1) {
        return 0;
    }

    const voucherToKeep = vouchers[0];
    const vouchersToDelete = vouchers.slice(1);

    const deleteResult = await Voucher.deleteMany({
        _id: { $in: vouchersToDelete.map(v => v._id) }
    });

    return deleteResult.deletedCount;
}

async function processAllBuildingsAndFlats() {
    const buildings = await Building.find();
    let totalDeleted = 0;

    for (const building of buildings) {
        const flats = await Flat.find({ buildingId: building._id });

        for (const flat of flats) {
            // Process for the last 12 months
            const currentDate = new Date();
            for (let i = 0; i < 12; i++) {
                const month = currentDate.getMonth() + 1; // getMonth() is 0-indexed
                const year = currentDate.getFullYear();

                const deletedCount = await deleteDuplicateVouchers(building._id, flat._id, month, year);
                totalDeleted += deletedCount;

                if (deletedCount > 0) {
                    console.log(`Deleted ${deletedCount} duplicate vouchers for Building ${building._id}, Flat ${flat._id}, ${year}-${month}`);
                }

                // Move to the previous month
                currentDate.setMonth(currentDate.getMonth() - 1);
            }
        }
    }

    console.log(`Total deleted vouchers: ${totalDeleted}`);
}

// Connect to the database
mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => {
        console.log('Connected to the database');
        return processAllBuildingsAndFlats();
    })
    .then(() => {
        console.log('Deletion process finished successfully');
    })
    .catch(console.error)
    .finally(() => {
        mongoose.disconnect();
        console.log('Disconnected from the database');
    });