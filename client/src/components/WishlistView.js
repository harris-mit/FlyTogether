// WishlistView.js
import React from 'react';
import { Box, TextField, Button } from '@mui/material';
import { Droppable, Draggable } from 'react-beautiful-dnd';
import FlightCard from './FlightCard';

const WishlistView = ({
  wishlistTitle,
  setWishlistTitle,
  wishlist,
  handleNoteChange,
  handleDelete,
  shareSession, // optional: only show share button when needed
  dragEnabled = true, // allow disabling drag for read-only view
}) => {
  return (
    <Box>
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
      style={{
        minHeight: '300px',
        background: '#ffefc1',
        padding: '10px',
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
                backgroundColor: snapshot.isDragging ? '#ffe082' : 'white',
                padding: '10px',
                borderRadius: '5px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
            </div>
          )}
        </Draggable>
      ))}
      {provided.placeholder}
    </div>
  )}
</Droppable>


      {shareSession && (
        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Button variant="contained" color="primary" onClick={shareSession}>
            Share Wishlist
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default WishlistView;
