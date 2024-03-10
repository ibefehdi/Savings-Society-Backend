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

const shareSchema = new mongoose.Schema({
    amount: { type: Number },
    initialAmount: { type: Number },
    currentAmount: { type: Number },
    date: { type: Date },
    year: { type: Number },
    serial: { type: String },
    adminId: [adminIdSchema],
    timeSinceLastUpdate: { type: Date },
    withdrawn: Boolean,

}, { timestamps: true });

// Calculate the current amount based on the initial amount and the time elapsed
shareSchema.methods.calculateCurrentPrice = async function () {
    const now = new Date();
    const purchaseDate = this.date;
    const currentYear = now.getFullYear();
    const withdrawn = this.withdrawn;
    let currentAmount = this.currentAmount;

    if (withdrawn) {
        return currentAmount; 
    }

    let lastUpdateDate = this.lastUpdateDate ? new Date(this.lastUpdateDate) : purchaseDate;
    // Calculate time since last update in fraction of a year
    const timeSinceLastUpdate = now - lastUpdateDate;
    const yearFractionSinceLastUpdate = timeSinceLastUpdate / (1000 * 60 * 60 * 24 * 365);
    // const yearFractionSinceLastUpdate = 1

    // Only proceed if there is a fraction of the year to calculate
    if (yearFractionSinceLastUpdate > 0) {
        const shareConfig = await shareConfigSchema.findOne({ year: currentYear });
        if (!shareConfig) {
            console.log(`No share configuration found for year ${currentYear}`);
            // Even if there's no config for the current year, update lastUpdateDate to prevent repeated application
            this.lastUpdateDate = now;
            await this.save();
            return currentAmount; // Return the unchanged amount
        }

        //const annualIncreaseRate = shareConfig.individualSharePercentage; 
        const annualIncreaseRate = shareConfig.individualSharePercentage / 100;

        // Apply the calculated rate based on the time since the last update
        let calculatedAmount = currentAmount * Math.pow(1 + annualIncreaseRate, yearFractionSinceLastUpdate);

        // Determine the difference and update if necessary
        let difference = calculatedAmount - currentAmount;
        console.log("This is the difference", difference);

        currentAmount = calculatedAmount;

        // Update lastUpdateDate to now
        this.lastUpdateDate = now;

        console.log(`Updated current amount for Shares with initial amount ${this.initialAmount} is ${currentAmount.toFixed(2)}`);
    } else {
        console.log(`No time has passed since the last update, current amount remains ${currentAmount.toFixed(2)}`);
    }

    // Save any changes to the database
    await this.save();

    // Return the updated (or unchanged) current amount, rounded and converted to a number
    return Number(currentAmount);
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
