import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link, useLocation } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Upload, FileText, CheckCircle, X, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import type { Assignment } from '../../../model/assignment';
import { getAssignmentDetails } from '../../services/student/assignmentService';

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

export function SubmitAssignment() {
    const { assignment_id, id } = useParams();
    const location = useLocation();
    const navState = (location.state as SubmitAssignmentNavState | null) ?? null;
    const resolvedAssignmentId = assignment_id ?? id;

    const navigate = useNavigate();
    const [assignment, setAssignment] = useState<Assignment | null>(null);
    const [isLoadingAssignment, setIsLoadingAssignment] = useState<boolean>(false);
    const [file, setFile] = useState<File | null>(null);
    const [comments, setComments] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const allowedFileTypes = useMemo(
        () => normalizeAllowedFileTypes(assignment?.allowed_file_types),
        [assignment?.allowed_file_types]
    );
    const acceptedExtensions = useMemo(() => buildAcceptedExtensions(allowedFileTypes), [allowedFileTypes]);

    const courseDisplay = [navState?.courseCode, navState?.courseName].filter(Boolean).join(' • ');
    const backPath = navState?.backPath ?? '/student/assignments';

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
        if (!file) {
            return;
        }

        setIsSubmitting(true);
        try {
            // Submit API is not available yet in student service, keep UX flow ready.
            await new Promise((resolve) => window.setTimeout(resolve, 700));
            setSubmitted(true);
            window.setTimeout(() => {
                navigate(backPath);
            }, 2000);
        } finally {
            setIsSubmitting(false);
        }
    };

    const removeFile = () => {
        setFile(null);
    };

    return (
        <div className="space-y-6 max-w-3xl mx-auto">
            <div>
                <h2>Submit Assignment</h2>
                <p className="text-sm text-gray-600">{assignment.title}</p>
            </div>

            {!submitted ? (
                <>
                    <Card>
                        <CardHeader>
                            <CardTitle>Assignment Information</CardTitle>
                            <CardDescription>
                                {courseDisplay || assignment.course_id} • Due: {formatDate(assignment.due_date)}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="p-4 bg-blue-50 rounded-lg text-sm text-blue-700">
                                <p>Please ensure your submission meets all requirements before uploading.</p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-700">
                                <div>
                                    <span className="text-gray-500">Total Points:</span> {assignment.max_score ?? 0}
                                </div>
                                <div>
                                    <span className="text-gray-500">Max File Size:</span>{' '}
                                    {assignment.max_file_size_mb ? `${assignment.max_file_size_mb} MB` : 'N/A'}
                                </div>
                            </div>
                            <div className="text-sm text-gray-700">
                                <span className="text-gray-500">Allowed File Types:</span>{' '}
                                {allowedFileTypes.length > 0 ? allowedFileTypes.join(', ') : 'N/A'}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Upload File</CardTitle>
                            <CardDescription>Select your assignment file to upload</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {!file ? (
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-primary transition-colors">
                                    <input
                                        id="file-upload"
                                        type="file"
                                        accept={acceptedExtensions}
                                        onChange={handleFileChange}
                                        className="hidden"
                                    />
                                    <label htmlFor="file-upload" className="cursor-pointer">
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

                    <Card>
                        <CardHeader>
                            <CardTitle>Comments (Optional)</CardTitle>
                            <CardDescription>Add any notes or comments for your lecturer</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Textarea
                                placeholder="Enter any additional comments..."
                                value={comments}
                                onChange={(e) => setComments(e.target.value)}
                                rows={5}
                            />
                        </CardContent>
                    </Card>

                    <div className="flex gap-3">
                        <Button onClick={handleSubmit} disabled={!file || isSubmitting} className="flex-1">
                            {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                            {isSubmitting ? 'Submitting...' : 'Submit Assignment'}
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
                            <div className="pt-4">
                                <p className="text-xs text-green-600">Redirecting to assignments...</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
