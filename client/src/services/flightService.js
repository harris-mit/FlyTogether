import axios from 'axios';

export async function searchFlights({ origin, destination, departureDate, adults, travelClass }) {
  const response = await axios.get('/api/search', {
    params: { origin, destination, departureDate, adults, travelClass },
  });
  return response.data.data || [];
}
