import { Bar, BarTooltipProps } from '@nivo/bar';
import { BarChartHorizontalIcon, Loader2Icon } from 'lucide-react';
import { memo, useMemo, useState } from 'react';
import { useIsDarkMode } from '@/hooks/theme';
import { useProfileTheme } from '@/hooks/useProfileTheme';
import { formatTickBoundary, getBucketTicketsEstimatedTime, getMinTickIntervalMarker, getTimeWeightedHistogram } from './chartingUtils';
import DebouncedResizeContainer from "@/components/DebouncedResizeContainer";
import { useAtomValue } from 'jotai';
import { dashPerfCursorAtom, dashSvRuntimeAtom, useGetDashDataAge } from './dashboardHooks';
import * as d3ScaleChromatic from 'd3-scale-chromatic';
import { SvRtPerfThreadNamesType } from '@shared/otherTypes';
import { cn } from '@/lib/utils';
import { dateToLocaleDateString, dateToLocaleTimeString, isDateToday } from '@/lib/dateTime';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


/**
 * Types
 */
type ThreadPerfChartDatum = {
    bucket: string | number;
    value: number;
    color: string;
    count: number;
}

type ThreadPerfChartProps = {
    data: ThreadPerfChartDatum[];
    minTickIntervalMarker: number | undefined;
    width: number;
    height: number;
};


/**
 * Constants
 */
//NOTE: numbers from fivem/code/components/citizen-server-impl/src/GameServer.cpp
const PERF_MIN_TICK_TIME = {
    //svMain - 20fps, 50ms/tick
    //svNetwork - 100fps, 10ms/tick
    //svSync - 120fps, 8.3ms/tick

    svMain: (1000 / 20) / 1000,
    // svNetwork: (1000 / 100) / 1000,
    // svSync: (1000 / 120) / 1000,

    //NOTE: forcing wrong numbers because the chart colors are wrong
    svNetwork: (1000 / 40) / 1000, //25ms/tick
    svSync: (1000 / 40) / 1000, //25ms/tick
};


/**
 * Memoized nivo bar chart component
 */
const ThreadPerfChart = memo(({ data, minTickIntervalMarker, width, height }: ThreadPerfChartProps) => {
    const isDarkMode = useIsDarkMode();

    const CustomToolbar = (datum: BarTooltipProps<ThreadPerfChartDatum>) => {
        const lowerLimit = data.find((_, index) => index === datum.index - 1)?.bucket ?? 0;
        const upperLimit = datum.data.bucket;
        const pctString = (datum.value * 100).toFixed() + '%';
        return (
            <div className="p-3 text-gray-900 bg-white rounded-md shadow-md">
                <div>
                    Tick duration: <strong>{formatTickBoundary(lowerLimit)}</strong> ~ <strong>{formatTickBoundary(upperLimit)}</strong>
                </div>
                <div>
                    Time spent: <strong>~{pctString}</strong>
                </div>
                <div>
                    Tick count: {datum.data.count}
                </div>
            </div>
        );
    }

    //FIXME: temporarily disable the minTickIntervalMarker
    minTickIntervalMarker = undefined;

    if (!width || !height) return null;
    return (
        <Bar
            height={height}
            width={width}
            data={data}
            theme={{
                tooltip: { wrapper: { zIndex: 10000 } },
                text: {
                    fontSize: '12px',
                    fontWeight: 600,
                    fill: 'inherit',
                },
                grid: {
                    line: {
                        strokeDasharray: '8 6',
                        stroke: '#3F4146', //secondary
                        strokeOpacity: isDarkMode ? 1 : 0.25,
                        strokeWidth: 1,
                    },
                },
            }}
            indexBy='bucket'
            margin={{ top: 0, right: 25, bottom: 40, left: 60 }}
            layout='horizontal'
            valueFormat={'.1%'}
            colors={{ datum: 'data.color' }}
            colorBy='indexValue'
            borderWidth={0.5}
            borderColor={isDarkMode ? undefined : {
                from: 'color',
                modifiers: [['darker', 1]]
            }}
            axisBottom={{
                format: '.0%',
                legend: 'percent of total time',
                legendPosition: 'middle',
                legendOffset: 32,
            }}
            axisLeft={{ format: formatTickBoundary }}
            enableGridX={true}
            enableGridY={false}
            labelSkipWidth={25}
            labelSkipHeight={12}
            labelTextColor={{
                from: 'color',
                modifiers: [['darker', 1.6]]
            }}
            tooltip={CustomToolbar}
            //FIXME: adapt this to light mode
            markers={minTickIntervalMarker ? [
                {
                    axis: 'y',
                    value: minTickIntervalMarker,
                    lineStyle: {
                        stroke: 'black',
                        opacity: 0.5,
                        strokeWidth: 4,
                        strokeDasharray: '6 2',
                        strokeDashoffset: 1,
                    },
                    legend: 'good',
                    legendPosition: 'bottom-right',
                    //@ts-ignore - types are wrong, it errors if I remove this
                    legendOffsetX: 10, legendOffsetY: 12, legendOrientation: 'horizontal',
                    textStyle: {
                        fontSize: '16px',
                        opacity: 0.5,
                    },
                },
                {
                    axis: 'y',
                    value: minTickIntervalMarker,
                    lineStyle: {
                        // stroke: '#F513B3',
                        stroke: 'white',
                        opacity: 0.55,
                        strokeWidth: 2,
                        strokeDasharray: '4 4',
                    },
                    legend: 'bad',
                    legendPosition: 'top-right',
                    //@ts-ignore - types are wrong, it errors if I remove this
                    legendOffsetX: 10, legendOffsetY: 12, legendOrientation: 'horizontal',
                    textStyle: {
                        fontSize: '16px',
                        opacity: 0.5,
                    },
                },
            ] : undefined}
        />
    );
});


export default function ThreadPerfCard() {
    const [chartSize, setChartSize] = useState({ width: 0, height: 0 });
    const [selectedThread, setSelectedThread] = useState<string>('svMain');
    const svRuntimeData = useAtomValue(dashSvRuntimeAtom);
    const perfCursorData = useAtomValue(dashPerfCursorAtom);
    const getDashDataAge = useGetDashDataAge();
    const profileTheme = useProfileTheme();

    const chartData = useMemo(() => {
        //Data availability & age check
        if (!svRuntimeData || getDashDataAge().isExpired) return null;

        //Data completeness check
        if (!svRuntimeData.perfBoundaries || !svRuntimeData.perfBucketCounts) {
            return 'incomplete';
        }

        const threadName = (perfCursorData
            ? perfCursorData.threadName
            : selectedThread
            ?? 'svMain') as SvRtPerfThreadNamesType;

        const { perfBoundaries, perfBucketCounts } = svRuntimeData;
        const minTickInterval = PERF_MIN_TICK_TIME[threadName];
        const minTickIntervalMarker = getMinTickIntervalMarker(perfBoundaries, minTickInterval);
        const minTickIntervalIndex = perfBoundaries.findIndex(b => b === minTickIntervalMarker);
        
        // Fixed performance colors for thread performance indicators
        const threadPerformanceColors = {
            good: '#10b981',     // emerald-500
            warning: '#f59e0b',  // amber-500
            danger: '#ef4444',   // red-500
        };
        
        // Create performance color function using d3 interpolation for specific thread
        const createColorFunc = () => {
            const totalBuckets = perfBoundaries.length;
            const threadColors = threadPerformanceColors;
            
            return (bucketNum: number) => {
                const normalizedIndex = bucketNum / totalBuckets;
                
                if (minTickIntervalIndex && bucketNum <= minTickIntervalIndex) {
                    // Good performance range - use fixed green interpolation
                    const ratio = bucketNum / (minTickIntervalIndex + 1);
                    const interpolator = d3ScaleChromatic.interpolateBlues;
                    return interpolator ? interpolator(ratio) : threadColors.good;
                } else if (minTickIntervalIndex && bucketNum > minTickIntervalIndex) {
                    // Poor performance range - use fixed red interpolation  
                    const poorRatio = (bucketNum - minTickIntervalIndex) / (totalBuckets - minTickIntervalIndex);
                    const interpolator = d3ScaleChromatic.interpolateReds;
                    return interpolator ? interpolator(poorRatio) : threadColors.danger;
                } else {
                    // No min tick interval - use general interpolation
                    const interpolator = d3ScaleChromatic.interpolateViridis;
                    return interpolator ? interpolator(normalizedIndex) : profileTheme.chartColors[bucketNum % profileTheme.chartColors.length];
                }
            };
        };
        
        const colorFunc = createColorFunc();

        const threadBucketCounts = perfBucketCounts[threadName];
        let threadHistogram: number[];
        if (perfCursorData) {
            threadHistogram = perfCursorData.snap.weightedPerf;
        } else {
            const bucketTicketsEstimatedTime = getBucketTicketsEstimatedTime(perfBoundaries);
            threadHistogram = getTimeWeightedHistogram(threadBucketCounts, bucketTicketsEstimatedTime);
        }

        const data: ThreadPerfChartDatum[] = [];
        for (let i = 0; i < perfBoundaries.length; i++) {
            data.push({
                bucket: perfBoundaries[i],
                count: perfCursorData ? 0 : threadBucketCounts[i],
                value: threadHistogram[i],
                color: colorFunc(i + 1),
            });
        }
        return { threadName, data, minTickIntervalMarker, perfBoundaries };
    }, [svRuntimeData, perfCursorData, selectedThread, profileTheme]);


    const titleTimeIndicator = useMemo(() => {
        //Data availability & age check
        const dataAge = getDashDataAge();
        if (!svRuntimeData || dataAge.isExpired) return null;

        //Data completeness check
        if (!svRuntimeData.perfBoundaries || !svRuntimeData.perfBucketCounts) {
            return null;
        }

        if (perfCursorData) {
            const timeStr = dateToLocaleTimeString(perfCursorData.snap.end, '2-digit', '2-digit');
            const dateStr = dateToLocaleDateString(perfCursorData.snap.end, 'short');
            const fullStr = isDateToday(perfCursorData.snap.end) ? timeStr : `${timeStr} - ${dateStr}`;
            return (<>
                (<span className="text-xs text-warning-inline font-mono">{fullStr}</span>)
            </>);
        } else {
            return dataAge.isStale ? '(minutes ago)' : '(last minute)';
        }
    }, [svRuntimeData, perfCursorData]);


    //Rendering
    let cursorThreadLabel;
    let contentNode: React.ReactNode = null;
    if (typeof chartData === 'object' && chartData !== null) {
        cursorThreadLabel = chartData.threadName;
        contentNode = <ThreadPerfChart {...chartData} width={chartSize.width} height={chartSize.height} />;
    } else if (typeof chartData === 'string') {
        contentNode = <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground text-center">
            <p className='max-w-80'>
                Data not yet available. <br />
                The thread performance chart will appear soon after the server is online.
            </p>
        </div>;
    } else {
        contentNode = <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Loader2Icon className="animate-spin size-16 text-muted-foreground" />
        </div>;
    }


    return (
        <div className="py-2 md:rounded-xl border bg-card shadow-sm flex flex-col col-span-3 fill-primary h-[20rem] max-h-[20rem]">
            <div className="px-4 flex flex-row items-center justify-between space-y-0 pb-2 text-muted-foreground">
                <h3 className="tracking-tight text-sm font-medium line-clamp-1">
                    {cursorThreadLabel ?? selectedThread} performance {titleTimeIndicator}
                </h3>
                <div className="flex gap-4">
                    <Select
                        defaultValue={selectedThread}
                        onValueChange={setSelectedThread}
                        disabled={!!perfCursorData}
                    >
                        <SelectTrigger className={cn(
                            "w-32 grow md:grow-0 h-6 px-3 py-1 text-sm",
                            !!perfCursorData && 'hidden'
                        )} >
                            <SelectValue placeholder="Filter by admin" />
                        </SelectTrigger>
                        <SelectContent className="px-0">
                            <SelectItem value={'svMain'} className="cursor-pointer">
                                svMain
                            </SelectItem>
                            <SelectItem value={'svSync'} className="cursor-pointer">
                                svSync
                            </SelectItem>
                            <SelectItem value={'svNetwork'} className="cursor-pointer">
                                svNetwork
                            </SelectItem>
                        </SelectContent>
                    </Select>
                    <div className='hidden xs:block'><BarChartHorizontalIcon /></div>
                </div>
            </div>
            <DebouncedResizeContainer onDebouncedResize={setChartSize}>
                {contentNode}
            </DebouncedResizeContainer>
        </div>
    );
}
