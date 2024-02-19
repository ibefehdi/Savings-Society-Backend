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
    withdrawn: Boolean,

}, { timestamps: true });

// Calculate the current amount based on the initial amount and the time elapsed
shareSchema.methods.calculateCurrentPrice = async function () {
    const now = new Date();
    const purchaseDate = this.date;
    const purchaseYear = purchaseDate.getFullYear();
    const currentYear = now.getFullYear();
    const withdrawn = this.withdrawn;
    let currentAmount = this.initialAmount;

    for (let year = purchaseYear; year <= currentYear; year++) {
        // Fetch the share configuration for the year
        const shareConfig = await shareConfigSchema.findOne({ year: year });
        if (!shareConfig) {
            console.log(`No share configuration found for year ${year}`);
            return currentAmount; // Return the initial amount if no config is found for the purchase year
        }
        if (withdrawn) {
            console.log('The user has withdrawn the share')
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

    console.log(`Current amount for share with initial amount ${this.initialAmount} is ${currentAmount.toFixed(2)}`);

    return currentAmount;
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
