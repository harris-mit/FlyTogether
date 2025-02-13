import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  TextField,
  Box,
  Divider
} from '@mui/material';

import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';


const FlightCard = ({ flight, onNoteChange, onDelete }) => {
  if (!flight) return null;
  
  // Use the first itinerary for display.
  const itinerary = flight.itineraries?.[0];
  if (!itinerary) return null;
  
  const segments = itinerary.segments || [];
  const overallDeparture = segments[0]?.departure || {};
  const overallArrival = segments[segments.length - 1]?.arrival || {};
  
  // Total stops is the number of connections (segments - 1)
  const totalStops = segments.length - 1;
  
  // Helper to format a date/time string to something like "08:45 AM"
  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    const options = { hour: '2-digit', minute: '2-digit' };
    return new Date(dateStr).toLocaleTimeString([], options);
  };

  // Compute layover duration between arrival of one segment and departure of the next.
  const computeLayover = (arrivalTime, nextDepartureTime) => {
    if (!arrivalTime || !nextDepartureTime) return 'N/A';
    const diffMs = new Date(nextDepartureTime) - new Date(arrivalTime);
    const diffMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const minutes = diffMins % 60;
    return `${hours > 0 ? hours + 'h ' : ''}${minutes}m`;
  };

  // If dictionaries are provided in flight, use them; otherwise, fall back to the codes.
  const carriersDict = flight.dictionaries?.carriers || {};
  const aircraftDict = flight.dictionaries?.aircraft || {};

  return (
    <Card variant="outlined" sx={{ p: 2, mb: 2, backgroundColor: '#fff' }}>
      <CardContent>
        {/* Itinerary Summary */}
        <Box mb={2}>
          <Typography variant="h6">
            {overallDeparture.iataCode} → {overallArrival.iataCode}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Departure: {overallDeparture.at ? formatDateTime(overallDeparture.at) : 'N/A'} | Arrival: {overallArrival.at ? formatDateTime(overallArrival.at) : 'N/A'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Total Duration: {itinerary.duration || 'N/A'} | Stops: {totalStops}
          </Typography>
          {flight.price && (
            <Typography variant="body2" color="text.secondary">
              Price: {flight.price.total} {flight.price.currency}
            </Typography>
          )}
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Detailed Segment Information */}
        {segments.map((segment, index) => {
          const departure = segment.departure || {};
          const arrival = segment.arrival || {};
          const carrierCode = segment.carrierCode || 'N/A';
          const airlineName = carriersDict[carrierCode] || carrierCode;
          const flightNumber = segment.number || 'N/A';
          const aircraftCode = segment.aircraft?.code || 'N/A';
          const aircraftName = aircraftDict[aircraftCode] || aircraftCode;

          return (
            <Box key={segment.id} mb={2}>
              <Typography variant="subtitle1">
                Segment {index + 1}: {departure.iataCode} → {arrival.iataCode}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {airlineName} {flightNumber} | Aircraft: {aircraftName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Departure: {departure.at ? formatDateTime(departure.at) : 'N/A'} | Arrival: {arrival.at ? formatDateTime(arrival.at) : 'N/A'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Duration: {segment.duration || 'N/A'}
              </Typography>

              {/* Show layover details if not the last segment */}
              {index < segments.length - 1 && (
                <Box ml={2} mt={1}>
                  {(() => {
                    const nextSegment = segments[index + 1];
                    const layover = computeLayover(arrival.at, nextSegment.departure.at);
                    return (
                      <Typography variant="body2" color="text.secondary">
                        Layover at {arrival.iataCode}: {layover}
                      </Typography>
                    );
                  })()}
                </Box>
              )}

              {index < segments.length - 1 && <Divider sx={{ my: 1 }} />}
            </Box>
          );
        })}

        {/* Editable Notes Field */}
        <TextField
          label="Notes"
          variant="outlined"
          fullWidth
          value={flight.notes || ''}
          onChange={(e) =>
            onNoteChange && onNoteChange(flight.id, e.target.value)
          }
          sx={{ mt: 2 }}
        />
        {/* Delete button (only shown if onDelete is passed) */}
        {onDelete && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
            <IconButton onClick={() => onDelete(flight.id)} aria-label="delete">
              <DeleteIcon />
            </IconButton>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default FlightCard;
