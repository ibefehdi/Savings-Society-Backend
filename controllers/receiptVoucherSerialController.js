const express = require('express');
const ReceiptVoucherSerial = require('../models/receiptVoucherSerial')
exports.incrementVoucherSerial = async (req, res) => {
    try {
        const newVoucherSerial = new ReceiptVoucherSerial({});
        const savedVoucherSerial = await newVoucherSerial.save();
        console.log("This is the newvoicherserial", newVoucherSerial);
        console.log("saved voucher srial", savedVoucherSerial);
        res.status(201).json(savedVoucherSerial);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
}