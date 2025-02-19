import React, { useState, useEffect } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Button,
  Menu,
  Box,
  TextField,
  Divider
} from '@mui/material';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail
} from 'firebase/auth';

import { auth } from './firebase';  // Or wherever you import it
import Search from './pages/Search';
import SharedSession from './pages/SharedSessions';
import { fetchSessionsForEmail } from './services/sessionService';

function App() {
  const [user, setUser] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [userSessions, setUserSessions] = useState([]); // store the list of sessions for the dropdown

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    return () => unsubscribe();
  }, []);

  // Menu open/close
  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
    setErrorMsg('');
  };

  // Sign In
  const handleSignIn = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setErrorMsg('');
      setEmail('');
      setPassword('');
      handleMenuClose();
    } catch (error) {
      setErrorMsg(error.message || 'Sign-in error');
    }
  };

  // Sign Up
  const handleSignUp = async () => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      setErrorMsg('');
      setEmail('');
      setPassword('');
      handleMenuClose();
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        setErrorMsg('Email is already in use. Try logging in or resetting your password.');
      } else {
        setErrorMsg(error.message || 'Sign-up error');
      }
    }
  };

  // Logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      handleMenuClose();
    } catch (error) {
      setErrorMsg(error.message || 'Sign-out error');
    }
  };

  // Password Reset
  const handleResetPassword = async () => {
    if (!email) {
      setErrorMsg('Enter your email above first.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      setErrorMsg('Password reset link sent. Check your inbox.');
    } catch (error) {
      setErrorMsg(error.message || 'Reset error');
    }
  };

  useEffect(() => {
    if (user?.email) {
      // Fetch sessions from server
      (async () => {
        try {
          const sessions = await fetchSessionsForEmail(auth, user.email);
          // sessions is an array like: [{sessionId, wishlistTitle, ...}, ...]
          setUserSessions(sessions);
        } catch (err) {
          console.error('Failed to fetch user sessions', err);
        }
      })();
    } else {
      setUserSessions([]);
    }
  }, [user]);

  return (
    <>
      <AppBar position="static" sx={{ backgroundColor: '#1e1e1e' }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1, color: '#fff' }}>
            FlyTogether
          </Typography>
          <Button component={Link} to="/" sx={{ color: '#fff', marginRight: 2 }}>
            Start new search
          </Button>

          {/* If no user, show "Login" button; if user, show their email */}
          <Button onClick={handleMenuOpen} sx={{ color: '#fff' }}>
            {user ? user.email : 'Login'}
          </Button>
        </Toolbar>
      </AppBar>

      {/* The dropdown Menu */}
      {anchorEl && (
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          PaperProps={{ sx: { p: 2, maxWidth: 300, backgroundColor: '#1e1e1e', color: '#fff' },
         }}
        >
          {user ? (
            // Logged-in view
            <Box>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Signed in as: <strong>{user.email}</strong>
              </Typography>
              <Divider sx={{ mb: 2, backgroundColor: '#333' }} />

              {/* Example: List the sessions for the user */}
              <Box sx={{ maxHeight: 150, overflowY: 'auto', mb: 2, border: '1px solid #333', p: 1 }}>
                { userSessions.map((session) => (
                  <Box key={session.sessionId} sx={{ mb: 1 }}>
                    <Link 
                      to={`/session/${session.sessionId}`} 
                      style={{ textDecoration: 'none', color: '#fff' }}
                    >
                      {session.wishlistTitle || '(Untitled Trip)'} – {session.sessionId}
                    </Link>
                  </Box>
                ))}
              </Box>

              <Button variant="contained" onClick={handleLogout} fullWidth sx={{ backgroundColor: '#333' }}>
                Logout
              </Button>
            </Box>
          ) : (
            // Logged-out view: email/password fields + sign in, sign up, reset
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                size="small"
                sx={{
                  backgroundColor: '#2c2c2c',
                  '& .MuiInputLabel-root': { color: '#bbb' },
                  '& .MuiInputBase-input': { color: '#fff' },
                }}
              />
              <TextField
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                size="small"
                sx={{
                  backgroundColor: '#2c2c2c',
                  '& .MuiInputLabel-root': { color: '#bbb' },
                  '& .MuiInputBase-input': { color: '#fff' },
                }}
              />

              {errorMsg && (
                <Typography variant="body2" color="error">
                  {errorMsg}
                </Typography>
              )}

              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                <Button variant="contained" onClick={handleSignIn} sx={{ backgroundColor: '#333' }}>Sign In </Button> 
                <Button variant="outlined" onClick={handleSignUp}sx={{ borderColor: '#fff', color: '#fff' }}>Sign Up</Button>
              </Box>

              {/* Forgot Password Link */}
              <Button
                variant="text"
                onClick={handleResetPassword}
                sx={{ textTransform: 'none', color: '#fff' }}
              >
                Forgot password?
              </Button>
            </Box>
          )}
        </Menu>
      )}

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
