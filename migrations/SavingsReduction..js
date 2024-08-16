const mongoose = require('mongoose');
const Savings = require('../models/savingsSchema'); // Adjust this path as needed
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') }); // Adjust the path as needed
const mongoURI = process.env.MONGODB_CONNECTION_STRING;

async function updateSavingsAmount() {
    const cursor = Savings.find({ totalAmount: { $gt: 1000 } }).cursor();

    let updateCount = 0;
    for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
        doc.totalAmount = 1000;
        await doc.save();
        updateCount++;
    }

    console.log(`Updated ${updateCount} savings documents.`);
}

// Connect to the database
mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => {
        console.log('Connected to the database');
        return updateSavingsAmount();
    })
    .then(() => {
        console.log('Update process finished successfully');
    })
    .catch(console.error)
    .finally(() => {
        mongoose.disconnect();
        console.log('Disconnected from the database');
    });