const express    = require('express');
const multer     = require('multer');
const path       = require('path');
const fs         = require('fs');
const supabase   = require('../config/supabase');
const authMw     = require('../middleware/auth');
const { processApplication } = require('../services/evaluationService');

const router = express.Router();

// Multer: accept images and PDFs, max 10MB
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.pdf', '.txt']; // Added .txt for testing
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed: ${ext}. Please upload JPG, PNG, PDF, or TXT files.`));
    }
  }
});

/* ─── POST /api/applications/submit ─────────────────── */
router.post('/submit', authMw, upload.fields([
  { name: 'mother_certificate', maxCount: 1 },
  { name: 'father_certificate', maxCount: 1 },
  { name: 'report_card', maxCount: 1 }
]), async (req, res) => {
  if (!req.files || !req.files.mother_certificate || !req.files.father_certificate || !req.files.report_card) {
    return res.status(400).json({ error: 'All three documents are required (mother certificate, father certificate, and report card)' });
  }

  if (!req.body.mother_income || !req.body.father_income) {
    return res.status(400).json({ error: 'Both parent income values are required' });
  }

  const motherFile = req.files.mother_certificate[0];
  const fatherFile = req.files.father_certificate[0];
  const reportFile = req.files.report_card[0];
  const motherIncome = parseFloat(req.body.mother_income);
  const fatherIncome = parseFloat(req.body.father_income);

  try {
    // 1. Upload all three files to Supabase Storage
    const timestamp = Date.now();
    
    // Upload mother's certificate
    const motherBuffer = fs.readFileSync(motherFile.path);
    const motherPath = `documents/${req.user.id}/mother_income_${timestamp}_${motherFile.originalname}`;
    const motherContentType = motherFile.mimetype === 'text/plain' ? 'application/pdf' : motherFile.mimetype;
    const { error: motherUploadError } = await supabase.storage
      .from('documents')
      .upload(motherPath, motherBuffer, { contentType: motherContentType });
    if (motherUploadError) throw motherUploadError;

    // Upload father's certificate
    const fatherBuffer = fs.readFileSync(fatherFile.path);
    const fatherPath = `documents/${req.user.id}/father_income_${timestamp}_${fatherFile.originalname}`;
    const fatherContentType = fatherFile.mimetype === 'text/plain' ? 'application/pdf' : fatherFile.mimetype;
    const { error: fatherUploadError } = await supabase.storage
      .from('documents')
      .upload(fatherPath, fatherBuffer, { contentType: fatherContentType });
    if (fatherUploadError) throw fatherUploadError;

    // Upload report card
    const reportBuffer = fs.readFileSync(reportFile.path);
    const reportPath = `documents/${req.user.id}/report_${timestamp}_${reportFile.originalname}`;
    const reportContentType = reportFile.mimetype === 'text/plain' ? 'application/pdf' : reportFile.mimetype;
    const { error: reportUploadError } = await supabase.storage
      .from('documents')
      .upload(reportPath, reportBuffer, { contentType: reportContentType });
    if (reportUploadError) throw reportUploadError;

    // 2. Extract text from all documents
    const [
      { extractedText: motherText },
      { extractedText: fatherText },
      { extractedText: reportText }
    ] = await Promise.all([
      processApplication(motherFile.path, motherFile.mimetype, null, true), // true = extract only
      processApplication(fatherFile.path, fatherFile.mimetype, null, true),
      processApplication(reportFile.path, reportFile.mimetype, null, true)
    ]);
    
    const combinedText = `Mother's Income Certificate:\n${motherText}\n\nFather's Income Certificate:\n${fatherText}\n\nReport Card:\n${reportText}`;

    // 3. Do single AI evaluation with all documents
    const { evaluation } = await processApplication(
      null, // no file path needed for evaluation only
      null,
      {
        motherIncome,
        fatherIncome,
        motherText,
        fatherText,
        reportText,
        combinedText
      },
      false // false = do evaluation
    );

    // 3. Save to database
    const status = evaluation.confidence_score < 60
      ? 'manual_review'
      : evaluation.qualified ? 'qualified' : 'disqualified';

    const { data: application, error: dbError } = await supabase
      .from('applications')
      .insert({
        user_id:                  req.user.id,
        mother_certificate_url:   motherPath,
        father_certificate_url:   fatherPath,
        report_card_url:          reportPath,
        mother_income:            motherIncome,
        father_income:            fatherIncome,
        extracted_text:           combinedText,
        evaluation_result:        evaluation,
        qualified:                evaluation.qualified,
        confidence_score:         evaluation.confidence_score,
        status
      })
      .select()
      .single();

    if (dbError) throw dbError;

    res.json({ success: true, application });

  } catch (err) {
    console.error('Evaluation error:', err);
    res.status(500).json({ error: err.message || 'Processing failed' });
  } finally {
    // Clean up temp files
    if (motherFile && fs.existsSync(motherFile.path)) fs.unlinkSync(motherFile.path);
    if (fatherFile && fs.existsSync(fatherFile.path)) fs.unlinkSync(fatherFile.path);
    if (reportFile && fs.existsSync(reportFile.path)) fs.unlinkSync(reportFile.path);
  }
});

/* ─── GET /api/applications/my ───────────────────────── */
router.get('/my', authMw, async (req, res) => {
  const { data, error } = await supabase
    .from('applications')
    .select('id, status, qualified, confidence_score, submitted_at, evaluation_result')
    .eq('user_id', req.user.id)
    .order('submitted_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ applications: data });
});

/* ─── GET /api/applications/:id ──────────────────────── */
router.get('/:id', authMw, async (req, res) => {
  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)  // ensure ownership
    .single();

  if (error) return res.status(404).json({ error: 'Application not found' });
  res.json({ application: data });
});

module.exports = router;