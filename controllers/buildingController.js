const mongoose = require('mongoose');
const Building = require('../models/buildingSchema');
const Address = require('../models/addressSchema');
exports.createBuilding = async (req, res) => {
    try {
        const sanitizedAddress = {
            block: req.body.block,
            street: req.body.street,
            house: req.body.house,
            avenue: req.body.avenue,
            city: req.body.city,
        };
        const address = await Address.create(sanitizedAddress);
        const { name, floors, type } = req.body;

        // Find the last building in the database
        const lastBuilding = await Building.findOne().sort({ no: -1 });

        // Generate the new building's no based on the last building's no
        const newNo = lastBuilding ? parseInt(lastBuilding.no) + 1 : 1;

        const building = new Building({
            no: newNo.toString(),
            name,
            floors,
            address,
            type,
        });
        await building.save();
        res.status(201).json(building);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create building' });
    }
};

exports.getAllBuildings = async (req, res) => {
    try {
        const buildings = await Building.find({ type: { $in: ['Building', 'Bakala'] } }).populate('address').lean();
        const count = buildings.length;
        res.json({ data: buildings, count: count, metadata: { total: count } });
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve buildings' });
    }
};

exports.getAllHalls = async (req, res) => {
    try {
        const halls = await Building.find({ type: "Hall" }).populate('address').lean();
        const count = halls.length;
        res.json({ data: halls, count: count, metadata: { total: count } });

    }
    catch (error) {
        res.status(500).json({ error: 'Failed to retrieve buildings' });
    }
}
exports.getAllBuildingsDropdown = async (req, res) => {
    try {
        const buildings = await Building.find({ type: { $in: ['Building', 'Bakala'] } }).lean();

        res.json({ data: buildings });
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve buildings' });
    }
};
exports.getBuildingById = async (req, res) => {
    try {
        const building = await Building.findById(req.params.id).populate('address').lean();
        if (!building) {
            return res.status(404).json({ error: 'Building not found' });
        }
        res.json(building);
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve building' });
    }
};

exports.updateBuilding = async (req, res) => {
    try {
        const building = await Building.findById(req.params.id).populate('address');
        if (!building) {
            return res.status(404).json({ error: 'Building not found' });
        }

        const { name, floors, block, street, house, avenue, city } = req.body;

        // Update the building fields
        building.name = name || building.name;
        building.floors = floors || building.floors;

        // Update the address fields
        const addressFields = {
            block: block || building.address.block,
            street: street || building.address.street,
            house: house || building.address.house,
            avenue: avenue || building.address.avenue,
            city: city || building.address.city,
        };

        // Update the address document
        const updatedAddress = await Address.findByIdAndUpdate(
            building.address._id,
            addressFields,
            { new: true }
        );

        // Update the building with the updated address
        building.address = updatedAddress;
        await building.save();

        const updatedBuilding = await Building.findById(req.params.id).populate('address').lean();
        res.json(updatedBuilding);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update building' });
    }
};

exports.deleteBuilding = async (req, res) => {
    try {
        const building = await Building.findByIdAndDelete(req.params.id);
        if (!building) {
            return res.status(404).json({ error: 'Building not found' });
        }
        res.json({ message: 'Building deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete building' });
    }
};

exports.createBuildingBackup = async (req, res) => {
    try {
        const sanitizedAddress = {
            block: req.body.block,
            street: req.body.street,
            house: req.body.house,
            avenue: req.body.avenue,
            city: req.body.city,
        };
        const address = await Address.create(sanitizedAddress);
        const { no, name, floors, type } = req.body;
        const building = new Building({ no, name, floors, address, type });
        await building.save();
        res.status(201).json(building);
    } catch (err) {
        res.status(400).send({ status: 1, message: err.message })
    }
}