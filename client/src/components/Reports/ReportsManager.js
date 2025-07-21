import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Paper,
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';
import {
  Download,
  Analytics,
  TrendingUp,
  AccountBalance,
  Receipt,
  Calculate,
  PieChart,
  BarChart,
  TableChart
} from '@mui/icons-material';

const ReportsManager = () => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [reportDialog, setReportDialog] = useState(false);
  const [reportType, setReportType] = useState('');
  const [generating, setGenerating] = useState(false);
  const [optimizationDialog, setOptimizationDialog] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState(null);

  // Mock data for reports
  const monthlyData = {
    totalExpenses: 12450,
    totalReimbursements: 8920,
    pendingApprovals: 1200,
    optimalAllocation: 11650,
    savings: 800,
    categories: [
      { name: 'אוכל', amount: 4200, percentage: 33.7 },
      { name: 'תחבורה', amount: 2800, percentage: 22.5 },
      { name: 'ציוד משרדי', amount: 1950, percentage: 15.7 },
      { name: 'אירוח לקוחות', amount: 1500, percentage: 12.1 },
      { name: 'הדרכות', amount: 1200, percentage: 9.6 },
      { name: 'אחר', amount: 800, percentage: 6.4 }
    ],
    employees: [
      { name: 'יוסי כהן', department: 'פיתוח', expenses: 850, reimbursement: 720, optimal: 680 },
      { name: 'שרה לוי', department: 'שיווק', expenses: 920, reimbursement: 850, optimal: 890 },
      { name: 'דוד מזרחי', department: 'מכירות', expenses: 1200, reimbursement: 980, optimal: 1150 },
      { name: 'רחל אברהם', department: 'כספים', expenses: 650, reimbursement: 600, optimal: 620 },
      { name: 'מיכל גולן', department: 'משאבי אנוש', expenses: 780, reimbursement: 720, optimal: 750 }
    ]
  };

  const months = [
    'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
    'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
  ];

  const handleGenerateReport = async (type) => {
    setGenerating(true);
    setReportType(type);
    
    // Simulate report generation
    setTimeout(() => {
      setGenerating(false);
      setReportDialog(false);
      
      // In real implementation, this would trigger file download
      const fileName = `דוח_${type}_${months[selectedMonth]}_${selectedYear}.xlsx`;
      console.log(`Generating report: ${fileName}`);
      
      // Create a mock download
      const element = document.createElement('a');
      element.setAttribute('href', 'data:text/plain;charset=utf-8,Mock Excel Report Data');
      element.setAttribute('download', fileName);
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }, 2000);
  };

  const calculateOptimalAllocation = () => {
    setOptimizationDialog(true);
    
    // Simulate optimization calculation
    setTimeout(() => {
      const result = {
        totalSavings: 800,
        recommendations: [
          {
            employee: 'יוסי כהן',
            current: 720,
            optimal: 680,
            saving: 40,
            reason: 'הפחתת הוצאות אוכל על ידי שימוש בקופונים'
          },
          {
            employee: 'שרה לוי',
            current: 850,
            optimal: 890,
            saving: -40,
            reason: 'הגדלת תקציב תחבורה לפגישות לקוחות'
          },
          {
            employee: 'דוד מזרחי',
            current: 980,
            optimal: 1150,
            saving: -170,
            reason: 'הגדלת תקציב אירוח לקוחות בהתאם לביצועים'
          }
        ],
        efficiency: 94.2
      };
      setOptimizationResult(result);
    }, 1500);
  };

  const StatCard = ({ title, value, icon, color, subtitle, trend }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography color="textSecondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h4" component="div" color={color}>
              {typeof value === 'number' ? `₪${value.toLocaleString()}` : value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {subtitle}
              </Typography>
            )}
            {trend && (
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <TrendingUp sx={{ fontSize: 16, color: 'success.main', mr: 0.5 }} />
                <Typography variant="body2" color="success.main">
                  {trend}% מהחודש הקודם
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

  return (
    <Box>
      <Typography variant="h4" gutterBottom color="primary">
        דוחות ואנליטיקה
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        דוחות מתקדמים וחישוב אופטימלי לניהול קופה קטנה
      </Typography>

      {/* Period Selection */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          בחירת תקופה לדוח
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel>חודש</InputLabel>
              <Select
                value={selectedMonth}
                label="חודש"
                onChange={(e) => setSelectedMonth(e.target.value)}
              >
                {months.map((month, index) => (
                  <MenuItem key={index} value={index}>
                    {month}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel>שנה</InputLabel>
              <Select
                value={selectedYear}
                label="שנה"
                onChange={(e) => setSelectedYear(e.target.value)}
              >
                <MenuItem value={2024}>2024</MenuItem>
                <MenuItem value={2023}>2023</MenuItem>
                <MenuItem value={2022}>2022</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Button
              variant="contained"
              startIcon={<Calculate />}
              onClick={calculateOptimalAllocation}
              fullWidth
            >
              חישוב אופטימלי
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="סה״כ הוצאות"
            value={monthlyData.totalExpenses}
            icon={<Receipt />}
            color="primary"
            trend={8.5}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="החזרים שבוצעו"
            value={monthlyData.totalReimbursements}
            icon={<AccountBalance />}
            color="secondary"
            subtitle="71.6% מהסה״כ"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="חיסכון אופטימלי"
            value={monthlyData.savings}
            icon={<TrendingUp />}
            color="success"
            subtitle="6.4% חיסכון"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="ממתינים לאישור"
            value={monthlyData.pendingApprovals}
            icon={<Analytics />}
            color="warning"
            subtitle="9.6% מהסה״כ"
          />
        </Grid>
      </Grid>

      {/* Report Generation */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center', p: 3 }}>
              <TableChart sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                דוח חודשי מפורט
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                דוח מלא עם פירוט הוצאות לפי עובדים וקטגוריות
              </Typography>
              <Button
                variant="contained"
                startIcon={<Download />}
                onClick={() => handleGenerateReport('monthly_detailed')}
                fullWidth
              >
                הורד דוח (Excel)
              </Button>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center', p: 3 }}>
              <PieChart sx={{ fontSize: 48, color: 'secondary.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                ניתוח קטגוריות
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                פירוט הוצאות לפי קטגוריות עם גרפים
              </Typography>
              <Button
                variant="contained"
                color="secondary"
                startIcon={<Download />}
                onClick={() => handleGenerateReport('categories_analysis')}
                fullWidth
              >
                הורד ניתוח (Excel)
              </Button>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center', p: 3 }}>
              <BarChart sx={{ fontSize: 48, color: 'info.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                דוח אופטימיזציה
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                המלצות לחלוקה אופטימלית של תקציבים
              </Typography>
              <Button
                variant="contained"
                color="info"
                startIcon={<Download />}
                onClick={() => handleGenerateReport('optimization')}
                fullWidth
              >
                הורד המלצות (Excel)
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Categories Breakdown */}
      <Paper sx={{ mb: 4 }}>
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            פירוט הוצאות לפי קטגוריות - {months[selectedMonth]} {selectedYear}
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>קטגוריה</TableCell>
                  <TableCell align="right">סכום</TableCell>
                  <TableCell align="right">אחוז</TableCell>
                  <TableCell align="right">מגמה</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {monthlyData.categories.map((category, index) => (
                  <TableRow key={index}>
                    <TableCell>{category.name}</TableCell>
                    <TableCell align="right">₪{category.amount.toLocaleString()}</TableCell>
                    <TableCell align="right">{category.percentage}%</TableCell>
                    <TableCell align="right">
                      <Chip
                        label={index % 2 === 0 ? 'עלייה' : 'ירידה'}
                        color={index % 2 === 0 ? 'success' : 'error'}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Paper>

      {/* Employee Performance */}
      <Paper>
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            ביצועי עובדים וחלוקה אופטימלית
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>עובד</TableCell>
                  <TableCell>מחלקה</TableCell>
                  <TableCell align="right">הוצאות</TableCell>
                  <TableCell align="right">החזר נוכחי</TableCell>
                  <TableCell align="right">החזר אופטימלי</TableCell>
                  <TableCell align="right">חיסכון/תוספת</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {monthlyData.employees.map((employee, index) => {
                  const difference = employee.optimal - employee.reimbursement;
                  return (
                    <TableRow key={index}>
                      <TableCell>{employee.name}</TableCell>
                      <TableCell>{employee.department}</TableCell>
                      <TableCell align="right">₪{employee.expenses}</TableCell>
                      <TableCell align="right">₪{employee.reimbursement}</TableCell>
                      <TableCell align="right">₪{employee.optimal}</TableCell>
                      <TableCell align="right">
                        <Chip
                          label={`₪${Math.abs(difference)}`}
                          color={difference >= 0 ? 'error' : 'success'}
                          size="small"
                          icon={difference >= 0 ? <TrendingUp /> : <TrendingUp sx={{ transform: 'rotate(180deg)' }} />}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Paper>

      {/* Report Generation Dialog */}
      <Dialog open={generating} maxWidth="sm" fullWidth>
        <DialogContent sx={{ textAlign: 'center', p: 4 }}>
          <CircularProgress size={60} sx={{ mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            יוצר דוח...
          </Typography>
          <Typography variant="body2" color="text.secondary">
            אנא המתן, הדוח נוצר ויורד אוטומטית
          </Typography>
        </DialogContent>
      </Dialog>

      {/* Optimization Results Dialog */}
      <Dialog open={optimizationDialog} onClose={() => setOptimizationDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          תוצאות חישוב אופטימלי
        </DialogTitle>
        <DialogContent>
          {optimizationResult && (
            <Box sx={{ pt: 2 }}>
              <Alert severity="success" sx={{ mb: 3 }}>
                חישוב הושלם! יעילות כוללת: {optimizationResult.efficiency}%
                <br />
                חיסכון פוטנציאלי: ₪{optimizationResult.totalSavings}
              </Alert>

              <Typography variant="h6" gutterBottom>
                המלצות לאופטימיזציה:
              </Typography>
              
              {optimizationResult.recommendations.map((rec, index) => (
                <Paper key={index} sx={{ p: 2, mb: 2, backgroundColor: 'grey.50' }}>
                  <Typography variant="subtitle1" gutterBottom>
                    {rec.employee}
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={4}>
                      <Typography variant="body2" color="text.secondary">
                        תקציב נוכחי: ₪{rec.current}
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="body2" color="text.secondary">
                        תקציב מומלץ: ₪{rec.optimal}
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Chip
                        label={`₪${Math.abs(rec.saving)}`}
                        color={rec.saving >= 0 ? 'success' : 'warning'}
                        size="small"
                      />
                    </Grid>
                  </Grid>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    <strong>סיבה:</strong> {rec.reason}
                  </Typography>
                </Paper>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOptimizationDialog(false)}>
            סגור
          </Button>
          <Button variant="contained" onClick={() => handleGenerateReport('optimization_detailed')}>
            הורד דוח מפורט
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ReportsManager;
