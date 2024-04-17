const Joi = require('joi');

const joiUserSchema = Joi.object({
    username: Joi.string().required(),
    password: Joi.string().required(),
    fName: Joi.string().required(),
    lName: Joi.string().required(),
    isAdmin: Joi.boolean().default(null),
    phoneNo: Joi.string().default(null),
    email: Joi.string(),
    permissions: Joi.object({
        shareholder: Joi.object({
            create: Joi.boolean().default(false).default(null),
            view: Joi.boolean().default(false).default(null),
            edit: Joi.boolean().default(false).default(null),
            delete: Joi.boolean().default(false).default(null)
        }),
        user: Joi.object({
            create: Joi.boolean().default(false).default(null),
            view: Joi.boolean().default(false).default(null),
            edit: Joi.boolean().default(false).default(null),
            delete: Joi.boolean().default(false).default(null)
        }),
        amanat: Joi.object({
            create: Joi.boolean().default(false).default(null),
            view: Joi.boolean().default(false).default(null),
            edit: Joi.boolean().default(false).default(null),
            delete: Joi.boolean().default(false).default(null)
        }),
        deposit: Joi.object({
            share: Joi.boolean().default(false).default(null),
            savings: Joi.boolean().default(false).default(null),
        }),
        withdrawal: Joi.object({
            share: Joi.boolean().default(false).default(null),
            savings: Joi.boolean().default(false).default(null),
        }),
        financialConfiguration: Joi.object({
            share: Joi.boolean().default(false).default(null),
            savings: Joi.boolean().default(false).default(null),
        }),
    })
});
const joiShareholderSchema = Joi.object({
    fName: Joi.string().required(),
    lName: Joi.string().required(),
    arabFName: Joi.string(),
    arabLName: Joi.string(),
    dob: Joi.string().required(),
    quitDate: Joi.string(),
    joinDate: Joi.string().required(),
    civilId: Joi.string().required(),
    status: Joi.number().required(),
    adminId: Joi.array().required(),
    ibanNumber: Joi.string(),
    block: Joi.string(),
    mobileNumber: Joi.string(),
    street: Joi.string(),
    house: Joi.string(),
    city: Joi.string(),
    email: Joi.string(),
    poBox: Joi.string(),
    zipCode: Joi.string(),
    shareAmount: Joi.number(),
    shareInitialPrice: Joi.number(),
    savingsInitialPrice: Joi.number(),
    area: Joi.string(),
    country: Joi.string(),
    gender: Joi.string(),
})
module.exports.joiUserSchema = joiUserSchema;
module.exports.joiShareholderSchema = joiShareholderSchema