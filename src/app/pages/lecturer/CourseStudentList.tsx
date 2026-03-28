import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router';
import { Download, Loader2, Upload } from 'lucide-react';
import { toast } from 'react-toastify';
import { Course } from '../../../model';
import { Breadcrumb } from '../../components/Breadcrumb';
import { ImportExcelModal, ImportStudentRow } from '../../components/ImportExcelModal';
import { SearchBar } from '../../components/SearchBar';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Pagination } from '../../components/ui/pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Assignment } from '../../../model/assignment';
import { getAssignmentsForCourse } from '../../services/lecturer/assignmentService';
import { getCourseDetails, getCourseStudents, importCourseStudents } from '../../services/lecturer/courseService';

type StudentListItem = {
    id: string;
    studentId: string;
    name: string;
    email: string;
    assignmentScores?: Record<string, number | null>;
};

const PAGE_SIZE = 20;

const parseCoursePayload = (payload: unknown): Course | null => {
    const root = (payload as Record<string, unknown>)?.data ?? payload;
    const rootRecord = (root as Record<string, unknown>) ?? {};

    const course =
        (rootRecord.course as Course | undefined) ??
        ((rootRecord.data as Record<string, unknown> | undefined)?.course as Course | undefined) ??
        (root as Course);

    return course?.course_id ? course : null;
};

const parseAssignmentListPayload = (payload: unknown): Assignment[] => {
    const root = (payload as Record<string, unknown>)?.data ?? payload;
    const rootRecord = (root as Record<string, unknown>) ?? {};

    const nested = rootRecord.data as Record<string, unknown> | undefined;

    const assignmentList =
        (rootRecord.course as Assignment[] | undefined) ??
        (rootRecord.assignments as Assignment[] | undefined) ??
        (nested?.course as Assignment[] | undefined) ??
        (nested?.assignments as Assignment[] | undefined) ??
        (Array.isArray(root) ? (root as Assignment[]) : []);

    return Array.isArray(assignmentList) ? assignmentList : [];
};

const isImportSuccess = (payload: unknown): boolean => {
    if (!payload || typeof payload !== 'object') {
        return false;
    }

    const root = payload as Record<string, unknown>;
    const nested = root.data as Record<string, unknown> | undefined;

    if (typeof root.success === 'boolean') {
        return root.success;
    }

    if (typeof nested?.success === 'boolean') {
        return nested.success;
    }

    return false;
};

const parseStudentListPayload = (payload: unknown): StudentListItem[] => {
    const root = (payload as Record<string, unknown>) ?? {};
    const nested = (root.data as Record<string, unknown> | undefined) ?? {};

    const studentList =
        (root.course as unknown[] | undefined) ??
        (root.students as unknown[] | undefined) ??
        (nested.course as unknown[] | undefined) ??
        (nested.students as unknown[] | undefined) ??
        (Array.isArray(payload) ? payload : []);

    if (!Array.isArray(studentList)) {
        return [];
    }

    return studentList
        .map((student) => {
            const item = (student as Record<string, unknown>) ?? {};
            const userId = item.user_id;
            const studentCode = item.user_code;
            const name = item.name;
            const email = item.email;

            return {
                id: String(userId ?? ''),
                studentId: String(studentCode ?? ''),
                name: String(name ?? ''),
                email: String(email ?? ''),
            } satisfies StudentListItem;
        })
        .filter((student) => student.id && student.studentId && student.name && student.email);
};

export function CourseStudentList() {
    const { course_id } = useParams();

    const [course, setCourse] = useState<Course | null>(null);
    const [students, setStudents] = useState<StudentListItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [isLoadingCourse, setIsLoadingCourse] = useState(false);
    const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);
    const [isLoadingStudents, setIsLoadingStudents] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [assignments, setAssignments] = useState<Assignment[]>([]);

    const fetchStudents = async (silent = false) => {
        if (!course_id) {
            setStudents([]);
            return;
        }

        if (!silent) {
            setIsLoadingStudents(true);
        }

        try {
            const response = await getCourseStudents(course_id);
            const parsedStudents = parseStudentListPayload(response);
            setStudents(parsedStudents);
        } catch (error) {
            console.error('Error fetching students for course:', error);
            setStudents([]);
            if (!silent) {
                toast.error('Failed to load student list.');
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

        fetchStudents();
    }, [course_id]);

    useEffect(() => {
        if (!course_id) {
            return;
        }

        const fetchAssignments = async () => {
            setIsLoadingAssignments(true);
            try {
                const response = await getAssignmentsForCourse(course_id, 1, 100, '');
                const assignmentList = parseAssignmentListPayload(response);
                setAssignments(assignmentList);
            } catch (error) {
                console.error('Error fetching assignments for student list:', error);
                setAssignments([]);
                toast.error('Failed to load assignment columns.');
            } finally {
                setIsLoadingAssignments(false);
            }
        };

        fetchAssignments();
    }, [course_id]);

    const filteredStudents = useMemo(() => {
        const normalizedQuery = searchQuery.trim().toLowerCase();

        if (!normalizedQuery) {
            return students;
        }

        return students.filter(
            (student) =>
                student.name.toLowerCase().includes(normalizedQuery) ||
                student.studentId.toLowerCase().includes(normalizedQuery) ||
                student.email.toLowerCase().includes(normalizedQuery)
        );
    }, [students, searchQuery]);

    const totalPages = Math.max(1, Math.ceil(filteredStudents.length / PAGE_SIZE));

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    const pagedStudents = useMemo(() => {
        const startIndex = (currentPage - 1) * PAGE_SIZE;
        return filteredStudents.slice(startIndex, startIndex + PAGE_SIZE);
    }, [currentPage, filteredStudents]);

    const handleImportStudents = async ({ file, rows }: { file: File; rows: ImportStudentRow[] }) => {
        if (!course_id) {
            toast.error('Course is not selected.');
            throw new Error('Missing course id');
        }

        try {
            const importResult = await importCourseStudents(course_id, file);

            if (!isImportSuccess(importResult)) {
                throw new Error('Import API returned unsuccessful status.');
            }

            await fetchStudents(true);
            setCurrentPage(1);
            toast.success(`Imported ${rows.length} students successfully.`);
        } catch (error) {
            console.error('Import students failed:', error);
            toast.error('Import failed. Please check data and try again.');
            throw error;
        }
    };

    const breadcrumbItems = [
        { label: 'Courses', href: '/lecturer/courses' },
        { label: course?.name || 'Course', href: course ? `/lecturer/courses/${course.course_id}/assignments` : '#' },
        { label: 'Student List' },
    ];

    return (
        <div className="space-y-6">
            <Breadcrumb items={breadcrumbItems} />

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2>Student List</h2>
                    <p className="text-sm text-gray-600">
                        {course?.course_code}
                    </p>
                </div>

                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => window.open('/sample-student-list.xlsx')}>
                        <Download className="h-4 w-4 mr-2" />
                        Template
                    </Button>
                    <Button onClick={() => setIsImportOpen(true)}>
                        <Upload className="h-4 w-4 mr-2" />
                        Import Students
                    </Button>
                </div>
            </div>

            <ImportExcelModal open={isImportOpen} onOpenChange={setIsImportOpen} onImport={handleImportStudents} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Total Students</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl">{students.length}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Showing Results</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl text-blue-600">{filteredStudents.length}</div>
                    </CardContent>
                </Card>
            </div>

            <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search students by name, ID, or email..."
                className="max-w-md"
            />

            <Card>
                <CardHeader>
                    <CardTitle>Student List</CardTitle>
                    <CardDescription>
                        {isLoadingCourse
                            ? 'Loading course information...'
                            : isLoadingStudents
                                ? 'Loading students...'
                                : isLoadingAssignments
                                    ? 'Loading assignments...'
                                    : 'Imported students for this course'}
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-48">Student ID</TableHead>
                                    <TableHead className="w-64">Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    {assignments.map((assignment) => (
                                        <TableHead key={assignment.assignment_id} className="text-center min-w-35">
                                            {assignment.title}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoadingStudents ? (
                                    <TableRow>
                                        <TableCell colSpan={3 + assignments.length} className="py-8">
                                            <div className="flex items-center justify-center gap-2 text-gray-500">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                <span>Loading student list...</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : pagedStudents.length > 0 ? (
                                    pagedStudents.map((student) => (
                                        <TableRow key={student.id}>
                                            <TableCell className="text-gray-600">{student.studentId}</TableCell>
                                            <TableCell>{student.name}</TableCell>
                                            <TableCell className="text-gray-600 text-sm">{student.email}</TableCell>
                                            {assignments.map((assignment) => {
                                                const score = student.assignmentScores?.[assignment.assignment_id];
                                                return (
                                                    <TableCell key={assignment.assignment_id} className="text-center">
                                                        {typeof score === 'number' ? score : '-'}
                                                    </TableCell>
                                                );
                                            })}
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={3 + assignments.length} className="text-center text-gray-500 py-8">
                                            {searchQuery.trim()
                                                ? `No students found matching "${searchQuery}".`
                                                : 'No student data yet. Please import the list to get started.'}
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
