import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Search, Send, Filter, Eye, FileText, AlertCircle, User, MessageCircle, Plus, Paperclip, X, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Checkbox } from '../../components/ui/checkbox';
import { STUDENT_STORAGE_KEYS } from '../../../constants';
import axiosInstance from '../../services/student/axios';
import { getStudentCourses } from '../../services/student/courseService';
import { getAssignmentsForCourse } from '../../services/student/assignmentService';
import { fetchDirectChatThread, formatChatTimestamp, type DirectChatMessage } from '../../services/shared/directChat';
import { initSocket, joinChat, leaveChat, markChatSeen, onChatMessage, sendChatMessage } from '../../services/socketService';
import { useComposeMessage } from '../../hooks/useComposeMessage';
import { toNumericId as utilToNumericId } from '../../utils/socketUtils';

type MessageCourse = {
    id: string;
    name: string;
    code?: string;
};

type MessageAssignment = {
    id: string;
    name: string;
};





type MessageView = {
    id: string;
    sender: 'student' | 'lecturer';
    content: string;
    time: string;
};

type SessionUser = {
    id?: string | number;
    user_id?: string | number;
    name?: string;
    role?: string;
};

const getStoredUser = (storageKey: string): SessionUser | null => {
    const rawValue = sessionStorage.getItem(storageKey);

    if (!rawValue) {
        return null;
    }

    try {
        return JSON.parse(rawValue) as SessionUser;
    } catch {
        return null;
    }
};

const toNumericId = (value: string | number | undefined | null): number | null => {
    if (value === undefined || value === null || value === '') {
        return null;
    }

    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : null;
};

const mapChatMessagesToView = (messagesList: DirectChatMessage[], currentUserId: number | null): MessageView[] => {
    return messagesList.map((message) => ({
        id: message.id,
        sender: message.isFromCurrentUser && currentUserId !== null ? 'student' : 'lecturer',
        content: message.content,
        time: formatChatTimestamp(message.createdAt),
    }));
};

export function StudentMessages() {
    const [activeTab, setActiveTab] = useState('direct');
    const [selectedConversation, setSelectedConversation] = useState('1');
    const [selectedCourseAnnouncement, setSelectedCourseAnnouncement] = useState('CS301');
    const [newMessage, setNewMessage] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [courseSearchQuery, setCourseSearchQuery] = useState('');
    const [selectedCourse, setSelectedCourse] = useState<string>('all');
    const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('all');
    const [selectedSemester, setSelectedSemester] = useState<string>('all');
    const [selectedTemplate, setSelectedTemplate] = useState<string>('none');
    const [attachSubmissionInChat, setAttachSubmissionInChat] = useState(false);

    // Compose message dialog states
    const [isComposeDialogOpen, setIsComposeDialogOpen] = useState(false);
    const [composeCourseId, setComposeCourseId] = useState<string>('');
    const [composeAssignmentId, setComposeAssignmentId] = useState<string>('');
    const [composeMessage, setComposeMessage] = useState('');
    const [attachSubmission, setAttachSubmission] = useState(false);
    const [availableCourses, setAvailableCourses] = useState<MessageCourse[]>([]);
    const [availableAssignments, setAvailableAssignments] = useState<MessageAssignment[]>([]);
    const [coursesLoading, setCoursesLoading] = useState(false);
    const [assignmentsLoading, setAssignmentsLoading] = useState(false);
    const [directMessages, setDirectMessages] = useState<MessageView[]>([]);
    const [directChatLoading, setDirectChatLoading] = useState(false);
    const [directChatError, setDirectChatError] = useState<string | null>(null);
    const [peerUserId, setPeerUserId] = useState<number | null>(null);
    const [peerName, setPeerName] = useState('');
    const currentUser = getStoredUser(STUDENT_STORAGE_KEYS.USER);
    const currentUserId = toNumericId(currentUser?.user_id ?? currentUser?.id);

    // Khởi tạo compose message hook
    const {
        isLoading: isComposeSending,
        error: composeErrorMessage,
        sendOneToOne,
        sendGroup,
        cancelPendingRequests,
    } = useComposeMessage('student', {
        onSuccess: () => {
            // ✅ Gửi thành công
            setComposeMessage('');
            setComposeCourseId('');
            setComposeAssignmentId('');
            setAttachSubmission(false);
            setIsComposeDialogOpen(false);
        },
        onError: (errorMsg) => {
            // ❌ Lỗi khi gửi
            setDirectChatError(errorMsg);
        },
    });

    // Cleanup khi unmount
    useEffect(() => {
        return () => {
            cancelPendingRequests();
        };
    }, [cancelPendingRequests]);

    useEffect(() => {
        let isCancelled = false;
        setCoursesLoading(true);

        void getStudentCourses({ page: 1, limit: 100, search: '' })
            .then((payload: any) => {
                if (isCancelled) {
                    return;
                }

                const rawCourses = Array.isArray(payload?.courses)
                    ? payload.courses
                    : Array.isArray(payload?.course)
                        ? payload.course
                        : Array.isArray(payload)
                            ? payload
                            : [];

                const normalizedCourses = rawCourses
                    .map((course: any) => ({
                        id: String(course.course_id ?? course.id ?? course.course_code ?? ''),
                        name: String(course.name ?? course.course_name ?? course.course_code ?? ''),
                        code: String(course.course_code ?? course.courseCode ?? ''),
                    }))
                    .filter((course: MessageCourse) => course.id && course.name);

                setAvailableCourses(normalizedCourses);
            })
            .catch((error: unknown) => {
                if (!isCancelled) {
                    console.error('Failed to load student courses:', error);
                    setAvailableCourses([]);
                }
            })
            .finally(() => {
                if (!isCancelled) {
                    setCoursesLoading(false);
                }
            });

        return () => {
            isCancelled = true;
        };
    }, []);

    useEffect(() => {
        if (!composeCourseId) {
            setAvailableAssignments([]);
            return;
        }

        let isCancelled = false;
        setAssignmentsLoading(true);

        void getAssignmentsForCourse(composeCourseId, 1, 100, '')
            .then((payload: any) => {
                if (isCancelled) {
                    return;
                }

                const rawAssignments = Array.isArray(payload?.assignments)
                    ? payload.assignments
                    : Array.isArray(payload?.course)
                        ? payload.course
                        : Array.isArray(payload)
                            ? payload
                            : [];

                const normalizedAssignments = rawAssignments
                    .map((assignment: any) => ({
                        id: String(assignment.assignment_id ?? assignment.id ?? ''),
                        name: String(assignment.title ?? assignment.name ?? assignment.assignment_name ?? ''),
                    }))
                    .filter((assignment: MessageAssignment) => assignment.id && assignment.name);

                setAvailableAssignments(normalizedAssignments);
            })
            .catch((error: unknown) => {
                if (!isCancelled) {
                    console.error(`Failed to load assignments for course ${composeCourseId}:`, error);
                    setAvailableAssignments([]);
                }
            })
            .finally(() => {
                if (!isCancelled) {
                    setAssignmentsLoading(false);
                }
            });

        return () => {
            isCancelled = true;
        };
    }, [composeCourseId]);

    // Template messages for students
    const studentTemplates = {
        regrade: "Dear Professor, I would like to respectfully request a regrade for my recent submission on this assignment. After reviewing the feedback and the grading rubric, I believe there may have been some points that were not fully considered. Specifically, [EXPLAIN YOUR CONCERN]. I would greatly appreciate if you could review my submission again. Thank you for your time and consideration.",
        feedback: "Dear Professor, I have reviewed my grade and the feedback provided for this assignment. I would like to better understand the areas where I lost points so I can improve in future assignments. Could you please provide additional feedback on [SPECIFIC AREAS]? I want to make sure I fully understand the concepts and meet the expectations for future work. Thank you for your guidance.",
        clarification: "Dear Professor, I have a question regarding this assignment. Could you please clarify [SPECIFIC QUESTION]? I want to ensure I understand the requirements correctly before proceeding. Thank you for your help!",
        deadline: "Dear Professor, I am writing to request an extension for this assignment due to [REASON - illness, family emergency, technical issues, etc.]. I understand the importance of meeting deadlines and apologize for any inconvenience. Would it be possible to extend the deadline to [PROPOSED DATE]? I am committed to submitting quality work and would greatly appreciate your consideration. Thank you.",
        technical: "Dear Professor, I encountered a technical issue while working on this assignment: [DESCRIBE ISSUE]. I have tried [SOLUTIONS ATTEMPTED] but have not been able to resolve the problem. Could you please provide guidance or assistance? I want to ensure I can complete the assignment properly. Thank you for your help.",
        meeting: "Dear Professor, I would like to schedule a meeting to discuss this assignment and get some guidance. Would you be available during your office hours, or could we arrange a different time that works for your schedule? I have some questions about [TOPIC] that I think would benefit from a face-to-face discussion. Thank you for your time.",
    };

    const selectedAssignmentForCompose = availableAssignments.find((assignment) => assignment.id === composeAssignmentId);

    // Get unique academic years and semesters (empty until backend conversation list is available)
    const academicYears: string[] = [];
    const semesters: string[] = [];

    // Filter conversations based on search (empty since conversations array is removed)
    const filteredConversations: any[] = [];

    const handleSend = () => {
        const messageText = newMessage.trim();

        if (!messageText || !selectedConv || currentUserId === null || peerUserId === null) {
            return;
        }

        sendChatMessage(
            {
                assignment_id: selectedConv.assignmentId,
                other_user_id: peerUserId,
                message: messageText,
            },
            (response) => {
                if (response?.ok === false) {
                    setDirectChatError(response.error || 'Unable to send message');
                }
            },
        );

        setNewMessage('');
        setSelectedTemplate('none');
        setAttachSubmissionInChat(false);
    };

    const handleTemplateChange = (value: string) => {
        setSelectedTemplate(value);
        if (value !== 'none') {
            setNewMessage(studentTemplates[value as keyof typeof studentTemplates]);
        } else {
            setNewMessage('');
        }
    };

    const handleSendComposedMessage = async () => {
        if (!composeMessage.trim()) return;

        try {
            const courseId = toNumericId(composeCourseId); // The course/lecturer ID

            // If assignment is selected, use it as the base for communication
            // Otherwise use course ID as fallback
            let assignmentId: number | null = null;

            if (composeAssignmentId && composeAssignmentId !== 'none') {
                assignmentId = toNumericId(composeAssignmentId);
            } else if (courseId) {
                // Fallback to course ID if no assignment selected
                assignmentId = courseId;
            }

            if (!courseId) {
                setDirectChatError('Please select a course');
                return;
            }

            if (!assignmentId) {
                setDirectChatError('Please select an assignment or use a course');
                return;
            }

            // Student sends to the lecturer/course (always one-to-one)
            await sendOneToOne(assignmentId, courseId, composeMessage);
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Failed to send message';
            setDirectChatError(errorMsg);
        }
    };

    const selectedConv: any = null;
    const selectedCourseAnn: any = null;
    const currentAnnouncementMessages: MessageView[] = [];

    useEffect(() => {
        if (!selectedConv || currentUserId === null) {
            return;
        }

        let isCancelled = false;
        setDirectChatLoading(true);
        setDirectChatError(null);

        void fetchDirectChatThread(axiosInstance, selectedConv.assignmentId, currentUserId)
            .then((thread) => {
                if (isCancelled) {
                    return;
                }

                setPeerUserId(thread.peerUserId);
                setPeerName(thread.peerName || selectedConv.lecturer);
                setDirectMessages(mapChatMessagesToView(thread.messages, currentUserId));
            })
            .catch((error: unknown) => {
                if (isCancelled) {
                    return;
                }

                const message = error instanceof Error ? error.message : 'Failed to load direct messages';
                setDirectChatError(message);
                setPeerUserId(null);
                setPeerName('');
                setDirectMessages([]);
            })
            .finally(() => {
                if (!isCancelled) {
                    setDirectChatLoading(false);
                }
            });

        return () => {
            isCancelled = true;
        };
    }, [currentUserId, selectedConv]);

    useEffect(() => {
        if (!selectedConv || currentUserId === null || peerUserId === null) {
            return;
        }

        initSocket('student');

        const unsubscribeChatMessage = onChatMessage((payload) => {
            if (String(payload.assignment_id) !== String(selectedConv.assignmentId)) {
                return;
            }

            const senderId = Number(payload.sender_id);
            const receiverId = Number(payload.receiver_id);

            if (![senderId, receiverId].includes(currentUserId) || ![senderId, receiverId].includes(peerUserId)) {
                return;
            }

            setDirectMessages((previousMessages) => {
                const nextMessage: MessageView = {
                    id: String(payload.chat_id),
                    sender: senderId === currentUserId ? 'student' : 'lecturer',
                    content: payload.message,
                    time: formatChatTimestamp(payload.created_at),
                };

                if (previousMessages.some((message) => message.id === nextMessage.id)) {
                    return previousMessages.map((message) => (message.id === nextMessage.id ? nextMessage : message));
                }

                return [...previousMessages, nextMessage];
            });
        });

        joinChat({
            assignment_id: selectedConv.assignmentId,
            other_user_id: peerUserId,
        });

        markChatSeen({
            assignment_id: selectedConv.assignmentId,
            other_user_id: peerUserId,
        });

        return () => {
            unsubscribeChatMessage();
            leaveChat({
                assignment_id: selectedConv.assignmentId,
                other_user_id: peerUserId,
            });
        };
    }, [currentUserId, peerUserId, selectedConv]);

    // Filter course announcements (empty since courseAnnouncements array is removed)
    const filteredCourseAnnouncements: any[] = [];

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                    <h2>Messages</h2>
                    <p className="text-sm text-gray-600">Communicate with your lecturers</p>
                </div>

                {/* Compose Message Button */}
                <Dialog open={isComposeDialogOpen} onOpenChange={(open) => {
                    // Hủy pending requests khi đóng dialog
                    if (!open) {
                        cancelPendingRequests();
                    }
                    setIsComposeDialogOpen(open);
                }}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Compose Message
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Compose New Message</DialogTitle>
                            <DialogDescription>
                                Send a message to your lecturer about a course or assignment
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-6 py-4">
                            {/* Course Selection */}
                            <div className="space-y-3">
                                <Label className="text-sm font-medium">Course</Label>
                                <Select value={composeCourseId} onValueChange={(value) => {
                                    setComposeCourseId(value);
                                    setComposeAssignmentId('');
                                }}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a course..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {coursesLoading ? (
                                            <SelectItem value="loading" disabled>Loading courses...</SelectItem>
                                        ) : availableCourses.map((course) => (
                                            <SelectItem key={course.id} value={course.id}>
                                                {course.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Assignment Selection (Optional) */}
                            {composeCourseId && (
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium">Assignment (Optional)</Label>
                                    <Select value={composeAssignmentId} onValueChange={(value) => {
                                        setComposeAssignmentId(value);
                                        setAttachSubmission(false);
                                    }}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select an assignment (optional)..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">None - General Question</SelectItem>
                                            {assignmentsLoading ? (
                                                <SelectItem value="loading" disabled>Loading assignments...</SelectItem>
                                            ) : availableAssignments.map((assignment) => (
                                                <SelectItem key={assignment.id} value={assignment.id}>
                                                    {assignment.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    {/* Show submission and grade info if assignment is selected */}
                                    {composeAssignmentId && composeAssignmentId !== 'none' && selectedAssignmentForCompose && (
                                        <div className="space-y-3">
                                            <div className="border border-blue-200 bg-blue-50 rounded-lg p-3">
                                                <div className="flex items-start gap-3">
                                                    <FileText className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-blue-900 mb-1">
                                                            Assignment: {selectedAssignmentForCompose.name}
                                                        </p>
                                                        <p className="text-sm text-gray-600">
                                                            Selected assignment loaded from API
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Attach Submission Checkbox */}
                                            {selectedAssignmentForCompose && (
                                                <div className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer" onClick={() => setAttachSubmission(!attachSubmission)}>
                                                    <Checkbox
                                                        id="attach-submission"
                                                        checked={attachSubmission}
                                                        onCheckedChange={(checked) => setAttachSubmission(checked === true)}
                                                    />
                                                    <div className="flex-1">
                                                        <Label htmlFor="attach-submission" className="text-sm font-medium cursor-pointer">
                                                            Attach my submission to this message
                                                        </Label>
                                                        <p className="text-xs text-gray-500 mt-0.5">
                                                            Include submission files and details for easy reference
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Message Composition */}
                            <div className="space-y-3">
                                <Label className="text-sm font-medium">Message</Label>
                                <Textarea
                                    placeholder="Type your message here..."
                                    value={composeMessage}
                                    onChange={(e) => setComposeMessage(e.target.value)}
                                    className="min-h-37.5 resize-none"
                                />

                                {/* Show attached submission indicator */}
                                {attachSubmission && selectedAssignmentForCompose && (
                                    <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                                        <Paperclip className="h-4 w-4 text-green-600" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-green-900">
                                                Submission attached: {selectedAssignmentForCompose.name}
                                            </p>
                                            <p className="text-xs text-green-700">
                                                This follows the selected assignment from the API.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setAttachSubmission(false)}
                                            className="text-green-700 hover:text-green-900"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Error Display */}
                            {composeErrorMessage && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                    <p className="text-sm text-red-700">
                                        <span className="font-medium">Error:</span> {composeErrorMessage}
                                    </p>
                                </div>
                            )}
                        </div>

                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setIsComposeDialogOpen(false);
                                    cancelPendingRequests();
                                }}
                                disabled={isComposeSending}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSendComposedMessage}
                                disabled={
                                    isComposeSending ||
                                    !composeMessage.trim() ||
                                    !composeCourseId
                                }
                            >
                                {isComposeSending ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <Send className="h-4 w-4 mr-2" />
                                        Send Message
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                    <TabsTrigger value="direct">
                        <User className="h-4 w-4 mr-2" />
                        Direct Messages
                    </TabsTrigger>
                    <TabsTrigger value="announcements">
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Course Announcements
                    </TabsTrigger>
                </TabsList>

                {/* Direct Messages Tab */}
                <TabsContent value="direct">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Conversations List */}
                        <Card className="lg:col-span-1">
                            <CardHeader>
                                <CardTitle>Conversations</CardTitle>
                                <div className="space-y-3 mt-4">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <Input
                                            placeholder="Search lecturers..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-9"
                                        />
                                    </div>

                                    {/* Course Filter */}
                                    <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="All Courses" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Courses</SelectItem>
                                            {availableCourses.map((course) => (
                                                <SelectItem key={course.id} value={course.id}>
                                                    {course.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    {/* Academic Year Filter */}
                                    <Select value={selectedAcademicYear} onValueChange={setSelectedAcademicYear}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="All Academic Years" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Academic Years</SelectItem>
                                            {academicYears.map((year) => (
                                                <SelectItem key={year} value={year}>
                                                    {year}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    {/* Semester Filter */}
                                    <Select value={selectedSemester} onValueChange={setSelectedSemester}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="All Semesters" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Semesters</SelectItem>
                                            {semesters.map((semester) => (
                                                <SelectItem key={semester} value={semester}>
                                                    {semester}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <ScrollArea className="h-125">
                                    <div className="space-y-1 p-4 pt-0">
                                        {filteredConversations.length > 0 ? (
                                            filteredConversations.map((conversation) => (
                                                <button
                                                    key={conversation.id}
                                                    onClick={() => {
                                                        setSelectedConversation(conversation.id);
                                                        setAttachSubmissionInChat(false);
                                                        setSelectedTemplate('none');
                                                        setNewMessage('');
                                                    }}
                                                    className={`w-full text-left p-3 rounded-lg transition-colors ${selectedConversation === conversation.id
                                                        ? 'bg-primary text-white'
                                                        : 'hover:bg-gray-100'
                                                        }`}
                                                >
                                                    <div className="flex justify-between items-start mb-1">
                                                        <span className={`font-medium ${selectedConversation === conversation.id ? '' : 'text-sm'}`}>
                                                            {conversation.lecturer}
                                                        </span>
                                                        {conversation.unread > 0 && (
                                                            <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                                                {conversation.unread}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p
                                                        className={`text-xs mb-1 ${selectedConversation === conversation.id ? 'text-white/80' : 'text-gray-500'
                                                            }`}
                                                    >
                                                        {conversation.courseName}
                                                    </p>
                                                    <p
                                                        className={`text-xs mb-1 ${selectedConversation === conversation.id ? 'text-white/70' : 'text-gray-600'
                                                            }`}
                                                    >
                                                        {conversation.assignmentName}
                                                    </p>
                                                    <p
                                                        className={`text-xs truncate mb-1 ${selectedConversation === conversation.id ? 'text-white/80' : 'text-gray-600'
                                                            }`}
                                                    >
                                                        {conversation.lastMessage}
                                                    </p>
                                                    <span
                                                        className={`text-xs ${selectedConversation === conversation.id ? 'text-white/60' : 'text-gray-400'
                                                            }`}
                                                    >
                                                        {conversation.time}
                                                    </span>
                                                </button>
                                            ))
                                        ) : (
                                            <div className="text-center py-8 text-gray-500 text-sm">
                                                <Filter className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                                                <p>No conversations found</p>
                                                <p className="text-xs text-gray-400 mt-1">Try adjusting your filters</p>
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>

                        {/* Message Thread */}
                        <Card className="lg:col-span-2">
                            {selectedConv ? (
                                <>
                                    <CardHeader>
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <CardTitle className="mb-2">{peerName || selectedConv?.lecturer}</CardTitle>
                                                <p className="text-sm text-gray-600">
                                                    {selectedConv?.courseName} - {selectedConv?.courseId} - {selectedConv?.semester} - {selectedConv?.academicYear}
                                                </p>
                                                <p className="text-sm text-gray-700 mt-1">
                                                    {selectedConv?.assignmentName}
                                                </p>
                                            </div>

                                            {/* Grade Block next to header */}
                                            <div className="shrink-0 w-48">
                                                {selectedConv?.hasSubmission ? (
                                                    selectedConv?.isPublished ? (
                                                        <Link
                                                            to={`/student/grades/${selectedConv?.submissionId || 'SUB001'}`}
                                                            className="block"
                                                        >
                                                            <div className="border border-blue-200 bg-blue-50 rounded-lg p-2.5 hover:bg-blue-100 transition-colors">
                                                                <div className="flex items-center gap-2">
                                                                    <FileText className="h-4 w-4 text-blue-600 shrink-0" />
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-xs text-blue-800 font-medium">
                                                                            Grade: {selectedConv?.grade || 0}/100
                                                                        </p>
                                                                        <p className="text-xs text-blue-600 mt-0.5">
                                                                            Click to view grade
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </Link>
                                                    ) : (
                                                        <div className="border border-yellow-200 bg-yellow-50 rounded-lg p-2.5">
                                                            <div className="flex items-center gap-2">
                                                                <FileText className="h-4 w-4 text-yellow-600 shrink-0" />
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-xs text-yellow-800 font-medium">
                                                                        Grading in progress
                                                                    </p>
                                                                    <p className="text-xs text-yellow-600 mt-0.5">
                                                                        Check back later
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )
                                                ) : (
                                                    <div className="border border-gray-200 bg-gray-50 rounded-lg p-2.5">
                                                        <div className="flex items-center gap-2">
                                                            <AlertCircle className="h-4 w-4 text-gray-400 shrink-0" />
                                                            <p className="text-xs text-gray-600">
                                                                No submission available
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </CardHeader>
                                    {selectedConv && (
                                        <CardContent>
                                            {directChatError && (
                                                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                                                    {directChatError}
                                                </div>
                                            )}

                                            <ScrollArea className="h-100 mb-4 pr-4">
                                                <div className="space-y-4">
                                                    {directChatLoading && directMessages.length === 0 ? (
                                                        <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
                                                            Loading conversation...
                                                        </div>
                                                    ) : directMessages.length > 0 ? (
                                                        directMessages.map((message) => (
                                                            <div
                                                                key={message.id}
                                                                className={`flex ${message.sender === 'student' ? 'justify-end' : 'justify-start'}`}
                                                            >
                                                                <div
                                                                    className={`max-w-[70%] rounded-lg p-3 ${message.sender === 'student'
                                                                        ? 'bg-primary text-white'
                                                                        : 'bg-gray-100 text-gray-900'
                                                                        }`}
                                                                >
                                                                    <p className="text-sm">{message.content}</p>
                                                                    <p
                                                                        className={`text-xs mt-1 ${message.sender === 'student' ? 'text-white/70' : 'text-gray-500'
                                                                            }`}
                                                                    >
                                                                        {message.time}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
                                                            No messages yet. Start the conversation below.
                                                        </div>
                                                    )}
                                                </div>
                                            </ScrollArea>

                                            <div className="space-y-3">
                                                {/* Message Templates */}
                                                <div className="bg-blue-50 rounded-lg border border-blue-200 p-3">
                                                    <label className="text-xs text-gray-700 mb-2 block">
                                                        Message Templates
                                                    </label>
                                                    <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
                                                        <SelectTrigger className="bg-white">
                                                            <SelectValue placeholder="Select a template..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="none">No template</SelectItem>
                                                            <SelectItem value="regrade">Request Regrade</SelectItem>
                                                            <SelectItem value="feedback">Request Additional Feedback</SelectItem>
                                                            <SelectItem value="clarification">Ask for Clarification</SelectItem>
                                                            <SelectItem value="deadline">Request Deadline Extension</SelectItem>
                                                            <SelectItem value="technical">Report Technical Issue</SelectItem>
                                                            <SelectItem value="meeting">Request Meeting/Office Hours</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                {/* Attach Submission Option */}
                                                {selectedConv?.hasSubmission && (
                                                    <div className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer" onClick={() => setAttachSubmissionInChat(!attachSubmissionInChat)}>
                                                        <Checkbox
                                                            id="attach-submission-chat"
                                                            checked={attachSubmissionInChat}
                                                            onCheckedChange={(checked) => setAttachSubmissionInChat(checked === true)}
                                                        />
                                                        <div className="flex-1">
                                                            <Label htmlFor="attach-submission-chat" className="text-sm font-medium cursor-pointer">
                                                                Attach my submission to this message
                                                            </Label>
                                                            <p className="text-xs text-gray-500 mt-0.5">
                                                                Include submission files for {selectedConv.assignmentName}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Show attached submission indicator */}
                                                {attachSubmissionInChat && selectedConv && (
                                                    <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                                                        <Paperclip className="h-4 w-4 text-green-600" />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-green-900">
                                                                Submission attached: {selectedConv.assignmentName}
                                                            </p>
                                                            {selectedConv.isPublished && (
                                                                <p className="text-xs text-green-700">
                                                                    Includes submission files and grade ({selectedConv.grade}/100)
                                                                </p>
                                                            )}
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => setAttachSubmissionInChat(false)}
                                                            className="text-green-700 hover:text-green-900"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                )}

                                                <div className="flex gap-2">
                                                    <Textarea
                                                        placeholder="Type your message..."
                                                        value={newMessage}
                                                        onChange={(e) => setNewMessage(e.target.value)}
                                                        className="resize-none"
                                                        rows={3}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                                e.preventDefault();
                                                                handleSend();
                                                            }
                                                        }}
                                                    />
                                                    <Button onClick={handleSend} className="self-end">
                                                        <Send className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    )}
                                </>
                            ) : (
                                <CardHeader>
                                    <div className="text-center py-8">
                                        <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                        <p className="text-gray-600">Select a conversation to start messaging</p>
                                    </div>
                                </CardHeader>
                            )}
                        </Card>
                    </div>
                </TabsContent>

                {/* Course Announcements Tab */}
                <TabsContent value="announcements">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Course List */}
                        <Card className="lg:col-span-1">
                            <CardHeader>
                                <CardTitle>My Courses</CardTitle>
                                <div className="space-y-3 mt-4">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <Input
                                            placeholder="Search courses..."
                                            value={courseSearchQuery}
                                            onChange={(e) => setCourseSearchQuery(e.target.value)}
                                            className="pl-9"
                                        />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <ScrollArea className="h-125">
                                    <div className="space-y-1 p-4 pt-0">
                                        {filteredCourseAnnouncements.length > 0 ? (
                                            filteredCourseAnnouncements.map((course) => (
                                                <button
                                                    key={course.id}
                                                    onClick={() => setSelectedCourseAnnouncement(course.id)}
                                                    className={`w-full text-left p-3 rounded-lg transition-colors ${selectedCourseAnnouncement === course.id
                                                        ? 'bg-primary text-white'
                                                        : 'hover:bg-gray-100'
                                                        }`}
                                                >
                                                    <div className="flex justify-between items-start mb-1">
                                                        <span className={`font-medium ${selectedCourseAnnouncement === course.id ? '' : 'text-sm'}`}>
                                                            {course.courseName}
                                                        </span>
                                                        {course.unread > 0 && (
                                                            <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                                                {course.unread}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p
                                                        className={`text-xs mb-1 ${selectedCourseAnnouncement === course.id ? 'text-white/80' : 'text-gray-500'
                                                            }`}
                                                    >
                                                        {course.courseId} • {course.lecturer}
                                                    </p>
                                                    <p
                                                        className={`text-xs mb-1 ${selectedCourseAnnouncement === course.id ? 'text-white/70' : 'text-gray-600'
                                                            }`}
                                                    >
                                                        {course.semester}
                                                    </p>
                                                    <p
                                                        className={`text-xs truncate mb-1 ${selectedCourseAnnouncement === course.id ? 'text-white/80' : 'text-gray-600'
                                                            }`}
                                                    >
                                                        {course.lastMessage}
                                                    </p>
                                                    <span
                                                        className={`text-xs ${selectedCourseAnnouncement === course.id ? 'text-white/60' : 'text-gray-400'
                                                            }`}
                                                    >
                                                        {course.time}
                                                    </span>
                                                </button>
                                            ))
                                        ) : (
                                            <div className="text-center py-8 text-gray-500 text-sm">
                                                <Filter className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                                                <p>No courses found</p>
                                                <p className="text-xs text-gray-400 mt-1">Try adjusting your search</p>
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>

                        {/* Course Announcements Thread */}
                        <Card className="lg:col-span-2">
                            {selectedCourseAnn ? (
                                <>
                                    <CardHeader>
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <CardTitle className="mb-2">{selectedCourseAnn?.courseName}</CardTitle>
                                                <p className="text-sm text-gray-600">
                                                    {selectedCourseAnn?.courseId} - {selectedCourseAnn?.semester} - {selectedCourseAnn?.academicYear}
                                                </p>
                                                <p className="text-sm text-gray-700 mt-1">
                                                    Lecturer: {selectedCourseAnn?.lecturer}
                                                </p>
                                            </div>
                                        </div>
                                    </CardHeader>
                                </>
                            ) : (
                                <CardHeader>
                                    <div className="text-center py-8">
                                        <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                        <p className="text-gray-600">Select a course to view announcements</p>
                                    </div>
                                </CardHeader>
                            )}
                            <CardContent>
                                <ScrollArea className="h-112.5 mb-4 pr-4">
                                    <div className="space-y-4">
                                        {currentAnnouncementMessages.length > 0 ? (
                                            currentAnnouncementMessages.map((message) => (
                                                <div key={message.id}>
                                                    <div className="flex justify-start">
                                                        <div className="max-w-[85%] rounded-lg p-3 bg-blue-50 border border-blue-200">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <MessageCircle className="h-3 w-3 text-blue-600" />
                                                                <span className="text-xs font-medium text-blue-800">Course Announcement</span>
                                                            </div>
                                                            <p className="text-sm text-gray-900">{message.content}</p>
                                                            <p className="text-xs mt-1 text-gray-500">{message.time}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center py-12 text-gray-500">
                                                <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                                <p>No announcements yet</p>
                                                <p className="text-sm text-gray-400 mt-1">
                                                    Course announcements will appear here
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>

                                <div className="bg-blue-50 rounded-lg border border-blue-200 p-3">
                                    <p className="text-xs text-blue-800">
                                        <span className="font-medium">Note:</span> This is a read-only announcement channel. To communicate with your lecturer, please use the Direct Messages tab or the messaging feature in your assignment grade view.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}