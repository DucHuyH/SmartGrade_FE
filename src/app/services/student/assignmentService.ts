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
