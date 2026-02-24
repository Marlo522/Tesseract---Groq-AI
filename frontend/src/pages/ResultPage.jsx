import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { CheckCircle, XCircle, AlertTriangle, ArrowLeft, TrendingUp } from 'lucide-react';

export default function ResultPage() {
  const { id }                = useParams();
  const navigate              = useNavigate();
  const [app, setApp]         = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/applications/${id}`)
      .then(r => setApp(r.data.application))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex items-center justify-center h-screen text-gray-400">Loading...</div>;
  if (!app)    return <div className="flex items-center justify-center h-screen text-gray-400">Not found.</div>;

  const ev        = app.evaluation_result;
  const data      = ev?.extracted_data || {};
  const evalItems = ev?.evaluation || {};
  const reasons   = ev?.disqualification_reasons || [];
  const score     = ev?.confidence_score ?? 0;
  const qualified = app.qualified;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-6 py-10">

        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>

        {/* Result Banner */}
        <div className={`rounded-2xl p-6 mb-6 flex items-center gap-4 ${qualified ? 'bg-green-500' : 'bg-red-500'} text-white`}>
          {qualified
            ? <CheckCircle className="w-10 h-10 flex-shrink-0" />
            : <XCircle    className="w-10 h-10 flex-shrink-0" />}
          <div>
            <h1 className="text-2xl font-bold">
              {qualified ? '🎉 Congratulations! You Qualify' : 'Application Not Qualified'}
            </h1>
            <p className="opacity-80 text-sm mt-1">
              AI Confidence Score: <strong>{score}%</strong>
              {score < 70 && ' — Flagged for manual review'}
            </p>
          </div>
        </div>

        {/* Low confidence warning */}
        {score < 70 && (
          <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-4 mb-6 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-yellow-800">Low Confidence Score</p>
              <p className="text-sm text-yellow-700 mt-1">
                The document scan quality may be poor. An administrator will manually review your application.
              </p>
            </div>
          </div>
        )}

        {/* Evaluation Criteria */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> Criteria Evaluation
          </h2>
          <div className="space-y-3">
            {Object.entries(evalItems).map(([key, check]) => (
              <div key={key} className={`p-3 rounded-lg border ${check.passed ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                <div className="flex items-center gap-2">
                  {check.passed
                    ? <CheckCircle className="w-4 h-4 text-green-600" />
                    : <XCircle    className="w-4 h-4 text-red-600" />}
                  <span className={`text-sm font-medium ${check.passed ? 'text-green-700' : 'text-red-700'}`}>
                    {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                </div>
                <p className={`text-xs mt-1 ml-6 ${check.passed ? 'text-green-600' : 'text-red-600'}`}>{check.reason}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Disqualification reasons */}
        {!qualified && reasons.length > 0 && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-5">
            <h3 className="font-semibold text-red-800 mb-3">Reasons for Disqualification</h3>
            <ul className="space-y-2">
              {reasons.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-red-700">
                  <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {r}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* AI Notes */}
        {ev?.notes && (
          <div className="mt-6 bg-gray-50 border border-gray-200 rounded-xl p-5">
            <h3 className="font-semibold text-gray-700 mb-2">📝 AI Notes</h3>
            <p className="text-sm text-gray-600">{ev.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}