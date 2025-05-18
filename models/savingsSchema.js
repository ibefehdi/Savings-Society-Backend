const mongoose = require('mongoose');
const savingsConfigSchema = require('./savingsConfigSchema');
const TransferLog = require('./transferLogSchema');
const Shareholder = require('./shareholderSchema');

const Amanat = require('./amanatSchema')
const adminIdSchema = new mongoose.Schema({
    admin: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    amountBeforeChange: { type: Number },
    timestamp: { type: Date }
});


const savingsSchema = new mongoose.Schema({
    deposits: [{
        initialAmount: { type: Number, required: true },
        currentAmount: { type: Number, required: true },
        date: { type: Date, required: true },
        lastUpdateDate: { type: Date },
    }],
    totalAmount: {
        type: Number,
        default: 0,
        get: v => v,
        set: v => parseFloat(v)
    },
    savingsIncrease: {
        type: Number,
        default: 0,
        get: v => v,
        set: v => parseFloat(v)
    },
    savingsIncreaseReporting: {
        type: Number,
        default: 0,
        get: v => v,
        set: v => parseFloat(v)
    },
    withdrawn: { type: Boolean },
    maxReached: { type: Boolean },
    amanat: { type: mongoose.Schema.Types.ObjectId, ref: 'Amanat' },
    year: { type: String },
    adminId: [adminIdSchema],
    alraseed: {
        type: Number,
        default: 0,
        get: v => v,
        set: v => parseFloat(v)
    }
}, { timestamps: true });
savingsSchema.set('toObject', { getters: true });
savingsSchema.set('toJSON', { getters: true });


// savingsSchema.methods.calculateCurrentPrice = async function () {
//     const now = new Date();

//     if (this.withdrawn) {
//         return this.deposits.reduce((total, deposit) => total + deposit.currentAmount, 0);
//     }

//     const shareConfig = await savingsConfigSchema.findOne({ year: this.year });
//     if (!shareConfig) {
//         console.log('No savings configuration found for this year.');
//         return this.deposits.reduce((total, deposit) => total + deposit.currentAmount, 0);
//     }

//     const annualIncreaseRate = shareConfig.individualSharePercentage / 100;
//     const monthlyIncreaseRate = annualIncreaseRate / 12;

//     for (const deposit of this.deposits) {
//         if (!this.withdrawn) {  // Only process if not withdrawn
//             let lastUpdateDate = deposit.lastUpdateDate ? new Date(deposit.lastUpdateDate) : deposit.date;

//             // Set the last update date to the first day of the next month after the deposit date
//             lastUpdateDate = new Date(lastUpdateDate.getFullYear(), lastUpdateDate.getMonth() + 1, 1);

//             const timeSinceLastUpdate = now - lastUpdateDate;
//             const monthsSinceLastUpdate = Math.floor(timeSinceLastUpdate / (1000 * 60 * 60 * 24 * 30.44)); // Average days per month

//             if (monthsSinceLastUpdate > 0) {
//                 // Simple interest formula: Principal * Rate * Time
//                 let interestAmount = deposit.currentAmount * monthlyIncreaseRate * monthsSinceLastUpdate;

//                 this.savingsIncrease += interestAmount;
//                 deposit.currentAmount += interestAmount;
//                 deposit.lastUpdateDate = now;
//             }
//         }
//     }

//     // Calculate the total amount after updating the deposits
//     const totalAmount = this.deposits.reduce((total, deposit) => total + deposit.currentAmount, 0);
//     const shareholder = await Shareholder.findOne({ savings: this.id })
//     console.log(shareholder)
//     // Check if the total amount exceeds 1000
//     if (totalAmount >= 1000) {
//         // Create a new TransferLog entry for Amanat
//         const transferLog = new TransferLog({
//             shareholder: shareholder._id,
//             fromSavings: this._id,
//             toAmanat: this.amanat, // Assuming you have a reference to Amanat
//             amount: totalAmount,
//             date: now,
//             transferType: 'Amanat',
//         });

//         await transferLog.save();

//         // Reset the savings amount after transferring to Amanat
//         this.deposits.forEach(deposit => {
//             deposit.currentAmount = 0;
//         });
//         this.savingsIncrease = 0;
//     } else {
//         // Create a new TransferLog entry for Savings
//         const transferLog = new TransferLog({
//             shareholder: shareholder,
//             fromSavings: this._id,
//             amount: totalAmount,
//             date: now,
//             transferType: 'Savings',
//         });

//         await transferLog.save();
//     }

//     await this.save();
//     console.log("This is what it returns", (this.totalAmount + this.savingsIncrease));
//     console.log("Savings Increase: " + this.savingsIncrease);
//     return this.savingsIncrease;
// };
// savingsSchema.methods.calculateCurrentPrice = async function () {
//     console.log("Calculating current price for savings");
//     const now = new Date();

//     if (this.withdrawn) {
//         console.log("Savings is withdrawn, returning total amount");
//         return this.deposits.reduce((total, deposit) => total + deposit.currentAmount, 0);
//     }

//     // Find the savings configuration for the year
//     const savingsConfig = await savingsConfigSchema.findOne({ year: this.year });
//     if (!savingsConfig) {
//         console.log(`No savings configuration found for year ${this.year}`);
//         return this.deposits.reduce((total, deposit) => total + deposit.currentAmount, 0);
//     }

//     // Reset savings increase for new calculation
//     this.savingsIncrease = 0;
//     // For reporting purposes
//     this.savingsIncreaseReporting = 0;

//     // Fixed annual rate of 12% for savings
//     const annualIncreaseRate = savingsConfig.individualSharePercentage / 100; // Should be 0.12 (12%)
//     const monthlyIncreaseRate = annualIncreaseRate / 12; // Monthly rate (1% per month)

//     for (const deposit of this.deposits) {
//         if (!this.withdrawn) {
//             // Get last update date or use deposit date if no updates yet
//             let lastUpdateDate = deposit.lastUpdateDate ? new Date(deposit.lastUpdateDate) : deposit.date;

//             // Set the last update date to the first day of the next month after the deposit date
//             lastUpdateDate = new Date(lastUpdateDate.getFullYear(), lastUpdateDate.getMonth() + 1, 1);

//             // Calculate months between last update and now
//             const monthsDiff = (now.getFullYear() - lastUpdateDate.getFullYear()) * 12 +
//                 (now.getMonth() - lastUpdateDate.getMonth());

//             if (monthsDiff > 0) {
//                 // Calculate interest for each month
//                 const interestAmount = deposit.initialAmount * monthlyIncreaseRate * monthsDiff;

//                 // Track the interest separately
//                 this.savingsIncrease += interestAmount;
//                 this.savingsIncreaseReporting += interestAmount;

//                 // Update current amount with interest
//                 deposit.currentAmount = deposit.initialAmount + interestAmount;
//                 deposit.lastUpdateDate = now;

//                 console.log(`Deposit: ${deposit.initialAmount} KD, Months: ${monthsDiff}, Interest: ${interestAmount.toFixed(3)} KD`);
//             }
//         }
//     }

//     // Calculate the total initial amount and current amount
//     const totalInitialAmount = this.deposits.reduce((total, deposit) => total + deposit.initialAmount, 0);
//     const totalCurrentAmount = this.deposits.reduce((total, deposit) => total + deposit.currentAmount, 0);

//     // Update total amount to be the initial savings
//     this.totalAmount = totalInitialAmount;

//     // Set alraseed as the sum of initial and interest
//     this.alraseed = totalCurrentAmount;

//     // Calculate total amount with interest
//     const totalWithInterest = this.totalAmount + this.savingsIncrease;

//     // Find the associated shareholder
//     const shareholder = await Shareholder.findOne({ savings: this._id });
//     if (!shareholder) {
//         console.log("No shareholder found for this savings");
//         return this.savingsIncrease;
//     }

//     // Check if the total amount exceeds 1000 KD
//     if (totalWithInterest >= 1000) {
//         console.log("Savings exceed 1000 KD, transferring to Amanat");

//         // Check if an Amanat already exists, or create a new one
//         let amanat = this.amanat ? await Amanat.findById(this.amanat) : null;

//         if (!amanat) {
//             amanat = new Amanat({
//                 amount: 0,
//                 withdrawn: false,
//                 date: now,
//                 year: this.year
//             });
//             await amanat.save();

//             // Link the Amanat to this savings
//             this.amanat = amanat._id;
//         }

//         // Transfer the amount to Amanat
//         amanat.amount += totalWithInterest;
//         await amanat.save();

//         // Create a transfer log
//         const transferLog = new TransferLog({
//             shareholder: shareholder._id,
//             fromSavings: this._id,
//             toAmanat: amanat._id,
//             amount: totalWithInterest,
//             date: now,
//             transferType: 'Amanat',
//         });

//         await transferLog.save();

//         // Reset savings after transfer
//         for (const deposit of this.deposits) {
//             deposit.currentAmount = 0;
//         }

//         // Keep the reporting value for display purposes
//         const reportingInterest = this.savingsIncreaseReporting;

//         // Reset actual savings value
//         this.savingsIncrease = 0;
//         this.totalAmount = 0;
//         this.maxReached = true;

//         await this.save();

//         return reportingInterest;
//     } else {
//         // If under 1000 KD, just save the updated savings

//         // Create a transfer log for tracking
//         const transferLog = new TransferLog({
//             shareholder: shareholder._id,
//             fromSavings: this._id,
//             amount: totalWithInterest,
//             date: now,
//             transferType: 'Savings',
//         });

//         await transferLog.save();
//         await this.save();

//         console.log("Savings calculations completed");
//         console.log("Total initial amount:", this.totalAmount);
//         console.log("Savings Increase:", this.savingsIncrease);

//         return this.savingsIncrease;
//     }
// };
savingsSchema.methods.correct2024InterestCalculation = async function () {
    const targetYear = 2024;
    const startOfYear = new Date(targetYear, 0, 1); // January 1st 2024
    const endOfYear = new Date(targetYear, 11, 31); // December 31st 2024

    if (this.withdrawn) {
        return 0;
    }

    const shareConfig = await savingsConfigSchema.findOne({ year: targetYear });
    if (!shareConfig) {
        console.log(`No savings configuration found for 2024.`);
        return 0;
    }

    // Reset values
    this.savingsIncrease = 0;

    const annualIncreaseRate = shareConfig.individualSharePercentage / 100; // 12% = 0.12
    const monthlyRate = annualIncreaseRate / 12; // 0.12 / 12 = 0.01 (1% per month)

    // For each deposit calculate monthly interest
    for (const deposit of this.deposits) {
        // Reset current amount to initial amount first
        deposit.currentAmount = deposit.initialAmount;

        const depositDate = new Date(deposit.date);

        // Only process deposits made in or before 2024
        if (depositDate.getFullYear() <= targetYear) {
            // If deposit was made in 2024, calculate from deposit date
            // If deposit was made before 2024, calculate from start of 2024
            let startDate = new Date(Math.max(depositDate.getFullYear(), targetYear),
                depositDate.getFullYear() < targetYear ? 0 : depositDate.getMonth(), 1);

            // Calculate months until end of 2024
            const months = (12 - startDate.getMonth());

            if (months > 0) {
                // Simple interest = Principal * Rate * Time
                // For 1000 KD at 12% annually, this would be:
                // 1000 * (0.12/12) * 12 = 120 KD for a full year
                const monthlyInterest = deposit.initialAmount * monthlyRate;
                const totalInterest = monthlyInterest * months;

                this.savingsIncrease += totalInterest;
                deposit.currentAmount += totalInterest;
            }
        }
    }

    // Update total amount
    this.totalAmount = this.deposits.reduce((total, deposit) => total + deposit.initialAmount, 0);

    await this.save();

    return {
        initialTotal: this.totalAmount,
        savingsIncrease: this.savingsIncrease,
        finalTotal: this.totalAmount + this.savingsIncrease
    };
};
module.exports = mongoose.model('Savings', savingsSchema);