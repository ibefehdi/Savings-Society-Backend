const mongoose = require('mongoose');
const path = require('path');
const Savings = require('../models/savingsSchema'); // Adjust path as needed

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoURI = process.env.MONGODB_CONNECTION_STRING;

async function adjustSavingsDocuments() {
    const cursor = Savings.find().cursor();
    
    let updateCount = 0;
    let totalProcessed = 0;

    for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
        totalProcessed++;
        let needsUpdate = false;
        
        // Calculate total of deposits
        const depositTotal = doc.deposits.reduce((sum, deposit) => sum + deposit.currentAmount, 0);
        
        // Check if total deposits exceed 1000
        if (depositTotal > 1000) {
            // Sort deposits by date (newest first)
            doc.deposits.sort((a, b) => b.date - a.date);
            
            let newTotal = 0;
            let i = 0;
            
            // Remove deposits until total is <= 1000
            while (i < doc.deposits.length) {
                const potentialTotal = newTotal + doc.deposits[i].currentAmount;
                
                if (potentialTotal <= 1000) {
                    newTotal = potentialTotal;
                    i++;
                } else {
                    // If this single deposit would exceed 1000, adjust it
                    if (i === 0) {
                        doc.deposits[i].currentAmount = 1000;
                        doc.deposits[i].initialAmount = 1000;
                        newTotal = 1000;
                        i++;
                    }
                    // Remove any remaining deposits
                    doc.deposits.splice(i);
                    break;
                }
            }
            
            doc.totalAmount = newTotal;
            needsUpdate = true;
        }
        
        // Check if totalAmount field exceeds 1000
        if (doc.totalAmount > 1000) {
            doc.totalAmount = 1000;
            needsUpdate = true;
        }
        
        if (needsUpdate) {
            try {
                await doc.save();
                updateCount++;
                console.log(`Updated document ${doc._id}`);
            } catch (error) {
                console.error(`Error updating document ${doc._id}:`, error);
            }
        }
    }

    console.log(`
    Migration Summary:
    ----------------
    Total documents processed: ${totalProcessed}
    Documents updated: ${updateCount}
    `);
}

// Connect to MongoDB and run migration
mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => {
    console.log('Connected to MongoDB');
    return adjustSavingsDocuments();
})
.then(() => {
    console.log('Migration completed successfully');
})
.catch((error) => {
    console.error('Migration failed:', error);
})
.finally(() => {
    mongoose.disconnect();
    console.log('Disconnected from MongoDB');
});