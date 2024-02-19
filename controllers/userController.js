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
            lName: sanitizeInput(req.body.lName),
            isActive: true,
            isAdmin: req.body.isAdmin,
            phoneNo: sanitizeInput(req.body.phoneNo),
            email: sanitizeInput(req.body.email),
        }
        const user = await User.create({ ...sanitizedUser })
        res.status(201).json({
            message: "Sign-up successfully.",
            username: user.username,
            fName: user.fName,
            lName: user.lName,
            isActive: user.isActive,
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
exports.loginUser = async (req, res, next) => {
    passport.authenticate("local", async function (err, user, info) {
        if (err) {
            return next(err);
        }
        if (!user) {
            if (info.message === "Incorrect username.") {
                // Send back a specific code for 'username does not exist'
                return res.status(401).json({ code: 0, message: info.message });
            } else if (info.message === "Incorrect password.") {
                // Send back a specific code for 'wrong password'
                return res.status(401).json({ code: 1, message: info.message });
            } else {
                // For any other authentication failure
                return res.status(401).json({ code: 2, message: info.message });
            }
        }
        // Check if user is active
        if (!user.isActive) {
            // User is not active, send back an error
            return res.status(401).json({ code: 3, message: "User not active." });
        }
        req.logIn(user, async function (err) {
            if (err) {
                return next(err);
            }
            return res.status(200).json({
                message: "Authenticated successfully.",
                username: user.username,
                fName: user.fName,
                lName: user.lName,
                isAdmin: user.isAdmin,
                phoneNo: user.phoneNo,
                permissions: user.permissions,
                _id: user._id
            });
        });
    })(req, res, next);
};
exports.deactivateUser = async (req, res) => {
    try {
        const userId = req.body.userId;
        const user = await User.findByIdAndUpdate({ _id: userId }, { isActive: false }, { new: true });
        if (!user) {
            res.status(404).json({ code: 1, message: "User Not Found." })
        }
        res.status(200).json({ code: 0, message: "User Deleted successfully." });
    } catch (err) {
        res.status(500).json({ code: 2, message: err.message })
    }
}
exports.getAllUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const resultsPerPage = parseInt(req.query.resultsPerPage, 10) || 10;
        const skip = (page - 1) * resultsPerPage;
        const users = await User.find({ isActive: true }, {
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
exports.editUser = async (req, res) => {
    const { id } = req.params; // Assuming the user's ID is passed as a URL parameter

    try {
        // Prepare the user update object, sanitizing inputs as needed
        const updates = {
            ...(req.body.username && { username: sanitizeInput(req.body.username) }),
            ...(req.body.password && { password: await bcrypt.hash(req.body.password, 10) }), // Hash new password
            ...(req.body.fName && { fName: sanitizeInput(req.body.fName) }),
            ...(req.body.lName && { lName: sanitizeInput(req.body.lName) }),
            ...(req.body.isActive !== undefined && { isActive: req.body.isActive }), // Explicit check for boolean
            ...(req.body.isAdmin !== undefined && { isAdmin: req.body.isAdmin }), // Explicit check for boolean
            ...(req.body.phoneNo && { phoneNo: sanitizeInput(req.body.phoneNo) }),
            ...(req.body.email && { email: sanitizeInput(req.body.email) }),
        };

        // Find the user by id and update their information
        const user = await User.findByIdAndUpdate(id, updates, { new: true }); // {new: true} to return the updated object

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Respond with updated user information, excluding sensitive fields like password
        res.status(200).json({
            message: "User updated successfully.",
            username: user.username,
            fName: user.fName,
            lName: user.lName,
            isActive: user.isActive,
            _id: user._id
        });
    } catch (err) {
        console.error('Error updating user:', err);
        res.status(500).json({ message: "Error updating user: " + err.message });
    }
};