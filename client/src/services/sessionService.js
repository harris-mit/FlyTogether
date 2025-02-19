import axios from 'axios';

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
  };
