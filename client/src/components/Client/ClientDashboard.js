import React, { useState, useEffect } from 'react';
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
  Snackbar,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
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
  PhotoCamera,
  RequestQuote,
  Assessment,
  Person,
  Timeline,
  BarChart,
  Edit,
  GetApp
} from '@mui/icons-material';
import { transactionsAPI, categoriesAPI } from '../../services/api';

const ClientDashboard = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [uploadDialog, setUploadDialog] = useState(false);
  const [specialRequestDialog, setSpecialRequestDialog] = useState(false);
  const [personalReportDialog, setPersonalReportDialog] = useState(false);
  const [personalDetailsDialog, setPersonalDetailsDialog] = useState(false);
  const [historyDialog, setHistoryDialog] = useState(false);
  const [receiptFile, setReceiptFile] = useState(null);
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);
  const [currentTransactionId, setCurrentTransactionId] = useState(null);
  const [expenseForm, setExpenseForm] = useState({
    amount: '',
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [specialRequestForm, setSpecialRequestForm] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: ''
  });
  const [personalDetails, setPersonalDetails] = useState({
    firstName: 'יוסי',
    lastName: 'כהן',
    email: 'yossi@company.com',
    phone: '050-1234567',
    address: 'רחוב הרצל 123, תל אביב',
    birthDate: '1990-01-01'
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });

  // State for user data
  const [userStats, setUserStats] = useState({
    currentBalance: 1250,
    monthlyExpenses: 420,
    pendingReimbursements: 180,
    totalSaved: 2340
  });

  const [recentExpenses, setRecentExpenses] = useState([
    { id: 1, description: 'ארוחת צהריים', amount: 45, category: 'אוכל', date: '2024-01-20', status: 'approved', receipt: true },
    { id: 2, description: 'נסיעה בתחבורה ציבורית', amount: 12, category: 'תחבורה', date: '2024-01-19', status: 'pending', receipt: true },
    { id: 3, description: 'ציוד משרדי', amount: 85, category: 'ציוד', date: '2024-01-18', status: 'approved', receipt: true },
    { id: 4, description: 'חניה', amount: 15, category: 'תחבורה', date: '2024-01-17', status: 'pending', receipt: false },
  ]);

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
      setOcrProcessing(true);
      
      try {
        // יצירת transaction חדשה קודם כל
        const transactionData = {
          amount: 0,
          description: 'ממתין לעיבוד קבלה...',
          category_id: 1, // קטגוריה ברירת מחדל
          transaction_date: new Date().toISOString().split('T')[0],
          status: 'pending'
        };
        
        const createResult = await transactionsAPI.create(transactionData);
        
        if (createResult.success) {
          const transactionId = createResult.data.id;
          setCurrentTransactionId(transactionId);
          
          // העלאת קובץ הקבלה
          await transactionsAPI.uploadReceipt(transactionId, file);
          
          // עיבוד OCR אמיתי
          const ocrResult = await transactionsAPI.processOCR(transactionId);
          
          if (ocrResult.success) {
            const ocrData = ocrResult.data;
            
            setOcrResult({
              merchantName: ocrData.storeName,
              amount: ocrData.amount,
              date: ocrData.date,
              items: ocrData.items || [],
              confidence: ocrData.confidence,
              category: ocrData.category
            });
            
            // עדכון הטופס עם נתוני OCR
            setExpenseForm({
              amount: ocrData.amount.toString(),
              description: `קנייה ב${ocrData.storeName}`,
              date: ocrData.date,
              category: ocrData.category
            });
            
            setSnackbar({
              open: true,
              message: `OCR הושלם בהצלחה! דיוק: ${(ocrData.confidence * 100).toFixed(1)}%`,
              severity: 'success'
            });
          } else {
            throw new Error(ocrResult.message || 'OCR processing failed');
          }
        } else {
          throw new Error(createResult.message || 'Failed to create transaction');
        }
      } catch (error) {
        console.error('OCR Error:', error);
        setSnackbar({
          open: true,
          message: 'שגיאה בעיבוד הקבלה: ' + (error.response?.data?.message || error.message),
          severity: 'error'
        });
        
        // במקרה של שגיאה, אפשר מילוי ידני
        setOcrResult(null);
      } finally {
        setOcrProcessing(false);
      }
    }
  };

  const handleFormChange = (field, value) => {
    setExpenseForm({
      ...expenseForm,
      [field]: value
    });
  };

  const handleViewExpense = (expense) => {
    setSnackbar({
      open: true,
      message: `צפייה בהוצאה: ${expense.description} - ₪${expense.amount}`,
      severity: 'info'
    });
    // כאן ניתן להוסיף דיאלוג מפורט לצפייה בהוצאה
  };

  const handleDeleteExpense = (expenseId) => {
    setRecentExpenses(prevExpenses => 
      prevExpenses.filter(expense => expense.id !== expenseId)
    );
    
    // עדכון הסטטיסטיקות
    const deletedExpense = recentExpenses.find(expense => expense.id === expenseId);
    if (deletedExpense) {
      setUserStats(prevStats => ({
        ...prevStats,
        monthlyExpenses: prevStats.monthlyExpenses - deletedExpense.amount,
        currentBalance: prevStats.currentBalance + deletedExpense.amount
      }));
    }
    
    setSnackbar({
      open: true,
      message: 'ההוצאה נמחקה בהצלחה',
      severity: 'success'
    });
  };

  const handleSubmitExpense = async () => {
    if (!currentTransactionId) {
      setSnackbar({
        open: true,
        message: 'שגיאה: לא נמצא ID של העסקה',
        severity: 'error'
      });
      return;
    }

    try {
      // עדכון ה-transaction הקיים עם הנתונים המעודכנים
      const updateData = {
        amount: parseFloat(expenseForm.amount),
        description: expenseForm.description,
        category: expenseForm.category,
        transaction_date: expenseForm.date,
        status: 'pending'
      };
      
      const updateResult = await transactionsAPI.update(currentTransactionId, updateData);
      
      if (updateResult.success) {
        // יצירת אובייקט להצגה ברשימה
        const newExpense = {
          id: currentTransactionId,
          description: expenseForm.description,
          amount: parseFloat(expenseForm.amount),
          category: expenseForm.category,
          date: expenseForm.date,
          status: 'pending',
          receipt: true
        };
        
        // הוספת ההוצאה לראש הרשימה
        setRecentExpenses(prevExpenses => [newExpense, ...prevExpenses]);
        
        // עדכון הסטטיסטיקות
        setUserStats(prevStats => ({
          ...prevStats,
          monthlyExpenses: prevStats.monthlyExpenses + newExpense.amount,
          currentBalance: prevStats.currentBalance - newExpense.amount
        }));
        
        // הצגת הודעת הצלחה
        setSnackbar({
          open: true,
          message: 'הוצאה נשמרה בהצלחה ונוספה להוצאות שלך!',
          severity: 'success'
        });
        
        // איפוס הטופס והדיאלוג
        setUploadDialog(false);
        setReceiptFile(null);
        setOcrResult(null);
        setCurrentTransactionId(null);
        setExpenseForm({
          amount: '',
          category: '',
          description: '',
          date: new Date().toISOString().split('T')[0]
        });
        
        // מעבר לטאב "ההוצאות שלי" כדי שהמשתמש יראה את ההוצאה החדשה
        setCurrentTab(0);
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

      {/* מלבנים עליונים - סטטיסטיקות */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
          <StatCard
            title="היתרה שלי"
            value={userStats.currentBalance}
            icon={<AccountBalanceWallet />}
            color="primary"
            subtitle="זמין לשימוש"
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard
            title="הוצאות החודש"
            value={userStats.monthlyExpenses}
            icon={<TrendingDown />}
            color="secondary"
            subtitle="מתוך התקציב החודשי"
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard
            title="בקשות שממתינות לאישור"
            value={userStats.pendingReimbursements}
            icon={<Pending />}
            color="warning"
            subtitle="בבדיקה"
          />
        </Grid>
      </Grid>

      {/* מלבנים אמצעיים - פעולות מהירות */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%', cursor: 'pointer', '&:hover': { boxShadow: 4 } }}>
            <CardContent sx={{ textAlign: 'center', p: 3 }}>
              <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                העלה קבלה
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                צלם או העלה קבלה עם אפשרות לעריכת סכום, קטגוריה ותאריך
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
          <Card sx={{ height: '100%', cursor: 'pointer', '&:hover': { boxShadow: 4 } }}>
            <CardContent sx={{ textAlign: 'center', p: 3 }}>
              <RequestQuote sx={{ fontSize: 48, color: 'secondary.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                בקשה להוצאה מיוחדת
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                הגש בקשה להוצאה מיוחדת עם סכום, תאריך ומהות ההוצאה
              </Typography>
              <Button
                variant="contained"
                color="secondary"
                startIcon={<Edit />}
                onClick={() => setSpecialRequestDialog(true)}
                fullWidth
              >
                הגש בקשה
              </Button>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%', cursor: 'pointer', '&:hover': { boxShadow: 4 } }}>
            <CardContent sx={{ textAlign: 'center', p: 3 }}>
              <Assessment sx={{ fontSize: 48, color: 'info.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                דוח אישי
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                צפה בדוחות קודמים והפק דוח באקסל
              </Typography>
              <Button
                variant="contained"
                color="info"
                startIcon={<GetApp />}
                onClick={() => setPersonalReportDialog(true)}
                fullWidth
              >
                צפה בדוחות
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* אפשרויות תחתונות */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ cursor: 'pointer', '&:hover': { boxShadow: 3 } }} onClick={() => setCurrentTab(0)}>
            <CardContent sx={{ textAlign: 'center', p: 2 }}>
              <Receipt sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
              <Typography variant="h6" gutterBottom>
                ההוצאות שלי
              </Typography>
              <Typography variant="body2" color="text.secondary">
                צפייה בהוצאות אחרונות
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ cursor: 'pointer', '&:hover': { boxShadow: 3 } }} onClick={() => setPersonalDetailsDialog(true)}>
            <CardContent sx={{ textAlign: 'center', p: 2 }}>
              <Person sx={{ fontSize: 40, color: 'secondary.main', mb: 1 }} />
              <Typography variant="h6" gutterBottom>
                עדכון פרטים אישיים
              </Typography>
              <Typography variant="body2" color="text.secondary">
                שם, משפחה, כתובת, מייל, טלפון
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ cursor: 'pointer', '&:hover': { boxShadow: 3 } }} onClick={() => setHistoryDialog(true)}>
            <CardContent sx={{ textAlign: 'center', p: 2 }}>
              <Timeline sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
              <Typography variant="h6" gutterBottom>
                הסטוריה
              </Typography>
              <Typography variant="body2" color="text.secondary">
                צפייה בהוצאות מחודשים קודמים
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ cursor: 'pointer', '&:hover': { boxShadow: 3 } }} onClick={() => setCurrentTab(2)}>
            <CardContent sx={{ textAlign: 'center', p: 2 }}>
              <BarChart sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
              <Typography variant="h6" gutterBottom>
                סטטיסטיקות
              </Typography>
              <Typography variant="body2" color="text.secondary">
                נתונים סטטיסטיים וגרפים
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* תוכן דינמי */}
      <Paper sx={{ width: '100%' }}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
          sx={{ display: 'none' }} // מוסתר את הטאבים כי אנחנו משתמשים בכרטיסים
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
                        <IconButton 
                          size="small" 
                          onClick={() => handleViewExpense(expense)}
                          title="צפייה בפרטי ההוצאה"
                        >
                          <Visibility />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          onClick={() => handleDeleteExpense(expense.id)}
                          title="מחיקת ההוצאה"
                          color="error"
                        >
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
                  accept="image/*,application/pdf,.pdf"
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

      {/* דיאלוג בקשה להוצאה מיוחדת */}
      <Dialog open={specialRequestDialog} onClose={() => setSpecialRequestDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          בקשה להוצאה מיוחדת
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="סכום"
                  type="number"
                  value={specialRequestForm.amount}
                  onChange={(e) => setSpecialRequestForm({...specialRequestForm, amount: e.target.value})}
                  InputProps={{
                    startAdornment: <Typography sx={{ mr: 1 }}>₪</Typography>
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="תאריך"
                  type="date"
                  value={specialRequestForm.date}
                  onChange={(e) => setSpecialRequestForm({...specialRequestForm, date: e.target.value})}
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="מהות ההוצאה"
                  multiline
                  rows={4}
                  value={specialRequestForm.description}
                  onChange={(e) => setSpecialRequestForm({...specialRequestForm, description: e.target.value})}
                  placeholder="פרט את מהות ההוצאה המיוחדת והסיבה לבקשה"
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSpecialRequestDialog(false)}>
            ביטול
          </Button>
          <Button 
            variant="contained" 
            onClick={() => {
              // כאן יהיה הלוגיקה לשליחת הבקשה
              setSnackbar({
                open: true,
                message: 'בקשתך נשלחה בהצלחה וממתינה לאישור',
                severity: 'success'
              });
              setSpecialRequestDialog(false);
              setSpecialRequestForm({ amount: '', date: new Date().toISOString().split('T')[0], description: '' });
            }}
          >
            שלח בקשה
          </Button>
        </DialogActions>
      </Dialog>

      {/* דיאלוג דוח אישי */}
      <Dialog open={personalReportDialog} onClose={() => setPersonalReportDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          דוחות אישיים
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography variant="h6" gutterBottom>
              דוחות קודמים
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  <GetApp color="primary" />
                </ListItemIcon>
                <ListItemText 
                  primary="דוח חודש ינואר 2024" 
                  secondary="סה״כ הוצאות: ₪420" 
                />
                <Button size="small" startIcon={<GetApp />}>
                  הורד
                </Button>
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <GetApp color="primary" />
                </ListItemIcon>
                <ListItemText 
                  primary="דוח חודש דצמבר 2023" 
                  secondary="סה״כ הוצאות: ₪380" 
                />
                <Button size="small" startIcon={<GetApp />}>
                  הורד
                </Button>
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <GetApp color="primary" />
                </ListItemIcon>
                <ListItemText 
                  primary="דוח חודש נובמבר 2023" 
                  secondary="סה״כ הוצאות: ₪295" 
                />
                <Button size="small" startIcon={<GetApp />}>
                  הורד
                </Button>
              </ListItem>
            </List>
            <Divider sx={{ my: 2 }} />
            <Button 
              variant="contained" 
              startIcon={<GetApp />} 
              fullWidth
              onClick={() => {
                setSnackbar({
                  open: true,
                  message: 'דוח חודשי נוצר והורד בהצלחה',
                  severity: 'success'
                });
              }}
            >
              הפק דוח חודשי חדש (אקסל)
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPersonalReportDialog(false)}>
            סגור
          </Button>
        </DialogActions>
      </Dialog>

      {/* דיאלוג עדכון פרטים אישיים */}
      <Dialog open={personalDetailsDialog} onClose={() => setPersonalDetailsDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          עדכון פרטים אישיים
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="שם פרטי"
                  value={personalDetails.firstName}
                  onChange={(e) => setPersonalDetails({...personalDetails, firstName: e.target.value})}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="שם משפחה"
                  value={personalDetails.lastName}
                  onChange={(e) => setPersonalDetails({...personalDetails, lastName: e.target.value})}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="כתובת מייל"
                  type="email"
                  value={personalDetails.email}
                  onChange={(e) => setPersonalDetails({...personalDetails, email: e.target.value})}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="מספר טלפון"
                  value={personalDetails.phone}
                  onChange={(e) => setPersonalDetails({...personalDetails, phone: e.target.value})}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="תאריך לידה"
                  type="date"
                  value={personalDetails.birthDate}
                  onChange={(e) => setPersonalDetails({...personalDetails, birthDate: e.target.value})}
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="כתובת"
                  multiline
                  rows={2}
                  value={personalDetails.address}
                  onChange={(e) => setPersonalDetails({...personalDetails, address: e.target.value})}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPersonalDetailsDialog(false)}>
            ביטול
          </Button>
          <Button 
            variant="contained" 
            onClick={() => {
              setSnackbar({
                open: true,
                message: 'פרטים אישיים עודכנו בהצלחה',
                severity: 'success'
              });
              setPersonalDetailsDialog(false);
            }}
          >
            שמור
          </Button>
        </DialogActions>
      </Dialog>

      {/* דיאלוג הסטוריה */}
      <Dialog open={historyDialog} onClose={() => setHistoryDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          הסטוריית הוצאות
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography variant="h6" gutterBottom>
              הוצאות מחודשים קודמים
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>חודש</TableCell>
                    <TableCell>סה״כ הוצאות</TableCell>
                    <TableCell>מספר עסקאות</TableCell>
                    <TableCell>קטגוריה עיקרית</TableCell>
                    <TableCell>פעולות</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell>ינואר 2024</TableCell>
                    <TableCell>₪420</TableCell>
                    <TableCell>12</TableCell>
                    <TableCell>אוכל</TableCell>
                    <TableCell>
                      <Button size="small" startIcon={<Visibility />}>
                        צפה
                      </Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>דצמבר 2023</TableCell>
                    <TableCell>₪380</TableCell>
                    <TableCell>9</TableCell>
                    <TableCell>תחבורה</TableCell>
                    <TableCell>
                      <Button size="small" startIcon={<Visibility />}>
                        צפה
                      </Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>נובמבר 2023</TableCell>
                    <TableCell>₪295</TableCell>
                    <TableCell>7</TableCell>
                    <TableCell>ציוד משרדי</TableCell>
                    <TableCell>
                      <Button size="small" startIcon={<Visibility />}>
                        צפה
                      </Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryDialog(false)}>
            סגור
          </Button>
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
