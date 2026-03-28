import axiosInstance from "./axios";

// Get all courses for the lecturer
// export const getAllCourses = async ({
//     pageNumber = 1,
//     pageSize = 10,
//     query = ""
// }) => {
//     try {
//         const response = await axiosInstance.get("/courses", {
//             params: {
//                 pageNumber,
//                 pageSize,
//                 query
//             }
//         });
//         return response.data;
//     } catch (error) {
//         console.error("Error fetching courses:", error);
//         throw error;
//     }
// };

type GetAllCoursesParams = {
    page?: number;
    limit?: number;
    search?: string;
    semester?: string;
};

export const getAllCourses = async ({
    page = 1,
    limit = 6,
    search = "",
    semester,
}: GetAllCoursesParams) => {
    try {
        const params: Record<string, string | number> = {
            page,
            limit,
            search,
        };

        if (semester) {
            params.semester = semester;
        }

        const response = await axiosInstance.get("/courses", {
            params,
        });
        if (!response.data || !response.data.data) {
            throw new Error("Invalid response format: missing 'data' field");
        }
        console.log('Raw response data for courses:', response.data);
        return response.data.data;
    } catch (error) {
        console.error("Error fetching courses:", error);
        throw error;
    }
};

// Get details of a specific course
export const getCourseDetails = async (courseId: string) => {
    try {
        const response = await axiosInstance.get(`/courses/${courseId}`);
        return response.data.data;
    } catch (error) {
        console.error(`Error fetching course ${courseId} details:`, error);
        throw error;
    }
};

// Create a new course
export const createCourse = async (courseData: {
    lecturer_id: string;
    name: string;
    course_code: string;
    // description?: string;
    academic_year: string;
    semester: string;

}) => {
    try {
        console.log(courseData)
        const response = await axiosInstance.post("/courses", courseData);
        return response.data.data;
    } catch (error) {
        console.error("Error creating course:", error);
        throw error;
    }
};

// Update an existing course
export const updateCourse = async (courseId: string, courseData: {
    name?: string;
    course_code?: string;
    description?: string;
    semester?: string;
    academic_year?: string;
}) => {
    try {
        const response = await axiosInstance.put(`/courses/${courseId}`, courseData);
        return response.data.data;
    } catch (error) {
        console.error(`Error updating course ${courseId}:`, error);
        throw error;
    }
};

// Delete a course
export const deleteCourse = async (courseId: string) => {
    try {
        const response = await axiosInstance.delete(`/courses/${courseId}`);
        return response.data;
    } catch (error) {
        console.error(`Error deleting course ${courseId}:`, error);
        throw error;
    }
};

export const importCourseStudents = async (
    courseId: string,
    file: File,
) => {
    try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await axiosInstance.post(`/courses/${courseId}/import-students`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        if (!response.data || !response.data.data) {
            throw new Error("Invalid response format: missing 'data' field");
        }
        else {
            console.log('Raw response data for importing students:', response.data);
        }
        return response.data?.data ?? response.data;
    } catch (error) {
        console.error(`Error importing students for course ${courseId}:`, error);
        throw error;
    }
};

export const getCourseStudents = async (courseId: string) => {
    try {
        const response = await axiosInstance.get(`/courses/${courseId}/students`);
        if (!response.data || !response.data.data) {
            throw new Error("Invalid response format: missing 'data' field");
        }
        else {
            console.log('Raw response data for course students:', response.data);
        }
        return response.data?.data ?? response.data;
    } catch (error) {
        console.error(`Error fetching students for course ${courseId}:`, error);
        throw error;
    }
};

