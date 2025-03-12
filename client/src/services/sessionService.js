import axios from 'axios';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { searchFlights } from './flightService';
import { parseSingleFlightItinerary, isMatchingFlight } from '../utils/parseOffers';
import { isDeepStrictEqual } from 'util';

export async function fetchSession(sessionId) {
  const res = await axios.get(`/api/sessions/${sessionId}`);
  return res.data;
}

export async function updateSession(sessionId, data) {
  return axios.put(`/api/sessions/${sessionId}`, data);
}

export async function createSession(data) {
  // data = { wishlist, wishlistTitle, etc. }
  const response = await axios.post('/api/sessions', data);
  return response.data; // { sessionId }
}

  // Fetch the user's data
export async function fetchSessionsForEmail(auth, email) {
    const token = await auth.currentUser.getIdToken(); 
    const res = await axios.get(
      `/api/sessions/shared-with/${email}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    return res.data; // array of sessions
  }

/**
 * Refreshes prices for all flights in the wishlist, grouping by unique
 * (origin, destination, date, etc.) so we only do one search per group.
 */
export async function refreshSessionPrices(sessionId) {
  const sessionData = await fetchSession(sessionId);
  const wishlist = sessionData.wishlist || [];
  if (!wishlist.length) return;
  const wishlistSpecs = wishlist.map(item => parseSingleFlightItinerary(item));

  // Group flights by (origin, destination, departureDate, travelClass, adults)
  var groups = {}
  for (let i = 0; i < wishlistSpecs.length; i++) {
    const spec = wishlistSpecs[i];
    // Include travelClass in the key
    const key = `${spec.origin}-${spec.destination}-${spec.departureDate}`;
    if (!groups[key]){
      groups[key] = {
        origin: spec.origin,
        destination: spec.destination,
        departureDate: spec.departureDate,
        flights: []
      }
    }
    groups[key].flights.push(wishlist[i])
  }

  // For each group, do one search, then match flights by segments
  for (const key of Object.keys(groups)) {
    const { origin, destination, departureDate } = groups[key];
    const results = await searchFlights({ origin, destination, departureDate });
    console.log("On search 1")
    for (let i = 0; i < groups[key].flights.length; i++){
      const match = results.find(r => 
        isMatchingFlight(groups[key].flights[i], r)
      );
      if (match) {
        // Find the index of this flight in the original wishlist
        const wishlistIndex = wishlist.findIndex(
          r => 
            isMatchingFlight(groups[key].flights[i], r)
        );
        if (wishlistIndex !== -1) {
          wishlist[wishlistIndex] = match;
        }
      }
    }
  }

  // Save the updated wishlist
  await updateSession(sessionId, {
    ...sessionData,
    wishlist
  });
}
