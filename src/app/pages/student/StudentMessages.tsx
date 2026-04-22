import { useState } from 'react';
import { Link } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Search, Send, Filter, Eye, FileText, AlertCircle, User, MessageCircle, Plus, Paperclip, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Checkbox } from '../../components/ui/checkbox';

const conversations = [
    {
        id: '1',
        lecturer: 'Dr. Sarah Johnson',
        studentName: 'Alex Thompson',
        studentId: 'S001',
        courseId: 'CS301',
        courseName: 'Data Structures & Algorithms',
        semester: 'Fall 2025',
        academicYear: '2025/2026',
        assignmentId: 'ASG001',
        assignmentName: 'Binary Search Tree Implementation',
        submissionId: 'SUB001',
        hasSubmission: true,
        grade: 92,
        isPublished: true,
        lastMessage: 'You only need to implement one method. Either predecessor or successor is fine.',
        time: '10:30 AM',
        unread: 0,
    },
    {
        id: '2',
        lecturer: 'Prof. Michael Chen',
        studentName: 'Alex Thompson',
        studentId: 'S001',
        courseId: 'CS405',
        courseName: 'Database Management Systems',
        semester: 'Fall 2025',
        academicYear: '2025/2026',
        assignmentId: 'ASG004',
        assignmentName: 'SQL Query Optimization',
        submissionId: 'SUB004',
        hasSubmission: true,
        grade: 88,
        isPublished: false,
        lastMessage: 'The deadline has been extended to March 10th.',
        time: 'Yesterday',
        unread: 1,
    },
    {
        id: '3',
        lecturer: 'Dr. Emily Roberts',
        studentName: 'Alex Thompson',
        studentId: 'S001',
        courseId: 'CS502',
        courseName: 'Machine Learning',
        semester: 'Fall 2025',
        academicYear: '2025/2026',
        assignmentId: 'ASG005',
        assignmentName: 'Neural Network Project',
        submissionId: null,
        hasSubmission: false,
        grade: null,
        isPublished: false,
        lastMessage: 'Great question! Let me explain...',
        time: '2 days ago',
        unread: 0,
    },
    {
        id: '4',
        lecturer: 'Dr. Sarah Johnson',
        studentName: 'Alex Thompson',
        studentId: 'S001',
        courseId: 'CS301',
        courseName: 'Data Structures & Algorithms',
        semester: 'Fall 2025',
        academicYear: '2025/2026',
        assignmentId: 'ASG003',
        assignmentName: 'Graph Algorithms',
        submissionId: null,
        hasSubmission: false,
        grade: null,
        isPublished: false,
        lastMessage: 'You should focus on implementing Dijkstra\'s algorithm first.',
        time: '3 days ago',
        unread: 0,
    },
    {
        id: '5',
        lecturer: 'Prof. Michael Chen',
        studentName: 'Alex Thompson',
        studentId: 'S001',
        courseId: 'CS405',
        courseName: 'Database Management Systems',
        semester: 'Fall 2025',
        academicYear: '2025/2026',
        assignmentId: 'ASG006',
        assignmentName: 'Database Normalization',
        submissionId: 'SUB006',
        hasSubmission: true,
        grade: 95,
        isPublished: true,
        lastMessage: 'Your approach to normalization is correct.',
        time: '5 days ago',
        unread: 2,
    },
];

const messages = [
    {
        id: '1',
        sender: 'student',
        content: 'Hello Dr. Johnson, I have a question about the Binary Search Tree assignment.',
        time: '9:15 AM',
    },
    {
        id: '2',
        sender: 'lecturer',
        content: 'Hi Alex! Of course, what would you like to know?',
        time: '9:20 AM',
    },
    {
        id: '3',
        sender: 'student',
        content: 'Should we implement the delete operation with both predecessor and successor methods?',
        time: '9:22 AM',
    },
    {
        id: '4',
        sender: 'lecturer',
        content: 'You only need to implement one method. Either predecessor or successor is fine.',
        time: '9:25 AM',
    },
    {
        id: '5',
        sender: 'student',
        content: 'Thank you for clarifying!',
        time: '10:30 AM',
    },
];

// Extract unique courses
const courses = [
    { id: 'CS301', name: 'Data Structures & Algorithms' },
    { id: 'CS405', name: 'Database Management Systems' },
    { id: 'CS502', name: 'Machine Learning' },
];

// Course announcements (read-only for students)
const courseAnnouncements = [
    {
        id: 'CS301',
        courseId: 'CS301',
        courseName: 'Data Structures & Algorithms',
        lecturer: 'Dr. Sarah Johnson',
        semester: 'Fall 2025',
        academicYear: '2025/2026',
        lastMessage: 'The midterm exam will be held next week.',
        time: 'Yesterday',
        unread: 1,
    },
    {
        id: 'CS405',
        courseId: 'CS405',
        courseName: 'Database Management Systems',
        lecturer: 'Prof. Michael Chen',
        semester: 'Fall 2025',
        academicYear: '2025/2026',
        lastMessage: 'Please submit your project proposals by Friday.',
        time: '2 days ago',
        unread: 0,
    },
    {
        id: 'CS502',
        courseId: 'CS502',
        courseName: 'Machine Learning',
        lecturer: 'Dr. Emily Roberts',
        semester: 'Fall 2025',
        academicYear: '2025/2026',
        lastMessage: 'Office hours this week will be moved to Thursday.',
        time: '3 days ago',
        unread: 0,
    },
];

const courseAnnouncementMessages: Record<string, any[]> = {
    CS301: [
        {
            id: '1',
            sender: 'lecturer',
            content: 'Welcome to Data Structures & Algorithms! I will use this channel to share important course-wide announcements and updates throughout the semester.',
            time: 'Sep 1, 2025 10:00 AM',
        },
        {
            id: '2',
            sender: 'lecturer',
            content: 'Reminder: Assignment 1 is due this Friday at 11:59 PM. Please make sure to test your code thoroughly before submission.',
            time: 'Sep 15, 2025 2:30 PM',
        },
        {
            id: '3',
            sender: 'lecturer',
            content: 'The midterm exam will be held next week on Wednesday, October 10th. It will cover topics from Week 1 through Week 6. Review sessions will be held during office hours.',
            time: 'Yesterday',
        },
    ],
    CS405: [
        {
            id: '1',
            sender: 'lecturer',
            content: 'Welcome to Database Management Systems! Stay tuned to this channel for important course announcements.',
            time: 'Sep 1, 2025 9:00 AM',
        },
        {
            id: '2',
            sender: 'lecturer',
            content: 'Please submit your project proposals by Friday. Include your team members, project description, and expected database schema.',
            time: '2 days ago',
        },
    ],
    CS502: [
        {
            id: '1',
            sender: 'lecturer',
            content: 'Welcome to Machine Learning! This channel will be used for course-wide announcements and important updates.',
            time: 'Sep 1, 2025 11:00 AM',
        },
        {
            id: '2',
            sender: 'lecturer',
            content: 'Office hours this week will be moved to Thursday 2-4 PM due to a scheduling conflict. The location remains the same.',
            time: '3 days ago',
        },
    ],
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

    // Template messages for students
    const studentTemplates = {
        regrade: "Dear Professor, I would like to respectfully request a regrade for my recent submission on this assignment. After reviewing the feedback and the grading rubric, I believe there may have been some points that were not fully considered. Specifically, [EXPLAIN YOUR CONCERN]. I would greatly appreciate if you could review my submission again. Thank you for your time and consideration.",
        feedback: "Dear Professor, I have reviewed my grade and the feedback provided for this assignment. I would like to better understand the areas where I lost points so I can improve in future assignments. Could you please provide additional feedback on [SPECIFIC AREAS]? I want to make sure I fully understand the concepts and meet the expectations for future work. Thank you for your guidance.",
        clarification: "Dear Professor, I have a question regarding this assignment. Could you please clarify [SPECIFIC QUESTION]? I want to ensure I understand the requirements correctly before proceeding. Thank you for your help!",
        deadline: "Dear Professor, I am writing to request an extension for this assignment due to [REASON - illness, family emergency, technical issues, etc.]. I understand the importance of meeting deadlines and apologize for any inconvenience. Would it be possible to extend the deadline to [PROPOSED DATE]? I am committed to submitting quality work and would greatly appreciate your consideration. Thank you.",
        technical: "Dear Professor, I encountered a technical issue while working on this assignment: [DESCRIBE ISSUE]. I have tried [SOLUTIONS ATTEMPTED] but have not been able to resolve the problem. Could you please provide guidance or assistance? I want to ensure I can complete the assignment properly. Thank you for your help.",
        meeting: "Dear Professor, I would like to schedule a meeting to discuss this assignment and get some guidance. Would you be available during your office hours, or could we arrange a different time that works for your schedule? I have some questions about [TOPIC] that I think would benefit from a face-to-face discussion. Thank you for your time.",
    };

    // Get available assignments for compose dialog
    const availableAssignmentsForCompose = composeCourseId
        ? Array.from(new Set(
            conversations
                .filter(c => c.courseId === composeCourseId)
                .map(c => ({
                    id: c.assignmentId,
                    name: c.assignmentName,
                    submissionId: c.submissionId,
                    hasSubmission: c.hasSubmission,
                    grade: c.grade,
                    isPublished: c.isPublished
                }))
        )).reduce((acc, curr) => {
            if (!acc.find(a => a.id === curr.id)) acc.push(curr);
            return acc;
        }, [] as { id: string; name: string; submissionId: string | null; hasSubmission: boolean; grade: number | null; isPublished: boolean }[])
        : [];

    const selectedAssignmentForCompose = availableAssignmentsForCompose.find(a => a.id === composeAssignmentId);

    // Get unique academic years and semesters
    const academicYears = Array.from(new Set(conversations.map(c => c.academicYear)));
    const semesters = Array.from(new Set(conversations.map(c => c.semester)));

    // Filter conversations based on search, course, academic year, and semester
    const filteredConversations = conversations.filter((conv) => {
        const matchesSearch =
            conv.lecturer.toLowerCase().includes(searchQuery.toLowerCase()) ||
            conv.courseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            conv.assignmentName.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesCourse = selectedCourse === 'all' || conv.courseId === selectedCourse;
        const matchesAcademicYear = selectedAcademicYear === 'all' || conv.academicYear === selectedAcademicYear;
        const matchesSemester = selectedSemester === 'all' || conv.semester === selectedSemester;

        return matchesSearch && matchesCourse && matchesAcademicYear && matchesSemester;
    });

    const handleSend = () => {
        if (newMessage.trim()) {
            // Mock send message
            if (attachSubmissionInChat && selectedConv?.hasSubmission) {
                console.log('Sending message with attached submission:', {
                    message: newMessage,
                    submission: selectedConv.submissionId,
                    assignment: selectedConv.assignmentName,
                });
            } else {
                console.log('Sending message:', newMessage);
            }
            setNewMessage('');
            setSelectedTemplate('none');
            setAttachSubmissionInChat(false);
        }
    };

    const handleTemplateChange = (value: string) => {
        setSelectedTemplate(value);
        if (value !== 'none') {
            setNewMessage(studentTemplates[value as keyof typeof studentTemplates]);
        } else {
            setNewMessage('');
        }
    };

    const handleSendComposedMessage = () => {
        if (!composeMessage.trim() || !composeCourseId) return;

        const course = courses.find(c => c.id === composeCourseId);
        let messageInfo = `New message to ${course?.name}`;

        if (composeAssignmentId && composeAssignmentId !== 'none') {
            const assignment = availableAssignmentsForCompose.find(a => a.id === composeAssignmentId);
            messageInfo += ` - Assignment: ${assignment?.name}`;
            if (assignment?.hasSubmission && assignment?.isPublished) {
                messageInfo += ` (Grade: ${assignment.grade}/100)`;
            }
            if (attachSubmission && assignment?.hasSubmission) {
                messageInfo += ` [SUBMISSION ATTACHED]`;
            }
        }

        console.log(messageInfo, composeMessage);

        // Reset compose dialog
        setIsComposeDialogOpen(false);
        setComposeMessage('');
        setComposeCourseId('');
        setComposeAssignmentId('');
        setAttachSubmission(false);
    };

    const selectedConv = conversations.find(c => c.id === selectedConversation);
    const selectedCourseAnn = courseAnnouncements.find(c => c.id === selectedCourseAnnouncement);
    const currentAnnouncementMessages = courseAnnouncementMessages[selectedCourseAnnouncement] || [];

    // Filter course announcements based on search
    const filteredCourseAnnouncements = courseAnnouncements.filter((course) => {
        const matchesSearch =
            course.courseName.toLowerCase().includes(courseSearchQuery.toLowerCase()) ||
            course.courseId.toLowerCase().includes(courseSearchQuery.toLowerCase()) ||
            course.lecturer.toLowerCase().includes(courseSearchQuery.toLowerCase());
        return matchesSearch;
    });

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                    <h2>Messages</h2>
                    <p className="text-sm text-gray-600">Communicate with your lecturers</p>
                </div>

                {/* Compose Message Button */}
                <Dialog open={isComposeDialogOpen} onOpenChange={setIsComposeDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            New Message
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
                                        {courses.map((course) => (
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
                                            {availableAssignmentsForCompose.map((assignment) => (
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
                                                        {selectedAssignmentForCompose.hasSubmission ? (
                                                            selectedAssignmentForCompose.isPublished ? (
                                                                <>
                                                                    <p className="text-sm text-blue-800">
                                                                        Grade: <span className="font-medium">{selectedAssignmentForCompose.grade}/100</span>
                                                                    </p>
                                                                    <Link
                                                                        to={`/student/grades/${selectedAssignmentForCompose.submissionId}`}
                                                                        className="text-xs text-blue-700 underline hover:text-blue-800 mt-1 inline-block"
                                                                    >
                                                                        View submission & grade details
                                                                    </Link>
                                                                </>
                                                            ) : (
                                                                <p className="text-sm text-yellow-800">
                                                                    Grading in progress - Grade not yet published
                                                                </p>
                                                            )
                                                        ) : (
                                                            <p className="text-sm text-gray-600">
                                                                No submission yet
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Attach Submission Checkbox */}
                                            {selectedAssignmentForCompose.hasSubmission && (
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
                                            {selectedAssignmentForCompose.isPublished && (
                                                <p className="text-xs text-green-700">
                                                    Includes submission files and grade ({selectedAssignmentForCompose.grade}/100)
                                                </p>
                                            )}
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
                        </div>

                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setIsComposeDialogOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSendComposedMessage}
                                disabled={!composeMessage.trim() || !composeCourseId}
                            >
                                <Send className="h-4 w-4 mr-2" />
                                Send Message
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
                                            {courses.map((course) => (
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
                            <CardHeader>
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <CardTitle className="mb-2">{selectedConv?.studentName || 'Alex Thompson'} - {selectedConv?.studentId || 'S001'}</CardTitle>
                                        <p className="text-sm text-gray-600">
                                            {selectedConv?.courseName || 'Data Structures & Algorithms'} - {selectedConv?.courseId || 'CS301'} - {selectedConv?.semester || 'Fall 2025'} - {selectedConv?.academicYear || '2025/2026'}
                                        </p>
                                        <p className="text-sm text-gray-700 mt-1">
                                            {selectedConv?.assignmentName || 'Binary Search Tree Implementation'}
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
                            <CardContent>
                                <ScrollArea className="h-100 mb-4 pr-4">
                                    <div className="space-y-4">
                                        {messages.map((message) => (
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
                                        ))}
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
                            <CardHeader>
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <CardTitle className="mb-2">{selectedCourseAnn?.courseName || 'Data Structures & Algorithms'}</CardTitle>
                                        <p className="text-sm text-gray-600">
                                            {selectedCourseAnn?.courseId || 'CS301'} - {selectedCourseAnn?.semester || 'Fall 2025'} - {selectedCourseAnn?.academicYear || '2025/2026'}
                                        </p>
                                        <p className="text-sm text-gray-700 mt-1">
                                            Lecturer: {selectedCourseAnn?.lecturer || 'Dr. Sarah Johnson'}
                                        </p>
                                    </div>
                                </div>
                            </CardHeader>
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