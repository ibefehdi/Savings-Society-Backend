const mongoose = require('mongoose');

const adminIdSchema = new mongoose.Schema({
    admin: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    amountBeforeChange: { type: Number },
    timestamp: { type: Date }
});


const savingsSchema = new mongoose.Schema({
    initialAmount: { type: Number },
    currentAmount: { type: Number },
    date: { type: Date },
    withdrawn: Boolean,
    adminId: [adminIdSchema],
}, { timestamps: true });

savingsSchema.methods.calculateCurrentPrice = async function () {
    const now = new Date();
    console.log("This is the date ", now);
    const purchaseDate = this.date;
    const withdrawn = this.withdrawn
    if (withdrawn) {
        console.log("The user has withdrawn their savings ", this.currentAmount)
        return this.currentAmount
    }
    console.log("This is the purchase date ", purchaseDate);
    // Calculate elapsed years as a fraction to account for partial years
    const elapsedYearsExact = (now - purchaseDate) / (1000 * 60 * 60 * 24 * 365);
    console.log("Elapsed years: ", elapsedYearsExact);
    // Assuming a 12% per year increase
    const annualIncreaseRate = 0.12; // 12% annual increase
    // Apply the 12% increase per year based on the initial amount
    const currentAmount = this.currentAmount * Math.pow(1 + annualIncreaseRate, elapsedYearsExact); //compound interest
    console.log("This is the currentAmount", currentAmount);
    console.log(`Current amount for savings with initial amount ${this.initialAmount} is ${currentAmount.toFixed(2)}`);

    return currentAmount;
};

module.exports = mongoose.model('Savings', savingsSchema);