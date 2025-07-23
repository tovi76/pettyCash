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

// פונקציה לייצוא לאקסל עם תמיכה משופרת בעברית
const exportToExcel = (data, filename) => {
  // הוספת BOM לתמיכה בעברית באקסל
  const BOM = '\uFEFF';
  
  // יצירת CSV עם קידוד UTF-8 מלא לעברית
  const csvContent = data.map(row => {
    const values = Array.isArray(row) ? row : Object.values(row);
    return values.map(val => {
      // המרת ערכים למחרוזת וטיפול בתווים מיוחדים
      const stringVal = String(val || '');
      // אם יש פסיק, מרכאות או שור חדש - עטיפה במרכאות
      if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n') || stringVal.includes('\r')) {
        return `"${stringVal.replace(/"/g, '""')}"`;
      }
      return stringVal;
    }).join(',');
  }).join('\r\n'); // שימוש ב-CRLF לתאימות מלאה עם אקסל
  
  // יצירת Blob עם קידוד UTF-8 מלא
  const blob = new Blob([BOM + csvContent], { 
    type: 'text/csv;charset=utf-8;' 
  });
  
  // הורדת הקובץ
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // ניקוי הזיכרון
  URL.revokeObjectURL(url);
};

const AdminDashboard = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogType, setDialogType] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [filters, setFilters] = useState({
    employee: '',
    category: '',
    date: ''
  });
  const [filteredTransactions, setFilteredTransactions] = useState([]);

  const users = [
    { id: 1, name: 'יוסי כהן', username: 'yossi', monthlyBudget: 1500, currentSpent: 420, status: 'active' },
    { id: 2, name: 'שרה לוי', username: 'sara', monthlyBudget: 1200, currentSpent: 680, status: 'active' },
    { id: 3, name: 'דוד מזרחי', username: 'david', monthlyBudget: 2000, currentSpent: 1250, status: 'active' },
    { id: 4, name: 'מיכל אברהם', username: 'michal', monthlyBudget: 1000, currentSpent: 200, status: 'active' },
  ];

  const budgetRequests = [
    { 
      id: 1, 
      employeeName: 'דוד מזרחי', 
      requestedAmount: 500, 
      reason: 'רכישת ציוד משרדי דחוף לפרויקט חדש', 
      currentBudget: 2000,
      currentSpent: 1250,
      date: '2024-01-22',
      status: 'pending'
    },
    { 
      id: 2, 
      employeeName: 'שרה לוי', 
      requestedAmount: 300, 
      reason: 'השתתפות בכנס מקצועי', 
      currentBudget: 1200,
      currentSpent: 680,
      date: '2024-01-21',
      status: 'pending'
    },
    { 
      id: 3, 
      employeeName: 'יוסי כהן', 
      requestedAmount: 200, 
      reason: 'הוצאות נסיעה לפגישת לקוח', 
      currentBudget: 1500,
      currentSpent: 420,
      date: '2024-01-20',
      status: 'approved'
    },
  ];

  // חישוב דינמי של יתרת הקופה הכוללת
  const totalBudgets = users.reduce((sum, user) => sum + user.monthlyBudget, 0);
  const totalSpent = users.reduce((sum, user) => sum + user.currentSpent, 0);
  const totalCashBalance = totalBudgets - totalSpent; // יתרת קופה = סך תקציבים - סך הוצאות

  // Mock data
  const dashboardStats = {
    totalCashBalance: totalCashBalance, // יתרת קופה כוללת - הסכום הכולל של יתרות התקציבים החודשיים
    monthlyExpenses: totalSpent, // הוצאות החודש - הסכום של כל הקבלות שהועלו על ידי העובדים
    usersWithReceipts: users.filter(user => user.currentSpent > 0).length, // משתמשים - כמות העובדים שהעלו החודש קבלות
    pendingRequests: budgetRequests.filter(req => req.status === 'pending').length // בקשות - כמות הבקשות לאישור הוצאה מיוחדת שלא טופלו
  };

  const recentTransactions = [
    { id: 1, user: 'יוסי כהן', amount: 250, category: 'אוכל', date: '2024-01-20', status: 'approved' },
    { id: 2, user: 'שרה לוי', amount: 180, category: 'תחבורה', date: '2024-01-19', status: 'pending' },
    { id: 3, user: 'דוד מזרחי', amount: 320, category: 'ציוד משרדי', date: '2024-01-18', status: 'approved' },
    { id: 4, user: 'מיכל אברהם', amount: 150, category: 'אוכל', date: '2024-01-17', status: 'approved' },
    { id: 5, user: 'יוסי כהן', amount: 90, category: 'תחבורה', date: '2024-01-16', status: 'approved' },
  ];

  // פונקציה להחלת סינון
  const applyFilters = () => {
    let filtered = recentTransactions;
    
    if (filters.employee) {
      filtered = filtered.filter(t => t.user === filters.employee);
    }
    
    if (filters.category) {
      filtered = filtered.filter(t => t.category === filters.category);
    }
    
    if (filters.date) {
      filtered = filtered.filter(t => t.date >= filters.date);
    }
    
    setFilteredTransactions(filtered);
  };

  // פונקציה לניקוי סינון
  const clearFilters = () => {
    setFilters({ employee: '', category: '', date: '' });
    setFilteredTransactions(recentTransactions);
  };

  // איניציאליזציה של רשימת העסקאות המסוננות
  React.useEffect(() => {
    if (filters.employee === '' && filters.category === '' && filters.date === '') {
      setFilteredTransactions(recentTransactions);
    }
  }, []);

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
              {typeof value === 'number' && (title === 'יתרת קופה כוללת' || title === 'הוצאות החודש') ? 
                `₪${value.toLocaleString()}` : 
                (typeof value === 'number' ? value.toLocaleString() : value)
              }
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
            value={dashboardStats.totalCashBalance}
            icon={<AccountBalance />}
            color="primary"
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
            title="משתמשים"
            value={dashboardStats.usersWithReceipts}
            icon={<People />}
            color="info"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="בקשות"
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
          <Tab label="בקשות חריגה" />
          <Tab label="דוחות" />
        </Tabs>

        {/* Recent Transactions Tab */}
        <TabPanel value={currentTab} index={0}>
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">צפייה בהוצאות</Typography>
              <Button
                variant="outlined"
                startIcon={<Download />}
                onClick={() => {
                  const dataToExport = filteredTransactions.length > 0 ? filteredTransactions : recentTransactions;
                  const exportData = [
                    ['משתמש', 'סכום', 'קטגוריה', 'תאריך'], // כותרות
                    ...dataToExport.map(t => [t.user, t.amount, t.category, t.date])
                  ];
                  exportToExcel(exportData, 'הוצאות-נוכחיות.csv');
                }}
              >
                ייצוא לאקסל
              </Button>
            </Box>
            
            {/* Filters Section */}
            <Paper sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
              <Typography variant="subtitle1" gutterBottom>
                סינון הוצאות
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>סינון לפי עובד</InputLabel>
                    <Select 
                      label="סינון לפי עובד" 
                      value={filters.employee}
                      onChange={(e) => setFilters({...filters, employee: e.target.value})}
                    >
                      <MenuItem value="">כל העובדים</MenuItem>
                      <MenuItem value="יוסי כהן">יוסי כהן</MenuItem>
                      <MenuItem value="שרה לוי">שרה לוי</MenuItem>
                      <MenuItem value="דוד מזרחי">דוד מזרחי</MenuItem>
                      <MenuItem value="מיכל אברהם">מיכל אברהם</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>סינון לפי קטגוריה</InputLabel>
                    <Select 
                      label="סינון לפי קטגוריה" 
                      value={filters.category}
                      onChange={(e) => setFilters({...filters, category: e.target.value})}
                    >
                      <MenuItem value="">כל הקטגוריות</MenuItem>
                      <MenuItem value="אוכל">אוכל</MenuItem>
                      <MenuItem value="תחבורה">תחבורה</MenuItem>
                      <MenuItem value="ציוד משרדי">ציוד משרדי</MenuItem>
                      <MenuItem value="אחר">אחר</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    size="small"
                    type="date"
                    label="מתאריך"
                    value={filters.date}
                    onChange={(e) => setFilters({...filters, date: e.target.value})}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </Grid>
              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                <Button 
                  variant="contained" 
                  size="small"
                  onClick={applyFilters}
                >
                  החל סינון
                </Button>
                <Button 
                  variant="outlined" 
                  size="small"
                  onClick={clearFilters}
                >
                  נקה סינון
                </Button>
              </Box>
            </Paper>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>משתמש</TableCell>
                    <TableCell>סכום</TableCell>
                    <TableCell>קטגוריה</TableCell>
                    <TableCell>תאריך</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(filteredTransactions.length > 0 ? filteredTransactions : recentTransactions).map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>{transaction.user}</TableCell>
                      <TableCell>₪{transaction.amount}</TableCell>
                      <TableCell>{transaction.category}</TableCell>
                      <TableCell>{transaction.date}</TableCell>
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
                    <TableCell>שם העובד</TableCell>
                    <TableCell>שם משתמש</TableCell>
                    <TableCell>תקציב חודשי</TableCell>
                    <TableCell>יתרה</TableCell>
                    <TableCell>פעולות</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((user) => {
                    const remainingBudget = user.monthlyBudget - user.currentSpent;
                    const isOverBudget = remainingBudget < 0;
                    
                    return (
                      <TableRow key={user.id}>
                        <TableCell>{user.name}</TableCell>
                        <TableCell>{user.username}</TableCell>
                        <TableCell>₪{user.monthlyBudget.toLocaleString()}</TableCell>
                        <TableCell>
                          <Typography 
                            color={isOverBudget ? 'error' : 'success.main'}
                            fontWeight={isOverBudget ? 'bold' : 'normal'}
                          >
                            ₪{Math.abs(remainingBudget).toLocaleString()}
                            {isOverBudget && ' (חריגה)'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <IconButton 
                            size="small" 
                            onClick={() => {
                              setSelectedUser(user);
                              handleOpenDialog('editUser');
                            }}
                            title="עריכת משתמש"
                          >
                            <Edit />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            onClick={() => {
                              setSelectedUser(user);
                              handleOpenDialog('deleteUser');
                            }}
                            title="מחיקת משתמש"
                            color="error"
                          >
                            <Delete />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </TabPanel>

        {/* Budget Requests Tab */}
        <TabPanel value={currentTab} index={2}>
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">בקשות חריגה מתקציב</Typography>
              <Chip 
                label={`${budgetRequests.filter(req => req.status === 'pending').length} בקשות ממתינות`}
                color="warning"
                variant="outlined"
              />
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>שם העובד</TableCell>
                    <TableCell>סכום מבוקש</TableCell>
                    <TableCell>סיבה</TableCell>
                    <TableCell>תאריך</TableCell>
                    <TableCell>סטטוס</TableCell>
                    <TableCell>פעולות</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {budgetRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>{request.employeeName}</TableCell>
                      <TableCell>₪{request.requestedAmount.toLocaleString()}</TableCell>
                      <TableCell sx={{ maxWidth: 200 }}>
                        <Typography variant="body2" noWrap title={request.reason}>
                          {request.reason}
                        </Typography>
                      </TableCell>
                      <TableCell>{request.date}</TableCell>
                      <TableCell>
                        <Chip
                          label={
                            request.status === 'pending' ? 'ממתין' :
                            request.status === 'approved' ? 'אושר' : 'נדחה'
                          }
                          color={
                            request.status === 'pending' ? 'warning' :
                            request.status === 'approved' ? 'success' : 'error'
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {request.status === 'pending' && (
                          <>
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              sx={{ mr: 1, minWidth: 60 }}
                              onClick={() => {
                                // עדכון סטטוס לאושר
                                const updatedRequests = budgetRequests.map(req => 
                                  req.id === request.id ? { ...req, status: 'approved' } : req
                                );
                                console.log('בקשה אושרה:', request.id);
                              }}
                            >
                              אשר
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              sx={{ minWidth: 60 }}
                              onClick={() => {
                                // עדכון סטטוס לנדחה
                                const updatedRequests = budgetRequests.map(req => 
                                  req.id === request.id ? { ...req, status: 'rejected' } : req
                                );
                                console.log('בקשה נדחתה:', request.id);
                              }}
                            >
                              דחה
                            </Button>
                          </>
                        )}
                        {request.status !== 'pending' && (
                          <Typography variant="body2" color="text.secondary">
                            טופל
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </TabPanel>

        {/* Reports Tab */}
        <TabPanel value={currentTab} index={3}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>הפקת דוחות</Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>דוח החודש</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      הדוח כולל: סכום ההוצאה, קטגוריה, שם העובד, תאריך
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="primary">
                        סה"כ הוצאות החודש: ₪{totalSpent.toLocaleString()}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        מספר עסקאות: {recentTransactions.length} | עובדים פעילים: {users.filter(user => user.status === 'active').length}
                      </Typography>
                    </Box>
                    <Button
                      variant="contained"
                      startIcon={<Download />}
                      fullWidth
                      onClick={() => {
                        const monthlyReportData = [
                          ['שם העובד', 'סכום ההוצאה', 'קטגוריה', 'תאריך'], // כותרות
                          ...recentTransactions.map(t => [t.user, t.amount, t.category, t.date])
                        ];
                        exportToExcel(monthlyReportData, `דוח-חודשי-${new Date().getMonth() + 1}-${new Date().getFullYear()}.csv`);
                      }}
                    >
                      הפקת מסמך אקסל
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>דוחות קודמים</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      צפייה והורדה של דוחות מחודשים קודמים
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        דוחות זמינים:
                      </Typography>
                      <Typography variant="body2">
                        • דצמבר 2023 - ₪12,340
                      </Typography>
                      <Typography variant="body2">
                        • נובמבר 2023 - ₪9,870
                      </Typography>
                      <Typography variant="body2">
                        • אוקטובר 2023 - ₪11,250
                      </Typography>
                    </Box>
                    <Button
                      variant="outlined"
                      startIcon={<Visibility />}
                      fullWidth
                      onClick={() => console.log('צפייה בדוחות קודמים')}
                    >
                      צפה והורד דוחות
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
          {dialogType === 'user' ? 'הוסף עובד חדש' : 
           dialogType === 'editUser' ? 'עריכת עובד' :
           dialogType === 'deleteUser' ? 'מחיקת עובד' :
           'הוסף עסקה חדשה'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {dialogType === 'user' ? (
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField 
                    fullWidth 
                    label="שם העובד" 
                    placeholder="הכנס שם מלא"
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField 
                    fullWidth 
                    label="שם משתמש" 
                    placeholder="הכנס שם משתמש להתחברות"
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField 
                    fullWidth 
                    label="סיסמה" 
                    type="password"
                    placeholder="הכנס סיסמה למשתמש"
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField 
                    fullWidth 
                    label="תקציב חודשי (₪)" 
                    type="number"
                    placeholder="1000"
                    required
                    InputProps={{
                      startAdornment: '₪'
                    }}
                  />
                </Grid>
              </Grid>
            ) : dialogType === 'editUser' ? (
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField 
                    fullWidth 
                    label="שם העובד" 
                    defaultValue={selectedUser?.name || ''}
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField 
                    fullWidth 
                    label="שם משתמש" 
                    defaultValue={selectedUser?.username || ''}
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField 
                    fullWidth 
                    label="סיסמה חדשה" 
                    type="password"
                    placeholder="השאר ריק לשמירת סיסמה נוכחית"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField 
                    fullWidth 
                    label="תקציב חודשי (₪)" 
                    type="number"
                    defaultValue={selectedUser?.monthlyBudget || ''}
                    required
                    InputProps={{
                      startAdornment: '₪'
                    }}
                  />
                </Grid>
              </Grid>
            ) : dialogType === 'deleteUser' ? (
              <Box>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  האם אתה בטוח שברצונך למחוק את העובד?
                </Typography>
                <Typography variant="h6" color="error" sx={{ mb: 1 }}>
                  {selectedUser?.name || 'משתמש לא נבחר'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  פעולה זו לא ניתנת לביטול ותמחק את כל הנתונים הקשורים לעובד.
                </Typography>
              </Box>
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
          <Button 
            variant="contained" 
            onClick={handleCloseDialog}
            color={dialogType === 'deleteUser' ? 'error' : 'primary'}
          >
            {dialogType === 'deleteUser' ? 'מחק עובד' : 'שמור'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminDashboard;
