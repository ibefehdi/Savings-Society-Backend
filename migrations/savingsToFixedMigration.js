const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') }); // Adjust the path as needed
const mongoose = require('mongoose');
const Saving = require('../models/savingsSchema');

const mongoURI = process.env.MONGODB_CONNECTION_STRING;

async function updateExistingDocuments() {
    const cursor = Saving.find().cursor();

    for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
        doc.totalAmount = parseFloat(doc.totalAmount.toFixed(3));
        doc.savingsIncrease = parseFloat(doc.savingsIncrease.toFixed(3));
        await doc.save();
    }

    console.log('Migration completed');
}

mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => {
        console.log('Connected to the database');
        // Run the migration
        return updateExistingDocuments();
    })
    .then(() => {
        console.log('Migration finished successfully');
    })
    .catch(console.error)
    .finally(() => {
        mongoose.disconnect();
        console.log('Disconnected from the database');
    });
