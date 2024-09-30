const mongoose = require('mongoose');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') }); // Adjust the path as needed
const mongoURI = process.env.MONGODB_CONNECTION_STRING;

// Import all necessary models
const Shareholder = require('../models/shareholderSchema');
const Share = require('../models/shareSchema');
const Savings = require('../models/savingsSchema');
const ShareholderFinanceHistory = require('../models/shareholderFinanceHistorySchema');

async function createShareholderFinanceHistory() {
    try {
        const shareholders = await Shareholder.find({}).lean();

        for (const shareholder of shareholders) {
            if (shareholder.savings && shareholder.share) {
                try {
                    await ShareholderFinanceHistory.create({
                        shareholder: shareholder._id,
                        share: shareholder.share,
                        savings: shareholder.savings,
                        year: 2023
                    });
                } catch (error) {
                    console.error(`Error creating record for shareholder ${shareholder._id}:`, error.message);
                }
            }
        }

        console.log(`Finished processing ${shareholders.length} shareholders`);
    } catch (error) {
        console.error('Error in createShareholderFinanceHistory:', error);
    }
}

// Connect to the database
mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => {
        console.log('Connected to the database');
        // Run the migration
        return createShareholderFinanceHistory();
    })
    .then(() => {
        console.log('Migration finished');
    })
    .catch(console.error)
    .finally(() => {
        mongoose.disconnect();
        console.log('Disconnected from the database');
    });