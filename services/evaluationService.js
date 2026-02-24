// ═══════════════════════════════════════════════════════════════════════════════
// DEPENDENCIES - Import required libraries for document processing and AI evaluation
// ═══════════════════════════════════════════════════════════════════════════════

// Tesseract.js: OCR (Optical Character Recognition) library
// - Extracts text from images (JPG, PNG, etc.)
// - Uses machine learning to recognize text in scanned documents/photos
const Tesseract = require('tesseract.js');

// groq-sdk: API client for Groq platform
// - Groq provides ultra-fast AI inference using specialized hardware (LPU chips)
// - Runs AI models like Meta's Llama at extremely high speeds
// - Free tier: 14,400 requests/day, much faster than standard cloud AI
const Groq = require('groq-sdk');

// Node.js built-in modules
const fs = require('fs');      // File system - read/write files
const path = require('path');  // Handle file paths across different OS

// pdf-parse: Extract text from PDF documents
// - Reads PDF files and converts them to plain text
// - Handles both text-based PDFs and scanned PDFs (with OCR)
const pdfParseImport = require('pdf-parse');
const pdfParse = pdfParseImport.default || pdfParseImport;

// Supabase client: Database connection for fetching scholarship rules
const supabase  = require('../config/supabase');

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION - Set up evaluation mode (real AI vs mock testing)
// ═══════════════════════════════════════════════════════════════════════════════

// Mock mode allows testing without using real API calls
// - Useful for development/testing when you don't have an API key yet
// - Returns simulated evaluation results instead of calling Groq AI
const USE_MOCK_MODE = process.env.USE_MOCK_EVALUATION === 'true';

// Initialize Groq AI client (only if not in mock mode and API key exists)
// - If USE_MOCK_MODE is true, set groq to null (skip AI initialization)
// - If no GROQ_API_KEY in .env file, set groq to null
// - Otherwise, create Groq client instance with the API key
const groq = USE_MOCK_MODE || !process.env.GROQ_API_KEY 
  ? null 
  : new Groq({ apiKey: process.env.GROQ_API_KEY });

// Log which mode we're running in (helps with debugging)
if (USE_MOCK_MODE) {
  console.log('⚠️  Running in MOCK EVALUATION mode');
} else if (groq) {
  console.log('✅ Using Groq AI for evaluation (FREE & FAST)');
} else {
  console.log('⚠️  No API key found, enable mock mode or add GROQ_API_KEY');
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 1: TEXT EXTRACTION - Extract text from uploaded documents
// ═══════════════════════════════════════════════════════════════════════════════
// This function handles 3 types of files:
// 1. Plain text files (.txt) - read directly
// 2. PDF files (.pdf) - extract text using pdf-parse
// 3. Image files (.jpg, .png) - extract text using OCR (Optical Character Recognition)
// ═══════════════════════════════════════════════════════════════════════════════

async function extractText(imagePath, mimetype) {
  console.log('🔍 Extracting text from:', imagePath);

  // ── Handle Plain Text Files (.txt) ──────────────────────────────────
  // For testing purposes, if user uploads a .txt file, just read it
  // No special processing needed - it's already text
  if (mimetype === 'text/plain') {
    console.log('   📄 Reading text file directly (no OCR needed)');
    const text = fs.readFileSync(imagePath, 'utf8');
    return text.trim(); // Remove extra whitespace from start/end
  }

  // ── Handle PDF Files (.pdf) ─────────────────────────────────────────
  // PDF documents need special parsing to extract text
  // pdf-parse library reads the PDF structure and pulls out text content
  if (mimetype === 'application/pdf') {
    console.log('   📑 Parsing PDF file');
    const dataBuffer = fs.readFileSync(imagePath);  // Read file as binary buffer
    const data = await pdfParse(dataBuffer);         // Parse PDF and extract text
    console.log('✅ PDF parsing complete');
    return data.text.trim(); // Return extracted text
  }

  // ── Handle Image Files (.jpg, .png, etc.) using OCR ────────────────
  // Tesseract OCR (Optical Character Recognition):
  // - Scans the image pixel by pixel
  // - Uses machine learning to identify letters, numbers, and words
  // - Converts visual text into digital/editable text
  // Example: Photo of a report card → extractable text like "GWA: 2.5"
  console.log('   🖼️  Using OCR for image');
  const { data: { text } } = await Tesseract.recognize(
    imagePath,                                      // Path to image file
    'eng',                                          // Language: English
    { logger: m => process.stdout.write('.') }      // Show progress dots
  );

  console.log('\n✅ OCR complete');
  return text.trim(); // Return extracted text from image
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 2: LOAD SCHOLARSHIP RULES - Fetch qualification criteria from database
// ═══════════════════════════════════════════════════════════════════════════════
// Rules stored in database (scholarship_rules table):
// - max_monthly_income: Maximum allowed family income (e.g., ₱30,000)
// - max_gwa: Maximum GWA allowed (e.g., 3.0 - lower is better in PH system)
// - Other criteria like age limits, enrollment requirements, etc.
// ═══════════════════════════════════════════════════════════════════════════════

async function loadRules() {
  // Query Supabase database to get all scholarship rules
  // SELECT rule_key, rule_value, description FROM scholarship_rules
  const { data: rules } = await supabase
    .from('scholarship_rules')
    .select('rule_key, rule_value, description');

  // Convert array of rules into a key-value object for easy access
  // Example transformation:
  // FROM: [{ rule_key: 'max_monthly_income', rule_value: '30000' }, ...]
  // TO:   { max_monthly_income: '30000', max_gwa: '3.0', ... }
  return rules.reduce((acc, r) => {
    acc[r.rule_key] = r.rule_value;
    return acc;
  }, {});
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK EVALUATION - Simulated evaluation for testing without using AI API
// ═══════════════════════════════════════════════════════════════════════════════
// Used when:
// - Developer doesn't have a Groq API key yet
// - Testing the system without consuming API credits
// - Demonstrating the application flow in development
// Returns fake/simulated results that look like real AI evaluation
// ═══════════════════════════════════════════════════════════════════════════════

function generateMockEvaluation(extractedText, rules) {
  console.log('🤖 Using MOCK evaluation (no OpenAI API call)');
  
  // ── Create Fake Applicant Data ──────────────────────────────────────
  // Simulate a qualified applicant with reasonable test values
  const mockMotherIncome = 12000;  // Mother earns ₱12,000/month
  const mockFatherIncome = 13000;  // Father earns ₱13,000/month
  const mockTotalIncome = mockMotherIncome + mockFatherIncome; // ₱25,000 total
  const mockGWA = 2.5;              // GWA of 2.5 (good standing)
  
  // ── Get Thresholds from Rules ───────────────────────────────────────
  // Rules define maximum allowed values for qualification  // Convert string values to numbers for comparison
  const maxIncome = parseInt(rules.max_monthly_income || '30000'); // ₱30,000 default
  const maxGWA = parseFloat(rules.max_gwa || '3.0');              // 3.0 default
  
  // ── Evaluate Qualification ──────────────────────────────────────────
  // Check if mock applicant meets each requirement
  const incomePass = mockTotalIncome <= maxIncome; // ₱25,000 ≤ ₱30,000 ✓
  const gwaPass = mockGWA <= maxGWA;                // 2.5 ≤ 3.0 ✓
  const qualified = incomePass && gwaPass;          // Both must pass

  // ── Return Mock Evaluation Result ───────────────────────────────────
  // Format matches real AI evaluation structure so frontend works the same
  return {
    qualified,                        // Overall qualification status
    extracted_data: {                 // Fake extracted information
      applicant_name: "Test Applicant (Mock)",
      mother_income: mockMotherIncome,
      father_income: mockFatherIncome,
      total_income: mockTotalIncome,
      gwa: mockGWA,
      enrollment_status: "Currently Enrolled",
      school: "Mock University",
      course: "Computer Science"
    },
    evaluation: {                     // Detailed evaluation breakdown
      income_check: {
        passed: incomePass,
        mother_value_found: mockMotherIncome,
        father_value_found: mockFatherIncome,
        total_value_found: mockTotalIncome,
        threshold: maxIncome,
        income_verified: true,        // Pretend certificates were verified
        reason: incomePass 
          ? `Combined income ₱${mockTotalIncome.toLocaleString()} is below threshold ₱${maxIncome.toLocaleString()}` 
          : `Combined income ₱${mockTotalIncome.toLocaleString()} exceeds threshold ₱${maxIncome.toLocaleString()}`
      },
      gwa_check: {
        passed: gwaPass,
        value_found: mockGWA,
        threshold: maxGWA,
        reason: gwaPass 
          ? `GWA ${mockGWA} meets requirement (≤${maxGWA})` 
          : `GWA ${mockGWA} does not meet requirement (>${maxGWA})`
      }
    },
    disqualification_reasons: qualified ? [] : [
      ...(!incomePass ? ['Combined income exceeds limit'] : []),
      ...(!gwaPass ? ['GWA below requirement'] : [])
    ],
    confidence_score: 95,             // Fake confidence score
    ocr_quality: "good",              // Pretend OCR worked well
    notes: "⚠️ MOCK EVALUATION - This is simulated data for testing without OpenAI API"
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 3: AI-POWERED EVALUATION - Use Groq + Llama AI to evaluate documents
// ═══════════════════════════════════════════════════════════════════════════════
// HOW IT WORKS:
// 1. Build a detailed prompt with rules and extracted text
// 2. Send prompt to Groq API (which runs Meta's Llama AI model)
// 3. AI analyzes the text and extracts key information:
//    - Parent incomes from certificates
//    - GWA from report cards
//    - Student details (name, school, course)
// 4. AI checks if student qualifies based on scholarship rules
// 5. Returns structured JSON with evaluation results
//
// AI MODEL USED: llama-3.3-70b-versatile
// - Created by: Meta (Facebook)
// - Hosted/Run by: Groq (ultra-fast inference platform)
// - Free tier: 14,400 requests per day
// ═══════════════════════════════════════════════════════════════════════════════

async function evaluateWithAI(extractedText, rules, incomeVerification = null) {
  // ── Check if Mock Mode ──────────────────────────────────────────────
  // If testing without API, return simulated results instead
  if (USE_MOCK_MODE) {
    return generateMockEvaluation(extractedText, rules);
  }

  // ── Build Rules Text ────────────────────────────────────────────────
  // Convert rules object into human-readable text for AI
  // Example: "- max_monthly_income: 30000\n- max_gwa: 3.0"
  const rulesText = Object.entries(rules)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join('\n');

  // ── Build Income Verification Section (if provided) ────────────────
  // When user uploads 3 documents (mother cert, father cert, report card),
  // we need to verify incomes match what they claimed in the form
  const incomeVerificationSection = incomeVerification ? `
INCOME VERIFICATION REQUIRED:
The user claimed:
- Mother's monthly income: ₱${incomeVerification.motherIncome.toLocaleString()}
- Father's monthly income: ₱${incomeVerification.fatherIncome.toLocaleString()}
- Combined income: ₱${(incomeVerification.motherIncome + incomeVerification.fatherIncome).toLocaleString()}

YOU MUST:
1. Extract the mother's income from the MOTHER'S INCOME CERTIFICATE TEXT below
2. Extract the father's income from the FATHER'S INCOME CERTIFICATE TEXT below
3. Calculate the TOTAL combined household income
4. Verify if the extracted incomes match what the user claimed
5. Check if the total income is within the threshold (${rules.max_monthly_income || '30000'})

MOTHER'S INCOME CERTIFICATE TEXT:
"""
${incomeVerification.motherText}
"""

FATHER'S INCOME CERTIFICATE TEXT:
"""
${incomeVerification.fatherText}
"""

CRITICAL: You must extract numeric income values from these certificates. Look for:
- Salary amounts
- Monthly income figures  
- Compensation details
- Any PHP/₱ amounts that represent monthly earnings
- Words like "salary", "income", "monthly", "compensation", "earnings"

EXAMPLES of what income might look like in certificates:
- "Monthly Salary: ₱15,000"
- "Income: PHP 12000"
- "Gross Monthly Income: 18,000.00"
- "Compensation: Fifteen thousand pesos (₱15,000) per month"

If you cannot find clear income information in a certificate, set that parent's income to null.
If BOTH certificates have no income info, mark income_verified as false and passed as false.
` : '';

  // ── Build Complete AI Prompt ────────────────────────────────────────
  // This is the instruction we send to the AI model
  // It tells the AI exactly what to look for and how to respond
  const prompt = `
You are a scholarship application evaluator for a Philippine university scholarship program.

SCHOLARSHIP QUALIFICATION RULES:
${rulesText}

NOTES ON GRADING SYSTEM:
- Philippine GWA scale: 1.0 = highest, 5.0 = failed
- A GWA of 3.0 means minimum passing — applicant must have 3.0 OR BETTER (lower number = better)
- So if max_gwa = 3.0, the applicant passes if their GWA is 1.0, 1.5, 2.0, 2.5, or 3.0
- Monthly income is in Philippine Pesos (PHP / ₱)

${incomeVerificationSection}

REPORT CARD / GRADES DOCUMENT TEXT (for GWA extraction):
"""
${incomeVerification ? incomeVerification.reportText : extractedText}
"""

ANALYSIS INSTRUCTIONS:
1. Extract MOTHER'S INCOME from mother's certificate (look for salary/monthly income)
   - Search for numbers with ₱, PHP, peso, salary, income keywords
   - Return the numeric value only (e.g., 15000, not "15,000" or "₱15,000")
2. Extract FATHER'S INCOME from father's certificate (look for salary/monthly income)
   - Search for numbers with ₱, PHP, peso, salary, income keywords
   - Return the numeric value only (e.g., 12000)
3. Calculate TOTAL HOUSEHOLD INCOME = mother_income + father_income
   - Example: if mother = 15000 and father = 12000, total = 27000
4. Extract GWA/GRADE from report card
   - Look for "GWA", "General Weighted Average", or overall grade
5. Determine if the applicant QUALIFIES:
   - Income check: PASSES if total_income ≤ ${rules.max_monthly_income || '30000'}
   - GWA check: PASSES if gwa ≤ ${rules.max_gwa || '3.0'} (remember: 1.0 is best, 5.0 is worst)
   - Overall: QUALIFIED only if BOTH checks pass

IMPORTANT: 
- If you find mother_income = 15000 and father_income = 12000, then total = 27000
- Compare the total (27000) to threshold (30000): 27000 < 30000 means PASSED
- Set "passed": true if total is less than or equal to threshold
- Do NOT pass the check if income values are null

Carefully analyze the document and respond ONLY with a valid JSON object:
{
  "qualified": true or false,
  "extracted_data": {
    "applicant_name": "string or null",
    "mother_income": number or null,
    "father_income": number or null,
    "total_income": number or null,
    "gwa": number or null,
    "enrollment_status": "string or null",
    "school": "string or null",
    "course": "string or null"
  },
  "evaluation": {
    "income_check": {
      "passed": true/false,
      "mother_value_found": number or null (extracted from mother's certificate),
      "father_value_found": number or null (extracted from father's certificate),
      "total_value_found": number or null (mother + father),
      "threshold": number (max allowed income),
      "income_verified": true/false (true if certificates are readable and have income data),
      "reason": "Explain what income values you found and whether total is within threshold. Example: 'Mother: ₱15,000, Father: ₱12,000, Total: ₱27,000 is below threshold ₱30,000'"
    },
    "gwa_check": {
      "passed": true/false,
      "value_found": number or null,
      "threshold": number,
      "reason": "concise explanation"
    }
  },
  "disqualification_reasons": [],
  "confidence_score": 0-100,
  "ocr_quality": "good/fair/poor",
  "notes": "any important observations"
}
`;

  // ── Make API Call to Groq (runs Llama AI) ──────────────────────────
  // This sends the prompt to Groq's servers where Meta's Llama model analyzes it
  const response = await groq.chat.completions.create({
    // MODEL SELECTION:
    // - 'llama-3.3-70b-versatile': Meta's Llama 3.3 with 70 billion parameters
    // - "70b" = 70 billion parameters (more params = smarter AI)
    // - "versatile" = good at various tasks (classification, extraction, analysis)
    // - Hosted on Groq's LPU (Language Processing Unit) chips for speed
    // - Alternative models available: mixtral, gemma, etc.
    model: 'llama-3.3-70b-versatile',
    
    // MESSAGES: The conversation sent to AI
    messages: [
      // System message: Defines AI's role and behavior
      { 
        role: 'system', 
        content: 'You are a precise document evaluator. Always respond with valid JSON only. No markdown, no backticks.' 
      },
      // User message: The actual task/prompt with documents to analyze
      { 
        role: 'user', 
        content: prompt 
      }
    ],
    
    // TEMPERATURE: Controls randomness/creativity (0.0 to 2.0)
    // - 0.0 = Most deterministic/consistent (same input → same output)
    // - 1.0 = Balanced creativity
    // - 2.0 = Very creative/random
    // We use 0.1 for consistent, accurate data extraction
    temperature: 0.1,
    
    // RESPONSE FORMAT: Force AI to return valid JSON
    // - Ensures AI doesn't wrap response in markdown code blocks
    // - Makes parsing easier and more reliable
    response_format: { type: 'json_object' }
  });

  // ── Parse and Return AI Response ────────────────────────────────────
  // Extract the JSON string from AI response and parse it into JavaScript object
  // response.choices[0].message.content contains the AI's text reply
  return JSON.parse(response.choices[0].message.content);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN FUNCTION: Process Scholarship Application
// ═══════════════════════════════════════════════════════════════════════════════
// This is the main entry point called by the API routes.
// It handles 3 different scenarios:
//
// SCENARIO 1: Extract Only Mode (extractOnly = true)
//   - User uploads a single document just to see extracted text
//   - Used for testing/debugging OCR quality
//   - Returns: { extractedText: "..." }
//
// SCENARIO 2: Income Verification Mode (incomeVerification provided)
//   - User uploads 3 documents: mother cert, father cert, report card
//   - System verifies claimed incomes match certificates
//   - Returns: { evaluation: {...} }
//
// SCENARIO 3: Simple Evaluation Mode (default)
//   - User uploads single document (usually report card)
//   - System extracts and evaluates based on rules
//   - Returns: { extractedText: "...", evaluation: {...} }
// ═══════════════════════════════════════════════════════════════════════════════

async function processApplication(imagePath, mimetype, incomeVerification = null, extractOnly = false) {
  
  // ── SCENARIO 1: Extract-Only Mode ──────────────────────────────────
  // Just extract text from document without evaluation
  // Useful for testing if OCR is working correctly
  if (extractOnly && imagePath) {
    const extractedText = await extractText(imagePath, mimetype);
    return { extractedText };
  }

  // ── SCENARIO 2: Income Verification Mode ───────────────────────────
  // Verify parent incomes from 3 uploaded certificates
  // incomeVerification object contains:
  // - motherText: extracted text from mother's income certificate
  // - fatherText: extracted text from father's income certificate
  // - reportText: extracted text from student's report card/grades
  // - motherIncome: what user claimed as mother's income
  // - fatherIncome: what user claimed as father's income
  if (incomeVerification) {
    const rules = await loadRules();                    // Load qualification rules from DB
    const evaluation = await evaluateWithAI(
      incomeVerification.combinedText || incomeVerification.reportText, 
      rules, 
      incomeVerification
    );
    return { evaluation };
  }

  // ── SCENARIO 3: Simple Single-Document Evaluation ──────────────────
  // Extract text and evaluate in one go
  // Promise.all runs both operations in parallel for speed
  const [extractedText, rules] = await Promise.all([
    extractText(imagePath, mimetype),    // Extract text from document
    loadRules()                          // Load rules from database
  ]);

  // Send extracted text to AI for evaluation
  const evaluation = await evaluateWithAI(extractedText, rules);

  // Return both the raw extracted text and the AI's evaluation
  return { extractedText, evaluation };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT: Make processApplication available to other files
// ═══════════════════════════════════════════════════════════════════════════════
// This function is imported by routes/applications.js to handle API requests
module.exports = { processApplication };