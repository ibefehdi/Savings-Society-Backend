const User = require('../models/userSchema');
const bcrypt = require('bcrypt');
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;

exports.createUser = async (req, res) => {
    try {
        const sanitizedUser = {
            username: xss(req.body.username),
            password: await bcrypt.hash(req.body.password),
            fName: req.body.fName,
            lName: req.body.lName,
            isAdmin: req.body.isAdmin
        }
        const user = await User.create({ ...sanitizedUser })
        res.status(201).json({
            message: "Sign-up successfully.",
            username: user.username,
            fName: user.fName,
            lName: user.lName,
            _id: user._id
        });
    } catch (err) {
        console.log(err);

    }
}