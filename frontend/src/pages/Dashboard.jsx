import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { PlusCircle, LogOut, FileText, CheckCircle, XCircle, Clock } from 'lucide-react';

const STATUS_CONFIG = {
  qualified:     { icon: <CheckCircle className="w-4 h-4" />, color: 'text-green-600 bg-green-50',  label: 'Qualified'     },
  disqualified:  { icon: <XCircle    className="w-4 h-4" />, color: 'text-red-600 bg-red-50',     label: 'Disqualified'  },
  manual_review: { icon: <Clock      className="w-4 h-4" />, color: 'text-yellow-600 bg-yellow-50',label: 'Under Review'  },
  pending:       { icon: <Clock      className="w-4 h-4" />, color: 'text-gray-600 bg-gray-50',   label: 'Pending'       },
};

export default function Dashboard() {
  const { user, logout }       = useAuth();
  const [apps, setApps]        = useState([]);
  const [loading, setLoading]  = useState(true);
  const navigate               = useNavigate();

  useEffect(() => {
    api.get('/applications/my')
      .then(r => setApps(r.data.applications))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎓</span>
          <span className="font-bold text-gray-800">Scholar Portal</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">Hello, <strong>{user?.full_name}</strong></span>
          <button onClick={handleLogout} className="flex items-center gap-1 text-sm text-red-500 hover:text-red-700">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">My Applications</h1>
            <p className="text-gray-500 mt-1">Track your scholarship application status</p>
          </div>
          <Link to="/apply"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <PlusCircle className="w-4 h-4" /> New Application
          </Link>
        </div>

        {/* Applications List */}
        {loading ? (
          <p className="text-center text-gray-400 py-20">Loading...</p>
        ) : apps.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No applications yet</p>
            <Link to="/apply" className="text-blue-600 font-medium mt-2 inline-block hover:underline">
              Submit your first application →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {apps.map(app => {
              const cfg = STATUS_CONFIG[app.status] || STATUS_CONFIG.pending;
              return (
                <div key={app.id} className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between hover:shadow-md transition-shadow">
                  <div>
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${cfg.color}`}>
                      {cfg.icon} {cfg.label}
                    </div>
                    <p className="text-gray-500 text-sm mt-2">
                      Submitted: {new Date(app.submitted_at).toLocaleDateString()}
                    </p>
                    {app.confidence_score < 70 && (
                      <p className="text-yellow-600 text-xs mt-1">⚠️ Low AI confidence — manual review may apply</p>
                    )}
                  </div>
                  <Link to={`/result/${app.id}`}
                    className="text-blue-600 text-sm font-medium hover:underline"
                  >View Details →</Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}