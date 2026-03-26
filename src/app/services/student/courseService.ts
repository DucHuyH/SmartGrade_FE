import axiosInstance from "./axios";

export type StudentCourseApiLecturer = {
    user_id: number | string;
    name: string;
    email: string;
};

export type StudentCourseApiItem = {
    course_id: number | string;
    lecturer_id: number | string;
    name: string;
    course_code: string;
    academic_year: string;
    semester: string;
    resources: string | null;
    created_at: string;
    lecturer?: StudentCourseApiLecturer;
};

export type StudentCoursePagination = {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    limit: number;
};

export type GetStudentCoursesResult = {
    courses: StudentCourseApiItem[];
    pagination: StudentCoursePagination;
};

const parseStudentCourseList = (payload: unknown): StudentCourseApiItem[] => {
    const root = (payload as Record<string, unknown>) ?? {};
    const nested = (root.data as Record<string, unknown> | undefined) ?? {};

    const courseList =
        (root.course as unknown[] | undefined) ??
        (nested.course as unknown[] | undefined) ??
        (Array.isArray(payload) ? payload : []);

    if (!Array.isArray(courseList)) {
        return [];
    }

    return courseList
        .map((course) => {
            const item = (course as Record<string, unknown>) ?? {};
            const lecturerRaw = (item.lecturer as Record<string, unknown> | undefined) ?? undefined;

            const lecturer = lecturerRaw
                ? {
                    user_id: String(lecturerRaw.user_id ?? ''),
                    name: String(lecturerRaw.name ?? ''),
                    email: String(lecturerRaw.email ?? ''),
                }
                : undefined;

            return {
                course_id: String(item.course_id ?? ''),
                lecturer_id: String(item.lecturer_id ?? ''),
                name: String(item.name ?? ''),
                course_code: String(item.course_code ?? ''),
                academic_year: String(item.academic_year ?? ''),
                semester: String(item.semester ?? ''),
                resources: item.resources == null ? null : String(item.resources),
                created_at: String(item.created_at ?? ''),
                lecturer,
            } satisfies StudentCourseApiItem;
        })
        .filter((course) => course.course_id && course.name && course.course_code);
};

const parsePagination = (payload: unknown, fallbackLimit: number): StudentCoursePagination => {
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
        const response = await axiosInstance.get("/courses", {
            params,
        });

        const payload = response.data?.data ?? response.data;
        const courses = parseStudentCourseList(payload);
        const parsedPagination = parsePagination(payload, limit);

        const pagination = {
            ...parsedPagination,
            totalItems: parsedPagination.totalItems > 0 ? parsedPagination.totalItems : courses.length,
            totalPages:
                parsedPagination.totalPages > 1
                    ? parsedPagination.totalPages
                    : Math.max(1, Math.ceil((parsedPagination.totalItems > 0 ? parsedPagination.totalItems : courses.length) / parsedPagination.limit)),
        };

        return {
            courses,
            pagination,
        } satisfies GetStudentCoursesResult;
    } catch (error) {
        console.error("Error fetching student courses:", error);
        throw error;
    }
};

export const getStudentCourseDetails = async (courseId: string) => {
    try {
        const response = await axiosInstance.get(`/courses/${courseId}`);
        return response.data?.data ?? response.data;
    } catch (error) {
        console.error(`Error fetching course ${courseId} details:`, error);
        throw error;
    }
};