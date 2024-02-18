const ShareConfig = require('../models/shareConfigSchema')

exports.CreateShareConfig = async (req, res) => {
    const { year, individualSharePercentage } = req.body;

    // Check if the configuration for the year already exists
    const existingConfig = await ShareConfig.findOne({ year: year });
    if (existingConfig) {
        return res.status(400).send({ message: 'Configuration for this year already exists.' });
    }

    // Create a new ShareConfig document
    const shareConfig = new ShareConfig({
        year,
        individualSharePercentage
    });

    try {
        // Save the new ShareConfig document to the database
        const savedConfig = await shareConfig.save();
        res.status(201).send(savedConfig);
    } catch (error) {
        // Handle possible saving errors
        res.status(500).send({ message: 'Failed to save the share configuration.', error: error });
    }
}
