import { useState } from 'react';
import { Link } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Checkbox } from '../../components/ui/checkbox';
import { Search, Send, Filter, Eye, FileText, AlertCircle, Plus, Users, User, MessageCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group';
import { Label } from '../../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';

const conversations = [
  {
    id: '1',
    student: 'Emma Wilson',
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
    lastMessage: 'Thank you for the feedback on my assignment!',
    time: '10:30 AM',
    unread: 2,
  },
  {
    id: '2',
    student: 'Michael Chen',
    studentId: 'S002',
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
    lastMessage: 'Could you clarify the deadline for Assignment 3?',
    time: 'Yesterday',
    unread: 1,
  },
  {
    id: '3',
    student: 'Sarah Johnson',
    studentId: 'S003',
    courseId: 'CS405',
    courseName: 'Database Management Systems',
    semester: 'Fall 2025',
    academicYear: '2025/2026',
    assignmentId: 'ASG004',
    assignmentName: 'SQL Query Optimization',
    submissionId: 'SUB003',
    hasSubmission: true,
    grade: 85,
    isPublished: false,
    lastMessage: 'I submitted my assignment late due to...',
    time: '2 days ago',
    unread: 0,
  },
  {
    id: '4',
    student: 'David Martinez',
    studentId: 'S004',
    courseId: 'CS301',
    courseName: 'Data Structures & Algorithms',
    semester: 'Fall 2025',
    academicYear: '2025/2026',
    assignmentId: 'ASG002',
    assignmentName: 'Hash Table Implementation',
    submissionId: 'SUB004',
    hasSubmission: true,
    grade: 78,
    isPublished: true,
    lastMessage: 'Can I get clarification on collision handling?',
    time: '3 days ago',
    unread: 0,
  },
  {
    id: '5',
    student: 'Lisa Chen',
    studentId: 'S005',
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
    lastMessage: 'What libraries should we use for this project?',
    time: '4 days ago',
    unread: 1,
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
    content: 'Hi Emma! Of course, what would you like to know?',
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
    content: 'Thank you for the feedback on my assignment!',
    time: '10:30 AM',
  },
  {
    id: '6',
    sender: 'student',
    content: 'When is the deadline for the next assignment?',
    time: '11:00 AM',
  },
];

// Course-wide conversations
const courseConversations = [
  {
    id: 'CS301',
    courseId: 'CS301',
    courseName: 'Data Structures & Algorithms',
    semester: 'Fall 2025',
    academicYear: '2025/2026',
    studentCount: 5,
    lastMessage: 'The midterm exam will be held next week.',
    time: 'Yesterday',
    unread: 0,
  },
  {
    id: 'CS405',
    courseId: 'CS405',
    courseName: 'Database Management Systems',
    semester: 'Fall 2025',
    academicYear: '2025/2026',
    studentCount: 3,
    lastMessage: 'Please submit your project proposals by Friday.',
    time: '2 days ago',
    unread: 0,
  },
  {
    id: 'CS502',
    courseId: 'CS502',
    courseName: 'Machine Learning',
    semester: 'Fall 2025',
    academicYear: '2025/2026',
    studentCount: 2,
    lastMessage: 'Office hours this week will be moved to Thursday.',
    time: '3 days ago',
    unread: 0,
  },
];

const courseBroadcastMessages: Record<string, any[]> = {
  CS301: [
    {
      id: '1',
      sender: 'lecturer',
      content: 'Welcome to Data Structures & Algorithms! This is a course-wide announcement channel where I will share important updates.',
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
      content: 'Welcome to Database Management Systems! Use this channel to stay updated with course announcements.',
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

// Extract unique courses and assignments
const courses = [
  { id: 'CS301', name: 'Data Structures & Algorithms' },
  { id: 'CS405', name: 'Database Management Systems' },
  { id: 'CS502', name: 'Machine Learning' },
];

// All students data for group and course-wide messaging
const allStudents = [
  { id: 'S001', name: 'Emma Wilson', courseId: 'CS301', courseName: 'Data Structures & Algorithms', email: 'emma.wilson@university.edu' },
  { id: 'S002', name: 'Michael Chen', courseId: 'CS301', courseName: 'Data Structures & Algorithms', email: 'michael.chen@university.edu' },
  { id: 'S003', name: 'Sarah Johnson', courseId: 'CS405', courseName: 'Database Management Systems', email: 'sarah.johnson@university.edu' },
  { id: 'S004', name: 'David Martinez', courseId: 'CS301', courseName: 'Data Structures & Algorithms', email: 'david.martinez@university.edu' },
  { id: 'S005', name: 'Lisa Chen', courseId: 'CS502', courseName: 'Machine Learning', email: 'lisa.chen@university.edu' },
  { id: 'S006', name: 'James Wilson', courseId: 'CS301', courseName: 'Data Structures & Algorithms', email: 'james.wilson@university.edu' },
  { id: 'S007', name: 'Olivia Brown', courseId: 'CS405', courseName: 'Database Management Systems', email: 'olivia.brown@university.edu' },
  { id: 'S008', name: 'Ethan Davis', courseId: 'CS502', courseName: 'Machine Learning', email: 'ethan.davis@university.edu' },
  { id: 'S009', name: 'Sophia Garcia', courseId: 'CS301', courseName: 'Data Structures & Algorithms', email: 'sophia.garcia@university.edu' },
  { id: 'S010', name: 'Noah Martinez', courseId: 'CS405', courseName: 'Database Management Systems', email: 'noah.martinez@university.edu' },
];

export function LecturerMessages() {
  const [activeTab, setActiveTab] = useState('direct');
  const [selectedConversation, setSelectedConversation] = useState('1');
  const [selectedCourseConversation, setSelectedCourseConversation] = useState('CS301');
  const [newMessage, setNewMessage] = useState('');
  const [courseBroadcastMessage, setCourseBroadcastMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [courseSearchQuery, setCourseSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('all');
  const [selectedSemester, setSelectedSemester] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('none');

  // Compose message dialog states
  const [isComposeDialogOpen, setIsComposeDialogOpen] = useState(false);
  const [messageType, setMessageType] = useState<'one-to-one' | 'group' | 'course-wide'>('one-to-one');
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectedCourseBroadcast, setSelectedCourseBroadcast] = useState<string>('');
  const [composeMessage, setComposeMessage] = useState('');
  const [composeSearchQuery, setComposeSearchQuery] = useState('');

  // Template messages for lecturers
  const lecturerTemplates = {
    regrade: "I have already regraded your submission and provided updated feedback. Please check your grade page to view the new grade and detailed comments. If you have any questions about the grading, feel free to reach out.",
    feedback: "I have added additional feedback to your submission. Please review the comments on your grade page carefully, as they contain important insights to help you improve in future assignments.",
    deadline: "I have reviewed your request for a deadline extension. Based on the circumstances you described, I am granting you an extension until [DATE]. Please ensure your submission is complete and submitted by the new deadline.",
    office_hours: "I appreciate your questions about this assignment. I think it would be beneficial to discuss these topics in more detail during office hours. My office hours are [DAYS/TIMES]. Please feel free to stop by or let me know if you need to schedule a different time.",
    clarification: "Thank you for reaching out. Let me clarify the requirements for this assignment: [EXPLANATION]. I hope this helps! If you need further clarification, please don't hesitate to ask.",
    encouragement: "I reviewed your submission and can see you put significant effort into this work. While there are areas for improvement, you're making good progress. Keep up the good work, and don't hesitate to ask if you need help with future assignments.",
  };

  // Get unique academic years and semesters
  const academicYears = Array.from(new Set(conversations.map(c => c.academicYear)));
  const semesters = Array.from(new Set(conversations.map(c => c.semester)));

  // Filter conversations based on search, course, academic year, and semester
  const filteredConversations = conversations.filter((conv) => {
    const matchesSearch =
      conv.student.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
      setNewMessage('');
      setSelectedTemplate('none');
    }
  };

  const handleSendCourseBroadcast = () => {
    if (courseBroadcastMessage.trim()) {
      // Mock send course broadcast message
      setCourseBroadcastMessage('');
    }
  };

  const handleTemplateChange = (value: string) => {
    setSelectedTemplate(value);
    if (value !== 'none') {
      setNewMessage(lecturerTemplates[value as keyof typeof lecturerTemplates]);
    } else {
      setNewMessage('');
    }
  };

  const handleStudentToggle = (studentId: string) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSelectAllStudents = () => {
    const availableStudents = messageType === 'group' && selectedCourseBroadcast
      ? allStudents.filter((s) => s.courseId === selectedCourseBroadcast)
      : allStudents;

    if (selectedStudents.length === availableStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(availableStudents.map((s) => s.id));
    }
  };

  const handleSendComposedMessage = () => {
    if (!composeMessage.trim()) return;

    // Mock send based on message type
    let recipientInfo = '';
    if (messageType === 'one-to-one') {
      const student = allStudents.find((s) => s.id === selectedStudent);
      recipientInfo = `Sent to ${student?.name}`;
    } else if (messageType === 'group') {
      recipientInfo = `Sent to ${selectedStudents.length} students`;
    } else if (messageType === 'course-wide') {
      const course = courses.find((c) => c.id === selectedCourseBroadcast);
      const studentCount = allStudents.filter((s) => s.courseId === selectedCourseBroadcast).length;
      recipientInfo = `Broadcast to ${course?.name} (${studentCount} students)`;
    }

    console.log(recipientInfo, composeMessage);

    // Reset compose dialog
    setIsComposeDialogOpen(false);
    setComposeMessage('');
    setSelectedStudent('');
    setSelectedStudents([]);
    setSelectedCourseBroadcast('');
    setMessageType('one-to-one');
    setComposeSearchQuery('');
  };

  const selectedConv = conversations.find(c => c.id === selectedConversation);
  const selectedCourseConv = courseConversations.find(c => c.id === selectedCourseConversation);
  const currentCourseBroadcastMessages = courseBroadcastMessages[selectedCourseConversation] || [];

  // Filter course conversations based on search
  const filteredCourseConversations = courseConversations.filter((conv) => {
    const matchesSearch =
      conv.courseName.toLowerCase().includes(courseSearchQuery.toLowerCase()) ||
      conv.courseId.toLowerCase().includes(courseSearchQuery.toLowerCase());
    return matchesSearch;
  });

  // Filter students based on search query
  const filteredStudentsForCompose = allStudents.filter((student) => {
    const matchesSearch =
      student.name.toLowerCase().includes(composeSearchQuery.toLowerCase()) ||
      student.id.toLowerCase().includes(composeSearchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(composeSearchQuery.toLowerCase());

    // For group messaging, filter by course if selected
    if (messageType === 'group' && selectedCourseBroadcast) {
      return matchesSearch && student.courseId === selectedCourseBroadcast;
    }

    return matchesSearch;
  });

  const isComposeMessageValid = () => {
    if (!composeMessage.trim()) return false;

    if (messageType === 'one-to-one') {
      return selectedStudent !== '';
    } else if (messageType === 'group') {
      return selectedStudents.length > 0;
    } else if (messageType === 'course-wide') {
      return selectedCourseBroadcast !== '';
    }

    return false;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2>Messages</h2>
          <p className="text-sm text-gray-600">Communicate with your students</p>
        </div>

        {/* Compose Message Button */}
        <Dialog open={isComposeDialogOpen} onOpenChange={setIsComposeDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Compose Message
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Compose New Message</DialogTitle>
              <DialogDescription>
                Send a message to individual students, groups, or entire courses
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Message Type Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Message Type</Label>
                <RadioGroup value={messageType} onValueChange={(value) => {
                  setMessageType(value as 'one-to-one' | 'group' | 'course-wide');
                  setSelectedStudent('');
                  setSelectedStudents([]);
                  setSelectedCourseBroadcast('');
                }}>
                  <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-gray-50 transition-colors">
                    <RadioGroupItem value="one-to-one" id="one-to-one" />
                    <Label htmlFor="one-to-one" className="flex items-center gap-2 cursor-pointer flex-1">
                      <User className="h-4 w-4 text-gray-500" />
                      <div>
                        <div className="text-sm font-medium">One-to-One</div>
                        <div className="text-xs text-gray-500">Send to an individual student</div>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-gray-50 transition-colors">
                    <RadioGroupItem value="group" id="group" />
                    <Label htmlFor="group" className="flex items-center gap-2 cursor-pointer flex-1">
                      <Users className="h-4 w-4 text-gray-500" />
                      <div>
                        <div className="text-sm font-medium">Group Message</div>
                        <div className="text-xs text-gray-500">Send to selected students</div>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-gray-50 transition-colors">
                    <RadioGroupItem value="course-wide" id="course-wide" />
                    <Label htmlFor="course-wide" className="flex items-center gap-2 cursor-pointer flex-1">
                      <MessageCircle className="h-4 w-4 text-gray-500" />
                      <div>
                        <div className="text-sm font-medium">Course-wide Broadcast</div>
                        <div className="text-xs text-gray-500">Send to all students in a course</div>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Recipient Selection - One-to-One */}
              {messageType === 'one-to-one' && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Select Student</Label>
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search students..."
                      value={composeSearchQuery}
                      onChange={(e) => setComposeSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <ScrollArea className="h-50 border rounded-lg">
                    <div className="p-2 space-y-1">
                      {filteredStudentsForCompose.map((student) => (
                        <button
                          key={student.id}
                          onClick={() => setSelectedStudent(student.id)}
                          className={`w-full text-left p-3 rounded-lg transition-colors ${
                            selectedStudent === student.id
                              ? 'bg-primary text-white'
                              : 'hover:bg-gray-100'
                          }`}
                        >
                          <div className="text-sm font-medium">{student.name}</div>
                          <div className={`text-xs ${selectedStudent === student.id ? 'text-white/70' : 'text-gray-500'}`}>
                            {student.id} • {student.courseName}
                          </div>
                        </button>
                      ))}
                      {filteredStudentsForCompose.length === 0 && (
                        <div className="text-center py-8 text-gray-500 text-sm">
                          <User className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                          <p>No students found</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* Recipient Selection - Group */}
              {messageType === 'group' && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Select Students</Label>

                  {/* Course filter for group messaging */}
                  <Select value={selectedCourseBroadcast} onValueChange={(value) => {
                    setSelectedCourseBroadcast(value);
                    setSelectedStudents([]);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by course (optional)" />
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

                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search students..."
                      value={composeSearchQuery}
                      onChange={(e) => setComposeSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAllStudents}
                    >
                      {selectedStudents.length === filteredStudentsForCompose.length
                        ? 'Deselect All'
                        : 'Select All'}
                    </Button>
                    <span className="text-sm text-gray-600">
                      {selectedStudents.length} selected
                    </span>
                  </div>

                  <ScrollArea className="h-50 border rounded-lg">
                    <div className="p-2 space-y-1">
                      {filteredStudentsForCompose.map((student) => (
                        <div
                          key={student.id}
                          className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <Checkbox
                            id={`student-${student.id}`}
                            checked={selectedStudents.includes(student.id)}
                            onCheckedChange={() => handleStudentToggle(student.id)}
                          />
                          <Label
                            htmlFor={`student-${student.id}`}
                            className="flex-1 cursor-pointer"
                          >
                            <div className="text-sm font-medium">{student.name}</div>
                            <div className="text-xs text-gray-500">
                              {student.id} • {student.courseName}
                            </div>
                          </Label>
                        </div>
                      ))}
                      {filteredStudentsForCompose.length === 0 && (
                        <div className="text-center py-8 text-gray-500 text-sm">
                          <Users className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                          <p>No students found</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* Recipient Selection - Course-wide */}
              {messageType === 'course-wide' && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Select Course</Label>
                  <Select value={selectedCourseBroadcast} onValueChange={setSelectedCourseBroadcast}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a course..." />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((course) => {
                        const studentCount = allStudents.filter((s) => s.courseId === course.id).length;
                        return (
                          <SelectItem key={course.id} value={course.id}>
                            {course.name} ({studentCount} students)
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>

                  {selectedCourseBroadcast && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-800">
                        This message will be sent to all{' '}
                        <span className="font-medium">
                          {allStudents.filter((s) => s.courseId === selectedCourseBroadcast).length} students
                        </span>{' '}
                        enrolled in{' '}
                        <span className="font-medium">
                          {courses.find((c) => c.id === selectedCourseBroadcast)?.name}
                        </span>
                      </p>
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
                disabled={!isComposeMessageValid()}
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
          <TabsTrigger value="broadcast">
            <MessageCircle className="h-4 w-4 mr-2" />
            Course Broadcasts
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
                  placeholder="Search students..."
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
                      onClick={() => setSelectedConversation(conversation.id)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        selectedConversation === conversation.id
                          ? 'bg-primary text-white'
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className={`font-medium ${selectedConversation === conversation.id ? '' : 'text-sm'}`}>
                          {conversation.student}
                        </span>
                        {conversation.unread > 0 && (
                          <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                            {conversation.unread}
                          </span>
                        )}
                      </div>
                      <p
                        className={`text-xs mb-1 ${
                          selectedConversation === conversation.id ? 'text-white/80' : 'text-gray-500'
                        }`}
                      >
                        {conversation.courseName}
                      </p>
                      <p
                        className={`text-xs mb-1 ${
                          selectedConversation === conversation.id ? 'text-white/70' : 'text-gray-600'
                        }`}
                      >
                        {conversation.assignmentName}
                      </p>
                      <p
                        className={`text-xs truncate mb-1 ${
                          selectedConversation === conversation.id ? 'text-white/80' : 'text-gray-600'
                        }`}
                      >
                        {conversation.lastMessage}
                      </p>
                      <span
                        className={`text-xs ${
                          selectedConversation === conversation.id ? 'text-white/60' : 'text-gray-400'
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
                <CardTitle className="mb-2">{selectedConv?.student || 'Emma Wilson'} - {selectedConv?.studentId || 'S001'}</CardTitle>
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
                      to={`/lecturer/grading/${selectedConv?.submissionId || 'SUB001'}?assignment=${selectedConv?.assignmentId || 'ASG001'}&subject=${selectedConv?.courseId || 'CS301'}`}
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
                              Click to view & regrade
                            </p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ) : (
                    <Link
                      to={`/lecturer/grading/${selectedConv?.submissionId || 'SUB001'}?assignment=${selectedConv?.assignmentId || 'ASG001'}&subject=${selectedConv?.courseId || 'CS301'}`}
                      className="block"
                    >
                      <div className="border border-yellow-200 bg-yellow-50 rounded-lg p-2.5 hover:bg-yellow-100 transition-colors">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-yellow-600 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-yellow-800 font-medium">
                              Grade: {selectedConv?.grade || 0}/100
                            </p>
                            <p className="text-xs text-yellow-600 mt-0.5">
                              Graded, not published
                            </p>
                          </div>
                        </div>
                      </div>
                    </Link>
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
                  <div key={message.id}>
                    <div
                      className={`flex ${message.sender === 'lecturer' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-3 ${
                          message.sender === 'lecturer'
                            ? 'bg-primary text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p
                          className={`text-xs mt-1 ${
                            message.sender === 'lecturer' ? 'text-white/70' : 'text-gray-500'
                          }`}
                        >
                          {message.time}
                        </p>
                      </div>
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
                    <SelectItem value="regrade">Regrade Notification</SelectItem>
                    <SelectItem value="feedback">Additional Feedback</SelectItem>
                    <SelectItem value="deadline">Deadline Extension Approval</SelectItem>
                    <SelectItem value="office_hours">Office Hours Invitation</SelectItem>
                    <SelectItem value="clarification">Assignment Clarification</SelectItem>
                    <SelectItem value="encouragement">Encouragement</SelectItem>
                  </SelectContent>
                </Select>
              </div>

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

        {/* Course Broadcast Tab */}
        <TabsContent value="broadcast">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Course List */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Courses</CardTitle>
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
                    {filteredCourseConversations.length > 0 ? (
                      filteredCourseConversations.map((course) => (
                        <button
                          key={course.id}
                          onClick={() => setSelectedCourseConversation(course.id)}
                          className={`w-full text-left p-3 rounded-lg transition-colors ${
                            selectedCourseConversation === course.id
                              ? 'bg-primary text-white'
                              : 'hover:bg-gray-100'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <span className={`font-medium ${selectedCourseConversation === course.id ? '' : 'text-sm'}`}>
                              {course.courseName}
                            </span>
                          </div>
                          <p
                            className={`text-xs mb-1 ${
                              selectedCourseConversation === course.id ? 'text-white/80' : 'text-gray-500'
                            }`}
                          >
                            {course.courseId} • {course.semester}
                          </p>
                          <div className="flex items-center gap-2 mb-1">
                            <Users className={`h-3 w-3 ${selectedCourseConversation === course.id ? 'text-white/70' : 'text-gray-500'}`} />
                            <p
                              className={`text-xs ${
                                selectedCourseConversation === course.id ? 'text-white/70' : 'text-gray-600'
                              }`}
                            >
                              {course.studentCount} students
                            </p>
                          </div>
                          <p
                            className={`text-xs truncate mb-1 ${
                              selectedCourseConversation === course.id ? 'text-white/80' : 'text-gray-600'
                            }`}
                          >
                            {course.lastMessage}
                          </p>
                          <span
                            className={`text-xs ${
                              selectedCourseConversation === course.id ? 'text-white/60' : 'text-gray-400'
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

            {/* Course Broadcast Thread */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="mb-2">{selectedCourseConv?.courseName || 'Data Structures & Algorithms'}</CardTitle>
                    <p className="text-sm text-gray-600">
                      {selectedCourseConv?.courseId || 'CS301'} - {selectedCourseConv?.semester || 'Fall 2025'} - {selectedCourseConv?.academicYear || '2025/2026'}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Users className="h-4 w-4 text-gray-500" />
                      <p className="text-sm text-gray-700">
                        Broadcasting to {selectedCourseConv?.studentCount || 0} students
                      </p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-100 mb-4 pr-4">
                  <div className="space-y-4">
                    {currentCourseBroadcastMessages.map((message) => (
                      <div key={message.id}>
                        <div className="flex justify-end">
                          <div className="max-w-[85%] rounded-lg p-3 bg-primary text-white">
                            <div className="flex items-center gap-2 mb-2">
                              <MessageCircle className="h-3 w-3" />
                              <span className="text-xs font-medium">Course Broadcast</span>
                            </div>
                            <p className="text-sm">{message.content}</p>
                            <p className="text-xs mt-1 text-white/70">{message.time}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <div className="space-y-3">
                  <div className="bg-blue-50 rounded-lg border border-blue-200 p-3">
                    <p className="text-xs text-blue-800 mb-1">
                      <span className="font-medium">Course-wide Broadcast:</span> Your message will be sent to all {selectedCourseConv?.studentCount || 0} students in this course
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Type your broadcast message to all students in this course..."
                      value={courseBroadcastMessage}
                      onChange={(e) => setCourseBroadcastMessage(e.target.value)}
                      className="resize-none"
                      rows={3}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendCourseBroadcast();
                        }
                      }}
                    />
                    <Button onClick={handleSendCourseBroadcast} className="self-end">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}