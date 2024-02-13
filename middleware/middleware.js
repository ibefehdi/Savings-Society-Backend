const Joi = require('joi');

function validateRequiredFields(schema) {
    return (req, res, next) => {
        const validationResult = schema.validate(req.body, { abortEarly: false });

        if (validationResult.error) {
            const missingFields = validationResult.error.details.map(detail => detail.context.key);
            res.status(400).json({
                error: 'Missing required fields - الحقول الإلزامية مفقودة',
                missing: missingFields
            });
        } else {
            next();
        }
    };
}
module.exports = validateRequiredFields;