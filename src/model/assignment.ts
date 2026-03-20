export interface Assignment {
    assignment_id: string;
    course_id: string;
    title: string;
    description: string;
    questions: string;
    requirements: string;
    due_date: string;
    max_score: number;
    allowed_file_types: string[];
    max_file_size_mb: number;
    allow_late_submissions: boolean;
    enable_ai_grading: boolean;
    file_url?: string;
    file_public_id?: string;
    created_at?: string;
}