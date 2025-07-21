import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  AppBar,
  Toolbar,
  Stack,
  Chip
} from '@mui/material';
import {
  AccountBalance,
  Receipt,
  Analytics,
  Security,
  Speed,
  Group
} from '@mui/icons-material';

const HomePage = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Receipt sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'סריקת קבלות חכמה',
      description: 'סריקה אוטומטית של קבלות באמצעות OCR מתקדם'
    },
    {
      icon: <Analytics sx={{ fontSize: 40, color: 'secondary.main' }} />,
      title: 'חישוב אופטימלי',
      description: 'אלגוריתם חכם לחלוקה אופטימלית של הוצאות'
    },
    {
      icon: <AccountBalance sx={{ fontSize: 40, color: 'info.main' }} />,
      title: 'ניהול קופה מתקדם',
      description: 'מעקב מלא אחר תזרים מזומנים ויתרות'
    },
    {
      icon: <Security sx={{ fontSize: 40, color: 'success.main' }} />,
      title: 'אבטחה מתקדמת',
      description: 'הגנה מלאה על נתונים פיננסיים רגישים'
    },
    {
      icon: <Speed sx={{ fontSize: 40, color: 'warning.main' }} />,
      title: 'דוחות מהירים',
      description: 'יצירת דוחות חודשיים ויצוא לאקסל'
    },
    {
      icon: <Group sx={{ fontSize: 40, color: 'error.main' }} />,
      title: 'ניהול משתמשים',
      description: 'הרשאות מתקדמות למנהלים ועובדים'
    }
  ];

  return (
    <Box>
      {/* Header */}
      <AppBar position="static" elevation={0}>
        <Toolbar>
          <AccountBalance sx={{ mr: 2, fontSize: 32 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            מערכת ניהול קופה קטנה
          </Typography>
          <Button 
            color="inherit" 
            onClick={() => navigate('/login')}
            sx={{ mr: 1 }}
          >
            התחברות
          </Button>
          <Button 
            variant="outlined" 
            color="inherit"
            onClick={() => navigate('/register')}
            sx={{ 
              borderColor: 'white',
              '&:hover': {
                borderColor: 'white',
                backgroundColor: 'rgba(255, 255, 255, 0.1)'
              }
            }}
          >
            הרשמה
          </Button>
        </Toolbar>
      </AppBar>

      {/* Hero Section */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #1565C0 0%, #2E7D32 100%)',
          color: 'white',
          py: 8,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography variant="h1" gutterBottom>
                ניהול קופה קטנה
                <br />
                <span style={{ color: '#4CAF50' }}>חכם ומתקדם</span>
              </Typography>
              <Typography variant="h5" sx={{ mb: 4, opacity: 0.9 }}>
                פתרון מקצועי לניהול הוצאות, סריקת קבלות אוטומטית וחישוב אופטימלי של החזרים
              </Typography>
              <Stack direction="row" spacing={2} sx={{ mb: 4 }}>
                <Chip 
                  label="OCR מתקדם" 
                  sx={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', color: 'white' }}
                />
                <Chip 
                  label="דוחות אקסל" 
                  sx={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', color: 'white' }}
                />
                <Chip 
                  label="חישוב אופטימלי" 
                  sx={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', color: 'white' }}
                />
              </Stack>
              <Stack direction="row" spacing={2}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => navigate('/register')}
                  sx={{
                    backgroundColor: 'white',
                    color: 'primary.main',
                    '&:hover': {
                      backgroundColor: 'grey.100'
                    }
                  }}
                >
                  התחל עכשיו
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => navigate('/login')}
                  sx={{
                    borderColor: 'white',
                    color: 'white',
                    '&:hover': {
                      borderColor: 'white',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)'
                    }
                  }}
                >
                  התחברות
                </Button>
              </Stack>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: 400
                }}
              >
                <AccountBalance sx={{ fontSize: 200, opacity: 0.3 }} />
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography variant="h2" align="center" gutterBottom>
          תכונות מתקדמות
        </Typography>
        <Typography variant="h6" align="center" color="text.secondary" sx={{ mb: 6 }}>
          כל מה שאתה צריך לניהול קופה קטנה מקצועי ויעיל
        </Typography>
        
        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} md={6} lg={4} key={index}>
              <Card 
                sx={{ 
                  height: '100%',
                  transition: 'transform 0.3s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4
                  }
                }}
              >
                <CardContent sx={{ textAlign: 'center', p: 4 }}>
                  <Box sx={{ mb: 2 }}>
                    {feature.icon}
                  </Box>
                  <Typography variant="h5" gutterBottom>
                    {feature.title}
                  </Typography>
                  <Typography color="text.secondary">
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* CTA Section */}
      <Box
        sx={{
          backgroundColor: 'grey.100',
          py: 8
        }}
      >
        <Container maxWidth="md">
          <Box textAlign="center">
            <Typography variant="h3" gutterBottom>
              מוכן להתחיל?
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
              הצטרף למאות עסקים שכבר משתמשים במערכת שלנו
            </Typography>
            <Stack direction="row" spacing={2} justifyContent="center">
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate('/register')}
              >
                הרשמה חינם
              </Button>
              <Button
                variant="outlined"
                size="large"
                onClick={() => navigate('/login')}
              >
                התחברות
              </Button>
            </Stack>
          </Box>
        </Container>
      </Box>

      {/* Footer */}
      <Box
        sx={{
          backgroundColor: 'grey.900',
          color: 'white',
          py: 4
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Box display="flex" alignItems="center" mb={2}>
                <AccountBalance sx={{ mr: 1 }} />
                <Typography variant="h6">
                  מערכת ניהול קופה קטנה
                </Typography>
              </Box>
              <Typography color="grey.400">
                פתרון מקצועי ומתקדם לניהול הוצאות ועובדים
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                צור קשר
              </Typography>
              <Typography color="grey.400">
                support@pettycash.co.il
              </Typography>
              <Typography color="grey.400">
                03-1234567
              </Typography>
            </Grid>
          </Grid>
          <Box mt={4} pt={4} borderTop={1} borderColor="grey.700">
            <Typography variant="body2" color="grey.400" align="center">
              © 2024 מערכת ניהול קופה קטנה. כל הזכויות שמורות.
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default HomePage;
