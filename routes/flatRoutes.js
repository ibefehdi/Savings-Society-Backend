const express = require('express');
const router = express.Router();
const flatController = require('../controllers/flatController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        let dir;
        if (file.fieldname === 'civilIdDocument') {
            dir = path.join(__dirname, '..', 'uploads', 'civilIDs');
        } else if (file.fieldname === 'contractDocument') {
            dir = path.join(__dirname, '..', 'uploads', 'contracts');
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

router.post('/createflat', upload.fields([
    { name: 'civilIdDocument', maxCount: 1 },
    { name: 'contractDocument', maxCount: 1 }
]), flatController.createFlat);
router.post('/flats/backup', flatController.createFlatBackup);
router.get('/flats', flatController.getAllFlats);

// Get a flat by ID
router.get('/flat/:id', flatController.getFlatById);
router.get('/flatsbybuildingid/:buildingId', flatController.getFlatsByBuildingId)
router.get('/tenantsbyflatid/:id', flatController.getTenantByFlatId)
router.get('/removetenant/:id', flatController.removeTenant)
router.put('/addtenant/:id', upload.fields([
    { name: 'civilIdDocument', maxCount: 1 },
    { name: 'contractDocument', maxCount: 1 }
]), flatController.assignTenantToFlat);

router.put('/flat/:id', upload.fields([
    { name: 'civilIdDocument', maxCount: 1 },
    { name: 'contractDocument', maxCount: 1 }
]), flatController.editFlat);

router.put('/replacetenant/:id', flatController.replaceTenant);

router.delete('/deleteflat/:id', flatController.deleteFlatController)
module.exports = router;