/**
 * EXAMPLE: Cách cập nhật LecturerMessages.tsx để sử dụng useComposeMessage hook
 * 
 * Các bước:
 * 1. Import hook và utils
 * 2. Khởi tạo hook trong component
 * 3. Cập nhật handleSendComposedMessage
 * 4. Thêm UI feedback (loading, error)
 */

// Thêm imports:
import { useComposeMessage } from '../../hooks/useComposeMessage';
import { toNumericId } from '../../utils/socketUtils';

// ========================================
// Trong function component LecturerMessages()
// ========================================

export function LecturerMessages() {
    // ... existing state ...

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

    // ========================================
    // Cập nhật handleSendComposedMessage
    // ========================================

    const handleSendComposedMessage = async () => {
        if (!composeMessage.trim()) return;

        try {
            const assignmentId = toNumericId(selectedAssignmentId);

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
            }
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Failed to send message';
            setDirectChatError(errorMsg);
        }
    };

    // ========================================
    // Cập nhật Compose Dialog JSX
    // ========================================

    return (
        <Dialog open= { isComposeDialogOpen } onOpenChange = {(open) => {
        // Hủy pending requests khi đóng dialog
        if (!open) {
            cancelPendingRequests();
        }
        setIsComposeDialogOpen(open);
    }
}>
    <DialogTrigger asChild >
    <Button>
    <Plus className="h-4 w-4 mr-2" />
        Compose Message
            </Button>
            </DialogTrigger>

            < DialogContent className = "max-w-2xl max-h-[90vh] overflow-y-auto" >
                <DialogHeader>
                <DialogTitle>Compose Message </DialogTitle>
                    <DialogDescription>
            Send a message to your student(s)
    </DialogDescription>
    </DialogHeader>

    < div className = "space-y-6 py-4" >
        {/* Message Type Selection */ }
        < div className = "space-y-3" >
            <Label className="text-sm font-medium" > Message Type </Label>
                < RadioGroup value = { messageType } onValueChange = { setMessageType } >
                    <div className="flex items-center space-x-2" >
                        <RadioGroupItem value="one-to-one" id = "type-one-to-one" />
                            <Label htmlFor="type-one-to-one" className = "text-sm cursor-pointer" >
                                One - to - One(Send to one student)
                                </Label>
                                </div>
                                < div className = "flex items-center space-x-2" >
                                    <RadioGroupItem value="group" id = "type-group" />
                                        <Label htmlFor="type-group" className = "text-sm cursor-pointer" >
                                            Group(Send to multiple students)
                                            </Label>
                                            </div>
                                            </RadioGroup>
                                            </div>

{/* Course Selection */ }
<div className="space-y-3" >
    <Label className="text-sm font-medium" > Course </Label>
        < Select value = { selectedCourseId } onValueChange = { setSelectedCourseId } >
            <SelectTrigger>
            <SelectValue placeholder="Select a course..." />
                </SelectTrigger>
                <SelectContent>
{
    availableCourses.map((course) => (
        <SelectItem key= { course.id } value = { course.id } >
        { course.name }
        </SelectItem>
    ))
}
</SelectContent>
    </Select>
    </div>

{/* Assignment Selection */ }
<div className="space-y-3" >
    <Label className="text-sm font-medium" > Assignment </Label>
        < Select value = { selectedAssignmentId } onValueChange = { setSelectedAssignmentId } >
            <SelectTrigger>
            <SelectValue placeholder="Select an assignment..." />
                </SelectTrigger>
                <SelectContent>
{
    availableAssignments.map((assignment) => (
        <SelectItem key= { assignment.id } value = { assignment.id } >
        { assignment.name }
        </SelectItem>
    ))
}
</SelectContent>
    </Select>
    </div>

{/* Student Selection - One to One */ }
{
    messageType === 'one-to-one' && (
        <div className="space-y-3" >
            <Label className="text-sm font-medium" > Select Student </Label>
                < div className = "relative mb-3" >
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                  placeholder="Search students..."
    value = { composeSearchQuery }
    onChange = {(e) => setComposeSearchQuery(e.target.value)
}
className = "pl-9"
    />
    </div>
    < ScrollArea className = "h-50 border rounded-lg" >
        <div className="p-2 space-y-1" >
        {
            filteredStudentsForCompose.map((student) => (
                <button
                      key= { student.id }
                      onClick = {() => setSelectedStudent(student.id)}
className = {`w-full text-left p-3 rounded-lg transition-colors ${selectedStudent === student.id
        ? 'bg-primary text-white'
        : 'hover:bg-gray-100'
    }`}
                    >
    <div className="text-sm font-medium" > { student.name } </div>
        < div className = "text-xs text-gray-500" > { student.id } </div>
            </button>
                  ))}
{
    filteredStudentsForCompose.length === 0 && (
        <div className="text-center py-8 text-gray-500 text-sm" >
            <User className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>No students found </p>
                    </div>
                  )
}
</div>
    </ScrollArea>
    </div>
          )}

{/* Student Selection - Group */ }
{
    messageType === 'group' && (
        <div className="space-y-3" >
            <Label className="text-sm font-medium" > Select Students </Label>

                < div className = "relative mb-3" >
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                  placeholder="Search students..."
    value = { composeSearchQuery }
    onChange = {(e) => setComposeSearchQuery(e.target.value)
}
className = "pl-9"
    />
    </div>

    < div className = "flex items-center justify-between mb-3" >
        <Button
                  type="button"
variant = "outline"
size = "sm"
onClick = { handleSelectAllStudents }
    >
{
    selectedStudents.length === filteredStudentsForCompose.length
        ? 'Deselect All'
        : 'Select All'
}
    </Button>
    < span className = "text-sm text-gray-600" >
        { selectedStudents.length } selected
            </span>
            </div>

            < ScrollArea className = "h-50 border rounded-lg" >
                <div className="p-2 space-y-1" >
                {
                    filteredStudentsForCompose.map((student) => (
                        <div
                      key= { student.id }
                      className = "flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                        <Checkbox
                        id={`student-${student.id}`}
checked = { selectedStudents.includes(student.id) }
onCheckedChange = {() => handleStudentToggle(student.id)}
                      />
    < Label
htmlFor = {`student-${student.id}`}
className = "flex-1 cursor-pointer"
    >
    <div className="text-sm font-medium" > { student.name } </div>
        < div className = "text-xs text-gray-500" > { student.id } </div>
            </Label>
            </div>
                  ))}
</div>
    </ScrollArea>
    </div>
          )}

{/* Message Composition */ }
<div className="space-y-3" >
    <Label className="text-sm font-medium" > Message </Label>

{/* Template Selection */ }
<div className="bg-blue-50 rounded-lg border border-blue-200 p-3" >
    <label className="text-xs text-gray-700 mb-2 block" > Templates </label>
        < Select value = { selectedTemplate } onValueChange = { handleTemplateChange } >
            <SelectTrigger className="bg-white" >
                <SelectValue placeholder="Select a template..." />
                    </SelectTrigger>
                    < SelectContent >
                    <SelectItem value="none" > No template </SelectItem>
                        < SelectItem value = "regrade" > Regrade Notification </SelectItem>
                            < SelectItem value = "feedback" > Additional Feedback </SelectItem>
                                < SelectItem value = "deadline" > Deadline Extension Approval </SelectItem>
                                    < SelectItem value = "office_hours" > Office Hours Invitation </SelectItem>
                                        < SelectItem value = "clarification" > Assignment Clarification </SelectItem>
                                            < SelectItem value = "encouragement" > Encouragement </SelectItem>
                                                </SelectContent>
                                                </Select>
                                                </div>

{/* Message Textarea */ }
<Textarea
              placeholder="Type your message here..."
value = { composeMessage }
onChange = {(e) => setComposeMessage(e.target.value)}
className = "min-h-37.5 resize-none"
    />
    </div>

{/* Error Display */ }
{
    composeErrorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3" >
            <p className="text-sm text-red-700" >
                <span className="font-medium" > Error: </span> {composeErrorMessage}
                    </p>
                    </div>
          )
}

{/* Info for Group Messages */ }
{
    messageType === 'group' && selectedStudents.length > 1 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3" >
            <p className="text-xs text-blue-800" >
                <span className="font-medium" > Note: </span> Sending to{' '}
    { selectedStudents.length } students will take approximately{ ' ' }
    { ((selectedStudents.length - 1) * 350) / 1000 }s due to rate limiting.
              </p>
        </div>
          )
}
</div>

    < DialogFooter >
    <Button
            variant="outline"
onClick = {() => {
    setIsComposeDialogOpen(false);
    cancelPendingRequests();
}}
disabled = { isComposeSending }
    >
    Cancel
    </Button>
    < Button
onClick = { handleSendComposedMessage }
disabled = {
    isComposeSending ||
    !composeMessage.trim() ||
    !selectedAssignmentId ||
    (messageType === 'one-to-one' && !selectedStudent) ||
    (messageType === 'group' && selectedStudents.length === 0)
            }
          >
{
    isComposeSending?(
              <>
    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        Sending...
</>
            ) : (
    <>
    <Send className= "h-4 w-4 mr-2" />
    Send Message
        </>
            )}
</Button>
    </DialogFooter>
    </DialogContent>
    </Dialog>
  );
}
