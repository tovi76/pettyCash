import React, { useState, useEffect } from 'react';
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
  Analytics,
  GetApp
} from '@mui/icons-material';
import { usersAPI, specialRequestsAPI, transactionsAPI } from '../../services/api';

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
  const [selectedUser, setSelectedUser] = useState(null);
  const [filters, setFilters] = useState({
    employee: '',
    category: '',
    date: ''
  });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddUserDialog, setShowAddUserDialog] = useState(false);
  const [showEditUserDialog, setShowEditUserDialog] = useState(false);
  const [newUserData, setNewUserData] = useState({
    email: '',
    password: '',
    username: '',
    full_name: '',
    department: '',
    monthly_budget: 0
  });
  const [editUserData, setEditUserData] = useState({
    email: '',
    password: '',
    username: '',
    full_name: '',
    department: '',
    monthly_budget: 0
  });

  // Special requests state
  const [specialRequests, setSpecialRequests] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [requestAction, setRequestAction] = useState(''); // 'approve' or 'reject'
  const [adminNotes, setAdminNotes] = useState('');
  
  // Real transactions state
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({
    totalCashBalance: 0,
    monthlyExpenses: 0,
    usersWithReceipts: 0,
    pendingRequests: 0
  });

  // טעינת נתונים מהשרת - סדר חשוב!
  useEffect(() => {
    const loadAllData = async () => {
      console.log('🚀 Starting to load all dashboard data...');
      // Load users first
      await loadUsers();
      // Then load other data
      await loadSpecialRequests();
      await loadTransactions();
      console.log('✅ All dashboard data loaded!');
    };
    
    loadAllData();
  }, []);
  
  // Recalculate stats when users or transactions change
  useEffect(() => {
    if (users.length > 0 && recentTransactions.length >= 0) {
      console.log('🔄 Users or transactions changed, recalculating stats...');
      console.log('👥 Users available for calculation:', users.length);
      console.log('📊 Transactions available for calculation:', recentTransactions.length);
      calculateDashboardStats(recentTransactions);
    }
  }, [users, recentTransactions]);

  // Update pending requests count when specialRequests changes
  useEffect(() => {
    console.log('🔄 Special requests changed, updating pending count...');
    const pendingCount = specialRequests.filter(req => req.status === 'pending').length;
    console.log('📊 Pending requests count:', pendingCount);
    setDashboardStats(prevStats => ({
      ...prevStats,
      pendingRequests: pendingCount
    }));
  }, [specialRequests]);

  // Calculate dashboard statistics from transactions
  const calculateDashboardStats = (transactions) => {
    console.log('📊 Calculating dashboard stats from', transactions.length, 'transactions');
    
    // Calculate monthly expenses - ensure numeric calculation
    const monthlyExpenses = transactions.reduce((total, transaction) => {
      // Ensure amount is treated as a number
      const amount = parseFloat(transaction.amount) || 0;
      console.log(`💰 Adding transaction amount: ${amount} (type: ${typeof amount})`);
      return total + amount;
    }, 0);
    
    // Calculate total cash balance (sum of all user budgets minus expenses)
    const totalUserBudgets = users.reduce((total, user) => {
      const budget = parseFloat(user.monthly_budget) || 0;
      return total + budget;
    }, 0);
    
    const totalCashBalance = totalUserBudgets - monthlyExpenses;
    
    // Count users with receipts
    const usersWithReceipts = new Set(transactions.map(t => t.user_id)).size;
    
    console.log('📊 Calculated stats:');
    console.log('  💰 Monthly expenses:', monthlyExpenses, '(type:', typeof monthlyExpenses, ')');
    console.log('  🏦 Total cash balance:', totalCashBalance);
    console.log('  👥 Users with receipts:', usersWithReceipts);
    
    setDashboardStats(prevStats => ({
      ...prevStats,
      totalCashBalance: Math.round(totalCashBalance * 100) / 100, // Round to 2 decimal places
      monthlyExpenses: Math.round(monthlyExpenses * 100) / 100, // Round to 2 decimal places
      usersWithReceipts
    }));
  };

  // Load special requests
  const loadSpecialRequests = async () => {
    try {
      console.log('🔄 Loading special requests...');
      const [allRequestsResponse, pendingRequestsResponse] = await Promise.all([
        specialRequestsAPI.getAllRequests(),
        specialRequestsAPI.getAllPending()
      ]);

      if (allRequestsResponse.success) {
        setSpecialRequests(allRequestsResponse.requests);
      }

      if (pendingRequestsResponse.success) {
        setPendingRequests(pendingRequestsResponse.requests);
      }
    } catch (error) {
      console.error('❌ Error loading special requests:', error);
    }
  };

  const loadUsers = async () => {
    try {
      console.log('🔄 Loading users...');
      setLoading(true);
      setError(null);
      const response = await usersAPI.getAll();
      console.log('📊 Users API response:', response);
      if (response.success) {
        console.log('✅ Users loaded successfully:', response.data.length, 'users');
        setUsers(response.data);
        console.log('📊 Users set in state, ready for calculations');
      } else {
        console.error('❌ Users API failed:', response.message);
        setError('שגיאה בטעינת רשימת המשתמשים');
      }
    } catch (error) {
      console.error('❌ Error loading users:', error);
      console.error('Error details:', error.response?.data || error.message);
      setError('שגיאה בחיבור לשרת');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async () => {
    try {
      // Check if user is authenticated
      const token = localStorage.getItem('authToken');
      console.log('🔐 Auth token exists:', !!token);
      if (!token) {
        console.error('❌ No auth token found!');
        alert('אין טוקן אימות. אנא התחבר מחדש.');
        return;
      }
      console.log('➕ Adding new user:', newUserData);
      setLoading(true);
      const response = await usersAPI.create(newUserData);
      console.log('📋 Add user API response:', response);
      if (response.success) {
        console.log('✅ User added successfully, refreshing list...');
        // רענון רשימת המשתמשים
        await loadUsers();
        setShowAddUserDialog(false);
        setNewUserData({
          email: '',
          password: '',
          username: '',
          full_name: '',
          department: '',
          monthly_budget: 0
        });
        alert('משתמש נוסף בהצלחה!');
      } else {
        console.error('❌ Add user failed:', response.message);
        alert(response.message || 'שגיאה בהוספת המשתמש');
      }
    } catch (error) {
      console.error('❌ Error adding user:', error);
      console.error('Error details:', error.response?.data || error.message);
      console.error('Error status:', error.response?.status);

      // Display specific error message from server
      let errorMessage = 'שגיאה בחיבור לשרת';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.status === 400) {
        errorMessage = 'נתונים שגויים או חסרים';
      } else if (error.response?.status === 401) {
        errorMessage = 'אין הרשאה לביצוע פעולה זו';
      } else if (error.response?.status === 409) {
        errorMessage = 'משתמש כבר קיים במערכת';
      }

      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק את המשתמש?')) {
      try {
        console.log('🗑️ Deleting user with ID:', userId);
        setLoading(true);
        const response = await usersAPI.delete(userId);
        console.log('📋 Delete user API response:', response);
        if (response.success) {
          console.log('✅ User deleted successfully, refreshing list...');
          await loadUsers();
          alert('המשתמש נמחק בהצלחה!');
        } else {
          console.error('❌ Delete user failed:', response.message);
          alert(response.message || 'שגיאה במחיקת המשתמש');
        }
      } catch (error) {
        console.error('❌ Error deleting user:', error);
        console.error('Error details:', error.response?.data || error.message);
        console.error('Error status:', error.response?.status);
        alert('שגיאה בחיבור לשרת');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleEditUser = async () => {
    try {
      if (!selectedUser) {
        alert('לא נבחר משתמש לעריכה');
        return;
      }

      console.log('✏️ Editing user:', selectedUser.id, editUserData);
      setLoading(true);

      // Prepare update data - only include password if it's not empty
      const updateData = { ...editUserData };

      if (editUserData.password && editUserData.password.trim() !== '') {
        updateData.password = editUserData.password;
      }

      const response = await usersAPI.update(selectedUser.id, updateData);
      console.log('📋 Edit user API response:', response);

      if (response.success) {
        console.log('✅ User updated successfully, refreshing list...');
        await loadUsers();
        setShowEditUserDialog(false);
        setSelectedUser(null);
        setEditUserData({
          email: '',
          password: '',
          username: '',
          full_name: '',
          department: '',
          monthly_budget: 0
        });
        alert('המשתמש עודכן בהצלחה!');
      } else {
        console.error('❌ Edit user failed:', response.message);
        alert(response.message || 'שגיאה בעדכון המשתמש');
      }
    } catch (error) {
      console.error('❌ Error editing user:', error);
      console.error('Error details:', error.response?.data || error.message);

      let errorMessage = 'שגיאה בחיבור לשרת';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.status === 400) {
        errorMessage = 'נתונים שגויים או חסרים';
      } else if (error.response?.status === 401) {
        errorMessage = 'אין הרשאה לביצוע פעולה זו';
      } else if (error.response?.status === 409) {
        errorMessage = 'כתובת מייל כבר קיימת במערכת';
      }

      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle special request approval/rejection
  const handleRequestAction = async () => {
    if (!selectedRequest || !requestAction) return;

    try {
      console.log(`${requestAction === 'approve' ? '✅' : '❌'} ${requestAction}ing request:`, selectedRequest.id);
      setLoading(true);

      const response = await specialRequestsAPI.updateStatus(
        selectedRequest.id,
        requestAction,
        adminNotes
      );

      if (response.success) {
        console.log('✅ Request status updated successfully');
        // Refresh the requests lists
        await loadSpecialRequests();

        // Close dialog and reset state
        setShowRequestDialog(false);
        setSelectedRequest(null);
        setRequestAction('');
        setAdminNotes('');

        alert(`בקשה ${requestAction === 'approved' ? 'אושרה' : 'נדחתה'} בהצלחה!`);
      } else {
        console.error('❌ Request action failed:', response.message);
        alert(response.message || 'שגיאה בעדכון סטטוס הבקשה');
      }
    } catch (error) {
      console.error('❌ Error updating request status:', error);
      alert('שגיאה בחיבור לשרת');
    } finally {
      setLoading(false);
    }
  };

  // Open request action dialog
  const openRequestDialog = (request, action) => {
    setSelectedRequest(request);
    setRequestAction(action);
    setAdminNotes('');
    setShowRequestDialog(true);
  };

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

  // Load transactions from server
  const loadTransactions = async () => {
    try {
      console.log('🔄 Loading transactions for admin dashboard...');
      
      const response = await transactionsAPI.getAll();
      console.log('✅ Transactions API response (full):', JSON.stringify(response, null, 2));
      console.log('✅ Response type:', typeof response);
      console.log('✅ Response keys:', Object.keys(response || {}));
      
      // Check different possible response structures
      const transactions = response?.transactions || response?.data?.transactions || response?.data || response || [];
      console.log('✅ Extracted transactions:', transactions);
      console.log('✅ Transactions count:', transactions.length);
      
      if (transactions && transactions.length > 0) {
        console.log('✅ First transaction sample:', transactions[0]);
        
        // Format transactions for the dashboard
        const formattedTransactions = transactions.map((t, index) => {
          console.log(`🔄 Formatting transaction ${index + 1}:`, t);
          const formatted = {
            id: t.id,
            user: t.full_name || t.email || 'Unknown User',
            amount: parseFloat(t.amount) || 0,
            category: t.category_name || 'כללי',
            date: t.transaction_date || t.created_at || new Date().toISOString(),
            status: t.status || 'pending'
          };
          console.log(`✅ Formatted transaction ${index + 1}:`, formatted);
          return formatted;
        });
        
        console.log('📊 All formatted transactions:', formattedTransactions);
        console.log('📊 Setting recentTransactions state...');
        setRecentTransactions(formattedTransactions);
        console.log('📊 Setting filteredTransactions state...');
        setFilteredTransactions(formattedTransactions);
        
        console.log('📊 About to calculate dashboard stats...');
        // Calculate stats now that users should be loaded
        calculateDashboardStats(formattedTransactions);
      } else {
        console.warn('⚠️ No transactions found or empty response');
        console.log('⚠️ Setting empty arrays...');
        setRecentTransactions([]);
        setFilteredTransactions([]);
        calculateDashboardStats([]);
      }
    } catch (error) {
      console.error('❌ Error loading transactions:', error);
      console.error('❌ Error stack:', error.stack);
    }
  };



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
  }, [recentTransactions]);

  const handleCancelAddUser = () => {
    console.log('🚫 Canceling add user dialog');
    setShowAddUserDialog(false);
    // איפוס השדות אחרי סגירת הדיאלוג
    setTimeout(() => {
      setNewUserData({
        email: '',
        password: '',
        username: '',
        full_name: '',
        monthly_budget: 0
      });
      console.log('✨ Form fields reset');
    }, 100);
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
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
          <Tab label="בקשות הממתינות לאישור" />
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
                      onChange={(e) => setFilters({ ...filters, employee: e.target.value })}
                    >
                      <MenuItem value="">כל העובדים</MenuItem>
                      {/* Dynamic user list from real data */}
                      {Array.from(new Set(recentTransactions.map(t => t.user))).map(user => (
                        <MenuItem key={user} value={user}>{user}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>סינון לפי קטגוריה</InputLabel>
                    <Select
                      label="סינון לפי קטגוריה"
                      value={filters.category}
                      onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                    >
                      <MenuItem value="">כל הקטגוריות</MenuItem>
                      {/* Dynamic category list from real data */}
                      {Array.from(new Set(recentTransactions.map(t => t.category))).map(category => (
                        <MenuItem key={category} value={category}>{category}</MenuItem>
                      ))}
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
                    onChange={(e) => setFilters({ ...filters, date: e.target.value })}
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
                onClick={() => {
                  // איפוס השדות לפני פתיחת הדיאלוג
                  setNewUserData({
                    email: '',
                    password: '',
                    username: '',
                    full_name: '',
                    monthly_budget: 0
                  });
                  setShowAddUserDialog(true);
                }}
                disabled={loading}
              >
                הוסף משתמש
              </Button>
            </Box>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <Typography>טוען משתמשים...</Typography>
              </Box>
            ) : error ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography color="error">{error}</Typography>
                <Button onClick={loadUsers} sx={{ mt: 2 }}>נסה שוב</Button>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>שם מלא</TableCell>
                      <TableCell>כתובת מייל</TableCell>
                      <TableCell>תקציב חודשי</TableCell>
                      <TableCell>פעולות</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {users.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} sx={{ textAlign: 'center', p: 3 }}>
                          <Typography color="text.secondary">
                            אין משתמשים במערכת. לחץ על "הוסף משתמש" כדי להוסיף משתמש ראשון.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      users.map((user) => {
                        return (
                          <TableRow key={user.id}>
                            <TableCell>{user.username}</TableCell>
                            <TableCell>{user.full_name}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                              <Typography color="primary">
                                ₪{(user.monthly_budget || 0).toLocaleString()}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setEditUserData({
                                    username: user.username || '',
                                    full_name: user.full_name || '',
                                    email: user.email || '',
                                    password: '',
                                    monthly_budget: user.monthly_budget || 0
                                  });
                                  setShowEditUserDialog(true);
                                }}
                                title="עריכת משתמש"
                                disabled={loading}
                              >
                                <Edit />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteUser(user.id)}
                                title="מחיקת משתמש"
                                color="error"
                                disabled={loading || user.role === 'admin'}
                              >
                                <Delete />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </TabPanel>

        {/* Budget Requests Tab */}
        <TabPanel value={currentTab} index={2}>
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">בקשות הממתינות לאישור</Typography>
              <Chip
                label={`${specialRequests.filter(req => req.status === 'pending').length} בקשות ממתינות`}
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
                  {specialRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>{request.full_name}</TableCell>
                      <TableCell>₪{parseFloat(request.amount).toLocaleString()}</TableCell>
                      <TableCell sx={{ maxWidth: 200 }}>
                        <Typography variant="body2" noWrap title={request.purpose}>
                          {request.purpose}
                        </Typography>
                      </TableCell>
                      <TableCell>{new Date(request.created_at).toLocaleDateString('he-IL')}</TableCell>
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
                              onClick={() => openRequestDialog(request, 'approved')}
                            >
                              אשר
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              sx={{ minWidth: 60 }}
                              onClick={() => openRequestDialog(request, 'rejected')}
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
                        סה"כ הוצאות החודש: ₪{dashboardStats.monthlyExpenses.toLocaleString()}
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



      {/* Add User Dialog */}
      <Dialog open={showAddUserDialog} onClose={() => setShowAddUserDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>הוסף משתמש חדש</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="שם משתמש"
                value={newUserData.username}
                onChange={(e) => setNewUserData({ ...newUserData, username: e.target.value })}
                required
              />
              <TextField
                fullWidth
                label="שם מלא"
                value={newUserData.full_name}
                onChange={(e) => setNewUserData({ ...newUserData, full_name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="כתובת מייל"
                type="email"
                value={newUserData.email}
                onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                required
                helperText="כתובת המייל חייבת להיות ייחודית"
                autoComplete="new-email"
                inputProps={{
                  autoComplete: 'new-email'
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="סיסמה"
                type="password"
                value={newUserData.password}
                onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                required
                helperText="הסיסמה חייבת להיות ייחודית לכל עובד"
                autoComplete="new-password"
                inputProps={{
                  autoComplete: 'new-password'
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="מחלקה"
                value={newUserData.department}
                onChange={(e) => setNewUserData({ ...newUserData, department: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="תקציב חודשי (₪)"
                type="number"
                value={newUserData.monthly_budget}
                onChange={(e) => setNewUserData({ ...newUserData, monthly_budget: parseFloat(e.target.value) || 0 })}
                required
                InputProps={{
                  startAdornment: '₪'
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelAddUser} disabled={loading}>
            בטל
          </Button>
          <Button
            onClick={handleAddUser}
            variant="contained"
            disabled={loading || !newUserData.username?.trim() || !newUserData.full_name?.trim() || !newUserData.email?.trim() || !newUserData.department?.trim() || !newUserData.password?.trim() || newUserData.monthly_budget <= 0}
          >
            {loading ? 'מוסיף...' : 'הוסף משתמש'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={showEditUserDialog} onClose={() => setShowEditUserDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>עריכת משתמש</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="שם מלא"
                value={editUserData.full_name}
                onChange={(e) => setEditUserData({ ...editUserData, full_name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="שם משתמש"
                value={editUserData.username}
                onChange={(e) => setEditUserData({ ...editUserData, username: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="כתובת מייל"
                type="email"
                value={editUserData.email}
                onChange={(e) => setEditUserData({ ...editUserData, email: e.target.value })}
                required
                helperText="כתובת המייל חייבת להיות ייחודית"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="סיסמה חדשה"
                type="password"
                value={editUserData.password}
                onChange={(e) => setEditUserData({ ...editUserData, password: e.target.value })}
                helperText="השאר ריק לשמירת הסיסמה הנוכחית"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField 
                fullWidth
                label="מחלקה"
                value={editUserData.department}
                onChange={(e) => setEditUserData({ ...editUserData, department: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="תקציב חודשי (₪)"
                type="number"
                value={editUserData.monthly_budget}
                onChange={(e) => setEditUserData({ ...editUserData, monthly_budget: parseFloat(e.target.value) || 0 })}
                required
                InputProps={{
                  startAdornment: '₪'
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowEditUserDialog(false)} disabled={loading}>
            בטל
          </Button>
          <Button
            onClick={handleEditUser}
            variant="contained"
            disabled={loading || !editUserData.username || !editUserData.full_name || !editUserData.email || !editUserData.department || !editUserData.monthly_budget}
          >
            {loading ? 'מעדכן...' : 'עדכן משתמש'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Special Request Approval Dialog */}
      <Dialog open={showRequestDialog} onClose={() => setShowRequestDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {requestAction === 'approved' ? 'אישור בקשה' : 'דחיית בקשה'}
        </DialogTitle>
        <DialogContent>
          {selectedRequest && (
            <Box sx={{ pt: 2 }}>
              <Typography variant="h6" gutterBottom>
                פרטי הבקשה
              </Typography>
              <Typography variant="body1" sx={{ mb: 1 }}>
                <strong>שם העובד:</strong> {selectedRequest.full_name}
              </Typography>
              <Typography variant="body1" sx={{ mb: 1 }}>
                <strong>שם משתמש:</strong> {selectedRequest.username}
              </Typography>
              <Typography variant="body1" sx={{ mb: 1 }}>
                <strong>סכום:</strong> ₪{parseFloat(selectedRequest.amount).toLocaleString()}
              </Typography>
              <Typography variant="body1" sx={{ mb: 1 }}>
                <strong>מטרה:</strong> {selectedRequest.purpose}
              </Typography>
              {selectedRequest.justification && (
                <Typography variant="body1" sx={{ mb: 2 }}>
                  <strong>הצדקה:</strong> {selectedRequest.justification}
                </Typography>
              )}
              <Typography variant="body1" sx={{ mb: 2 }}>
                <strong>תאריך הגשה:</strong> {new Date(selectedRequest.created_at).toLocaleDateString('he-IL')}
              </Typography>

              <TextField
                fullWidth
                label="הערות מנהל (אופציונלי)"
                multiline
                rows={3}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="הוסף הערות לבקשה..."
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRequestDialog(false)} disabled={loading}>
            ביטול
          </Button>
          <Button
            onClick={handleRequestAction}
            variant="contained"
            color={requestAction === 'approved' ? 'success' : 'error'}
            disabled={loading}
          >
            {loading ? 'מעדכן...' : (requestAction === 'approved' ? 'אשר בקשה' : 'דחה בקשה')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminDashboard;
