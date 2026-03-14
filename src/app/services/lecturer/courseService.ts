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

export const getAllCourses = async () => {
    try {
        const response = await axiosInstance.get("/courses");
        if (!response.data || !response.data.data) {
            throw new Error("Invalid response format: missing 'data' field");
        }
        console.log(response.data.data);
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
        return response.data;
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
    year?: string;
}) => {
    try {
        const response = await axiosInstance.put(`/courses/${courseId}`, courseData);
        return response.data;
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

