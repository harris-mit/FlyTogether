const functions = require('firebase-functions');
const app = require('./server');

// Expose the Express app as a Firebase Function
exports.api = functions.https.onRequest(app);
