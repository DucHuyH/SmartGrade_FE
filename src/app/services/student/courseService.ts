import axiosInstance from "./axios";

export const getStudentCourses = async ({
    page = 1,
    limit = 10,
    search = "",
    semester,
}: {
    page?: number;
    limit?: number;
    search?: string;
    semester?: string;
}) => {
    try {
        const params: Record<string, string | number> = {
            page,
            limit,
            search,
        };
        if (semester) {
            params.semester = semester;
        }
        const response = await axiosInstance.get("/student/courses", {
            params,
        });
        if (!response.data || !response.data.data) {
            throw new Error("Invalid response format: missing 'data' field");
        }
        return response.data.data;
    } catch (error) {
        console.error("Error fetching student courses:", error);
        throw error;
    }
};