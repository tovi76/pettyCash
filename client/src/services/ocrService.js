import Tesseract from 'tesseract.js';

class ClientOCRService {
  constructor() {
    this.worker = null;
    this.isInitialized = false;
  }

  async initializeWorker() {
    if (this.isInitialized && this.worker) {
      return this.worker;
    }

    console.log('🔧 Initializing Tesseract OCR worker...');
    
    try {
      this.worker = await Tesseract.createWorker('heb+eng', 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            console.log(`📖 OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      });
      
      await this.worker.setParameters({
        tessedit_char_whitelist: '0123456789.,₪ שקלאבגדהוזחטיכלמנסעפצקרשתABCDEFGHIJKLMNOPQRSTUVWXYZ-/',
        tessedit_pageseg_mode: Tesseract.PSM.AUTO,
      });
      
      this.isInitialized = true;
      console.log('✅ OCR worker initialized successfully');
      return this.worker;
    } catch (error) {
      console.error('❌ Failed to initialize OCR worker:', error);
      throw error;
    }
  }

  async processReceipt(imageFile) {
    console.log('🔍 Starting client-side OCR processing...');
    console.log('📄 File:', imageFile.name, 'Size:', imageFile.size, 'bytes');

    try {
      // Validate file type
      const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp'];
      if (!supportedTypes.includes(imageFile.type.toLowerCase())) {
        throw new Error(`Unsupported file type: ${imageFile.type}. Only image files are supported.`);
      }

      // Preprocess image for better OCR results
      console.log('🎨 Preprocessing image for better OCR...');
      const processedImage = await this.preprocessImage(imageFile);

      // Initialize worker if needed
      const worker = await this.initializeWorker();

      // Process the preprocessed image
      console.log('📆 Recognizing text from preprocessed receipt...');
      const { data: { text, confidence } } = await worker.recognize(processedImage);
      
      console.log('✅ OCR completed with confidence:', confidence);
      console.log('📝 Raw text:', text);

      // Parse the extracted text
      const parsedData = this.parseReceiptText(text);
      parsedData.confidence = confidence / 100; // Convert to 0-1 scale
      parsedData.rawText = text;

      console.log('🎯 Parsed receipt data:', parsedData);
      return parsedData;

    } catch (error) {
      console.error('❌ OCR processing failed:', error);
      throw error;
    }
  }

  async preprocessImage(imageFile) {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        try {
          console.log('🖼️ Original image size:', img.width, 'x', img.height);
          
          // Set canvas size
          canvas.width = img.width;
          canvas.height = img.height;
          
          // Draw original image
          ctx.drawImage(img, 0, 0);
          
          // Get image data
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          
          // Process each pixel
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Convert to grayscale using luminance formula
            const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
            
            // Enhance contrast - make dark colors darker and light colors lighter
            let enhanced;
            if (gray < 128) {
              // Dark colors - make darker
              enhanced = Math.max(0, gray - 30);
            } else {
              // Light colors - make lighter
              enhanced = Math.min(255, gray + 30);
            }
            
            // Apply threshold for better black/white contrast
            const final = enhanced < 120 ? 0 : 255;
            
            data[i] = final;     // Red
            data[i + 1] = final; // Green
            data[i + 2] = final; // Blue
            // Alpha channel (data[i + 3]) stays the same
          }
          
          // Put the processed image data back
          ctx.putImageData(imageData, 0, 0);
          
          // Convert canvas to blob
          canvas.toBlob((blob) => {
            if (blob) {
              console.log('✅ Image preprocessing completed');
              console.log('📄 Processed image size:', blob.size, 'bytes');
              resolve(blob);
            } else {
              reject(new Error('Failed to convert processed image to blob'));
            }
          }, 'image/png');
          
        } catch (error) {
          console.error('❌ Image preprocessing failed:', error);
          reject(error);
        }
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image for preprocessing'));
      };
      
      // Load the image
      img.src = URL.createObjectURL(imageFile);
    });
  }

  parseReceiptText(text) {
    console.log('🔍 Parsing receipt text...');
    
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    const storeName = this.extractStoreName(lines);
    const category = this.extractCategory(lines, storeName);

    const result = {
      storeName,
      amount: this.extractAmount(lines),
      date: this.extractDate(lines),
      items: this.extractItems(lines),
      category
    };

    console.log('📊 Extraction results:', result);
    return result;
  }

  extractCategory(lines, storeName) {
    console.log('📊 Starting category detection...');
    
    // Combine all text for analysis
    const allText = lines.join(' ').toLowerCase();
    const storeNameLower = (storeName || '').toLowerCase();
    
    // Category detection rules with confidence scores
    const categoryRules = [
      {
        category: 'דלק',
        patterns: [
          { regex: /דלק|בנזין|סולר|paz|delek|sonol|תחנת[ס\s]*דלק/i, score: 10 },
          { regex: /fuel|gas[ס\s]*station|petrol/i, score: 8 },
          { regex: /ליטר|גלון/i, score: 6 }
        ]
      },
      {
        category: 'חניה',
        patterns: [
          { regex: /חניה|parking|חניון/i, score: 10 },
          { regex: /שעות[ס\s]*חניה|חניה[ס\s]*שעות/i, score: 8 }
        ]
      },
      {
        category: 'תחבורה',
        patterns: [
          { regex: /אוטובוס|מונית|רכבת|bus|taxi|train|רב קו/i, score: 10 },
          { regex: /נסיעה|כרטיס|תחבורה[ס\s]*ציבורית/i, score: 8 }
        ]
      },
      {
        category: 'ציוד משרדי',
        patterns: [
          { regex: /נייר|עט|עיפרון|מחשב|מדפסת|office[ס\s]*depot|סטיפלר/i, score: 10 },
          { regex: /paper|pen|pencil|stapler|printer|משרד|ציוד[ס\s]*משרד/i, score: 8 },
          { regex: /קלמר|מחדד|מחק|סרגל/i, score: 6 }
        ]
      },
      {
        category: 'אוכל',
        patterns: [
          { regex: /סופר|שופרסל|רמי[ס\s]*לוי|מחסני[ס\s]*אשח|מגה[ס\s]*בול|יוחננוף/i, score: 10 },
          { regex: /לחם|חלב|גבינה|ביצים|פירות|ירקות|בשר|עוף|דג|ארוחה/i, score: 8 },
          { regex: /bread|milk|cheese|eggs|meat|chicken|fish|vegetables|fruits|מזון/i, score: 6 },
          { regex: /קופיקס|cofix|מקדונלדס|mcdonalds|בורגר|burger|פיצה|pizza/i, score: 8 }
        ]
      }
    ];
    
    // Calculate scores for each category
    const categoryScores = {};
    
    for (const rule of categoryRules) {
      let totalScore = 0;
      
      for (const pattern of rule.patterns) {
        if (pattern.regex.test(allText) || pattern.regex.test(storeNameLower)) {
          totalScore += pattern.score;
          console.log(`🎣 Category match: ${rule.category} (+${pattern.score}) - pattern: ${pattern.regex}`);
        }
      }
      
      if (totalScore > 0) {
        categoryScores[rule.category] = totalScore;
      }
    }
    
    // Find the category with the highest score
    let bestCategory = 'אוכל'; // Default
    let bestScore = 0;
    
    for (const [category, score] of Object.entries(categoryScores)) {
      if (score > bestScore) {
        bestScore = score;
        bestCategory = category;
      }
    }
    
    console.log('📊 Category scores:', categoryScores);
    console.log(`🏆 Selected category: ${bestCategory} (score: ${bestScore})`);
    
    return bestCategory;
  }

  extractStoreName(lines) {
    // Look for common store names in Hebrew and English
    const storePatterns = [
      /סופר\s*פארם/i,
      /שופרסל/i,
      /רמי\s*לוי/i,
      /מגה\s*בול/i,
      /יוחננוף/i,
      /קופיקס/i,
      /super\s*pharm/i,
      /shufersal/i,
      /rami\s*levy/i,
      /mega\s*bool/i,
      /yohananof/i,
      /cofix/i
    ];

    // Check first few lines for store name
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i];
      for (const pattern of storePatterns) {
        if (pattern.test(line)) {
          console.log('🏪 Store found:', line);
          return line.trim();
        }
      }
    }

    // If no known store found, use first non-empty line
    const firstLine = lines.find(line => line.length > 2);
    console.log('🏪 Using first line as store:', firstLine);
    return firstLine || 'חנות לא מזוהה';
  }

  extractAmount(lines) {
    console.log('💰 Starting amount extraction from', lines.length, 'lines');
    
    // Priority patterns for final total amounts (highest priority)
    const finalTotalPatterns = [
      { pattern: /סה[״"']כ\s*לתשלום[:\s]*([0-9]+[.,][0-9]{2})/i, priority: 20, name: 'סהכ לתשלום' },
      { pattern: /לתשלום[:\s]*([0-9]+[.,][0-9]{2})/i, priority: 18, name: 'לתשלום' },
      { pattern: /סה[״"']כ\s*כולל\s*מע[״"']מ[:\s]*([0-9]+[.,][0-9]{2})/i, priority: 16, name: 'סהכ כולל מעמ' },
      { pattern: /כולל\s*מע[״"']מ[:\s]*([0-9]+[.,][0-9]{2})/i, priority: 15, name: 'כולל מעמ' },
      { pattern: /total\s*amount[:\s]*([0-9]+[.,][0-9]{2})/i, priority: 14, name: 'total amount' },
      { pattern: /final\s*total[:\s]*([0-9]+[.,][0-9]{2})/i, priority: 14, name: 'final total' },
      { pattern: /סה[״"']כ\s*סופי[:\s]*([0-9]+[.,][0-9]{2})/i, priority: 13, name: 'סהכ סופי' },
      { pattern: /סה[״"']כ[:\s]*([0-9]+[.,][0-9]{2})\s*$/, priority: 12, name: 'סהכ בסוף שורה' },
      { pattern: /סה[״"']כ[:\s]*([0-9]+[.,][0-9]{2})/i, priority: 10, name: 'סהכ' },
      { pattern: /סהכ[:\s]*([0-9]+[.,][0-9]{2})/i, priority: 10, name: 'סהכ' },
      { pattern: /total[:\s]*([0-9]+[.,][0-9]{2})/i, priority: 8, name: 'total' }
    ];
    
    // Medium priority patterns
    const mediumPriorityPatterns = [
      { pattern: /סך[:\s]*([0-9]+[.,][0-9]{2})/i, priority: 5, name: 'סך' },
      { pattern: /([0-9]+[.,][0-9]{2})\s*₪\s*$/, priority: 4, name: 'amount with ₪ at end' },
      { pattern: /₪\s*([0-9]+[.,][0-9]{2})\s*$/, priority: 4, name: '₪ amount at end' }
    ];
    
    // Low priority patterns (fallback)
    const fallbackPatterns = [
      { pattern: /([0-9]+[.,][0-9]{2})\s*₪/i, priority: 2, name: 'amount with ₪' },
      { pattern: /₪\s*([0-9]+[.,][0-9]{2})/i, priority: 2, name: '₪ amount' },
      { pattern: /([0-9]+[.,][0-9]{2})\s*שקל/i, priority: 1, name: 'amount with שקל' }
    ];
    
    // Patterns to avoid (pre-VAT amounts) - enhanced to catch more VAT patterns
    const avoidPatterns = [
      /לפני\s*מע[״"']מ/i,
      /before\s*vat/i,
      /מע[״"']מ/i,  // Any line containing VAT in Hebrew
      /vat/i,  // Any line containing VAT in English
      /סה[״"']כ\s*לפני\s*מע[״"']מ/i,  // Total before VAT
      /סך\s*לפני\s*מע[״"']מ/i,  // Sum before VAT
      /subtotal/i,  // Subtotal in English
      /סבטוטל/i,  // Subtotal in Hebrew transliteration
      /סהכ\s*לפני/i,  // Total before
      /סך\s*ביניים/i,  // Interim sum
      /לפני/i,  // Before (any context)
      /ביניים/i,  // Interim
      /משנה/i,  // Secondary/double
      /סבטוטל/i,  // Subtotal
      /סךהכל/i  // Sub-total
    ];

    const foundAmounts = [];
    const allPatterns = [...finalTotalPatterns, ...mediumPriorityPatterns, ...fallbackPatterns];

    // Process each line
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex].trim();
      if (line.length === 0) continue;
      
      // Skip lines that contain pre-VAT indicators
      const shouldAvoid = avoidPatterns.some(avoidPattern => avoidPattern.test(line));
      if (shouldAvoid) {
        console.log('⚠️ ❌ Skipping pre-VAT/subtotal line:', line);
        continue;
      }
      
      console.log(`🔍 Analyzing line ${lineIndex + 1}: "${line}"`);
      
      // Give priority bonus to lines near the end of the receipt
      const endBonus = lineIndex > lines.length * 0.7 ? 5 : 0;
      
      // Try each pattern
      for (const { pattern, priority, name } of allPatterns) {
        const match = line.match(pattern);
        if (match) {
          const amount = parseFloat(match[1].replace(',', '.'));
          if (amount > 0 && amount < 10000) { // Reasonable range
            foundAmounts.push({
              amount,
              priority: priority + endBonus,
              originalPriority: priority,
              name,
              line,
              lineIndex,
              isEndOfReceipt: lineIndex > lines.length * 0.7,
              endBonus
            });
            console.log(`💰 ✅ Amount found: ${amount} (${name}, priority: ${priority + endBonus} = ${priority} + ${endBonus}) in line: "${line}"`);
          }
        }
      }
    }

    if (foundAmounts.length === 0) {
      console.log('💰 No amounts found with patterns, trying fallback...');
      // Fallback: look for any number with decimal in the last third of the receipt
      const lastThirdStart = Math.floor(lines.length * 0.66);
      for (let i = lastThirdStart; i < lines.length; i++) {
        const line = lines[i];
        const numberMatch = line.match(/([0-9]+[.,][0-9]{2})/);
        if (numberMatch) {
          const amount = parseFloat(numberMatch[1].replace(',', '.'));
          if (amount > 1 && amount < 1000) {
            console.log('💰 Fallback amount:', amount, 'from line:', line);
            return amount;
          }
        }
      }
      console.log('💰 No amount found, using default');
      return 0;
    }

    // Sort by priority (highest first), then by position (later in receipt preferred)
    foundAmounts.sort((a, b) => {
      // First by priority
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      // Then by position in receipt (later is better for totals)
      return b.lineIndex - a.lineIndex;
    });

    const selectedAmount = foundAmounts[0];
    console.log(`💰 🏆 SELECTED AMOUNT: ${selectedAmount.amount}`);
    console.log(`   ✅ Pattern: ${selectedAmount.name}`);
    console.log(`   ✅ Priority: ${selectedAmount.priority} (${selectedAmount.originalPriority} + ${selectedAmount.endBonus} end bonus)`);
    console.log(`   ✅ Line: "${selectedAmount.line}"`);
    console.log(`   ✅ Position: ${selectedAmount.lineIndex + 1}/${lines.length}`);
    
    console.log('\n📊 All found amounts (sorted by priority):');
    foundAmounts.forEach((a, index) => {
      const marker = index === 0 ? '🏆' : '🔸';
      console.log(`   ${marker} ${a.amount} - ${a.name} (priority: ${a.priority}) - "${a.line}"`);
    });
    
    return selectedAmount.amount;
  }

  extractDate(lines) {
    console.log('📅 Starting date extraction from', lines.length, 'lines');
    
    // Enhanced date patterns with better Hebrew date support
    const datePatterns = [
      // Standard formats
      { pattern: /([0-9]{1,2})[\/\-.]([0-9]{1,2})[\/\-.]([0-9]{4})/, priority: 10, format: 'DD/MM/YYYY' },
      { pattern: /([0-9]{4})[\/\-.]([0-9]{1,2})[\/\-.]([0-9]{1,2})/, priority: 9, format: 'YYYY/MM/DD' },
      { pattern: /([0-9]{1,2})[\/\-.]([0-9]{1,2})[\/\-.]([0-9]{2})/, priority: 8, format: 'DD/MM/YY' },
      // Hebrew date context patterns
      { pattern: /תאריך[:\s]*([0-9]{1,2})[\/\-.]([0-9]{1,2})[\/\-.]([0-9]{2,4})/, priority: 15, format: 'Hebrew date' },
      { pattern: /דיט[:\s]*([0-9]{1,2})[\/\-.]([0-9]{1,2})[\/\-.]([0-9]{2,4})/, priority: 14, format: 'Date' },
      // Time-based patterns (often near dates)
      { pattern: /([0-9]{1,2})[\/\-.]([0-9]{1,2})[\/\-.]([0-9]{2,4})\s*[0-9]{1,2}:[0-9]{2}/, priority: 12, format: 'Date with time' }
    ];

    const foundDates = [];

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex].trim();
      if (line.length === 0) continue;
      
      for (const { pattern, priority, format } of datePatterns) {
        const match = line.match(pattern);
        if (match) {
          let day, month, year;
          
          // Determine the format and extract accordingly
          if (format === 'YYYY/MM/DD') {
            year = parseInt(match[1]);
            month = parseInt(match[2]);
            day = parseInt(match[3]);
          } else {
            // All other formats are DD/MM/YY or DD/MM/YYYY
            day = parseInt(match[1]);
            month = parseInt(match[2]);
            year = parseInt(match[3]);
          }
          
          // Enhanced 2-digit year conversion with current year context
          if (year < 100) {
            const currentYear = new Date().getFullYear();
            const currentYearShort = currentYear % 100;
            
            // If the 2-digit year is close to current year, use 2000s
            if (Math.abs(year - currentYearShort) <= 10) {
              year += 2000;
            } else if (year < 50) {
              year += 2000;
            } else {
              year += 1900;
            }
          }

          // Validate date with more reasonable range
          if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 2020 && year <= 2030) {
            const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            foundDates.push({
              date: dateStr,
              priority,
              format,
              line,
              lineIndex,
              year,
              month,
              day
            });
            console.log(`📅 Date found: ${dateStr} (${format}, priority: ${priority}) in line: "${line}"`);
          } else {
            console.log(`⚠️ Invalid date: ${day}/${month}/${year} from line: "${line}"`);
          }
        }
      }
    }

    if (foundDates.length === 0) {
      console.log('📅 No valid dates found, using today');
      const today = new Date().toISOString().split('T')[0];
      return today;
    }

    // Sort by priority (highest first), then by position (earlier in receipt preferred for dates)
    foundDates.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return a.lineIndex - b.lineIndex;
    });

    const selectedDate = foundDates[0];
    console.log(`📅 Selected date: ${selectedDate.date} (${selectedDate.format}, priority: ${selectedDate.priority})`);
    console.log('📅 All found dates:', foundDates.map(d => `${d.date} (${d.format})`));
    
    return selectedDate.date;
  }

  extractItems(lines) {
    // Look for item lines (lines with prices)
    const items = [];
    
    for (const line of lines) {
      // Skip lines that look like totals or headers
      if (/סה[״"']כ|total|סהכ|סך/i.test(line)) continue;
      if (line.length < 3) continue;
      
      // Look for lines with prices
      if (/[0-9]+[.,][0-9]{2}/.test(line)) {
        // Clean up the line
        const cleanLine = line.replace(/[0-9]+[.,][0-9]{2}.*/, '').trim();
        if (cleanLine.length > 2) {
          items.push(cleanLine);
        }
      }
    }

    console.log('🛒 Items found:', items);
    return items.slice(0, 5); // Limit to first 5 items
  }

  async cleanup() {
    if (this.worker) {
      console.log('🧹 Cleaning up OCR worker...');
      await this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
    }
  }
}

// Create singleton instance
const clientOCRService = new ClientOCRService();

export default clientOCRService;
