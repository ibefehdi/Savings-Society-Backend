const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenantController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        let dir;
        if (file.fieldname === 'civilIdDocument') {
            dir = path.join(__dirname, '..', 'uploads', 'civilIDs');
        }
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });
router.get('/tenants', tenantController.getAllTenants)
router.get('/active_tenants', tenantController.getAllActiveTenants)
router.post('/tenantsbycivilid', tenantController.getTenantByCivilId)

router.put(`/editTenant/:id`, upload.fields([
    { name: 'civilIdDocument', maxCount: 1 },
]), tenantController.editTenant);

router.delete('/deleteTenant/:tenantId', tenantController.deactivateTenant)
module.exports = router;