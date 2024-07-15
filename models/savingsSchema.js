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
    totalAmount: { type: Number, default: 0 },
    savingsIncrease: { type: Number, default: 0 },
    withdrawn: { type: Boolean },
    maxReached: { type: Boolean },
    amanat: { type: mongoose.Schema.Types.ObjectId, ref: 'Amanat' },
    year: { type: String },
    adminId: [adminIdSchema],
}, { timestamps: true });


// savingsSchema.methods.calculateCurrentPrice = async function () {
//     const now = new Date();
//     const purchaseDate = this.date;
//     const purchaseYear = purchaseDate.getFullYear();
//     const currentYear = now.getFullYear();
//     const withdrawn = this.withdrawn;
//     let currentAmount = this.currentAmount; // Existing current amount before calculation

//     if (withdrawn) {
//         return currentAmount; // If already withdrawn, no changes are made
//     }

//     let calculatedAmount = currentAmount; // Start with the current amount

//     for (let year = purchaseYear; year <= currentYear; year++) {
//         // Fetch the share configuration for the year
//         const shareConfig = await savingsConfigSchema.findOne({ year: year });
//         if (!shareConfig) {
//             console.log(`No savings configuration found for year ${year}`);
//             break; // Break the loop and keep the calculated amount as is
//         }

//         const annualIncreaseRate = shareConfig.individualSharePercentage / 100; // Convert percentage to decimal

//         let yearFraction = 1; // Assume full year by default
//         if (year === purchaseYear) {
//             // Calculate fraction of the year for the purchase year
//             yearFraction = (new Date(year + 1, 0, 1) - purchaseDate) / (1000 * 60 * 60 * 24 * 365);
//         } else if (year === currentYear) {
//             // Calculate fraction of the year for the current year
//             yearFraction = (now - new Date(year, 0, 1)) / (1000 * 60 * 60 * 24 * 365);
//         }

//         // Calculate the amount considering the annual increase rate
//         calculatedAmount *= Math.pow(1 + annualIncreaseRate, yearFraction);
//     }

//     // Determine the difference
//     let difference = calculatedAmount - currentAmount;
//     console.log("This is the difference", difference);
//     // If the difference is significant, update the current amount
//     currentAmount += difference;

//     console.log(`Updated current amount for savings with initial amount ${this.initialAmount} is ${currentAmount.toFixed(2)}`);
//     return Number(currentAmount.toFixed(2));
// };

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
// savingsSchema.methods.calculateCurrentPrice = async function () {
//     const now = new Date();
//     let lastUpdateDate = this.lastUpdateDate ? new Date(this.lastUpdateDate) : this.date;
//     const timeSinceLastUpdate = now - lastUpdateDate;
//     const yearFractionSinceLastUpdate = timeSinceLastUpdate / (1000 * 60 * 60 * 24 * 365);

//     if (this.withdrawn) {
//         return this.currentAmount;
//     }
//     console.log(now.getFullYear())
//     if (yearFractionSinceLastUpdate > 0) {
//         const shareConfig = await savingsConfigSchema.findOne({ year: this.year });
//         console.log(shareConfig);
//         if (!shareConfig) {
//             console.log(`No savings configuration found for this year.`);
//             this.lastUpdateDate = now;
//             await this.save();
//             return this.currentAmount;
//         }

//         const annualIncreaseRate = shareConfig.individualSharePercentage / 100;
//         let calculatedAmount = this.currentAmount * Math.pow(1 + annualIncreaseRate, yearFractionSinceLastUpdate);

//         if (calculatedAmount > 1000) {
//             const excessAmount = calculatedAmount - 1000;
//             calculatedAmount = 1000; // Reset currentAmount to 1000

//             let amanat;
//             if (this.amanat) {
//                 amanat = await Amanat.findById(this.amanat);
//             } else {
//                 amanat = new Amanat({ amount: 0, date: new Date() });
//             }

//             amanat.amount += excessAmount;
//             await amanat.save();

//             // Update the reference
//             this.amanat = amanat._id;
//         }

//         this.currentAmount = calculatedAmount;
//         this.lastUpdateDate = now;
//         await this.save();
//     }

//     return this.currentAmount;
// };
// savingsSchema.methods.calculateCurrentPrice = async function () {
//     const now = new Date();

//     if (this.withdrawn) {
//         return this.deposits.reduce((total, deposit) => total + deposit.currentAmount, 0);
//     }

//     const shareConfig = await savingsConfigSchema.findOne({ year: this.year });
//     if (!shareConfig) {
//         console.log(`No savings configuration found for this year.`);
//         return this.deposits.reduce((total, deposit) => total + deposit.currentAmount, 0);
//     }

//     const annualIncreaseRate = shareConfig.individualSharePercentage / 100;

//     for (const deposit of this.deposits) {
//         let lastUpdateDate = deposit.lastUpdateDate ? new Date(deposit.lastUpdateDate) : deposit.date;
//         const timeSinceLastUpdate = now - lastUpdateDate;
//         const yearFractionSinceLastUpdate = timeSinceLastUpdate / (1000 * 60 * 60 * 24 * 365);

//         if (yearFractionSinceLastUpdate > 0) {
//             let calculatedAmount = deposit.currentAmount * Math.pow(1 + annualIncreaseRate, yearFractionSinceLastUpdate);

//             if (calculatedAmount > 1000) {
//                 const excessAmount = calculatedAmount - 1000;
//                 calculatedAmount = 1000;

//                 let amanat;
//                 if (this.amanat) {
//                     amanat = await Amanat.findById(this.amanat);
//                 } else {
//                     amanat = new Amanat({ amount: 0, date: new Date() });
//                 }

//                 amanat.amount += excessAmount;
//                 await amanat.save();

//                 this.amanat = amanat._id;
//             }

//             deposit.currentAmount = calculatedAmount;
//             deposit.lastUpdateDate = now;
//         }
//     }
//     this.totalAmount = this.deposits.reduce((total, deposit) => total + deposit.currentAmount, 0);

//     await this.save();
//     return this.deposits.reduce((total, deposit) => total + deposit.currentAmount, 0);
// };
// savingsSchema.methods.calculateCurrentPrice = async function () {
//     const now = new Date();

//     if (this.withdrawn) {
//         return this.deposits.reduce((total, deposit) => total + deposit.currentAmount, 0);
//     }

//     const shareConfig = await savingsConfigSchema.findOne({ year: this.year });
//     if (!shareConfig) {
//         console.log(`No savings configuration found for this year.`);
//         return this.deposits.reduce((total, deposit) => total + deposit.currentAmount, 0);
//     }

//     const annualIncreaseRate = shareConfig.individualSharePercentage / 100;

//     for (const deposit of this.deposits) {
//         let lastUpdateDate = deposit.lastUpdateDate ? new Date(deposit.lastUpdateDate) : deposit.date;

//         // Set the last update date to the first day of the next month after the deposit date
//         lastUpdateDate = new Date(lastUpdateDate.getFullYear(), lastUpdateDate.getMonth() + 1, 1);

//         const timeSinceLastUpdate = now - lastUpdateDate;
//         const yearFractionSinceLastUpdate = timeSinceLastUpdate / (1000 * 60 * 60 * 24 * 365);

//         if (yearFractionSinceLastUpdate > 0) {
//             let calculatedAmount = deposit.currentAmount * Math.pow(1 + annualIncreaseRate, yearFractionSinceLastUpdate);

//             if (calculatedAmount > 1000) {
//                 const excessAmount = calculatedAmount - 1000;
//                 calculatedAmount = 1000;

//                 let amanat;
//                 if (this.amanat) {
//                     amanat = await Amanat.findById(this.amanat);
//                 } else {
//                     amanat = new Amanat({ amount: 0, date: new Date() });
//                 }

//                 amanat.amount += excessAmount;
//                 await amanat.save();

//                 this.amanat = amanat._id;
//             }

//             deposit.currentAmount = calculatedAmount;
//             deposit.lastUpdateDate = now;
//         }
//     }

//     this.totalAmount = this.deposits.reduce((total, deposit) => total + deposit.currentAmount, 0);

//     await this.save();
//     return this.deposits.reduce((total, deposit) => total + deposit.currentAmount, 0);
// };
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
        let lastUpdateDate = deposit.lastUpdateDate ? new Date(deposit.lastUpdateDate) : deposit.date;

        // Set the last update date to the first day of the next month after the deposit date
        lastUpdateDate = new Date(lastUpdateDate.getFullYear(), lastUpdateDate.getMonth() + 1, 1);

        const timeSinceLastUpdate = now - lastUpdateDate;
        const yearFractionSinceLastUpdate = timeSinceLastUpdate / (1000 * 60 * 60 * 24 * 365);

        if (yearFractionSinceLastUpdate > 0) {
            let calculatedAmount = deposit.currentAmount * Math.pow(1 + annualIncreaseRate, yearFractionSinceLastUpdate);
            let interestAmount = calculatedAmount - deposit.currentAmount;

            this.savingsIncrease += interestAmount;

            if (calculatedAmount > 1000) {
                const excessAmount = calculatedAmount - 1000;
                calculatedAmount = 1000;

                let amanat;
                if (this.amanat) {
                    amanat = await Amanat.findById(this.amanat);
                } else {
                    amanat = new Amanat({ amount: 0, date: new Date() });
                }

                amanat.amount += excessAmount;
                await amanat.save();

                this.amanat = amanat._id;
            }

            deposit.lastUpdateDate = now;
        }
    }

    this.totalAmount = this.deposits.reduce((total, deposit) => total + deposit.currentAmount, 0);

    await this.save();
    console.log("This is what it returns", (this.totalAmount + this.savingsIncrease).toFixed(3))
    console.log("Savings Increase: " + this.savingsIncrease.toFixed(3))
    // return this.totalAmount + this.savingsIncrease;
    return this.savingsIncrease.toFixed(3)
};
module.exports = mongoose.model('Savings', savingsSchema);