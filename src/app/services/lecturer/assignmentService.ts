import { Assignment } from "../../../model/assignment";
import axiosInstance from "./axios";

export type LecturerSubmission = {
    submission_id: string;
    student_id: string;
    student_code?: string;
    student_name: string;
    student_email?: string;
    submitted_at: string | null;
    final_score: number | null;
    max_score: number | null;
    score: number | null;
    status: 'not_submitted' | 'pending' | 'graded';
    has_published: boolean;
    file_url: string | null;
};

export const normalizeSubmissionIdentifier = (submissionId: string | number | null | undefined): string => {
    if (submissionId === null || submissionId === undefined) {
        return '';
    }

    const rawValue = String(submissionId).trim();
    if (!rawValue) {
        return '';
    }

    const lastNumberMatch = rawValue.match(/(\d+)(?!.*\d)/);
    return lastNumberMatch?.[1] ?? rawValue;
};

const parseLecturerSubmissionsPayload = (payload: unknown): LecturerSubmission[] => {
    const root = (payload as Record<string, unknown>) ?? {};
    const nested = (root.data as Record<string, unknown> | undefined) ?? {};

    const toNullableNumber = (value: unknown): number | null => {
        if (typeof value === 'number') {
            return Number.isFinite(value) ? value : null;
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

    const listCandidate =
        (root.submissions as unknown[] | undefined) ??
        (nested.submissions as unknown[] | undefined) ??
        (root.items as unknown[] | undefined) ??
        (nested.items as unknown[] | undefined) ??
        (root.students as unknown[] | undefined) ??
        (nested.students as unknown[] | undefined) ??
        (Array.isArray(payload) ? payload : []);

    if (!Array.isArray(listCandidate)) {
        return [];
    }

    return listCandidate.map((entry, index) => {
        const record = (entry as Record<string, unknown>) ?? {};
        const submissionRecord =
            (record.submission as Record<string, unknown> | undefined) ??
            record;
        const studentRecord = (record.student as Record<string, unknown> | undefined) ?? {};

        const rawSubmissionId =
            submissionRecord.submission_id ??
            submissionRecord.id ??
            '';

        const studentId = String(
            submissionRecord.student_id ??
            submissionRecord.student_code ??
            studentRecord.user_id ??
            studentRecord.id ??
            studentRecord.student_code ??
            ''
        );

        const submittedAtRaw = submissionRecord.submitted_at ?? submissionRecord.submission_time ?? null;
        const submittedAt = typeof submittedAtRaw === 'string' && submittedAtRaw.trim() ? submittedAtRaw : null;

        // Generate temporary submission_id if not provided
        const submissionId = rawSubmissionId
            ? String(rawSubmissionId)
            : `temp_${studentId}_${submittedAt || 'no-date'}_${index}`;

        const studentCodeRaw = submissionRecord.student_code ?? studentRecord.student_code ?? studentId;
        const studentCode = typeof studentCodeRaw === 'string' && studentCodeRaw.trim() ? studentCodeRaw : studentId;

        const studentName = String(
            submissionRecord.student_name ??
            submissionRecord.student ??
            studentRecord.name ??
            studentRecord.full_name ??
            'Unknown Student'
        );

        const finalScore = toNullableNumber(
            submissionRecord.final_score ?? submissionRecord.score ?? submissionRecord.grade
        );

        const maxScore = toNullableNumber(submissionRecord.max_score ?? submissionRecord.total_score);

        const fileRaw = submissionRecord.file_url ?? submissionRecord.submission_file_url ?? null;
        const fileUrl = typeof fileRaw === 'string' && fileRaw.trim() ? fileRaw : null;

        const status = fileUrl === null
            ? 'not_submitted'
            : finalScore !== null
                ? 'graded'
                : 'pending';

        const hasPublished = toBoolean(
            submissionRecord.has_published ?? submissionRecord.is_published ?? false
        );

        const studentEmailRaw = submissionRecord.student_email ?? studentRecord.email;
        const studentEmail = typeof studentEmailRaw === 'string' && studentEmailRaw.trim() ? studentEmailRaw : undefined;

        return {
            submission_id: submissionId,
            student_id: studentId,
            student_code: studentCode,
            student_name: studentName,
            student_email: studentEmail,
            submitted_at: submittedAt,
            final_score: finalScore,
            max_score: maxScore,
            score: finalScore,
            status,
            has_published: hasPublished,
            file_url: fileUrl,
        };
    });
};

export const getAssignmentsForCourse = async (
    course_id: string,
    page: number = 1,
    limit: number = 10,
    search: string = ""
) => {
    try {
        const response = await axiosInstance.get(
            `/assignments/list/${course_id}`,
            {
                params: {
                    page,
                    limit,
                    search,
                },
            }
        );
        if (!response.data || !response.data.data) {
            throw new Error("Invalid response format: missing 'data' field");
        }
        return response.data.data;
    } catch (error) {
        console.error(
            `Error fetching assignments for course ${course_id}:`,
            error
        );
        throw error;
    }
};

export const getAssignmentSubmissions = async (assignmentId: string): Promise<LecturerSubmission[]> => {
    try {
        const response = await axiosInstance.get(`/submissions/${assignmentId}`);
        console.log(`Raw response for submissions of assignment ${assignmentId}:`, response.data);
        const payload = (response.data?.data as unknown) ?? response.data;



        return parseLecturerSubmissionsPayload(payload);
    } catch (error) {
        console.error(`Error fetching submissions for assignment ${assignmentId}:`, error);
        throw error;
    }
};

export const getAssignmentDetails = async (assignmentId: string) => {
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
            throw new Error("Invalid assignment detail format");
        }

        const rubricRecord =
            assignmentContainer?.rubric ??
            root?.rubric ??
            null;


        return {
            ...(assignmentRecord as unknown as Assignment),
            rubric: rubricRecord as Assignment["rubric"],
        };
    } catch (error) {
        console.error(
            `Error fetching details for assignment ${assignmentId}:`, error
        ); throw error;
    };
};

export const createAssignment = async (
    assignmentData: Record<string, unknown> | FormData
) => {
    try {
        const config = assignmentData instanceof FormData ? {
            headers: { 'Content-Type': 'multipart/form-data' }
        } : {};

        const response = await axiosInstance.post(
            `/assignments`,
            assignmentData,
            config
        );
        if (!response.data || !response.data.data) {
            throw new Error("Invalid response format: missing 'data' field");
        }
        return response.data.data;
    } catch (error) {
        console.error(
            `Error creating assignment:`, error
        ); throw error;
    };
};

export const updateAssignment = async (
    assignmentId: string,
    assignmentData: Record<string, unknown> | FormData,
) => {
    try {
        const config = assignmentData instanceof FormData ? {
            headers: { 'Content-Type': 'multipart/form-data' }
        } : {};

        const response = await axiosInstance.put(
            `/assignments/${assignmentId}/`,
            assignmentData,
            config
        );
        if (!response.data || !response.data.data) {
            throw new Error("Invalid response format: missing 'data' field");
        }
        return response.data.data;
    } catch (error) {
        console.error(
            `Error updating assignment ${assignmentId}:`, error
        ); throw error;
    };
};

export const deleteAssignment = async (assignmentId: string) => {
    try {
        await axiosInstance.delete(`/assignments/${assignmentId}/`);
    } catch (error) {
        console.error(
            `Error deleting assignment ${assignmentId}:`, error
        ); throw error;
    }
};

export type SubmissionGradeCriterion = {
    criteria_id: string;
    criteria_name: string;
    max_score: number;
    score: number;
    feedback: string;
};

export type SubmissionGradeDetails = {
    grade_id: string | null;
    submission_id: string;
    final_score: number | null;
    feedback: string;
    status: string;
    has_published: boolean;
    graded_at: string | null;
    criteria_scores: SubmissionGradeCriterion[];
};

export type SaveSubmissionGradePayload = {
    final_score: number;
    feedback: string;
    criteria_scores: Array<{
        criteria_id: string;
        score: number;
        feedback: string;
    }>;
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

const getStatusCode = (error: unknown): number | undefined => {
    const maybeError = error as { response?: { status?: number } };
    return maybeError.response?.status;
};

const requestWithFallback = async <T>(
    endpoints: string[],
    request: (endpoint: string) => Promise<T>
): Promise<T> => {
    let lastError: unknown;

    for (const endpoint of endpoints) {
        try {
            return await request(endpoint);
        } catch (error) {
            lastError = error;
            if (getStatusCode(error) !== 404) {
                throw error;
            }
        }
    }

    throw lastError;
};

const parseSubmissionGradeDetailsPayload = (
    payload: unknown,
    fallbackSubmissionId: string
): SubmissionGradeDetails => {
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

    const submissionId = String(
        gradeRoot.submission_id ?? root.submission_id ?? fallbackSubmissionId
    );

    return {
        grade_id:
            gradeRoot.grade_id !== undefined && gradeRoot.grade_id !== null
                ? String(gradeRoot.grade_id)
                : null,
        submission_id: submissionId,
        final_score: toNullableNumber(gradeRoot.final_score ?? gradeRoot.score),
        feedback: typeof gradeRoot.feedback === 'string' ? gradeRoot.feedback : '',
        status: String(gradeRoot.status ?? root.status ?? 'pending').toLowerCase(),
        has_published: toBoolean(gradeRoot.has_published ?? gradeRoot.is_published),
        graded_at:
            typeof gradeRoot.graded_at === 'string' && gradeRoot.graded_at.trim()
                ? gradeRoot.graded_at
                : null,
        criteria_scores,
    };
};

export const getSubmissionGrade = async (submissionId: string): Promise<SubmissionGradeDetails> => {
    const response = await axiosInstance.get(`/grading/${submissionId}`);

    return parseSubmissionGradeDetailsPayload(response.data, submissionId);
};

export const saveSubmissionGrade = async (
    submissionId: string,
    payload: SaveSubmissionGradePayload
): Promise<SubmissionGradeDetails> => {
    const requestPayload = {
        final_score: payload.final_score,
        feedback: payload.feedback,
        rubric_scores: payload.criteria_scores,
    };

    const response = await requestWithFallback(
        [`/grading/${submissionId}`, `/grading`],
        (endpoint) => axiosInstance.post(endpoint, requestPayload)
    );

    return parseSubmissionGradeDetailsPayload(response.data, submissionId);
};

export type PublishGradeResponse = {
    success: Array<{
        submission_id: string | number;
        status: string;
    }>;
    errors: Array<{
        submission_id: string | number;
        message: string;
    }>;
};

export const publishSubmissionGrades = async (submissionIds: (string | number)[]): Promise<PublishGradeResponse> => {
    if (submissionIds.length === 0) {
        return { success: [], errors: [] };
    }

    const payload = {
        list_submission_ids: submissionIds,
    };

    const response = await requestWithFallback(
        ['/grading/finalize', '/grading/finalize/bulk'],
        (endpoint) => axiosInstance.patch(endpoint, payload)
    );

    const responseData = getResponseData(response.data) as Record<string, unknown>;
    return {
        success: Array.isArray(responseData.success) ? responseData.success : [],
        errors: Array.isArray(responseData.errors) ? responseData.errors : [],
    };
};

export const finalizeSubmissionGrade = async (gradeId: string | number): Promise<void> => {
    await axiosInstance.patch(`/grading/${gradeId}/finalize`);
};

export const getSubmissionFile = async (submissionId: string | number): Promise<Blob> => {
    try {
        const response = await axiosInstance.get(
            `/submissions/${submissionId}/file`,
            {
                responseType: 'blob'
            }
        );
        return response.data as Blob;
    } catch (error) {
        console.error(`Error fetching submission file for ${submissionId}:`, error);
        throw error;
    }
};

export const fetchFileBlob = async (fileUrl: string): Promise<Blob> => {
    try {
        if (!fileUrl || !fileUrl.trim()) {
            throw new Error('File URL is empty');
        }

        // Get auth token if available
        const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
        const headers: Record<string, string> = {
            'Accept': 'application/pdf, application/octet-stream'
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(fileUrl, {
            method: 'GET',
            headers
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
        }

        const blob = await response.blob();
        return blob;
    } catch (error) {
        console.error(`[fetchFileBlob] Error fetching file from URL ${fileUrl}:`, error);
        throw error;
    }
};

// Generate feedback from submission file using AI/annotation analysis
export interface AnalysisAnnotation {
    id: string;
    points: Array<{ x: number; y: number }>;
    color: string;
    width: number;
}

export interface FeedbackAnalysisRequest {
    fileUrl: string;
    annotations?: AnalysisAnnotation[];
    submissionId?: string;
}

export interface FeedbackAnalysisResponse {
    overallFeedback: string;
    criteria?: Array<{
        criteriaId: string;
        feedback: string;
        suggestedScore?: number;
    }>;
    summary?: string;
}

export const generateFeedbackFromSubmission = async (
    request: FeedbackAnalysisRequest
): Promise<FeedbackAnalysisResponse> => {
    try {
        console.log('[generateFeedbackFromSubmission] Request:', request);
        // TODO: Replace with actual API endpoint
        // This is a mock implementation that returns sample data
        // In production, this should call your backend AI/analysis service

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Mock response - customize this based on your actual API
        const mockResponse: FeedbackAnalysisResponse = {
            overallFeedback: 'Great work! The submission demonstrates a good understanding of the concepts. The code is well-structured and the logic is clear. Consider adding more comments for better readability.',
            criteria: [
                {
                    criteriaId: '1',
                    feedback: 'Code structure is clean and follows best practices.',
                    suggestedScore: 9,
                },
                {
                    criteriaId: '2',
                    feedback: 'Logic is correct and handles edge cases well.',
                    suggestedScore: 9,
                },
                {
                    criteriaId: '3',
                    feedback: 'Documentation could be improved with more detailed comments.',
                    suggestedScore: 8,
                },
            ],
            summary: 'Overall excellent submission with minor improvements needed in documentation.',
        };

        return mockResponse;
    } catch (error) {
        console.error('[generateFeedbackFromSubmission] Error:', error);
        throw error;
    }
};