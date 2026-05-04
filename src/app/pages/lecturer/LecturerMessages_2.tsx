import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { ScrollArea } from '../../components/ui/scroll-area';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import {
    Search,
    Send,
    MessageCircle,
    User,
    Clock,
    AlertCircle,
    Loader2,
    CheckCheck,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { LECTURER_STORAGE_KEYS } from '../../../constants';
import axiosInstance from '../../services/lecturer/axios';
import { getAllCourses, getCourseStudents } from '../../services/lecturer/courseService';
import { getAssignmentsForCourse, getAssignmentSubmissions } from '../../services/lecturer/assignmentService';
import {
    fetchDirectChatThread,
    formatChatTimestamp,
    type DirectChatMessage,
} from '../../services/shared/directChat';
import { useChatSocket, type UseChatSocketReturn } from '../../hooks/useChatSocket';
import { toNumericId } from '../../utils/socketUtils';

interface Course {
    course_id: string | number;
    course_code: string;
    name: string;
}

interface StudentInfo {
    id: string | number;
    name: string;
    email?: string;
    avatar?: string;
}

interface Conversation {
    studentId: string | number;
    studentName: string;
    studentEmail?: string;
    assignmentId: string | number;
    assignmentName: string;
    lastMessage?: string;
    lastMessageTime?: string;
    unreadCount?: number;
}

// ✅ Helper function to format date for date separators
const formatDateSeparator = (dateString: string): string => {
    if (!dateString) return '';

    const msgDate = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const isToday = msgDate.toDateString() === today.toDateString();
    const isYesterday = msgDate.toDateString() === yesterday.toDateString();

    if (isToday) return 'Today';
    if (isYesterday) return 'Yesterday';

    return new Intl.DateTimeFormat('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
    }).format(msgDate);
};

// ✅ Helper function to group messages by date
const groupMessagesByDate = (messages: any[]) => {
    const groups: { [key: string]: any[] } = {};

    messages.forEach((msg) => {
        const date = msg.createdAt || msg.created_at;
        const dateKey = date ? new Date(date).toDateString() : 'Unknown';

        if (!groups[dateKey]) {
            groups[dateKey] = [];
        }
        groups[dateKey].push(msg);
    });

    return groups;
};

// ✅ Message templates for lecturers
const LECTURER_MESSAGE_TEMPLATES = [
    {
        label: 'Grade Update',
        value: 'Hi, I have reviewed your submission. Your grade has been updated in the system. Please check your score and let me know if you have any questions.',
    },
    {
        label: 'Request Clarification',
        value: 'Could you please clarify your approach to this problem? I would like to better understand your reasoning before finalizing the grade.',
    },
    {
        label: 'Regrade Request Response',
        value: 'Thank you for your regrade request. I have reviewed your submission again and I maintain the original grade. The main reason is: [Please explain]',
    },
    {
        label: 'Assignment Clarification',
        value: 'Regarding your submission for this assignment: [Please provide clarification]. If you have further questions, feel free to ask during office hours.',
    },
    {
        label: 'Encouragement',
        value: 'Great effort on your recent submission! I can see your improvement. Keep up the good work and do not hesitate to reach out if you need any help.',
    },
    {
        label: 'Office Hours Invitation',
        value: 'I noticed some areas where we could discuss your progress further. Would you be interested in attending my office hours? I am available on [Days/Times].',
    },
    {
        label: 'Deadline Extension Approval',
        value: 'Your request for deadline extension has been approved. Your new deadline is [Date]. Please submit your work by then. Let me know if you need any assistance.',
    },
    {
        label: 'Additional Feedback',
        value: 'I have some additional feedback on your work: [Feedback]. Please review and feel free to discuss this with me anytime.',
    },
];

/**
 * LecturerMessages_2 - Modern messaging interface for lecturer
 * Features:
 * - Course/Assignment selection
 * - Real-time socket.io messaging
 * - Chat history loading
 * - Mark as read functionality
 * - Message templates
 */
export function LecturerMessages_2() {
    // Route and UI state
    const [searchParams, setSearchParams] = useSearchParams();
    const [selectedCourseId, setSelectedCourseId] = useState<string>('');
    const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>('');
    const [selectedStudentId, setSelectedStudentId] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');

    // Data state
    const [courses, setCourses] = useState<Course[]>([]);
    const [coursesLoading, setCoursesLoading] = useState(false);
    const [assignments, setAssignments] = useState<any[]>([]);
    const [assignmentsLoading, setAssignmentsLoading] = useState(false);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [students, setStudents] = useState<StudentInfo[]>([]);

    // Message state
    const [messageInput, setMessageInput] = useState('');
    const [historyMessages, setHistoryMessages] = useState<DirectChatMessage[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    // Current user info
    const [currentUserId, setCurrentUserId] = useState<string | number | null>(null);

    // Socket hook
    const socketChat: UseChatSocketReturn = useChatSocket({
        assignmentId: selectedAssignmentId,
        otherUserId: selectedStudentId,
        role: 'lecturer',
        autoJoin: !!selectedAssignmentId && !!selectedStudentId,
    });

    // ✅ Auto-scroll ref for messages
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Get current user
    useEffect(() => {
        const userJson = sessionStorage.getItem(LECTURER_STORAGE_KEYS.USER);
        if (userJson) {
            try {
                const user = JSON.parse(userJson);
                setCurrentUserId(user.id || user.user_id);
                console.log('Current user ID:', user.id || user.user_id);
            } catch (err) {
                console.error('Failed to parse user info:', err);
            }
        }
    }, []);

    // Load courses
    useEffect(() => {
        const loadCourses = async () => {
            try {
                setCoursesLoading(true);
                const courseData = await getAllCourses({});


                // Handle both array and object responses
                const courseArray = Array.isArray(courseData)
                    ? courseData
                    : courseData?.data.course || [];

                setCourses(courseArray);

                // Set first course as default
                if (courseArray.length > 0) {
                    const courseIdFromParams = searchParams.get('courseId');
                    setSelectedCourseId(
                        courseIdFromParams || String(courseArray[0].course_id)
                    );
                }
            } catch (error) {
                console.error('Error loading courses:', error);
                toast.error('Failed to load courses');
            } finally {
                setCoursesLoading(false);
            }
        };

        loadCourses();
    }, [searchParams]);

    // Load assignments for selected course
    useEffect(() => {
        const loadAssignments = async () => {
            if (!selectedCourseId) return;

            try {
                setAssignmentsLoading(true);
                const result = await getAssignmentsForCourse(selectedCourseId, 1, 100, '');

                // Handle various response formats
                let assignmentList: any[] = [];
                if (Array.isArray(result)) {
                    assignmentList = result;
                } else if (result?.data.course && Array.isArray(result.data.course)) {
                    assignmentList = result.data.course;
                } else if (result?.data && Array.isArray(result.data)) {
                    assignmentList = result.data;
                } else if (typeof result === 'object' && !Array.isArray(result)) {
                    // If it's an object, try to extract array from common properties
                    assignmentList = Object.values(result).find((v) => Array.isArray(v)) || [];
                }



                // Ensure it's always an array
                if (!Array.isArray(assignmentList)) {
                    assignmentList = [];
                }

                setAssignments(assignmentList);

                // Set first assignment as default
                if (assignmentList.length > 0) {
                    const assignmentIdFromParams = searchParams.get('assignmentId');
                    setSelectedAssignmentId(
                        assignmentIdFromParams || String(assignmentList[0].assignment_id || assignmentList[0].id)
                    );
                }
            } catch (error) {
                console.error('Error loading assignments:', error);
                toast.error('Failed to load assignments');
                setAssignments([]);
            } finally {
                setAssignmentsLoading(false);
            }
        };

        loadAssignments();
    }, [selectedCourseId, searchParams]);

    // Load students for selected assignment
    useEffect(() => {
        const loadStudents = async () => {
            if (!selectedAssignmentId) return;

            try {
                setAssignmentsLoading(true);
                const submissions = await getAssignmentSubmissions(
                    String(selectedAssignmentId)
                );

                // Extract unique students from submissions
                const studentMap = new Map<string | number, StudentInfo>();
                submissions.forEach((submission: any) => {
                    const studentId = submission.student_id;
                    if (studentId && !studentMap.has(studentId)) {
                        studentMap.set(studentId, {
                            id: studentId,
                            name: submission.student_name || 'Unknown Student',
                            email: submission.student_email,
                        });
                    }
                });

                const studentData = Array.from(studentMap.values());
                setStudents(studentData);

                // Find the assignment name
                const assignment = assignments.find(
                    (a) => String(a.assignment_id || a.id) === String(selectedAssignmentId)
                );

                // Create conversation list from students
                const convos: Conversation[] = studentData.map((student) => ({
                    studentId: student.id,
                    studentName: student.name,
                    studentEmail: student.email,
                    assignmentId: selectedAssignmentId,
                    assignmentName: assignment?.title || assignment?.name || '',
                }));

                setConversations(convos);

                // Set first student as default
                if (studentData.length > 0) {
                    const studentIdFromParams = searchParams.get('studentId');
                    setSelectedStudentId(
                        studentIdFromParams || String(studentData[0].id)
                    );
                }
            } catch (error) {
                console.error('Error loading students:', error);
                // Don't show error toast as not all assignments may have submissions
            } finally {
                setAssignmentsLoading(false);
            }
        };

        loadStudents();
    }, [selectedAssignmentId, searchParams]);

    // Load chat history
    useEffect(() => {
        const loadChatHistory = async () => {
            if (!selectedAssignmentId || !selectedStudentId) return;

            try {
                setHistoryLoading(true);
                const thread = await fetchDirectChatThread(
                    axiosInstance,
                    String(selectedAssignmentId),
                    String(selectedStudentId)
                );
                setHistoryMessages(thread.messages);
                console.log('Loaded chat history:', thread.messages);
                // Clear socket messages when loading new history to prevent duplicates
                socketChat.setMessages([]);
            } catch (error) {
                console.error('Error loading chat history:', error);
                // Don't show error toast for history load failures
            } finally {
                setHistoryLoading(false);
            }
        };

        loadChatHistory();
    }, [selectedAssignmentId, selectedStudentId]);

    // Merge history and socket messages with deduplication
    const allMessages = (() => {
        const historyMsgs = historyMessages.map((msg) => ({
            id: msg.id,
            sender: msg.isFromReceiverUser ? 'sent' : 'received',
            content: msg.content,
            time: formatChatTimestamp(msg.createdAt),
            isRead: msg.isRead || false,
            createdAt: msg.createdAt,
        }));

        const socketMsgs = socketChat.messages.map((msg) => ({
            id: msg.chat_id,
            sender: msg.sender_id === currentUserId ? 'sent' : 'received',
            content: msg.message,
            time: formatChatTimestamp(msg.created_at),
            isRead: msg.is_read,
            createdAt: msg.created_at,
        }));

        // Deduplicate: keep track of seen IDs and filter duplicates
        const seenIds = new Set<string | number>();
        const deduplicatedMessages = [];

        // Add history messages first (they're more reliable)
        for (const msg of historyMsgs) {
            if (!seenIds.has(msg.id)) {
                seenIds.add(msg.id);
                deduplicatedMessages.push(msg);
            }
        }

        // Add socket messages only if not already in history
        for (const msg of socketMsgs) {
            if (!seenIds.has(msg.id)) {
                seenIds.add(msg.id);
                deduplicatedMessages.push(msg);
            }
        }

        return deduplicatedMessages;
    })();

    // ✅ Auto-scroll to latest message
    useEffect(() => {
        // Find the scrollable viewport inside ScrollArea and scroll only within it
        if (scrollContainerRef.current) {
            const scrollViewport = scrollContainerRef.current.querySelector('[data-slot="scroll-area-viewport"]') as HTMLElement;
            if (scrollViewport) {
                // Scroll only the viewport, not the entire page
                scrollViewport.scrollTop = scrollViewport.scrollHeight;
            }
        }
    }, [allMessages]);

    // Filter conversations based on search
    const filteredConversations = conversations.filter((conv) =>
        conv.studentName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSendMessage = () => {
        if (!messageInput.trim()) {
            toast.warning('Please enter a message');
            return;
        }

        socketChat.sendMessage(messageInput);
        setMessageInput('');

        // Show success toast
        toast.success('Message sent');
    };

    const handleMarkAsRead = () => {
        socketChat.markAsRead();
    };

    const handleTemplateSelect = (templateValue: string) => {
        if (templateValue) {
            setMessageInput(templateValue);
        }
    };

    const handleSelectConversation = (conv: Conversation) => {
        setSelectedStudentId(String(conv.studentId));
        setSearchParams({
            courseId: selectedCourseId,
            assignmentId: String(conv.assignmentId),
            studentId: String(conv.studentId),
        });
    };

    return (
        <div className="flex flex-col gap-4 p-6 h-screen bg-gray-50">
            {/* Header */}
            <div className="mb-4">
                <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
                <p className="text-gray-500 mt-1">Direct messaging with students</p>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Course
                    </label>
                    <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                        <SelectTrigger disabled={coursesLoading}>
                            <SelectValue placeholder="Select a course" />
                        </SelectTrigger>
                        <SelectContent>
                            {Array.isArray(courses) && courses.map((course) => (
                                <SelectItem key={course.course_id} value={String(course.course_id)}>
                                    {course.course_code} - {course.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Assignment
                    </label>
                    <Select
                        value={selectedAssignmentId}
                        onValueChange={setSelectedAssignmentId}
                    >
                        <SelectTrigger disabled={assignmentsLoading}>
                            <SelectValue placeholder="Select an assignment" />
                        </SelectTrigger>
                        <SelectContent>
                            {Array.isArray(assignments) && assignments.length > 0 ? (
                                assignments.map((assignment) => (
                                    <SelectItem
                                        key={assignment.assignment_id || assignment.id}
                                        value={String(assignment.assignment_id || assignment.id)}
                                    >
                                        {assignment.title || assignment.name}
                                    </SelectItem>
                                ))
                            ) : null}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Main content */}
            <div className="flex flex-1 gap-4 min-h-0">
                {/* Conversations list */}
                <Card className="w-full md:w-80 flex flex-col">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <MessageCircle className="w-5 h-5" />
                            Conversations
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col pb-3">
                        {/* Search */}
                        <div className="relative mb-3">
                            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="Search students..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8"
                            />
                        </div>

                        {/* Conversations list */}
                        <ScrollArea className="flex-1">
                            <div className="space-y-2 pr-4">
                                {assignmentsLoading ? (
                                    <div className="flex items-center justify-center py-8">
                                        <Loader2 className="w-5 h-5 animate-spin text-red-500" />
                                    </div>
                                ) : filteredConversations.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        <User className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                                        <p>No conversations found</p>
                                    </div>
                                ) : (
                                    filteredConversations.map((conv) => (
                                        <button
                                            key={`${conv.studentId}-${conv.assignmentId}`}
                                            onClick={() => handleSelectConversation(conv)}
                                            className={`w-full text-left p-3 rounded-lg transition-colors ${String(selectedStudentId) === String(conv.studentId)
                                                ? 'bg-red-100 border-2 border-red-500'
                                                : 'hover:bg-gray-100'
                                                }`}
                                        >
                                            <div className="font-medium text-sm text-gray-900">
                                                {conv.studentName}
                                            </div>
                                            {conv.studentEmail && (
                                                <div className="text-xs text-gray-500">
                                                    {conv.studentEmail}
                                                </div>
                                            )}
                                            {conv.unreadCount && conv.unreadCount > 0 && (
                                                <Badge className="mt-1 bg-red-500">
                                                    {conv.unreadCount}
                                                </Badge>
                                            )}
                                        </button>
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>

                {/* Chat area */}
                <Card className="flex-1 flex flex-col h-150">
                    {selectedStudentId ? (
                        <>
                            {/* Chat header */}
                            <CardHeader className="pb-3 border-b shrink-0">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-lg">
                                            {conversations.find(
                                                (c) => String(c.studentId) === String(selectedStudentId)
                                            )?.studentName || 'Student'}
                                        </CardTitle>
                                        <p className="text-sm text-gray-500">
                                            {conversations.find(
                                                (c) => String(c.studentId) === String(selectedStudentId)
                                            )?.studentEmail || ''}
                                        </p>
                                    </div>
                                    {socketChat.error && (
                                        <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-2 rounded">
                                            <AlertCircle className="w-4 h-4" />
                                            <span className="text-sm">
                                                {socketChat.error}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </CardHeader>

                            {/* Messages area */}
                            <ScrollArea className="flex-1 min-h-0 p-6" ref={scrollContainerRef}>
                                <div className="space-y-4 pr-4">
                                    {historyLoading && socketChat.messages.length === 0 ? (
                                        <div className="flex items-center justify-center h-full">
                                            <Loader2 className="w-5 h-5 animate-spin text-red-500" />
                                        </div>
                                    ) : allMessages.length === 0 ? (
                                        <div className="text-center py-8 text-gray-500">
                                            <MessageCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                                            <p>No messages yet. Start a conversation!</p>
                                        </div>
                                    ) : (
                                        allMessages.map((msg, index) => {
                                            // ✅ Show date separator when date changes
                                            const showDateSeparator = index === 0 ||
                                                new Date(allMessages[index - 1].createdAt).toDateString() !==
                                                new Date(msg.createdAt).toDateString();

                                            return (
                                                <div key={index}>
                                                    {showDateSeparator && (
                                                        <div className="flex items-center justify-center my-4">
                                                            <div className="flex-1 border-t border-gray-300"></div>
                                                            <span className="px-3 text-xs font-medium text-gray-500 bg-white">
                                                                {formatDateSeparator(msg.createdAt)}
                                                            </span>
                                                            <div className="flex-1 border-t border-gray-300"></div>
                                                        </div>
                                                    )}
                                                    <div
                                                        className={`flex ${msg.sender === 'sent'
                                                            ? 'justify-end'
                                                            : 'justify-start'
                                                            }`}
                                                    >
                                                        <div
                                                            className={`max-w-xs px-4 py-2 rounded-lg ${msg.sender === 'sent'
                                                                ? 'bg-red-500 text-white'
                                                                : 'bg-gray-200 text-gray-900'
                                                                }`}
                                                        >
                                                            <p className="text-sm wrap-break-word">
                                                                {msg.content}
                                                            </p>
                                                            <div className="flex items-center gap-1 mt-1">
                                                                <span className="text-xs opacity-70">
                                                                    {msg.time}
                                                                </span>
                                                                {msg.sender === 'sent' && msg.isRead && (
                                                                    <CheckCheck className="w-4 h-4 opacity-70" />
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                    {/* ✅ Scroll anchor */}
                                    <div ref={messagesEndRef} />
                                </div>
                            </ScrollArea>

                            {/* Input area */}
                            <div className="border-t p-4 space-y-3 shrink-0">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleMarkAsRead}
                                    className="w-full"
                                >
                                    <Clock className="w-4 h-4 mr-2" />
                                    Mark as Read
                                </Button>

                                {/* ✅ Template selector */}
                                <Select onValueChange={handleTemplateSelect}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select a message template" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {LECTURER_MESSAGE_TEMPLATES.map((template) => (
                                            <SelectItem key={template.value} value={template.value}>
                                                {template.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <div className="flex gap-2">
                                    <Textarea
                                        placeholder="Type your message..."
                                        value={messageInput}
                                        onChange={(e) => setMessageInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && e.ctrlKey) {
                                                handleSendMessage();
                                            }
                                        }}
                                        className="resize-none flex-1"
                                        rows={3}
                                    />
                                    {/* ✅ Circular send button */}
                                    <Button
                                        onClick={handleSendMessage}
                                        className="bg-red-600 hover:bg-red-700 rounded-full w-12 h-12 p-0 flex items-center justify-center shrink-0 self-end"
                                        disabled={!messageInput.trim() || socketChat.loading}
                                        title={socketChat.loading ? 'Sending...' : 'Send (Ctrl+Enter)'}
                                    >
                                        <Send className="w-5 h-5" />
                                    </Button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center justify-center flex-1">
                            <div className="text-center">
                                <MessageCircle className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                                <p className="text-gray-500 text-lg">
                                    Select a conversation to start messaging
                                </p>
                            </div>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}


export default LecturerMessages_2;
