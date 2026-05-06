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
import { getAllCourses } from '../../services/lecturer/courseService';
import {
    fetchChatConversations,
    fetchDirectChatThread,
    formatChatTimestamp,
    type ChatConversationSummary,
    type DirectChatMessage,
} from '../../services/shared/directChat';
import { useChatSocket, type UseChatSocketReturn } from '../../hooks/useChatSocket';

interface Course {
    course_id: string | number;
    course_code: string;
    name: string;
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
    const [selectedStudentId, setSelectedStudentId] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');

    // Data state
    const [courses, setCourses] = useState<Course[]>([]);
    const [coursesLoading, setCoursesLoading] = useState(false);
    const [conversations, setConversations] = useState<ChatConversationSummary[]>([]);
    const [conversationsLoading, setConversationsLoading] = useState(false);

    // Message state
    const [messageInput, setMessageInput] = useState('');
    const [historyMessages, setHistoryMessages] = useState<DirectChatMessage[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    // Current user info
    const [currentUserId, setCurrentUserId] = useState<string | number | null>(null);

    // Socket hook
    const socketChat: UseChatSocketReturn = useChatSocket({
        courseId: selectedCourseId,
        otherUserId: selectedStudentId,
        role: 'lecturer',
        autoJoin: !!selectedCourseId && !!selectedStudentId,
    });

    // ✅ Auto-scroll ref for messages
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const prevSocketCountRef = useRef<number>(0);

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

    // Load conversations for selected course and lecturer
    useEffect(() => {
        const loadConversationsForCourse = async () => {
            if (!selectedCourseId || !currentUserId) return;

            try {
                setConversationsLoading(true);
                const conversationList = await fetchChatConversations(
                    axiosInstance,
                    selectedCourseId,
                    currentUserId
                );

                setConversations(conversationList);

                const studentIdFromParams = searchParams.get('studentId');
                const initialConversation = studentIdFromParams
                    ? conversationList.find(
                        (conversation) => String(conversation.otherUserId) === studentIdFromParams
                    )
                    : conversationList[0];

                if (initialConversation?.otherUserId !== null && initialConversation?.otherUserId !== undefined) {
                    setSelectedStudentId(String(initialConversation.otherUserId));
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
            if (!selectedCourseId || !selectedStudentId || !currentUserId) return;

            try {
                setHistoryLoading(true);
                const thread = await fetchDirectChatThread(
                    axiosInstance,
                    String(selectedCourseId),
                    String(selectedStudentId),
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
    }, [selectedCourseId, selectedStudentId, currentUserId]);

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
    const filteredConversations = conversations.filter((conversation) => {
        const query = searchQuery.toLowerCase();

        return [
            conversation.otherUserName,
            conversation.otherUserEmail,
            conversation.otherUserCode,
            conversation.lastMessage,
        ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(query));
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
                const updated = prev.map((c) => {
                    if (String(c.otherUserId) === String(selectedStudentId)) {
                        return {
                            ...c,
                            lastMessage: messageInput,
                            lastMessageTime: now,
                            lastMessageIsRead: true,
                        };
                    }
                    return c;
                });

                // Move selected conv to top if exists
                const idx = updated.findIndex((c) => String(c.otherUserId) === String(selectedStudentId));
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
                        const isActive = String(partnerId) === String(selectedStudentId);
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
                    const top = updated.find((c) => String(c.otherUserId) === partnerId)!;
                    const rest = updated.filter((c) => String(c.otherUserId) !== partnerId);
                    if (String(partnerId) === String(selectedStudentId)) {
                        try {
                            socketChat.markAsRead();
                        } catch (err) {
                            console.error('Error marking chat as read via socket:', err);
                        }
                    }
                    return [top, ...rest];
                }

                const isActiveNew = String(partnerId) === String(selectedStudentId);
                const newConv: ChatConversationSummary = {
                    courseId: null,
                    otherUserId: partnerId as unknown as number,
                    otherUserName: (m.sender?.name ?? m.receiver?.name ?? 'Unknown') as string,
                    otherUserEmail: (m.sender?.email ?? m.receiver?.email ?? '') as string,
                    otherUserCode: '',
                    otherUserRole: m.sender?.role ?? null,
                    lastMessage: text,
                    lastMessageTime: time,
                    unreadCount: isActiveNew ? 0 : (isFromMe ? 0 : 1),
                    lastMessageIsRead: isActiveNew ? true : isFromMe,
                };

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
    }, [socketChat.messages, currentUserId, selectedStudentId]);

    const handleMarkAsRead = () => {
        socketChat.markAsRead();
    };

    const handleTemplateSelect = (templateValue: string) => {
        if (templateValue) {
            setMessageInput(templateValue);
        }
    };

    const handleSelectConversation = (conv: ChatConversationSummary) => {
        setSelectedStudentId(String(conv.otherUserId));
        setSearchParams({
            courseId: selectedCourseId,
            studentId: String(conv.otherUserId),
        });
    };

    return (
        <div className="flex min-h-screen flex-col gap-4 bg-gray-50 p-4 lg:p-6 overflow-x-hidden">
            {/* Header */}
            <div className="mb-4">
                <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
                <p className="text-gray-500 mt-1">Direct messaging with students</p>
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
                    <CardHeader className="pb-3 border-b">
                        <div className="flex items-start justify-between gap-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <MessageCircle className="w-5 h-5" />
                                Conversations
                            </CardTitle>
                            <Badge variant="secondary" className="shrink-0">
                                {conversations.length}
                            </Badge>
                        </div>
                    </CardHeader>

                    <CardContent className="flex-1 flex flex-col pb-3 overflow-hidden">
                        {/* Search */}
                        <div className="relative mb-3">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="Search people or messages..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8"
                            />
                        </div>

                        {/* Conversations list */}
                        <ScrollArea className="flex-1 pr-2">
                            <div className="space-y-2">
                                {filteredConversations.map((conv) => (
                                    <button
                                        key={conv.otherUserId}
                                        onClick={() => handleSelectConversation(conv)}
                                        className={`w-full text-left p-3 rounded-xl border transition-all overflow-hidden ${String(selectedStudentId) === String(conv.otherUserId)
                                            ? 'bg-red-50 border-red-200 shadow-sm'
                                            : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                            }`}
                                    >
                                        <div className="flex items-start gap-3 min-w-0">
                                            {/* Avatar */}
                                            <div
                                                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${String(selectedStudentId) === String(conv.otherUserId)
                                                    ? 'bg-red-600 text-white'
                                                    : 'bg-gray-200 text-gray-700'
                                                    }`}
                                            >
                                                {getConversationInitials(conv.otherUserName)}
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0 overflow-hidden">
                                                {/* Name + time */}
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="font-semibold text-sm text-gray-900 wrap-break-word">
                                                        {conv.otherUserName}
                                                    </div>
                                                    <span className="text-xs text-gray-500 shrink-0">
                                                        {formatChatTimestamp(conv.lastMessageTime)}
                                                    </span>
                                                </div>

                                                {/* Code + Email */}
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

                                                {/* Message preview (WRAP nhiều dòng) */}
                                                <div className="mt-2 text-sm text-gray-700 whitespace-normal wrap-break-word line-clamp-2">
                                                    {getConversationPreview(conv)}
                                                </div>

                                                {/* Footer */}
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
                                ))}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>

                {/* Chat area */}
                <Card className="w-full flex-1 min-w-0 flex flex-col h-180 overflow-hidden lg:h-[calc(100vh-6rem)]">
                    {selectedStudentId ? (
                        <>
                            {/* Chat header */}
                            <CardHeader className="pb-3 border-b shrink-0">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-lg">
                                            {conversations.find(
                                                (c) => String(c.otherUserId) === String(selectedStudentId)
                                            )?.otherUserName || 'Conversation'}
                                        </CardTitle>
                                        <p className="text-sm text-gray-500">
                                            {conversations.find(
                                                (c) => String(c.otherUserId) === String(selectedStudentId)
                                            )?.otherUserEmail || ''}
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
