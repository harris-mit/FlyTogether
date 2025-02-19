
const logger = require('firebase-functions/logger'); 
// or use console.log for logging
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const admin = require('firebase-admin');
const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const functions = require('firebase-functions');

//const serviceAccount = require("../flytogether-69521-firebase-adminsdk-fbsvc-969462f74c.json");
admin.initializeApp();



const app = express();
app.use(cors());
app.use(express.json());

require('dotenv').config();
const AMADEUS_API_KEY = defineSecret('AMADEUS_API_KEY');
const AMADEUS_API_SECRET = defineSecret('AMADEUS_API_SECRET');


if (process.env.FUNCTIONS_EMULATOR) {

  // Optionally, connect to Firestore emulator
  const db = admin.firestore();
  db.settings({
    host: 'localhost:8080',
    ssl: false,
  });

  // Optionally, connect to Auth emulator
  admin.auth().useEmulator('http://localhost:9099/');
} else {
  // Initialize the admin SDK with default settings for production
  var db = admin.firestore();
}

// Your Cloud Functions go here

// authenticate middleware (we don't use this now)
async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const tokenMatch = authHeader.match(/^Bearer (.+)$/);
  if (!tokenMatch) {
    return res.status(401).json({ message: 'No auth token provided' });
  }
  const idToken = tokenMatch[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken; // optionally attach user data to req
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid auth token', error: error.message });
  }
}


// Get Amadeus access token
async function getAccessToken() 
{
  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', AMADEUS_API_KEY.value());
    params.append('client_secret', AMADEUS_API_SECRET.value());

    const response = await axios.post(
      'https://test.api.amadeus.com/v1/security/oauth2/token',
      params,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    return response.data.access_token;
  } catch (error) {
    console.error('Error getting access token', error.response?.data || error.message);
    throw error;
  }
}

// Flight search endpoint – expects query params: origin, destination, departureDate, (optional) returnDate, adults
app.get('/api/search', async (req, res) => {
  const { origin, destination, departureDate, returnDate, adults, travelClass } = req.query;
  if (!origin || !destination || !departureDate) {
    return res.status(400).json({
      message: 'Missing required parameters: origin, destination, departureDate',
    });
  }
  try {
    // rate limit ////
    const uid = req.user?.uid || req.ip; // Use user ID if authenticated, otherwise IP
    const userRef = db.collection('rateLimits').doc(uid);
    const userData = await userRef.get();
  
    const now = Date.now();
    const timeWindow = 60000; // 1 minute
    const maxRequests = 3;
  
    let requestTimes = userData.exists ? userData.data().requests || [] : [];
    requestTimes = requestTimes.filter(timestamp => now - timestamp < timeWindow);
  
    if (requestTimes.length >= maxRequests) {
      return res.status(429).json({ message: 'Too many requests. Try again later.' });
    }
    // done rate limit check/// 
    requestTimes.push(now);
    await userRef.set({ requests: requestTimes });

    const accessToken = await getAccessToken();
    const params = {
      originLocationCode: origin,
      destinationLocationCode: destination,
      departureDate,
      adults,
      travelClass,
      currencyCode: 'USD',
    };
    if (returnDate) params.returnDate = returnDate;

    const response = await axios.get(
      'https://test.api.amadeus.com/v2/shopping/flight-offers',
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        params,
      }
    );
    return res.json(response.data);
  } catch (error) {
    console.error('Error searching flights', error.response?.data || error.message);
    return res.status(500).json({
      message: 'Error searching flights',
      error: error.response?.data || error.message,
    });
  }
});

// Create a new flight session and store it in Firestore.
app.post('/api/sessions', async (req, res) => {
  console.log('Received payload:', req.body);
  const { wishlist, wishlistTitle, sharedWith } = req.body;
  if (!Array.isArray(wishlist) || wishlist.length === 0) {
    return res.status(400).json({ message: 'Wishlist must have at least one flight' });
  }
  const sessionId = Math.random().toString(36).substring(2, 18);
  //sharedWith = sharedWith || []; // default to empty array
  const sessionData = {
    wishlist,
    wishlistTitle,
    sharedWith
    //created: admin.firestore.FieldValue.serverTimestamp(),
  };
  try {
    await db.collection('flightsessions').doc(sessionId).set(sessionData);
    return res.json({sessionId});

  } catch (error) {
    console.error('Error creating session:', error);
    return res.status(500).json({ message: 'Error creating session' });
  }
});

// Retrieve a session by sessionId from Firestore.
app.get('/api/sessions/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  try {
    const doc = await db.collection('flightsessions').doc(sessionId).get();
    if (!doc.exists) {
      return res.status(404).json({ message: 'Session not found' });
    }
    return res.json({ sessionId, ...doc.data() });
  } catch (error) {
    console.error('Error retrieving session:', error);
    return res.status(500).json({ message: 'Error retrieving session' });
  }
});

// Update an existing session stored in Firestore.
app.put('/api/sessions/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  const {wishlist, wishlistTitle, sharedWith } = req.body;
  if (!wishlistTitle && !wishlist && !sessionId) {
    return res.status(400).json({ message: 'Invalid flights data' });
  }
  try {
    const sessionRef = db.collection('flightsessions').doc(sessionId);
    const doc = await sessionRef.get();
    if (!doc.exists) {
      return res.status(404).json({ message: 'Session not found' });
    }
    const updatedData = {
      wishlist,
      wishlistTitle,
      sharedWith, 
      updated: admin.firestore.FieldValue.serverTimestamp(),
    };
    await sessionRef.update(updatedData);
    const updatedDoc = await sessionRef.get();
    return res.json({ sessionId });
  } catch (error) {
    console.error('Error updating session:', error);
    return res.status(500).json({ message: 'Error updating session' });
  }
});


/**
 * NEW: GET all sessions that include the signed-in user's email in `sharedWith`.
 * We authorize by:
 * 1) requiring `authenticate` => user must present a valid ID token
 * 2) checking req.user.email === req.params.email
 */
app.get('/api/sessions/shared-with/:email', authenticate, async (req, res) => {
  try {
    const requestedEmail = req.params.email;
    const userEmail = req.user.email; // from the decoded token
    if (!userEmail || userEmail.toLowerCase() !== requestedEmail.toLowerCase()) {
      return res.status(403).json({ message: `Not authorized to view sessions for this email, requested:${req.user.email} and user:${req.params.email}` });
    }

    // Query the 'flightsessions' collection, searching for docs
    // where the 'sharedWith' array contains the user's email
    const snapshot = await db.collection('flightsessions')
      .where('sharedWith', 'array-contains', requestedEmail)
      .get();

    const results = [];
    snapshot.forEach(doc => {
      results.push({
        sessionId: doc.id,
        wishlistTitle: doc.data().wishlistTitle,
      });
    });

    return res.json(results);
  } catch (error) {
    console.error('Error fetching sessions by email:', error);
    return res.status(500).json({ message: 'Error fetching sessions', error: error.message });
  }
});

// Expose Express app as a Firebase Function
//exports.api = onRequest(app);
exports.api = onRequest(
    { secrets: [AMADEUS_API_KEY, AMADEUS_API_SECRET] },
    app
  );