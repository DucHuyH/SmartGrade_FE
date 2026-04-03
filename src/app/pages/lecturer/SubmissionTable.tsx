import { useEffect, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Breadcrumb } from '../../components/Breadcrumb';
import { Download, Loader2, Sparkles } from 'lucide-react';
import { Assignment } from '../../../model/assignment';
import { Course } from '../../../model';
import { getCourseDetails } from '../../services/lecturer/courseService';
import { getAssignmentDetails, getAssignmentSubmissions, LecturerSubmission } from '../../services/lecturer/assignmentService';
import { toast } from 'react-toastify';

const parseCoursePayload = (payload: unknown): Course | null => {
    const root = (payload as Record<string, unknown>)?.data ?? payload;
    const rootRecord = (root as Record<string, unknown>) ?? {};

    const course =
        (rootRecord.course as Course | undefined) ??
        ((rootRecord.data as Record<string, unknown> | undefined)?.course as Course | undefined) ??
        (root as Course);

    return course?.course_id ? course : null;
};

export function SubmissionTable() {
    const { course_id, assignment_id } = useParams();
    const location = useLocation();
    const pageState = (location.state as { courseTitle?: string; assignmentTitle?: string; dueDate?: string } | null) ?? null;
    const [course, setCourse] = useState<Course | null>(null);
    const [assignment, setAssignment] = useState<Assignment | null>(null);
    const [submissions, setSubmissions] = useState<LecturerSubmission[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [aiGrading, setAiGrading] = useState(false);

    useEffect(() => {
        if (!course_id || !assignment_id) {
            return;
        }

        const fetchPageData = async () => {
            setIsLoading(true);
            try {
                const [coursePayload, assignmentPayload, submissionList] = await Promise.all([
                    getCourseDetails(course_id),
                    getAssignmentDetails(assignment_id),
                    getAssignmentSubmissions(assignment_id),
                ]);

                setCourse(parseCoursePayload(coursePayload));
                setAssignment(assignmentPayload);
                setSubmissions(submissionList);
            } catch (error) {
                console.error('Error loading submission page data:', error);
                toast.error('Failed to load submissions data.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchPageData();
    }, [course_id, assignment_id]);

    const handleAIGrade = () => {
        setAiGrading(true);
        toast.info('AI grading endpoint is not integrated yet.');
        setTimeout(() => setAiGrading(false), 600);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'not_submitted':
                return <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">Not Submitted</Badge>;
            case 'pending':
                return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Pending</Badge>;
            case 'graded':
                return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Graded</Badge>;
            default:
                return <Badge>{status}</Badge>;
        }
    };

    const displayCourseTitle = pageState?.courseTitle || course?.name || 'Course';
    const displayAssignmentTitle = pageState?.assignmentTitle || assignment?.title || 'Assignment Submissions';
    const displayDueDate = assignment?.due_date || pageState?.dueDate || '';

    const stats = useMemo(() => {
        const totalStudents = assignment?.enrolled_count ?? submissions.length;
        const notSubmitted = submissions.filter((item) => item.status === 'not_submitted').length;
        const pending = submissions.filter((item) => item.status === 'pending').length;
        const graded = submissions.filter((item) => item.status === 'graded').length;

        return {
            totalStudents,
            notSubmitted,
            pending,
            graded,
        };
    }, [assignment, submissions]);

    // const sortedSubmissions = useMemo(() => {
    //     return [...submissions].sort((left, right) => {
    //         const leftTime = left.submitted_at ? new Date(left.submitted_at).getTime() : Number.POSITIVE_INFINITY;
    //         const rightTime = right.submitted_at ? new Date(right.submitted_at).getTime() : Number.POSITIVE_INFINITY;

    //         if (leftTime !== rightTime) {
    //             return leftTime - rightTime;
    //         }

    //         return left.student_name.localeCompare(right.student_name);
    //     });
    // }, [submissions]);

    // Build breadcrumb items
    const breadcrumbItems = [];
    if (course_id && assignment_id) {
        breadcrumbItems.push(
            { label: 'Courses', href: '/lecturer/courses' },
            { label: displayCourseTitle, href: `/lecturer/courses/${course_id}/assignments` },
            { label: displayAssignmentTitle }
        );
    }

    return (
        <div className="space-y-6">
            {breadcrumbItems.length > 0 && <Breadcrumb items={breadcrumbItems} />}

            <div className="flex justify-between items-center">
                <div>
                    <h2>Assignment Submissions</h2>
                    <p className="text-sm text-gray-600">Review and grade student submissions</p>
                </div>
                <Button onClick={handleAIGrade} disabled={aiGrading}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    {aiGrading ? 'AI Grading...' : 'Grade All with AI'}
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <div>
                        <CardTitle>{displayAssignmentTitle}</CardTitle>
                        <CardDescription className="flex items-center gap-3 mt-1">
                            <span>{displayCourseTitle}</span>
                            {displayDueDate && (
                                <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                                    Due: {new Date(displayDueDate).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric',
                                    })}
                                </Badge>
                            )}
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="py-10 flex items-center justify-center gap-2 text-sm text-gray-600">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading submissions...
                        </div>
                    ) : (
                        <>
                            {/* Summary Stats */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                                <div>
                                    <div className="text-sm text-gray-600">Total Students</div>
                                    <div className="text-2xl">{stats.totalStudents}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-gray-600">Not Submitted</div>
                                    <div className="text-2xl text-gray-600">{stats.notSubmitted}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-gray-600">Pending</div>
                                    <div className="text-2xl text-amber-600">{stats.pending}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-gray-600">Graded</div>
                                    <div className="text-2xl text-green-600">{stats.graded}</div>
                                </div>
                            </div>

                            {/* Submissions Table */}
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Student</TableHead>
                                            <TableHead>Student Code</TableHead>
                                            <TableHead>Submitted At</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Grade</TableHead>
                                            <TableHead>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {submissions.map((submission) => {
                                            const submissionStatus = submission.status;

                                            return (
                                                <TableRow key={submission.submission_id}>
                                                    <TableCell>{submission.student_name}</TableCell>
                                                    <TableCell className="text-gray-600">{submission.student_code || submission.student_id || '-'}</TableCell>
                                                    <TableCell>
                                                        {submission.submitted_at ? (
                                                            <span className="text-sm">
                                                                {new Date(submission.submitted_at).toLocaleString('en-US')}
                                                            </span>
                                                        ) : (
                                                            <span className="text-sm text-gray-400">Not submitted</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>{getStatusBadge(submissionStatus)}</TableCell>
                                                    <TableCell>
                                                        {submission.final_score !== null ? (
                                                            <span className="font-medium">
                                                                {submission.final_score}
                                                                {submission.max_score !== null ? `/${submission.max_score}` : assignment?.max_score ? `/${assignment.max_score}` : ''}
                                                            </span>
                                                        ) : submission.status === 'not_submitted' ? (
                                                            <span className="text-gray-400">-</span>
                                                        ) : (
                                                            <span className="text-gray-400">-</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex gap-2">
                                                            {submission.file_url && (
                                                                <a href={submission.file_url} target="_blank" rel="noreferrer">
                                                                    <Button variant="outline" size="sm">
                                                                        <Download className="h-4 w-4" />
                                                                    </Button>
                                                                </a>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                            {submissions.length === 0 && (
                                <p className="text-sm text-gray-500 text-center py-8">No submissions found for this assignment.</p>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}