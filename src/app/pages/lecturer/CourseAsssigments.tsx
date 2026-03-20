import { useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Breadcrumb } from '../../components/Breadcrumb';
import { SearchBar } from '../../components/SearchBar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Pagination } from '../../components/ui/pagination';
import { BookOpen, Calendar, FileText, Loader2, MoreVertical, Plus, Trash2, Users } from 'lucide-react';
import { Course } from '../../../model';
import { Assignment } from '../../../model/assignment';
import { deleteAssignment, getAssignmentDetails, getAssignmentsForCourse, updateAssignment } from '../../services/lecturer/assignmentService';
import { getCourseDetails } from '../../services/lecturer/courseService';
import { toast } from 'react-toastify';

type PaginationMeta = {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    limit: number;
};

type AssignmentFormState = {
    title: string;
    description: string;
    questions: string;
    requirements: string;
    dueDateLocal: string;
    maxScore: string;
    allowedFileTypesInput: string;
    maxFileSizeMb: string;
    allowLateSubmissions: boolean;
    enableAiGrading: boolean;
};

const DEFAULT_PAGINATION: PaginationMeta = {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    limit: 10,
};

const toLocalDateTimeInput = (value?: string) => {
    if (!value) {
        return '';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '';
    }

    const timezoneOffsetInMs = date.getTimezoneOffset() * 60 * 1000;
    const localDate = new Date(date.getTime() - timezoneOffsetInMs);
    return localDate.toISOString().slice(0, 16);
};

const toIsoDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }
    return date.toISOString();
};

const parseAssignmentsPayload = (payload: unknown): { assignments: Assignment[]; pagination: PaginationMeta } => {
    const root = (payload as Record<string, unknown>)?.data ?? payload;
    const rootRecord = (root as Record<string, unknown>) ?? {};

    const assignmentCandidates = [
        rootRecord.assignment,
        rootRecord.assignments,
        (rootRecord.data as Record<string, unknown> | undefined)?.assignment,
        (rootRecord.data as Record<string, unknown> | undefined)?.assignments,
    ];

    const assignments = assignmentCandidates.find((candidate) => Array.isArray(candidate));
    const paginationCandidate =
        (rootRecord.pagination as Record<string, unknown> | undefined) ??
        ((rootRecord.data as Record<string, unknown> | undefined)?.pagination as Record<string, unknown> | undefined) ??
        {};

    const normalizedPagination: PaginationMeta = {
        currentPage: Number(paginationCandidate.currentPage ?? paginationCandidate.page ?? DEFAULT_PAGINATION.currentPage) || 1,
        totalPages: Number(paginationCandidate.totalPages ?? DEFAULT_PAGINATION.totalPages) || 1,
        totalItems: Number(paginationCandidate.totalItems ?? paginationCandidate.total ?? DEFAULT_PAGINATION.totalItems) || 0,
        limit: Number(paginationCandidate.limit ?? DEFAULT_PAGINATION.limit) || DEFAULT_PAGINATION.limit,
    };

    return {
        assignments: Array.isArray(assignments) ? (assignments as Assignment[]) : [],
        pagination: normalizedPagination,
    };
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

const parseAssignmentDetailPayload = (payload: unknown): Assignment | null => {
    const root = (payload as Record<string, unknown>)?.data ?? payload;
    const rootRecord = (root as Record<string, unknown>) ?? {};

    const assignment =
        (rootRecord.assignment as Assignment | undefined) ??
        ((rootRecord.data as Record<string, unknown> | undefined)?.assignment as Assignment | undefined) ??
        (root as Assignment);

    return assignment?.assignment_id ? assignment : null;
};

const createFormStateFromAssignment = (assignment: Assignment): AssignmentFormState => ({
    title: assignment.title ?? '',
    description: assignment.description ?? '',
    questions: assignment.questions ?? '',
    requirements: assignment.requirements ?? '',
    dueDateLocal: toLocalDateTimeInput(assignment.due_date),
    maxScore: String(assignment.max_score ?? 100),
    allowedFileTypesInput: assignment.allowed_file_types?.join(', ') ?? '',
    maxFileSizeMb: String(assignment.max_file_size_mb ?? 10),
    allowLateSubmissions: assignment.allow_late_submissions ?? true,
    enableAiGrading: assignment.enable_ai_grading ?? true,
});

const getAssignmentStatus = (assignment: Assignment) => {
    const now = new Date();
    const dueDate = assignment.due_date ? new Date(assignment.due_date) : null;
    if (!dueDate || Number.isNaN(dueDate.getTime())) {
        return 'unknown';
    }

    if (dueDate.getTime() < now.getTime()) {
        return 'ended';
    }

    const threeDays = 3 * 24 * 60 * 60 * 1000;
    if (dueDate.getTime() - now.getTime() <= threeDays) {
        return 'due_soon';
    }

    return 'active';
};

export function CourseAssignments() {
    const { course_id } = useParams();
    const navigate = useNavigate();

    const [course, setCourse] = useState<Course | null>(null);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const [isLoadingCourse, setIsLoadingCourse] = useState(false);
    const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);
    const [isSavingEdit, setIsSavingEdit] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [currentPage, setCurrentPage] = useState(DEFAULT_PAGINATION.currentPage);
    const [totalPages, setTotalPages] = useState(DEFAULT_PAGINATION.totalPages);
    const [totalItems, setTotalItems] = useState(DEFAULT_PAGINATION.totalItems);
    const [limit, setLimit] = useState(DEFAULT_PAGINATION.limit);

    const [activeMenuAssignmentId, setActiveMenuAssignmentId] = useState<string | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
    const [editForm, setEditForm] = useState<AssignmentFormState | null>(null);

    const actionMenuRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            setDebouncedSearchQuery(searchQuery.trim());
        }, 400);

        return () => window.clearTimeout(timeoutId);
    }, [searchQuery]);

    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearchQuery]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
                setActiveMenuAssignmentId(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
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

    const fetchAssignments = async () => {
        if (!course_id) {
            return;
        }

        setIsLoadingAssignments(true);
        try {
            const response = await getAssignmentsForCourse(course_id, currentPage, limit, debouncedSearchQuery);
            console.log('Raw response for assignments:', response.data?.course);
            const { assignments: parsedAssignments, pagination } = parseAssignmentsPayload(response.data.course);

            setAssignments(parsedAssignments);
            setTotalItems(pagination.totalItems);
            setTotalPages(pagination.totalPages);
            setLimit(pagination.limit);
        } catch (error) {
            console.error('Error fetching assignments:', error);
            setAssignments([]);
            setTotalItems(0);
            setTotalPages(1);
            toast.error('Failed to load assignments.');
        } finally {
            setIsLoadingAssignments(false);
        }
    };

    useEffect(() => {
        fetchAssignments();
    }, [course_id, currentPage, limit, debouncedSearchQuery]);

    if (!course_id) {
        return (
            <div className="space-y-6">
                <p>Course ID is missing</p>
            </div>
        );
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active':
                return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Active</Badge>;
            case 'due_soon':
                return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">Due Soon</Badge>;
            case 'ended':
                return <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">Ended</Badge>;
            default:
                return <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100">Unknown</Badge>;
        }
    };

    const handlePageChange = (page: number) => {
        if (page < 1 || page > totalPages || page === currentPage) {
            return;
        }
        setCurrentPage(page);
    };

    const openDetailDialog = async (assignmentId: string) => {
        setDetailOpen(true);
        setIsLoadingDetails(true);
        setSelectedAssignment(assignments.find((assignment) => assignment.assignment_id === assignmentId) ?? null);

        try {
            const response = await getAssignmentDetails(assignmentId);
            const assignmentDetails = parseAssignmentDetailPayload(response);
            if (assignmentDetails) {
                setSelectedAssignment(assignmentDetails);
            }
        } catch (error) {
            console.error('Error fetching assignment details:', error);
            toast.error('Failed to load assignment details.');
        } finally {
            setIsLoadingDetails(false);
        }
    };

    const openEditDialog = async (assignmentId: string) => {
        setActiveMenuAssignmentId(null);
        setIsLoadingDetails(true);

        try {
            const response = await getAssignmentDetails(assignmentId);
            const assignmentDetails = parseAssignmentDetailPayload(response);

            if (!assignmentDetails) {
                toast.error('Cannot find assignment details to edit.');
                return;
            }

            setSelectedAssignment(assignmentDetails);
            setEditForm(createFormStateFromAssignment(assignmentDetails));
            setEditOpen(true);
        } catch (error) {
            console.error('Error fetching assignment for edit:', error);
            toast.error('Failed to load assignment for editing.');
        } finally {
            setIsLoadingDetails(false);
        }
    };

    const openDeleteConfirm = (assignment: Assignment) => {
        setSelectedAssignment(assignment);
        setActiveMenuAssignmentId(null);
        setConfirmDeleteOpen(true);
    };

    const handleSaveEdit = async () => {
        if (!selectedAssignment?.assignment_id || !editForm) {
            toast.error('Cannot find assignment to update.');
            return;
        }

        if (!editForm.title.trim()) {
            toast.error('Assignment title is required.');
            return;
        }

        if (!editForm.dueDateLocal) {
            toast.error('Assignment deadline is required.');
            return;
        }

        const maxScore = Number(editForm.maxScore);
        if (!Number.isFinite(maxScore) || maxScore <= 0) {
            toast.error('Max score must be greater than 0.');
            return;
        }

        const maxFileSizeMb = Number(editForm.maxFileSizeMb);
        if (!Number.isFinite(maxFileSizeMb) || maxFileSizeMb <= 0) {
            toast.error('Max file size must be greater than 0.');
            return;
        }

        const allowedFileTypes = editForm.allowedFileTypesInput
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);

        setIsSavingEdit(true);
        try {
            await updateAssignment(selectedAssignment.assignment_id, {
                title: editForm.title.trim(),
                description: editForm.description.trim(),
                questions: editForm.questions.trim(),
                requirements: editForm.requirements.trim(),
                due_date: toIsoDate(editForm.dueDateLocal),
                max_score: maxScore,
                allowed_file_types: allowedFileTypes,
                max_file_size_mb: maxFileSizeMb,
                allow_late_submissions: editForm.allowLateSubmissions,
                enable_ai_grading: editForm.enableAiGrading,
            });

            setEditOpen(false);
            setSelectedAssignment(null);
            setEditForm(null);
            await fetchAssignments();
            toast.success('Assignment updated successfully!');
        } catch (error) {
            console.error('Error updating assignment:', error);
            toast.error('Failed to update assignment.');
        } finally {
            setIsSavingEdit(false);
        }
    };

    const handleDeleteAssignment = async () => {
        if (!selectedAssignment?.assignment_id) {
            toast.error('Cannot find assignment to delete.');
            return;
        }

        setIsDeleting(true);
        try {
            await deleteAssignment(selectedAssignment.assignment_id);
            setConfirmDeleteOpen(false);
            setSelectedAssignment(null);
            await fetchAssignments();
            toast.success('Assignment deleted successfully!');
        } catch (error) {
            console.error('Error deleting assignment:', error);
            toast.error('Failed to delete assignment.');
        } finally {
            setIsDeleting(false);
        }
    };

    const breadcrumbItems = [
        { label: 'Courses', href: '/lecturer/courses' },
        { label: course?.name ?? 'Assignments' },
    ];

    return (
        <div className="space-y-6">
            <Breadcrumb items={breadcrumbItems} />

            <div className="flex justify-between items-center">
                <div>
                    <h2>{course?.name ?? 'Course Assignments'}</h2>
                    <p className="text-sm text-gray-600">{course?.course_code ?? course_id}</p>
                </div>
                <Link to={`/lecturer/assignments/create?course=${course_id}`}>
                    <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        New Assignment
                    </Button>
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => navigate(`/lecturer/courses/${course_id}/students`)}
                >
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm">Student List & Grades</CardTitle>
                        <Users className="h-5 w-5 text-gray-500" />
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-gray-600">View enrolled students and their gradebook</p>
                    </CardContent>
                </Card>
                <Card
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => navigate(`/lecturer/courses/${course_id}/materials`)}
                >
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm">Course Materials</CardTitle>
                        <BookOpen className="h-5 w-5 text-gray-500" />
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-gray-600">Manage lecture notes and resources</p>
                    </CardContent>
                </Card>
                <Card
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => navigate(`/lecturer/gradebook/${course_id}`)}
                >
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm">Full Gradebook</CardTitle>
                        <FileText className="h-5 w-5 text-gray-500" />
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-gray-600">Comprehensive grade analysis</p>
                    </CardContent>
                </Card>
            </div>

            <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search assignments by title..."
                className="max-w-md"
            />

            <div className="grid grid-cols-1 gap-6">
                {isLoadingAssignments || isLoadingCourse ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-4">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                        <p className="text-black font-semibold text-lg">Loading assignments...</p>
                    </div>
                ) : (
                    assignments.map((assignment) => {
                        const status = getAssignmentStatus(assignment);
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
                                                        ? new Date(assignment.due_date).toLocaleDateString('en-US', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            year: 'numeric',
                                                        })
                                                        : 'N/A'}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Users className="h-4 w-4" />
                                                    Max score: {assignment.max_score}
                                                </span>
                                            </CardDescription>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            {getStatusBadge(status)}
                                            <div
                                                className="relative"
                                                ref={activeMenuAssignmentId === assignment.assignment_id ? actionMenuRef : null}
                                            >
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    aria-label="Assignment actions"
                                                    onClick={() =>
                                                        setActiveMenuAssignmentId((prev) =>
                                                            prev === assignment.assignment_id ? null : assignment.assignment_id
                                                        )
                                                    }
                                                >
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>

                                                {activeMenuAssignmentId === assignment.assignment_id && (
                                                    <div className="absolute right-0 top-10 z-20 min-w-28 rounded-md border bg-white p-1 shadow-md">
                                                        <Button
                                                            variant="ghost"
                                                            className="w-full justify-start"
                                                            onClick={() => openEditDialog(assignment.assignment_id)}
                                                        >
                                                            Edit
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            className="w-full justify-start text-red-600 hover:text-red-700"
                                                            onClick={() => openDeleteConfirm(assignment)}
                                                        >
                                                            Delete
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                                        {assignment.description || 'No description provided.'}
                                    </p>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            className="flex-1"
                                            onClick={() => openDetailDialog(assignment.assignment_id)}
                                        >
                                            <FileText className="h-4 w-4 mr-2" />
                                            View Details
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })
                )}

                {!isLoadingAssignments && assignments.length === 0 && (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <p className="text-gray-500 mb-4">
                                {debouncedSearchQuery
                                    ? `No assignments found matching "${debouncedSearchQuery}"`
                                    : 'No assignments created yet'}
                            </p>
                            <Link to={`/lecturer/assignments/create?course=${course_id}`}>
                                <Button>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Create First Assignment
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                )}
            </div>

            {!isLoadingAssignments && assignments.length > 0 && (
                <div className="space-y-3">
                    <div className="text-sm text-gray-500 text-center">
                        Showing {assignments.length} assignments on page {currentPage} of {totalPages} ({totalItems} total)
                    </div>
                    <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
                </div>
            )}

            <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>{selectedAssignment?.title ?? 'Assignment Details'}</DialogTitle>
                        <DialogDescription>Review assignment information and settings.</DialogDescription>
                    </DialogHeader>

                    {isLoadingDetails ? (
                        <div className="py-8 flex items-center justify-center gap-2 text-sm text-gray-600">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading details...
                        </div>
                    ) : selectedAssignment ? (
                        <div className="space-y-4 text-sm">
                            <div>
                                <p className="font-semibold">Description</p>
                                <p className="text-gray-600 whitespace-pre-wrap">
                                    {selectedAssignment.description || 'No description provided.'}
                                </p>
                            </div>
                            <div>
                                <p className="font-semibold">Questions</p>
                                <p className="text-gray-600 whitespace-pre-wrap">
                                    {selectedAssignment.questions || 'No questions provided.'}
                                </p>
                            </div>
                            <div>
                                <p className="font-semibold">Requirements</p>
                                <p className="text-gray-600 whitespace-pre-wrap">
                                    {selectedAssignment.requirements || 'No requirements provided.'}
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                <div className="rounded border p-3">
                                    <p className="text-xs uppercase text-gray-500">Deadline</p>
                                    <p className="font-medium">
                                        {selectedAssignment.due_date
                                            ? new Date(selectedAssignment.due_date).toLocaleString('en-US')
                                            : 'N/A'}
                                    </p>
                                </div>
                                <div className="rounded border p-3">
                                    <p className="text-xs uppercase text-gray-500">Max Score</p>
                                    <p className="font-medium">{selectedAssignment.max_score}</p>
                                </div>
                                <div className="rounded border p-3">
                                    <p className="text-xs uppercase text-gray-500">Allowed File Types</p>
                                    <p className="font-medium">
                                        {selectedAssignment.allowed_file_types?.length
                                            ? selectedAssignment.allowed_file_types.join(', ')
                                            : 'N/A'}
                                    </p>
                                </div>
                                <div className="rounded border p-3">
                                    <p className="text-xs uppercase text-gray-500">Max File Size</p>
                                    <p className="font-medium">{selectedAssignment.max_file_size_mb} MB</p>
                                </div>
                                <div className="rounded border p-3">
                                    <p className="text-xs uppercase text-gray-500">Late Submissions</p>
                                    <p className="font-medium">
                                        {selectedAssignment.allow_late_submissions ? 'Allowed' : 'Not allowed'}
                                    </p>
                                </div>
                                <div className="rounded border p-3">
                                    <p className="text-xs uppercase text-gray-500">AI Grading</p>
                                    <p className="font-medium">
                                        {selectedAssignment.enable_ai_grading ? 'Enabled' : 'Disabled'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500">No assignment details available.</p>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Edit Assignment</DialogTitle>
                        <DialogDescription>Update assignment information and save changes.</DialogDescription>
                    </DialogHeader>

                    {editForm ? (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-title">Title</Label>
                                <Input
                                    id="edit-title"
                                    value={editForm.title}
                                    onChange={(event) =>
                                        setEditForm((prev) => (prev ? { ...prev, title: event.target.value } : prev))
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="edit-description">Description</Label>
                                <Textarea
                                    id="edit-description"
                                    rows={4}
                                    value={editForm.description}
                                    onChange={(event) =>
                                        setEditForm((prev) => (prev ? { ...prev, description: event.target.value } : prev))
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="edit-questions">Questions</Label>
                                <Textarea
                                    id="edit-questions"
                                    rows={4}
                                    value={editForm.questions}
                                    onChange={(event) =>
                                        setEditForm((prev) => (prev ? { ...prev, questions: event.target.value } : prev))
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="edit-requirements">Requirements</Label>
                                <Textarea
                                    id="edit-requirements"
                                    rows={4}
                                    value={editForm.requirements}
                                    onChange={(event) =>
                                        setEditForm((prev) => (prev ? { ...prev, requirements: event.target.value } : prev))
                                    }
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="edit-deadline">Deadline</Label>
                                    <Input
                                        id="edit-deadline"
                                        type="datetime-local"
                                        value={editForm.dueDateLocal}
                                        onChange={(event) =>
                                            setEditForm((prev) =>
                                                prev ? { ...prev, dueDateLocal: event.target.value } : prev
                                            )
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit-score">Max Score</Label>
                                    <Input
                                        id="edit-score"
                                        type="number"
                                        min={1}
                                        value={editForm.maxScore}
                                        onChange={(event) =>
                                            setEditForm((prev) => (prev ? { ...prev, maxScore: event.target.value } : prev))
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit-file-types">Allowed File Types (comma separated)</Label>
                                    <Input
                                        id="edit-file-types"
                                        placeholder="pdf, docx, xlsx"
                                        value={editForm.allowedFileTypesInput}
                                        onChange={(event) =>
                                            setEditForm((prev) =>
                                                prev ? { ...prev, allowedFileTypesInput: event.target.value } : prev
                                            )
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit-max-size">Max File Size (MB)</Label>
                                    <Input
                                        id="edit-max-size"
                                        type="number"
                                        min={1}
                                        value={editForm.maxFileSizeMb}
                                        onChange={(event) =>
                                            setEditForm((prev) =>
                                                prev ? { ...prev, maxFileSizeMb: event.target.value } : prev
                                            )
                                        }
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={editForm.allowLateSubmissions}
                                        onChange={(event) =>
                                            setEditForm((prev) =>
                                                prev ? { ...prev, allowLateSubmissions: event.target.checked } : prev
                                            )
                                        }
                                        className="rounded"
                                    />
                                    <span className="text-sm">Allow late submissions</span>
                                </label>
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={editForm.enableAiGrading}
                                        onChange={(event) =>
                                            setEditForm((prev) =>
                                                prev ? { ...prev, enableAiGrading: event.target.checked } : prev
                                            )
                                        }
                                        className="rounded"
                                    />
                                    <span className="text-sm">Enable AI grading</span>
                                </label>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500">No assignment selected.</p>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditOpen(false)} disabled={isSavingEdit}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveEdit} disabled={isSavingEdit || !editForm}>
                            {isSavingEdit ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Confirm Delete</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete assignment{' '}
                            {selectedAssignment?.title ? `"${selectedAssignment.title}"` : ''}? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setConfirmDeleteOpen(false)} disabled={isDeleting}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteAssignment} disabled={isDeleting}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            {isDeleting ? 'Deleting...' : 'Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}