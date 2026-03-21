import { useState, useEffect, useCallback } from 'react';
import {
    Mail,
    Send,
    Sparkles,
    User,
    AtSign,
    DollarSign,
    Package,
    Target,
    CheckCircle,
    Loader,
    Copy,
    Clock,
    CalendarClock,
    XCircle,
    Zap,
    RefreshCw,
    AlertCircle,
    Trash2,
} from 'lucide-react';
import { apiService, type Lead, type ScheduledEmail } from '../services/api';

// ─── helpers ────────────────────────────────────────────────────────────────

/** Convert a local datetime-local string to a UTC ISO string */
function localToUtcIso(localDt: string): string {
    return new Date(localDt).toISOString();
}

/** Min datetime value for the picker (now, rounded up 1 min) */
function minDatetime(): string {
    const d = new Date();
    d.setSeconds(0, 0);
    d.setMinutes(d.getMinutes() + 1);
    // datetime-local needs YYYY-MM-DDTHH:mm
    return d.toISOString().slice(0, 16);
}

function formatLocalTime(isoUtc: string): string {
    return new Date(isoUtc).toLocaleString();
}

const STATUS_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
    pending:   { label: '⏳ Pending',   color: 'text-blue-700',  bg: 'bg-blue-50',   border: 'border-blue-200'  },
    sent:      { label: '✅ Sent',      color: 'text-green-700', bg: 'bg-green-50',  border: 'border-green-200' },
    failed:    { label: '❌ Failed',    color: 'text-red-700',   bg: 'bg-red-50',    border: 'border-red-200'   },
    cancelled: { label: '🚫 Cancelled', color: 'text-gray-500',  bg: 'bg-gray-50',   border: 'border-gray-200'  },
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function EmailCampaign() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [customerName, setCustomerName] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    const [subject, setSubject] = useState('Exclusive IT Solutions for Your Business');
    const [leadScore, setLeadScore] = useState(0.8);
    const [quoteValue, setQuoteValue] = useState(0);
    const [itemCount, setItemCount] = useState(0);
    const [generatedEmail, setGeneratedEmail] = useState('');
    const [generating, setGenerating] = useState(false);

    // Schedule state
    const [scheduledAt, setScheduledAt] = useState(minDatetime());
    const [scheduling, setScheduling] = useState(false);
    const [scheduleSuccess, setScheduleSuccess] = useState(false);
    const [scheduleError, setScheduleError] = useState<string | null>(null);

    // Send Now state
    const [sendingNow, setSendingNow] = useState(false);
    const [sendNowSuccess, setSendNowSuccess] = useState(false);

    // Scheduled queue
    const [scheduledJobs, setScheduledJobs] = useState<ScheduledEmail[]>([]);
    const [loadingJobs, setLoadingJobs] = useState(false);
    const [actioningId, setActioningId] = useState<string | null>(null);

    useEffect(() => { loadLeads(); loadScheduledJobs(); }, []);

    const loadLeads = async () => {
        try {
            const data = await apiService.getLeads();
            setLeads(data.filter(l => (l.lead_score || 0) > 0.6));
        } catch (e) { console.error('Error loading leads:', e); }
    };

    const loadScheduledJobs = useCallback(async () => {
        setLoadingJobs(true);
        try {
            const jobs = await apiService.getScheduledEmails();
            setScheduledJobs(jobs);
        } catch (e) { console.error('Error loading scheduled jobs:', e); }
        finally { setLoadingJobs(false); }
    }, []);

    const handleLeadSelect = (lead: Lead) => {
        setSelectedLead(lead);
        setCustomerName(lead.company_name);
        setLeadScore(lead.lead_score || 0.8);
        setQuoteValue(lead.quote_value);
        setItemCount(lead.item_count);
    };

    const handleGenerateEmail = async () => {
        if (!customerName || quoteValue === 0 || itemCount === 0) {
            alert('Please fill in Customer Name, Quote Value and Number of Items');
            return;
        }
        setGenerating(true);
        try {
            const result = await apiService.generateEmail({
                customer_name: customerName,
                lead_score: leadScore,
                quote_value: quoteValue,
                item_count: itemCount,
            });
            setGeneratedEmail(result.email_body);
        } catch (e) {
            console.error('Error generating email:', e);
        } finally {
            setGenerating(false);
        }
    };

    const handleScheduleEmail = async () => {
        if (!customerEmail || !generatedEmail) {
            setScheduleError('Please generate an email and provide a recipient email address first.');
            return;
        }
        setScheduling(true);
        setScheduleError(null);
        setScheduleSuccess(false);
        try {
            await apiService.scheduleEmail({
                customer_name: customerName,
                customer_email: customerEmail,
                subject,
                lead_score: leadScore,
                quote_value: quoteValue,
                item_count: itemCount,
                scheduled_at: localToUtcIso(scheduledAt),
            });
            setScheduleSuccess(true);
            setTimeout(() => setScheduleSuccess(false), 5000);
            await loadScheduledJobs();
        } catch (e: any) {
            setScheduleError(e?.response?.data?.detail || 'Failed to schedule email. Please try again.');
        } finally {
            setScheduling(false);
        }
    };

    const handleSendNow = async () => {
        if (!customerEmail || !generatedEmail) {
            alert('Please generate an email and provide a recipient email address first.');
            return;
        }
        setSendingNow(true);
        setSendNowSuccess(false);
        try {
            const result = await apiService.sendEmail({
                customer_name: customerName,
                customer_email: customerEmail,
                lead_score: leadScore,
                quote_value: quoteValue,
                item_count: itemCount,
                subject,
            });
            if (result.success) {
                setSendNowSuccess(true);
                setTimeout(() => setSendNowSuccess(false), 5000);
            } else {
                alert('Failed to send: ' + result.message);
            }
        } catch (e) {
            console.error(e);
            alert('Failed to send email. Please try again.');
        } finally {
            setSendingNow(false);
        }
    };

    const handleCancel = async (jobId: string) => {
        setActioningId(jobId);
        try {
            await apiService.cancelScheduledEmail(jobId);
            await loadScheduledJobs();
        } catch (e) { console.error(e); }
        finally { setActioningId(null); }
    };

    const handleSendJobNow = async (jobId: string) => {
        setActioningId(jobId);
        try {
            await apiService.sendScheduledEmailNow(jobId);
            await loadScheduledJobs();
        } catch (e: any) {
            alert(e?.response?.data?.detail || 'Failed to send now.');
        } finally { setActioningId(null); }
    };

    const copyToClipboard = () => navigator.clipboard.writeText(generatedEmail);

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="glass rounded-2xl p-8">
                <h1 className="text-4xl font-bold gradient-text mb-2">Email Campaign Scheduler</h1>
                <p className="text-gray-600">
                    AI-powered email generation with scheduled delivery — queue emails in advance or send instantly.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Lead Selection */}
                <div className="card">
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <Target className="w-6 h-6 text-primary-500" />
                        Select High-Value Lead
                    </h3>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {leads.map((lead, index) => (
                            <div
                                key={index}
                                onClick={() => handleLeadSelect(lead)}
                                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${selectedLead === lead
                                    ? 'border-primary-500 bg-primary-50'
                                    : 'border-gray-200 hover:border-primary-300'
                                    }`}
                            >
                                <div className="font-semibold text-gray-900">{lead.company_name}</div>
                                <div className="text-sm text-gray-600 mt-1">
                                    Score: {((lead.lead_score || 0) * 100).toFixed(1)}%
                                </div>
                                <div className="text-sm text-gray-600">
                                    Value: ${lead.quote_value.toLocaleString()}
                                </div>
                            </div>
                        ))}
                        {leads.length === 0 && (
                            <div className="text-center text-gray-500 py-8">No high-value leads available</div>
                        )}
                    </div>
                </div>

                {/* Email Configuration */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="card">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <Sparkles className="w-6 h-6 text-primary-500" />
                            Campaign Details
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    <User className="inline w-4 h-4 mr-1" />Customer Name
                                </label>
                                <input type="text" value={customerName}
                                    onChange={e => setCustomerName(e.target.value)}
                                    className="input" placeholder="Enter customer name" />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    <AtSign className="inline w-4 h-4 mr-1" />Customer Email
                                </label>
                                <input type="email" value={customerEmail}
                                    onChange={e => setCustomerEmail(e.target.value)}
                                    className="input" placeholder="customer@company.com" />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    <DollarSign className="inline w-4 h-4 mr-1" />Quote Value ($)
                                </label>
                                <input type="number" value={quoteValue || ''}
                                    onChange={e => setQuoteValue(parseFloat(e.target.value) || 0)}
                                    className="input" placeholder="50000" />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    <Package className="inline w-4 h-4 mr-1" />Number of Items
                                </label>
                                <input type="number" value={itemCount || ''}
                                    onChange={e => setItemCount(parseInt(e.target.value) || 0)}
                                    className="input" placeholder="5" />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    <Mail className="inline w-4 h-4 mr-1" />Email Subject
                                </label>
                                <input type="text" value={subject}
                                    onChange={e => setSubject(e.target.value)}
                                    className="input" placeholder="Email subject line" />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    <Target className="inline w-4 h-4 mr-1" />
                                    Lead Score: {(leadScore * 100).toFixed(1)}%
                                </label>
                                <input type="range" min="0" max="1" step="0.01"
                                    value={leadScore}
                                    onChange={e => setLeadScore(parseFloat(e.target.value))}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-500" />
                            </div>
                        </div>

                        <button onClick={handleGenerateEmail} disabled={generating}
                            className="btn btn-primary w-full mt-6 flex items-center justify-center gap-2">
                            {generating ? (
                                <><Loader className="w-5 h-5 animate-spin" />Generating with AI...</>
                            ) : (
                                <><Sparkles className="w-5 h-5" />Generate AI-Powered Email</>
                            )}
                        </button>
                    </div>

                    {/* Generated Email + delivery options */}
                    {generatedEmail && (
                        <div className="card animate-slide-up">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold flex items-center gap-2">
                                    <Mail className="w-6 h-6 text-primary-500" />Generated Email
                                </h3>
                                <button onClick={copyToClipboard} className="btn btn-outline flex items-center gap-2">
                                    <Copy className="w-4 h-4" />Copy
                                </button>
                            </div>

                            <div className="bg-gray-50 rounded-lg p-6 border-2 border-gray-200">
                                <div className="mb-4 pb-4 border-b border-gray-300">
                                    <div className="text-sm text-gray-600 mb-1">Subject:</div>
                                    <div className="font-semibold">{subject}</div>
                                </div>
                                <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">{generatedEmail}</div>
                            </div>

                            {/* ── Delivery Options ── */}
                            <div className="mt-6 border-t border-gray-100 pt-6 space-y-4">
                                <h4 className="font-bold text-gray-800 flex items-center gap-2">
                                    <Send className="w-5 h-5 text-primary-500" />Delivery Options
                                </h4>

                                {/* Schedule row */}
                                <div className="flex flex-col md:flex-row gap-3 items-end p-4 rounded-xl border-2 border-blue-100 bg-blue-50">
                                    <div className="flex-1">
                                        <label className="block text-sm font-semibold text-blue-800 mb-1">
                                            <CalendarClock className="inline w-4 h-4 mr-1" />Schedule Delivery
                                        </label>
                                        <input
                                            type="datetime-local"
                                            value={scheduledAt}
                                            min={minDatetime()}
                                            onChange={e => setScheduledAt(e.target.value)}
                                            className="input text-sm"
                                        />
                                        <p className="text-xs text-blue-600 mt-1">
                                            Will be dispatched automatically by the AI scheduler.
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleScheduleEmail}
                                        disabled={scheduling}
                                        className="btn flex items-center gap-2 whitespace-nowrap disabled:opacity-70"
                                        style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)', color: 'white' }}
                                    >
                                        {scheduling ? (
                                            <><Loader className="w-4 h-4 animate-spin" />Scheduling...</>
                                        ) : (
                                            <><CalendarClock className="w-4 h-4" />Schedule Email</>
                                        )}
                                    </button>
                                </div>

                                {/* Send Now row */}
                                <div className="flex items-center gap-3 p-4 rounded-xl border-2 border-gray-100 bg-gray-50">
                                    <div className="flex-1">
                                        <span className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                                            <Zap className="w-4 h-4 text-yellow-500" />Send Immediately
                                        </span>
                                        <p className="text-xs text-gray-500 mt-0.5">Bypass the scheduler — send right now.</p>
                                    </div>
                                    <button
                                        onClick={handleSendNow}
                                        disabled={sendingNow}
                                        className="btn btn-success flex items-center gap-2 whitespace-nowrap disabled:opacity-70"
                                    >
                                        {sendingNow ? (
                                            <><Loader className="w-4 h-4 animate-spin" />Sending...</>
                                        ) : (
                                            <><Send className="w-4 h-4" />Send Now</>
                                        )}
                                    </button>
                                </div>

                                {/* Feedback messages */}
                                {scheduleError && (
                                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 animate-slide-up">
                                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                        <p className="text-sm text-red-700">{scheduleError}</p>
                                    </div>
                                )}
                                {scheduleSuccess && (
                                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3 animate-slide-up">
                                        <CheckCircle className="w-5 h-5 text-blue-600" />
                                        <div>
                                            <div className="font-semibold text-blue-900">Email Scheduled!</div>
                                            <div className="text-sm text-blue-700">
                                                Will be sent on {formatLocalTime(localToUtcIso(scheduledAt))}. Check the queue below.
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {sendNowSuccess && (
                                    <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3 animate-slide-up">
                                        <CheckCircle className="w-5 h-5 text-green-600" />
                                        <div>
                                            <div className="font-semibold text-green-900">Email Sent!</div>
                                            <div className="text-sm text-green-700">Delivered to {customerEmail}</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Scheduled Email Queue ── */}
            <div className="card">
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        <Clock className="w-6 h-6 text-primary-500" />
                        Scheduled Email Queue
                        {scheduledJobs.length > 0 && (
                            <span className="ml-2 px-2 py-0.5 text-xs font-bold bg-primary-100 text-primary-700 rounded-full">
                                {scheduledJobs.filter(j => j.status === 'pending').length} pending
                            </span>
                        )}
                    </h3>
                    <button
                        onClick={loadScheduledJobs}
                        disabled={loadingJobs}
                        className="btn btn-outline flex items-center gap-2 text-sm py-2 px-3"
                    >
                        <RefreshCw className={`w-4 h-4 ${loadingJobs ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>

                {scheduledJobs.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                        <CalendarClock className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="font-medium">No scheduled emails yet.</p>
                        <p className="text-sm">Generate an email above and choose a delivery time.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    {['Recipient', 'Subject', 'Scheduled For', 'Status', 'Actions'].map(h => (
                                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {scheduledJobs.map(job => {
                                    const meta = STATUS_META[job.status] || STATUS_META.pending;
                                    const acting = actioningId === job._id;
                                    return (
                                        <tr key={job._id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-gray-900">{job.customer_name}</div>
                                                <div className="text-xs text-gray-500">{job.customer_email}</div>
                                            </td>
                                            <td className="px-4 py-3 max-w-xs">
                                                <div className="truncate text-gray-700">{job.subject}</div>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                                                {formatLocalTime(job.scheduled_at)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${meta.bg} ${meta.color} ${meta.border}`}>
                                                    {meta.label}
                                                </span>
                                                {job.sent_at && (
                                                    <div className="text-xs text-gray-400 mt-1">
                                                        Sent: {formatLocalTime(job.sent_at)}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {job.status === 'pending' ? (
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleSendJobNow(job._id)}
                                                            disabled={acting}
                                                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg text-white disabled:opacity-60"
                                                            style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
                                                            title="Send immediately"
                                                        >
                                                            {acting ? <Loader className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                                                            Send Now
                                                        </button>
                                                        <button
                                                            onClick={() => handleCancel(job._id)}
                                                            disabled={acting}
                                                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 disabled:opacity-60"
                                                            title="Cancel"
                                                        >
                                                            {acting ? <Loader className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                                                            Cancel
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={async () => {
                                                                if (confirm("Are you sure you want to delete this record?")) {
                                                                    setActioningId(job._id);
                                                                    try {
                                                                        await apiService.deleteScheduledEmail(job._id);
                                                                        await loadScheduledJobs();
                                                                    } catch (e: any) {
                                                                        console.error(e);
                                                                        alert(e?.response?.data?.detail || 'Failed to delete record.');
                                                                    } finally {
                                                                        setActioningId(null);
                                                                    }
                                                                }
                                                            }}
                                                            disabled={acting}
                                                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white text-gray-500 border border-gray-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 disabled:opacity-60 transition-colors"
                                                            title="Delete Record"
                                                        >
                                                            {acting ? <Loader className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                                                            Delete
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FeatureCard
                    icon={<Sparkles className="w-8 h-8" />}
                    title="LLaMA 2 AI Generation"
                    description="Personalized email content generated by advanced language models"
                    gradient="from-purple-500 to-purple-700"
                />
                <FeatureCard
                    icon={<CalendarClock className="w-8 h-8" />}
                    title="Automated Scheduling"
                    description="Emails dispatched by the AI scheduler — fires every minute automatically"
                    gradient="from-blue-500 to-blue-700"
                />
                <FeatureCard
                    icon={<Zap className="w-8 h-8" />}
                    title="Instant Override"
                    description="Skip the queue — Send Now bypasses the scheduler for urgent outreach"
                    gradient="from-pink-500 to-pink-700"
                />
            </div>
        </div>
    );
}

interface FeatureCardProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    gradient: string;
}

function FeatureCard({ icon, title, description, gradient }: FeatureCardProps) {
    return (
        <div className="card">
            <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white mb-4`}>
                {icon}
            </div>
            <h4 className="text-lg font-bold mb-2">{title}</h4>
            <p className="text-sm text-gray-600">{description}</p>
        </div>
    );
}
