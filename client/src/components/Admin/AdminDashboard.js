import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Paper,
  Button,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  AccountBalance,
  TrendingUp,
  People,
  Receipt,
  Download,
  Add,
  Edit,
  Delete,
  Visibility,
  Analytics
} from '@mui/icons-material';

const AdminDashboard = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogType, setDialogType] = useState('');

  // Mock data
  const dashboardStats = {
    totalBalance: 15750,
    monthlyExpenses: 8420,
    activeUsers: 12,
    pendingRequests: 3,
    monthlyChange: 12.5
  };

  const recentTransactions = [
    { id: 1, user: 'יוסי כהן', amount: 250, category: 'אוכל', date: '2024-01-20', status: 'approved' },
    { id: 2, user: 'שרה לוי', amount: 180, category: 'תחבורה', date: '2024-01-19', status: 'pending' },
    { id: 3, user: 'דוד מזרחי', amount: 320, category: 'ציוד משרדי', date: '2024-01-18', status: 'approved' },
  ];

  const users = [
    { id: 1, name: 'יוסי כהן', email: 'yossi@company.com', department: 'פיתוח', balance: 500, status: 'active' },
    { id: 2, name: 'שרה לוי', email: 'sara@company.com', department: 'שיווק', balance: 300, status: 'active' },
    { id: 3, name: 'דוד מזרחי', email: 'david@company.com', department: 'מכירות', balance: 750, status: 'active' },
  ];

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const handleOpenDialog = (type) => {
    setDialogType(type);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setDialogType('');
  };

  const StatCard = ({ title, value, icon, color, change }) => (
    <Card sx={{ height: '100%', position: 'relative', overflow: 'visible' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography color="textSecondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h4" component="div" color={color}>
              {typeof value === 'number' ? `₪${value.toLocaleString()}` : value}
            </Typography>
            {change && (
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <TrendingUp sx={{ fontSize: 16, color: 'success.main', mr: 0.5 }} />
                <Typography variant="body2" color="success.main">
                  +{change}% מהחודש הקודם
                </Typography>
              </Box>
            )}
          </Box>
          <Box
            sx={{
              backgroundColor: `${color}.light`,
              borderRadius: '50%',
              p: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {React.cloneElement(icon, { sx: { fontSize: 32, color: `${color}.main` } })}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  const TabPanel = ({ children, value, index }) => (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );

  return (
    <Box>
      <Typography variant="h4" gutterBottom color="primary">
        דשבורד מנהל
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        ניהול מקיף של מערכת הקופה הקטנה
      </Typography>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="יתרת קופה כוללת"
            value={dashboardStats.totalBalance}
            icon={<AccountBalance />}
            color="primary"
            change={dashboardStats.monthlyChange}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="הוצאות החודש"
            value={dashboardStats.monthlyExpenses}
            icon={<Receipt />}
            color="secondary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="משתמשים פעילים"
            value={dashboardStats.activeUsers}
            icon={<People />}
            color="info"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="בקשות ממתינות"
            value={dashboardStats.pendingRequests}
            icon={<Analytics />}
            color="warning"
          />
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ width: '100%' }}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab label="עסקאות אחרונות" />
          <Tab label="ניהול משתמשים" />
          <Tab label="דוחות" />
          <Tab label="הגדרות" />
        </Tabs>

        {/* Recent Transactions Tab */}
        <TabPanel value={currentTab} index={0}>
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">עסקאות אחרונות</Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => handleOpenDialog('transaction')}
              >
                הוסף עסקה
              </Button>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>משתמש</TableCell>
                    <TableCell>סכום</TableCell>
                    <TableCell>קטגוריה</TableCell>
                    <TableCell>תאריך</TableCell>
                    <TableCell>סטטוס</TableCell>
                    <TableCell>פעולות</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>{transaction.user}</TableCell>
                      <TableCell>₪{transaction.amount}</TableCell>
                      <TableCell>{transaction.category}</TableCell>
                      <TableCell>{transaction.date}</TableCell>
                      <TableCell>
                        <Chip
                          label={transaction.status === 'approved' ? 'אושר' : 'ממתין'}
                          color={transaction.status === 'approved' ? 'success' : 'warning'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <IconButton size="small">
                          <Visibility />
                        </IconButton>
                        <IconButton size="small">
                          <Edit />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </TabPanel>

        {/* Users Management Tab */}
        <TabPanel value={currentTab} index={1}>
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">ניהול משתמשים</Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => handleOpenDialog('user')}
              >
                הוסף משתמש
              </Button>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>שם</TableCell>
                    <TableCell>אימייל</TableCell>
                    <TableCell>מחלקה</TableCell>
                    <TableCell>יתרה</TableCell>
                    <TableCell>סטטוס</TableCell>
                    <TableCell>פעולות</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.department}</TableCell>
                      <TableCell>₪{user.balance}</TableCell>
                      <TableCell>
                        <Chip
                          label={user.status === 'active' ? 'פעיל' : 'לא פעיל'}
                          color={user.status === 'active' ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <IconButton size="small">
                          <Edit />
                        </IconButton>
                        <IconButton size="small">
                          <Delete />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </TabPanel>

        {/* Reports Tab */}
        <TabPanel value={currentTab} index={2}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>דוחות ואנליטיקה</Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>דוח חודשי</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      צור דוח מפורט לחודש הנוכחי
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<Download />}
                      fullWidth
                    >
                      הורד דוח חודשי (Excel)
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>דוחות קודמים</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      צפה והורד דוחות מחודשים קודמים
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<Visibility />}
                      fullWidth
                    >
                      צפה בדוחות קודמים
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>

        {/* Settings Tab */}
        <TabPanel value={currentTab} index={3}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>הגדרות מערכת</Typography>
            <Typography variant="body2" color="text.secondary">
              הגדרות מתקדמות יתווספו בגרסאות הבאות
            </Typography>
          </Box>
        </TabPanel>
      </Paper>

      {/* Dialog for adding new items */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {dialogType === 'user' ? 'הוסף משתמש חדש' : 'הוסף עסקה חדשה'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {dialogType === 'user' ? (
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField fullWidth label="שם מלא" />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth label="אימייל" type="email" />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth label="מחלקה" />
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>תפקיד</InputLabel>
                    <Select label="תפקיד">
                      <MenuItem value="client">עובד</MenuItem>
                      <MenuItem value="admin">מנהל</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            ) : (
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField fullWidth label="תיאור העסקה" />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth label="סכום" type="number" />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth label="קטגוריה" />
                </Grid>
              </Grid>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>ביטול</Button>
          <Button variant="contained" onClick={handleCloseDialog}>
            שמור
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminDashboard;
