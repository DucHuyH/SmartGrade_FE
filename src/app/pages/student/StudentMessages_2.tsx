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
    Plus,
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '../../components/ui/dialog';
import { toast } from 'react-toastify';
import { STUDENT_STORAGE_KEYS } from '../../../constants';
import axiosInstance from '../../services/student/axios';
import { getStudentCourses } from '../../services/student/courseService';
import {
    fetchChatConversations,
    fetchDirectChatThread,
    formatChatTimestamp,
    type ChatConversationSummary,
    type DirectChatMessage,
} from '../../services/shared/directChat';
import { useChatSocket, type UseChatSocketReturn } from '../../hooks/useChatSocket';
import { toNumericId } from '../../utils/socketUtils';

interface Course {
    course_id: string | number;
    course_code: string;
    name: string;
    lecturer_id?: string | number;
    lecturer_name?: string;
    lecturer_email?: string;
    lecturer?: {
        name: string;
        email: string;
    };
}

interface Lecturer {
    lecturer_id: string | number;
    name: string;
    email: string;
    lecturer_code?: string;
}

interface Assignment {
    assignment_id: string | number;
    title: string;
    lecturerId?: string | number;
    lecturerName?: string;
    lecturerEmail?: string;
}

interface LecturerInfo {
    id: string | number;
    name: string;
    email?: string;
    avatar?: string;
}

// Use server-provided conversation summary
// Conversation shape is ChatConversationSummary from shared/directChat

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

const getConversationInitials = (name: string): string => {
    const words = name.trim().split(/\s+/).filter(Boolean);

    if (words.length === 0) {
        return 'U';
    }

    if (words.length === 1) {
        return words[0].slice(0, 1).toUpperCase();
    }

    return `${words[0][0]}${words[1][0]}`.toUpperCase();
};

const getConversationPreview = (conversation: ChatConversationSummary): string => {
    if (!conversation.lastMessage) {
        return 'No messages yet';
    }

    return conversation.lastMessage;
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

// ✅ Message templates for students
const STUDENT_MESSAGE_TEMPLATES = [
    {
        label: 'Grade Inquiry',
        value: 'Hi Professor, I wanted to check on my grade for the recent assignment. Could you provide some feedback on what I could improve?',
    },
    {
        label: 'Regrade Request',
        value: 'I would like to request a regrade for my submission. I believe there might be an error in the evaluation. Could we discuss this further?',
    },
    {
        label: 'Request for Clarification',
        value: 'I have a question about the assignment requirements. Could you clarify [specific point]? I want to make sure I understand correctly.',
    },
    {
        label: 'Deadline Extension Request',
        value: 'I am writing to request a deadline extension for this assignment. Due to [reason], I need additional time to complete the work. Thank you for considering.',
    },
    {
        label: 'Office Hours Interest',
        value: 'I am interested in attending your office hours to discuss my progress in the course. What times are available?',
    },
    {
        label: 'Submission Confirmation',
        value: 'I have completed and submitted the assignment. Please let me know if you have any questions or need additional information.',
    },
    {
        label: 'General Question',
        value: 'I have a question about [topic]. Could you help me understand this concept better? Any resources or explanation would be helpful.',
    },
    {
        label: 'Thank You Note',
        value: 'Thank you for the valuable feedback on my previous assignment. I will work on improving in those areas for future submissions.',
    },
];

/**
 * StudentMessages_2 - Modern messaging interface for students
 * Features:
 * - Course/Assignment selection
 * - Real-time socket.io messaging with lecturers
 * - Chat history loading
 * - Mark as read functionality
 * - Message templates
 */
export function StudentMessages_2() {
    // Route and UI state
    const [searchParams, setSearchParams] = useSearchParams();
    const [selectedCourseId, setSelectedCourseId] = useState<string>('');
    const [selectedLecturerId, setSelectedLecturerId] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');

    // Data state
    const [courses, setCourses] = useState<Course[]>([]);
    const [coursesLoading, setCoursesLoading] = useState(false);
    const [conversations, setConversations] = useState<ChatConversationSummary[]>([]);
    const [conversationsLoading, setConversationsLoading] = useState(false);
    const [lecturers, setLecturers] = useState<LecturerInfo[]>([]); // kept for legacy usage if needed

    // ✅ Course lecturers for messaging without history
    const [courseLecturers, setCourseLecturers] = useState<Lecturer[]>([]);

    // Message state
    const [messageInput, setMessageInput] = useState('');
    const [historyMessages, setHistoryMessages] = useState<DirectChatMessage[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    // Current user info
    const [currentUserId, setCurrentUserId] = useState<string | number | null>(null);

    // Socket hook
    const socketChat: UseChatSocketReturn = useChatSocket({
        courseId: selectedCourseId,
        otherUserId: selectedLecturerId,
        role: 'student',
        autoJoin: !!selectedCourseId && !!selectedLecturerId,
    });

    // ✅ Auto-scroll ref for messages
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const prevSocketCountRef = useRef<number>(0);

    // Get current user
    useEffect(() => {
        const userJson = sessionStorage.getItem(STUDENT_STORAGE_KEYS.USER);
        if (userJson) {
            try {
                const user = JSON.parse(userJson);
                setCurrentUserId(user.id || user.user_id);
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
                const result = await getStudentCourses({});
                setCourses(result.courses);

                // Set first course as default
                if (result.courses.length > 0) {
                    const courseIdFromParams = searchParams.get('courseId');
                    setSelectedCourseId(
                        courseIdFromParams || String(result.courses[0].course_id)
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

    // ✅ Extract lecturers from courses for current course
    useEffect(() => {
        if (!selectedCourseId) return;

        const currentCourse = courses.find(c => String(c.course_id) === selectedCourseId);
        console.log('Selected course:', currentCourse);
        if (!currentCourse) {
            setCourseLecturers([]);
            return;
        }

        // Extract lecturer info from course
        const lecturer: Lecturer = {
            lecturer_id: currentCourse.lecturer_id || '',
            name: currentCourse.lecturer?.name || 'Unknown Lecturer',
            email: currentCourse.lecturer?.email || '',
            lecturer_code: '',
        };

        if (lecturer.lecturer_id) {
            setCourseLecturers([lecturer]);
        } else {
            setCourseLecturers([]);
        }
    }, [selectedCourseId, courses]);

    // Load conversations for selected course (student side)
    useEffect(() => {
        const loadConversationsForCourse = async () => {
            if (!selectedCourseId || !currentUserId) return;

            try {
                setConversationsLoading(true);
                const list = await fetchChatConversations(
                    axiosInstance,
                    selectedCourseId,
                    currentUserId
                );

                setConversations(list);

                const lecturerIdFromParams = searchParams.get('lecturerId');
                const initial = lecturerIdFromParams
                    ? list.find((c) => String(c.otherUserId) === lecturerIdFromParams)
                    : list[0];

                if (initial?.otherUserId !== null && initial?.otherUserId !== undefined) {
                    setSelectedLecturerId(String(initial.otherUserId));
                }
            } catch (error) {
                console.error('Error loading conversations:', error);
                toast.error('Failed to load conversations');
                setConversations([]);
            } finally {
                setConversationsLoading(false);
            }
        };

        loadConversationsForCourse();
    }, [selectedCourseId, currentUserId, searchParams]);

    // Load chat history
    useEffect(() => {
        const loadChatHistory = async () => {
            if (!selectedCourseId || !selectedLecturerId) return;

            try {
                setHistoryLoading(true);
                const thread = await fetchDirectChatThread(
                    axiosInstance,
                    String(selectedCourseId),
                    String(selectedLecturerId)
                );
                setHistoryMessages(thread.messages);
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
    }, [selectedCourseId, selectedLecturerId]);

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

    // Filter conversations based on search (name/email/code/message)
    const filteredConversations = conversations.filter((conv) => {
        const q = searchQuery.toLowerCase();
        return [
            conv.otherUserName,
            conv.otherUserEmail,
            conv.otherUserCode,
            conv.lastMessage,
        ]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(q));
    });

    const handleSendMessage = () => {
        if (!messageInput.trim()) {
            toast.warning('Please enter a message');
            return;
        }

        // Optimistically update conversation preview for the currently selected conversation
        try {
            const now = new Date().toISOString();

            setConversations((prev) => {
                // Check if conversation exists
                const existingConvIdx = prev.findIndex((c) => String(c.otherUserId) === String(selectedLecturerId));
                let updated: ChatConversationSummary[];

                if (existingConvIdx >= 0) {
                    // Conversation exists - update it
                    updated = prev.map((c) => {
                        if (String(c.otherUserId) === String(selectedLecturerId)) {
                            return {
                                ...c,
                                lastMessage: messageInput,
                                lastMessageTime: now,
                                lastMessageIsRead: true,
                            };
                        }
                        return c;
                    });
                } else {
                    // Conversation doesn't exist - create new one from courseLecturers
                    const lecturer = courseLecturers.find((l) => String(l.lecturer_id) === String(selectedLecturerId));
                    if (lecturer) {
                        const newConversation: ChatConversationSummary = {
                            courseId: selectedCourseId ? Number(selectedCourseId) : null,
                            otherUserId: Number(lecturer.lecturer_id),
                            otherUserName: lecturer.name,
                            otherUserEmail: lecturer.email,
                            otherUserCode: lecturer.lecturer_code || '',
                            otherUserRole: null,
                            lastMessage: messageInput,
                            lastMessageTime: now,
                            lastMessageIsRead: true,
                            unreadCount: 0,
                        };
                        updated = [newConversation, ...prev];
                    } else {
                        updated = prev;
                    }
                }

                // Move selected conv to top if exists and not already at top
                const idx = updated.findIndex((c) => String(c.otherUserId) === String(selectedLecturerId));
                if (idx > 0) {
                    const [item] = updated.splice(idx, 1);
                    return [item, ...updated];
                }
                return updated;
            });
        } catch (err) {
            console.error('Error updating conversation preview optimistically:', err);
        }

        socketChat.sendMessage(messageInput);
        setMessageInput('');

        // Show success toast
        toast.success('Message sent');
    };

    // Sync conversation list when socket messages arrive
    useEffect(() => {
        const msgs = socketChat.messages || [];
        if (!msgs.length) {
            prevSocketCountRef.current = 0;
            return;
        }

        // Process only new messages since last observed count
        const start = Math.max(0, prevSocketCountRef.current);
        const newMsgs = msgs.slice(start);

        if (newMsgs.length === 0) return;

        newMsgs.forEach((m) => {
            const senderId = String(m.sender_id ?? m.sender?.user_id ?? '');
            const receiverId = String(m.receiver_id ?? m.receiver?.user_id ?? '');
            const partnerId = String(senderId === String(currentUserId) ? receiverId : senderId);
            const text = String(m.message ?? '');
            const time = String(m.created_at ?? '');
            const isFromMe = String(m.sender_id) === String(currentUserId);

            setConversations((prev) => {
                let found = false;
                const updated = prev.map((c) => {
                    if (String(c.otherUserId) === partnerId) {
                        found = true;
                        // If this message is for the currently open conversation, mark as read and do not increment unread
                        const isActive = String(partnerId) === String(selectedLecturerId);
                        return {
                            ...c,
                            lastMessage: text,
                            lastMessageTime: time,
                            lastMessageIsRead: isActive ? true : (isFromMe ? true : false),
                            unreadCount: isActive ? 0 : (isFromMe ? c.unreadCount : ((c.unreadCount || 0) + 1)),
                        };
                    }
                    return c;
                });

                if (found) {
                    // move updated conv to top
                    const top = updated.find((c) => String(c.otherUserId) === partnerId)!;
                    const rest = updated.filter((c) => String(c.otherUserId) !== partnerId);
                    // If active conversation updated, inform server that messages are read
                    if (String(partnerId) === String(selectedLecturerId)) {
                        try {
                            socketChat.markAsRead();
                        } catch (err) {
                            console.error('Error marking chat as read via socket:', err);
                        }
                    }
                    return [top, ...rest];
                }

                // If not found, create a minimal conversation entry using sender/receiver info
                const isActiveNew = String(partnerId) === String(selectedLecturerId);
                const newConv: ChatConversationSummary = {
                    courseId: null,
                    otherUserId: partnerId as unknown as number,
                    otherUserName: (m.sender?.name ?? m.receiver?.name ?? '') as string,
                    otherUserEmail: (m.sender?.email ?? m.receiver?.email ?? '') as string,
                    otherUserCode: '',
                    otherUserRole: m.sender?.role ?? null,
                    lastMessage: text,
                    lastMessageTime: time,
                    unreadCount: isActiveNew ? 0 : (isFromMe ? 0 : 1),
                    lastMessageIsRead: isActiveNew ? true : isFromMe,
                };

                // If new conversation is active, mark read on server
                if (isActiveNew) {
                    try {
                        socketChat.markAsRead();
                    } catch (err) {
                        console.error('Error marking new chat as read via socket:', err);
                    }
                }

                return [newConv, ...prev];
            });
        });

        prevSocketCountRef.current = msgs.length;
    }, [socketChat.messages, currentUserId, selectedLecturerId]);

    const handleMarkAsRead = () => {
        socketChat.markAsRead();
    };

    const handleTemplateSelect = (templateValue: string) => {
        if (templateValue) {
            setMessageInput(templateValue);
        }
    };

    const handleSelectConversation = (conv: ChatConversationSummary) => {
        setSelectedLecturerId(String(conv.otherUserId));
        setSearchParams({
            courseId: selectedCourseId,
            lecturerId: String(conv.otherUserId),
        });
    };

    // ✅ Handle selecting lecturer from course (may not have conversation history)
    const handleSelectLecturer = (lecturer: Lecturer) => {
        setSelectedLecturerId(String(lecturer.lecturer_id));
        setSearchParams({
            courseId: selectedCourseId,
            lecturerId: String(lecturer.lecturer_id),
        });
        toast.success(`Starting conversation with ${lecturer.name}`);
    };

    return (
        <div className="flex min-h-screen flex-col gap-4 bg-gray-50 p-4 lg:p-6 overflow-x-hidden">
            {/* Header */}
            <div className="mb-4">
                <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
                <p className="text-gray-500 mt-1">Direct messaging with lecturers</p>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
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
            </div>

            {/* Main content */}
            <div className="flex flex-1 flex-col gap-4 min-h-0 lg:flex-row lg:items-stretch">
                {/* Conversations list */}
                <Card className="w-full flex flex-col lg:w-96 lg:min-w-[20rem] max-w-full overflow-hidden">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <MessageCircle className="w-5 h-5" />
                            Conversations
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col pb-3 overflow-hidden">
                        {/* Search */}
                        <div className="relative mb-3">
                            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="Search lecturers..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8"
                            />
                        </div>

                        {/* Conversations list */}
                        <ScrollArea className="flex-1 pr-2">
                            <div className="space-y-2">
                                {/* ✅ Course lecturers (always available) */}
                                {courseLecturers.length > 0 && (
                                    <>
                                        <div className="sticky top-0 bg-gray-50 px-2 py-2 text-xs font-semibold text-gray-600 border-b">
                                            COURSE LECTURER
                                        </div>
                                        {courseLecturers.map((lecturer) => (
                                            <button
                                                key={lecturer.lecturer_id}
                                                onClick={() => handleSelectLecturer(lecturer)}
                                                className={`w-full text-left p-3 rounded-lg transition-colors ${String(selectedLecturerId) === String(lecturer.lecturer_id)
                                                    ? 'bg-red-50 border border-red-200'
                                                    : 'hover:bg-gray-100'
                                                    }`}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-linear-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                                                        {getConversationInitials(lecturer.name)}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-medium text-sm text-gray-900 truncate">
                                                            {lecturer.name}
                                                        </p>
                                                        <p className="text-xs text-gray-500 truncate">
                                                            {lecturer.email}
                                                        </p>
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                        {filteredConversations.length > 0 && (
                                            <div className="sticky top-0 bg-gray-50 px-2 py-2 text-xs font-semibold text-gray-600 border-b mt-2">
                                                MESSAGE HISTORY
                                            </div>
                                        )}
                                    </>
                                )}

                                {conversationsLoading ? (
                                    <div className="flex items-center justify-center py-8">
                                        <Loader2 className="w-5 h-5 animate-spin text-red-500" />
                                    </div>
                                ) : filteredConversations.length === 0 ? (
                                    courseLecturers.length === 0 && (
                                        <div className="text-center py-8 text-gray-500">
                                            <User className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                                            <p>No conversations</p>
                                        </div>
                                    )
                                ) : (
                                    filteredConversations.map((conv) => (
                                        <button
                                            key={conv.otherUserId}
                                            onClick={() => handleSelectConversation(conv)}
                                            className={`w-full text-left p-3 rounded-xl border transition-all overflow-hidden ${String(selectedLecturerId) === String(conv.otherUserId)
                                                ? 'bg-red-50 border-red-200 shadow-sm'
                                                : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                                }`}
                                        >
                                            <div className="flex items-start gap-3 min-w-0">
                                                <div
                                                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${String(selectedLecturerId) === String(conv.otherUserId)
                                                        ? 'bg-red-600 text-white'
                                                        : 'bg-gray-200 text-gray-700'
                                                        }`}
                                                >
                                                    {getConversationInitials(conv.otherUserName)}
                                                </div>

                                                <div className="flex-1 min-w-0 overflow-hidden">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <div className="font-semibold text-sm text-gray-900 wrap-break-word">
                                                            {conv.otherUserName}
                                                        </div>
                                                        <span className="text-xs text-gray-500 shrink-0">
                                                            {formatChatTimestamp(conv.lastMessageTime)}
                                                        </span>
                                                    </div>

                                                    <div className="mt-1 text-xs text-gray-500 space-y-1">
                                                        {conv.otherUserCode && (
                                                            <span className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">
                                                                {conv.otherUserCode}
                                                            </span>
                                                        )}

                                                        {conv.otherUserEmail && (
                                                            <div className="wrap-break-word whitespace-normal text-gray-600">
                                                                {conv.otherUserEmail}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="mt-2 text-sm text-gray-700 whitespace-normal wrap-break-word line-clamp-2">
                                                        {getConversationPreview(conv)}
                                                    </div>

                                                    <div className="mt-2 flex items-center justify-between">
                                                        <div className="text-xs text-gray-400">
                                                            {conv.lastMessageIsRead ? 'Read' : 'Unread message'}
                                                        </div>

                                                        {conv.unreadCount > 0 && (
                                                            <Badge className="bg-red-500 text-white">
                                                                {conv.unreadCount}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>

                {/* Chat area */}
                <Card className="w-full flex-1 min-w-0 flex flex-col h-180 overflow-hidden lg:h-[calc(100vh-6rem)]">
                    {selectedLecturerId ? (
                        <>
                            {/* Chat header */}
                            <CardHeader className="pb-3 border-b shrink-0">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-lg">
                                            {(() => {
                                                const convInfo = conversations.find(
                                                    (c) => String(c.otherUserId) === String(selectedLecturerId)
                                                );
                                                const lecturerInfo = courseLecturers.find(
                                                    (l) => String(l.lecturer_id) === String(selectedLecturerId)
                                                );
                                                return convInfo?.otherUserName || lecturerInfo?.name || 'Lecturer';
                                            })()}
                                        </CardTitle>
                                        <p className="text-sm text-gray-500">
                                            {(() => {
                                                const convInfo = conversations.find(
                                                    (c) => String(c.otherUserId) === String(selectedLecturerId)
                                                );
                                                const lecturerInfo = courseLecturers.find(
                                                    (l) => String(l.lecturer_id) === String(selectedLecturerId)
                                                );
                                                return convInfo?.otherUserEmail || lecturerInfo?.email || 'Course Discussion';
                                            })()}
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
                                        {STUDENT_MESSAGE_TEMPLATES.map((template) => (
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
                                    Select an assignment to start messaging
                                </p>
                            </div>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}

export default StudentMessages_2;
