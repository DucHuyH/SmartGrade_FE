import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Breadcrumb } from '../../components/Breadcrumb';
import { Download, Eye, Loader2, Megaphone, Sparkles } from 'lucide-react';
import { Assignment } from '../../../model/assignment';
import { Course } from '../../../model';
import { getCourseDetails } from '../../services/lecturer/courseService';
import {
    getAssignmentDetails,
    getAssignmentSubmissions,
    LecturerSubmission,
    publishSubmissionGrades,
    gradeSubmissionsWithAI,
} from '../../services/lecturer/assignmentService';
import { toast } from 'react-toastify';
import { useGradingProgress } from '../../../hooks/useGradingProgress';
import { GradingProgressModal } from '../../components/GradingProgressModal';

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
    const navigate = useNavigate();
    const location = useLocation();
    const pageState = (location.state as { courseTitle?: string; assignmentTitle?: string; dueDate?: string } | null) ?? null;
    const [course, setCourse] = useState<Course | null>(null);
    const [assignment, setAssignment] = useState<Assignment | null>(null);
    const [submissions, setSubmissions] = useState<LecturerSubmission[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [aiGrading, setAiGrading] = useState(false);
    const [publishingGrades, setPublishingGrades] = useState(false);
    const [selectedSubmissionIds, setSelectedSubmissionIds] = useState<Set<string>>(new Set());
    const [pendingAction, setPendingAction] = useState<'ai' | 'publish' | null>(null);
    const [showGradingProgress, setShowGradingProgress] = useState(false);

    // Socket.io grading progress tracking
    const {
        total,
        completed,
        failed,
        isActive,
        currentSubmissionId,
        errors,
        progressPercentage,
        resetProgress,
    } = useGradingProgress('lecturer');

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
        if (selectedSubmissionIds.size === 0) {
            toast.warning('Please select at least one submission before using this action.');
            return;
        }

        const hasNotSubmittedSelection = submissions.some(
            (submission) => selectedSubmissionIds.has(submission.submission_id) && submission.status === 'not_submitted'
        );

        if (hasNotSubmittedSelection) {
            toast.warning('Submissions with status Not Submitted cannot be graded with AI.');
            return;
        }

        setPendingAction('ai');
    };

    const handlePublishGrade = () => {
        if (selectedSubmissionIds.size === 0) {
            toast.warning('Please select at least one submission before using this action.');
            return;
        }

        const hasInvalidStatusSelection = submissions.some(
            (submission) => selectedSubmissionIds.has(submission.submission_id) && submission.status !== 'graded'
        );

        if (hasInvalidStatusSelection) {
            toast.warning('Only submissions with status Graded can be published.');
            return;
        }

        setPendingAction('publish');
    };

    const handleConfirmAction = async () => {
        if (pendingAction === 'ai') {
            if (!assignment_id) {
                toast.error('Assignment information is missing.');
                setPendingAction(null);
                return;
            }

            setAiGrading(true);
            resetProgress();
            setShowGradingProgress(true);

            try {
                const selectedIds = Array.from(selectedSubmissionIds);
                console.log('Starting AI grading for submission IDs:', selectedIds);
                await gradeSubmissionsWithAI(assignment_id, selectedIds);
                toast.info(`Starting AI grading for ${selectedIds.length} submission(s)...`);
                setSelectedSubmissionIds(new Set());
            } catch (error) {
                console.error('Error starting AI grading:', error);
                toast.error('Failed to start AI grading. Please try again.');
                setShowGradingProgress(false);
                setAiGrading(false);
            }
        }

        if (pendingAction === 'publish') {
            if (!assignment_id) {
                toast.error('Assignment information is missing.');
                setPendingAction(null);
                return;
            }

            const selectedIds = Array.from(selectedSubmissionIds);
            setPublishingGrades(true);

            try {
                await publishSubmissionGrades(selectedIds);
                toast.success(`Published grades for ${selectedIds.length} submission${selectedIds.length === 1 ? '' : 's'}.`);

                const refreshedSubmissions = await getAssignmentSubmissions(assignment_id);
                setSubmissions(refreshedSubmissions);
                setSelectedSubmissionIds(new Set());
            } catch (error) {
                console.error('Error publishing grades:', error);
                toast.error('Failed to publish grades. Please try again.');
            } finally {
                setPublishingGrades(false);
            }
        }

        setPendingAction(null);
    };

    // Close grading progress modal when grading is complete
    useEffect(() => {
        if (!isActive && showGradingProgress && total > 0) {
            // Wait a bit before auto-closing to show completion state
            const timer = setTimeout(() => {
                // Optionally auto-close after a delay, or keep it open
                // setShowGradingProgress(false);
                // resetProgress();
                setAiGrading(false);
            }, 2000);

            return () => clearTimeout(timer);
        }
    }, [isActive, showGradingProgress, total, resetProgress]);

    useEffect(() => {
        if (!showGradingProgress || total <= 0) {
            return;
        }

        if (progressPercentage >= 100) {
            setShowGradingProgress(false);
            setAiGrading(false);

            const timer = setTimeout(() => {
                window.location.reload();
            }, 500);

            return () => clearTimeout(timer);
        }
    }, [showGradingProgress, total, progressPercentage]);

    const handleViewSubmission = (submission: LecturerSubmission) => {
        if (!course_id || !assignment_id || submission.status === 'not_submitted') {
            return;
        }

        navigate(
            `/lecturer/courses/${course_id}/assignments/${assignment_id}/submissions/${submission.submission_id}/ai-grading`,
            {
                state: {
                    courseTitle: displayCourseTitle,
                    assignmentTitle: displayAssignmentTitle,
                    submissionStatus: submission.status,
                    hasPublished: submission.has_published,
                    studentName: submission.student_name,
                    studentCode: submission.student_code || submission.student_id,
                    fileUrl: submission.file_url,
                    assignmentMaxScore: assignment?.max_score,
                },
            }
        );
    };

    const handleSelectAll = (checked: boolean) => {
        if (!checked) {
            setSelectedSubmissionIds(new Set());
            return;
        }

        setSelectedSubmissionIds(new Set(submissions.map((submission) => submission.submission_id)));
    };

    const handleSelectSubmission = (submissionId: string, checked: boolean) => {
        setSelectedSubmissionIds((prev) => {
            const next = new Set(prev);
            if (checked) {
                next.add(submissionId);
            } else {
                next.delete(submissionId);
            }
            return next;
        });
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

    const selectedCount = selectedSubmissionIds.size;
    const allSelected = submissions.length > 0 && selectedCount === submissions.length;
    const partiallySelected = selectedCount > 0 && selectedCount < submissions.length;
    const hasReachedGradingCompletion = total > 0 && (progressPercentage >= 100 || completed + failed >= total);

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
                <div className="flex items-center gap-2">
                    <Button
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={handlePublishGrade}
                        disabled={publishingGrades}
                    >
                        <Megaphone className="h-4 w-4 mr-2" />
                        {publishingGrades ? 'Publishing...' : 'Publish Grade'}
                    </Button>
                    <Button onClick={handleAIGrade} disabled={aiGrading}>
                        <Sparkles className="h-4 w-4 mr-2" />
                        {aiGrading ? 'AI Grading...' : 'Grade All with AI'}
                    </Button>
                </div>
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
                                            <TableHead className="w-12">
                                                <input
                                                    type="checkbox"
                                                    className="h-4 w-4 accent-blue-600"
                                                    checked={allSelected}
                                                    ref={(checkbox) => {
                                                        if (checkbox) {
                                                            checkbox.indeterminate = partiallySelected;
                                                        }
                                                    }}
                                                    onChange={(event) => handleSelectAll(event.target.checked)}
                                                    aria-label="Select all submissions"
                                                />
                                            </TableHead>
                                            <TableHead>Student ID</TableHead>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Submitted At</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Grade</TableHead>
                                            <TableHead>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {submissions.map((submission) => {
                                            const submissionStatus = submission.status;
                                            // Table row for each submission with unique submission_id key

                                            return (
                                                <TableRow key={submission.submission_id}>
                                                    <TableCell>
                                                        <input
                                                            type="checkbox"
                                                            className="h-4 w-4 accent-blue-600"
                                                            checked={selectedSubmissionIds.has(submission.submission_id)}
                                                            onChange={(event) => handleSelectSubmission(submission.submission_id, event.target.checked)}
                                                            aria-label={`Select submission of ${submission.student_name}`}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="text-gray-600">{submission.student_code || submission.student_id || '-'}</TableCell>
                                                    <TableCell>{submission.student_name}</TableCell>

                                                    <TableCell>
                                                        {submission.submitted_at ? (
                                                            <span className="text-sm">
                                                                {new Date(submission.submitted_at).toLocaleString('en-US')}
                                                            </span>
                                                        ) : (
                                                            <span className="text-sm text-gray-400">Not submitted</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            {getStatusBadge(submissionStatus)}
                                                            {submission.has_published && (
                                                                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                                                                    Published
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </TableCell>
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
                                                            {submission.status !== 'not_submitted' && (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handleViewSubmission(submission)}
                                                                >
                                                                    <Eye className="h-4 w-4 mr-1" />
                                                                    View
                                                                </Button>
                                                            )}
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

            <Dialog open={pendingAction !== null} onOpenChange={(open) => !open && setPendingAction(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {pendingAction === 'publish' ? 'Confirm Publish Grade' : 'Confirm Grade All with AI'}
                        </DialogTitle>
                        <DialogDescription>
                            You selected {selectedCount} submission{selectedCount === 1 ? '' : 's'}. Do you want to continue?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPendingAction(null)}>
                            Cancel
                        </Button>
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleConfirmAction}>
                            Confirm
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Grading Progress Modal */}
            <GradingProgressModal
                isOpen={showGradingProgress}
                onOpenChange={(open) => {
                    if (!open) {
                        const shouldReload = hasReachedGradingCompletion;
                        setShowGradingProgress(false);
                        setAiGrading(false);

                        if (shouldReload) {
                            window.location.reload();
                        }
                    }
                }}
                total={total}
                completed={completed}
                failed={failed}
                isActive={isActive}
                progressPercentage={progressPercentage}
                currentSubmissionId={currentSubmissionId}
                errors={errors}
            />
        </div>
    );
}