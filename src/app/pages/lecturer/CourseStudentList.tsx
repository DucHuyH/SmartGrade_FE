import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router';
import { Download, Upload, Users } from 'lucide-react';
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
import { getCourseDetails, importCourseStudents } from '../../services/lecturer/courseService';

type StudentListItem = {
    id: string;
    studentId: string;
    name: string;
    email: string;
    assignmentScores?: Record<string, number | null>;
};

const PAGE_SIZE = 20;

const mockStudentsByCourse: Record<string, StudentListItem[]> = {
    CS301: [
        {
            id: 'S001',
            studentId: '20230000001',
            name: 'Emma Wilson',
            email: 'emma.wilson@university.edu',
        },
        {
            id: 'S002',
            studentId: '20230000002',
            name: 'Michael Chen',
            email: 'michael.chen@university.edu',
        },
        {
            id: 'S003',
            studentId: '20230000003',
            name: 'Sarah Johnson',
            email: 'sarah.johnson@university.edu',
        },
        {
            id: 'S004',
            studentId: '20230000004',
            name: 'David Kim',
            email: 'david.kim@university.edu',
        },
    ],
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

export function CourseStudentList() {
    const { course_id } = useParams();

    const [course, setCourse] = useState<Course | null>(null);
    const [students, setStudents] = useState<StudentListItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [isLoadingCourse, setIsLoadingCourse] = useState(false);
    const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [assignments, setAssignments] = useState<Assignment[]>([]);

    useEffect(() => {
        setStudents(mockStudentsByCourse.CS301 ?? []);
    }, []);

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

    const handleImportStudents = async (importedRows: ImportStudentRow[]) => {
        if (!course_id) {
            toast.error('Course is not selected.');
            throw new Error('Missing course id');
        }

        try {
            await importCourseStudents(
                course_id,
                importedRows.map((row) => ({
                    student_id: row.studentId,
                    name: row.name,
                    email: row.email,
                }))
            );

            const importedStudents: StudentListItem[] = importedRows.map((row, index) => ({
                id: `IMP-${Date.now()}-${index}`,
                studentId: row.studentId,
                name: row.name,
                email: row.email,
            }));

            setStudents((previous) => {
                const byStudentId = new Map<string, StudentListItem>();

                previous.forEach((student) => {
                    byStudentId.set(student.studentId, student);
                });

                importedStudents.forEach((student) => {
                    byStudentId.set(student.studentId, student);
                });

                return Array.from(byStudentId.values());
            });

            setCurrentPage(1);
            toast.success(`Imported ${importedRows.length} students successfully.`);
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
                    <h2>Student List - {course?.name}</h2>
                    <p className="text-sm text-gray-600">
                        {course?.course_code} - {course?.semester} {course?.academic_year}
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
                                {pagedStudents.map((student) => (
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
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                </CardContent>
            </Card>

            {filteredStudents.length === 0 && students.length > 0 && (
                <div className="text-center py-12 text-gray-500">No students found matching "{searchQuery}"</div>
            )}

            {students.length === 0 && (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 mb-4">No students enrolled yet</p>
                        <p className="text-sm text-gray-400 mb-4">Import a student list to get started</p>
                        <Button onClick={() => setIsImportOpen(true)}>
                            <Upload className="h-4 w-4 mr-2" />
                            Import Students
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
