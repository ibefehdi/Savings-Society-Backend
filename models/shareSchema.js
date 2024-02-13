const mongoose = require('mongoose');

const shareSchema = new mongoose.Schema({
    amount: { type: Number },
    initialAmount: { type: Number },
    currentAmount: { type: Number },
    date: { type: Date },
}, { timestamps: true });

// Calculate the current amount based on the initial amount and the time elapsed
shareSchema.methods.calculateCurrentPrice = async function () {
    const now = new Date();
    const purchaseDate = this.date;
    const elapsedYears = now.getFullYear() - purchaseDate.getFullYear();
    const elapsedMonths = (now.getMonth() - purchaseDate.getMonth()) + (12 * elapsedYears);
    const elapsedYearsExact = elapsedMonths / 12;

    // Assuming a 2% per year increase as an example
    const annualIncreaseRate = 0.02; // 2% annual increase
    const currentAmount = this.currentAmount * Math.pow(1 + annualIncreaseRate, elapsedYearsExact);

    console.log(`Current amount for share with initial amount ${this.initialAmount} is ${currentAmount.toFixed(2)}`);

    return currentAmount;
};



module.exports = mongoose.model('Share', shareSchema);
