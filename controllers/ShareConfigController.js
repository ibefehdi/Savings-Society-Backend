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
exports.EditShareConfig = async (req, res) => {
    try {
        const id = req.params.id; // Get the document id from the request parameters
        const newConfig = req.body.individualSharePercentage; // Get the new share percentage from the request body

        // Update the document
        const shareConfig = await ShareConfig.findByIdAndUpdate(
            id,
            { individualSharePercentage: newConfig },
            { new: true } // Option to return the document after update
        );

        if (!shareConfig) {
            return res.status(404).send({ message: 'Share configuration not found.' });
        }

        // Send back the updated document or a success message
        res.send({ message: 'Share configuration updated successfully.', shareConfig: shareConfig });
    } catch (error) {
        // Handle possible errors
        res.status(500).send({ message: 'Failed to edit the share configuration.', error: error.toString() });
    }
}
exports.GetAllShareConfigs = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const resultsPerPage = parseInt(req.query.resultsPerPage, 10) || 10;
        const skip = (page - 1) * resultsPerPage;
        // Retrieve all documents from the ShareConfig collection
        const shareConfigs = await ShareConfig.find({}).skip(skip)
            .limit(resultsPerPage);

        // Check if documents exist
        if (!shareConfigs || shareConfigs.length === 0) {
            return res.status(404).send({ message: 'No share configurations found.' });
        }
        const count = await ShareConfig.countDocuments().skip(skip)
            .limit(resultsPerPage);
        // Send back the retrieved documents
        res.status(200).json({ data: shareConfigs, count: count, metadata: { total: count } });
    } catch (error) {
        // Handle possible errors
        res.status(500).send({ message: 'Failed to retrieve share configurations.', error: error.toString() });
    }
}
