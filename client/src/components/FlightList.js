import React from 'react';
import { Droppable, Draggable } from 'react-beautiful-dnd';
import FlightCard from './FlightCard';

const FlightList = ({ flights, droppableId, onNoteChange }) => {
  return (
    <Droppable droppableId={droppableId}>
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
          {flights.map((flight, index) => (
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
                  <FlightCard flight={flight} onNoteChange={onNoteChange} />
                </div>
              )}
            </Draggable>
          ))}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );
};

export default FlightList;
