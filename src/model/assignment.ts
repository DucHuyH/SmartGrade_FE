import { Rubric } from './rubric';

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
    // file_url?: string;
    // file_public_id?: string;
    question_file_url?: string;
    question_file_public_id?: string;
    solution_file_url?: string;
    solution_file_public_id?: string;
    created_at?: string;
    updated_at?: string;
    submitted_count?: number;
    graded_count?: number;
    rubric?: Rubric | null;

}