import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { ArrowLeft, Loader2, Save } from 'lucide-react'
import { Course } from '../../../model'
import { Assignment } from '../../../model/assignment'
import { getAssignmentDetails, updateAssignment } from '../../services/lecturer/assignmentService'
import { getAllCourses } from '../../services/lecturer/courseService'
import { toast } from 'react-toastify'

const FILE_TYPE_OPTIONS = ['pdf', 'docx', 'xlsx', 'txt']
const DEADLINE_OFFSET_MINUTES = 5

const toIsoDate = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toISOString()
}

const toLocalDateTimeInput = (value?: string) => {
  if (!value) {
    return ''
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const timezoneOffsetInMs = date.getTimezoneOffset() * 60 * 1000
  return new Date(date.getTime() - timezoneOffsetInMs).toISOString().slice(0, 16)
}

const getMinimumDeadlineInput = () => {
  const minDeadline = new Date(Date.now() + DEADLINE_OFFSET_MINUTES * 60 * 1000)
  return toLocalDateTimeInput(minDeadline.toISOString())
}

const parseAssignmentPayload = (payload: unknown): Assignment | null => {
  const root = (payload as Record<string, unknown>)?.data ?? payload
  const rootRecord = (root as Record<string, unknown>) ?? {}

  const assignment =
    (rootRecord.assignment as Assignment | undefined) ??
    ((rootRecord.data as Record<string, unknown> | undefined)?.assignment as Assignment | undefined) ??
    (root as Assignment)

  return assignment?.assignment_id ? assignment : null
}

const normalizeAllowedFileTypes = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
  }

  if (typeof value === 'string') {
    const trimmedValue = value.trim()

    if (trimmedValue.startsWith('[') && trimmedValue.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmedValue.replace(/'/g, '"'))
        if (Array.isArray(parsed)) {
          return parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        }
      } catch {
        // Fallback to the CSV-like parse below.
      }
    }

    return (
      trimmedValue
        .split(',')
        // eslint-disable-next-line no-useless-escape
        .map((item) => item.trim().replace(/^[\[\]'"\s]+|[\[\]'"\s]+$/g, ''))
        .filter(Boolean)
    )
  }

  return []
}

export function EditAssignment() {
  const navigate = useNavigate()
  const { assignment_id } = useParams()
  const [searchParams] = useSearchParams()
  const courseFromQuery = searchParams.get('course') ?? ''

  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [courses, setCourses] = useState<Course[]>([])

  const [isLoadingDetails, setIsLoadingDetails] = useState(false)
  const [isLoadingCourses, setIsLoadingCourses] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [courseId, setCourseId] = useState(courseFromQuery)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [questions, setQuestions] = useState('')
  const [requirements, setRequirements] = useState('')
  const [deadline, setDeadline] = useState('')
  const [totalPoints, setTotalPoints] = useState('100')
  const [maxFileSizeMb, setMaxFileSizeMb] = useState('10')
  const [allowLateSubmissions, setAllowLateSubmissions] = useState(true)
  const [enableAiGrading, setEnableAiGrading] = useState(true)
  const [selectedFileTypes, setSelectedFileTypes] = useState<string[]>(FILE_TYPE_OPTIONS)
  const [deadlineTick, setDeadlineTick] = useState(Date.now())

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setDeadlineTick(Date.now())
    }, 30 * 1000)

    return () => window.clearInterval(timerId)
  }, [])

  useEffect(() => {
    if (!assignment_id) {
      return
    }

    const fetchAssignment = async () => {
      setIsLoadingDetails(true)
      try {
        const response = await getAssignmentDetails(assignment_id)
        const parsedAssignment = parseAssignmentPayload(response)

        if (!parsedAssignment) {
          toast.error('Cannot load assignment details.')
          navigate('/lecturer/courses')
          return
        }

        setAssignment(parsedAssignment)
        setCourseId(parsedAssignment.course_id || courseFromQuery)
        setTitle(parsedAssignment.title ?? '')
        setDescription(parsedAssignment.description ?? '')
        setQuestions(parsedAssignment.questions ?? '')
        setRequirements(parsedAssignment.requirements ?? '')
        setDeadline(toLocalDateTimeInput(parsedAssignment.due_date))
        setTotalPoints(String(parsedAssignment.max_score ?? 100))
        setMaxFileSizeMb(String(parsedAssignment.max_file_size_mb ?? 10))
        setAllowLateSubmissions(parsedAssignment.allow_late_submissions ?? true)
        setEnableAiGrading(parsedAssignment.enable_ai_grading ?? true)
        setSelectedFileTypes(normalizeAllowedFileTypes((parsedAssignment as Partial<Assignment>).allowed_file_types))
      } catch (error) {
        console.error('Error fetching assignment details for edit:', error)
        toast.error('Failed to load assignment details.')
      } finally {
        setIsLoadingDetails(false)
      }
    }

    fetchAssignment()
  }, [assignment_id, courseFromQuery, navigate])

  useEffect(() => {
    const fetchCourses = async () => {
      setIsLoadingCourses(true)
      try {
        const response = await getAllCourses({ page: 1, limit: 100, search: '' })
        const root = response?.data ?? {}
        const coursesData = root?.course

        if (Array.isArray(coursesData)) {
          setCourses(coursesData)
        } else {
          setCourses([])
        }
      } catch (error) {
        console.error('Error fetching courses:', error)
        setCourses([])
        toast.error('Failed to load courses.')
      } finally {
        setIsLoadingCourses(false)
      }
    }

    fetchCourses()
  }, [])

  const availableFileTypes = useMemo(() => {
    return Array.from(new Set([...FILE_TYPE_OPTIONS, ...selectedFileTypes]))
  }, [selectedFileTypes])
  const minimumDeadlineInput = useMemo(() => getMinimumDeadlineInput(), [deadlineTick])
  const deadlineMinForPicker = useMemo(() => {
    const selectedDate = deadline.slice(0, 10)
    const minDate = minimumDeadlineInput.slice(0, 10)

    if (selectedDate && selectedDate > minDate) {
      return `${selectedDate}T00:00`
    }

    return minimumDeadlineInput
  }, [deadline, minimumDeadlineInput])

  const selectedFileTypesLabel = useMemo(() => selectedFileTypes.join(', '), [selectedFileTypes])

  const toggleFileType = (fileType: string) => {
    setSelectedFileTypes((prev) =>
      prev.includes(fileType) ? prev.filter((item) => item !== fileType) : [...prev, fileType]
    )
  }

  const handleSave = async () => {
    if (!assignment_id) {
      toast.error('Assignment ID is missing.')
      return
    }

    if (!courseId) {
      toast.error('Please select a course.')
      return
    }

    if (!title.trim()) {
      toast.error('Assignment title is required.')
      return
    }

    if (!deadline) {
      toast.error('Deadline is required.')
      return
    }

    const parsedDeadline = new Date(deadline)
    if (Number.isNaN(parsedDeadline.getTime())) {
      toast.error('Deadline is invalid.')
      return
    }

    const minAllowedDeadline = new Date(Date.now() + DEADLINE_OFFSET_MINUTES * 60 * 1000)
    if (parsedDeadline.getTime() < minAllowedDeadline.getTime()) {
      toast.error(`Deadline must be at least ${DEADLINE_OFFSET_MINUTES} minutes from now.`)
      return
    }

    const parsedMaxScore = Number(totalPoints)
    if (!Number.isFinite(parsedMaxScore) || parsedMaxScore <= 0) {
      toast.error('Total points must be greater than 0.')
      return
    }

    const parsedMaxFileSize = Number(maxFileSizeMb)
    if (!Number.isFinite(parsedMaxFileSize) || parsedMaxFileSize <= 0) {
      toast.error('Max file size must be greater than 0.')
      return
    }

    if (selectedFileTypes.length === 0) {
      toast.error('Please choose at least one allowed file type.')
      return
    }

    setIsSubmitting(true)
    try {
      await updateAssignment(assignment_id, {
        course_id: courseId,
        title: title.trim(),
        description: description.trim(),
        questions: questions.trim(),
        requirements: requirements.trim(),
        due_date: toIsoDate(deadline),
        max_score: parsedMaxScore,
        allowed_file_types: selectedFileTypes,
        max_file_size_mb: parsedMaxFileSize,
        allow_late_submissions: allowLateSubmissions,
        enable_ai_grading: enableAiGrading
      })

      toast.success('Assignment updated successfully!')
      navigate(`/lecturer/courses/${courseId}/assignments`)
    } catch (error) {
      console.error('Error updating assignment:', error)
      toast.error('Failed to update assignment. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const backCourseId = courseId || courseFromQuery || assignment?.course_id

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h2>Edit Assignment</h2>
          <p className='text-sm text-gray-600'>Review details and update assignment settings</p>
        </div>
        <Button
          variant='outline'
          onClick={() => navigate(backCourseId ? `/lecturer/courses/${backCourseId}/assignments` : '/lecturer/courses')}
        >
          <ArrowLeft className='h-4 w-4 mr-2' />
          Back to Assignments
        </Button>
      </div>

      {isLoadingDetails ? (
        <div className='py-20 flex flex-col items-center justify-center gap-4'>
          <Loader2 className='h-10 w-10 animate-spin text-primary' />
          <p className='text-black font-semibold text-lg'>Loading assignment details...</p>
        </div>
      ) : (
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
          <div className='lg:col-span-2 space-y-6'>
            <Card>
              <CardHeader>
                <CardTitle>Assignment Details</CardTitle>
                <CardDescription>Update the core assignment information</CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='space-y-2'>
                  <Label htmlFor='subject'>Course</Label>
                  <Select
                    value={courseId}
                    onValueChange={setCourseId}
                    disabled={isLoadingCourses || courses.length === 0}
                  >
                    <SelectTrigger id='subject'>
                      <SelectValue placeholder={isLoadingCourses ? 'Loading courses...' : 'Select course'} />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((course) => (
                        <SelectItem key={course.course_id} value={course.course_id}>
                          {course.course_code} - {course.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='title'>Assignment Title</Label>
                  <Input id='title' value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='description'>Description</Label>
                  <Textarea
                    id='description'
                    rows={6}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='questions'>Questions</Label>
                  <Textarea id='questions' rows={4} value={questions} onChange={(e) => setQuestions(e.target.value)} />
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='requirements'>Requirements</Label>
                  <Textarea
                    id='requirements'
                    rows={4}
                    value={requirements}
                    onChange={(e) => setRequirements(e.target.value)}
                  />
                </div>

                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='deadline'>Deadline</Label>
                    <Input
                      id='deadline'
                      type='datetime-local'
                      value={deadline}
                      min={deadlineMinForPicker}
                      step={60}
                      onChange={(e) => setDeadline(e.target.value)}
                    />
                    <p className='text-xs text-gray-500'>
                      Choose a deadline from now + {DEADLINE_OFFSET_MINUTES} minutes onward. Past times are disabled.
                    </p>
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='points'>Total Points</Label>
                    <Input
                      id='points'
                      type='number'
                      min={1}
                      value={totalPoints}
                      onChange={(e) => setTotalPoints(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className='space-y-6'>
            <Card>
              <CardHeader>
                <CardTitle>Submission Settings</CardTitle>
                <CardDescription>Configure submission options</CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='space-y-2'>
                  <Label>Allowed File Types</Label>
                  <div className='space-y-2'>
                    {availableFileTypes.map((type) => (
                      <label key={type} className='flex items-center gap-2'>
                        <input
                          type='checkbox'
                          checked={selectedFileTypes.includes(type)}
                          onChange={() => toggleFileType(type)}
                          className='rounded'
                        />
                        <span className='text-sm'>.{type}</span>
                      </label>
                    ))}
                  </div>
                  <p className='text-xs text-gray-500'>Selected: {selectedFileTypesLabel || 'None'}</p>
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='max-size'>Max File Size (MB)</Label>
                  <Input
                    id='max-size'
                    type='number'
                    min={1}
                    value={maxFileSizeMb}
                    onChange={(e) => setMaxFileSizeMb(e.target.value)}
                  />
                </div>

                <div className='space-y-2'>
                  <label className='flex items-center gap-2'>
                    <input
                      type='checkbox'
                      checked={allowLateSubmissions}
                      onChange={(e) => setAllowLateSubmissions(e.target.checked)}
                      className='rounded'
                    />
                    <span className='text-sm'>Allow late submissions</span>
                  </label>
                  <label className='flex items-center gap-2'>
                    <input
                      type='checkbox'
                      checked={enableAiGrading}
                      onChange={(e) => setEnableAiGrading(e.target.checked)}
                      className='rounded'
                    />
                    <span className='text-sm'>Enable AI grading</span>
                  </label>
                </div>
              </CardContent>
            </Card>

            <Button onClick={handleSave} className='w-full' disabled={isSubmitting || isLoadingCourses}>
              {isSubmitting ? (
                <>
                  <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                  Saving...
                </>
              ) : (
                <>
                  <Save className='h-4 w-4 mr-2' />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
