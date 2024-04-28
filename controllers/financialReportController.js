const Shareholder = require('../models/shareholderSchema');

const xss = require('xss');

exports.getAllShareholderReport = async (req, res) => {
    try {
        const { year } = req.query;
        const queryConditions = {};

        // Retrieve all shareholders from the database with populated fields
        let shareholders;
        if (year) {
            shareholders = await Shareholder.find(queryConditions)
                .populate('share')
                .populate({ path: 'savings', populate: { path: 'amanat', model: 'Amanat' } })
                .populate({ path: 'share', match: { year: year } });
        } else {
            shareholders = await Shareholder.find(queryConditions)
                .populate('share')
                .populate({ path: 'savings', populate: { path: 'amanat', model: 'Amanat' } });
        }

        // Prepare an array to store the financial reporting for each shareholder
        const financialReports = shareholders.map(shareholder => {
            const { _id, membersCode, civilId, fName, lName, share, savings } = shareholder;

            // Calculate the total share increase and current amount
            let totalShareIncrease = 0;
            let totalShareCurrentAmount = 0;
            const shareDetails = share.map(entry => {
                const { initialAmount, currentAmount, year } = entry;
                const shareIncrease = currentAmount - initialAmount;
                totalShareIncrease += shareIncrease;
                totalShareCurrentAmount += currentAmount;
                return { initialAmount, currentAmount, year };
            });

            // Calculate the savings increase
            let savingsIncrease = 0;
            let savingsCurrentAmount = 0;
            if (savings) {
                savingsIncrease = savings.currentAmount - savings.initialAmount;
                savingsCurrentAmount = savings.currentAmount;
            }

            // Calculate the amanat amount
            let amanatAmount = 0;
            if (savings && savings.amanat) {
                amanatAmount = savings.amanat.amount;
            }

            // Calculate the total
            const total = totalShareCurrentAmount + savingsCurrentAmount + amanatAmount;

            // Prepare the financial reporting object for the shareholder
            return {
                _id,
                membersCode,
                civilId,
                savingsDetails: savings || {},
                shareDetails,
                fullName: `${fName} ${lName}`,
                totalShareIncrease,
                totalShareCurrentAmount,
                savingsIncrease,
                savingsCurrentAmount,
                amanatAmount,
                total,
            };
        });
        const count = shareholders.length;


        res.json({
            data: financialReports,
            count: count,
            metadata: { total: count }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

exports.getAllShareholderByYear = async (req, res) => {
    try {
        // Pagination setup
        const page = parseInt(req.query.page, 10) || 1;
        const resultsPerPage = parseInt(req.query.resultsPerPage, 10) || 10;
        const skip = (page - 1) * resultsPerPage;

        // Extract year from query
        const year = parseInt(req.query.year) || new Date().getFullYear();
        if (!year) {
            return res.status(400).send({ message: "Year is required." });
        }

        // Setting up the date range for the query
        const startDate = new Date(year, 0, 1); // January 1 of the year
        const endDate = new Date(year + 1, 0, 1); // January 1 of the next year

        // Query to find shareholders by join date within the year
        const queryConditions = {
            joinDate: {
                $gte: startDate,
                $lt: endDate
            }
        };

        // Execute the query with pagination
        const shareholders = await Shareholder.find(queryConditions).populate('share').populate({
            path: 'savings',
            populate: {
                path: 'amanat',
                model: 'Amanat'
            }
        })
            .populate({
                path: 'share',
                // match: { year: year }
            })
            .skip(skip)
            .limit(resultsPerPage);

        console.log(shareholders)
        const count = shareholders.length;
        // Prepare an array to store the financial reporting for each shareholder
        const financialReports = shareholders.map(shareholder => {
            const { _id, membersCode, civilId, fName, lName, share, savings } = shareholder;

            // Calculate the total share increase and current amount
            let totalShareIncrease = 0;
            let totalShareCurrentAmount = 0;
            const shareDetails = share.map(entry => {
                const { initialAmount, currentAmount, year } = entry;
                const shareIncrease = currentAmount - initialAmount;
                totalShareIncrease += shareIncrease;
                totalShareCurrentAmount += currentAmount;
                return { initialAmount, currentAmount, year };
            });

            // Calculate the savings increase
            let savingsIncrease = 0;
            let savingsCurrentAmount = 0;
            if (savings) {
                savingsIncrease = savings.currentAmount - savings.initialAmount;
                savingsCurrentAmount = savings.currentAmount;
            }

            // Calculate the amanat amount
            let amanatAmount = 0;
            if (savings && savings.amanat) {
                amanatAmount = savings.amanat.amount;
            }

            // Calculate the total
            const total = totalShareCurrentAmount + savingsCurrentAmount + amanatAmount;

            // Prepare the financial reporting object for the shareholder
            return {
                _id,
                membersCode,
                civilId,
                savingsDetails: savings || {},
                shareDetails,
                fullName: `${fName} ${lName}`,
                totalShareIncrease,
                totalShareCurrentAmount,
                savingsIncrease,
                savingsCurrentAmount,
                amanatAmount,
                total,
            };
        });
        res.status(200).send({
            data: financialReports,
            count: count,
            metadata: { total: count }
        });
    } catch (err) {
        console.error('Aggregation error:', err);
        res.status(500).send({ message: err.message });
    }
};
exports.getShareholderFinancialReport = async (req, res) => {
    try {
        const id = req.params.id;
        const shareholder = await Shareholder.find({ _id: id }).populate('share').populate({
            path: 'savings',
            populate: {
                path: 'amanat',
                model: 'Amanat'
            }
        });
        res.status(200).send({
            data: shareholder
        })
    } catch (err) {
        console.error('Aggregation error:', err);
        res.status(500).send({ message: err.message });
    }
}
exports.getAllQuitShareholderByYear = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const resultsPerPage = parseInt(req.query.resultsPerPage, 10) || 10;
        const skip = (page - 1) * resultsPerPage;

        const year = parseInt(req.query.year) || new Date().getFullYear();
        if (!year) {
            return res.status(400).send({ message: "Year is required." });
        }

        const startDate = new Date(year, 0, 1);
        const endDate = new Date(year + 1, 0, 1);

        const queryConditions = {
            quitDate: {
                $gte: startDate,
                $lt: endDate
            }
        };

        const shareholders = await Shareholder.find(queryConditions).populate('share').populate({
            path: 'savings',
            populate: {
                path: 'amanat',
                model: 'Amanat'
            }
        })
            .populate({
                path: 'share',
            })
            .skip(skip)
            .limit(resultsPerPage);

        // Count total documents matching the query
        const count = shareholders.length;
        // Prepare an array to store the financial reporting for each shareholder
        const financialReports = shareholders.map(shareholder => {
            const { _id, membersCode, civilId, fName, lName, share, savings } = shareholder;

            // Calculate the total share increase and current amount
            let totalShareIncrease = 0;
            let totalShareCurrentAmount = 0;
            const shareDetails = share.map(entry => {
                const { initialAmount, currentAmount, year } = entry;
                const shareIncrease = currentAmount - initialAmount;
                totalShareIncrease += shareIncrease;
                totalShareCurrentAmount += currentAmount;
                return { initialAmount, currentAmount, year };
            });

            // Calculate the savings increase
            let savingsIncrease = 0;
            let savingsCurrentAmount = 0;
            if (savings) {
                savingsIncrease = savings.currentAmount - savings.initialAmount;
                savingsCurrentAmount = savings.currentAmount;
            }

            // Calculate the amanat amount
            let amanatAmount = 0;
            if (savings && savings.amanat) {
                amanatAmount = savings.amanat.amount;
            }

            // Calculate the total
            const total = totalShareCurrentAmount + savingsCurrentAmount + amanatAmount;

            // Prepare the financial reporting object for the shareholder
            return {
                _id,
                membersCode,
                civilId,
                savingsDetails: savings || {},
                shareDetails,
                fullName: `${fName} ${lName}`,
                totalShareIncrease,
                totalShareCurrentAmount,
                savingsIncrease,
                savingsCurrentAmount,
                amanatAmount,
                total,
            };
        });

        res.status(200).send({
            data: financialReports,
            count: count,
            metadata: { total: count }
        });
    } catch (err) {
        console.error('Aggregation error:', err);
        res.status(500).send({ message: err.message });
    }
};
exports.getAllShareholdersByWorkplace = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const resultsPerPage = parseInt(req.query.resultsPerPage, 10) || 10;
        const skip = (page - 1) * resultsPerPage;
        const workplace = req.query.workplace;
        const queryConditions = {
            workplace: workplace
        };
        const shareholders = await Shareholder.find(queryConditions).populate('share').populate({
            path: 'savings',
            populate: {
                path: 'amanat',
                model: 'Amanat'
            }
        })
            .populate({
                path: 'share',
            })
            .skip(skip)
            .limit(resultsPerPage);

        // Count total documents matching the query
        const count = shareholders.length;
        // Prepare an array to store the financial reporting for each shareholder
        const financialReports = shareholders.map(shareholder => {
            const { _id, membersCode, civilId, fName, lName, share, savings } = shareholder;

            // Calculate the total share increase and current amount
            let totalShareIncrease = 0;
            let totalShareCurrentAmount = 0;
            const shareDetails = share.map(entry => {
                const { initialAmount, currentAmount, year } = entry;
                const shareIncrease = currentAmount - initialAmount;
                totalShareIncrease += shareIncrease;
                totalShareCurrentAmount += currentAmount;
                return { initialAmount, currentAmount, year };
            });

            // Calculate the savings increase
            let savingsIncrease = 0;
            let savingsCurrentAmount = 0;
            if (savings) {
                savingsIncrease = savings.currentAmount - savings.initialAmount;
                savingsCurrentAmount = savings.currentAmount;
            }

            // Calculate the amanat amount
            let amanatAmount = 0;
            if (savings && savings.amanat) {
                amanatAmount = savings.amanat.amount;
            }

            // Calculate the total
            const total = totalShareCurrentAmount + savingsCurrentAmount + amanatAmount;

            // Prepare the financial reporting object for the shareholder
            return {
                _id,
                membersCode,
                civilId,
                savingsDetails: savings || {},
                shareDetails,
                fullName: `${fName} ${lName}`,
                totalShareIncrease,
                totalShareCurrentAmount,
                savingsIncrease,
                savingsCurrentAmount,
                amanatAmount,
                total,
            };
        });

        res.status(200).send({
            data: financialReports,
            count: count,
            metadata: { total: count }
        });


    } catch (err) {
        console.error('Aggregation error:', err);
        res.status(500).send({ message: err.message });
    }
}