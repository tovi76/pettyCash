const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

class OCRService {
  constructor() {
    this.isInitialized = false;
    this.worker = null;
    this.supportedLanguages = ['heb', 'eng']; // Hebrew and English
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      console.log('Initializing OCR service...');
      this.worker = await Tesseract.createWorker('heb+eng', 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      });

      await this.worker.setParameters({
        tessedit_char_whitelist: '0123456789אבגדהוזחטיכלמנסעפצקרשתABCDEFGHIJKLMNOPQRSTUVWXYZ .,:-₪$€£¥',
        tessedit_pageseg_mode: Tesseract.PSM.AUTO,
        preserve_interword_spaces: '1'
      });

      this.isInitialized = true;
      console.log('OCR service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize OCR service:', error);
      throw error;
    }
  }

  async preprocessImage(imagePath) {
    try {
      const processedPath = imagePath.replace(/\.(jpg|jpeg|png)$/i, '_processed.png');
      
      await sharp(imagePath)
        .resize(null, 1200, { 
          withoutEnlargement: true,
          fit: 'inside'
        })
        .greyscale()
        .normalize()
        .sharpen()
        .png({ quality: 90 })
        .toFile(processedPath);

      return processedPath;
    } catch (error) {
      console.error('Image preprocessing error:', error);
      return imagePath; // Return original if preprocessing fails
    }
  }

  extractReceiptData(text) {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Extract store name (usually first meaningful line)
    const storeName = this.extractStoreName(lines);
    
    // Extract amounts (look for currency symbols and numbers)
    const amounts = this.extractAmounts(text);
    const totalAmount = this.findTotalAmount(amounts, text);
    
    // Extract date
    const date = this.extractDate(text);
    
    // Extract items
    const items = this.extractItems(lines, amounts);
    
    // Determine category based on store name and items
    const category = this.categorizeReceipt(storeName, items);
    
    // Calculate confidence score
    const confidence = this.calculateConfidence(storeName, totalAmount, date, items);

    return {
      storeName: storeName || 'לא זוהה',
      amount: totalAmount || 0,
      date: date || new Date().toISOString().split('T')[0],
      items: items,
      category: category,
      confidence: confidence,
      rawText: text,
      extractedAmounts: amounts
    };
  }

  extractStoreName(lines) {
    // Common Hebrew store patterns
    const storePatterns = [
      /^(רמי לוי|שופרסל|מגה|טיב טעם|יוחננוף|אושר עד|דור אלון|קופיקס|ארומה|גרג|מקדונלדס|בורגר קינג|פיצה האט)/i,
      /^(סופר פארם|ניו פארם|בי פארם|אלפא פארם)/i,
      /^(פז|דלק|סונול|דור אלון)/i,
      /^(אגד|דן|מטרופולין|קווים)/i,
      /^(איקאה|הום סנטר|אייס|פוקס|קסטרו)/i
    ];

    // Look for store name in first few lines
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i];
      
      // Check against known patterns
      for (const pattern of storePatterns) {
        const match = line.match(pattern);
        if (match) {
          return match[1];
        }
      }
      
      // If line looks like a store name (Hebrew/English letters, reasonable length)
      if (line.length > 2 && line.length < 30 && /^[א-תa-zA-Z\s]+$/.test(line)) {
        return line;
      }
    }

    return null;
  }

  extractAmounts(text) {
    // Patterns for amounts with various currency symbols
    const amountPatterns = [
      /₪\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g,  // ₪123.45
      /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*₪/g,  // 123.45₪
      /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)(?=\s|$)/g  // Just numbers
    ];

    const amounts = [];
    
    for (const pattern of amountPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const amountStr = match[1] || match[0];
        const amount = parseFloat(amountStr.replace(/,/g, ''));
        if (!isNaN(amount) && amount > 0 && amount < 10000) { // Reasonable range
          amounts.push(amount);
        }
      }
    }

    return [...new Set(amounts)].sort((a, b) => b - a); // Remove duplicates and sort descending
  }

  findTotalAmount(amounts, text) {
    if (amounts.length === 0) return null;

    // Look for keywords that indicate total
    const totalKeywords = ['סה"כ', 'סהכ', 'סך הכל', 'total', 'סכום', 'לתשלום'];
    const lines = text.toLowerCase().split('\n');
    
    for (const keyword of totalKeywords) {
      for (const line of lines) {
        if (line.includes(keyword.toLowerCase())) {
          // Find amount in this line
          const lineAmounts = this.extractAmounts(line);
          if (lineAmounts.length > 0) {
            return lineAmounts[0];
          }
        }
      }
    }

    // If no total found, return the largest amount
    return amounts[0];
  }

  extractDate(text) {
    // Hebrew and English date patterns
    const datePatterns = [
      /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/,  // DD/MM/YYYY
      /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})/,  // DD/MM/YY
      /(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/   // YYYY/MM/DD
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        let day, month, year;
        
        if (match[3].length === 4) { // YYYY format
          if (match[0].startsWith(match[3])) { // YYYY/MM/DD
            year = parseInt(match[1]);
            month = parseInt(match[2]);
            day = parseInt(match[3]);
          } else { // DD/MM/YYYY
            day = parseInt(match[1]);
            month = parseInt(match[2]);
            year = parseInt(match[3]);
          }
        } else { // YY format
          day = parseInt(match[1]);
          month = parseInt(match[2]);
          year = 2000 + parseInt(match[3]);
        }

        // Validate date
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 2020 && year <= 2030) {
          return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        }
      }
    }

    return null;
  }

  extractItems(lines, amounts) {
    const items = [];
    const amountSet = new Set(amounts);
    
    for (const line of lines) {
      // Skip lines that are just amounts or store info
      if (this.extractAmounts(line).some(amt => amountSet.has(amt))) continue;
      if (line.length < 3 || line.length > 50) continue;
      if (/^[\d\s\-\/\.]+$/.test(line)) continue; // Skip date/number only lines
      
      // Look for item-like patterns
      if (/^[א-תa-zA-Z]/.test(line) && !/^(קופה|קופאי|תאריך|שעה|מס|ח\.פ)/i.test(line)) {
        items.push(line.trim());
      }
    }

    return items.slice(0, 10); // Limit to 10 items
  }

  categorizeReceipt(storeName, items) {
    const categories = {
      'מזון ומשקאות': ['רמי לוי', 'שופרסל', 'מגא', 'טיב טעם', 'יוחננוף', 'אושר עד', 'ארומה', 'גרג', 'מקדונלדס', 'בורגר קינג', 'פיצה האט'],
      'בריאות וטיפוח': ['סופר פארם', 'ניו פארם', 'בי פארם', 'אלפא פארם'],
      'תחבורה': ['פז', 'דלק', 'סונול', 'דור אלון', 'אגד', 'דן', 'מטרופולין', 'קווים'],
      'ציוד משרדי': ['אופיס דפו', 'סטפלס', 'פרינט'],
      'אחר': []
    };

    if (storeName) {
      const storeNameLower = storeName.toLowerCase();
      for (const [category, stores] of Object.entries(categories)) {
        if (stores.some(store => storeNameLower.includes(store.toLowerCase()))) {
          return category;
        }
      }
    }

    // Categorize by items if store name doesn't match
    const itemText = items.join(' ').toLowerCase();
    if (/לחם|חלב|ביצים|גבינה|בשר|עוף|פירות|ירקות|משקה|קפה|תה/.test(itemText)) {
      return 'מזון ומשקאות';
    }
    if (/שמפו|סבון|משחת|תרופה|ויטמין/.test(itemText)) {
      return 'בריאות וטיפוח';
    }
    if (/דלק|בנזין|נסיעה|כרטיס/.test(itemText)) {
      return 'תחבורה';
    }

    return 'אחר';
  }

  calculateConfidence(storeName, amount, date, items) {
    let confidence = 0;

    // Store name found
    if (storeName && storeName !== 'לא זוהה') confidence += 0.3;
    
    // Valid amount found
    if (amount && amount > 0) confidence += 0.3;
    
    // Valid date found
    if (date) confidence += 0.2;
    
    // Items found
    if (items && items.length > 0) confidence += 0.2;

    return Math.min(confidence, 1.0);
  }

  async processReceipt(imagePath) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      console.log(`Processing receipt: ${imagePath}`);
      
      // Preprocess image for better OCR results
      const processedImagePath = await this.preprocessImage(imagePath);
      
      // Perform OCR
      const { data: { text } } = await this.worker.recognize(processedImagePath);
      
      // Clean up processed image if it's different from original
      if (processedImagePath !== imagePath) {
        try {
          await fs.unlink(processedImagePath);
        } catch (cleanupError) {
          console.warn('Failed to cleanup processed image:', cleanupError);
        }
      }

      // Extract structured data from OCR text
      const receiptData = this.extractReceiptData(text);
      
      console.log(`OCR completed with confidence: ${(receiptData.confidence * 100).toFixed(1)}%`);
      
      return receiptData;
    } catch (error) {
      console.error('OCR processing error:', error);
      throw new Error(`OCR processing failed: ${error.message}`);
    }
  }

  async terminate() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
      console.log('OCR service terminated');
    }
  }
}

// Singleton instance
const ocrService = new OCRService();

// Graceful shutdown
process.on('SIGINT', async () => {
  await ocrService.terminate();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await ocrService.terminate();
  process.exit(0);
});

module.exports = ocrService;
