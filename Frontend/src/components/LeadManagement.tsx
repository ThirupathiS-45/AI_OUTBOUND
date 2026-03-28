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
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 sm:h-16 w-12 sm:w-16 border-t-4 border-b-4 border-primary-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-4 sm:space-y-6 animate-fade-in">
            <div className="glass rounded-lg sm:rounded-2xl p-4 sm:p-8">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold gradient-text mb-2">Lead Management</h1>
                <p className="text-sm sm:text-base text-gray-600">AI-powered lead scoring and strategic segmentation</p>
            </div>

            <div className="card">
                <div className="flex flex-col gap-3">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
                        <input
                            type="text"
                            placeholder="Search companies..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input pl-9 sm:pl-10 text-sm"
                        />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                        <select
                            value={filterScore}
                            onChange={(e) => setFilterScore(e.target.value as any)}
                            className="input text-sm"
                        >
                            <option value="all">All Scores</option>
                            <option value="high">High (&gt;0.7)</option>
                            <option value="medium">Medium (0.4-0.7)</option>
                            <option value="low">Low (&lt;0.4)</option>
                        </select>

                        <button
                            onClick={() => setShowScoreModal(true)}
                            className="btn btn-primary flex items-center justify-center sm:justify-start gap-2 whitespace-nowrap text-sm sm:text-base"
                        >
                            <Calculator className="w-4 h-4 sm:w-5 sm:h-5" />
                            <span>Score New Lead</span>
                        </button>
                    </div>
                </div>

                <div className="mt-3 sm:mt-4 text-xs sm:text-sm text-gray-600">
                    Showing {filteredLeads.length} of {leads.length} leads
                </div>
            </div>

            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-3 sm:px-6 py-2 sm:py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Company</th>
                                <th className="px-3 sm:px-6 py-2 sm:py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden sm:table-cell">Segment</th>
                                <th className="px-3 sm:px-6 py-2 sm:py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Value</th>
                                <th className="px-3 sm:px-6 py-2 sm:py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Score</th>
                                <th className="px-3 sm:px-6 py-2 sm:py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredLeads.map((lead, index) => (
                                <tr key={index} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                                        <div className="font-semibold text-gray-900 text-xs sm:text-base truncate">{lead.company_name}</div>
                                    </td>
                                    <td className="px-3 sm:px-6 py-2 sm:py-4 hidden sm:table-cell">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-gray-800">{lead.industry || 'Unknown'}</span>
                                            <span className="text-xs text-gray-500">{lead.segment || 'General'}</span>
                                        </div>
                                    </td>
                                    <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                                        <div className="text-gray-900 font-medium text-xs sm:text-base">${(lead.quote_value || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
                                        <div className="text-xs text-gray-500">{lead.item_count || 0} items</div>
                                    </td>
                                    <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                                        {getScoreBadge(lead.lead_score || 0)}
                                        <div className="text-xs text-gray-500 mt-1">{((lead.lead_score || 0) * 100).toFixed(0)}%</div>
                                    </td>
                                    <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                                        <button
                                            onClick={() => handleMatchUseCase(lead)}
                                            className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 bg-blue-50 px-2 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg hover:bg-blue-100 transition-colors"
                                        >
                                            <Zap className="w-3 h-3" />
                                            <span className="hidden sm:inline">Match</span>
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
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50 animate-fade-in overflow-y-auto">
                    <div className="card max-w-2xl w-full animate-slide-up my-8 sm:my-0">
                        <div className="flex items-center justify-between mb-4 sm:mb-6">
                            <h2 className="text-lg sm:text-2xl font-bold gradient-text">AI Lead Scoring Calculator</h2>
                            <button
                                onClick={() => {
                                    setShowScoreModal(false);
                                    setScoreResult(null);
                                }}
                                className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                            >
                                <XCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                            </button>
                        </div>
                        <div className="space-y-3 sm:space-y-4">
                            <div>
                                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">Quote Value ($)</label>
                                <input
                                    type="number"
                                    value={scoringLead.quote_value || ''}
                                    onChange={(e) => setScoringLead({ ...scoringLead, quote_value: parseFloat(e.target.value) || 0 })}
                                    className="input text-sm"
                                    placeholder="e.g., 50000"
                                />
                            </div>
                            <div>
                                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">Number of Items</label>
                                <input
                                    type="number"
                                    value={scoringLead.item_count || ''}
                                    onChange={(e) => setScoringLead({ ...scoringLead, item_count: parseInt(e.target.value) || 0 })}
                                    className="input text-sm"
                                    placeholder="e.g., 5"
                                />
                            </div>
                            <div>
                                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">Conversion Days</label>
                                <input
                                    type="number"
                                    value={scoringLead.conversion_days || ''}
                                    onChange={(e) => setScoringLead({ ...scoringLead, conversion_days: parseInt(e.target.value) || 0 })}
                                    className="input text-sm"
                                    placeholder="e.g., 30"
                                />
                            </div>
                            <button
                                onClick={handleScoreLead}
                                className="btn btn-primary w-full flex items-center justify-center gap-2 text-sm sm:text-base"
                            >
                                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
                                Calculate Lead Score
                            </button>

                            {scoreResult && (
                                <div className="mt-4 sm:mt-6 p-4 sm:p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-lg sm:rounded-xl animate-slide-up">
                                    <h3 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 text-blue-900 flex items-center gap-2">
                                        <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500 flex-shrink-0" /> 
                                        Prediction Results
                                    </h3>
                                    
                                    <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-3 sm:mb-4">
                                        <div className="text-center p-3 sm:p-5 bg-gradient-to-br from-primary-600 to-indigo-700 rounded-lg sm:rounded-xl text-white shadow-lg">
                                            <div className="text-xs sm:text-sm font-semibold opacity-90 mb-1 uppercase tracking-wider">Lead Score</div>
                                            <div className="text-2xl sm:text-4xl font-extrabold">{(scoreResult.lead_score * 100).toFixed(1)}</div>
                                            <div className="text-xs opacity-75 mt-1">/ 100 max</div>
                                        </div>
                                        <div className="text-center p-3 sm:p-5 bg-gradient-to-br from-emerald-500 to-teal-700 rounded-lg sm:rounded-xl text-white shadow-lg">
                                            <div className="text-xs sm:text-sm font-semibold opacity-90 mb-1 uppercase tracking-wider">Conv. Prob.</div>
                                            <div className="text-2xl sm:text-4xl font-extrabold">{(scoreResult.conversion_probability * 100).toFixed(1)}%</div>
                                            <div className="text-xs opacity-75 mt-1">AI calculated</div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        <div className="bg-white p-2 sm:p-3 rounded-lg border border-gray-200">
                                            <div className="text-xs text-gray-500 uppercase font-semibold mb-1 line-clamp-2">Revenue</div>
                                            <div className="font-bold text-gray-900 text-sm sm:text-lg">
                                                ${(scoringLead.quote_value * scoreResult.conversion_probability).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                            </div>
                                        </div>
                                        <div className="bg-white p-2 sm:p-3 rounded-lg border border-gray-200">
                                            <div className="text-xs text-gray-500 uppercase font-semibold mb-1 line-clamp-2">Complexity</div>
                                            <div className="font-bold text-gray-900 text-sm sm:text-lg">
                                                {scoringLead.item_count > 20 ? 'High' : scoringLead.item_count > 5 ? 'Med' : 'Low'}
                                            </div>
                                        </div>
                                        <div className="bg-white p-2 sm:p-3 rounded-lg border border-gray-200">
                                            <div className="text-xs text-gray-500 uppercase font-semibold mb-1 line-clamp-2">Est. Time</div>
                                            <div className="font-bold text-gray-900 text-sm sm:text-lg">
                                                {scoringLead.conversion_days}d
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
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50 animate-fade-in overflow-y-auto">
                    <div className="bg-white rounded-lg sm:rounded-2xl shadow-2xl max-w-3xl w-full animate-slide-up my-8 sm:my-0 overflow-hidden">
                        <div className="p-4 sm:p-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                            <div className="flex justify-between items-start gap-2">
                                <div className="min-w-0">
                                    <h2 className="text-lg sm:text-2xl font-bold flex items-center gap-2">
                                        <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-300 flex-shrink-0" />
                                        <span className="truncate">AI Solution Match</span>
                                    </h2>
                                    <p className="text-blue-100 mt-1 text-xs sm:text-base">
                                        Recommended strategy for <span className="font-bold truncate">{matchingLeadName}</span>
                                    </p>
                                </div>
                                <button onClick={() => setShowMatchModal(false)} className="text-white/80 hover:text-white flex-shrink-0">
                                    <XCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                                </button>
                            </div>
                        </div>

                        <div className="p-4 sm:p-8 overflow-y-auto max-h-[calc(100vh-200px)] sm:max-h-[calc(100vh-300px)]">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6 mb-6 sm:mb-8">
                                <div className="bg-gray-50 p-3 sm:p-4 rounded-lg sm:rounded-xl border border-gray-100">
                                    <div className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Verified Industry</div>
                                    <div className="text-base sm:text-lg font-bold text-gray-800 truncate">{matchResult.industry_detected}</div>
                                </div>
                                <div className="bg-gray-50 p-3 sm:p-4 rounded-lg sm:rounded-xl border border-gray-100">
                                    <div className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Maturity Level</div>
                                    <div className="text-base sm:text-lg font-bold text-gray-800">{matchResult.maturity_level}</div>
                                </div>
                                <div className="bg-gray-50 p-3 sm:p-4 rounded-lg sm:rounded-xl border border-gray-100">
                                    <div className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Strategic Segment</div>
                                    <div className="text-base sm:text-lg font-bold text-blue-600 truncate">{matchResult.segment_assigned}</div>
                                </div>
                            </div>

                            <div className="border border-blue-100 bg-blue-50/50 rounded-lg sm:rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
                                <h3 className="text-base sm:text-lg font-bold text-blue-900 mb-2 sm:mb-3 flex items-center gap-2">
                                    <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                                    <span className="truncate">Recommended: {matchResult.recommended_use_case.title}</span>
                                </h3>
                                <p className="text-sm sm:text-base text-gray-700 mb-3 sm:mb-4">
                                    {matchResult.recommended_use_case.description}
                                </p>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                    <div>
                                        <h4 className="text-xs sm:text-sm font-bold text-gray-900 mb-2">Pain Points Addressed:</h4>
                                        <ul className="space-y-1">
                                            {matchResult.recommended_use_case.pain_points.map((point, i) => (
                                                <li key={i} className="flex items-start text-xs sm:text-sm text-gray-600 gap-2">
                                                    <span className="text-red-500 flex-shrink-0">•</span> 
                                                    <span className="line-clamp-2">{point}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div>
                                        <h4 className="text-xs sm:text-sm font-bold text-gray-900 mb-2">Success Metrics:</h4>
                                        <div className="bg-white p-2 sm:p-3 rounded-lg border border-blue-100 text-xs sm:text-sm font-medium text-green-700 flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                                            <span className="line-clamp-3">{matchResult.recommended_use_case.success_metrics}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
                                <button
                                    onClick={() => setShowMatchModal(false)}
                                    className="px-3 sm:px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors text-sm sm:text-base"
                                >
                                    Close
                                </button>
                                <button className="btn btn-primary flex items-center justify-center gap-2 text-sm sm:text-base">
                                    <Zap className="w-4 h-4 flex-shrink-0" />
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
