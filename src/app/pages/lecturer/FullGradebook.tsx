import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router';
import { Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Course } from '../../../model';
import { Breadcrumb } from '../../components/Breadcrumb';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Pagination } from '../../components/ui/pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { getCourseDetails, getCourseStudentGrades } from '../../services/lecturer/courseService';
import { getGradeLetter, isPassing, getAllGradeLetters } from '../../utils/gradingSystem';

type StudentAssignmentGrade = {
    courseId: string;
    courseName: string;
    assignmentId: string;
    assignmentTitle: string;
    maxScore: number | null;
    submissionId: string | null;
    submittedAt: string | null;
    attemptCount: number | null;
    submissionFileUrl: string | null;
    gradeId: string | null;
    score: number | null;
    gradeStatus: string;
    feedback: string | null;
    gradedAt: string | null;
};

type StudentListItem = {
    id: string;
    studentId: string;
    name: string;
    email: string;
    assignments: StudentAssignmentGrade[];
};

type GradeDistribution = {
    grade: string;
    count: number;
};

const PAGE_SIZE = 15;

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

const toNullableString = (value: unknown): string | null => {
    if (typeof value === 'string' && value.trim()) {
        return value;
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
        return String(value);
    }

    return null;
};

const getStudentAverage = (student: StudentListItem, assignmentsForCourse: StudentAssignmentGrade[]) => {
    if (!assignmentsForCourse || assignmentsForCourse.length === 0) {
        return null;
    }

    const percentages = assignmentsForCourse.map((assignment) => {
        const studentAssignment = student.assignments.find((a) => a.assignmentId === assignment.assignmentId) || null;
        const score = typeof studentAssignment?.score === 'number' ? studentAssignment!.score! : 0;
        const maxFromAssignment = typeof assignment.maxScore === 'number' && assignment.maxScore > 0 ? assignment.maxScore : null;
        const maxFromStudent = typeof studentAssignment?.maxScore === 'number' && studentAssignment!.maxScore! > 0 ? studentAssignment!.maxScore! : null;
        const max = maxFromAssignment ?? maxFromStudent ?? 100;

        return (score / max) * 100;
    });

    const sum = percentages.reduce((s, p) => s + p, 0);
    const avg = sum / assignmentsForCourse.length;
    return avg;
};

const parseCoursePayload = (payload: unknown): Course | null => {
    const root = (payload as Record<string, unknown>)?.data ?? payload;
    const rootRecord = (root as Record<string, unknown>) ?? {};

    const course =
        (rootRecord.course as Course | undefined) ??
        ((rootRecord.data as Record<string, unknown> | undefined)?.course as Course | undefined) ??
        (root as Course);

    return course?.course_id ? course : null;
};

const parseStudentListPayload = (payload: unknown): StudentListItem[] => {
    const root = (payload as Record<string, unknown>) ?? {};
    const nested = (root.data as Record<string, unknown> | undefined) ?? {};

    const studentList =
        (root.students as unknown[] | undefined) ??
        (nested.students as unknown[] | undefined) ??
        (Array.isArray(payload) ? payload : []);

    if (!Array.isArray(studentList)) {
        return [];
    }

    return studentList
        .map((student) => {
            const item = (student as Record<string, unknown>) ?? {};
            const assignmentList = Array.isArray(item.assignments) ? item.assignments : [];

            const assignments = assignmentList
                .map((assignment) => {
                    const assignmentRecord = (assignment as Record<string, unknown>) ?? {};

                    const assignmentId = toNullableString(assignmentRecord.assignmentId ?? assignmentRecord.assignment_id);

                    return {
                        courseId: toNullableString(assignmentRecord.courseId ?? assignmentRecord.course_id) ?? '',
                        courseName: toNullableString(assignmentRecord.courseName ?? assignmentRecord.course_name) ?? '',
                        assignmentId: assignmentId ?? '',
                        assignmentTitle: toNullableString(assignmentRecord.assignmentTitle ?? assignmentRecord.assignment_title) ?? '',
                        maxScore: toNullableNumber(assignmentRecord.maxScore ?? assignmentRecord.max_score),
                        submissionId: toNullableString(assignmentRecord.submissionId ?? assignmentRecord.submission_id),
                        submittedAt: toNullableString(assignmentRecord.submittedAt ?? assignmentRecord.submitted_at),
                        attemptCount: toNullableNumber(assignmentRecord.attemptCount ?? assignmentRecord.attempt_count),
                        submissionFileUrl: toNullableString(assignmentRecord.submissionFileUrl ?? assignmentRecord.submission_file_url),
                        gradeId: toNullableString(assignmentRecord.gradeId ?? assignmentRecord.grade_id),
                        score: toNullableNumber(assignmentRecord.score),
                        gradeStatus: toNullableString(assignmentRecord.gradeStatus ?? assignmentRecord.grade_status) ?? '',
                        feedback: toNullableString(assignmentRecord.feedback),
                        gradedAt: toNullableString(assignmentRecord.gradedAt ?? assignmentRecord.graded_at),
                    } satisfies StudentAssignmentGrade;
                })
                .filter((assignment) => assignment.assignmentId && assignment.assignmentTitle);

            const userId = item.userId ?? item.user_id ?? item.studentId ?? item.student_id ?? item.id;
            const studentCode = item.userCode ?? item.user_code ?? item.studentCode ?? item.student_code ?? userId;
            const name = item.name;
            const email = item.email;

            return {
                id: String(userId ?? ''),
                studentId: String(studentCode ?? ''),
                name: String(name ?? ''),
                email: String(email ?? ''),
                assignments,
            } satisfies StudentListItem;
        })
        .filter((student) => student.id && student.studentId && student.name && student.email);
};

export function FullGradebook() {
    const { course_id } = useParams();

    const [course, setCourse] = useState<Course | null>(null);
    const [students, setStudents] = useState<StudentListItem[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [isLoadingCourse, setIsLoadingCourse] = useState(false);
    const [isLoadingStudents, setIsLoadingStudents] = useState(false);

    const fetchStudentGrades = async (silent = false) => {
        if (!course_id) {
            setStudents([]);
            return;
        }

        if (!silent) {
            setIsLoadingStudents(true);
        }

        try {
            const response = await getCourseStudentGrades(course_id);
            const parsedStudents = parseStudentListPayload(response);
            setStudents(parsedStudents);
        } catch (error) {
            console.error('Error fetching student grades for course:', error);
            setStudents([]);
            if (!silent) {
                toast.error('Failed to load student grades.');
            }
        } finally {
            if (!silent) {
                setIsLoadingStudents(false);
            }
        }
    };

    useEffect(() => {
        if (!course_id) {
            return;
        }

        const fetchCourse = async () => {
            setIsLoadingCourse(true);
            try {
                const response = await getCourseDetails(course_id);
                const parsedCourse = parseCoursePayload(response);
                setCourse(parsedCourse);
            } catch (error) {
                console.error('Error fetching course details:', error);
                setCourse(null);
                toast.error('Failed to load course details.');
            } finally {
                setIsLoadingCourse(false);
            }
        };

        fetchCourse();
    }, [course_id]);

    useEffect(() => {
        if (!course_id) {
            return;
        }

        fetchStudentGrades();
    }, [course_id]);

    const visibleAssignments = useMemo(() => {
        const assignmentMap = new Map<string, StudentAssignmentGrade>();

        students.forEach((student) => {
            student.assignments.forEach((assignment) => {
                if (course_id && assignment.courseId && String(assignment.courseId) !== String(course_id)) {
                    return;
                }

                if (!assignmentMap.has(assignment.assignmentId)) {
                    assignmentMap.set(assignment.assignmentId, assignment);
                }
            });
        });

        return Array.from(assignmentMap.values());
    }, [students, course_id]);

    // Calculate student averages
    const studentAverages = useMemo(() => {
        return students.map((student) => {
            const avg = getStudentAverage(student, visibleAssignments);
            return {
                student,
                average: avg,
                gradeLetter: avg !== null ? getGradeLetter(avg, 100) : 'F',
            };
        });
    }, [students, visibleAssignments]);

    // Calculate statistics
    const statistics = useMemo(() => {
        if (studentAverages.length === 0) {
            return {
                classAverage: 0,
                highestGrade: 0,
                lowestGrade: 0,
                passRate: 0,
                gradeDistribution: getAllGradeLetters().map((grade) => ({ grade, count: 0 })),
            };
        }

        const validAverages = studentAverages
            .map((item) => item.average)
            .filter((avg) => avg !== null) as number[];

        const classAverage = validAverages.length > 0 ? validAverages.reduce((a, b) => a + b, 0) / validAverages.length : 0;
        const highestGrade = validAverages.length > 0 ? Math.max(...validAverages) : 0;
        const lowestGrade = validAverages.length > 0 ? Math.min(...validAverages) : 0;

        const passingCount = studentAverages.filter((item) => item.average !== null && isPassing(getGradeLetter(item.average, 100))).length;
        const passRate = studentAverages.length > 0 ? (passingCount / studentAverages.length) * 100 : 0;

        // Grade distribution
        const distributionMap = new Map<string, number>();
        getAllGradeLetters().forEach((grade) => {
            distributionMap.set(grade, 0);
        });

        studentAverages.forEach((item) => {
            const grade = item.gradeLetter;
            distributionMap.set(grade, (distributionMap.get(grade) || 0) + 1);
        });

        const gradeDistribution: GradeDistribution[] = getAllGradeLetters().map((grade) => ({
            grade,
            count: distributionMap.get(grade) || 0,
        }));

        return {
            classAverage,
            highestGrade,
            lowestGrade,
            passRate,
            gradeDistribution,
        };
    }, [studentAverages]);

    const totalPages = Math.max(1, Math.ceil(studentAverages.length / PAGE_SIZE));

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    const pagedStudents = useMemo(() => {
        const startIndex = (currentPage - 1) * PAGE_SIZE;
        return studentAverages.slice(startIndex, startIndex + PAGE_SIZE);
    }, [currentPage, studentAverages]);

    const breadcrumbItems = [
        { label: 'Courses', href: '/lecturer/courses' },
        { label: course?.name || 'Course', href: course ? `/lecturer/courses/${course.course_id}/assignments` : '#' },
        { label: 'Full Gradebook' },
    ];

    return (
        <div className="space-y-6">
            <Breadcrumb items={breadcrumbItems} />

            <div>
                <h2>Full Gradebook</h2>
                <p className="text-sm text-gray-600">
                    {course?.course_code} - Comprehensive grade analysis
                </p>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Class Average</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-blue-600">
                            {statistics.classAverage.toFixed(1)}%
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Average of all students</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Highest Grade</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-green-600">
                            {statistics.highestGrade.toFixed(2)}%
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Maximum score</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Lowest Grade</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-red-600">
                            {statistics.lowestGrade.toFixed(2)}%
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Minimum score</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-emerald-600">
                            {statistics.passRate.toFixed(1)}%
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Students with C- or above</p>
                    </CardContent>
                </Card>
            </div>

            {/* Grade Distribution Chart */}
            <Card>
                <CardHeader>
                    <CardTitle>Grade Distribution</CardTitle>
                    <CardDescription>
                        Distribution of grades from A to F
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoadingStudents ? (
                        <div className="flex items-center justify-center h-80 gap-2 text-gray-500">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Loading data...</span>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={statistics.gradeDistribution} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="grade" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="count" fill="#3B82F6" name="Number of Students" />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </CardContent>
            </Card>

            {/* Students Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Student Grades Statistics</CardTitle>
                    <CardDescription>
                        {isLoadingCourse
                            ? 'Loading course information...'
                            : isLoadingStudents
                                ? 'Loading students...'
                                : `Showing ${pagedStudents.length} of ${studentAverages.length} students`}
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                    <div className="overflow-x-auto pb-2">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-32">Student ID</TableHead>
                                    <TableHead className="w-40">Name</TableHead>
                                    <TableHead className="flex-1">Email</TableHead>
                                    <TableHead className="text-center w-32">Average %</TableHead>
                                    <TableHead className="text-center w-24">Grade</TableHead>
                                    <TableHead className="text-center w-24">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoadingStudents ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="py-8">
                                            <div className="flex items-center justify-center gap-2 text-gray-500">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                <span>Loading student data...</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : pagedStudents.length > 0 ? (
                                    pagedStudents.map((item) => (
                                        <TableRow key={item.student.id}>
                                            <TableCell className="font-medium text-gray-700">
                                                {item.student.studentId}
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {item.student.name}
                                            </TableCell>
                                            <TableCell className="text-sm text-gray-600">
                                                {item.student.email}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {item.average !== null ? (
                                                    <span className="font-semibold text-blue-600">
                                                        {item.average.toFixed(2)}%
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className={`font-semibold px-3 py-1 rounded-full text-sm ${item.average === null || item.average < 40
                                                        ? 'bg-red-100 text-red-700'
                                                        : item.average < 45
                                                            ? 'bg-orange-100 text-orange-700'
                                                            : item.average < 55
                                                                ? 'bg-amber-100 text-amber-700'
                                                                : item.average < 60
                                                                    ? 'bg-yellow-100 text-yellow-700'
                                                                    : item.average < 65
                                                                        ? 'bg-lime-100 text-lime-700'
                                                                        : item.average < 70
                                                                            ? 'bg-emerald-100 text-emerald-700'
                                                                            : item.average < 75
                                                                                ? 'bg-teal-100 text-teal-700'
                                                                                : item.average < 80
                                                                                    ? 'bg-cyan-100 text-cyan-700'
                                                                                    : item.average < 85
                                                                                        ? 'bg-blue-100 text-blue-700'
                                                                                        : item.average < 95
                                                                                            ? 'bg-indigo-100 text-indigo-700'
                                                                                            : 'bg-emerald-100 text-emerald-700'
                                                    }`}>
                                                    {item.gradeLetter}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {isPassing(item.gradeLetter) ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                        Pass
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                        Fail
                                                    </span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                                            No student data available yet.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                </CardContent>
            </Card>
        </div>
    );
}
