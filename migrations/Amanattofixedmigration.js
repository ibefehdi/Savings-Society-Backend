const mongoose = require('mongoose');
const Amanat = require('../models/amanatSchema'); // Adjust this path as needed
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') }); // Adjust the path as needed
const mongoURI = process.env.MONGODB_CONNECTION_STRING;

async function updateExistingDocuments() {
    const cursor = Amanat.find().cursor();

    let updateCount = 0;
    for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
        const originalAmount = doc.amount;
        doc.amount = parseFloat(doc.amount.toFixed(3));

        if (originalAmount !== doc.amount) {
            await doc.save();
            updateCount++;
        }
    }

    console.log(`Migration completed. Updated ${updateCount} documents.`);
}

// Connect to the database
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