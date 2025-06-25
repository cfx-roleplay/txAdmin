import React from 'react';
import { InfoIcon, TrendingUpIcon, AlertTriangleIcon, AlertCircleIcon } from 'lucide-react';
import { useIsDarkMode } from '@/hooks/theme';
import { useProfileTheme } from '@/hooks/useProfileTheme';

interface PerformanceExplanationProps {
    threadName: string;
}

const PerformanceExplanation: React.FC<PerformanceExplanationProps> = ({ threadName }) => {
    const isDarkMode = useIsDarkMode();
    const profileTheme = useProfileTheme();

    // Get the target frame times for each thread
    const getThreadInfo = (thread: string) => {
        switch (thread) {
            case 'svMain':
                return {
                    name: 'Main Server Thread',
                    target: '20fps (50ms/tick)',
                    description: 'Handles core server logic and game state'
                };
            case 'svSync':
                return {
                    name: 'Synchronization Thread', 
                    target: '120fps (8.3ms/tick)',
                    description: 'Manages player synchronization and game events'
                };
            case 'svNetwork':
                return {
                    name: 'Network Thread',
                    target: '100fps (10ms/tick)', 
                    description: 'Processes network packets and connections'
                };
            default:
                return {
                    name: 'Server Thread',
                    target: 'Variable',
                    description: 'Server processing thread'
                };
        }
    };

    const threadInfo = getThreadInfo(threadName);

    // Fixed performance colors that match the chart
    const performanceColors = {
        excellent: '#059669', // emerald-600
        good: '#0d9488',      // teal-600
        warning: '#f59e0b',   // amber-500
        danger: '#ef4444',    // red-500
    };

    // Performance level definitions with fixed colors
    const performanceLevels = [
        {
            name: 'Excellent',
            color: performanceColors.excellent,
            icon: <TrendingUpIcon className="w-4 h-4" />,
            description: '0-5ms',
            meaning: 'Optimal performance - server running smoothly'
        },
        {
            name: 'Good',
            color: performanceColors.good,
            icon: <TrendingUpIcon className="w-4 h-4" />,
            description: '5-15ms',
            meaning: 'Great performance - no noticeable issues'
        },
        {
            name: 'Warning',
            color: performanceColors.warning,
            icon: <AlertTriangleIcon className="w-4 h-4" />,
            description: '15-50ms',
            meaning: 'Performance issues - investigate lag sources'
        },
        {
            name: 'Critical',
            color: performanceColors.danger,
            icon: <AlertCircleIcon className="w-4 h-4" />,
            description: '50ms+',
            meaning: 'Severe lag - immediate attention required'
        }
    ];

    return (
        <div className={`mt-4 p-4 rounded-lg border ${
            isDarkMode 
                ? 'bg-gray-800/50 border-gray-700' 
                : 'bg-gray-50 border-gray-200'
        }`}>
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
                <InfoIcon className="w-5 h-5 text-blue-500" />
                <h4 className="font-semibold text-lg">Performance Buckets Explained</h4>
            </div>

            {/* Thread Info */}
            <div className="mb-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-blue-900 dark:text-blue-100">
                        Current Thread: {threadInfo.name}
                    </span>
                    <span className="text-sm text-blue-700 dark:text-blue-300 font-mono">
                        Target: {threadInfo.target}
                    </span>
                </div>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                    {threadInfo.description}
                </p>
            </div>

            {/* Explanation */}
            <div className="mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                    <strong>Performance Buckets</strong> show how much time your server spends processing different tick durations. 
                    Each colored segment represents the percentage of ticks that fell within that time range.
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                    <strong>Ideal scenario:</strong> Most of the bar should be green, indicating fast tick processing and smooth gameplay.
                </p>
            </div>

            {/* Performance Levels Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {performanceLevels.map((level, index) => (
                    <div 
                        key={index}
                        className={`p-3 rounded-lg border ${
                            isDarkMode 
                                ? 'bg-gray-700/50 border-gray-600' 
                                : 'bg-white border-gray-200'
                        }`}
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <div 
                                className="w-4 h-4 rounded"
                                style={{ backgroundColor: level.color }}
                            />
                            <div style={{ color: level.color }}>
                                {level.icon}
                            </div>
                            <span className="font-medium text-sm">
                                {level.name}
                            </span>
                            <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                                {level.description}
                            </span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-300">
                            {level.meaning}
                        </p>
                    </div>
                ))}
            </div>

            {/* Additional Tips */}
            <div className="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-2 mb-2">
                    <AlertTriangleIcon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span className="font-medium text-amber-900 dark:text-amber-100 text-sm">
                        Performance Tips
                    </span>
                </div>
                <ul className="text-xs text-amber-800 dark:text-amber-200 space-y-1">
                    <li>• High green percentages = excellent server health</li>
                    <li>• Yellow/red segments indicate resource bottlenecks or script issues</li>
                    <li>• Correlate performance drops with player count spikes</li>
                    <li>• Use this data to identify peak usage patterns and optimize accordingly</li>
                </ul>
            </div>
        </div>
    );
};

export default PerformanceExplanation; 