import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext'; 
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  Grid,
  Divider
} from '@mui/material';
import {
  AccountBalance,
  Login as LoginIcon,
  ArrowBack
} from '@mui/icons-material';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth(); 
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await login(formData.username, formData.password);
      
      if (result.success) {
        const role = formData.username === 'admin' ? 'admin' : 'client';
        if (role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      } else {
        setError(result.message || 'שגיאה בהתחברות');
        setLoading(false);
      }
    } catch (err) {
      setError('שגיאה בהתחברות');
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1565C0 0%, #2E7D32 100%)',
        display: 'flex',
        alignItems: 'center',
        py: 4
      }}
    >
      <Container component="main" maxWidth="md">
        <Paper 
          elevation={8} 
          sx={{ 
            p: 4, 
            borderRadius: 3,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Button
              startIcon={<ArrowBack />}
              onClick={() => navigate('/')}
              sx={{ mr: 2 }}
            >
              חזרה
            </Button>
            <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1, justifyContent: 'center' }}>
              <AccountBalance sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
              <Typography variant="h4" color="primary">
                מערכת ניהול קופה קטנה
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ mb: 4 }} />

          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Box sx={{ pr: { md: 2 } }}>
                <Typography variant="h5" gutterBottom color="primary">
                  התחברות למערכת
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                  הכנס את פרטי ההתחברות שלך כדי לגשת למערכת
                </Typography>

                {error && (
                  <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                  </Alert>
                )}

                <Box component="form" onSubmit={handleSubmit}>
                  <TextField
                    margin="normal"
                    required
                    fullWidth
                    id="username"
                    label="שם משתמש או אימייל"
                    name="username"
                    autoComplete="username"
                    autoFocus
                    value={formData.username}
                    onChange={handleChange}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    margin="normal"
                    required
                    fullWidth
                    name="password"
                    label="סיסמה"
                    type="password"
                    id="password"
                    autoComplete="current-password"
                    value={formData.password}
                    onChange={handleChange}
                    sx={{ mb: 3 }}
                  />
                  
                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    startIcon={<LoginIcon />}
                    sx={{ mt: 2, mb: 2, py: 1.5 }}
                    disabled={loading}
                  >
                    {loading ? 'מתחבר...' : 'התחברות'}
                  </Button>

                  <Box sx={{ textAlign: 'center', mt: 2 }}>
                    <Typography variant="body2">
                      אין לך חשבון?{' '}
                      <Link 
                        to="/register" 
                        style={{ 
                          color: '#1565C0', 
                          textDecoration: 'none',
                          fontWeight: 500
                        }}
                      >
                        הרשם כאן
                      </Link>
                    </Typography>
                  </Box>

                  <Box sx={{ mt: 4, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
                    <Typography variant="body2" color="text.secondary" align="center" gutterBottom>
                      <strong>חשבונות לדמו:</strong>
                    </Typography>
                    <Typography variant="body2" color="text.secondary" align="center">
                      מנהל: admin / admin123
                    </Typography>
                    <Typography variant="body2" color="text.secondary" align="center">
                      עובד: user / user123
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  height: '100%',
                  background: 'linear-gradient(135deg, #1565C0 0%, #2E7D32 100%)',
                  borderRadius: 2,
                  p: 4,
                  color: 'white',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center'
                }}
              >
                <Typography variant="h5" gutterBottom>
                  ברוכים הבאים חזרה!
                </Typography>
                <Typography variant="body1" sx={{ mb: 4, opacity: 0.9 }}>
                  התחבר למערכת כדי לנהל את הוצאות הקופה הקטנה שלך בצורה חכמה ויעילה
                </Typography>
                
                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    מה חדש במערכת:
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                    🆕 סריקת קבלות משופרת
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                    📊 דוחות חודשיים מתקדמים
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                    💰 חישוב אופטימלי של החזרים
                  </Typography>
                  <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
                    📱 ממשק משתמש משופר
                  </Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </Container>
    </Box>
  );
};

export default Login;
