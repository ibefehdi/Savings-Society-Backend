const mongoose = require('mongoose');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') }); // Adjust the path as needed
const mongoURI = process.env.MONGODB_CONNECTION_STRING;

// Import the Savings model
const Savings = require('../models/savingsSchema');

async function updateSavingsDepositDates() {
    try {
        const savings = await Savings.find({}).lean();

        for (const saving of savings) {
            if (saving.deposits && saving.deposits.length > 0) {
                const updatedDeposits = saving.deposits.map((deposit, index) => {
                    if (index === 0) {
                        return { ...deposit, date: new Date('2024-01-01') };
                    }
                    return deposit;
                });

                await Savings.findByIdAndUpdate(saving._id, { deposits: updatedDeposits });
            }
        }

        console.log(`Finished processing ${savings.length} savings documents`);
    } catch (error) {
        console.error('Error in updateSavingsDepositDates:', error);
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
        return updateSavingsDepositDates();
    })
    .then(() => {
        console.log('Migration finished');
    })
    .catch(console.error)
    .finally(() => {
        mongoose.disconnect();
        console.log('Disconnected from the database');
    });