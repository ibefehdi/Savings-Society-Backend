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
const Share = require("./models/shareSchema");
const Saving = require("./models/savingsSchema");
const validateRequiredFields = require('./middleware/middleware');
const bcrypt = require("bcrypt");
require('dotenv').config();
const app = express();
app.use(bodyParser.json());
app.use(cors());
app.use(express.json());

const mongoURI = process.env.MONGODB_CONNECTION_STRING;
const port = process.env.PORT || 8081;

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
app.use(passport.initialize());
app.use(passport.session());
app.use((req, res, next) => {
    const clientVersion = req.headers['app-version'];
    const serverVersion = process.env.APP_VERSION || '1.0';

    if (clientVersion !== serverVersion) {
        return res.status(409).json({ error: 'App version mismatch. Please refresh or reload the application.' });
    }

    next();
});
mongoose.connect(mongoURI).then(() => console.log("Connected to MongoDB"))
    .catch((err) => console.log("Error connecting to MongoDB", err));

passport.use(
    new LocalStrategy(async function (username, password, done) {
        try {
            const user = await User.findOne({ username: username });
            if (!user) {
                return done(null, false, { message: "Incorrect username." });
            }
            const match = await bcrypt.compare(password, user.password);
            if (!match) {
                return done(null, false, { message: "Incorrect password." });
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

passport.deserializeUser(function (id, done) {
    User.findById(id, function (err, user) {
        done(err, user);
    });
});
cron.schedule('* * * * *', async () => {
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
            const currentAmount = await saving.calculateCurrentPrice();
            await Saving.updateOne({ _id: saving._id }, { $set: { currentAmount: currentAmount } });
        } catch (err) {
            console.error('Error updating share:', err);
        }
    }
    console.log('Updated current prices for all Savings.');
});

app.use('/api/v1/', userRoutes);
app.use('/api/v1/', shareholderRoutes);
app.listen(port, '0.0.0.0', () => console.log(`Listening on port ${port}`));