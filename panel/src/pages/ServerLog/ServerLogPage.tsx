import { memo, useCallback, useEffect, useState, useRef, useMemo } from 'react';
import { 
    ChevronLeftIcon, 
    ChevronRightIcon, 
    DownloadIcon, 
    EyeIcon, 
    RefreshCwIcon, 
    XIcon,
    FilterIcon,
    RotateCcwIcon,
    AlertTriangleIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { cn, getSocket } from '@/lib/utils';
import { useServerLogDataApi, useServerLogPartialApi, type ServerLogEvent } from '@/hooks/useServerLog';

type LogMode = 'live' | 'history';

const EVENT_TYPE_COLORS: Record<string, string> = {
    'ChatMessage': 'text-blue-400',
    'PlayerJoin': 'text-green-400', 
    'PlayerLeave': 'text-yellow-400',
    'PlayerDied': 'text-red-400',
    'Explosion': 'text-orange-400',
    'WeaponDamage': 'text-purple-400',
    'Command': 'text-cyan-400',
    'DebugMessage': 'text-gray-400',
    'default': 'text-foreground'
};

const EVENT_TYPE_LABELS: Record<string, string> = {
    'ChatMessage': 'Chat',
    'PlayerJoin': 'Join',
    'PlayerLeave': 'Leave', 
    'PlayerDied': 'Death',
    'Explosion': 'Explosion',
    'WeaponDamage': 'Damage',
    'Command': 'Command',
    'DebugMessage': 'Debug',
};

// Memoized log entry component
const LogEntry = memo(({ 
    event, 
    isVisible, 
    onPlayerClick 
}: {
    event: ServerLogEvent;
    isVisible: boolean;
    onPlayerClick: (playerId: string) => void;
}) => {
    const timeStr = new Date(event.ts).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit', 
        second: '2-digit'
    });

    const typeColor = EVENT_TYPE_COLORS[event.type] || EVENT_TYPE_COLORS.default;

    return (
        <div 
            className={cn(
                'flex gap-2 text-sm font-mono py-1 px-2 border-b border-border/30',
                !isVisible && 'hidden'
            )}
            data-event-type={event.type}
            data-timestamp={event.ts}
        >
            <span className="text-muted-foreground shrink-0">
                [{timeStr}]
            </span>
            <span className={cn('font-bold shrink-0', typeColor)}>
                {event.src.id ? (
                    <button
                        onClick={() => onPlayerClick(event.src.id as string)}
                        className="hover:bg-muted/50 px-1 rounded cursor-pointer transition-colors"
                    >
                        {event.src.name}
                    </button>
                ) : (
                    event.src.name
                )}
            </span>
            <span className="break-words min-w-0 flex-1">
                {event.msg}
            </span>
        </div>
    );
});

LogEntry.displayName = 'LogEntry';

export default function ServerLogPage() {
    const [logEvents, setLogEvents] = useState<ServerLogEvent[]>([]);
    const [mode, setMode] = useState<LogMode>('live');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [canDownload, setCanDownload] = useState(false);
    const [logStartTs, setLogStartTs] = useState<number | null>(null);
    const [logEndTs, setLogEndTs] = useState<number | null>(null);
    const [canViewOlder, setCanViewOlder] = useState(true);
    const [canViewNewer, setCanViewNewer] = useState(false);
    const [autoScroll, setAutoScroll] = useState(true);
    const [showFilters, setShowFilters] = useState(false);
    
    // Event type filters
    const [eventFilters, setEventFilters] = useState<Record<string, boolean>>({});
    
    const logContainerRef = useRef<HTMLDivElement>(null);
    const serverLogDataApi = useServerLogDataApi();
    const serverLogPartialApi = useServerLogPartialApi();
    
    // WebSocket for live updates
    const pageSocket = useRef<ReturnType<typeof getSocket> | null>(null);

    // Get unique event types for filtering
    const availableEventTypes = useMemo(() => {
        const types = new Set(logEvents.map(event => event.type));
        return Array.from(types).sort();
    }, [logEvents]);

    // Filter visible events
    const visibleEvents = useMemo(() => {
        if (Object.keys(eventFilters).length === 0) return logEvents;
        return logEvents.filter(event => eventFilters[event.type] !== false);
    }, [logEvents, eventFilters]);

    // Load initial server log data
    const loadInitialData = useCallback(() => {
        setIsLoading(true);
        setError(null);
        
        serverLogDataApi({
            success: (data) => {
                if (data.success) {
                    setLogEvents(data.initialLog);
                    setCanDownload(data.canDownload);
                    updateTimestamps(data.initialLog);
                } else {
                    setError(data.error);
                }
                setIsLoading(false);
            },
            error: (message) => {
                setError(message);
                setIsLoading(false);
            },
        });
    }, []);

    // Load historical data
    const loadHistoricalData = useCallback((direction: 'older' | 'newer') => {
        if (!logStartTs && direction === 'older') return;
        if (!logEndTs && direction === 'newer') return;

        setIsLoading(true);
        setError(null);

        const ref = direction === 'older' ? logStartTs! : logEndTs!;
        
        serverLogPartialApi({
            queryParams: { dir: direction, ref: ref.toString() },
            success: (data) => {
                if (data.success) {
                    if (data.boundry) {
                        if (direction === 'older') {
                            if (data.log.length === 0) {
                                // No more older entries
                                setCanViewOlder(false);
                            } else {
                                setLogEvents(data.log);
                                updateTimestamps(data.log);
                                setCanViewOlder(false);
                            }
                        } else {
                            // Newer direction hits boundary, switch to live
                            goLive();
                            return;
                        }
                    } else {
                        setLogEvents(data.log);
                        updateTimestamps(data.log);
                        setCanViewOlder(true);
                        setCanViewNewer(true);
                    }
                } else {
                    setError(data.error);
                }
                setIsLoading(false);
            },
            error: (message) => {
                setError(message);
                setIsLoading(false);
            },
        });
    }, [logStartTs, logEndTs, serverLogPartialApi]);

    // Update timestamp boundaries
    const updateTimestamps = useCallback((events: ServerLogEvent[]) => {
        if (events.length > 0) {
            setLogStartTs(events[0].ts);
            setLogEndTs(events[events.length - 1].ts);
        }
    }, []);

    // Switch to live mode
    const goLive = useCallback(() => {
        setMode('live');
        setCanViewOlder(true);
        setCanViewNewer(false);
        loadInitialData();
    }, [loadInitialData]);

    // Switch to history mode
    const goHistory = useCallback((direction: 'older' | 'newer') => {
        setMode('history');
        setCanViewNewer(true);
        loadHistoricalData(direction);
    }, [loadHistoricalData]);

    // Handle player click (open player modal)
    const handlePlayerClick = useCallback((playerId: string) => {
        const [mutex, netid] = playerId.split('#', 2);
        const mutexNetid = `${mutex}_${netid}`;
        // TODO: Implement player modal opening
        console.log('Open player modal for:', mutexNetid);
    }, []);

    // Clear console
    const clearConsole = useCallback(() => {
        setLogEvents([]);
    }, []);

    // Download log
    const downloadLog = useCallback(() => {
        if (canDownload) {
            window.open('/fxserver/downloadLog', '_blank');
        }
    }, [canDownload]);

    // Auto-scroll to bottom
    const scrollToBottom = useCallback(() => {
        if (autoScroll && logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [autoScroll]);

    // Initialize WebSocket connection
    useEffect(() => {
        pageSocket.current = getSocket(['serverlog']);
        
        pageSocket.current.on('connect', () => {
            console.log("Server Log Socket.IO Connected.");
        });
        
        pageSocket.current.on('disconnect', (message) => {
            console.log("Server Log Socket.IO Disconnected:", message);
        });
        
        pageSocket.current.on('error', (error) => {
            console.log('Server Log Socket.IO Error:', error);
        });

        return () => {
            if (pageSocket.current) {
                pageSocket.current.removeAllListeners();
                pageSocket.current.disconnect();
            }
        };
    }, []);

    // Handle WebSocket events for live mode
    useEffect(() => {
        if (mode === 'live' && pageSocket.current) {
            const handleLogData = (events: ServerLogEvent[]) => {
                setLogEvents(prev => {
                    const combined = [...prev, ...events];
                    // Keep only recent entries (prevent memory issues)
                    const maxSize = 1000;
                    if (combined.length > maxSize) {
                        return combined.slice(-maxSize);
                    }
                    return combined;
                });
                updateTimestamps(events);
            };

            // Cast to any to access logData event which isn't in the TypeScript definitions yet
            (pageSocket.current as any).on('logData', handleLogData);
            return () => (pageSocket.current as any)?.off('logData', handleLogData);
        }
    }, [mode, updateTimestamps]);

    // Auto-scroll on new events
    useEffect(() => {
        scrollToBottom();
    }, [logEvents, scrollToBottom]);

    // Load initial data on mount
    useEffect(() => {
        loadInitialData();
    }, []);

    if (isLoading && logEvents.length === 0) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCwIcon className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const formatTime = (ts: number | null) => {
        if (!ts) return '--';
        return new Date(ts).toLocaleString('en-US', {
            weekday: 'long',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="flex flex-col lg:flex-row gap-4 h-contentvh">
            {/* Control Panel */}
            <div className="lg:w-80 flex-shrink-0">
                <Card className="h-full">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <EyeIcon className="h-5 w-5" />
                            Server Log
                        </CardTitle>
                        <CardDescription>
                            Real-time server events and chat messages
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Mode Status */}
                        <div className="text-center">
                            <h4 className="text-lg font-semibold mb-2">
                                Mode: <Badge variant={mode === 'live' ? 'default' : 'secondary'}>
                                    {mode === 'live' ? 'LIVE' : 'HISTORY'}
                                </Badge>
                            </h4>
                            <div className="text-sm text-muted-foreground mb-4">
                                <div><strong>From:</strong> {formatTime(logStartTs)}</div>
                                <div><strong>To:</strong> {formatTime(logEndTs)}</div>
                            </div>
                        </div>

                        {/* Navigation Buttons */}
                        <div className="space-y-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full"
                                disabled={!canViewOlder || isLoading}
                                onClick={() => goHistory('older')}
                            >
                                <ChevronLeftIcon className="h-4 w-4 mr-2" />
                                View Older
                            </Button>
                            <Button
                                variant="outline" 
                                size="sm"
                                className="w-full"
                                disabled={!canViewNewer || isLoading}
                                onClick={() => goHistory('newer')}
                            >
                                View Newer
                                <ChevronRightIcon className="h-4 w-4 ml-2" />
                            </Button>
                        </div>

                        {/* Action Buttons */}
                        <div className="space-y-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full"
                                onClick={clearConsole}
                            >
                                <XIcon className="h-4 w-4 mr-2" />
                                Clear Console
                            </Button>
                            {canDownload && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full"
                                    onClick={downloadLog}
                                >
                                    <DownloadIcon className="h-4 w-4 mr-2" />
                                    Download Log
                                </Button>
                            )}
                        </div>

                        {/* Auto-scroll Toggle */}
                        <div className="flex items-center space-x-2">
                            <Checkbox 
                                id="auto-scroll"
                                checked={autoScroll}
                                onCheckedChange={(checked) => setAutoScroll(checked === true)}
                            />
                            <label htmlFor="auto-scroll" className="text-sm">
                                Auto-scroll to bottom
                            </label>
                        </div>

                        {/* Event Type Filters */}
                        <div className="space-y-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full"
                                onClick={() => setShowFilters(!showFilters)}
                            >
                                <FilterIcon className="h-4 w-4 mr-2" />
                                Event Filters
                            </Button>
                            
                            {showFilters && (
                                <div className="space-y-2 p-3 border rounded-lg">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium">Show Events:</span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setEventFilters({})}
                                        >
                                            <RotateCcwIcon className="h-3 w-3 mr-1" />
                                            All
                                        </Button>
                                    </div>
                                    {availableEventTypes.map((eventType) => (
                                        <div key={eventType} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`filter-${eventType}`}
                                                checked={eventFilters[eventType] !== false}
                                                onCheckedChange={(checked) => {
                                                    setEventFilters(prev => ({
                                                        ...prev,
                                                        [eventType]: checked === true
                                                    }));
                                                }}
                                            />
                                            <label 
                                                htmlFor={`filter-${eventType}`}
                                                className="text-xs font-mono"
                                            >
                                                {EVENT_TYPE_LABELS[eventType] || eventType}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Log Display */}
            <div className="flex-1 min-h-0">
                <Card className="h-full flex flex-col">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Server Events</CardTitle>
                                <CardDescription>
                                    {visibleEvents.length} events shown
                                </CardDescription>
                            </div>
                            {mode === 'live' && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={goLive}
                                    disabled={isLoading}
                                >
                                    <RefreshCwIcon className="h-4 w-4 mr-2" />
                                    Refresh
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 min-h-0 p-0">
                        {error && (
                            <Alert variant="destructive" className="m-4">
                                <AlertTriangleIcon className="h-4 w-4" />
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                        
                        <div 
                            ref={logContainerRef}
                            className="h-full overflow-y-auto bg-card border-t"
                            style={{ fontFamily: 'ui-monospace, monospace' }}
                        >
                            {visibleEvents.length === 0 ? (
                                <div className="flex items-center justify-center h-32 text-muted-foreground">
                                    No log entries to display
                                </div>
                            ) : (
                                visibleEvents.map((event, index) => (
                                    <LogEntry
                                        key={`${event.ts}-${index}`}
                                        event={event}
                                        isVisible={true}
                                        onPlayerClick={handlePlayerClick}
                                    />
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
} 