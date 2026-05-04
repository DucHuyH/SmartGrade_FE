import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Checkbox } from '../../components/ui/checkbox';
import { Search, Send, Filter, Eye, FileText, AlertCircle, Plus, Users, User, MessageCircle, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group';
import { Label } from '../../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { LECTURER_STORAGE_KEYS } from '../../../constants';
import axiosInstance from '../../services/lecturer/axios';
import { getAllCourses } from '../../services/lecturer/courseService';
import { fetchDirectChatThread, formatChatTimestamp, type DirectChatMessage } from '../../services/shared/directChat';
import { initSocket, joinChat, leaveChat, markChatSeen, onChatMessage, sendChatMessage } from '../../services/socketService';
import { useComposeMessage } from '../../hooks/useComposeMessage';
import { toNumericId as utilToNumericId } from '../../utils/socketUtils';

type MessageCourse = {
  id: string;
  name: string;
  code?: string;
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
    sender: message.isFromCurrentUser && currentUserId !== null ? 'lecturer' : 'student',
    content: message.content,
    time: formatChatTimestamp(message.createdAt),
  }));
};

export function LecturerMessages() {
  const [activeTab, setActiveTab] = useState('direct');
  const [selectedConversation, setSelectedConversation] = useState('1');
  const [selectedCourseConversation, setSelectedCourseConversation] = useState('CS301');
  const [newMessage, setNewMessage] = useState('');
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

  const [availableCourses, setAvailableCourses] = useState<MessageCourse[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [directMessages, setDirectMessages] = useState<MessageView[]>([]);
  const [directChatLoading, setDirectChatLoading] = useState(false);
  const [directChatError, setDirectChatError] = useState<string | null>(null);
  const [peerUserId, setPeerUserId] = useState<number | null>(null);
  const [peerName, setPeerName] = useState('');
  const [courseBroadcastMessage, setCourseBroadcastMessage] = useState('');
  const currentUser = getStoredUser(LECTURER_STORAGE_KEYS.USER);
  const currentUserId = toNumericId(currentUser?.user_id ?? currentUser?.id);

  // Khởi tạo compose message hook
  const {
    isLoading: isComposeSending,
    error: composeErrorMessage,
    sendOneToOne,
    sendGroup,
    cancelPendingRequests,
  } = useComposeMessage('lecturer', {
    onSuccess: () => {
      // ✅ Gửi thành công
      setComposeMessage('');
      setSelectedStudent('');
      setSelectedStudents([]);
      setSelectedCourseBroadcast('');
      setMessageType('one-to-one');
      setComposeSearchQuery('');
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

  // Template messages for lecturers
  const lecturerTemplates = {
    regrade: "I have already regraded your submission and provided updated feedback. Please check your grade page to view the new grade and detailed comments. If you have any questions about the grading, feel free to reach out.",
    feedback: "I have added additional feedback to your submission. Please review the comments on your grade page carefully, as they contain important insights to help you improve in future assignments.",
    deadline: "I have reviewed your request for a deadline extension. Based on the circumstances you described, I am granting you an extension until [DATE]. Please ensure your submission is complete and submitted by the new deadline.",
    office_hours: "I appreciate your questions about this assignment. I think it would be beneficial to discuss these topics in more detail during office hours. My office hours are [DAYS/TIMES]. Please feel free to stop by or let me know if you need to schedule a different time.",
    clarification: "Thank you for reaching out. Let me clarify the requirements for this assignment: [EXPLANATION]. I hope this helps! If you need further clarification, please don't hesitate to ask.",
    encouragement: "I reviewed your submission and can see you put significant effort into this work. While there are areas for improvement, you're making good progress. Keep up the good work, and don't hesitate to ask if you need help with future assignments.",
  };

  // Get unique academic years and semesters (empty until backend conversation list is available)
  const academicYears: string[] = [];
  const semesters: string[] = ['Semester 1', 'Semester 2', 'Summer'];

  useEffect(() => {
    let isCancelled = false;
    setCoursesLoading(true);

    void getAllCourses({ page: 1, limit: 100, search: '' })
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
          console.error('Failed to load lecturer courses:', error);
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
  };

  const handleSendCourseBroadcast = () => {
    // Broadcast messaging not yet implemented
    return;
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
    // All students functionality not yet implemented
    return;
  };

  const handleSendComposedMessage = async () => {
    if (!composeMessage.trim()) return;

    try {
      const assignmentId = toNumericId(selectedCourseBroadcast || '');

      if (!assignmentId) {
        setDirectChatError('Please select an assignment');
        return;
      }

      if (messageType === 'one-to-one') {
        const studentId = toNumericId(selectedStudent);

        if (!studentId) {
          setDirectChatError('Please select a student');
          return;
        }

        // Sử dụng hook để gửi tin nhắn
        await sendOneToOne(assignmentId, studentId, composeMessage);

      } else if (messageType === 'group') {
        const studentIds = selectedStudents
          .map(id => toNumericId(id))
          .filter((id): id is number => id !== null);

        if (studentIds.length === 0) {
          setDirectChatError('Please select at least one student');
          return;
        }

        // Sử dụng hook để gửi tin nhắn tới nhiều sinh viên
        await sendGroup(assignmentId, studentIds, composeMessage);
      } else if (messageType === 'course-wide') {
        // Course-wide broadcasts are not yet fully implemented
        setDirectChatError('Course-wide broadcast is not yet implemented');
        return;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to send message';
      setDirectChatError(errorMsg);
    }
  };

  const selectedConv: any = null;
  const selectedCourseConv: any = null;
  const currentCourseBroadcastMessages: any[] = [];

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
        setPeerName(thread.peerName || selectedConv.student);
        setDirectMessages(mapChatMessagesToView(thread.messages, currentUserId));
      })
      .catch((error: unknown) => {
        if (isCancelled) {
          return;
        }

        const message = error instanceof Error ? error.message : 'Failed to load direct messages';
        setDirectChatError(message);
        setPeerUserId(null);
        setPeerName(selectedConv.student);
        setDirectMessages([]);
        setPeerUserId(null);
        setPeerName('');
        setDirectChatError('No conversations available');
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

    initSocket('lecturer');

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
          sender: senderId === currentUserId ? 'lecturer' : 'student',
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

  // Filter course conversations (empty since courseConversations array is removed)
  const filteredCourseConversations: any[] = [];

  // Filter students based on search query (empty since allStudents array is removed)
  const filteredStudentsForCompose: any[] = [];

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
                          className={`w-full text-left p-3 rounded-lg transition-colors ${selectedStudent === student.id
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
                      {coursesLoading ? (
                        <SelectItem value="loading" disabled>Loading courses...</SelectItem>
                      ) : availableCourses.map((course) => (
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
                      {availableCourses.map((course) => {
                        return (
                          <SelectItem key={course.id} value={course.id}>
                            {course.name}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>

                  {selectedCourseBroadcast && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-800">
                        This message will be sent to all enrolled students in the selected course.
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

              {/* Error Display */}
              {composeErrorMessage && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-700">
                    <span className="font-medium">Error:</span> {composeErrorMessage}
                  </p>
                </div>
              )}

              {/* Info for Group Messages */}
              {messageType === 'group' && selectedStudents.length > 1 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-800">
                    <span className="font-medium">Note:</span> Sending to{' '}
                    {selectedStudents.length} students will take approximately{' '}
                    {((selectedStudents.length - 1) * 350) / 1000}s due to rate limiting.
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
                  !selectedCourseBroadcast ||
                  (messageType === 'one-to-one' && !selectedStudent) ||
                  (messageType === 'group' && selectedStudents.length === 0)
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
                          onClick={() => setSelectedConversation(conversation.id)}
                          className={`w-full text-left p-3 rounded-lg transition-colors ${selectedConversation === conversation.id
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
                        <CardTitle className="mb-2">{peerName || selectedConv?.student} - {selectedConv?.studentId}</CardTitle>
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
                              <div key={message.id}>
                                <div
                                  className={`flex ${message.sender === 'lecturer' ? 'justify-end' : 'justify-start'}`}
                                >
                                  <div
                                    className={`max-w-[70%] rounded-lg p-3 ${message.sender === 'lecturer'
                                      ? 'bg-primary text-white'
                                      : 'bg-gray-100 text-gray-900'
                                      }`}
                                  >
                                    <p className="text-sm">{message.content}</p>
                                    <p
                                      className={`text-xs mt-1 ${message.sender === 'lecturer' ? 'text-white/70' : 'text-gray-500'
                                        }`}
                                    >
                                      {message.time}
                                    </p>
                                  </div>
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
                          className={`w-full text-left p-3 rounded-lg transition-colors ${selectedCourseConversation === course.id
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
                            className={`text-xs mb-1 ${selectedCourseConversation === course.id ? 'text-white/80' : 'text-gray-500'
                              }`}
                          >
                            {course.courseId} • {course.semester}
                          </p>
                          <div className="flex items-center gap-2 mb-1">
                            <Users className={`h-3 w-3 ${selectedCourseConversation === course.id ? 'text-white/70' : 'text-gray-500'}`} />
                            <p
                              className={`text-xs ${selectedCourseConversation === course.id ? 'text-white/70' : 'text-gray-600'
                                }`}
                            >
                              {course.studentCount} students
                            </p>
                          </div>
                          <p
                            className={`text-xs truncate mb-1 ${selectedCourseConversation === course.id ? 'text-white/80' : 'text-gray-600'
                              }`}
                          >
                            {course.lastMessage}
                          </p>
                          <span
                            className={`text-xs ${selectedCourseConversation === course.id ? 'text-white/60' : 'text-gray-400'
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
              {selectedCourseConv ? (
                <>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="mb-2">{selectedCourseConv?.courseName}</CardTitle>
                        <p className="text-sm text-gray-600">
                          {selectedCourseConv?.courseId} - {selectedCourseConv?.semester} - {selectedCourseConv?.academicYear}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Users className="h-4 w-4 text-gray-500" />
                          <p className="text-sm text-gray-700">
                            Broadcasting to {selectedCourseConv?.studentCount} students
                          </p>
                        </div>
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
              {selectedCourseConv && (
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
              )}
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}