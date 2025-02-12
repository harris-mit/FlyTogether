import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Container, Button } from '@mui/material';
import Search from './components/Search';
import Session from './components/Session';

function App() {
  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Collaborative Flight Picker
          </Typography>
          <Button color="inherit" component={Link} to="/">Search</Button>
        </Toolbar>
      </AppBar>
      <Container sx={{ marginTop: 4 }}>
        <Routes>
          <Route path="/" element={<Search />} />
          <Route path="/session/:sessionId" element={<Session />} />
        </Routes>
      </Container>
    </>
  );
}

export default App;
