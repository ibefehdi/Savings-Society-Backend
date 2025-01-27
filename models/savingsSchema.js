const mongoose = require('mongoose');
const savingsConfigSchema = require('./savingsConfigSchema');
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


savingsSchema.methods.calculateCurrentPrice = async function () {
    const now = new Date();

    if (this.withdrawn) {
        return this.deposits.reduce((total, deposit) => total + deposit.currentAmount, 0);
    }

    const shareConfig = await savingsConfigSchema.findOne({ year: this.year });
    if (!shareConfig) {
        console.log(`No savings configuration found for this year.`);
        return this.deposits.reduce((total, deposit) => total + deposit.currentAmount, 0);
    }

    const annualIncreaseRate = shareConfig.individualSharePercentage / 100;
    const monthlyIncreaseRate = annualIncreaseRate / 12;

    for (const deposit of this.deposits) {
        if (!this.withdrawn) {  // Only process if not withdrawn
            let lastUpdateDate = deposit.lastUpdateDate ? new Date(deposit.lastUpdateDate) : deposit.date;

            // Set the last update date to the first day of the next month after the deposit date
            lastUpdateDate = new Date(lastUpdateDate.getFullYear(), lastUpdateDate.getMonth() + 1, 1);

            const timeSinceLastUpdate = now - lastUpdateDate;
            const monthsSinceLastUpdate = Math.floor(timeSinceLastUpdate / (1000 * 60 * 60 * 24 * 30.44)); // Average days per month

            if (monthsSinceLastUpdate > 0) {
                // Simple interest formula: Principal * Rate * Time
                let interestAmount = deposit.currentAmount * monthlyIncreaseRate * monthsSinceLastUpdate;

                this.savingsIncrease += interestAmount;
                deposit.currentAmount += interestAmount;
                deposit.lastUpdateDate = now;
            }
        }
    }

    await this.save();
    console.log("This is what it returns", (this.totalAmount + this.savingsIncrease));
    console.log("Savings Increase: " + this.savingsIncrease);
    return this.savingsIncrease;
};
savingsSchema.methods.calculateAdjustedIncrease = async function () {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    console.log("Current Year: " + currentYear);
    console.log("Current Month: " + currentMonth);

    if (this.withdrawn) {
        return 0; // No increase for withdrawn savings
    }

    const shareConfig = await savingsConfigSchema.findOne({ year: currentYear });
    if (!shareConfig) {
        console.log(`No savings configuration found for this year.`);
        return 0;
    }
    console.log(shareConfig);
    const annualIncreaseRate = shareConfig.individualSharePercentage;
    const monthlyIncreaseRate = annualIncreaseRate / 12;
    let totalIncrease = 0;

    // Calculate the total initial deposits
    const totalDeposits = this.deposits.reduce((sum, deposit) => sum + deposit.initialAmount, 0);

    // Calculate the difference between total amount and total deposits
    const previousYearInterest = this.totalAmount - totalDeposits;

    // Calculate increase on previous year's interest
    if (previousYearInterest > 0) {
        const startDate = new Date(currentYear, 0, 1); // January 1st of current year
        const endDate = new Date(currentYear, currentMonth, 0); // Last day of previous month
        const months = (endDate.getMonth() - startDate.getMonth()) + 1;

        const interestAmount = previousYearInterest * (monthlyIncreaseRate / 100) * months;
        totalIncrease += interestAmount;
    }

    // Calculate increase on deposits
    for (const deposit of this.deposits) {
        const depositDate = new Date(deposit.date);
        // let startDate = new Date(Math.max(depositDate.getFullYear(), currentYear),
        //     depositDate.getFullYear() < currentYear ? 0 : depositDate.getMonth() + 1, 1);
        let startDate = new Date(Math.max(depositDate.getFullYear(), currentYear),
            depositDate.getMonth(), 1);
        let endDate = new Date(currentYear, currentMonth, 0); // End at last day of previous month

        if (startDate > endDate) {
            continue; // Skip if deposit is too recent
        }

        let months = (endDate.getMonth() - startDate.getMonth()) + 1;

        let interestAmount = deposit.initialAmount * (monthlyIncreaseRate / 100) * months;
        console.log(`Deposit: ${deposit.initialAmount}, Months: ${months}, Interest: ${interestAmount}`);

        totalIncrease += interestAmount;
    }

    return totalIncrease;
};
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

    // Reset the 2024 savings increase
    let corrected2024Increase = 0;
    let originalDepositsTotal = 0;

    const annualIncreaseRate = shareConfig.individualSharePercentage / 100;
    const monthlyIncreaseRate = annualIncreaseRate / 12;

    for (const deposit of this.deposits) {
        const depositDate = new Date(deposit.date);
        originalDepositsTotal += deposit.initialAmount;

        // Only process deposits made in or before 2024
        if (depositDate.getFullYear() <= targetYear) {
            // If deposit was made in 2024, calculate from deposit date
            // If deposit was made before 2024, calculate from start of 2024
            let startDate = new Date(Math.max(depositDate.getFullYear(), targetYear),
                depositDate.getFullYear() < targetYear ? 0 : depositDate.getMonth(), 1);

            // Calculate months until end of 2024
            const months = (12 - startDate.getMonth());

            if (months > 0) {
                // Simple interest formula: Principal * Rate * Time
                const interestAmount = deposit.initialAmount * monthlyIncreaseRate * months;
                corrected2024Increase += interestAmount;
            }
        }
    }

    // Store the corrected 2024 calculation
    this.corrected2024Interest = corrected2024Increase;

    // Calculate the difference between original and corrected calculations
    const original2024Interest = this.savingsIncrease; // assuming this holds the original compound interest
    this.savingsIncrease = corrected2024Increase - original2024Interest;

    await this.save();

    return {
        original2024Interest: original2024Interest,
        corrected2024Interest: corrected2024Increase,
        difference: this.savingsIncrease,
        message: "This shows the difference between the compound and simple interest calculations for 2024. You may need to adjust accounts based on this difference."
    };
};
module.exports = mongoose.model('Savings', savingsSchema);