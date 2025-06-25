import { LineChartIcon, Loader2Icon } from 'lucide-react';
import React, { ReactNode, memo, useEffect, useMemo, useRef, useState } from 'react';
import DebouncedResizeContainer from '@/components/DebouncedResizeContainer';
import ModernFullPerfChart from './ModernFullPerfChart';
import PerformanceExplanation from './PerformanceExplanation';
import { useBackendApi } from '@/hooks/fetch';
import type { PerfChartApiResp, PerfChartApiSuccessResp } from "@shared/otherTypes";
import useSWR from 'swr';
import { PerfSnapType, formatTickBoundary, getBucketTicketsEstimatedTime, getServerStatsData, getTimeWeightedHistogram, processPerfLog } from './chartingUtils';
import { dashServerStatsAtom, useThrottledSetCursor } from './dashboardHooks';
import { useIsDarkMode } from '@/hooks/theme';
import { useProfileTheme } from '@/hooks/useProfileTheme';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useSetAtom } from 'jotai';


type FullPerfChartProps = {
    threadName: string;
    apiData: PerfChartApiSuccessResp;
    apiDataAge: number;
    width: number;
    height: number;
    isDarkMode: boolean;
    profileTheme: ReturnType<typeof useProfileTheme>;
};

const FullPerfChart = memo(({ threadName, apiData, apiDataAge, width, height, isDarkMode, profileTheme }: FullPerfChartProps) => {
    const setServerStats = useSetAtom(dashServerStatsAtom);
    const setCursor = useThrottledSetCursor();

    //Process data only once
    const processedData = useMemo(() => {
        if (!apiData) return null;
        const parsed = processPerfLog(apiData.threadPerfLog, (perfLog) => {
            const bucketTicketsEstimatedTime = getBucketTicketsEstimatedTime(apiData.boundaries);
            return getTimeWeightedHistogram(
                perfLog.buckets,
                bucketTicketsEstimatedTime
            );
        });
        if (!parsed) return null;

        return {
            ...parsed,
            bucketLabels: apiData.boundaries.map(formatTickBoundary),
            cursorSetter: (snap: PerfSnapType | undefined) => {
                if (!snap) return setCursor(undefined);
                setCursor({
                    threadName,
                    snap,
                });
            },
        }
    }, [apiData, apiDataAge, threadName, setCursor]);

    //Update server stats when data changes
    useEffect(() => {
        if (!processedData) {
            setServerStats(undefined);
        } else {
            const serverStatsData = getServerStatsData(processedData.lifespans, 24, apiDataAge);
            setServerStats(serverStatsData);
        }
    }, [processedData, apiDataAge, setServerStats]);

    if (!width || !height || !processedData) return null;
    if (!processedData.lifespans.length) return null; //only in case somehow the api returned, but no data found

    return (
        <ModernFullPerfChart
            threadName={threadName}
            bucketLabels={processedData.bucketLabels}
            dataStart={processedData.dataStart}
            dataEnd={processedData.dataEnd}
            lifespans={processedData.lifespans}
            cursorSetter={processedData.cursorSetter}
            width={width}
            height={height}
        />
    );
});

function ChartErrorMessage({ error }: { error: Error | string }) {
    const errorMessageMaps: Record<string, ReactNode> = {
        bad_request: 'Chart data loading failed: bad request.',
        invalid_thread_name: 'Chart data loading failed: invalid thread name.',
        data_unavailable: 'Chart data loading failed: data not yet available.',
        not_enough_data: (<p className='text-center'>
            <strong>There is not enough data to display the chart just yet.</strong><br />
            <span className='text-base italic'>
                The chart requires at least 30 minutes of server runtime data to be available.
            </span>
        </p>),
    };

    if (typeof error === 'string') {
        return (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-2xl text-muted-foreground">
                {errorMessageMaps[error] ?? 'Unknown BackendApiError'}
            </div>
        );
    } else {
        return (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-2xl text-destructive-inline">
                Error: {error.message ?? 'Unknown Error'}
            </div>
        );
    }
}


export default function FullPerfCard() {
    const [chartSize, setChartSize] = useState({ width: 0, height: 0 });
    const [selectedThread, setSelectedThread] = useState('svMain');
    const [apiFailReason, setApiFailReason] = useState('');
    const [apiDataAge, setApiDataAge] = useState(0);
    const isDarkMode = useIsDarkMode();
    const profileTheme = useProfileTheme();

    const chartApi = useBackendApi<PerfChartApiResp>({
        method: 'GET',
        path: `/perfChartData/:thread/`,
    });

    const swrChartApiResp = useSWR(`/perfChartData/${selectedThread}`, async () => {
        setApiFailReason('');
        const data = await chartApi({
            pathParams: { thread: selectedThread },
        });
        if (!data) throw new Error('empty_response');
        if ('fail_reason' in data) {
            setApiFailReason(data.fail_reason);
            throw new Error(data.fail_reason);
        }
        setApiDataAge(Date.now());
        return data;
    }, {
        refreshInterval: 60_000,
        revalidateOnFocus: false,
    });

    let contentNode: ReactNode;
    if (swrChartApiResp.isLoading) {
        contentNode = <div className="absolute inset-0 flex items-center justify-center">
            <Loader2Icon className="animate-spin w-8 h-8 text-muted-foreground" />
        </div>
    } else if (swrChartApiResp.error || apiFailReason) {
        const error = swrChartApiResp.error ?? apiFailReason;
        contentNode = <ChartErrorMessage error={error} />
    } else if (swrChartApiResp.data) {
        contentNode = <>
            <FullPerfChart
                threadName={selectedThread}
                apiData={swrChartApiResp.data as PerfChartApiSuccessResp}
                apiDataAge={apiDataAge}
                width={chartSize.width}
                height={chartSize.height}
                isDarkMode={isDarkMode}
                profileTheme={profileTheme}
            />
        </>;
    } else {
        contentNode = <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            No Data Available
        </div>
    }

    return (
        <div className="w-full md:rounded-xl border bg-card shadow-sm flex flex-col fill-primary">
            <div className="px-4 flex flex-row items-center justify-between space-y-0 pb-2 text-muted-foreground pt-2">
                <h3 className="tracking-tight text-sm font-medium line-clamp-1">
                    Server performance
                </h3>
                <div className="flex gap-4">
                    <Select defaultValue={selectedThread} onValueChange={setSelectedThread}>
                        <SelectTrigger className="w-32 grow md:grow-0 h-6 px-3 py-1 text-sm" >
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
                    <div className='hidden xs:block'><LineChartIcon /></div>
                </div>
            </div>
            <div className="h-[28rem] relative">
                <DebouncedResizeContainer onDebouncedResize={setChartSize}>
                    {contentNode}
                </DebouncedResizeContainer>
            </div>
            
            {/* Performance Explanation */}
            <div className="px-4 pb-4">
                <PerformanceExplanation threadName={selectedThread} />
            </div>
        </div>
    );
}
