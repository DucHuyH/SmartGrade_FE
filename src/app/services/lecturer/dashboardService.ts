import axiosInstance from "./axios";

export interface DashboardStats {
    total_students: number;
    total_courses: number;
    active_assignments: number;
    ungraded_submissions: number;
    unpublished_grades: number;
}

export interface GradeDistributionItem {
    rank: string;
    number: string | number;
}

export interface SubmissionStatusItem {
    status: string;
    number: number;
}

export interface Submission {
    submission_id: number;
    student_id: number;
    student_name: string;
    course_id: number;
    course_name: string;
    assignment_id: number;
    assignment_name: string;
    submitted_at: string;
}

export interface PaginationInfo {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
}

export interface SubmissionsData {
    submissions: Submission[];
    pagination: PaginationInfo;
}

export interface DashboardChartData {
    grade_distribution: GradeDistributionItem[];
    submission_status: SubmissionStatusItem[];
}

type GetDashboardParamsParams = {
    academic_year: string;
    semester: string;
};

/**
 * Get dashboard statistics filtered by academic year and semester
 */
export const getDashboardStats = async ({
    academic_year,
    semester,
}: GetDashboardParamsParams): Promise<DashboardStats> => {
    try {
        console.log("Fetching dashboard stats with params:", { academic_year, semester });
        const response = await axiosInstance.get(
            "/dashboard/stats",
            {
                params: {
                    academic_year,
                    semester,
                }
            }
        );
        console.log("Dashboard stats response:", response.data);
        return response.data.data.data;
    } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        throw error;
    }
};

/**
 * Get dashboard chart data filtered by academic year and semester
 */
export const getDashboardChart = async ({
    academic_year,
    semester,
}: GetDashboardParamsParams): Promise<DashboardChartData> => {
    try {
        console.log("Fetching dashboard chart with params:", { academic_year, semester });
        const response = await axiosInstance.get(
            "/dashboard/chart",
            {
                params: {
                    academic_year,
                    semester,
                }
            }
        );
        console.log("Dashboard chart response:", response.data);
        return response.data.data.data;
    } catch (error) {
        console.error("Error fetching dashboard chart:", error);
        throw error;
    }
};

type GetDashboardSubmissionsParams = GetDashboardParamsParams & {
    page?: number;
    limit?: number;
};

/**
 * Get dashboard submissions filtered by academic year and semester
 */
export const getDashboardSubmissions = async ({
    academic_year,
    semester,
    page = 1,
    limit = 5,
}: GetDashboardSubmissionsParams): Promise<SubmissionsData> => {
    try {
        console.log("Fetching dashboard submissions with params:", { academic_year, semester, page, limit });
        const response = await axiosInstance.get(
            "/dashboard/submissions",
            {
                params: {
                    academic_year,
                    semester,
                    page,
                    limit,
                }
            }
        );
        console.log("Dashboard submissions response:", response.data);
        return response.data.data.data;
    } catch (error) {
        console.error("Error fetching dashboard submissions:", error);
        throw error;
    }
};
