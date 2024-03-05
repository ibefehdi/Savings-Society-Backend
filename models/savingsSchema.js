const mongoose = require('mongoose');
const savingsConfigSchema = require('./savingsConfigSchema')
const adminIdSchema = new mongoose.Schema({
    admin: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    amountBeforeChange: { type: Number },
    timestamp: { type: Date }
});


const savingsSchema = new mongoose.Schema({
    initialAmount: { type: Number },
    currentAmount: { type: Number },
    date: { type: Date },
    withdrawn: { type: Boolean },
    maxReached: { type: Boolean },
    adminId: [adminIdSchema],
}, { timestamps: true });

savingsSchema.methods.calculateCurrentPrice = async function () {
    const now = new Date();
    const purchaseDate = this.date;
    const purchaseYear = purchaseDate.getFullYear();
    const currentYear = now.getFullYear();
    const withdrawn = this.withdrawn
    let currentAmount = this.currentAmount;

    if (withdrawn) {
        return this.currentAmount
    }
    for (let year = purchaseYear; year <= currentYear; year++) {
        // Fetch the share configuration for the year
        const shareConfig = await savingsConfigSchema.findOne({ year: year });
        if (!shareConfig) {
            console.log(`No savings configuration found for year ${year}`);
            return currentAmount; // Return the initial amount if no config is found for the purchase year
        }
        if (withdrawn) {
            console.log('The user has withdrawn the savings')
            console.log("Withdrawn amount: ", currentAmount);
            return currentAmount;
        }

        const annualIncreaseRate = shareConfig.individualSharePercentage / 100; // Convert percentage to decimal

        // Determine the time span within the year to apply the rate
        let yearFraction = 1;
        if (year === purchaseYear) {
            // If the purchase year, calculate the fraction of the year from purchase date to year end
            yearFraction = (new Date(year + 1, 0, 1) - purchaseDate) / (1000 * 60 * 60 * 24 * 365);
        } else if (year === currentYear) {
            // If the current year, calculate the fraction of the year from year start to now
            yearFraction = (now - new Date(year, 0, 1)) / (1000 * 60 * 60 * 24 * 365);
        }

        // Calculate the appreciation for the year or fraction thereof
        // currentAmount *= 10 //For Testing purposes
        currentAmount *= Math.pow(1 + annualIncreaseRate, yearFraction);
    }

    console.log(`Current amount for savings with initial amount ${this.initialAmount} is ${currentAmount.toFixed(2)}`);

    return Number(currentAmount);
};
// This is to disregard the purchase date
// savingsSchema.methods.calculateCurrentPrice = async function () {
//     const now = new Date();
//     const purchaseDate = new Date(this.date.getFullYear(), 0, 1); // Adjusted to 1 January of the purchase year
//     const purchaseYear = purchaseDate.getFullYear();
//     const currentYear = now.getFullYear();
//     const withdrawn = this.withdrawn;
//     let currentAmount = this.initialAmount;

//     if (withdrawn) {
//         return this.currentAmount;
//     }
//     for (let year = purchaseYear; year <= currentYear; year++) {
//         const shareConfig = await savingsConfigSchema.findOne({ year: year });
//         if (!shareConfig) {
//             console.log(`No savings configuration found for year ${year}`);
//             return currentAmount;
//         }
//         if (withdrawn) {
//             console.log('The user has withdrawn the savings');
//             console.log("Withdrawn amount: ", currentAmount);
//             return currentAmount;
//         }

//         const annualIncreaseRate = shareConfig.individualSharePercentage / 100; // Convert percentage to decimal
//         let yearFraction = 1; // Assume full year investment for simplicity

//         // Calculate the appreciation for the year
//         currentAmount *= Math.pow(1 + annualIncreaseRate, yearFraction);
//     }

//     console.log(`Current amount for savings with initial amount ${this.initialAmount} is ${currentAmount.toFixed(2)}`);
//     return currentAmount;
// };


module.exports = mongoose.model('Savings', savingsSchema);