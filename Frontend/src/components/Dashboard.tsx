import { useState, useEffect } from 'react';
import {
    Users,
    Mail,
    TrendingUp,
    Target,
    Activity,
    DollarSign,
    Send
} from 'lucide-react';
import { apiService, type Lead } from '../services/api';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface DashboardProps {
    onNavigate: (page: string) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalLeads: 0,
        highValueLeads: 0,
        avgLeadScore: 0,
        totalRevenuePotential: 0,
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const leadsData = await apiService.getLeads();
            setLeads(leadsData);

            // Calculate statistics
            const highValue = leadsData.filter(l => (l.lead_score || 0) > 0.7).length;
            const avgScore = leadsData.reduce((acc, l) => acc + (l.lead_score || 0), 0) / leadsData.length;
            const totalRevenue = leadsData.reduce((acc, l) => acc + l.quote_value, 0);

            setStats({
                totalLeads: leadsData.length,
                highValueLeads: highValue,
                avgLeadScore: avgScore,
                totalRevenuePotential: totalRevenue,
            });
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Prepare chart data
    const leadScoreDistribution = [
        { name: 'High (>0.7)', value: leads.filter(l => (l.lead_score || 0) > 0.7).length, color: '#10b981' },
        { name: 'Medium (0.4-0.7)', value: leads.filter(l => (l.lead_score || 0) >= 0.4 && (l.lead_score || 0) <= 0.7).length, color: '#f59e0b' },
        { name: 'Low (<0.4)', value: leads.filter(l => (l.lead_score || 0) < 0.4).length, color: '#ef4444' },
    ];

    const topLeads = leads
        .sort((a, b) => (b.lead_score || 0) - (a.lead_score || 0))
        .slice(0, 10)
        .map(lead => ({
            name: lead.company_name.substring(0, 20),
            score: ((lead.lead_score || 0) * 100).toFixed(1),
            value: lead.quote_value,
        }));

    const revenueByScore = [
        {
            category: 'High Score',
            revenue: leads.filter(l => (l.lead_score || 0) > 0.7).reduce((acc, l) => acc + l.quote_value, 0) / 1000,
        },
        {
            category: 'Medium Score',
            revenue: leads.filter(l => (l.lead_score || 0) >= 0.4 && (l.lead_score || 0) <= 0.7).reduce((acc, l) => acc + l.quote_value, 0) / 1000,
        },
        {
            category: 'Low Score',
            revenue: leads.filter(l => (l.lead_score || 0) < 0.4).reduce((acc, l) => acc + l.quote_value, 0) / 1000,
        },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 sm:h-16 w-12 sm:w-16 border-t-4 border-b-4 border-primary-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-4 sm:space-y-6 animate-fade-in">
            {/* Header */}
            <div className="glass rounded-lg sm:rounded-2xl p-4 sm:p-8">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold gradient-text mb-2">
                    AI-Powered Outbound Sales Dashboard
                </h1>
                <p className="text-sm sm:text-base text-gray-600">
                    GenAI + Predictive Analytics + CRM Integration for IT Industry
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                <StatsCard
                    icon={<Users className="w-8 h-8" />}
                    title="Total Leads"
                    value={stats.totalLeads.toString()}
                    subtitle="Active prospects"
                    gradient="from-blue-500 to-blue-700"
                />
                <StatsCard
                    icon={<Target className="w-8 h-8" />}
                    title="High-Value Leads"
                    value={stats.highValueLeads.toString()}
                    subtitle="Score > 0.7"
                    gradient="from-green-500 to-green-700"
                />
                <StatsCard
                    icon={<TrendingUp className="w-8 h-8" />}
                    title="Avg Lead Score"
                    value={(stats.avgLeadScore * 100).toFixed(1) + '%'}
                    subtitle="Conversion probability"
                    gradient="from-purple-500 to-purple-700"
                />
                <StatsCard
                    icon={<DollarSign className="w-8 h-8" />}
                    title="Revenue Potential"
                    value={`$${(stats.totalRevenuePotential / 1000).toFixed(0)}K`}
                    subtitle="Total pipeline value"
                    gradient="from-pink-500 to-pink-700"
                />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Lead Score Distribution */}
                <div className="card">
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <Activity className="w-6 h-6 text-primary-500" />
                        Lead Score Distribution
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={leadScoreDistribution}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, value }) => `${name}: ${value}`}
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {leadScoreDistribution.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Revenue by Lead Score */}
                <div className="card">
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <DollarSign className="w-6 h-6 text-primary-500" />
                        Revenue Potential by Score Category
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={revenueByScore}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="category" />
                            <YAxis />
                            <Tooltip formatter={(value) => `$${value}K`} />
                            <Bar dataKey="revenue" fill="#6366f1" radius={[8, 8, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Top Leads */}
            <div className="card">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Target className="w-6 h-6 text-primary-500" />
                    Top 10 High-Value Leads
                </h3>
                <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={topLeads}>
                        <defs>
                            <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Area type="monotone" dataKey="score" stroke="#6366f1" fillOpacity={1} fill="url(#colorScore)" name="Lead Score %" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                <QuickActionCard
                    icon={<Target className="w-8 h-8" />}
                    title="Score New Lead"
                    description="Use AI to predict conversion probability"
                    gradient="from-blue-500 to-blue-700"
                    onClick={() => onNavigate('leads')}
                />
                <QuickActionCard
                    icon={<Mail className="w-8 h-8" />}
                    title="Generate Email Campaign"
                    description="Create personalized AI-powered emails"
                    gradient="from-purple-500 to-purple-700"
                    onClick={() => onNavigate('email')}
                />
                <QuickActionCard
                    icon={<Send className="w-8 h-8" />}
                    title="Send Campaign"
                    description="Automate outreach with SendGrid"
                    gradient="from-pink-500 to-pink-700"
                    onClick={() => onNavigate('email')}
                />
            </div>
        </div>
    );
}

// Stats Card Component
interface StatsCardProps {
    icon: React.ReactNode;
    title: string;
    value: string;
    subtitle: string;
    gradient: string;
}

function StatsCard({ icon, title, value, subtitle, gradient }: StatsCardProps) {
    return (
        <div className="card group hover:scale-105">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">{title}</p>
                    <p className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 truncate">{value}</p>
                    <p className="text-xs text-gray-500 line-clamp-1">{subtitle}</p>
                </div>
                <div className={`p-2 sm:p-3 rounded-lg sm:rounded-xl bg-gradient-to-br ${gradient} text-white group-hover:scale-110 transition-transform flex-shrink-0`}>
                    <div className="w-6 h-6 sm:w-8 sm:h-8">{icon}</div>
                </div>
            </div>
        </div>
    );
}

// Quick Action Card Component
interface QuickActionCardProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    gradient: string;
    onClick: () => void;
}

function QuickActionCard({ icon, title, description, gradient, onClick }: QuickActionCardProps) {
    return (
        <div
            onClick={onClick}
            className="card cursor-pointer group hover:scale-105"
        >
            <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-lg sm:rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white mb-3 sm:mb-4 group-hover:scale-110 transition-transform`}>
                <div className="w-6 h-6 sm:w-8 sm:h-8">{icon}</div>
            </div>
            <h4 className="text-base sm:text-lg font-bold mb-1 sm:mb-2">{title}</h4>
            <p className="text-xs sm:text-sm text-gray-600 line-clamp-2">{description}</p>
        </div>
    );
}
