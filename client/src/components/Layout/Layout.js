import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Box, 
  AppBar, 
  Toolbar, 
  Typography, 
  Container, 
  Button, 
  Chip,
  Stack
} from '@mui/material';
import { 
  Logout as LogoutIcon, 
  AccountBalance,
  AdminPanelSettings,
  Person
} from '@mui/icons-material';

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getRoleIcon = () => {
    return user?.role === 'admin' ? <AdminPanelSettings /> : <Person />;
  };

  const getRoleText = () => {
    return user?.role === 'admin' ? 'מנהל' : 'משתמש';
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static" sx={{ background: 'linear-gradient(135deg, #1565C0 0%, #2E7D32 100%)' }}>
        <Toolbar>
          <AccountBalance sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            מערכת ניהול קופה קטנה
          </Typography>
          
          {user && (
            <Stack direction="row" spacing={2} alignItems="center">
              <Chip
                icon={getRoleIcon()}
                label={`${user.username} (${getRoleText()})`}
                variant="outlined"
                sx={{ 
                  color: 'white', 
                  borderColor: 'white',
                  '& .MuiChip-icon': { color: 'white' }
                }}
              />
              <Button
                color="inherit"
                startIcon={<LogoutIcon />}
                onClick={handleLogout}
                sx={{ 
                  border: '1px solid rgba(255,255,255,0.3)',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.1)'
                  }
                }}
              >
                התנתק
              </Button>
            </Stack>
          )}
        </Toolbar>
      </AppBar>
      
      <Container component="main" sx={{ flexGrow: 1, py: 3 }}>
        {children}
      </Container>
    </Box>
  );
};

export default Layout;
