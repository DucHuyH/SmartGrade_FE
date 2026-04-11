import { Assignment } from '../../../model/assignment';
import axiosInstance from './axios';

export type StudentAssignmentPagination = {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    limit: number;
};

export type GetStudentAssignmentsResult = {
    assignments: Assignment[];
    pagination: StudentAssignmentPagination;
};

export type StudentSubmission = {
    submission_id: number;
    assignment_id: number;
    student_id: number;
    attempt_count: number;
    submitted_at: string;
    file_url?: string;
};

export type SubmitAssignmentResult = {
    message: string;
    submission: StudentSubmission;
};

export type StudentGradeCriterion = {
    criteria_id: string;
    criteria_name: string;
    max_score: number;
    score: number;
    feedback: string;
};

export type StudentSubmissionGradesDetail = {
    submission_id: string;
    assignment_id: string;
    final_score: number | null;
    max_score: number | null;
    feedback: string;
    status: string;
    has_published: boolean;
    graded_at: string | null;
    submitted_at: string | null;
    criteria_scores: StudentGradeCriterion[];
    lecturer_name?: string;
    file_url?: string;
    class_average?: number;
};

const parseAssignmentListPayload = (payload: unknown): Assignment[] => {
    const root = (payload as Record<string, unknown>) ?? {};
    const nested = (root.data as Record<string, unknown> | undefined) ?? {};

    const assignmentList =
        (root.course as Assignment[] | undefined) ??
        (root.assignments as Assignment[] | undefined) ??
        (nested.course as Assignment[] | undefined) ??
        (nested.assignments as Assignment[] | undefined) ??
        (Array.isArray(payload) ? (payload as Assignment[]) : []);

    return Array.isArray(assignmentList) ? assignmentList : [];
};

const parsePagination = (payload: unknown, fallbackLimit: number): StudentAssignmentPagination => {
    const root = (payload as Record<string, unknown>) ?? {};
    const nested = (root.data as Record<string, unknown> | undefined) ?? {};

    const paginationRaw =
        (root.pagination as Record<string, unknown> | undefined) ??
        (nested.pagination as Record<string, unknown> | undefined) ??
        {};

    const currentPage = Number(paginationRaw.currentPage ?? paginationRaw.page ?? 1);
    const totalPages = Number(paginationRaw.totalPages ?? 1);
    const totalItems = Number(paginationRaw.totalItems ?? 0);
    const limit = Number(paginationRaw.limit ?? fallbackLimit);

    return {
        currentPage: Number.isFinite(currentPage) && currentPage > 0 ? currentPage : 1,
        totalPages: Number.isFinite(totalPages) && totalPages > 0 ? totalPages : 1,
        totalItems: Number.isFinite(totalItems) && totalItems >= 0 ? totalItems : 0,
        limit: Number.isFinite(limit) && limit > 0 ? limit : fallbackLimit,
    };
};

export const getAssignmentsForCourse = async (
    course_id: string,
    page: number = 1,
    limit: number = 10,
    search: string = ''
): Promise<GetStudentAssignmentsResult> => {
    try {
        const response = await axiosInstance.get(`/assignments/list/${course_id}`, {
            params: {
                page,
                limit,
                search,
            },
        });

        if (!response.data || !response.data.data) {
            throw new Error("Invalid response format: missing 'data' field");
        }

        const payload = response.data.data;
        const assignments = parseAssignmentListPayload(payload);
        const pagination = parsePagination(payload, limit);

        console.log(payload);

        return {
            assignments,
            pagination: {
                ...pagination,
                totalItems: pagination.totalItems > 0 ? pagination.totalItems : assignments.length,
                totalPages:
                    pagination.totalPages > 1
                        ? pagination.totalPages
                        : Math.max(1, Math.ceil((pagination.totalItems > 0 ? pagination.totalItems : assignments.length) / pagination.limit)),
            },
        };
    } catch (error) {
        console.error(`Error fetching assignments for course ${course_id}:`, error);
        throw error;
    }
};

export const getAssignmentDetails = async (assignmentId: string): Promise<Assignment> => {
    try {
        const response = await axiosInstance.get(`/assignments/detail/${assignmentId}/`);
        const payload = response.data?.data as Record<string, unknown> | undefined;

        if (!payload) {
            throw new Error("Invalid response format: missing 'data' field");
        }

        const root = (payload.data as Record<string, unknown> | undefined) ?? payload;
        const assignmentContainer =
            (root?.assignment as Record<string, unknown> | undefined) ??
            root;
        const assignmentRecord =
            (assignmentContainer?.assignment as Record<string, unknown> | undefined) ?? assignmentContainer;

        if (!assignmentRecord?.assignment_id) {
            throw new Error('Invalid assignment detail format');
        }

        console.log('Raw assignment detail response:', response.data);

        const rubricRecord =
            assignmentContainer?.rubric ??
            root?.rubric ??
            null;

        const normalizedQuestionFileUrl =
            (typeof assignmentRecord?.question_file_url === 'string' && assignmentRecord.question_file_url) ||
            (typeof assignmentRecord?.question_file === 'string' && assignmentRecord.question_file) ||
            undefined;



        return {
            ...(assignmentRecord as unknown as Assignment),
            question_file_url: normalizedQuestionFileUrl,
            rubric: rubricRecord as Assignment['rubric'],
        };
    } catch (error) {
        console.error(`Error fetching details for assignment ${assignmentId}:`, error);
        throw error;
    }
};

export const submitAssignmentFile = async (
    assignmentId: string,
    file: File
): Promise<SubmitAssignmentResult> => {
    try {
        const formData = new FormData();
        formData.append('submission_file', file);

        const response = await axiosInstance.post(`/submissions/${assignmentId}`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        const payload = (response.data?.data as Record<string, unknown> | undefined) ?? {};
        const submission = (payload.submission as StudentSubmission | undefined) ?? undefined;
        const message = typeof payload.message === 'string' ? payload.message : 'Submission created successfully.';

        if (!submission) {
            throw new Error('Invalid response format: missing submission data');
        }

        return {
            message,
            submission,
        };
    } catch (error) {
        console.error(`Error submitting assignment ${assignmentId}:`, error);
        throw error;
    }
};

const toNullableNumber = (value: unknown): number | null => {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
};

const toBoolean = (value: unknown): boolean => {
    if (typeof value === 'boolean') {
        return value;
    }

    if (typeof value === 'number') {
        return value === 1;
    }

    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        return normalized === 'true' || normalized === '1' || normalized === 'yes';
    }

    return false;
};

const getResponseData = (payload: unknown): unknown => {
    const root = (payload as Record<string, unknown>) ?? {};
    return root.data ?? payload;
};

const parseStudentSubmissionGradesPayload = (
    payload: unknown,
    fallbackSubmissionId: string
): StudentSubmissionGradesDetail => {
    const root = (getResponseData(payload) as Record<string, unknown>) ?? {};
    const gradeRoot =
        (root.grade as Record<string, unknown> | undefined) ??
        (root.data as Record<string, unknown> | undefined) ??
        root;

    const criteriaRaw =
        (gradeRoot.rubric_scores as unknown[] | undefined) ??
        (gradeRoot.criteria_scores as unknown[] | undefined) ??
        (gradeRoot.criteria as unknown[] | undefined) ??
        [];

    const criteria_scores = Array.isArray(criteriaRaw)
        ? criteriaRaw.map((entry, index) => {
            const record = (entry as Record<string, unknown>) ?? {};
            const score = toNullableNumber(record.score ?? record.ai_score ?? record.final_score) ?? 0;
            const maxScore = toNullableNumber(record.max_score ?? record.maxPoints ?? record.max_points) ?? 0;

            return {
                criteria_id: String(record.criteria_id ?? record.id ?? index),
                criteria_name: String(record.criteria_name ?? record.criteria ?? `Criteria ${index + 1}`),
                max_score: maxScore,
                score,
                feedback: typeof record.feedback === 'string' ? record.feedback : '',
            };
        })
        : [];

    const submissionId = String(gradeRoot.submission_id ?? root.submission_id ?? fallbackSubmissionId);

    return {
        submission_id: submissionId,
        assignment_id: String(gradeRoot.assignment_id ?? root.assignment_id ?? ''),
        final_score: toNullableNumber(gradeRoot.final_score ?? gradeRoot.score),
        max_score: toNullableNumber(gradeRoot.max_score ?? gradeRoot.total_score),
        feedback: typeof gradeRoot.feedback === 'string' ? gradeRoot.feedback : '',
        status: String(gradeRoot.status ?? root.status ?? 'pending').toLowerCase(),
        has_published: toBoolean(gradeRoot.has_published ?? gradeRoot.is_published),
        graded_at:
            typeof gradeRoot.graded_at === 'string' && gradeRoot.graded_at.trim()
                ? gradeRoot.graded_at
                : null,
        submitted_at:
            typeof gradeRoot.submitted_at === 'string' && gradeRoot.submitted_at.trim()
                ? gradeRoot.submitted_at
                : null,
        criteria_scores,
        lecturer_name: typeof gradeRoot.lecturer_name === 'string' ? gradeRoot.lecturer_name : undefined,
        file_url: typeof gradeRoot.file_url === 'string' ? gradeRoot.file_url : undefined,
        class_average: toNullableNumber(gradeRoot.class_average ?? gradeRoot.average_score) ?? undefined,
    };
};

export const getSubmissionGrade = async (submissionId: string): Promise<StudentSubmissionGradesDetail> => {
    try {
        const response = await axiosInstance.get(`/grading/${submissionId}`);
        console.log(`Raw response for grade details of submission ${submissionId}:`, response.data);

        return parseStudentSubmissionGradesPayload(response.data, submissionId);
    } catch (error) {
        console.error(`Error fetching grade details for submission ${submissionId}:`, error);
        throw error;
    }
};
