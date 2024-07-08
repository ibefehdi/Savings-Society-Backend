const express = require('express');
const router = express.Router();
const flatController = require('../controllers/flatController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = path.join(__dirname, '..', 'uploads', 'civilIDs');
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

router.post('/createflat', upload.single('civilIdDocument'), flatController.createFlat);
router.post('/flats/backup', flatController.createFlatBackup);
router.get('/flats', flatController.getAllFlats);

// Get a flat by ID
router.get('/flat/:id', flatController.getFlatById);
router.get('/flatsbybuildingid/:buildingId', flatController.getFlatsByBuildingId)
router.get('/tenantsbyflatid/:id', flatController.getTenantByFlatId)
router.get('/removetenant/:id', flatController.removeTenant)
router.put('/addtenant/:id', upload.single('civilIdDocument'), flatController.assignTenantToFlat)

router.put('/replacetenant/:id', flatController.replaceTenant);
module.exports = router;