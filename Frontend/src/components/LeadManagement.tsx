import { useState, useEffect } from 'react';
import {
    Search,
    TrendingUp,
    AlertCircle,
    CheckCircle2,
    XCircle,
    Calculator,
    Zap,
    BookOpen
} from 'lucide-react';
import { apiService, type Lead, type LeadInput, type MatchResults } from '../services/api';

export default function LeadManagement() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterScore, setFilterScore] = useState<'all' | 'high' | 'medium' | 'low'>('all');

    // Calculator Modal State
    const [showScoreModal, setShowScoreModal] = useState(false);
    const [scoringLead, setScoringLead] = useState<LeadInput>({
        quote_value: 0,
        item_count: 0,
        conversion_days: 0,
    });
    const [scoreResult, setScoreResult] = useState<{ lead_score: number; conversion_probability: number } | null>(null);

    // Use Case Match Modal State
    const [showMatchModal, setShowMatchModal] = useState(false);
    const [matchResult, setMatchResult] = useState<MatchResults | null>(null);
    const [matchingLeadName, setMatchingLeadName] = useState('');

    useEffect(() => {
        loadLeads();
    }, []);

    useEffect(() => {
        filterLeads();
    }, [searchTerm, filterScore, leads]);

    const loadLeads = async () => {
        try {
            const data = await apiService.getLeads();
            if (Array.isArray(data)) {
                setLeads(data);
                setFilteredLeads(data);
            } else {
                console.error("API returned non-array data:", data);
                setLeads([]);
                setFilteredLeads([]);
            }
        } catch (error) {
            console.error('Error loading leads:', error);
        } finally {
            setLoading(false);
        }
    };



    const filterLeads = () => {
        let filtered = leads;

        if (searchTerm) {
            filtered = filtered.filter(lead =>
                lead.company_name.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (filterScore !== 'all') {
            filtered = filtered.filter(lead => {
                const score = lead.lead_score || 0;
                if (filterScore === 'high') return score > 0.7;
                if (filterScore === 'medium') return score >= 0.4 && score <= 0.7;
                if (filterScore === 'low') return score < 0.4;
                return true;
            });
        }

        setFilteredLeads(filtered);
    };

    const handleScoreLead = async () => {
        try {
            const result = await apiService.predictLeadScore(scoringLead);
            setScoreResult(result);
        } catch (error) {
            console.error('Error scoring lead:', error);
            alert('Failed to score lead. Please try again.');
        }
    };

    const handleMatchUseCase = async (lead: Lead) => {
        try {
            setMatchingLeadName(lead.company_name);
            const result = await apiService.matchUseCase({
                quote_value: lead.quote_value,
                item_count: lead.item_count,
                conversion_days: lead.conversion_days,
                company_name: lead.company_name
            });
            setMatchResult(result);
            setShowMatchModal(true);
        } catch (error) {
            console.error('Error matching use case:', error);
            alert('Failed to match use case.');
        }
    };

    const getScoreBadge = (score: number) => {
        if (score > 0.7) return <span className="badge badge-success"><CheckCircle2 className="w-4 h-4" />High</span>;
        if (score >= 0.4) return <span className="badge badge-warning"><AlertCircle className="w-4 h-4" />Medium</span>;
        return <span className="badge badge-danger"><XCircle className="w-4 h-4" />Low</span>;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="glass rounded-2xl p-8">
                <h1 className="text-4xl font-bold gradient-text mb-2">Lead Management</h1>
                <p className="text-gray-600">AI-powered lead scoring and strategic segmentation</p>
            </div>

            <div className="card">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search companies..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input pl-10"
                        />
                    </div>

                    <div className="flex gap-2">
                        <select
                            value={filterScore}
                            onChange={(e) => setFilterScore(e.target.value as any)}
                            className="input"
                        >
                            <option value="all">All Scores</option>
                            <option value="high">High (&gt;0.7)</option>
                            <option value="medium">Medium (0.4-0.7</option>
                            <option value="low">Low (&lt;0.4)</option>
                        </select>

                        <button
                            onClick={() => setShowScoreModal(true)}
                            className="btn btn-primary flex items-center gap-2 whitespace-nowrap"
                        >
                            <Calculator className="w-5 h-5" />
                            Score New Lead
                        </button>
                    </div>
                </div>

                <div className="mt-4 text-sm text-gray-600">
                    Showing {filteredLeads.length} of {leads.length} leads
                </div>
            </div>

            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Company</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Industry / Segment</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Quote Value</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Score</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredLeads.map((lead, index) => (
                                <tr key={index} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="font-semibold text-gray-900">{lead.company_name}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-gray-800">{lead.industry || 'Unknown'}</span>
                                            <span className="text-xs text-gray-500">{lead.segment || 'General'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-gray-900 font-medium">${(lead.quote_value || 0).toLocaleString()}</div>
                                        <div className="text-xs text-gray-500">{lead.item_count || 0} items</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {getScoreBadge(lead.lead_score || 0)}
                                        <div className="text-xs text-gray-500 mt-1">{((lead.lead_score || 0) * 100).toFixed(0)}%</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <button
                                            onClick={() => handleMatchUseCase(lead)}
                                            className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
                                        >
                                            <Zap className="w-3 h-3" /> Match AI Solution
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Score Modal */}
            {showScoreModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="card max-w-2xl w-full animate-slide-up">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold gradient-text">AI Lead Scoring Calculator</h2>
                            <button
                                onClick={() => {
                                    setShowScoreModal(false);
                                    setScoreResult(null);
                                }}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>
                        {/* Existing Calculator Form Logic Here - Simplified for brevity */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Quote Value ($)</label>
                                <input
                                    type="number"
                                    value={scoringLead.quote_value || ''}
                                    onChange={(e) => setScoringLead({ ...scoringLead, quote_value: parseFloat(e.target.value) || 0 })}
                                    className="input"
                                    placeholder="e.g., 50000"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Number of Items</label>
                                <input
                                    type="number"
                                    value={scoringLead.item_count || ''}
                                    onChange={(e) => setScoringLead({ ...scoringLead, item_count: parseInt(e.target.value) || 0 })}
                                    className="input"
                                    placeholder="e.g., 5"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Conversion Days</label>
                                <input
                                    type="number"
                                    value={scoringLead.conversion_days || ''}
                                    onChange={(e) => setScoringLead({ ...scoringLead, conversion_days: parseInt(e.target.value) || 0 })}
                                    className="input"
                                    placeholder="e.g., 30"
                                />
                            </div>
                            <button
                                onClick={handleScoreLead}
                                className="btn btn-primary w-full flex items-center justify-center gap-2"
                            >
                                <TrendingUp className="w-5 h-5" />
                                Calculate Lead Score
                            </button>

                            {scoreResult && (
                                <div className="mt-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl animate-slide-up">
                                    <h3 className="text-xl font-bold mb-4 text-blue-900 flex items-center gap-2">
                                        <Zap className="w-5 h-5 text-yellow-500" /> 
                                        Prediction Results
                                    </h3>
                                    
                                    {/* Main Scores */}
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div className="text-center p-5 bg-gradient-to-br from-primary-600 to-indigo-700 rounded-xl text-white shadow-lg">
                                            <div className="text-sm font-semibold opacity-90 mb-1 uppercase tracking-wider">Lead Score</div>
                                            <div className="text-4xl font-extrabold">{(scoreResult.lead_score * 100).toFixed(1)}</div>
                                            <div className="text-xs opacity-75 mt-1">/ 100 maximum limit</div>
                                        </div>
                                        <div className="text-center p-5 bg-gradient-to-br from-emerald-500 to-teal-700 rounded-xl text-white shadow-lg">
                                            <div className="text-sm font-semibold opacity-90 mb-1 uppercase tracking-wider">Conversion Prob.</div>
                                            <div className="text-4xl font-extrabold">{(scoreResult.conversion_probability * 100).toFixed(1)}%</div>
                                            <div className="text-xs opacity-75 mt-1">AI calculated likelihood</div>
                                        </div>
                                    </div>

                                    {/* Detailed Metrics Grid */}
                                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                                        <div className="bg-white p-3 rounded-lg border border-gray-200">
                                            <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Expected Revenue</div>
                                            <div className="font-bold text-gray-900 text-lg">
                                                ${(scoringLead.quote_value * scoreResult.conversion_probability).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                            </div>
                                        </div>
                                        <div className="bg-white p-3 rounded-lg border border-gray-200">
                                            <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Complexity Factor</div>
                                            <div className="font-bold text-gray-900 text-lg">
                                                {scoringLead.item_count > 20 ? 'High' : scoringLead.item_count > 5 ? 'Medium' : 'Low'}
                                            </div>
                                        </div>
                                        <div className="bg-white p-3 rounded-lg border border-gray-200">
                                            <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Est. Time to Close</div>
                                            <div className="font-bold text-gray-900 text-lg">
                                                {scoringLead.conversion_days} Days
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Use Case Match Modal */}
            {showMatchModal && matchResult && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full animate-slide-up overflow-hidden">
                        <div className="p-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-2xl font-bold flex items-center gap-2">
                                        <Zap className="w-6 h-6 text-yellow-300" />
                                        AI Solution Match
                                    </h2>
                                    <p className="text-blue-100 mt-1">
                                        Recommended strategy for <span className="font-bold">{matchingLeadName}</span>
                                    </p>
                                </div>
                                <button onClick={() => setShowMatchModal(false)} className="text-white/80 hover:text-white">
                                    <XCircle className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        <div className="p-8">
                            <div className="grid grid-cols-3 gap-6 mb-8">
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <div className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Verified Industry</div>
                                    <div className="text-lg font-bold text-gray-800">{matchResult.industry_detected}</div>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <div className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Maturity Level</div>
                                    <div className="text-lg font-bold text-gray-800">{matchResult.maturity_level}</div>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <div className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Strategic Segment</div>
                                    <div className="text-lg font-bold text-blue-600">{matchResult.segment_assigned}</div>
                                </div>
                            </div>

                            <div className="border border-blue-100 bg-blue-50/50 rounded-xl p-6 mb-6">
                                <h3 className="text-lg font-bold text-blue-900 mb-3 flex items-center gap-2">
                                    <BookOpen className="w-5 h-5" />
                                    Recommended Use Case: {matchResult.recommended_use_case.title}
                                </h3>
                                <p className="text-gray-700 mb-4">
                                    {matchResult.recommended_use_case.description}
                                </p>

                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-900 mb-2">Pain Points Addressed:</h4>
                                        <ul className="space-y-1">
                                            {matchResult.recommended_use_case.pain_points.map((point, i) => (
                                                <li key={i} className="flex items-start text-sm text-gray-600">
                                                    <span className="text-red-500 mr-2">•</span> {point}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-900 mb-2">Success Metrics:</h4>
                                        <div className="bg-white p-3 rounded-lg border border-blue-100 text-sm font-medium text-green-700 flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4" />
                                            {matchResult.recommended_use_case.success_metrics}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setShowMatchModal(false)}
                                    className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    Close
                                </button>
                                <button className="btn btn-primary flex items-center gap-2">
                                    <Zap className="w-4 h-4" />
                                    Generate Personalized Strategy
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
