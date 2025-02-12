require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const { AMADEUS_API_KEY, AMADEUS_API_SECRET, PORT } = process.env;

// Simple in-memory storage for sessions
let flightSessions = {};

// Get Amadeus access token
async function getAccessToken() {
  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', process.env.AMADEUS_API_KEY);
    params.append('client_secret', process.env.AMADEUS_API_SECRET);

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

// Search endpoint – expects query params: origin, destination, departureDate, (optional) returnDate, adults
app.get('/api/search', async (req, res) => {
  const { origin, destination, departureDate, returnDate, adults = 1 } = req.query;
  if (!origin || !destination || !departureDate) {
    return res.status(400).json({ message: 'Missing required parameters: origin, destination, departureDate' });
  }
  try {
    const accessToken = await getAccessToken();
    const params = {
      originLocationCode: origin,
      destinationLocationCode: destination,
      departureDate,
      adults,
      currencyCode: 'USD',
    };
    if (returnDate) params.returnDate = returnDate;

    const response = await axios.get('https://test.api.amadeus.com/v2/shopping/flight-offers', {
      headers: { Authorization: `Bearer ${accessToken}` },
      params,
    });
    return res.json(response.data);
  } catch (error) {
    console.error('Error searching flights', error.response?.data || error.message);
    return res.status(500).json({ message: 'Error searching flights', error: error.response?.data || error.message });
  }
});

// Create a new flight session (the creator’s selected flights)
app.post('/api/sessions', (req, res) => {
  const { flights } = req.body;
  if (!flights || !Array.isArray(flights)) {
    return res.status(400).json({ message: 'Invalid flights data' });
  }
  const sessionId = Math.random().toString(36).substring(2, 10);
  flightSessions[sessionId] = flights;
  return res.json({ sessionId, flights });
});

// Get session data by sessionId
app.get('/api/sessions/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = flightSessions[sessionId];
  if (!session) {
    return res.status(404).json({ message: 'Session not found' });
  }
  return res.json({ sessionId, flights: session });
});

// Update a session (for ranking/deleting flights)
app.put('/api/sessions/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const { flights } = req.body;
  if (!flights || !Array.isArray(flights)) {
    return res.status(400).json({ message: 'Invalid flights data' });
  }
  if (!flightSessions[sessionId]) {
    return res.status(404).json({ message: 'Session not found' });
  }
  flightSessions[sessionId] = flights;
  return res.json({ sessionId, flights });
});

app.listen(PORT || 5001, () => {
  console.log(`Server running on port ${PORT || 5001}`);
});
