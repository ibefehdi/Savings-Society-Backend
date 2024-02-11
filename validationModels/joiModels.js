const Joi = require('joi');

const joiUserSchema = Joi.object({
    username: Joi.string().required(),
    password: Joi.string().required(),
    fName: Joi.string().required(),
    lName: Joi.string().required(),
    isAdmin: Joi.boolean().default(null),
    permissions: Joi.object({
        shareholder: Joi.object({
            create: Joi.boolean().default(false).default(null),
            view: Joi.boolean().default(false).default(null),
            edit: Joi.boolean().default(false).default(null),
            delete: Joi.boolean().default(false).default(null)
        })
    })
});
module.exports = joiUserSchema;