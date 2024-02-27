const express = require('express');
const router = express.Router();

const { createUser, getUserCount, getAllUsers, loginUser, editUser, deactivateUser } = require('../controllers/userController');
const validateRequiredFields = require('../middleware/middleware');
const { joiUserSchema } = require("../validationModels/joiModels")
/**
 * @openapi
 * /api/v1/userscount:
 *   get:
 *     summary: Returns the count of users
 *     parameters:
 *       - in: header
 *         name: app-version
 *         required: true
 *         schema:
 *           type: string
 *         description: Client application version.
 *     responses:
 *       200:
 *         description: An integer value representing the total count of users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                   example: 10
 *       409:
 *         description: App version mismatch. Please refresh or reload the application.
 */
//GET Routes
router.get('/userscount/', getUserCount);
/**
 * @openapi
 * /api/v1/users:
 *   get:
 *     summary: Returns the count of users
 *     parameters:
 *       - in: header
 *         name: app-version
 *         required: true
 *         schema:
 *           type: string
 *         description: Client application version.
 *     responses:
 *       200:
 *         description: The List of users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                   example: 10
 *       409:
 *         description: App version mismatch. Please refresh or reload the application.
 */
router.get('/users/', getAllUsers)
router.get('/deleteuser/:id', deactivateUser)
//POST Routes
router.post('/users/signup', validateRequiredFields(joiUserSchema), createUser);
router.post('/users/signin', loginUser)

//PUT Routes
router.put('/user/:id', editUser);

module.exports = router;