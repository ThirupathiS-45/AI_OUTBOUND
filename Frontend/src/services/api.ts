import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Types
export interface Lead {
    company_name: string;
    quote_value: number;
    item_count: number;
    conversion_days: number;
    lead_score?: number;
    conversion_probability?: number;
    // Enhanced fields
    industry?: string;
    segment?: string;
    maturity_level?: string;
}

export interface UseCase {
    id: string;
    title: string;
    description: string;
    industry: string;
    pain_points: string[];
    solution_summary: string;
    success_metrics?: string;
    relevant_segments: string[];
}

export interface MatchResults {
    recommended_use_case: UseCase;
    segment_assigned: string;
    maturity_level: string;
    industry_detected: string;
}

export interface LeadInput {
    quote_value: number;
    item_count: number;
    conversion_days: number;
    company_name?: string;
}

export interface LeadScoreResponse {
    lead_score: number;
    conversion_probability: number;
}

export interface EmailInput {
    customer_name: string;
    lead_score: number;
    quote_value: number;
    item_count: number;
    use_case_id?: string;
}

export interface SendEmailInput {
    customer_name: string;
    customer_email: string;
    lead_score: number;
    quote_value: number;
    item_count: number;
    subject?: string;
    use_case_id?: string;
}

export interface SendEmailResponse {
    success: boolean;
    message: string;
    email_body: string;
}

export interface ScheduleEmailInput {
    customer_name: string;
    customer_email: string;
    subject: string;
    lead_score: number;
    quote_value: number;
    item_count: number;
    scheduled_at: string; // ISO 8601 UTC datetime
}

export interface ScheduledEmail {
    _id: string;
    customer_name: string;
    customer_email: string;
    subject: string;
    lead_score: number;
    quote_value: number;
    item_count: number;
    scheduled_at: string;
    status: 'pending' | 'sent' | 'failed' | 'cancelled';
    created_at: string;
    sent_at: string | null;
}

// API Functions
export const apiService = {
    // Health check
    async healthCheck(): Promise<{ status: string }> {
        const response = await api.get('/health');
        return response.data;
    },

    // Get leads from database
    async getLeads(): Promise<Lead[]> {
        const response = await api.get('/leads');
        return response.data;
    },

    // Get all use cases
    async getUseCases(): Promise<UseCase[]> {
        const response = await api.get('/use-cases');
        return response.data;
    },

    // Match use case to lead
    async matchUseCase(data: LeadInput): Promise<MatchResults> {
        const response = await api.post('/match-use-case', data);
        return response.data;
    },

    // Predict lead score
    async predictLeadScore(data: LeadInput): Promise<LeadScoreResponse> {
        const response = await api.post('/predict', data);
        return response.data;
    },

    // Generate email using LLaMA 2
    async generateEmail(data: EmailInput): Promise<{ email_body: string }> {
        const response = await api.post('/generate-email-llama2', data);
        return response.data;
    },

    // Send email to customer immediately
    async sendEmail(data: SendEmailInput): Promise<SendEmailResponse> {
        const response = await api.post('/send-email', data);
        return response.data;
    },

    // Schedule email for later delivery
    async scheduleEmail(data: ScheduleEmailInput): Promise<{ success: boolean; job: ScheduledEmail }> {
        const response = await api.post('/emails/schedule', data);
        return response.data;
    },

    // Get all scheduled emails
    async getScheduledEmails(): Promise<ScheduledEmail[]> {
        const response = await api.get('/emails/scheduled');
        return response.data;
    },

    // Cancel a pending scheduled email (soft delete)
    async cancelScheduledEmail(jobId: string): Promise<{ success: boolean; message: string }> {
        const response = await api.delete(`/emails/scheduled/${jobId}`);
        return response.data;
    },

    // Hard delete a scheduled email record
    async deleteScheduledEmail(jobId: string): Promise<{ success: boolean; message: string }> {
        const response = await api.delete(`/emails/scheduled/${jobId}/delete`);
        return response.data;
    },

    // Send a scheduled email immediately now
    async sendScheduledEmailNow(jobId: string): Promise<{ success: boolean; message: string; status: string }> {
        const response = await api.post(`/emails/scheduled/${jobId}/send-now`);
        return response.data;
    },
};

export default api;

