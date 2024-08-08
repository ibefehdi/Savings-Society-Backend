const mongoose = require('mongoose');
const Savings = require('../models/savingsSchema'); // Adjust this path as needed
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') }); // Adjust the path as needed
const mongoURI = process.env.MONGODB_CONNECTION_STRING;

async function updateSavingsIncrease() {
    try {
        const savings = await Savings.find({ savingsIncrease: { $exists: true } });

        for (const saving of savings) {
            saving.savingsIncreaseReporting = saving.savingsIncrease;
            saving.savingsIncrease = 0;
            await saving.save();
        }

        console.log(`Successfully updated ${savings.length} documents in the savings collection`);
    } catch (error) {
        console.error('Error updating savings:', error);
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
        return updateSavingsIncrease();
    })
    .then(() => {
        console.log('Migration finished successfully');
    })
    .catch(console.error)
    .finally(() => {
        mongoose.disconnect();
        console.log('Disconnected from the database');
    });