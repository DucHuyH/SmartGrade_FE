import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router';
import { Loader2, ArrowLeft, BarChart3 } from 'lucide-react';
import { toast } from 'react-toastify';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Breadcrumb } from '../../components/Breadcrumb';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getAssignmentStatistics, AssignmentStatisticItem } from '../../services/lecturer/assignmentService_2';

interface AssignmentAnalyticsState {
    courseTitle?: string;
    assignmentTitle?: string;
}

export function AssignmentAnalytics() {
    const { course_id, assignment_id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const state = (location.state as AssignmentAnalyticsState | null) ?? {};

    const [statistics, setStatistics] = useState<AssignmentStatisticItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!assignment_id) {
            setError('Assignment ID is missing');
            setIsLoading(false);
            return;
        }

        const fetchStatistics = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const data = await getAssignmentStatistics(assignment_id);
                setStatistics(data);
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Failed to load assignment statistics';
                console.error('Error fetching statistics:', err);
                setError(message);
                toast.error(message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchStatistics();
    }, [assignment_id]);

    const breadcrumbItems = [
        { label: 'Courses', href: '/lecturer/courses' },
        ...(course_id ? [{ label: 'Assignments', href: `/lecturer/courses/${course_id}/assignments` }] : []),
        { label: 'Analytics', href: '#' },
    ];

    // Transform data for bar chart
    const chartData = useMemo(() => {
        return statistics.map((item) => ({
            name: item.item_name,
            correct_rate: Math.round(item.correct_rate * 100) / 100,
            average_score: Math.round(item.average_score * 100) / 100,
            max_score: item.max_score,
        }));
    }, [statistics]);

    // Generate feedback based on statistics
    const feedback = useMemo(() => {
        if (statistics.length === 0) {
            return '';
        }

        const sortedByCorrectRate = [...statistics].sort((a, b) => a.correct_rate - b.correct_rate);
        const lowestRate = sortedByCorrectRate[0];
        const highestRate = sortedByCorrectRate[sortedByCorrectRate.length - 1];

        const avgCorrectRate =
            statistics.reduce((sum, item) => sum + item.correct_rate, 0) / statistics.length;

        let feedback = `## Assignment Performance Summary\n\n`;
        feedback += `### Overall Statistics\n`;
        feedback += `- Average Correct Rate: ${Math.round(avgCorrectRate)}%\n`;
        feedback += `- Total Questions/Items: ${statistics.length}\n\n`;

        feedback += `### High Performance\n`;
        feedback += `- Highest Performance: "${highestRate.item_name}" with ${Math.round(highestRate.correct_rate)}% correct rate\n`;
        feedback += `  Students performed best on this question, suggesting clear explanation or familiar concept.\n\n`;

        feedback += `### Needs Improvement\n`;
        feedback += `- Lowest Performance: "${lowestRate.item_name}" with ${Math.round(lowestRate.correct_rate)}% correct rate\n`;
        feedback += `  Students struggled most on this question. Consider:\n`;
        feedback += `  - Reviewing the question clarity and wording\n`;
        feedback += `  - Checking if prerequisite concepts were covered\n`;
        feedback += `  - Providing additional examples or explanations\n\n`;

        // Find items with performance below average
        const underperformingItems = statistics.filter((item) => item.correct_rate < avgCorrectRate - 10);
        if (underperformingItems.length > 0) {
            feedback += `### Items Below Average\n`;
            underperformingItems.forEach((item) => {
                feedback += `- "${item.item_name}": ${Math.round(item.correct_rate)}% (${Math.round(avgCorrectRate - item.correct_rate)}% below average)\n`;
            });
            feedback += `\n`;
        }

        // Find items with performance above average
        const overperformingItems = statistics.filter((item) => item.correct_rate > avgCorrectRate + 10);
        if (overperformingItems.length > 0) {
            feedback += `### Strong Performance Items\n`;
            overperformingItems.forEach((item) => {
                feedback += `- "${item.item_name}": ${Math.round(item.correct_rate)}% (${Math.round(item.correct_rate - avgCorrectRate)}% above average)\n`;
            });
            feedback += `\n`;
        }

        feedback += `### Recommendations\n`;
        feedback += `- Review teaching methods for low-performing questions\n`;
        feedback += `- Reinforce weak concepts in subsequent lessons\n`;
        feedback += `- Maintain strategies that work for high-performing topics\n`;

        return feedback;
    }, [statistics]);

    const handleBack = () => {
        if (course_id && assignment_id) {
            navigate(`/lecturer/courses/${course_id}/assignments/${assignment_id}/submissions`);
        } else {
            navigate(-1);
        }
    };

    const renderCustomAxisTick = ({ x, y, payload }: any) => {
        const words = payload.value.split('_'); // tách theo "_"

        return (
            <g transform={`translate(${x},${y + 10})`}>
                <text textAnchor="middle" fill="#666" fontSize={12}>
                    {words.map((word: string, index: number) => (
                        <tspan
                            key={index}
                            x="0"
                            dy={index === 0 ? 0 : 14} // mỗi dòng cách nhau 14px
                        >
                            {word}
                        </tspan>
                    ))}
                </text>
            </g>
        );
    };

    return (
        <div className="space-y-6">
            <Breadcrumb items={breadcrumbItems} />

            <div className="flex items-start justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <BarChart3 className="h-6 w-6 text-primary" />
                        <h2>Analytics & Feedback</h2>
                    </div>
                    {state.assignmentTitle && (
                        <p className="text-sm text-gray-600 mt-1">{state.assignmentTitle}</p>
                    )}
                    {state.courseTitle && (
                        <p className="text-xs text-gray-500 mt-1">{state.courseTitle}</p>
                    )}
                </div>
                <Button variant="outline" size="sm" onClick={handleBack}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                </Button>
            </div>

            {isLoading ? (
                <Card>
                    <CardContent className="py-12 flex flex-col items-center justify-center gap-4">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                        <p className="text-gray-600 font-medium">Loading assignment statistics...</p>
                    </CardContent>
                </Card>
            ) : error ? (
                <Card>
                    <CardContent className="py-8">
                        <div className="text-center">
                            <p className="text-red-600 font-medium mb-4">{error}</p>
                            <Button onClick={() => window.location.reload()}>Retry</Button>
                        </div>
                    </CardContent>
                </Card>
            ) : statistics.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <p className="text-gray-500">No statistics available for this assignment.</p>
                    </CardContent>
                </Card>
            ) : (
                <>
                    {/* Bar Chart Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Question Performance - Correct Rate (%)</CardTitle>
                            <CardDescription>
                                Percentage of students who answered each question correctly
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="w-full h-96">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 70, bottom: 40 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                        <XAxis
                                            dataKey="name"
                                            interval={0}
                                            angle={0} // giữ thẳng
                                            tick={renderCustomAxisTick}
                                            height={60} // QUAN TRỌNG: tăng để chứa nhiều dòng
                                        />
                                        <YAxis
                                            label={{ value: 'Correct Rate (%)', angle: -90, position: 'insideLeft', offset: 10 }}
                                            domain={[0, 100]}
                                        />
                                        <Tooltip
                                            formatter={(value?: number) => [`${(value ?? 0).toFixed(2)}%`, 'Correct Rate']}
                                            contentStyle={{
                                                backgroundColor: '#f9fafb',
                                                border: '1px solid #e5e7eb',
                                                borderRadius: '0.375rem',
                                            }}
                                        />
                                        <Legend
                                            verticalAlign="bottom"
                                            height={50}
                                            wrapperStyle={{ paddingTop: 50 }} />
                                        <Bar
                                            dataKey="correct_rate"
                                            fill="#3b82f6"
                                            name="Correct Rate (%)"
                                            radius={[8, 8, 0, 0]}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Statistics Summary Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Statistics Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="p-4 bg-blue-50 rounded-lg">
                                    <p className="text-xs text-gray-600 uppercase mb-1">Total Questions</p>
                                    <p className="text-2xl font-bold text-blue-600">{statistics.length}</p>
                                </div>
                                <div className="p-4 bg-green-50 rounded-lg">
                                    <p className="text-xs text-gray-600 uppercase mb-1">Average Correct Rate</p>
                                    <p className="text-2xl font-bold text-green-600">
                                        {Math.round(
                                            (statistics.reduce((sum, item) => sum + item.correct_rate, 0) /
                                                statistics.length) *
                                            100
                                        ) / 100}%
                                    </p>
                                </div>
                                <div className="p-4 bg-purple-50 rounded-lg">
                                    <p className="text-xs text-gray-600 uppercase mb-1">Highest Performance</p>
                                    <p className="text-2xl font-bold text-purple-600">
                                        {Math.round(Math.max(...statistics.map((s) => s.correct_rate)))}%
                                    </p>
                                </div>
                                <div className="p-4 bg-orange-50 rounded-lg">
                                    <p className="text-xs text-gray-600 uppercase mb-1">Lowest Performance</p>
                                    <p className="text-2xl font-bold text-orange-600">
                                        {Math.round(Math.min(...statistics.map((s) => s.correct_rate)))}%
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Feedback Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>AI-Generated Feedback</CardTitle>
                            <CardDescription>
                                Automatic analysis and recommendations based on assignment statistics
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="prose prose-sm max-w-none dark:prose-invert">
                                <div className="space-y-4 text-sm text-gray-700">
                                    {feedback.split('\n').map((line, idx) => {
                                        if (line.startsWith('## ')) {
                                            return (
                                                <h2 key={idx} className="text-lg font-bold mt-4 mb-2">
                                                    {line.replace('## ', '')}
                                                </h2>
                                            );
                                        } else if (line.startsWith('### ')) {
                                            return (
                                                <h3 key={idx} className="text-base font-semibold mt-3 mb-2">
                                                    {line.replace('### ', '')}
                                                </h3>
                                            );
                                        } else if (line.startsWith('- ')) {
                                            return (
                                                <div key={idx} className="flex gap-2 ml-4">
                                                    <span>•</span>
                                                    <span>{line.replace('- ', '')}</span>
                                                </div>
                                            );
                                        } else if (line.trim() === '') {
                                            return <div key={idx} className="h-2" />;
                                        } else {
                                            return (
                                                <p key={idx} className="leading-relaxed">
                                                    {line}
                                                </p>
                                            );
                                        }
                                    })}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}
