const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const passport = require("passport");
const session = require("express-session");
const LocalStrategy = require("passport-local").Strategy;
const User = require("./models/userSchema")
const userRoutes = require("./routes/userRoutes");

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
mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log("Connected to MongoDB"))
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
app.use('/api/v1/', userRoutes);

app.listen(port, '0.0.0.0', () => console.log(`Listening on port ${port}`));