const winston = require('winston');
require('dotenv').config();
const mongoURI = process.env.MONGODB_CONNECTION_STRING;
require('winston-mongodb');
const logger = winston.createLogger({
    transports: [
        new winston.transports.MongoDB({
            level: 'info', // Level of messages that this transport should log
            // MongoDB connection settings
            db: mongoURI, // Replace with your MongoDB connection string
            options: {
                useUnifiedTopology: true,
            },
            collection: 'logs', // Collection to store logs
            format: winston.format.combine(
                winston.format.timestamp(), // Add timestamp to logs
                winston.format.json() // Use JSON format for logs
            ),
        }),
    ],
});
module.exports = logger;