const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const passport = require("passport");
const cron = require('node-cron');
const session = require("express-session");
const LocalStrategy = require("passport-local").Strategy;
const User = require("./models/userSchema")
const userRoutes = require("./routes/userRoutes");
const shareholderRoutes = require("./routes/shareholderRoutes");
const shareConfigRoutes = require("./routes/shareConfigRoutes");
const savingConfigRoutes = require("./routes/savingsConfigRoutes");
const receiptVoucherSerialRoutes = require("./routes/receiptVoucherSerialRoutes");
const financialReportRoutes = require("./routes/financialReportRoutes");
const depositHistoryRoutes = require("./routes/depositHistoryRoutes");
const withdrawalHistoryRoutes = require("./routes/withdrawalHistoryRoutes")
const workplaceRoutes = require("./routes/workplaceRoutes")
const buildingRoutes = require("./routes/buildingRoutes")
const bookingRoutes = require("./routes/bookingRoutes")
const voucherRoutes = require("./routes/voucherRoutes");
const flatRoutes = require("./routes/flatRoutes");
const transactionRoutes = require("./routes/transactionRoutes")
const tenantRoutes = require("./routes/tenantRoutes")
const contractRoutes = require("./routes/contractRoutes");
const logger = require("./utils/winstonLogger")
const Share = require("./models/shareSchema");
const Saving = require("./models/savingsSchema");
const validateRequiredFields = require('./middleware/middleware');
const bcrypt = require("bcrypt");
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerDefinition = require('./utils/swaggerDef');
const Contract = require('./models/contractSchema')
const Voucher = require('./models/voucherSchema')
const schedule = require('node-schedule');
const path = require('path');

require('dotenv').config();
const options = {
    swaggerDefinition,
    apis: ['./routes/*.js'], // Adjust the path to your route files accordingly
};
const swaggerSpec = swaggerJsdoc(options);

const app = express();
app.use(bodyParser.json());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const mongoURI = process.env.MONGODB_CONNECTION_STRING;
const port = process.env.PORT || 8081;
function logRequestsAndResponses(req, res, next) {
    // Log the request details
    if (req.method === 'POST' || req.method === 'PUT') {
        // For POST requests, log the body as well
        logger.info(`Received ${req.method} request for ${req.url} with body: ${JSON.stringify(req.body)}`);
    } else {
        // For non-POST requests, just log the method and URL
        logger.info(`Received ${req.method} request for ${req.url}`);
    }

    // Save a reference to the original send function
    const originalSend = res.send;

    // Wrap the send function to intercept the response
    res.send = function (body) {
        // Log the response body here
        logger.info(`Response sent for ${req.method} ${req.url}: ${body}`);

        // Call the original send function with the body
        return originalSend.call(this, body);
    };

    next();
}

app.use(
    session({
        secret: process.env.PASSPORT_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            maxAge: 24 * 60 * 60 * 1000,
            secure: false,
            httpOnly: true,
        },
    })
);
const cronSchedule = process.env.SCHEDULER === 'DAILY' ? '* * * * *' : '59 23 L * *';
console.log(schedule)
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(mongoURI).then(() => console.log("Connected to MongoDB."))
    .catch((err) => console.log("Error connecting to MongoDB", err));

passport.use(
    new LocalStrategy(async function (username, password, done) {
        try {
            const user = await User.findOne({ username: username });
            if (!user) {
                return done(null, false, { status: 1, message: "Incorrect username." });
            }
            const match = await bcrypt.compare(password, user.password);
            if (!match) {
                return done(null, false, { status: 2, message: "Incorrect password." });
            }
            return done(null, user);
        } catch (err) {
            return done(err);
        }
    })
);

passport.serializeUser(function (user, done) {
    done(null, user.id);
});

passport.deserializeUser(async function (id, done) {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error);
    }
});
schedule.scheduleJob(cronSchedule, async () => {
    const shares = await Share.find();
    for (let share of shares) {
        try {
            const currentAmount = await share.calculateCurrentPrice();
            await Share.updateOne({ _id: share._id }, { $set: { currentAmount: currentAmount } });
        } catch (err) {
            console.error('Error updating share:', err);
        }
    }
    console.log('Updated current prices for all shares.');
    const savings = await Saving.find();
    for (let saving of savings) {
        try {
            const savingsIncrease = await saving.calculateCurrentPrice();
            console.log("This is the current amount", savingsIncrease);
            await Saving.updateOne({ _id: saving._id }, { $set: { savingsIncrease: savingsIncrease } });
        } catch (err) {
            console.error('Error updating share:', err);
        }
    }
    console.log('Updated current prices for all Savings.');
});
async function createVouchers() {
    try {
        const currentDate = new Date();
        const fiveDaysLater = new Date(currentDate);
        fiveDaysLater.setDate(currentDate.getDate() + 5);
        console.log('current date:', currentDate);
        console.log('five days later:', fiveDaysLater);

        // Find contracts where the collection day is 5 days away
        const contracts = await Contract.find({
            collectionDay: fiveDaysLater.getDate(),
            expired: false,
        }).populate('flatId').populate('tenantId');

        const vouchers = [];

        for (const contract of contracts) {
            // Check if a voucher has already been created for the current month
            const existingVoucher = await Voucher.findOne({
                buildingId: contract.flatId.buildingId,
                flatId: contract.flatId,
                tenantId: contract.tenantId,
                pendingDate: {
                    $gte: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
                    $lt: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1),
                },
            }).populate('flatId');
            console.log(existingVoucher)
            if (!existingVoucher) {
                // Create a new voucher if one doesn't exist for the current month
                const voucher = new Voucher({
                    buildingId: contract.flatId.buildingId,
                    flatId: contract.flatId,
                    tenantId: contract.tenantId,
                    amount: contract.rentAmount,
                    pendingDate: fiveDaysLater,
                    status: 'Pending',
                });

                vouchers.push(voucher);
                console.log(voucher);
            }
        }

        // Save the vouchers to the database
        await Voucher.insertMany(vouchers);
        console.log(`Created ${vouchers.length} vouchers.`);
    } catch (error) {
        console.error('Error creating vouchers:', error);
    }
}
schedule.scheduleJob('* * * * *', createVouchers);

app.use(logRequestsAndResponses);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));




app.use('/api/v1/', userRoutes);
app.use('/api/v1/', shareholderRoutes);
app.use('/api/v1/', shareConfigRoutes);
app.use('/api/v1/', savingConfigRoutes)
app.use('/api/v1/', financialReportRoutes);
app.use('/api/v1/', receiptVoucherSerialRoutes)
app.use('/api/v1/', depositHistoryRoutes)
app.use('/api/v1/', withdrawalHistoryRoutes)
app.use('/api/v1/', workplaceRoutes)
app.use('/api/v1/', buildingRoutes)
app.use('/api/v1/', flatRoutes)
app.use('/api/v1/', transactionRoutes)
app.use('/api/v1/', voucherRoutes)
app.use('/api/v1/', bookingRoutes)
app.use('/api/v1/', contractRoutes)
app.use('/api/v1/', tenantRoutes)
app.listen(port, '0.0.0.0', () => console.log(`Listening on port ${port}`));

