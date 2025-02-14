import axios from 'axios';

export async function searchFlights({ origin, destination, departureDate, adults }) {
  const response = await axios.get('/api/search', {
    params: { origin, destination, departureDate, adults },
  });
  return response.data.data || [];
}
