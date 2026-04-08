import { Rubric } from './rubric';

export interface Assignment {
    assignment_id: string;
    course_id: string;
    course_name?: string;
    courseName?: string;
    course_code?: string;
    courseCode?: string;
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
    question_file?: string;
    // file_url?: string;
    // file_public_id?: string;
    question_file_url?: string;
    question_file_public_id?: string;
    solution_file_url?: string;
    solution_file_public_id?: string;
    created_at?: string;
    updated_at?: string;
    submission_count?: number;
    submitted_count?: number;
    graded_count?: number;
    enrolled_count?: number;
    has_submitted?: boolean;
    has_graded?: boolean;
    submission_attempt_count?: number;
    submission_submitted_at?: string;
    rubric?: Rubric | null;

}