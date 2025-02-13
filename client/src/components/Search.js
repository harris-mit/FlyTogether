import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  TextField,
  Button,
  Box,
  Typography,
  Grid,
  Paper,
  MenuItem,
} from '@mui/material';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { useNavigate } from 'react-router-dom';
import FlightCard from './FlightCard';
import { v4 as uuidv4 } from 'uuid';

const Search = () => {
  const [wishlistTitle, setWishlistTitle] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [adults, setAdults] = useState(1);
  const [results, setResults] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [availablePage, setAvailablePage] = useState(0);
  const [stopsFilter, setStopsFilter] = useState('any');

  const navigate = useNavigate();

  // Adjust pagination if results or filters change.
  useEffect(() => {
    const sortedFilteredResults = results
      .filter((flight) =>
        stopsFilter === 'any'
          ? true
          : Number(flight.numberOfStops) === Number(stopsFilter)
      )
      .sort((a, b) => a.price - b.price);
    const totalPages = Math.ceil(sortedFilteredResults.length / 10);
    if (availablePage >= totalPages && totalPages > 0) {
      setAvailablePage(totalPages - 1);
    }
  }, [results, stopsFilter, availablePage]);

  const handleNoteChange = (flightId, note) => {
    setResults((prevResults) =>
      prevResults.map((flight) =>
        flight.id === flightId ? { ...flight, notes: note } : flight
      )
    );
    setWishlist((prevWishlist) =>
      prevWishlist.map((flight) =>
        flight.id === flightId ? { ...flight, notes: note } : flight
      )
    );
  };

  const handleSearch = async () => {
    if (!origin || !destination || !departureDate) {
      alert('Please fill in Origin, Destination, and Departure Date.');
      return;
    }
    try {
      const response = await axios.get('http://localhost:5001/api/search', {
        params: { origin, destination, departureDate, adults },
      });
      const flights = response.data.data || [];
      const flightsWithStableIDs = flights.map((flight) => ({
        ...flight,
        id: uuidv4(),
        selected: false,
        notes: '',
        numberOfStops: flight.itineraries?.[0]?.segments.length - 1,
      }));

      // Automatically sort by cheapest.
      flightsWithStableIDs.sort((a, b) => a.price - b.price);
      setResults(flightsWithStableIDs);
      setAvailablePage(0);
    } catch (error) {
      console.error('Error searching flights:', error);
    }
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const { source, destination } = result;

    // Prevent reordering within the available flights column.
    if (source.droppableId === 'available' && destination.droppableId === 'available') return;

    // Compute the sorted, filtered, and paginated list for available flights.
    const sortedFilteredResults = results
      .filter((flight) =>
        stopsFilter === 'any'
          ? true
          : Number(flight.numberOfStops) === Number(stopsFilter)
      )
      .sort((a, b) => a.price - b.price);
    const paginatedResults = sortedFilteredResults.slice(
      availablePage * 10,
      availablePage * 10 + 10
    );

    // Drag from available to wishlist.
    if (source.droppableId === 'available' && destination.droppableId === 'wishlist') {
      const flightId = paginatedResults[source.index].id;
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

    const handleDelete = (index) => {
      const newWishlist = [...wishlist];
      newWishlist.splice(index, 1);
      setWishlist(newWishlist);
      // Update the session on the backend
      axios
        .put(`http://localhost:5001/api/sessions/${sessionId}`, {
          wishlist: newWishlist,
          wishlistTitle,
        })
        .catch((err) => console.error('Error updating session', err));
    };
    // Drag from wishlist back to available.
    if (source.droppableId === 'wishlist' && destination.droppableId === 'available') {
      const flightId = wishlist[source.index].id;
      const newWishlist = [...wishlist];
      const [movedFlight] = newWishlist.splice(source.index, 1);
      const newResults = [...results, movedFlight];
      newResults.sort((a, b) => a.price - b.price);
      setWishlist(newWishlist);
      setResults(newResults);
      return;
    }

    // Reorder within the wishlist.
    if (source.droppableId === 'wishlist' && destination.droppableId === 'wishlist') {
      const newWishlist = Array.from(wishlist);
      const [movedFlight] = newWishlist.splice(source.index, 1);
      newWishlist.splice(destination.index, 0, movedFlight);
      setWishlist(newWishlist);
    }
  };

  // Share function: Sends the current wishlist to the backend.
  // const shareSession = async () => {
  //   if (wishlist.length === 0) {
  //     alert('Your wishlist is empty!');
  //     return;
  //   }
  //   try {
  //     const payload = { flights: wishlist };
  //     const response = await axios.post('http://localhost:5001/api/sessions', payload);
  //     const { sessionId } = response.data;
  //     const shareLink = `${window.location.origin}/session/${sessionId}`;
  //     navigator.clipboard.writeText(shareLink);
  //     alert(`Shareable link copied to clipboard:\n${shareLink}`);
  //   } catch (error) {
  //     console.error('Error sharing session:', error);
  //     alert('Failed to share session.');
  //   }
  // };
// In Search.js
const shareSession = async () => {
  if (wishlist.length === 0) {
    alert('Your wishlist is empty!');
    return;
  }
  try {
    // Only send the wishlist and title—not the full search results.
    const payload = { wishlist, wishlistTitle };
    console.log(wishlist)
    console.log(wishlistTitle)
    const response = await axios.post('http://localhost:5001/api/sessions', payload);
    const { sessionId } = response.data;
    const shareLink = `${window.location.origin}/session/${sessionId}`;
    navigator.clipboard.writeText(shareLink);
    alert(`Shareable link copied to clipboard:\n${shareLink}`);
  } catch (error) {
    console.error('Error sharing session:', error);
    alert('Failed to share session.');
  }
};


  // Compute available flights for display.
  const sortedFilteredResults = results
    .filter((flight) =>
      stopsFilter === 'any'
        ? true
        : flight.numberOfStops === Number(stopsFilter)
    )
    .sort((a, b) => a.price - b.price);
  const totalPages = Math.ceil(sortedFilteredResults.length / 10);
  const paginatedResults = sortedFilteredResults.slice(
    availablePage * 10,
    availablePage * 10 + 10
  );

  return (
    <Box sx={{ p: 4, backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <Typography variant="h3" gutterBottom align="center">
        Flight Picker
      </Typography>
      <Paper elevation={3} sx={{ p: 4, maxWidth: 600, margin: 'auto', mb: 4 }}>
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
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Destination"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              fullWidth
              required
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
            />
          </Grid>
        </Grid>
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Button variant="contained" onClick={handleSearch}>
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
              sx={{ mb: 2 }}
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
                  style={{ minHeight: '300px', padding: '10px', background: '#fafafa' }}
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
                            backgroundColor: snapshot.isDragging ? '#e0e0e0' : 'white',
                            padding: '10px',
                            borderRadius: '5px',
                          }}
                        >
                          <FlightCard flight={flight} onNoteChange={handleNoteChange} />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
              <Button
                variant="contained"
                onClick={() => setAvailablePage((prev) => prev - 1)}
                disabled={availablePage === 0}
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
              >
                <ArrowForwardIosIcon />
              </Button>
            </Box>
          </Grid>

          {/* Wishlist Column */}
          <Grid item xs={6}>
            <TextField
              label="Wishlist Title"
              variant="outlined"
              fullWidth
              value={wishlistTitle}
              onChange={(e) => setWishlistTitle(e.target.value)}
              sx={{ mb: 2 }}
            />
            <Droppable droppableId="wishlist">
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  style={{ minHeight: '300px', padding: '10px', background: '#ffefc1' }}
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
                            backgroundColor: snapshot.isDragging ? '#ffe082' : 'white',
                            padding: '10px',
                            borderRadius: '5px',
                          }}
                        >
                          <FlightCard flight={flight} onNoteChange={handleNoteChange} />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Button variant="contained" color="primary" onClick={shareSession}>
                Share Wishlist
              </Button>
            </Box>
          </Grid>
        </Grid>
      </DragDropContext>
    </Box>
  );
};

export default Search;
