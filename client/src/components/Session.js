// SharedSession.js
import React, { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button, Grid, Paper, MenuItem } from '@mui/material';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import axios from 'axios';
import FlightCard from './FlightCard';
import { useParams } from 'react-router-dom';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { v4 as uuidv4 } from 'uuid';

const SharedSession = () => {
  const { sessionId } = useParams();

  // Shared session state.
  const [wishlist, setWishlist] = useState([]);
  const [wishlistTitle, setWishlistTitle] = useState('');
  
  // Search form & available flights state.
  const [searchResults, setSearchResults] = useState([]);
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [adults, setAdults] = useState(1);
  const [stopsFilter, setStopsFilter] = useState('any');
  const [availablePage, setAvailablePage] = useState(0);

  // Fetch session data on mount.
  useEffect(() => {
    axios.get(`/api/sessions/${sessionId}`)
      .then(res => {
        setWishlist(res.data.wishlist || []);
        setWishlistTitle(res.data.wishlistTitle || '');
      })
      .catch(err => console.error('Error fetching session', err));
  }, [sessionId]);

  // Adjust pagination when search results or stops filter change.
  useEffect(() => {
    const sortedFilteredResults = searchResults
      .filter(flight =>
        stopsFilter === 'any'
          ? true
          : Number(flight.numberOfStops) === Number(stopsFilter)
      )
      .sort((a, b) => a.price - b.price);
    const totalPages = Math.ceil(sortedFilteredResults.length / 10);
    if (availablePage >= totalPages && totalPages > 0) {
      setAvailablePage(totalPages - 1);
    }
  }, [searchResults, stopsFilter, availablePage]);

  // Update notes in both searchResults and wishlist.
  const handleNoteChange = (flightId, note) => {
    // Update searchResults state.
    const updatedSearchResults = searchResults.map(flight =>
      flight.id === flightId ? { ...flight, notes: note } : flight
    );
    setSearchResults(updatedSearchResults);
  
    // Update wishlist state.
    const updatedWishlist = wishlist.map(flight =>
      flight.id === flightId ? { ...flight, notes: note } : flight
    );
    setWishlist(updatedWishlist);
  
    // Update the session in the database.
    axios.put(`/api/sessions/${sessionId}`, {
      wishlist: updatedWishlist,
      wishlistTitle,
    }).catch(err => console.error('Error updating session note', err));
  };
  

  // Search flights (similar to Search.js).
  const handleSearch = async () => {
    if (!origin || !destination || !departureDate) {
      alert('Please fill in Origin, Destination, and Departure Date.');
      return;
    }
    try {
      const response = await axios.get('/api/search', {
        params: { origin, destination, departureDate, adults },
      });
      const flights = response.data.data || [];
      const flightsWithStableIDs = flights.map(flight => ({
        ...flight,
        id: uuidv4(),
        selected: false,
        notes: '',
        numberOfStops: flight.itineraries?.[0]?.segments.length - 1,
      }));
      flightsWithStableIDs.sort((a, b) => a.price - b.price);
      setSearchResults(flightsWithStableIDs);
      setAvailablePage(0);
    } catch (error) {
      console.error('Error searching flights:', error);
    }
  };

  // Compute sorted, filtered, and paginated available flights.
  const sortedFilteredResults = searchResults
    .filter(flight =>
      stopsFilter === 'any'
        ? true
        : Number(flight.numberOfStops) === Number(stopsFilter)
    )
    .sort((a, b) => a.price - b.price);
  const totalPages = Math.ceil(sortedFilteredResults.length / 10);
  const paginatedResults = sortedFilteredResults.slice(
    availablePage * 10,
    availablePage * 10 + 10
  );

  // Drag and drop handler, updated to use "available" for search results.
  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const { source, destination } = result;

    // Prevent reordering within available flights.
    if (source.droppableId === 'available' && destination.droppableId === 'available') return;

    // Drag from available flights to wishlist.
    if (source.droppableId === 'available' && destination.droppableId === 'wishlist') {
      const flightId = paginatedResults[source.index].id;
      const realIndex = searchResults.findIndex(f => f.id === flightId);
      if (realIndex === -1) return;
      const newSearchResults = [...searchResults];
      const [movedFlight] = newSearchResults.splice(realIndex, 1);
      const newWishlist = [...wishlist];
      newWishlist.splice(destination.index, 0, movedFlight);
      setSearchResults(newSearchResults);
      setWishlist(newWishlist);
      axios.put(`/api/sessions/${sessionId}`, {
        wishlist: newWishlist,
        wishlistTitle,
      }).catch(err => console.error('Error updating session', err));
      return;
    }

    // Drag from wishlist back to available flights.
    if (source.droppableId === 'wishlist' && destination.droppableId === 'available') {
      const flightId = wishlist[source.index].id;
      const newWishlist = [...wishlist];
      const [movedFlight] = newWishlist.splice(source.index, 1);
      const newSearchResults = [...searchResults, movedFlight];
      newSearchResults.sort((a, b) => a.price - b.price);
      setWishlist(newWishlist);
      setSearchResults(newSearchResults);
      axios.put(`/api/sessions/${sessionId}`, {
        wishlist: newWishlist,
        wishlistTitle,
      }).catch(err => console.error('Error updating session', err));
      return;
    }

    // Reorder within wishlist.
    if (source.droppableId === 'wishlist' && destination.droppableId === 'wishlist') {
      const newWishlist = Array.from(wishlist);
      const [movedFlight] = newWishlist.splice(source.index, 1);
      newWishlist.splice(destination.index, 0, movedFlight);
      setWishlist(newWishlist);
      axios.put(`/api/sessions/${sessionId}`, {
        wishlist: newWishlist,
        wishlistTitle,
      }).catch(err => console.error('Error updating session', err));
    }
  };

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
        </Grid>
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Button variant="contained" onClick={handleSearch} sx={{ backgroundColor: '#333' }}>
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
        onChange={(e) => {
          const newTitle = e.target.value;
          setWishlistTitle(newTitle);
          axios
            .put(`/api/sessions/${sessionId}`, {
              wishlist,
              wishlistTitle: newTitle,
            })
            .catch((err) => console.error('Error updating wishlist title', err));
        }}
        sx={{
          mb: 2,
          backgroundColor: '#2c2c2c',
          '& .MuiInputLabel-root': { color: '#bbb' },
          '& .MuiInputBase-input': { color: '#fff' },
        }}
      />

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
            <Droppable droppableId="available">
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  style={{
                    minHeight: '300px',
                    padding: '10px',
                    background: '#1e1e1e',
                    borderRadius: '4px',
                  }}
                >
                  {paginatedResults.map((flight, index) => (
                    <Draggable key={flight.id} draggableId={flight.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          style={{
                            ...provided.draggableProps.style,
                            marginBottom: '10px',
                            backgroundColor: snapshot.isDragging ? '#333' : '#2c2c2c',
                            padding: '10px',
                            borderRadius: '5px',
                          }}
                        >
                          <FlightCard flight={flight} onNoteChange={handleNoteChange} />
                        </div>
                      )}
                    </Draggable>
                  ))}
                </div>
              )}
            </Droppable>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
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
            <Typography variant="h5">Top Flights</Typography>
            <Droppable droppableId="wishlist">
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  style={{
                    minHeight: '300px',
                    background: '#1e1e1e',
                    padding: '10px',
                    borderRadius: '4px',
                  }}
                >
                  {wishlist.map((flight, index) => (
                    <Draggable key={flight.id} draggableId={flight.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          style={{
                            ...provided.draggableProps.style,
                            marginBottom: '10px',
                            backgroundColor: snapshot.isDragging ? '#333' : '#2c2c2c',
                            padding: '10px',
                            borderRadius: '5px',
                          }}
                        >
                          <FlightCard flight={flight} onNoteChange={handleNoteChange} />
                        </div>
                      )}
                    </Draggable>
                  ))}
                </div>
              )}
            </Droppable>
          </Grid>
        </Grid>
      </DragDropContext>
    </Box>
  );
};

export default SharedSession;
