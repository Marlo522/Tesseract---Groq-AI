import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import toast from 'react-hot-toast';
import { Upload, FileImage, ArrowLeft } from 'lucide-react';

export default function ApplyPage() {
  const [motherIncome, setMotherIncome]     = useState('');
  const [fatherIncome, setFatherIncome]     = useState('');
  const [motherFile, setMotherFile]         = useState(null);
  const [fatherFile, setFatherFile]         = useState(null);
  const [reportFile, setReportFile]         = useState(null);
  const [motherPreview, setMotherPreview]   = useState(null);
  const [fatherPreview, setFatherPreview]   = useState(null);
  const [reportPreview, setReportPreview]   = useState(null);
  const [loading, setLoading]               = useState(false);
  const [stage, setStage]                   = useState('idle'); // idle | ocr | ai | done
  const motherInputRef                      = useRef();
  const fatherInputRef                      = useRef();
  const reportInputRef                      = useRef();
  const navigate                            = useNavigate();

  const handleMotherFile = e => {
    const f = e.target.files[0];
    if (!f) return;
    setMotherFile(f);
    if (f.type.startsWith('image/')) {
      setMotherPreview(URL.createObjectURL(f));
    } else {
      setMotherPreview(null);
    }
  };

  const handleFatherFile = e => {
    const f = e.target.files[0];
    if (!f) return;
    setFatherFile(f);
    if (f.type.startsWith('image/')) {
      setFatherPreview(URL.createObjectURL(f));
    } else {
      setFatherPreview(null);
    }
  };

  const handleReportFile = e => {
    const f = e.target.files[0];
    if (!f) return;
    setReportFile(f);
    if (f.type.startsWith('image/')) {
      setReportPreview(URL.createObjectURL(f));
    } else {
      setReportPreview(null);
    }
  };

  const handleSubmit = async () => {
    // Validate all required fields
    if (!motherIncome || !fatherIncome) {
      toast.error('Please enter both parent incomes');
      return;
    }
    if (!motherFile || !fatherFile || !reportFile) { 
      toast.error('Please upload all required documents'); 
      return; 
    }
    
    const totalIncome = parseFloat(motherIncome) + parseFloat(fatherIncome);
    if (isNaN(totalIncome)) {
      toast.error('Please enter valid numeric income values');
      return;
    }

    setLoading(true);
    setStage('ocr');

    const formData = new FormData();
    formData.append('mother_income', motherIncome);
    formData.append('father_income', fatherIncome);
    formData.append('mother_certificate', motherFile);
    formData.append('father_certificate', fatherFile);
    formData.append('report_card', reportFile);

    try {
      // Simulate stages for UX feedback
      const stageTimer = setTimeout(() => setStage('ai'), 3000);

      const { data } = await api.post('/applications/submit', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      clearTimeout(stageTimer);
      setStage('done');
      toast.success('Application processed!');
      navigate(`/result/${data.application.id}`);

    } catch (err) {
      toast.error(err.response?.data?.error || 'Submission failed');
      setStage('idle');
    } finally {
      setLoading(false);
    }
  };

  const STAGES = {
    ocr: '🔍 Extracting text from document (OCR)...',
    ai:  '🤖 AI is evaluating your application...',
    done:'✅ Done! Redirecting...',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-6 py-10">

        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>

        <h1 className="text-2xl font-bold text-gray-800 mb-2">Submit Application</h1>
        <p className="text-gray-500 mb-8">
          Upload a clear photo or scan of your documents. Our AI will evaluate your eligibility automatically.
        </p>

        {/* Requirements Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6">
          <h3 className="font-semibold text-blue-800 mb-3">📋 Scholarship Requirements</h3>
          <ul className="text-sm text-blue-700 space-y-2">
            <li>✅ Combined monthly household income: <strong>below ₱30,000</strong></li>
            <li>✅ GWA: <strong>3.0 or better</strong> (1.0 scale)</li>
            <li>✅ Currently enrolled student</li>
          </ul>
        </div>

        {/* Parent Income Section */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <h3 className="font-semibold text-gray-800 mb-4">💰 Parent Income Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mother's Monthly Income <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₱</span>
                <input
                  type="number"
                  value={motherIncome}
                  onChange={(e) => setMotherIncome(e.target.value)}
                  placeholder="15000"
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Father's Monthly Income <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₱</span>
                <input
                  type="number"
                  value={fatherIncome}
                  onChange={(e) => setFatherIncome(e.target.value)}
                  placeholder="12000"
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {motherIncome && fatherIncome && !isNaN(parseFloat(motherIncome) + parseFloat(fatherIncome)) && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Combined Income: </span>
              <span className="text-lg font-bold text-gray-800">
                ₱{(parseFloat(motherIncome) + parseFloat(fatherIncome)).toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* Document 1: Mother's Income Certificate */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            📄 Mother's Income Certificate <span className="text-red-500">*</span>
          </label>
          <div
            onClick={() => !loading && motherInputRef.current.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
              loading ? 'border-gray-200 bg-gray-50 cursor-not-allowed' :
              motherFile ? 'border-purple-400 bg-purple-50' : 'border-gray-300 hover:border-purple-400 hover:bg-purple-50'
            }`}
          >
            {motherPreview ? (
              <img src={motherPreview} alt="Mother Certificate" className="max-h-40 mx-auto rounded-lg object-contain" />
            ) : motherFile ? (
              <div className="flex items-center justify-center gap-2 text-purple-600">
                <FileImage className="w-5 h-5" />
                <span className="font-medium">{motherFile.name}</span>
              </div>
            ) : (
              <div>
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 font-medium text-sm">Click to upload mother's income certificate</p>
                <p className="text-gray-400 text-xs mt-1">JPG, PNG, PDF — max 10MB</p>
              </div>
            )}
          </div>
          <input ref={motherInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleMotherFile} />
        </div>

        {/* Document 2: Father's Income Certificate */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            📄 Father's Income Certificate <span className="text-red-500">*</span>
          </label>
          <div
            onClick={() => !loading && fatherInputRef.current.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
              loading ? 'border-gray-200 bg-gray-50 cursor-not-allowed' :
              fatherFile ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-green-400 hover:bg-green-50'
            }`}
          >
            {fatherPreview ? (
              <img src={fatherPreview} alt="Father Certificate" className="max-h-40 mx-auto rounded-lg object-contain" />
            ) : fatherFile ? (
              <div className="flex items-center justify-center gap-2 text-green-600">
                <FileImage className="w-5 h-5" />
                <span className="font-medium">{fatherFile.name}</span>
              </div>
            ) : (
              <div>
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 font-medium text-sm">Click to upload father's income certificate</p>
                <p className="text-gray-400 text-xs mt-1">JPG, PNG, PDF — max 10MB</p>
              </div>
            )}
          </div>
          <input ref={fatherInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFatherFile} />
        </div>

        {/* Document 3: Report Card */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            📊 Report Card / Grades <span className="text-red-500">*</span>
          </label>
          <div
            onClick={() => !loading && reportInputRef.current.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
              loading ? 'border-gray-200 bg-gray-50 cursor-not-allowed' :
              reportFile ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
            }`}
          >
            {reportPreview ? (
              <img src={reportPreview} alt="Report Card" className="max-h-40 mx-auto rounded-lg object-contain" />
            ) : reportFile ? (
              <div className="flex items-center justify-center gap-2 text-blue-600">
                <FileImage className="w-5 h-5" />
                <span className="font-medium">{reportFile.name}</span>
              </div>
            ) : (
              <div>
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 font-medium text-sm">Click to upload report card</p>
                <p className="text-gray-400 text-xs mt-1">JPG, PNG, PDF — max 10MB</p>
              </div>
            )}
          </div>
          <input ref={reportInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleReportFile} />
        </div>

        {/* Status indicator */}
        {loading && (
          <div className="mt-4 bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm text-gray-700">{STAGES[stage]}</span>
            </div>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!motherIncome || !fatherIncome || !motherFile || !fatherFile || !reportFile || loading}
          className="mt-6 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 rounded-xl transition-colors"
        >
          {loading ? 'Processing...' : 'Submit Application'}
        </button>
      </div>
    </div>
  );
}