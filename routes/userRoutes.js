const express = require('express');
const router = express.Router();

const { createUser, getUserCount, getAllUsers } = require('../controllers/userController');
const validateRequiredFields = require('../middleware/middleware');
const { joiUserSchema } = require("../validationModels/joiModels")

//GET Routes
router.get('/userscount/', getUserCount);
router.get('/users/', getAllUsers)
//POST Routes
router.post('/users/signup', validateRequiredFields(joiUserSchema), createUser);

module.exports = router;