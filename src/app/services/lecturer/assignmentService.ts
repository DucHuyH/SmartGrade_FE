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

        const submissionId =
            String(
                submissionRecord.submission_id ??
                submissionRecord.id ??
                `submission-${index}`
            );

        const studentId = String(
            submissionRecord.student_id ??
            submissionRecord.student_code ??
            studentRecord.user_id ??
            studentRecord.id ??
            studentRecord.student_code ??
            ''
        );

        const studentCodeRaw = submissionRecord.student_code ?? studentRecord.student_code ?? studentId;
        const studentCode = typeof studentCodeRaw === 'string' && studentCodeRaw.trim() ? studentCodeRaw : studentId;

        const studentName = String(
            submissionRecord.student_name ??
            submissionRecord.student ??
            studentRecord.name ??
            studentRecord.full_name ??
            'Unknown Student'
        );

        const submittedAtRaw = submissionRecord.submitted_at ?? submissionRecord.submission_time ?? null;
        const submittedAt = typeof submittedAtRaw === 'string' && submittedAtRaw.trim() ? submittedAtRaw : null;

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
        const payload = (response.data?.data as unknown) ?? response.data;

        console.log(`Raw submissions payload for assignment ${assignmentId}:`, payload);

        return parseLecturerSubmissionsPayload(payload);
    } catch (error) {
        console.error(`Error fetching submissions for assignment ${assignmentId}:`, error);
        throw error;
    }
};

export const getAssignmentDetails = async (assignmentId: string) => {
    try {
        const response = await axiosInstance.get(`/assignments/detail/${assignmentId}/`);
        console.log(`Raw assignment detail response for assignment ${assignmentId}:`, response.data);
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