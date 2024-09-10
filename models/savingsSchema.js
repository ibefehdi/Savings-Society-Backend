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

    for (const deposit of this.deposits) {
        if (!this.withdrawn) {  // Only process if not withdrawn
            let lastUpdateDate = deposit.lastUpdateDate ? new Date(deposit.lastUpdateDate) : deposit.date;

            // Set the last update date to the first day of the next month after the deposit date
            lastUpdateDate = new Date(lastUpdateDate.getFullYear(), lastUpdateDate.getMonth() + 1, 1);

            const timeSinceLastUpdate = now - lastUpdateDate;
            const yearFractionSinceLastUpdate = timeSinceLastUpdate / (1000 * 60 * 60 * 24 * 365);

            if (yearFractionSinceLastUpdate > 0) {
                let calculatedAmount = deposit.currentAmount * Math.pow(1 + annualIncreaseRate, yearFractionSinceLastUpdate);
                let interestAmount = calculatedAmount - deposit.currentAmount;

                this.savingsIncrease += interestAmount;
                deposit.currentAmount = calculatedAmount;
                deposit.lastUpdateDate = now;
            }
        }
    }

    // this.totalAmount = this.deposits.reduce((total, deposit) => total + deposit.currentAmount, 0);

    await this.save();
    console.log("This is what it returns", (this.totalAmount + this.savingsIncrease));
    console.log("Savings Increase: " + this.savingsIncrease);
    return this.savingsIncrease;
};
module.exports = mongoose.model('Savings', savingsSchema);