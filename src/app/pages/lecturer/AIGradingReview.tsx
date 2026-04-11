import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Separator } from '../../components/ui/separator';
import { Badge } from '../../components/ui/badge';
import { Breadcrumb } from '../../components/Breadcrumb';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { FileText, Loader2, Save, User, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'react-toastify';
import { Assignment } from '../../../model/assignment';
import {
    getAssignmentDetails,
    getAssignmentSubmissions,
    getSubmissionGrade,
    LecturerSubmission,
    publishSubmissionGrades,
    saveSubmissionGrade,
    SubmissionGradeCriterion,
} from '../../services/lecturer/assignmentService';

type GradingRubricRow = {
    id: string;
    criteria: string;
    maxPoints: number;
    score: number;
    feedback: string;
};

type PageLocationState = {
    courseTitle?: string;
    assignmentTitle?: string;
    submissionStatus?: string;
    hasPublished?: boolean;
    studentName?: string;
    studentCode?: string;
    fileUrl?: string | null;
    assignmentMaxScore?: number;
} | null;

const getStatusCode = (error: unknown): number | undefined => {
    const maybeError = error as { response?: { status?: number } };
    return maybeError.response?.status;
};

const normalizeMaxScore = (value: unknown): number => {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }

    return 0;
};

const buildRubricRows = (
    assignment: Assignment | null,
    gradeCriteria: SubmissionGradeCriterion[]
): GradingRubricRow[] => {
    const assignmentCriteria = assignment?.rubric?.criteria ?? [];

    if (assignmentCriteria.length > 0) {
        return assignmentCriteria.map((criterion) => {
            const matchedGrade = gradeCriteria.find(
                (item) => String(item.criteria_id) === String(criterion.criteria_id)
            );

            return {
                id: String(criterion.criteria_id),
                criteria: criterion.criteria_name,
                maxPoints: normalizeMaxScore(criterion.max_score),
                score: matchedGrade?.score ?? 0,
                feedback: matchedGrade?.feedback ?? '',
            };
        });
    }

    return gradeCriteria.map((criterion, index) => ({
        id: String(criterion.criteria_id ?? index),
        criteria: criterion.criteria_name || `Criteria ${index + 1}`,
        maxPoints: normalizeMaxScore(criterion.max_score),
        score: normalizeMaxScore(criterion.score),
        feedback: criterion.feedback,
    }));
};

export function AIGradingReview() {
    const { course_id, assignment_id, submission_id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const pageState = (location.state as PageLocationState) ?? null;
    const routeSubmissionId = submission_id ?? '';

    const [assignment, setAssignment] = useState<Assignment | null>(null);
    const [allSubmissions, setAllSubmissions] = useState<LecturerSubmission[]>([]);
    const [currentSubmission, setCurrentSubmission] = useState<LecturerSubmission | null>(null);
    const [rubrics, setRubrics] = useState<GradingRubricRow[]>([]);
    const [overallFeedback, setOverallFeedback] = useState('');
    const [manualFinalScore, setManualFinalScore] = useState<number>(0);
    const [gradeId, setGradeId] = useState<string | null>(null);
    const [submissionStatus, setSubmissionStatus] = useState<string>(
        String(pageState?.submissionStatus ?? 'pending').toLowerCase()
    );
    const [isRegrade, setIsRegrade] = useState<boolean>(Boolean(pageState?.hasPublished));
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!assignment_id || !routeSubmissionId) {
            return;
        }

        const loadData = async () => {
            setIsLoading(true);
            try {
                const [assignmentDetails, submissionList] = await Promise.all([
                    getAssignmentDetails(assignment_id),
                    getAssignmentSubmissions(assignment_id),
                ]);

                setAssignment(assignmentDetails);
                setAllSubmissions(submissionList);

                const matchedSubmission = submissionList.find(
                    (item) => String(item.submission_id) === String(routeSubmissionId)
                ) ?? null;

                if (matchedSubmission) {
                    setCurrentSubmission(matchedSubmission);
                    setSubmissionStatus(matchedSubmission.status);
                    setIsRegrade(matchedSubmission.has_published || Boolean(pageState?.hasPublished));
                    setManualFinalScore(0);
                }

                try {
                    const gradeDetails = await getSubmissionGrade(routeSubmissionId);
                    setGradeId(gradeDetails.grade_id);
                    setOverallFeedback(gradeDetails.feedback || '');
                    setRubrics(buildRubricRows(assignmentDetails, gradeDetails.criteria_scores));

                    if (gradeDetails.status) {
                        setSubmissionStatus(gradeDetails.status.toLowerCase());
                    }
                } catch (gradeError) {
                    if (getStatusCode(gradeError) !== 404) {
                        throw gradeError;
                    }

                    setGradeId(null);
                    setOverallFeedback('');
                    setManualFinalScore(0);
                    setRubrics(buildRubricRows(assignmentDetails, []));
                }
            } catch (error) {
                console.error('Error loading grading review data:', error);
                toast.error('Failed to load grading data.');
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [assignment_id, pageState?.hasPublished, routeSubmissionId]);

    const updateScore = (id: string, score: number) => {
        setRubrics((prev) =>
            prev.map((item) => {
                if (item.id !== id) {
                    return item;
                }

                const boundedScore = Number.isFinite(score)
                    ? Math.max(0, Math.min(score, item.maxPoints))
                    : 0;

                return {
                    ...item,
                    score: boundedScore,
                };
            })
        );
    };

    const updateFeedback = (id: string, feedback: string) => {
        setRubrics((prev) =>
            prev.map((item) =>
                item.id === id
                    ? {
                        ...item,
                        feedback,
                    }
                    : item
            )
        );
    };

    const totalScore = useMemo(() => {
        if (rubrics.length === 0) {
            return manualFinalScore;
        }
        return rubrics.reduce((sum, item) => sum + item.score, 0);
    }, [rubrics, manualFinalScore]);

    const totalMaxPoints = useMemo(() => {
        if (rubrics.length > 0) {
            return rubrics.reduce((sum, item) => sum + item.maxPoints, 0);
        }

        return assignment?.max_score ?? pageState?.assignmentMaxScore ?? 0;
    }, [assignment?.max_score, pageState?.assignmentMaxScore, rubrics]);

    const currentSubmissionIndex = useMemo(() => {
        if (!currentSubmission) return -1;
        return allSubmissions.findIndex(
            (item) => String(item.submission_id) === String(currentSubmission.submission_id)
        );
    }, [currentSubmission, allSubmissions]);

    const totalSubmissions = allSubmissions.length;
    const displayIndex = currentSubmissionIndex >= 0 ? currentSubmissionIndex + 1 : 0;

    const displayCourseTitle = pageState?.courseTitle || assignment?.course_name || 'Course';
    const displayAssignmentTitle = pageState?.assignmentTitle || assignment?.title || 'Assignment';
    const displayStudentName = currentSubmission?.student_name || pageState?.studentName || 'Student';
    const displayStudentCode =
        currentSubmission?.student_code ||
        currentSubmission?.student_id ||
        pageState?.studentCode ||
        '-';

    const canSave = submissionStatus !== 'not_submitted';
    const shouldPublishOnSave = isRegrade;

    const handleSave = async () => {
        if (!routeSubmissionId) {
            toast.error('Submission information is missing.');
            return;
        }

        if (!canSave) {
            toast.warning('Cannot save grade for a non-submitted item.');
            return;
        }

        if (totalScore > totalMaxPoints) {
            toast.warning(`Final score (${totalScore}) cannot exceed maximum score (${totalMaxPoints}).`);
            return;
        }

        setIsSaving(true);
        try {
            const criteriaScores = rubrics.length === 0 ? [] : rubrics.map((item) => ({
                criteria_id: item.id,
                score: item.score,
                feedback: item.feedback,
            }));

            const savedGrade = await saveSubmissionGrade(routeSubmissionId, {
                final_score: totalScore,
                feedback: overallFeedback,
                criteria_scores: criteriaScores,
            });

            console.log('Grade saved successfully:', savedGrade, 'for: ', assignment_id);

            setGradeId(savedGrade.grade_id);
            // setSubmissionStatus('graded');

            if (shouldPublishOnSave) {
                if (!routeSubmissionId) {
                    throw new Error('Submission id is missing.');
                }

                await publishSubmissionGrades([routeSubmissionId]);
                toast.success('Grade saved and published successfully.');
            } else {
                toast.success('Grade saved successfully.');
            }
        } catch (error) {
            console.error('Error saving grade:', error);
            toast.error('Failed to save grade.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        if (!course_id || !assignment_id) {
            navigate('/lecturer/courses');
            return;
        }

        navigate(`/lecturer/courses/${course_id}/assignments/${assignment_id}/submissions`);
    };

    const navigateToSubmission = (submission: LecturerSubmission) => {
        if (!course_id || !assignment_id) return;

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

    const handlePreviousSubmission = () => {
        if (currentSubmissionIndex > 0) {
            navigateToSubmission(allSubmissions[currentSubmissionIndex - 1]);
        }
    };

    const handleNextSubmission = () => {
        if (currentSubmissionIndex < totalSubmissions - 1) {
            navigateToSubmission(allSubmissions[currentSubmissionIndex + 1]);
        }
    };

    const submissionFileUrl = currentSubmission?.file_url || pageState?.fileUrl;

    const breadcrumbItems = [
        { label: 'Courses', href: '/lecturer/courses' },
        { label: displayCourseTitle, href: `/lecturer/courses/${course_id}/assignments` },
        { label: displayAssignmentTitle, href: `/lecturer/courses/${course_id}/assignments/${assignment_id}/submissions` },
        { label: 'AI Grading View' },
    ];

    return (
        <div className="space-y-6">
            <Breadcrumb items={breadcrumbItems} />

            {/* Submission Navigation */}
            {totalSubmissions > 0 && (
                <Card>
                    <CardContent className="pt-6 px-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handlePreviousSubmission}
                                disabled={currentSubmissionIndex <= 0}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-sm font-medium text-gray-600 min-w-fit">
                                {displayIndex} of {totalSubmissions}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleNextSubmission}
                                disabled={currentSubmissionIndex >= totalSubmissions - 1}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>

                        <Select value={currentSubmission?.submission_id ?? ''} onValueChange={(submissionId) => {
                            const submission = allSubmissions.find(
                                (item) => String(item.submission_id) === String(submissionId)
                            );
                            if (submission) {
                                navigateToSubmission(submission);
                            }
                        }}>
                            <SelectTrigger className="w-64">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {allSubmissions
                                    .filter((submission) => submission.status !== 'not_submitted')
                                    .map((submission) => (
                                        <SelectItem key={submission.submission_id} value={String(submission.submission_id)}>
                                            {submission.student_name} ({submission.student_code || submission.student_id})
                                        </SelectItem>
                                    ))}
                            </SelectContent>
                        </Select>
                    </CardContent>
                </Card>
            )}

            <div className="flex justify-between items-start gap-4 flex-wrap">
                <div>
                    <h2>AI Grading View</h2>
                    <p className="text-sm text-gray-600">Review, edit, and save grade feedback</p>
                </div>
                <div className="flex items-center gap-2">
                    {submissionStatus === 'pending' && (
                        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Pending</Badge>
                    )}
                    {submissionStatus === 'graded' && (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Graded</Badge>
                    )}
                    {isRegrade && (
                        <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Regrade Mode</Badge>
                    )}
                </div>
            </div>

            {isLoading ? (
                <Card>
                    <CardContent className="py-12 flex items-center justify-center gap-2 text-sm text-gray-600">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading grade details...
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <Card>
                            <CardHeader>
                                <div className="flex items-center gap-3 pb-3">
                                    <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                                        <User className="h-6 w-6 text-gray-600" />
                                    </div>
                                    <div>
                                        <CardTitle>{displayStudentName}</CardTitle>
                                        <CardDescription>
                                            {displayStudentCode} • {displayAssignmentTitle}
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Grading Rubrics</CardTitle>
                                <CardDescription>Lecturer can edit score and feedback per criterion</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {rubrics.length === 0 ? (
                                    <div className="space-y-4">
                                        <div className="flex items-end gap-3 p-4 bg-blue-50 rounded-lg">
                                            <div className="flex-1">
                                                <label className="text-sm font-medium text-gray-700">Final Score</label>
                                                <p className="text-xs text-gray-500 mt-1">Enter total score manually</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    type="number"
                                                    value={manualFinalScore}
                                                    onChange={(event) => setManualFinalScore(Number(event.target.value))}
                                                    className="w-20 text-center"
                                                    max={totalMaxPoints}
                                                    min={0}
                                                    disabled={!canSave}
                                                />
                                                <span className="text-sm text-gray-600 min-w-fit">/ {totalMaxPoints}</span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    rubrics.map((rubric, index) => (
                                        <div key={rubric.id}>
                                            {index > 0 && <Separator className="mb-6" />}
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-start">
                                                    <h4 className="text-sm">{rubric.criteria}</h4>
                                                    <div className="flex items-center gap-2">
                                                        <Input
                                                            type="number"
                                                            value={rubric.score}
                                                            onChange={(event) => updateScore(rubric.id, Number(event.target.value))}
                                                            className="w-16 text-center"
                                                            max={rubric.maxPoints}
                                                            min={0}
                                                            disabled={!canSave}
                                                        />
                                                        <span className="text-sm text-gray-600">/ {rubric.maxPoints}</span>
                                                    </div>
                                                </div>
                                                <Textarea
                                                    value={rubric.feedback}
                                                    onChange={(event) => updateFeedback(rubric.id, event.target.value)}
                                                    rows={3}
                                                    className="text-sm"
                                                    disabled={!canSave}
                                                />
                                            </div>
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Overall Feedback</CardTitle>
                                <CardDescription>General comments for the student</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Textarea
                                    value={overallFeedback}
                                    onChange={(event) => setOverallFeedback(event.target.value)}
                                    rows={6}
                                    className="text-sm"
                                    disabled={!canSave}
                                />
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Score Summary</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="text-center p-6 bg-green-50 rounded-lg border border-green-200">
                                    <div className="text-5xl font-bold mb-2 text-green-700">{totalScore}</div>
                                    <div className="text-sm text-green-600">out of {totalMaxPoints}</div>
                                    <div className="text-2xl mt-2 font-semibold text-green-600">
                                        {totalMaxPoints > 0 ? Math.round((totalScore / totalMaxPoints) * 100) : 0}%
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    {rubrics.map((rubric) => (
                                        <div key={rubric.id} className="flex justify-between text-sm">
                                            <span className="text-gray-600">{rubric.criteria}</span>
                                            <span>
                                                {rubric.score}/{rubric.maxPoints}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Submission</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                    <FileText className="h-8 w-8 text-gray-400" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm truncate">Student submission file</p>
                                        <p className="text-xs text-gray-500">{submissionFileUrl ? 'Available' : 'No file found'}</p>
                                    </div>
                                </div>
                                {submissionFileUrl && (
                                    <a href={submissionFileUrl} target="_blank" rel="noreferrer">
                                        <Button variant="outline" className="w-full mt-3">
                                            View Submission
                                        </Button>
                                    </a>
                                )}
                            </CardContent>
                        </Card>

                        <div className="space-y-3">
                            <Button onClick={handleSave} className="w-full" disabled={isSaving || !canSave}>
                                {isSaving ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="h-4 w-4 mr-2" />
                                        {shouldPublishOnSave ? 'Save & Publish' : 'Save Grade'}
                                    </>
                                )}
                            </Button>
                            <Button variant="outline" className="w-full" onClick={handleCancel}>
                                Back
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
