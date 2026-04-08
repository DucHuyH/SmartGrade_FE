import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Breadcrumb } from '../../components/Breadcrumb';
import { SearchBar } from '../../components/SearchBar';
import { Pagination } from '../../components/ui/pagination';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Calendar, FileText, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { Assignment } from '../../../model/assignment';
import { getAssignmentsForCourse } from '../../services/student/assignmentService';
import { Course } from '../../../model';
import { getStudentCourseDetails } from '../../services/student/courseService';

const DEFAULT_LIMIT = 10;

type PaginationState = {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    limit: number;
};

const DEFAULT_PAGINATION: PaginationState = {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    limit: DEFAULT_LIMIT,
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

const getDueMeta = (dueDate: string) => {
    const due = new Date(dueDate);

    if (Number.isNaN(due.getTime())) {
        return {
            text: 'Invalid due date',
            className: 'bg-slate-100 text-slate-700 hover:bg-slate-100',
        };
    }

    const now = new Date();
    const diffMs = due.getTime() - now.getTime();

    if (diffMs <= 0) {
        const overdueHours = Math.ceil(Math.abs(diffMs) / (1000 * 60 * 60));
        return {
            text: overdueHours > 0 ? `Overdue by ${overdueHours}h` : 'Overdue',
            className: 'bg-red-100 text-red-700 hover:bg-red-100',
        };
    }

    const hoursLeft = Math.ceil(diffMs / (1000 * 60 * 60));

    if (hoursLeft < 24) {
        return {
            text: `${hoursLeft}h left`,
            className: 'bg-red-100 text-red-700 hover:bg-red-100',
        };
    }

    const daysLeft = Math.ceil(hoursLeft / 24);

    return {
        text: `${daysLeft} days left`,
        className: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
    };
};

const normalizeAllowedFileTypes = (value: unknown): string => {
    if (Array.isArray(value)) {
        return value.join(', ');
    }

    if (typeof value === 'string' && value.trim()) {
        return value;
    }

    return 'N/A';
};

export function StudentAssignments() {
    const { course_id } = useParams();
    const location = useLocation();
    const navState = (location.state as { courseName?: string; courseCode?: string; activeTab?: 'pending' | 'submitted' } | null) ?? null;

    const [course, setCourse] = useState<Course | null>(null);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const [isLoadingCourse, setIsLoadingCourse] = useState(false);
    const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);
    const [activeTab, setActiveTab] = useState<'pending' | 'submitted'>(navState?.activeTab ?? 'pending');
    const [pagination, setPagination] = useState<PaginationState>(DEFAULT_PAGINATION);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            setDebouncedSearchQuery(searchQuery.trim());
        }, 400);

        return () => window.clearTimeout(timeoutId);
    }, [searchQuery]);

    useEffect(() => {
        setPagination((prev) => ({ ...prev, currentPage: 1 }));
    }, [debouncedSearchQuery]);

    useEffect(() => {
        if (!course_id) {
            return;
        }

        const fetchCourse = async () => {
            setIsLoadingCourse(true);
            try {
                const response = await getStudentCourseDetails(course_id);
                setCourse(parseCoursePayload(response));
            } catch (error) {
                console.error('Error fetching course details:', error);
                setCourse(null);
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
                const result = await getAssignmentsForCourse(
                    course_id,
                    pagination.currentPage,
                    pagination.limit,
                    debouncedSearchQuery
                );

                setAssignments(result.assignments);
                setPagination((prev) => ({
                    ...prev,
                    currentPage: result.pagination.currentPage,
                    totalPages: result.pagination.totalPages,
                    totalItems: result.pagination.totalItems,
                    limit: result.pagination.limit,
                }));
            } catch (error) {
                console.error('Error fetching assignments:', error);
                setAssignments([]);
                setPagination((prev) => ({ ...prev, totalItems: 0, totalPages: 1 }));
                toast.error('Failed to load assignments.');
            } finally {
                setIsLoadingAssignments(false);
            }
        };

        fetchAssignments();
    }, [course_id, pagination.currentPage, pagination.limit, debouncedSearchQuery]);

    if (!course_id) {
        return <div className="space-y-6"><p>Course ID is missing.</p></div>;
    }

    const breadcrumbItems = [
        { label: 'My Courses', href: '/student/courses' },
        { label: course?.name ?? navState?.courseName ?? 'Assignments' },
    ];

    const pendingAssignments = assignments.filter((assignment) => !assignment.has_submitted);
    const submittedAssignments = assignments.filter((assignment) => assignment.has_submitted);
    const visibleAssignments = activeTab === 'submitted' ? submittedAssignments : pendingAssignments;

    return (
        <div className="space-y-6">
            <Breadcrumb items={breadcrumbItems} />

            <div>
                <h2>{course?.name ?? navState?.courseName ?? 'My Assignments'}</h2>
                <p className="text-sm text-gray-600">{course?.course_code ?? navState?.courseCode ?? course_id}</p>
            </div>

            {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Total Assignments</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl">{pagination.totalItems}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Current Page</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl text-blue-600">{pagination.currentPage}</div>
                    </CardContent>
                </Card>
            </div> */}

            <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search assignments by title..."
                className="max-w-md"
            />

            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'pending' | 'submitted')}>
                <TabsList>
                    <TabsTrigger value="pending">Not Submitted ({pendingAssignments.length})</TabsTrigger>
                    <TabsTrigger value="submitted">Submitted ({submittedAssignments.length})</TabsTrigger>
                </TabsList>
            </Tabs>

            <div className="grid grid-cols-1 gap-6">
                {isLoadingAssignments || isLoadingCourse ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-4">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                        <p className="text-black font-semibold text-lg">Loading assignments...</p>
                    </div>
                ) : visibleAssignments.length > 0 ? (
                    visibleAssignments.map((assignment) => {
                        const dueMeta = getDueMeta(assignment.due_date);

                        if (assignment.has_submitted) {
                            return (
                                <Card key={assignment.assignment_id} className="border-emerald-200 bg-emerald-50/40 hover:shadow-md transition-shadow">
                                    <CardHeader>
                                        <div className="flex justify-between items-start gap-3">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                                                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Submitted</Badge>
                                                </div>
                                                <CardTitle>{assignment.title}</CardTitle>
                                                <CardDescription className="flex flex-wrap items-center gap-4 mt-2">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="h-4 w-4" />
                                                        Submitted:{' '}
                                                        {assignment.submission_submitted_at
                                                            ? new Date(assignment.submission_submitted_at).toLocaleString('en-US', {
                                                                month: 'short',
                                                                day: 'numeric',
                                                                year: 'numeric',
                                                                hour: '2-digit',
                                                                minute: '2-digit',
                                                            })
                                                            : 'N/A'}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <FileText className="h-4 w-4" />
                                                        Attempt: {assignment.submission_attempt_count ?? 1}
                                                    </span>
                                                </CardDescription>
                                            </div>
                                            <Badge className={dueMeta.className}>{dueMeta.text}</Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <p className="text-sm text-gray-600 line-clamp-2">
                                            {assignment.description || 'No description provided.'}
                                        </p>

                                        {!assignment.has_graded ? (
                                            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                                                Submitted. Waiting for lecturer grading and feedback.
                                            </div>
                                        ) : null}

                                        {assignment.has_graded ? (
                                            <Link
                                                to={`/student/courses/${course_id}/assignments/${assignment.assignment_id}`}
                                                state={{
                                                    courseName: course?.name ?? navState?.courseName,
                                                    courseCode: course?.course_code ?? navState?.courseCode,
                                                }}
                                                className="block"
                                            >
                                                <Button className="w-full">View Grade and Feedback</Button>
                                            </Link>
                                        ) : (
                                            <Button className="w-full" disabled>
                                                Grade Pending
                                            </Button>
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        }

                        return (
                            <Card key={assignment.assignment_id} className="hover:shadow-md transition-shadow">
                                <CardHeader>
                                    <div className="flex justify-between items-start gap-3">
                                        <div className="flex-1">
                                            <CardTitle>{assignment.title}</CardTitle>
                                            <CardDescription className="flex items-center gap-4 mt-2">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="h-4 w-4" />
                                                    Due:{' '}
                                                    {assignment.due_date
                                                        ? new Date(assignment.due_date).toLocaleString('en-US', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            year: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                        })
                                                        : 'N/A'}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <FileText className="h-4 w-4" />
                                                    Max score: {assignment.max_score}
                                                </span>
                                            </CardDescription>
                                        </div>
                                        <Badge className={dueMeta.className}>{dueMeta.text}</Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <p className="text-sm text-gray-600 line-clamp-2">
                                        {assignment.description || 'No description provided.'}
                                    </p>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-gray-600">
                                        <div>
                                            <span className="text-gray-500">File Size:</span>{' '}
                                            {assignment.max_file_size_mb}MB
                                        </div>
                                        <div>
                                            <span className="text-gray-500">Types:</span>{' '}
                                            {normalizeAllowedFileTypes(assignment.allowed_file_types)}
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <Link
                                            to={`/student/courses/${course_id}/assignments/${assignment.assignment_id}`}
                                            state={{
                                                courseName: course?.name ?? navState?.courseName,
                                                courseCode: course?.course_code ?? navState?.courseCode,
                                            }}
                                            className="flex-1"
                                        >
                                            <Button variant="outline" className="w-full">View Details</Button>
                                        </Link>
                                        <Link
                                            to={`/student/submit/${assignment.assignment_id}`}
                                            state={{
                                                assignment,
                                                courseName: course?.name ?? navState?.courseName,
                                                courseCode: course?.course_code ?? navState?.courseCode,
                                                backPath: `/student/courses/${course_id}/assignments`,
                                            }}
                                            className="flex-1"
                                        >
                                            <Button className="w-full">Submit Assignment</Button>
                                        </Link>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })
                ) : (
                    <div className="text-center py-12 text-gray-500">
                        {debouncedSearchQuery
                            ? `No assignments found matching "${searchQuery}"`
                            : activeTab === 'submitted'
                                ? 'No submitted assignments yet.'
                                : 'No pending assignments available for this course.'}
                    </div>
                )}
            </div>

            {!isLoadingAssignments && pagination.totalPages > 1 && (
                <Pagination
                    currentPage={pagination.currentPage}
                    totalPages={pagination.totalPages}
                    onPageChange={(page) => setPagination((prev) => ({ ...prev, currentPage: page }))}
                />
            )}
        </div>
    );
}
