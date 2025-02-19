// src/pages/Search.jsx

import React, { useState, useEffect } from 'react';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import {
  Box,
  Typography,
  Grid,
  Paper,
  TextField,
  Button,
  MenuItem,
} from '@mui/material';
import {
  onAuthStateChanged
} from 'firebase/auth';
import { DragDropContext } from 'react-beautiful-dnd';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { v4 as uuidv4 } from 'uuid';

import { searchFlights } from '../services/flightService';
import { createSession } from '../services/sessionService';
import FlightList from '../components/FlightList';
import { auth } from '../firebase';

const PAGE_SIZE = 10;

const Search = () => {
  const [wishlistTitle, setWishlistTitle] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [adults, setAdults] = useState(1);
  const [travelClass, setTravelClass] = useState('');

  // Searched flights and top picks
  const [results, setResults] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [sharedWith, setSharedWith] = useState([]);
  const [user, setUser] = useState(null);

  // Pagination and filtering
  const [availablePage, setAvailablePage] = useState(0);
  const [stopsFilter, setStopsFilter] = useState('any');

  // get the user if exists
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    return () => unsubscribe();
  }, []);

  // Re-check pagination boundaries if results or filter change
  useEffect(() => {
    const filtered = results.filter((flight) =>
      stopsFilter === 'any'
        ? true
        : Number(flight.numberOfStops) === Number(stopsFilter)
    );
    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    if (availablePage >= totalPages && totalPages > 0) {
      setAvailablePage(totalPages - 1);
    }
  }, [results, stopsFilter, availablePage]);

  /**
   * Update notes for a given flight ID in both results and wishlist.
   */
  const handleNoteChange = (flightId, note) => {
    setResults((prev) =>
      prev.map((flight) =>
        flight.id === flightId ? { ...flight, notes: note } : flight
      )
    );
    setWishlist((prev) =>
      prev.map((flight) =>
        flight.id === flightId ? { ...flight, notes: note } : flight
      )
    );
  };

  /**
   * Fetch flights from the API/service.
   */
  const handleSearch = async () => {
    if (!origin || !destination || !departureDate) {
      alert('Please fill in Origin, Destination, and Departure Date.');
      return;
    }
    try {
      const flights = await searchFlights({ origin, destination, departureDate, adults, travelClass });
      const flightsWithIDs = flights.map((f) => ({
        ...f,
        id: uuidv4(),
        notes: '',
        numberOfStops: f.itineraries?.[0]?.segments.length - 1,
      }));
      flightsWithIDs.sort((a, b) => a.price - b.price);
      setResults(flightsWithIDs);
      setAvailablePage(0);
    } catch (error) {
      console.error('Error searching flights:', error);
    }
  };

  /**
   * Drag and drop logic for moving flights between "Available" and "Top Flights".
   */
  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const { source, destination } = result;

    // We don't allow reordering within the "available" (search results) column.
    if (source.droppableId === 'available' && destination.droppableId === 'available') {
      return;
    }

    // Compute the current page's flights
    const filtered = results.filter((flight) =>
      stopsFilter === 'any'
        ? true
        : Number(flight.numberOfStops) === Number(stopsFilter)
    );
    const sorted = filtered.sort((a, b) => a.price - b.price);
    const paginated = sorted.slice(
      availablePage * PAGE_SIZE,
      availablePage * PAGE_SIZE + PAGE_SIZE
    );

    // Move from "Available" to "Wishlist"
    if (source.droppableId === 'available' && destination.droppableId === 'wishlist') {
      const flightId = paginated[source.index].id;
      const realIndex = results.findIndex((f) => f.id === flightId);
      if (realIndex === -1) return;

      const newResults = [...results];
      const [movedFlight] = newResults.splice(realIndex, 1);
      const newWishlist = [...wishlist];
      newWishlist.splice(destination.index, 0, movedFlight);

      setResults(newResults);
      setWishlist(newWishlist);
      return;
    }

    // Move from "Wishlist" back to "Available"
    if (source.droppableId === 'wishlist' && destination.droppableId === 'available') {
      const flightId = wishlist[source.index].id;
      const newWishlist = [...wishlist];
      const [movedFlight] = newWishlist.splice(source.index, 1);

      // Insert it back into results array (sort them again)
      const newResults = [...results, movedFlight];
      newResults.sort((a, b) => a.price - b.price);

      setWishlist(newWishlist);
      setResults(newResults);
      return;
    }

    // Reorder within Wishlist
    if (source.droppableId === 'wishlist' && destination.droppableId === 'wishlist') {
      const newWishlist = [...wishlist];
      const [movedFlight] = newWishlist.splice(source.index, 1);
      newWishlist.splice(destination.index, 0, movedFlight);
      setWishlist(newWishlist);
    }
  };

  /**
   * Create a new session in the backend and copy link to clipboard.
   */
  const shareSession = async () => {
    if (wishlist.length === 0) {
      alert('Your wishlist is empty!');
      return;
    }
    try {
      const { sessionId } = await createSession({ wishlist, wishlistTitle, sharedWith: [user.email] });
      const shareLink = `${window.location.origin}/session/${sessionId}`;
      navigator.clipboard.writeText(shareLink);
      alert(`Shareable link copied to clipboard:\n${shareLink}`);
      window.location.href = shareLink;
    } catch (error) {
      console.error('Error sharing session:', error);
      alert('Failed to share session.');
    }
  };

  // Filter + sort + paginate
  const filtered = results.filter((flight) =>
    stopsFilter === 'any'
      ? true
      : Number(flight.numberOfStops) === Number(stopsFilter)
  );
  const sorted = filtered.sort((a, b) => a.price - b.price);
  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginatedResults = sorted.slice(
    availablePage * PAGE_SIZE,
    availablePage * PAGE_SIZE + PAGE_SIZE
  );

  return (
    <Box sx={{ p: 4, backgroundColor: '#121212', minHeight: '100vh', color: '#fff' }}>
      <Typography variant="h3" gutterBottom align="center">
        Flight Picker
      </Typography>
      <Paper
        elevation={3}
        sx={{
          p: 4,
          maxWidth: 600,
          margin: 'auto',
          mb: 4,
          backgroundColor: '#1e1e1e',
          color: '#fff',
        }}
      >
        <Typography variant="h5" gutterBottom>
          Search Flights
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Origin"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              fullWidth
              required
              sx={{
                backgroundColor: '#2c2c2c',
                '& .MuiInputLabel-root': { color: '#bbb' },
                '& .MuiInputBase-input': { color: '#fff' },
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Destination"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              fullWidth
              required
              sx={{
                backgroundColor: '#2c2c2c',
                '& .MuiInputLabel-root': { color: '#bbb' },
                '& .MuiInputBase-input': { color: '#fff' },
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Departure Date"
              type="date"
              value={departureDate}
              onChange={(e) => setDepartureDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
              required
              sx={{
                backgroundColor: '#2c2c2c',
                '& .MuiInputLabel-root': { color: '#bbb' },
                '& .MuiInputBase-input': { color: '#fff' },
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Adults"
              type="number"
              value={adults}
              onChange={(e) => setAdults(e.target.value)}
              fullWidth
              required
              sx={{
                backgroundColor: '#2c2c2c',
                '& .MuiInputLabel-root': { color: '#bbb' },
                '& .MuiInputBase-input': { color: '#fff' },
              }}
            />
          </Grid>
                {/* Additional Optional Fields */}
        {/* Travel Class */}
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth sx={{ backgroundColor: '#2c2c2c' }}>
            <InputLabel sx={{ color: '#bbb' }}>Travel Class</InputLabel>
            <Select
              value={travelClass}
              onChange={(e) => setTravelClass(e.target.value)}
              label="Travel Class"
              sx={{ '& .MuiInputBase-input': { color: '#fff' } }}
            >
              <MenuItem value="ECONOMY">Economy</MenuItem>
              <MenuItem value="PREMIUM_ECONOMY">Premium Economy</MenuItem>
              <MenuItem value="BUSINESS">Business</MenuItem>
              <MenuItem value="FIRST">First</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        </Grid>

        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Button variant="contained" onClick={handleSearch} sx={{ backgroundColor: '#333' }}>
            Search
          </Button>
        </Box>
      </Paper>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Grid container spacing={2} sx={{ maxWidth: 1000, margin: 'auto' }}>
          {/* Available Flights Column */}
          <Grid item xs={6}>
            <Typography variant="h5" gutterBottom>
              Available Flights
            </Typography>
            <TextField
              select
              label="Filter by Stops"
              value={stopsFilter}
              onChange={(e) => {
                setStopsFilter(e.target.value);
                setAvailablePage(0);
              }}
              variant="outlined"
              fullWidth
              sx={{
                mb: 2,
                backgroundColor: '#2c2c2c',
                '& .MuiInputLabel-root': { color: '#bbb' },
                '& .MuiInputBase-input': { color: '#fff' },
              }}
            >
              <MenuItem value="any">Any</MenuItem>
              <MenuItem value="0">Non-stop</MenuItem>
              <MenuItem value="1">1 Stop</MenuItem>
              <MenuItem value="2">2 Stops</MenuItem>
            </TextField>

            {/* Use FlightList to display the search results in a droppable container */}
            <FlightList
              flights={paginatedResults}
              droppableId="available"
              onNoteChange={handleNoteChange}
            />

            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mt: 2,
              }}
            >
              <Button
                variant="contained"
                onClick={() => setAvailablePage((prev) => prev - 1)}
                disabled={availablePage === 0}
                sx={{ backgroundColor: '#333' }}
              >
                <ArrowBackIosIcon />
              </Button>
              <Typography variant="body1">
                Page {totalPages === 0 ? 0 : availablePage + 1} of {totalPages}
              </Typography>
              <Button
                variant="contained"
                onClick={() => setAvailablePage((prev) => prev + 1)}
                disabled={availablePage >= totalPages - 1}
                sx={{ backgroundColor: '#333' }}
              >
                <ArrowForwardIosIcon />
              </Button>
            </Box>
          </Grid>

          {/* Wishlist Column */}
          <Grid item xs={6}>
            <Typography variant="h5" gutterBottom>
              Top Flights
            </Typography>

            <TextField
              label="Trip Title"
              variant="outlined"
              fullWidth
              value={wishlistTitle}
              onChange={(e) => setWishlistTitle(e.target.value)}
              sx={{
                mb: 2,
                backgroundColor: '#2c2c2c',
                '& .MuiInputLabel-root': { color: '#bbb' },
                '& .MuiInputBase-input': { color: '#fff' },
              }}
            />

            {/* The wishlist droppable container */}
            <FlightList
              flights={wishlist}
              droppableId="wishlist"
              onNoteChange={handleNoteChange}
            />

            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Button variant="contained" onClick={shareSession} sx={{ backgroundColor: '#333' }}>
                Share Top Flights
              </Button>
            </Box>
          </Grid>
        </Grid>
      </DragDropContext>
    </Box>
  );
};

export default Search;
