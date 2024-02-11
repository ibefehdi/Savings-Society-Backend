const User = require('../models/userSchema');
const xss = require('xss');
const bcrypt = require('bcrypt');
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
function sanitizeInput(input) {
    return xss(input);
}
exports.createUser = async (req, res) => {
    try {
        const sanitizedUser = {
            username: sanitizeInput(req.body.username),
            password: await bcrypt.hash(req.body.password, 10),
            fName: sanitizeInput(req.body.fName),
            lName: req.body.lName,
            isAdmin: req.body.isAdmin,
            phoneNo: req.body.phoneNo,
            email: req.body.email,
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
        res.status(500).json("Message: " + err.message)

    }
}
exports.getUserCount = async (req, res) => {
    try {
        const count = await User.countDocuments()
        res.status(200).json({
            count: count
        })
    } catch (err) {
        res.status(500).json("Message: " + err.message)
    }
}

exports.getAllUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const resultsPerPage = parseInt(req.query.resultsPerPage, 10) || 10;
        const skip = (page - 1) * resultsPerPage;
        const users = await User.find({}, {
            _id: 1,
            username: 1,
            fName: 1,
            lName: 1,
            isAdmin: 1,
        }).skip(skip)
            .limit(resultsPerPage);
        const count = await User.countDocuments().skip(skip)
            .limit(resultsPerPage);

        res.status(200).json({ data: users, count: count, metadata: { total: count } })
    } catch (err) {
        res.status(500).json("Message: " + err.message)

    }
}