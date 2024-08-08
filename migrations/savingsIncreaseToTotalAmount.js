const { MongoClient } = require('mongodb');

async function updateSavings() {
    const uri = "mongodb://127.0.0.1:27017/shareholder";
    const client = new MongoClient(uri);

    try {
        await client.connect();

        const database = client.db(); // The default database from the connection string
        const savings = database.collection('savings');

        // Update totalAmount by adding savingsIncrease while keeping savingsIncrease unchanged
        const updateResult = await savings.updateMany(
            { savingsIncrease: { $exists: true }, totalAmount: { $exists: true } },
            [
                { $set: { totalAmount: { $add: ["$totalAmount", "$savingsIncrease"] } } }
            ]
        );

        console.log(`Successfully updated ${updateResult.modifiedCount} documents in the savings collection`);
    } catch (error) {
        console.error('Error updating savings:', error);
    } finally {
        await client.close();
    }
}

updateSavings();