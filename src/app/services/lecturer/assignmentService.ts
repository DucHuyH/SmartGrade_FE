import { Course } from "../../../model";
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
        const response = await axiosInstance.get(
            `/assignments/detail/${assignmentId}/`
        );
        if (!response.data || !response.data.data) {
            throw new Error("Invalid response format: missing 'data' field");
        }
        return response.data.data;
    } catch (error) {
        console.error(
            `Error fetching details for assignment ${assignmentId}:`, error
        ); throw error;
    };
};

export const createAssignment = async (
    assignmentData: Omit<Assignment, "assignment_id">
) => {
    try {
        const response = await axiosInstance.post(
            `/assignments`,
            assignmentData
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
    assignmentData: Partial<Assignment>,
) => {
    try {
        const response = await axiosInstance.put(
            `/assignments/${assignmentId}/`,
            assignmentData,
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