import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Container, Button } from '@mui/material';
import Search from './pages/Search';
import SharedSession from './pages/SharedSessions';

function App() {
  return (
    <>
      <AppBar position="static" sx={{ backgroundColor: '#1e1e1e' }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1, color: '#fff' }}>
            FlyTogether
          </Typography>
          <Button component={Link} to="/" sx={{ color: '#fff' }}>
            Start new search
          </Button>
        </Toolbar>
      </AppBar>
      <Container sx={{ marginTop: 4 }}>
        <Routes>
          <Route path="/" element={<Search />} />
          <Route path="/session/:sessionId" element={<SharedSession />} />
        </Routes>
      </Container>
    </>
  );
}

export default App;
