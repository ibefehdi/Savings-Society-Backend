const mongoose = require('mongoose');
const shareConfigSchema = require('./shareConfigSchema');
const shareSerialSchema = new mongoose.Schema({
    dateStr: { type: String, required: true },
    seq: { type: Number, default: 0 }
});

const ShareSerial = mongoose.model('ShareSerial', shareSerialSchema);

const adminIdSchema = new mongoose.Schema({
    admin: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    amountBeforeChange: { type: Number },
    timestamp: { type: Date }
});
const purchaseSchema = new mongoose.Schema({
    amount: { type: Number }, // Number of shares
    initialAmount: { type: Number }, // Initial value of shares
    currentAmount: { type: Number }, // Current value of shares
    date: { type: Date },
    lastUpdateDate: { type: Date },
});
const shareSchema = new mongoose.Schema({
    purchases: [purchaseSchema],
    totalAmount: {
        type: Number,
        default: 0,
        get: v => v,
        set: v => parseFloat(v)
    },
    totalShareAmount: { type: Number, default: 0 },
    year: { type: Number },
    serial: { type: String },
    shareIncrease: {
        type: Number,
        default: 0,
        get: v => v,
        set: v => parseFloat(v)
    },
    adminId: [adminIdSchema],
    withdrawn: Boolean,
}, { timestamps: true });
shareSchema.set('toObject', { getters: true });
shareSchema.set('toJSON', { getters: true });

// Calculate the current amount based on the initial amount and the time elapsed
// shareSchema.methods.calculateCurrentPrice = async function () {
//     const now = new Date();
//     const purchaseDate = this.date;

//     const currentYear = now.getFullYear();
//     const withdrawn = this.withdrawn;
//     let currentAmount = this.currentAmount;

//     if (withdrawn) {
//         return currentAmount;
//     }

//     let lastUpdateDate = this.timeSinceLastUpdate ? new Date(this.timeSinceLastUpdate) : purchaseDate;
//     // Calculate time since last update in fraction of a year
//     const timeSinceLastUpdate = now - lastUpdateDate;
//     const yearFractionSinceLastUpdate = timeSinceLastUpdate / (1000 * 60 * 60 * 24 * 365);
//     // const yearFractionSinceLastUpdate = 1

//     // Only proceed if there is a fraction of the year to calculate
//     if (yearFractionSinceLastUpdate > 0) {
//         const shareConfig = await shareConfigSchema.findOne({ year: this.year });
//         if (!shareConfig) {
//             console.log(`No share configuration found for year ${currentYear}`);
//             // Even if there's no config for the current year, update lastUpdateDate to prevent repeated application
//             this.lastUpdateDate = now;
//             await this.save();
//             return currentAmount; // Return the unchanged amount
//         }

//         //const annualIncreaseRate = shareConfig.individualSharePercentage; 
//         const annualIncreaseRate = shareConfig.individualSharePercentage / 100;
//         console.log("Annual INterest rate", annualIncreaseRate)
//         // Apply the calculated rate based on the time since the last update
//         let calculatedAmount = currentAmount * Math.pow(1 + annualIncreaseRate, yearFractionSinceLastUpdate);
//         console.log("This is the calculated Amount", calculatedAmount)
//         // Determine the difference and update if necessary
//         let difference = calculatedAmount - currentAmount;
//         console.log("This is the difference", difference);

//         currentAmount = calculatedAmount;

//         // Update lastUpdateDate to now
//         this.lastUpdateDate = now;

//         console.log(`Updated current amount for Shares with initial amount ${this.initialAmount} is ${currentAmount.toFixed(2)}`);
//     } else {
//         console.log(`No time has passed since the last update, current amount remains ${currentAmount.toFixed(2)}`);
//     }

//     // Save any changes to the database
//     await this.save();

//     // Return the updated (or unchanged) current amount, rounded and converted to a number
//     return Number(currentAmount);
// };
// shareSchema.methods.calculateCurrentPrice = async function () {
//     console.log("Calculating current price for share");

//     const now = new Date();
//     const purchaseDate = this.date;
//     const currentYear = now.getFullYear();
//     const withdrawn = this.withdrawn;
//     let currentAmount = this.currentAmount;

//     console.log("Current year:", currentYear);
//     console.log("Purchase date:", purchaseDate);
//     console.log("Withdrawn status:", withdrawn);
//     console.log("Current amount:", currentAmount);

//     if (withdrawn) {
//         console.log("Share is withdrawn, returning current amount");
//         return currentAmount;
//     }

//     console.log("Share year:", this.year);

//     if (this.year !== currentYear) {
//         console.log("Share year does not match current year, returning current amount");
//         return currentAmount;
//     }

//     let lastUpdateDate = this.timeSinceLastUpdate ? new Date(this.timeSinceLastUpdate) : purchaseDate;
//     console.log("Last update date:", lastUpdateDate);

//     const timeSinceLastUpdate = now - lastUpdateDate;
//     const yearFractionSinceLastUpdate = timeSinceLastUpdate / (1000 * 60 * 60 * 24 * 365);
//     console.log("Time since last update (fraction of a year):", yearFractionSinceLastUpdate);

//     if (yearFractionSinceLastUpdate > 0) {
//         console.log("Time has passed since last update, retrieving share configuration");

//         const shareConfig = await shareConfigSchema.findOne({ year: this.year });

//         if (!shareConfig) {
//             console.log(`No share configuration found for year ${currentYear}`);
//             this.lastUpdateDate = now;
//             await this.save();
//             console.log("Updated last update date and saved share");
//             return currentAmount;
//         }

//         const annualIncreaseRate = shareConfig.individualSharePercentage / 100;
//         console.log("Annual interest rate:", annualIncreaseRate);

//         let calculatedAmount = currentAmount * Math.pow(1 + annualIncreaseRate, yearFractionSinceLastUpdate);
//         console.log("Calculated amount:", calculatedAmount);

//         let difference = calculatedAmount - currentAmount;
//         console.log("Difference between calculated and current amount:", difference);

//         currentAmount = calculatedAmount;
//         this.lastUpdateDate = now;
//         console.log(`Updated current amount for share with initial amount ${this.initialAmount} to ${currentAmount.toFixed(2)}`);
//     } else {
//         console.log(`No time has passed since the last update, current amount remains ${currentAmount.toFixed(2)}`);
//     }

//     await this.save();
//     console.log("Saved updated share");

//     console.log("Returning current amount:", Number(currentAmount));
//     return Number(currentAmount);
// };
// shareSchema.methods.calculateCurrentPrice = async function () {
//     console.log("Calculating current price for share");

//     const now = new Date();
//     const currentYear = now.getFullYear();
//     const withdrawn = this.withdrawn;

//     if (withdrawn) {
//         console.log("Share is withdrawn, returning total amount");
//         return this.totalAmount;
//     }

//     console.log("Share year:", this.year);

//     if (this.year !== currentYear) {
//         console.log("Share year does not match current year, returning total amount");
//         return this.totalAmount;
//     }

//     const shareConfig = await shareConfigSchema.findOne({ year: this.year });

//     if (!shareConfig) {
//         console.log(`No share configuration found for year ${currentYear}`);
//         await this.save();
//         console.log("Saved share");
//         return this.totalAmount;
//     }

//     const annualIncreaseRate = shareConfig.individualSharePercentage / 100;
//     console.log("Annual interest rate:", annualIncreaseRate);

//     for (const purchase of this.purchases) {
//         let lastUpdateDate = purchase.lastUpdateDate ? new Date(purchase.lastUpdateDate) : purchase.date;
//         console.log("Last update date:", lastUpdateDate);

//         const timeSinceLastUpdate = now - lastUpdateDate;
//         const yearFractionSinceLastUpdate = timeSinceLastUpdate / (1000 * 60 * 60 * 24 * 365);
//         console.log("Time since last update (fraction of a year):", yearFractionSinceLastUpdate);

//         if (yearFractionSinceLastUpdate > 0) {
//             let calculatedAmount = purchase.currentAmount * Math.pow(1 + annualIncreaseRate, yearFractionSinceLastUpdate);
//             console.log("Calculated amount:", calculatedAmount);

//             purchase.currentAmount = calculatedAmount;
//             purchase.lastUpdateDate = now;
//             console.log(`Updated current amount for purchase with initial amount ${purchase.initialAmount} to ${purchase.currentAmount.toFixed(2)}`);
//         } else {
//             console.log(`No time has passed since the last update for purchase with initial amount ${purchase.initialAmount}, current amount remains ${purchase.currentAmount.toFixed(2)}`);
//         }
//     }

//     this.totalAmount = this.purchases.reduce((total, purchase) => total + purchase.currentAmount, 0);
//     await this.save();
//     console.log("Saved updated share");

//     console.log("Returning total amount:", Number(this.totalAmount));
//     return Number(this.totalAmount);
// };
// Regular calculation function using simple interest
// shareSchema.methods.calculateCurrentPrice = async function () {
//     console.log("Calculating current price for share");
//     const now = new Date();

//     if (this.withdrawn) {
//         console.log("Share is withdrawn, returning total amount");
//         return this.purchases.reduce((total, purchase) => total + purchase.currentAmount, 0);
//     }

//     // Find the share configuration for the year
//     const shareConfig = await shareConfigSchema.findOne({ year: this.year });
//     if (!shareConfig) {
//         console.log(`No share configuration found for year ${this.year}`);
//         return this.purchases.reduce((total, purchase) => total + purchase.currentAmount, 0);
//     }

//     // Reset share increase for new calculation
//     this.shareIncrease = 0;

//     // Fixed annual rate of 2% for shares
//     const annualIncreaseRate = shareConfig.individualSharePercentage / 100; // Should be 0.02 (2%)
//     const monthlyIncreaseRate = annualIncreaseRate / 12; // Monthly rate (~0.167% per month)

//     for (const purchase of this.purchases) {
//         if (!this.withdrawn) {
//             // Get last update date or use purchase date if no updates yet
//             let lastUpdateDate = purchase.lastUpdateDate ? new Date(purchase.lastUpdateDate) : purchase.date;

//             // Set the last update date to the first day of the next month after the purchase date
//             lastUpdateDate = new Date(lastUpdateDate.getFullYear(), lastUpdateDate.getMonth() + 1, 1);

//             // Calculate months between last update and now
//             const monthsDiff = (now.getFullYear() - lastUpdateDate.getFullYear()) * 12 +
//                 (now.getMonth() - lastUpdateDate.getMonth());

//             if (monthsDiff > 0) {
//                 // Calculate interest for each month
//                 const interestAmount = purchase.initialAmount * monthlyIncreaseRate * monthsDiff;

//                 // Track the interest separately
//                 this.shareIncrease += interestAmount;

//                 // Update current amount with interest
//                 purchase.currentAmount = purchase.initialAmount + interestAmount;
//                 purchase.lastUpdateDate = now;

//                 console.log(`Share purchase: ${purchase.initialAmount} KD, Months: ${monthsDiff}, Interest: ${interestAmount.toFixed(3)} KD`);
//             }
//         }
//     }

//     // Calculate the total initial amount and current amount
//     const totalInitialAmount = this.purchases.reduce((total, purchase) => total + purchase.initialAmount, 0);
//     const totalCurrentAmount = this.purchases.reduce((total, purchase) => total + purchase.currentAmount, 0);

//     // Update total amount to be the initial investment
//     this.totalAmount = totalInitialAmount;
//     this.totalShareAmount = this.purchases.reduce((total, purchase) => total + purchase.amount, 0);

//     // Save the updated document
//     await this.save();

//     console.log("Share calculations completed");
//     console.log("Total initial amount:", this.totalAmount);
//     console.log("Share Increase:", this.shareIncrease);

//     return this.shareIncrease;
// };


// // 2024 correction function
shareSchema.methods.correct2024InterestCalculation = async function () {
    const targetYear = 2024;
    const endOfYear = new Date(targetYear, 11, 31); // December 31st 2024

    if (this.withdrawn) {
        return 0;
    }

    const shareConfig = await shareConfigSchema.findOne({ year: targetYear });
    if (!shareConfig) {
        console.log(`No share configuration found for 2024.`);
        return this.totalAmount;
    }

    const annualIncreaseRate = shareConfig.individualSharePercentage / 100;
    const monthlyRate = annualIncreaseRate / 12;

    // Reset shareIncrease
    this.shareIncrease = 0;

    // Reset all purchases to initial amount and recalculate with simple interest
    for (const purchase of this.purchases) {
        const purchaseDate = new Date(purchase.date);

        // Only process purchases made in or before 2024
        if (purchaseDate.getFullYear() <= targetYear) {
            // If purchase was made in 2024, calculate from purchase date
            // If purchase was made before 2024, calculate from start of 2024
            let startDate = new Date(Math.max(purchaseDate.getFullYear(), targetYear),
                purchaseDate.getFullYear() < targetYear ? 0 : purchaseDate.getMonth(), 1);

            // Calculate months until end of 2024
            const months = (12 - startDate.getMonth());

            if (months > 0) {
                // Reset to initial amount
                purchase.currentAmount = purchase.initialAmount;

                // Calculate simple interest
                const monthlyInterest = purchase.initialAmount * monthlyRate;
                const totalInterest = monthlyInterest * months;

                // Add to shareIncrease
                this.shareIncrease += totalInterest;

                purchase.currentAmount += totalInterest;
                purchase.lastUpdateDate = endOfYear;
            }
        }
    }

    // Update total amount (just the initial amounts)
    this.totalAmount = this.purchases.reduce((total, purchase) => total + purchase.initialAmount, 0);
    await this.save();

    return this.shareIncrease;
};
shareSchema.pre('save', async function (next) {
    if (this.isNew) {
        const today = new Date();
        // Format the date as YYYYMMDD
        const dateStr = today.toISOString().substring(0, 10).replace(/-/g, '');

        // Find the document for today's date or create a new one if it doesn't exist
        const serialDoc = await ShareSerial.findOneAndUpdate(
            { dateStr: dateStr },
            { $inc: { seq: 1 } }, // Increment the sequence number
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        // Format the sequence number as a four-digit string, e.g., '0001', '0002'
        const sequenceStr = serialDoc.seq.toString().padStart(4, '0');
        console.log("This is the sequence String ", sequenceStr);
        // Concatenate the date string with the formatted sequence number
        this.serial = `${dateStr}${sequenceStr}`; // e.g., '202402180001'
        console.log("This is the serial ", this.serial); //
        next();
    } else {
        next();
    }
});




module.exports = mongoose.model('Share', shareSchema);
