// src/pages/SharedSession.jsx
import React, { useState, useEffect } from 'react';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import { useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  Paper,
  MenuItem,
  Chip,
  IconButton
} from '@mui/material';
import { DragDropContext } from 'react-beautiful-dnd';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { v4 as uuidv4 } from 'uuid';

import { fetchSession, updateSession } from '../services/sessionService';
import { searchFlights } from '../services/flightService';
import FlightList from '../components/FlightList';

const PAGE_SIZE = 10;

const SharedSession = () => {
  const { sessionId } = useParams();

  // Wishlist data stored in this session
  const [wishlist, setWishlist] = useState([]);
  const [wishlistTitle, setWishlistTitle] = useState('');
  const [sharedWith, setSharedWith] = useState([]);

  // "Available flights" search results
  const [searchResults, setSearchResults] = useState([]);
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [adults, setAdults] = useState(1);
  const [travelClass, setTravelClass] = useState('');

  // Filter/pagination
  const [stopsFilter, setStopsFilter] = useState('any');
  const [availablePage, setAvailablePage] = useState(0);

  // Fetch session data on component mount
  useEffect(() => {
    (async () => {
      try {
        const data = await fetchSession(sessionId); // GET /api/sessions/:sessionId
        setWishlist(data.wishlist || []);
        setWishlistTitle(data.wishlistTitle || '');
        setSharedWith(data.sharedWith || []);
      } catch (err) {
        console.error('Error fetching session:', err);
      }
    })();
  }, [sessionId]);

  // Re-check pagination boundaries if search results or stops filter change
  useEffect(() => {
    const filtered = searchResults.filter((flight) =>
      stopsFilter === 'any'
        ? true
        : Number(flight.numberOfStops) === Number(stopsFilter)
    );
    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    if (availablePage >= totalPages && totalPages > 0) {
      setAvailablePage(totalPages - 1);
    }
  }, [searchResults, stopsFilter, availablePage]);

  /**
   * Updates notes for a flight ID in both search results & wishlist,
   * and persists to the server.
   */
  const handleNoteChange = async (flightId, note) => {
    // Local updates
    setSearchResults((prev) =>
      prev.map((flight) => (flight.id === flightId ? { ...flight, notes: note } : flight))
    );
    setWishlist((prev) =>
      prev.map((flight) => (flight.id === flightId ? { ...flight, notes: note } : flight))
    );

    // Persist to backend
    try {
      await updateSession(sessionId, {
        wishlist,
        wishlistTitle,
        sharedWith // keep sharedWith in sync
      });
    } catch (err) {
      console.error('Error updating session note:', err);
    }
  };

  /**
   * Search flights and populate the "Available flights" column.
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
      // Sort by cheapest
      flightsWithIDs.sort((a, b) => a.price - b.price);
      setSearchResults(flightsWithIDs);
      setAvailablePage(0);
    } catch (error) {
      console.error('Error searching flights:', error);
    }
  };

  /**
   * Drag-drop handler for reordering or moving flights
   * between "Available" and "Wishlist".
   */
  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const { source, destination } = result;

    // If source/dest the same droppable, handle reorder in wishlist only
    if (source.droppableId === 'available' && destination.droppableId === 'available') {
      // We do not allow reordering in "available" results, so ignore
      return;
    }

    // Compute sorted/filtered/paginated flights for "available"
    const filtered = searchResults.filter((flight) =>
      stopsFilter === 'any'
        ? true
        : Number(flight.numberOfStops) === Number(stopsFilter)
    );
    const sortedFiltered = filtered.sort((a, b) => a.price - b.price);
    const paginated = sortedFiltered.slice(
      availablePage * PAGE_SIZE,
      availablePage * PAGE_SIZE + PAGE_SIZE
    );

    // If dragging from Available -> Wishlist
    if (source.droppableId === 'available' && destination.droppableId === 'wishlist') {
      const flightId = paginated[source.index].id;
      const realIndex = searchResults.findIndex((f) => f.id === flightId);
      if (realIndex === -1) return;

      const newSearchResults = [...searchResults];
      const [movedFlight] = newSearchResults.splice(realIndex, 1);
      const newWishlist = [...wishlist];
      newWishlist.splice(destination.index, 0, movedFlight);

      setSearchResults(newSearchResults);
      setWishlist(newWishlist);

      updateSession(sessionId, {
        wishlist: newWishlist,
        wishlistTitle,
        sharedWith
      }).catch((err) => console.error('Error updating session:', err));
      return;
    }

    // If dragging from Wishlist -> Available
    if (source.droppableId === 'wishlist' && destination.droppableId === 'available') {
      const flightId = wishlist[source.index].id;
      const newWishlist = [...wishlist];
      const [movedFlight] = newWishlist.splice(source.index, 1);

      // Insert back into searchResults array (maintaining overall sort)
      const newSearchResults = [...searchResults, movedFlight];
      newSearchResults.sort((a, b) => a.price - b.price);

      setWishlist(newWishlist);
      setSearchResults(newSearchResults);

      updateSession(sessionId, {
        wishlist: newWishlist,
        wishlistTitle,
        sharedWith
      }).catch((err) => console.error('Error updating session:', err));
      return;
    }

    // Reorder within Wishlist
    if (source.droppableId === 'wishlist' && destination.droppableId === 'wishlist') {
      const newWishlist = Array.from(wishlist);
      const [movedFlight] = newWishlist.splice(source.index, 1);
      newWishlist.splice(destination.index, 0, movedFlight);
      setWishlist(newWishlist);

      updateSession(sessionId, {
        wishlist: newWishlist,
        wishlistTitle,
      }).catch((err) => console.error('Error updating session:', err));
    }
  };

    // NEW: add email
  const handleAddEmail = async (e) => {
    if (e.key === 'Enter' && e.target.value) {
      const newEmail = e.target.value.trim();
      if (newEmail && !sharedWith.includes(newEmail)) {
        const updated = [...sharedWith, newEmail];
        setSharedWith(updated);
        e.target.value = '';

        try {
          await updateSession(sessionId, {
            wishlist,
            wishlistTitle,
            sharedWith: updated
          });
        } catch (err) {
          console.error('Error updating sharedWith:', err);
        }
      }
    }
  };

  // NEW: remove email
  const handleRemoveEmail = async (email) => {
    const updated = sharedWith.filter((e) => e !== email);
    setSharedWith(updated);
    try {
      await updateSession(sessionId, {
        wishlist,
        wishlistTitle,
        sharedWith: updated
      });
    } catch (err) {
      console.error('Error removing email:', err);
    }
  };
  // Filter + sort + paginate
  const filteredResults = searchResults.filter((flight) =>
    stopsFilter === 'any'
      ? true
      : Number(flight.numberOfStops) === Number(stopsFilter)
  );
  const sortedResults = filteredResults.sort((a, b) => a.price - b.price);
  const totalPages = Math.ceil(sortedResults.length / PAGE_SIZE);
  const paginatedResults = sortedResults.slice(
    availablePage * PAGE_SIZE,
    availablePage * PAGE_SIZE + PAGE_SIZE
  );

  return (
    <Box sx={{ p: 4, backgroundColor: '#121212', minHeight: '100vh', color: '#fff' }}>
      <Typography variant="h3" gutterBottom align="center">
        Flight Picker
      </Typography>

      {/* Search form */}
      <Paper
      elevation={3}
      sx={{
        p: 4,
        maxWidth: 600,
        margin: 'auto',
        mb: 4,
        backgroundColor: '#1e1e1e',
        color: '#fff'
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
        {/* Departure Date */}
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
              '& .MuiInputBase-input': { color: '#fff' }
            }}
          />
        </Grid>
        {/* Number of Adults */}
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
              '& .MuiInputBase-input': { color: '#fff' }
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
        <Button
          variant="contained"
          onClick={handleSearch}
          sx={{ backgroundColor: '#333' }}
        >
          Search
        </Button>
      </Box>
    </Paper>

      <Typography variant="h4" gutterBottom>
        Unique Trip ID: {sessionId}
      </Typography>
      <TextField
        label="Trip Title"
        variant="outlined"
        fullWidth
        value={wishlistTitle}
        onChange={async (e) => {
          const newTitle = e.target.value;
          setWishlistTitle(newTitle);
          try {
            await updateSession(sessionId, {
              wishlist,
              wishlistTitle: newTitle,
              sharedWith
            });
          } catch (err) {
            console.error('Error updating wishlist title:', err);
          }
        }}
        sx={{
          mb: 2,
          backgroundColor: '#2c2c2c',
          '& .MuiInputLabel-root': { color: '#bbb' },
          '& .MuiInputBase-input': { color: '#fff' },
        }}
      />
      {/* NEW: Shared With UI */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Shared With
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
          {sharedWith.map((email) => (
            <Chip
              key={email}
              label={email}
              onDelete={() => handleRemoveEmail(email)}
              deleteIcon={<DeleteIcon />}
              sx={{ backgroundColor: '#2c2c2c', color: '#fff' }}
            />
          ))}
        </Box>
        <TextField
          label="Type an email and press Enter"
          variant="outlined"
          fullWidth
          onKeyDown={handleAddEmail}
          sx={{
            backgroundColor: '#2c2c2c',
            '& .MuiInputLabel-root': { color: '#bbb' },
            '& .MuiInputBase-input': { color: '#fff' },
          }}
        />
      </Box>


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

            {/* Use FlightList to render the "available flights" droppable */}
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
            <Typography variant="h5">
              Top Flights
            </Typography>

            {/* Render the wishlist column using FlightList */}
            <FlightList
              flights={wishlist}
              droppableId="wishlist"
              onNoteChange={handleNoteChange}
            />
          </Grid>
        </Grid>
      </DragDropContext>
    </Box>
  );
};

export default SharedSession;
