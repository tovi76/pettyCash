import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Paper,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  Alert,
  Divider,
  IconButton,
  Avatar,
  Snackbar
} from '@mui/material';
import {
  AccountBalanceWallet,
  Receipt,
  CloudUpload,
  Analytics,
  History,
  CameraAlt,
  AttachMoney,
  TrendingDown,
  CheckCircle,
  Pending,
  Delete,
  Visibility,
  PhotoCamera
} from '@mui/icons-material';
import { transactionsAPI, categoriesAPI } from '../../services/api'; // Import real API

const ClientDashboard = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [uploadDialog, setUploadDialog] = useState(false);
  const [receiptFile, setReceiptFile] = useState(null);
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);
  const [expenseForm, setExpenseForm] = useState({
    amount: '',
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [currentTransactionId, setCurrentTransactionId] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });

  // Mock data
  const userStats = {
    currentBalance: 1250,
    monthlyExpenses: 420,
    pendingReimbursements: 180,
    totalSaved: 2340
  };

  const recentExpenses = [
    { id: 1, description: 'ארוחת צהריים', amount: 45, category: 'אוכל', date: '2024-01-20', status: 'approved', receipt: true },
    { id: 2, description: 'נסיעה בתחבורה ציבורית', amount: 12, category: 'תחבורה', date: '2024-01-19', status: 'pending', receipt: true },
    { id: 3, description: 'ציוד משרדי', amount: 85, category: 'ציוד', date: '2024-01-18', status: 'approved', receipt: true },
    { id: 4, description: 'חניה', amount: 15, category: 'תחבורה', date: '2024-01-17', status: 'pending', receipt: false },
  ];

  const categories = [
    'אוכל',
    'תחבורה',
    'ציוד משרדי',
    'דלק',
    'חניה',
    'אירוח לקוחות',
    'הדרכות',
    'אחר'
  ];

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const processReceiptOCR = async (file, transactionId) => {
    setOcrProcessing(true);
    
    try {
      // Process OCR with real backend
      const ocrResult = await transactionsAPI.processOCR(transactionId);
      
      if (ocrResult.success) {
        const ocrData = ocrResult.data;
        
        setOcrResult({
          merchantName: ocrData.storeName,
          amount: ocrData.amount,
          date: ocrData.date,
          items: ocrData.items.map(item => `${item} - ₪${Math.random() * 20 + 5}`), // Mock prices for display
          confidence: ocrData.confidence,
          category: ocrData.category
        });
        
        // Update form with OCR data
        setExpenseForm({
          ...expenseForm,
          amount: ocrData.amount.toString(),
          description: `קנייה ב${ocrData.storeName}`,
          date: ocrData.date,
          category: ocrData.category
        });
        
        // Show success message
        setSnackbar({
          open: true,
          message: `OCR הושלם בהצלחה! דיוק: ${(ocrData.confidence * 100).toFixed(1)}%`,
          severity: 'success'
        });
      } else {
        throw new Error(ocrResult.message || 'OCR processing failed');
      }
    } catch (error) {
      console.error('OCR Error:', error);
      setSnackbar({
        open: true,
        message: 'שגיאה בעיבוד הקבלה: ' + (error.response?.data?.message || error.message),
        severity: 'error'
      });
      
      // Fallback to manual entry
      setOcrResult(null);
    } finally {
      setOcrProcessing(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      setReceiptFile(file);
      
      try {
        // First create a transaction to get an ID
        const transactionData = {
          amount: 0,
          description: 'ממתין לעיבוד קבלה...',
          category_id: 1, // Default category
          transaction_date: new Date().toISOString().split('T')[0],
          status: 'pending'
        };
        
        const createResult = await transactionsAPI.create(transactionData);
        
        if (createResult.success) {
          const transactionId = createResult.data.id;
          
          // Upload receipt file
          await transactionsAPI.uploadReceipt(transactionId, file);
          
          // Process OCR
          await processReceiptOCR(file, transactionId);
          
          // Store transaction ID for later use
          setCurrentTransactionId(transactionId);
        }
      } catch (error) {
        console.error('File upload error:', error);
        setSnackbar({
          open: true,
          message: 'שגיאה בהעלאת הקבלה: ' + (error.response?.data?.message || error.message),
          severity: 'error'
        });
      }
    }
  };

  const handleFormChange = (field, value) => {
    setExpenseForm({
      ...expenseForm,
      [field]: value
    });
  };

  const handleSubmitExpense = async () => {
    try {
      // Update transaction with form data
      const updateResult = await transactionsAPI.update(currentTransactionId, expenseForm);
      
      if (updateResult.success) {
        // Show success message
        setSnackbar({
          open: true,
          message: 'הוצאה נשמרה בהצלחה!',
          severity: 'success'
        });
        
        // Reset form and dialog
        setUploadDialog(false);
        setReceiptFile(null);
        setOcrResult(null);
        setExpenseForm({
          amount: '',
          category: '',
          description: '',
          date: new Date().toISOString().split('T')[0]
        });
      } else {
        throw new Error(updateResult.message || 'Failed to update transaction');
      }
    } catch (error) {
      console.error('Submit error:', error);
      setSnackbar({
        open: true,
        message: 'שגיאה בשמירת ההוצאה: ' + (error.response?.data?.message || error.message),
        severity: 'error'
      });
    }
  };

  const StatCard = ({ title, value, icon, color, subtitle }) => (
    <Card sx={{ height: '100%', position: 'relative', overflow: 'visible' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography color="textSecondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h4" component="div" color={color}>
              ₪{value.toLocaleString()}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {subtitle}
              </Typography>
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
        דשבורד עובד
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        נהל את ההוצאות שלך בצורה חכמה ויעילה
      </Typography>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="היתרה שלי"
            value={userStats.currentBalance}
            icon={<AccountBalanceWallet />}
            color="primary"
            subtitle="זמין לשימוש"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="הוצאות החודש"
            value={userStats.monthlyExpenses}
            icon={<TrendingDown />}
            color="secondary"
            subtitle="מתוך התקציב החודשי"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="החזרים ממתינים"
            value={userStats.pendingReimbursements}
            icon={<Pending />}
            color="warning"
            subtitle="בבדיקה"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="סה״כ חסכתי"
            value={userStats.totalSaved}
            icon={<CheckCircle />}
            color="success"
            subtitle="השנה"
          />
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ textAlign: 'center', p: 3 }}>
              <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                העלה קבלה
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                צלם או העלה קבלה לסריקה אוטומטית
              </Typography>
              <Button
                variant="contained"
                startIcon={<PhotoCamera />}
                onClick={() => setUploadDialog(true)}
                fullWidth
              >
                העלה קבלה
              </Button>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ textAlign: 'center', p: 3 }}>
              <AttachMoney sx={{ fontSize: 48, color: 'secondary.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                בקש כסף
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                בקש תוספת לקופה הקטנה שלך
              </Typography>
              <Button
                variant="outlined"
                color="secondary"
                fullWidth
              >
                בקש תוספת כסף
              </Button>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ textAlign: 'center', p: 3 }}>
              <Analytics sx={{ fontSize: 48, color: 'info.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                דוח אישי
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                הורד דוח מפורט של ההוצאות שלך
              </Typography>
              <Button
                variant="outlined"
                color="info"
                fullWidth
              >
                הורד דוח
              </Button>
            </CardContent>
          </Card>
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
          <Tab label="ההוצאות שלי" />
          <Tab label="היסטוריה" />
          <Tab label="סטטיסטיקות" />
        </Tabs>

        {/* My Expenses Tab */}
        <TabPanel value={currentTab} index={0}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              ההוצאות האחרונות שלי
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>תיאור</TableCell>
                    <TableCell>סכום</TableCell>
                    <TableCell>קטגוריה</TableCell>
                    <TableCell>תאריך</TableCell>
                    <TableCell>סטטוס</TableCell>
                    <TableCell>קבלה</TableCell>
                    <TableCell>פעולות</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentExpenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>{expense.description}</TableCell>
                      <TableCell>₪{expense.amount}</TableCell>
                      <TableCell>{expense.category}</TableCell>
                      <TableCell>{expense.date}</TableCell>
                      <TableCell>
                        <Chip
                          label={expense.status === 'approved' ? 'אושר' : 'ממתין'}
                          color={expense.status === 'approved' ? 'success' : 'warning'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={expense.receipt ? 'יש' : 'אין'}
                          color={expense.receipt ? 'success' : 'error'}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <IconButton size="small">
                          <Visibility />
                        </IconButton>
                        {expense.status === 'pending' && (
                          <IconButton size="small">
                            <Delete />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </TabPanel>

        {/* History Tab */}
        <TabPanel value={currentTab} index={1}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              היסטוריית הוצאות
            </Typography>
            <Typography variant="body2" color="text.secondary">
              כאן תוכל לראות את כל ההוצאות שלך מהחודשים הקודמים
            </Typography>
          </Box>
        </TabPanel>

        {/* Statistics Tab */}
        <TabPanel value={currentTab} index={2}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              סטטיסטיקות אישיות
            </Typography>
            <Typography variant="body2" color="text.secondary">
              גרפים וניתוחים של דפוסי ההוצאות שלך יתווספו בקרוב
            </Typography>
          </Box>
        </TabPanel>
      </Paper>

      {/* Upload Receipt Dialog */}
      <Dialog open={uploadDialog} onClose={() => setUploadDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Receipt sx={{ mr: 1 }} />
            העלאת קבלה וסריקה אוטומטית
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {!receiptFile ? (
              <Box
                sx={{
                  border: '2px dashed',
                  borderColor: 'primary.main',
                  borderRadius: 2,
                  p: 4,
                  textAlign: 'center',
                  backgroundColor: 'primary.light',
                  color: 'primary.contrastText',
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: 'primary.main'
                  }
                }}
                component="label"
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
                <CameraAlt sx={{ fontSize: 48, mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  לחץ כדי לבחור קבלה או גרור לכאן
                </Typography>
                <Typography variant="body2">
                  תמיכה בפורמטים: JPG, PNG, PDF
                </Typography>
              </Box>
            ) : (
              <Box>
                <Alert severity="info" sx={{ mb: 2 }}>
                  קובץ נבחר: {receiptFile.name}
                </Alert>
                
                {ocrProcessing && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="body2" gutterBottom>
                      מעבד קבלה באמצעות OCR...
                    </Typography>
                    <LinearProgress />
                  </Box>
                )}

                {ocrResult && (
                  <Box sx={{ mb: 3 }}>
                    <Alert severity="success" sx={{ mb: 2 }}>
                      הקבלה נסרקה בהצלחה! דיוק: {Math.round(ocrResult.confidence * 100)}%
                    </Alert>
                    <Paper sx={{ p: 2, backgroundColor: 'grey.50' }}>
                      <Typography variant="subtitle2" gutterBottom>
                        פרטים שזוהו:
                      </Typography>
                      <Typography variant="body2">
                        <strong>חנות:</strong> {ocrResult.merchantName}
                      </Typography>
                      <Typography variant="body2">
                        <strong>סכום:</strong> ₪{ocrResult.amount}
                      </Typography>
                      <Typography variant="body2">
                        <strong>תאריך:</strong> {ocrResult.date}
                      </Typography>
                    </Paper>
                  </Box>
                )}

                <Divider sx={{ my: 3 }} />

                <Typography variant="h6" gutterBottom>
                  פרטי ההוצאה
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="סכום"
                      type="number"
                      value={expenseForm.amount}
                      onChange={(e) => handleFormChange('amount', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>קטגוריה</InputLabel>
                      <Select
                        value={expenseForm.category}
                        label="קטגוריה"
                        onChange={(e) => handleFormChange('category', e.target.value)}
                      >
                        {categories.map((category) => (
                          <MenuItem key={category} value={category}>
                            {category}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="תיאור"
                      multiline
                      rows={2}
                      value={expenseForm.description}
                      onChange={(e) => handleFormChange('description', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="תאריך"
                      type="date"
                      value={expenseForm.date}
                      onChange={(e) => handleFormChange('date', e.target.value)}
                      InputLabelProps={{
                        shrink: true,
                      }}
                    />
                  </Grid>
                </Grid>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialog(false)}>
            ביטול
          </Button>
          {receiptFile && ocrResult && (
            <Button variant="contained" onClick={handleSubmitExpense}>
              שמור הוצאה
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ClientDashboard;
