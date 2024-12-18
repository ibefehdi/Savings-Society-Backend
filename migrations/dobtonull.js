const mongoose = require('mongoose');
const moment = require('moment');
const Shareholder = require('../models/shareholderSchema'); // Adjust path as needed
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') }); // Adjust the path as needed
const mongoURI = process.env.MONGODB_CONNECTION_STRING;

const migrateDOB = async () => {
    try {
        console.log('Starting DOB migration...');

        // Find all shareholders with DOB set to 1/1/2000
        const targetDate = new Date('1999-12-31T21:00:00.000Z');

        // First, count affected records
        const count = await Shareholder.countDocuments({
            DOB: targetDate
        });

        console.log(`Found ${count} shareholders with DOB set to 01/01/2000`);

        // Get all affected records for logging
        const affected = await Shareholder.find({
            DOB: targetDate
        }).select('_id membersCode fName DOB');

        // Log affected records before update
        console.log('Affected shareholders:');
        affected.forEach(shareholder => {
            console.log(`ID: ${shareholder._id}, Code: ${shareholder.membersCode}, Name: ${shareholder.fName}, Current DOB: ${moment(shareholder.DOB).format('DD/MM/YYYY')}`);
        });

        // Perform the update
        const result = await Shareholder.updateMany(
            { DOB: targetDate },
            { $set: { DOB: null } }
        );

        // Verify the update
        const verificationCount = await Shareholder.countDocuments({
            DOB: targetDate
        });

        console.log('\nMigration Results:');
        console.log(`- Documents matched: ${result.matchedCount}`);
        console.log(`- Documents modified: ${result.modifiedCount}`);
        console.log(`- Remaining documents with 01/01/2000: ${verificationCount}`);

        if (verificationCount > 0) {
            console.warn('\nWARNING: Some records may not have been updated successfully');
        } else {
            console.log('\nMigration completed successfully');
        }

        // Create a backup log of the changes
        const timestamp = moment().format('YYYY-MM-DD_HH-mm-ss');
        const fs = require('fs');
        const logStream = fs.createWriteStream(`migration_log_${timestamp}.txt`);

        logStream.write('DOB Migration Log\n');
        logStream.write(`Timestamp: ${moment().format('YYYY-MM-DD HH:mm:ss')}\n`);
        logStream.write(`Total records affected: ${count}\n\n`);
        logStream.write('Affected Records:\n');
        affected.forEach(shareholder => {
            logStream.write(`ID: ${shareholder._id}, Code: ${shareholder.membersCode}, Name: ${shareholder.fName}\n`);
        });
        logStream.end();

    } catch (error) {
        console.error('Migration failed:', error);
        throw error;
    }
};

// Connect to the database
mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => {
        console.log('Connected to the database');
        // Run the migration
        return migrateDOB();
    })
    .then(() => {
        console.log('Migration finished successfully');
    })
    .catch(console.error)
    .finally(() => {
        mongoose.disconnect();
        console.log('Disconnected from the database');
    });