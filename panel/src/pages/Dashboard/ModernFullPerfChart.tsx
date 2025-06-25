import React, { memo, useMemo } from 'react';
import { ResponsiveBar } from '@nivo/bar';
import { ResponsiveLine } from '@nivo/line';
import { useIsDarkMode } from '@/hooks/theme';
import { useProfileTheme } from '@/hooks/useProfileTheme';
import { PerfLifeSpanType, PerfSnapType, formatTickBoundary } from './chartingUtils';

type ModernFullPerfChartProps = {
    threadName: string;
    bucketLabels: string[];
    dataStart: Date;
    dataEnd: Date;
    lifespans: PerfLifeSpanType[];
    cursorSetter: (snap: PerfSnapType | undefined) => void;
    width: number;
    height: number;
};

interface BarChartDatum {
    time: string;
    timeSort: number;
    [bucketLabel: string]: number | string;
}

interface LineData {
    id: string;
    color: string;
    data: Array<{
        x: Date;
        y: number;
    }>;
}

const ModernFullPerfChart = memo(({ 
    threadName,
    bucketLabels, 
    dataStart, 
    dataEnd, 
    lifespans, 
    cursorSetter,
    width,
    height 
}: ModernFullPerfChartProps) => {
    const isDarkMode = useIsDarkMode();
    const profileTheme = useProfileTheme();

    // Process data for bar chart and line charts
    const chartData = useMemo(() => {
        const timeSeriesData: { [timeKey: string]: { time: Date, values: number[], snapCount: number } } = {};
        const playerLineData: LineData = {
            id: 'Players',
            color: profileTheme.chartColors[0],
            data: []
        };

        lifespans.forEach((lifespan) => {
            lifespan.log.forEach((snap) => {
                // Use 15-minute intervals to reduce crowding significantly
                const roundedTime = new Date(snap.end);
                roundedTime.setMinutes(Math.floor(roundedTime.getMinutes() / 15) * 15, 0, 0);
                const timeKey = roundedTime.toISOString();
                
                // Add player data (use original time for smooth line)
                playerLineData.data.push({
                    x: snap.end,
                    y: snap.players
                });

                // Accumulate performance data by time intervals
                if (!timeSeriesData[timeKey]) {
                    timeSeriesData[timeKey] = {
                        time: roundedTime,
                        values: new Array(bucketLabels.length).fill(0),
                        snapCount: 0
                    };
                }

                // Add weighted performance data
                snap.weightedPerf.forEach((value, bucketIndex) => {
                    if (bucketIndex < bucketLabels.length && value > 0) {
                        timeSeriesData[timeKey].values[bucketIndex] += value * 100; // Convert to percentage
                    }
                });
                timeSeriesData[timeKey].snapCount += 1;
            });
        });

        // Convert to bar chart format with proper normalization
        const barChartData: BarChartDatum[] = Object.entries(timeSeriesData)
            .map(([timeKey, data]) => {
                const timeLabel = data.time.toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
                
                const barEntry: BarChartDatum = {
                    time: timeLabel,
                    timeSort: data.time.getTime()
                };

                // Calculate the total percentage to normalize to 100%
                const totalPercentage = data.values.reduce((sum, val) => sum + val, 0);
                const normalizationFactor = data.snapCount > 0 ? 100 / (totalPercentage / data.snapCount) : 0;

                // Add normalized values for each bucket (only non-zero ones)
                data.values.forEach((totalValue, bucketIndex) => {
                    const bucketName = bucketLabels[bucketIndex];
                    const avgValue = data.snapCount > 0 ? totalValue / data.snapCount : 0;
                    const normalizedValue = avgValue * normalizationFactor / 100; // Normalize back to 0-1 range
                    
                    // Only include buckets that have meaningful values
                    if (normalizedValue > 0.001) { // Filter out very small values
                        barEntry[bucketName] = normalizedValue * 100; // Convert back to percentage for display
                    }
                });

                return barEntry;
            })
            .filter(entry => {
                // Only include time periods that have some data
                const hasData = bucketLabels.some(bucket => 
                    typeof entry[bucket] === 'number' && (entry[bucket] as number) > 0
                );
                return hasData;
            })
            .sort((a, b) => (a.timeSort as number) - (b.timeSort as number))
            .slice(-12); // Show last 12 time intervals (3 hours with 15-min intervals)

        // Create a simplified bucket list for better performance visualization
        const simplifiedBuckets = bucketLabels.slice(0, 6); // Show only first 6 buckets to avoid clutter

        return {
            barChartData,
            playerLineData,
            bucketLabels: simplifiedBuckets
        };
    }, [lifespans, bucketLabels, profileTheme.chartColors]);

    // Enhanced color mapping using fixed performance colors
    const getColorForBucket = (bucketLabel: string) => {
        const bucketIndex = chartData.bucketLabels.indexOf(bucketLabel);
        
        // Fixed performance colors - green to red spectrum
        const performanceColors = [
            '#059669', // emerald-600 (excellent - fastest)
            '#0d9488', // teal-600 (very good)
            '#0ea5e9', // sky-500 (good)
            '#8b5cf6', // violet-500 (moderate)
            '#f59e0b', // amber-500 (warning)
            '#ef4444', // red-500 (critical - slowest)
        ];
        
        return performanceColors[bucketIndex % performanceColors.length];
    };

    const chartTheme = {
        background: 'transparent',
        text: {
            fontSize: 11,
            fill: isDarkMode ? '#e5e7eb' : '#374151',
            fontFamily: 'Inter, sans-serif'
        },
        axis: {
            domain: {
                line: {
                    stroke: isDarkMode ? '#4b5563' : '#d1d5db',
                    strokeWidth: 1
                }
            },
            legend: {
                text: {
                    fontSize: 12,
                    fill: isDarkMode ? '#e5e7eb' : '#374151',
                    fontWeight: 500
                }
            },
            ticks: {
                line: {
                    stroke: isDarkMode ? '#6b7280' : '#9ca3af',
                    strokeWidth: 1
                },
                text: {
                    fontSize: 10,
                    fill: isDarkMode ? '#d1d5db' : '#6b7280'
                }
            }
        },
        grid: {
            line: {
                stroke: isDarkMode ? '#374151' : '#f3f4f6',
                strokeWidth: 1
            }
        },
        tooltip: {
            wrapper: {
                background: isDarkMode ? '#1f2937' : '#ffffff',
                color: isDarkMode ? '#e5e7eb' : '#374151',
                fontSize: 13,
                border: `1px solid ${isDarkMode ? '#4b5563' : '#d1d5db'}`,
                borderRadius: '8px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                padding: '12px'
            }
        }
    };

    // Split the height for dual charts
    const barChartHeight = Math.floor(height * 0.65);
    const lineHeight = Math.floor(height * 0.35);

    return (
        <div className="w-full h-full flex flex-col">
            {/* Performance Distribution Bar Chart */}
            <div style={{ height: barChartHeight }}>
                <ResponsiveBar
                    data={chartData.barChartData}
                    keys={chartData.bucketLabels}
                    indexBy="time"
                    theme={chartTheme}
                    margin={{ top: 30, right: 120, bottom: 60, left: 80 }}
                    valueFormat={(value: number) => `${value.toFixed(1)}%`}
                    padding={0.4}
                    valueScale={{ type: 'linear', min: 0, max: 100 }}
                    indexScale={{ type: 'band', round: true }}
                    colors={(bar) => getColorForBucket(bar.id as string)}
                    layout="vertical"
                    groupMode="stacked"
                    axisTop={null}
                    axisRight={null}
                    axisBottom={{
                        tickSize: 5,
                        tickPadding: 8,
                        tickRotation: -35,
                        legend: 'Time (15-min intervals)',
                        legendPosition: 'middle',
                        legendOffset: 50
                    }}
                    axisLeft={{
                        tickSize: 5,
                        tickPadding: 8,
                        tickRotation: 0,
                        legend: 'Performance Distribution (%)',
                        legendPosition: 'middle',
                        legendOffset: -65
                    }}
                    enableGridY={true}
                    enableGridX={false}
                    enableLabel={false}
                    borderRadius={2}
                    borderWidth={1}
                    borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
                    tooltip={({ id, value, indexValue, color }) => (
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border text-sm p-3">
                            <div className="flex items-center gap-2 mb-2">
                                <div 
                                    className="w-4 h-4 rounded-sm border" 
                                    style={{ backgroundColor: color }}
                                />
                                <span className="font-semibold">
                                    Performance Bucket: {id}
                                </span>
                            </div>
                            <div className="text-gray-600 dark:text-gray-300">
                                <div><strong>Time:</strong> {indexValue}</div>
                                <div><strong>Time Spent:</strong> {(value as number).toFixed(1)}%</div>
                            </div>
                        </div>
                    )}
                    legends={[
                        {
                            dataFrom: 'keys',
                            anchor: 'right',
                            direction: 'column',
                            justify: false,
                            translateX: 100,
                            translateY: 0,
                            itemsSpacing: 8,
                            itemWidth: 80,
                            itemHeight: 20,
                            itemDirection: 'left-to-right',
                            itemOpacity: 0.9,
                            symbolSize: 16,
                            symbolShape: 'square',
                            symbolBorderColor: 'rgba(0, 0, 0, .2)',
                            itemTextColor: isDarkMode ? '#e5e7eb' : '#374151',
                            effects: [
                                {
                                    on: 'hover',
                                    style: {
                                        itemOpacity: 1
                                    }
                                }
                            ]
                        }
                    ]}
                    animate={true}
                />
            </div>

            {/* Player Count Line Chart */}
            <div style={{ height: lineHeight }}>
                <ResponsiveLine
                    data={[chartData.playerLineData]}
                    theme={chartTheme}
                    margin={{ top: 20, right: 120, bottom: 50, left: 80 }}
                    xScale={{
                        type: 'time',
                        format: 'native',
                        useUTC: false
                    }}
                    yScale={{
                        type: 'linear',
                        min: 'auto',
                        max: 'auto',
                        stacked: false,
                        reverse: false
                    }}
                    axisTop={null}
                    axisRight={null}
                    axisBottom={{
                        tickSize: 5,
                        tickPadding: 8,
                        tickRotation: 0,
                        legend: 'Time',
                        legendPosition: 'middle',
                        legendOffset: 40,
                        format: '%H:%M'
                    }}
                    axisLeft={{
                        tickSize: 5,
                        tickPadding: 8,
                        tickRotation: 0,
                        legend: 'Player Count',
                        legendPosition: 'middle',
                        legendOffset: -65
                    }}
                    pointSize={5}
                    pointColor={{ theme: 'background' }}
                    pointBorderWidth={2}
                    pointBorderColor={{ from: 'serieColor' }}
                    curve="monotoneX"
                    enableArea={true}
                    areaOpacity={0.1}
                    lineWidth={3}
                    useMesh={true}
                    enableGridX={false}
                    enableGridY={true}
                    tooltip={({ point }: { point: any }) => (
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border text-sm p-3">
                            <div><strong>Players:</strong> {point.data.y}</div>
                            <div><strong>Time:</strong> {new Date(point.data.x as Date).toLocaleTimeString()}</div>
                        </div>
                    )}
                />
            </div>
        </div>
    );
});

ModernFullPerfChart.displayName = 'ModernFullPerfChart';

export default ModernFullPerfChart; 