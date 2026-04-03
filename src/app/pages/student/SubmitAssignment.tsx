import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link, useLocation } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Upload, FileText, CheckCircle, X, Loader2, ArrowLeft, CalendarClock, Award, HardDrive, FileType2 } from 'lucide-react';
import { toast } from 'react-toastify';
import type { Assignment } from '../../../model/assignment';
import { getAssignmentDetails, submitAssignmentFile } from '../../services/student/assignmentService';

type SubmitAssignmentNavState = {
    assignment?: Assignment;
    courseName?: string;
    courseCode?: string;
    backPath?: string;
};

const formatDate = (value?: string) => {
    if (!value) {
        return 'N/A';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const normalizeAllowedFileTypes = (value: unknown): string[] => {
    if (Array.isArray(value)) {
        return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
    }

    if (typeof value === 'string') {
        const trimmedValue = value.trim();

        if (trimmedValue.startsWith('[') && trimmedValue.endsWith(']')) {
            try {
                const parsed = JSON.parse(trimmedValue.replace(/'/g, '"'));
                if (Array.isArray(parsed)) {
                    return parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
                }
            } catch {
                // Fallback to CSV-like parsing below.
            }
        }

        return trimmedValue
            .split(',')
            .map((item) => item.trim().replace(/^[\[\]'"\s]+|[\[\]'"\s]+$/g, ''))
            .filter(Boolean);
    }

    return [];
};

const buildAcceptedExtensions = (allowedFileTypes: string[]): string => {
    const extensionMap: Record<string, string[]> = {
        pdf: ['.pdf'],
        doc: ['.doc'],
        docx: ['.docx'],
        txt: ['.txt'],
        xls: ['.xls'],
        xlsx: ['.xlsx'],
    };

    const normalized = allowedFileTypes.map((type) => type.toLowerCase().replace('.', '').trim());
    const extensions = normalized.flatMap((type) => extensionMap[type] ?? []);

    if (extensions.length === 0) {
        return '.pdf,.doc,.docx,.txt,.xls,.xlsx';
    }

    return Array.from(new Set(extensions)).join(',');
};

const getDeadlineMeta = (dueDate?: string) => {
    if (!dueDate) {
        return {
            text: 'No deadline',
            tone: 'bg-gray-100 text-gray-700',
        };
    }

    const due = new Date(dueDate);
    if (Number.isNaN(due.getTime())) {
        return {
            text: 'Invalid deadline',
            tone: 'bg-gray-100 text-gray-700',
        };
    }

    const diffMs = due.getTime() - Date.now();
    if (diffMs <= 0) {
        return {
            text: 'Overdue',
            tone: 'bg-red-100 text-red-700',
        };
    }

    const totalHoursLeft = Math.ceil(diffMs / (1000 * 60 * 60));
    const days = Math.floor(totalHoursLeft / 24);
    const hours = totalHoursLeft % 24;

    if (totalHoursLeft <= 24) {
        return {
            text: `${totalHoursLeft}h left`,
            tone: 'bg-red-100 text-red-700',
        };
    }

    if (totalHoursLeft <= 72) {
        return {
            text: `${days}d ${hours}h left`,
            tone: 'bg-amber-100 text-amber-700',
        };
    }

    return {
        text: `${days}d ${hours}h left`,
        tone: 'bg-emerald-100 text-emerald-700',
    };
};

const hasDeadlinePassed = (dueDate?: string) => {
    if (!dueDate) {
        return false;
    }

    const due = new Date(dueDate);
    if (Number.isNaN(due.getTime())) {
        return false;
    }

    return due.getTime() <= Date.now();
};

export function SubmitAssignment() {
    const { assignment_id, id } = useParams();
    const location = useLocation();
    const navState = (location.state as SubmitAssignmentNavState | null) ?? null;
    const resolvedAssignmentId = assignment_id ?? id;

    const navigate = useNavigate();
    const [assignment, setAssignment] = useState<Assignment | null>(null);
    const [isLoadingAssignment, setIsLoadingAssignment] = useState<boolean>(false);
    const [file, setFile] = useState<File | null>(null);
    const [submitted, setSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const allowedFileTypes = useMemo(
        () => normalizeAllowedFileTypes(assignment?.allowed_file_types),
        [assignment?.allowed_file_types]
    );
    const acceptedExtensions = useMemo(() => buildAcceptedExtensions(allowedFileTypes), [allowedFileTypes]);
    const deadlineMeta = useMemo(() => getDeadlineMeta(assignment?.due_date), [assignment?.due_date]);
    const isOverdue = useMemo(() => hasDeadlinePassed(assignment?.due_date), [assignment?.due_date]);

    const courseDisplay = [navState?.courseCode, navState?.courseName].filter(Boolean).join(' • ');
    const backPath = navState?.backPath ?? '/student/courses';

    useEffect(() => {
        if (!resolvedAssignmentId) {
            return;
        }

        const assignmentFromState = navState?.assignment;
        if (assignmentFromState?.assignment_id === resolvedAssignmentId) {
            setAssignment(assignmentFromState);
            return;
        }

        const fetchAssignment = async () => {
            setIsLoadingAssignment(true);
            try {
                const detail = await getAssignmentDetails(resolvedAssignmentId);
                setAssignment(detail);
            } catch (error) {
                console.error('Failed to load assignment for submission:', error);
                toast.error('Failed to load assignment information.');
                setAssignment(null);
            } finally {
                setIsLoadingAssignment(false);
            }
        };

        fetchAssignment();
    }, [resolvedAssignmentId, navState?.assignment]);

    if (!resolvedAssignmentId) {
        return (
            <div className="space-y-6 max-w-3xl mx-auto">
                <Card>
                    <CardContent className="pt-6 text-sm text-gray-600">Assignment ID is missing.</CardContent>
                </Card>
            </div>
        );
    }

    if (isLoadingAssignment) {
        return (
            <div className="space-y-6 max-w-3xl mx-auto">
                <div className="py-20 flex flex-col items-center justify-center gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="text-black font-semibold text-lg">Loading assignment...</p>
                </div>
            </div>
        );
    }

    if (!assignment) {
        return (
            <div className="space-y-6 max-w-3xl mx-auto">
                <Card>
                    <CardContent className="pt-6 text-sm text-gray-600">Assignment information is unavailable.</CardContent>
                </Card>
                <Link to={backPath}>
                    <Button variant="outline" className="w-full">Back</Button>
                </Link>
            </div>
        );
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const nextFile = e.target.files[0];
            const fileSizeMb = nextFile.size / 1024 / 1024;

            if (assignment.max_file_size_mb && fileSizeMb > assignment.max_file_size_mb) {
                toast.error(`File exceeds maximum size of ${assignment.max_file_size_mb} MB.`);
                return;
            }

            setFile(nextFile);
        }
    };

    const handleSubmit = async () => {
        if (isOverdue) {
            toast.error('Submission is closed because this assignment is overdue.');
            return;
        }

        if (!file) {
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await submitAssignmentFile(resolvedAssignmentId, file);
            toast.success(result.message || 'Assignment submitted successfully.');
            setSubmitted(true);
        } catch (error) {
            console.error('Failed to submit assignment:', error);
            toast.error('Failed to submit assignment. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const removeFile = () => {
        setFile(null);
    };

    return (
        <div className="space-y-6 max-w-3xl mx-auto">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h2>Submit Assignment</h2>
                    <p className="text-sm text-gray-600">{assignment.title}</p>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(backPath)}
                    className="shrink-0"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                </Button>
            </div>

            {!submitted ? (
                <>
                    <Card className="border-slate-200">
                        <CardHeader>
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <CardTitle>Assignment Information</CardTitle>
                                    <CardDescription>{courseDisplay || assignment.course_id}</CardDescription>
                                </div>
                                <Badge className={deadlineMeta.tone}>{deadlineMeta.text}</Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700">
                                <p>Please ensure your submission meets all requirements before uploading.</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-700">
                                <div className="rounded-md border border-slate-200 p-3">
                                    <div className="mb-1 flex items-center gap-2 text-gray-500">
                                        <CalendarClock className="h-4 w-4" />
                                        <span>Due Date</span>
                                    </div>
                                    <div className="font-medium text-gray-900">{formatDate(assignment.due_date)}</div>
                                </div>

                                <div className="rounded-md border border-slate-200 p-3">
                                    <div className="mb-1 flex items-center gap-2 text-gray-500">
                                        <Award className="h-4 w-4" />
                                        <span>Total Points</span>
                                    </div>
                                    <div className="font-medium text-gray-900">{assignment.max_score ?? 0} points</div>
                                </div>

                                <div className="rounded-md border border-slate-200 p-3">
                                    <div className="mb-1 flex items-center gap-2 text-gray-500">
                                        <HardDrive className="h-4 w-4" />
                                        <span>Max File Size</span>
                                    </div>
                                    <div className="font-medium text-gray-900">
                                        {assignment.max_file_size_mb ? `${assignment.max_file_size_mb} MB` : 'N/A'}
                                    </div>
                                </div>

                                <div className="rounded-md border border-slate-200 p-3">
                                    <div className="mb-1 flex items-center gap-2 text-gray-500">
                                        <FileType2 className="h-4 w-4" />
                                        <span>Allowed Types</span>
                                    </div>
                                    <div className="font-medium text-gray-900">
                                        {allowedFileTypes.length > 0 ? allowedFileTypes.join(', ') : 'N/A'}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Upload File</CardTitle>
                            <CardDescription>Select your assignment file to upload</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {isOverdue ? (
                                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                                    Submission is closed. You have passed the deadline for this assignment.
                                </div>
                            ) : null}

                            {!file ? (
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-primary transition-colors">
                                    <input
                                        id="file-upload"
                                        type="file"
                                        accept={acceptedExtensions}
                                        onChange={handleFileChange}
                                        disabled={isOverdue}
                                        className="hidden"
                                    />
                                    <label htmlFor="file-upload" className={isOverdue ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}>
                                        <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                                        <p className="text-sm text-gray-600 mb-1">
                                            Click to upload or drag and drop
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            {allowedFileTypes.length > 0 ? allowedFileTypes.join(', ') : 'PDF, Word, Text, or Excel'}
                                            {assignment.max_file_size_mb ? ` (Max ${assignment.max_file_size_mb}MB)` : ''}
                                        </p>
                                    </label>
                                </div>
                            ) : (
                                <div className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center">
                                                <FileText className="h-6 w-6 text-primary" />
                                            </div>
                                            <div>
                                                <p className="text-sm">{file.name}</p>
                                                <p className="text-xs text-gray-500">
                                                    {(file.size / 1024 / 1024).toFixed(2)} MB
                                                </p>
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="sm" onClick={removeFile}>
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <div className="flex gap-3">
                        <Button onClick={handleSubmit} disabled={!file || isSubmitting || isOverdue} className="flex-1">
                            {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                            {isSubmitting ? 'Submitting...' : isOverdue ? 'Overdue - Cannot Submit' : 'Submit Assignment'}
                        </Button>
                        <Link to={backPath} className="flex-1">
                            <Button variant="outline" className="w-full">
                                Cancel
                            </Button>
                        </Link>
                    </div>
                </>
            ) : (
                <Card className="border-green-200 bg-green-50">
                    <CardContent className="py-12">
                        <div className="text-center space-y-4">
                            <div className="flex justify-center">
                                <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
                                    <CheckCircle className="h-8 w-8 text-green-600" />
                                </div>
                            </div>
                            <div>
                                <h3 className="text-lg text-green-900 mb-2">Assignment Submitted Successfully!</h3>
                                <p className="text-sm text-green-700">
                                    Your assignment has been submitted and will be reviewed by your lecturer.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
