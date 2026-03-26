import { Assignment } from "../../../model/assignment";
import axiosInstance from "./axios";

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