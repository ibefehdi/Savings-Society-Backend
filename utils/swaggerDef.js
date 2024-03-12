const swaggerDefinition = {
    openapi: '3.0.0',
    info: {
        title: 'Express API for Shareholder Application',
        version: '1.0.0',
        description: 'This is a REST API application made with Express. It retrieves data from Shareholder database.',
    },
    servers: [
        {
            url: 'http://localhost:7000',
            description: 'Development server',
        },
    ],
};

module.exports = swaggerDefinition;
