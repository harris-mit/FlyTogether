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
} from '@mui/material';
import carriersDict from '../utils/carriersDict';
import {
  formatDateTime,
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
        <Box mb={2}>
          <Typography variant="h6">
            {overallDeparture.iataCode} → {overallArrival.iataCode}
          </Typography>
          <Typography variant="body2" sx={{ color: '#bbb' }}>
            Departure: {formatDateTime(overallDeparture.at)} <br />
            Arrival: {formatDateTime(overallArrival.at)}
          </Typography>
          {flight.price && (
            <Typography variant="body2" sx={{ color: '#bbb' }}>
              Price: {flight.price.total} {flight.price.currency}
            </Typography>
          )}
          <Typography variant="body2" sx={{ color: '#bbb' }}>
            Airline:{' '}
            {carriersDict[segments[0]?.carrierCode] ||
              `IATA code ${segments[0]?.carrierCode}`}
          </Typography>
        </Box>

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
