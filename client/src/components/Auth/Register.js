import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider
} from '@mui/material';
import {
  AccountBalance,
  PersonAdd,
  ArrowBack
} from '@mui/icons-material';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'client',
    department: '',
    employeeId: ''
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

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('הסיסמאות אינן תואמות');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('הסיסמה חייבת להכיל לפחות 6 תווים');
      setLoading(false);
      return;
    }

    try {
      // TODO: Implement actual registration logic
      console.log('Registration attempt:', formData);
      setError('הרישום עדיין לא מיושם - זהו demo');
    } catch (err) {
      setError('שגיאה ברישום');
    } finally {
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
                  הצטרף למערכת
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                  צור חשבון חדש כדי להתחיל לנהל את הוצאות הקופה הקטנה שלך
                </Typography>

                {error && (
                  <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                  </Alert>
                )}

                <Box component="form" onSubmit={handleSubmit}>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        required
                        fullWidth
                        id="fullName"
                        label="שם מלא"
                        name="fullName"
                        autoComplete="name"
                        value={formData.fullName}
                        onChange={handleChange}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        required
                        fullWidth
                        id="username"
                        label="שם משתמש"
                        name="username"
                        autoComplete="username"
                        value={formData.username}
                        onChange={handleChange}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        required
                        fullWidth
                        id="email"
                        label="כתובת אימייל"
                        name="email"
                        type="email"
                        autoComplete="email"
                        value={formData.email}
                        onChange={handleChange}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        required
                        fullWidth
                        name="password"
                        label="סיסמה"
                        type="password"
                        id="password"
                        autoComplete="new-password"
                        value={formData.password}
                        onChange={handleChange}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        required
                        fullWidth
                        name="confirmPassword"
                        label="אישור סיסמה"
                        type="password"
                        id="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel id="role-label">תפקיד</InputLabel>
                        <Select
                          labelId="role-label"
                          id="role"
                          name="role"
                          value={formData.role}
                          label="תפקיד"
                          onChange={handleChange}
                        >
                          <MenuItem value="client">עובד</MenuItem>
                          <MenuItem value="admin">מנהל</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        id="department"
                        label="מחלקה"
                        name="department"
                        value={formData.department}
                        onChange={handleChange}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        id="employeeId"
                        label="מספר עובד"
                        name="employeeId"
                        value={formData.employeeId}
                        onChange={handleChange}
                      />
                    </Grid>
                  </Grid>

                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    startIcon={<PersonAdd />}
                    sx={{ mt: 3, mb: 2, py: 1.5 }}
                    disabled={loading}
                  >
                    {loading ? 'נרשם...' : 'הרשמה'}
                  </Button>

                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="body2">
                      כבר יש לך חשבון?{' '}
                      <Link 
                        to="/login" 
                        style={{ 
                          color: '#1565C0', 
                          textDecoration: 'none',
                          fontWeight: 500
                        }}
                      >
                        התחבר כאן
                      </Link>
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
                  למה לבחור במערכת שלנו?
                </Typography>
                <Box sx={{ mt: 3 }}>
                  <Typography variant="body1" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                    ✓ סריקת קבלות אוטומטית עם OCR
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                    ✓ חישוב אופטימלי של החזרים
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                    ✓ דוחות חודשיים מפורטים
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                    ✓ יצוא לאקסל וניהול מתקדם
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                    ✓ אבטחה מתקדמת ושמירת נתונים
                  </Typography>
                  <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center' }}>
                    ✓ תמיכה טכנית מלאה
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

export default Register;
