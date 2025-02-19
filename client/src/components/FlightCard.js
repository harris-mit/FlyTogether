import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  Divider,
  TextField,
  Collapse,
  Button,
  Grid
} from '@mui/material';
import carriersDict from '../utils/carriersDict';
import {
  formatDateTime,
  formatTime,
  formatDateForExpedia,
  computeLayover,
} from '../utils/dateUtils';

const FlightCard = ({ flight, onNoteChange }) => {
  const [expanded, setExpanded] = useState(false);

  if (!flight) return null;

  const itinerary = flight.itineraries?.[0];
  if (!itinerary) return null;

  const segments = itinerary.segments || [];
  const overallDeparture = segments[0]?.departure || {};
  const overallArrival = segments[segments.length - 1]?.arrival || {};

  const expediaUrl = `https://www.expedia.com/Flights-Search?trip=oneway
    &leg1=from:${overallDeparture.iataCode},to:${overallArrival.iataCode},
    departure:${formatDateForExpedia(overallDeparture.at)}TANYT
    &passengers=adults:1,children:0,seniors:0,infantinlap:N&mode=search`.replace(/\s+/g, '');
  const stopsLabel =
  segments.length > 1
    ? `${segments.length - 1} stop${segments.length > 2 ? 's' : ''}`
    : 'Nonstop';
    // Helper to compute total flight duration if needed:
    // const computeTotalDuration = (segments) => {
    //   // Your logic here, or just use segment.duration if you have a single entry
    //   return segments?.[0]?.duration || 'N/A';
    // };
  
  return (
    <Card
      variant="outlined"
      onClick={() => setExpanded((prev) => !prev)}
      sx={{
        p: 2,
        mb: 2,
        backgroundColor: '#1e1e1e',
        borderColor: '#333',
        color: '#fff',
        cursor: 'pointer',
      }}
    >
      <CardContent>
      <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          mb={1}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              {formatTime(overallDeparture.at)} - {formatTime(overallArrival.at)}
            </Typography>

            {/* Duration and Stops */}
            <Typography variant="body2" sx={{ color: '#bbb' }}>
              {/* {computeTotalDuration(segments)} &bull;  */}
              {stopsLabel}
            </Typography>
          </Box>

          {/* Price */}
          {flight.price && (
            <Typography
              variant="h5"
              sx={{ fontWeight: 'bold'}}
            >
              {flight.price.total} {flight.price.currency}
            </Typography>
          )}
        </Box>

        {/* Small route & airline text if needed, but not emphasized */}
        <Typography variant="body2" sx={{ color: '#999', mb: 1 }}>
          {overallDeparture.iataCode} → {overallArrival.iataCode}
        </Typography>
        <Typography variant="body2" sx={{ color: '#bbb', mb: 2 }}>
          {/* Airline:{' '} */}
          {carriersDict[segments[0]?.carrierCode] ||
            `IATA code ${segments[0]?.carrierCode}`}
        </Typography>


        <TextField
          label="Notes"
          variant="outlined"
          fullWidth
          value={flight.notes || ''}
          onChange={(e) => onNoteChange(flight.id, e.target.value)}
          onClick={(e) => e.stopPropagation()}
          sx={{
            mb: 2,
            backgroundColor: '#2c2c2c',
            '& .MuiInputLabel-root': { color: '#bbb' },
            '& .MuiInputBase-input': { color: '#fff' },
          }}
        />

        <Collapse in={expanded}>
          <Box mt={2}>
            <Divider sx={{ mb: 2, borderColor: '#333' }} />
            {segments.map((segment, index) => {
              const departure = segment.departure || {};
              const arrival = segment.arrival || {};
              const carrierCode = segment.carrierCode;
              const flightNumber = segment.number || 'N/A';
              const aircraftCode = segment.aircraft?.code || 'N/A';
              const aircraftName =
                flight?.dictionaries?.aircraft?.[aircraftCode] || aircraftCode;

              return (
                <Box key={segment.id} mb={2}>
                  <Typography variant="subtitle1">
                    Segment {index + 1}: {departure.iataCode} → {arrival.iataCode}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#bbb' }}>
                    {carriersDict[carrierCode] || carrierCode} {flightNumber} | 
                    Aircraft: {aircraftName}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#bbb' }}>
                    Departure: {formatDateTime(departure.at)} <br />
                    Arrival: {formatDateTime(arrival.at)}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#bbb' }}>
                    Duration: {segment.duration || 'N/A'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#bbb' }}>
                    Cabin:{' '}
                    {flight.travelerPricings?.[0]?.fareDetailsBySegment?.[index]?.cabin || 'N/A'}

                  </Typography>

                  {index < segments.length - 1 && (
                    <Box ml={2} mt={1}>
                      <Typography variant="body2" sx={{ color: '#bbb' }}>
                        Layover at {arrival.iataCode}:{' '}
                        {computeLayover(arrival.at, segments[index + 1].departure?.at)}
                      </Typography>
                    </Box>
                  )}
                  {index < segments.length - 1 && (
                    <Divider sx={{ my: 1, borderColor: '#333' }} />
                  )}
                </Box>
              );
            })}
          </Box>
        </Collapse>

        <Button
          variant="contained"
          onClick={(e) => {
            e.stopPropagation();
            window.open(expediaUrl, '_blank');
          }}
          sx={{
            mt: 2,
            backgroundColor: '#333',
            color: '#fff',
            textTransform: 'none',
            boxShadow: 'none',
            '&:hover': {
              backgroundColor: '#444',
              boxShadow: 'none',
            },
          }}
        >
          Book
        </Button>
      </CardContent>
    </Card>
  );
};

export default FlightCard;
