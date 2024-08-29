const mongoose = require('mongoose');

exports.getLogs = async (req, res) => {
    try {
        // Connect to the MongoDB database
        const db = mongoose.connection.db;

        // Get the logs collection
        const logsCollection = db.collection('logs');

        // Query parameters for pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 100;
        const skip = (page - 1) * limit;

        // Query logs from MongoDB
        const logs = await logsCollection.find({})
            .sort({ timestamp: -1 }) // Sort by timestamp, most recent first
            .skip(skip)
            .limit(limit)
            .toArray();

        // Get total count for pagination
        const totalLogs = await logsCollection.countDocuments();

        res.json({
            logs,
            currentPage: page,
            totalPages: Math.ceil(totalLogs / limit),
            totalLogs
        });
    } catch (error) {
        console.error('Error fetching logs:', error);
        res.status(500).json({ message: 'Error fetching logs' });
    }
};

exports.searchLogs = async (req, res) => {
    try {
        const { url } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Connect to the MongoDB database
        const db = mongoose.connection.db;

        // Get the logs collection
        const logsCollection = db.collection('logs');

        // Create a query object
        const query = url ? { message: { $regex: url, $options: 'i' } } : {};

        // Query logs from MongoDB
        const logs = await logsCollection.find(query)
            .sort({ timestamp: -1 }) // Sort by timestamp, most recent first
            .skip(skip)
            .limit(limit)
            .toArray();

        // Get total count for pagination
        const totalLogs = await logsCollection.countDocuments(query);

        res.json({
            logs,
            currentPage: page,
            totalPages: Math.ceil(totalLogs / limit),
            totalLogs
        });
    } catch (error) {
        console.error('Error searching logs:', error);
        res.status(500).json({ message: 'Error searching logs' });
    }
};