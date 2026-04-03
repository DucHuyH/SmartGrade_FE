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
