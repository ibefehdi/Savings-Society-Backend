const mongoose = require('mongoose');
const Workplace = require('../models/workplaceSchema');

exports.getAllWorkplace = async (req, res) => {
    try {
        const workplace = await Workplace.find();
        const count = await Workplace.countDocuments();
        res.status(200).send({ data: workplace, count: count, metadata: { total: count } });
    } catch (e) {
        res.status(404).send({ status: '2', response: e, message: "Couldn't find workplace" })
    }
}
exports.getAllWorkplaceDropdown = async (req, res) => {
    try {
        const workplace = await Workplace.find();
        res.status(200).send({ data: workplace });
    } catch (e) {
        res.status(404).send({ status: '2', response: e, message: "Couldn't find workplace" })
    }
}

exports.createWorkplace = async (req, res) => {
    try {
        const { id, description, nameArabic } = req.body;
        console.log(id)
        // Create a new Workplace document
        const newWorkplace = new Workplace({
            id,
            description,
            nameArabic
        });

        // Save the new workplace to the database
        await newWorkplace.save();
        console.log(newWorkplace);
        // Send a response back to the client
        res.status(201).send({
            message: 'Workplace created successfully',
            workplace: newWorkplace
        });
    } catch (error) {
        res.status(500).send({
            message: 'Failed to create workplace',
            error: error.message
        });
    }
};
