import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Progress } from '../components/ui/progress';
import { Alert, AlertDescription } from '../components/ui/alert';
import { AlertCircle, CheckCircle2, Clock } from 'lucide-react';

interface GradingProgressModalProps {
    isOpen: boolean;
    total: number;
    completed: number;
    failed: number;
    isActive: boolean;
    progressPercentage: number;
    currentSubmissionId?: string;
    errors: Array<{
        submission_id: string;
        error: string;
    }>;
}

export function GradingProgressModal({
    isOpen,
    total,
    completed,
    failed,
    isActive,
    progressPercentage,
    currentSubmissionId,
    errors,
}: GradingProgressModalProps) {
    const remaining = total - completed - failed;

    return (
        <Dialog open={isOpen} onOpenChange={() => { }}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-blue-600" />
                        AI Grading in Progress
                    </DialogTitle>
                    <DialogDescription>Real-time grading status and progress</DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Progress Bar */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="font-medium">Overall Progress</span>
                            <span className="text-gray-600">{Math.round(progressPercentage)}%</span>
                        </div>
                        <Progress value={progressPercentage} className="h-3" />
                        <p className="text-xs text-gray-500">
                            {completed + failed} of {total} submissions processed
                        </p>
                    </div>

                    {/* Status Grid */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-blue-50 rounded-lg p-3 text-center">
                            <div className="text-2xl font-bold text-blue-600">{completed}</div>
                            <div className="text-xs text-gray-600 mt-1">Completed</div>
                        </div>
                        <div className="bg-amber-50 rounded-lg p-3 text-center">
                            <div className="text-2xl font-bold text-amber-600">{remaining}</div>
                            <div className="text-xs text-gray-600 mt-1">Remaining</div>
                        </div>
                        <div className="bg-red-50 rounded-lg p-3 text-center">
                            <div className="text-2xl font-bold text-red-600">{failed}</div>
                            <div className="text-xs text-gray-600 mt-1">Failed</div>
                        </div>
                    </div>

                    {/* Current Submission */}
                    {currentSubmissionId && isActive && (
                        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                            <div className="flex items-center gap-2 text-sm">
                                <div className="h-2 w-2 bg-blue-600 rounded-full animate-pulse" />
                                <div>
                                    <p className="text-gray-700">
                                        Currently grading: <span className="font-mono text-xs">{currentSubmissionId}</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Errors Alert */}
                    {errors.length > 0 && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                <p className="font-medium mb-2">{errors.length} Submission(s) Failed:</p>
                                <ul className="text-xs space-y-1 max-h-32 overflow-y-auto">
                                    {errors.slice(0, 5).map((error, index) => (
                                        <li key={index} className="text-red-700">
                                            • {error.submission_id}: {error.error}
                                        </li>
                                    ))}
                                    {errors.length > 5 && <li className="text-red-700">• ... and {errors.length - 5} more</li>}
                                </ul>
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Completion Message */}
                    {!isActive && total > 0 && (
                        <div className="bg-green-50 rounded-lg p-4 border border-green-200 flex items-start gap-3">
                            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                            <div className="text-sm">
                                <p className="font-medium text-green-900">Grading Complete</p>
                                <p className="text-green-700 text-xs mt-1">
                                    {completed} submitted successfully, {failed} failed
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default GradingProgressModal;
