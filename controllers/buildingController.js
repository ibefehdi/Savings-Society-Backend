const mongoose = require('mongoose');
const Building = require('../models/buildingSchema');
const Address = require('../models/addressSchema');
const { stringify } = require('csv-stringify');
const ExcelJS = require('exceljs');

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
exports.getAllBuildingsFormatted = async (req, res) => {
    try {
        const buildings = await Building.find({ type: { $in: ['Building', 'Bakala'] } })
            .populate('address')
            .lean();

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Buildings');

        worksheet.columns = [
            { header: 'رقم المبنى', key: 'buildingNo', width: 15 },
            { header: 'اسم المبنى', key: 'buildingName', width: 20 },
            { header: 'عدد الطوابق', key: 'floors', width: 15 },
            { header: 'النوع', key: 'type', width: 15 },
            { header: 'العنوان', key: 'address', width: 30 }
        ];

        // Function to format date as dd/mm/yyyy (if needed in the future)
        const formatDate = (date) => {
            if (!date) return 'N/A';
            const d = new Date(date);
            return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
        };

        // Add data rows
        buildings.forEach((building) => {
            worksheet.addRow({
                buildingNo: building.no || 'N/A',
                buildingName: building.name || 'N/A',
                floors: building.floors || 'N/A',
                type: building.type || 'N/A',
                address: building.address ? `Block ${building.address.block}, Street ${building.address.street}, House ${building.address.house}` : 'N/A'
            });
        });

        // Style the header row
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

        // Set text direction for the entire sheet to RTL
        worksheet.views = [
            { rightToLeft: true }
        ];

        // Generate Excel file
        const buffer = await workbook.xlsx.writeBuffer();

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="buildings.xlsx"');
        res.send(buffer);

    } catch (err) {
        res.status(500).send({ message: err.message });
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
exports.getAllBuildingCount = async (req, res) => {
    try {
        const count = await Building.countDocuments();
        res.status(200).send({ count: count });
    } catch (error) {
        res.status(500).json({ message: "Error fetching active tenants", error: error.message });
    }
}
exports.getAllBuildingsDropdown = async (req, res) => {
    try {
        const buildings = await Building.find().lean();

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