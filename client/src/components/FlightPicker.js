import React, { useState } from 'react';
import { Box, Grid, Paper, Typography } from '@mui/material';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

const FlightPicker = () => {
  const [available, setAvailable] = useState([
    { id: 'flight-1', content: 'Flight 1' },
    { id: 'flight-2', content: 'Flight 2' },
    { id: 'flight-3', content: 'Flight 3' },
  ]);
  const [selected, setSelected] = useState([]);

  const onDragEnd = (result) => {
    const { source, destination } = result;
    if (!destination) return;

    let updatedAvailable = [...available];
    let updatedSelected = [...selected];

    if (source.droppableId === 'available' && destination.droppableId === 'selected') {
      const [movedFlight] = updatedAvailable.splice(source.index, 1);
      updatedSelected.splice(destination.index, 0, movedFlight);
    } else if (source.droppableId === 'selected' && destination.droppableId === 'available') {
      const [movedFlight] = updatedSelected.splice(source.index, 1);
      updatedAvailable.splice(destination.index, 0, movedFlight);
    }

    setAvailable(updatedAvailable);
    setSelected(updatedSelected);
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Grid container spacing={2}>
        {/* Available Flights Column */}
        <Grid item xs={6}>
          <Typography variant="h6">Available Flights</Typography>
          <Droppable droppableId="available">
            {(provided) => (
              <Box
                ref={provided.innerRef}
                {...provided.droppableProps}
                sx={{ minHeight: '200px', border: '2px dashed #ccc', p: 1 }}
              >
                {available.map((item, index) => (
                  <Draggable key={item.id} draggableId={item.id} index={index}>
                    {(provided, snapshot) => (
                      <Paper
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        sx={{
                          p: 1,
                          mb: 1,
                          backgroundColor: snapshot.isDragging ? '#e0e0e0' : '#fff',
                        }}
                      >
                        {item.content}
                      </Paper>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </Box>
            )}
          </Droppable>
        </Grid>

        {/* Selected Flights Column */}
        <Grid item xs={6}>
          <Typography variant="h6">Selected Flights</Typography>
          <Droppable droppableId="selected">
            {(provided) => (
              <Box
                ref={provided.innerRef}
                {...provided.droppableProps}
                sx={{ minHeight: '200px', border: '2px dashed #ccc', p: 1 }}
              >
                {selected.map((item, index) => (
                  <Draggable key={item.id} draggableId={item.id} index={index}>
                    {(provided, snapshot) => (
                      <Paper
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        sx={{
                          p: 1,
                          mb: 1,
                          backgroundColor: snapshot.isDragging ? '#e0e0e0' : '#fff',
                        }}
                      >
                        {item.content}
                      </Paper>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </Box>
            )}
          </Droppable>
        </Grid>
      </Grid>
    </DragDropContext>
  );
};

export default FlightPicker;
