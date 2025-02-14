
const logger = require('firebase-functions/logger'); 
// or use console.log for logging
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const admin = require('firebase-admin');
const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');

//const serviceAccount = require("../flytogether-69521-firebase-adminsdk-fbsvc-969462f74c.json");
admin.initializeApp();

var db = admin.firestore();

const app = express();
app.use(cors());
app.use(express.json());

require('dotenv').config();
const AMADEUS_API_KEY = defineSecret('AMADEUS_API_KEY');
const AMADEUS_API_SECRET = defineSecret('AMADEUS_API_SECRET');

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
  const { origin, destination, departureDate, returnDate, adults = 1 } = req.query;
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
  const { wishlist, wishlistTitle } = req.body;
  if (!Array.isArray(wishlist) || wishlist.length === 0) {
    return res.status(400).json({ message: 'Wishlist must have at least one flight' });
  }
  const sessionId = Math.random().toString(36).substring(2, 10);
  const sessionData = {
    wishlist,
    wishlistTitle,
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
  const {wishlist, wishlistTitle } = req.body;
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

// Expose Express app as a Firebase Function
//exports.api = onRequest(app);
exports.api = onRequest(
    { secrets: [AMADEUS_API_KEY, AMADEUS_API_SECRET] },
    app
  );