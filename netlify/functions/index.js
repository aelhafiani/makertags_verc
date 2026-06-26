const admin = require('firebase-admin');

admin.initializeApp();


// Export the functions
exports.generatePdfFromFabricJson = require('./generatePdfFromFabricJson').generatePdfFromFabricJson;
exports.generateJpeg = require('./generateJpeg').generateJpeg;
exports.generatePng = require('./generatePng').generatePng;

