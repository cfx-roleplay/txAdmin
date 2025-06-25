import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { ServerIcon, PlayIcon, StopCircleIcon, RotateCcwIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronDownIcon } from 'lucide-react';
import { useResourcesApi, useResourcesRefreshApi, useResourceCommandApi, ResourceData, ResourceGroup, type ResourceCommandReq } from '@/hooks/useResources';
import { txToast } from '@/components/TxToaster';
import { cn } from '@/lib/utils';
import { AlertTriangleIcon, RefreshCwIcon } from 'lucide-react';

// Memoized resource card component
const ResourceCard = memo(({ 
    resource, 
    canManageResources, 
    onResourceAction 
}: {
    resource: ResourceData;
    canManageResources: boolean;
    onResourceAction: (action: ResourceCommandReq['action'], resourceName: string) => void;
}) => {
    const getStatusBadgeVariant = (status: ResourceData['status']) => {
        switch (status) {
            case 'started': return 'default';
            case 'stopped': return 'secondary';
            case 'error': return 'destructive';
            default: return 'secondary';
        }
    };

    const getStatusColor = (status: ResourceData['status']) => {
        switch (status) {
            case 'started': return 'text-accent';
            case 'stopped': return 'text-muted-foreground';
            case 'error': return 'text-destructive';
            default: return 'text-muted-foreground';
        }
    };

    return (
        <Card className="mb-2">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                        <ServerIcon className={cn("h-4 w-4 flex-shrink-0", getStatusColor(resource.status))} />
                        <CardTitle className="text-base truncate">{resource.name}</CardTitle>
                        {resource.version && (
                            <span className="text-sm text-muted-foreground flex-shrink-0">{resource.version}</span>
                        )}
                    </div>
                    <Badge variant={getStatusBadgeVariant(resource.status)} className="flex-shrink-0">
                        {resource.status.toUpperCase()}
                    </Badge>
                </div>
                {resource.description && (
                    <CardDescription className="line-clamp-2">{resource.description}</CardDescription>
                )}
                {resource.author && (
                    <div className="text-xs text-muted-foreground">by {resource.author}</div>
                )}
            </CardHeader>
            {canManageResources && (
                <CardContent className="pt-0">
                    <div className="flex gap-2 flex-wrap">
                        {resource.status === 'started' ? (
                            <>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => onResourceAction('restart_res', resource.name)}
                                    className="h-7 px-3"
                                >
                                    <RotateCcwIcon className="h-3 w-3 mr-1" />
                                    Restart
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => onResourceAction('stop_res', resource.name)}
                                    className="h-7 px-3"
                                >
                                    <StopCircleIcon className="h-3 w-3 mr-1" />
                                    Stop
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => onResourceAction('start_res', resource.name)}
                                    className="h-7 px-3"
                                >
                                    <PlayIcon className="h-3 w-3 mr-1" />
                                    Start
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => onResourceAction('ensure_res', resource.name)}
                                    className="h-7 px-3"
                                >
                                    <PlayIcon className="h-3 w-3 mr-1" />
                                    Ensure
                                </Button>
                            </>
                        )}
                    </div>
                </CardContent>
            )}
        </Card>
    );
});

ResourceCard.displayName = 'ResourceCard';

// Memoized resource group component
const ResourceGroupCard = memo(({ 
    group, 
    filteredResources, 
    canManageResources, 
    onResourceAction 
}: {
    group: ResourceGroup;
    filteredResources: ResourceData[];
    canManageResources: boolean;
    onResourceAction: (action: ResourceCommandReq['action'], resourceName: string) => void;
}) => {
    const [isOpen, setIsOpen] = useState(true);
    
    if (filteredResources.length === 0) return null;

    const startedCount = filteredResources.filter(r => r.status === 'started').length;
    const totalCount = filteredResources.length;

    return (
        <Card className="mb-4">
            <CardHeader className="pb-3">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center justify-between w-full text-left hover:bg-muted/50 p-2 -m-2 rounded transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold">{group.subPath}</h3>
                        <Badge variant="outline">
                            {startedCount}/{totalCount} running
                        </Badge>
                    </div>
                    <ChevronDownIcon 
                        className={cn(
                            "h-4 w-4 transition-transform duration-200",
                            isOpen ? "rotate-180" : ""
                        )} 
                    />
                </button>
            </CardHeader>
            {isOpen && (
                <CardContent className="pt-0">
                    <div className="space-y-2">
                        {filteredResources.map((resource) => (
                            <ResourceCard
                                key={resource.name}
                                resource={resource}
                                canManageResources={canManageResources}
                                onResourceAction={onResourceAction}
                            />
                        ))}
                    </div>
                </CardContent>
            )}
        </Card>
    );
});

ResourceGroupCard.displayName = 'ResourceGroupCard';

export default function ResourcesPage() {
    const [resourcesData, setResourcesData] = useState<{
        resourceGroups: ResourceGroup[];
        canManageResources: boolean;
    } | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

    const resourcesApi = useResourcesApi();
    const resourcesRefreshApi = useResourcesRefreshApi();
    const resourceCommandApi = useResourceCommandApi();

    // Fetch resources data (cached)
    const fetchResources = useCallback((forceRefresh = false) => {
        setIsLoading(true);
        setError(null);
        
        const apiToUse = forceRefresh ? resourcesRefreshApi : resourcesApi;
        const queryParams = forceRefresh ? { refresh: 'true' } : {};
        
        apiToUse({
            queryParams,
            success: (data) => {
                if (data.success) {
                    setResourcesData({
                        resourceGroups: data.resourceGroups,
                        canManageResources: data.canManageResources,
                    });
                    setLastUpdate(new Date());
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
    }, [resourcesApi, resourcesRefreshApi]);

    // Auto-refresh every 10 seconds (cached data, so less aggressive)
    useEffect(() => {
        fetchResources();
        const interval = setInterval(() => fetchResources(false), 10000);
        return () => clearInterval(interval);
    }, [fetchResources]);

    // Handle resource actions
    const handleResourceAction = useCallback((action: ResourceCommandReq['action'], resourceName: string) => {
        const actionNames = {
            start_res: 'start',
            stop_res: 'stop',
            restart_res: 'restart',
            ensure_res: 'ensure',
            refresh_res: 'refresh',
        };

        resourceCommandApi({
            data: { action, parameter: resourceName },
            toastLoadingMessage: `${actionNames[action].charAt(0).toUpperCase() + actionNames[action].slice(1)}ing ${resourceName}...`,
            success: () => {
                // Refresh resources after successful action
                setTimeout(fetchResources, 1000);
            },
        });
    }, [resourceCommandApi, fetchResources]);

    // Handle refresh all resources
    const handleRefreshAll = useCallback(() => {
        handleResourceAction('refresh_res', '');
    }, [handleResourceAction]);

    // Filter resources based on search query
    const filteredGroups = useMemo(() => {
        if (!resourcesData) return [];
        
        return resourcesData.resourceGroups.map(group => ({
            ...group,
            resources: group.resources.filter(resource =>
                resource.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                resource.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
                resource.description.toLowerCase().includes(searchQuery.toLowerCase())
            ),
        })).filter(group => group.resources.length > 0);
    }, [resourcesData, searchQuery]);

    // Calculate total stats
    const totalStats = useMemo(() => {
        if (!resourcesData) return { total: 0, started: 0, stopped: 0, error: 0 };
        
        const allResources = resourcesData.resourceGroups.flatMap(g => g.resources);
        return {
            total: allResources.length,
            started: allResources.filter(r => r.status === 'started').length,
            stopped: allResources.filter(r => r.status === 'stopped').length,
            error: allResources.filter(r => r.status === 'error').length,
        };
    }, [resourcesData]);

    if (isLoading && !resourcesData) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCwIcon className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <AlertTriangleIcon className="h-12 w-12 text-destructive" />
                <div className="text-center">
                    <h3 className="text-lg font-semibold mb-2">Failed to load resources</h3>
                    <p className="text-muted-foreground mb-4">{error}</p>
                    <Button onClick={() => fetchResources(true)} variant="outline">
                        <RefreshCwIcon className="h-4 w-4 mr-2" />
                        Try Again
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-w-96 w-full h-contentvh">
            {/* Header with stats */}
            <div className="mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <div>
                        <h1 className="text-2xl font-bold">Resources</h1>
                        {lastUpdate && (
                            <p className="text-sm text-muted-foreground">
                                Last updated: {lastUpdate.toLocaleTimeString()}
                            </p>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={() => fetchResources(true)} variant="outline" size="sm">
                            <RefreshCwIcon className="h-4 w-4 mr-2" />
                            Refresh
                        </Button>
                        {resourcesData?.canManageResources && (
                            <Button onClick={handleRefreshAll} variant="outline" size="sm">
                                <RotateCcwIcon className="h-4 w-4 mr-2" />
                                Refresh All
                            </Button>
                        )}
                    </div>
                </div>

                {/* Stats cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                    <Card>
                        <CardContent className="p-4">
                            <div className="text-2xl font-bold">{totalStats.total}</div>
                            <div className="text-sm text-muted-foreground">Total Resources</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="text-2xl font-bold text-accent">{totalStats.started}</div>
                            <div className="text-sm text-muted-foreground">Started</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="text-2xl font-bold text-muted-foreground">{totalStats.stopped}</div>
                            <div className="text-sm text-muted-foreground">Stopped</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="text-2xl font-bold text-destructive">{totalStats.error}</div>
                            <div className="text-sm text-muted-foreground">Errors</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Search box */}
                <Input
                    placeholder="Search resources..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="max-w-md"
                />
            </div>

            {/* Resources list */}
            <div className="flex-1 overflow-auto">
                {filteredGroups.length === 0 ? (
                    <div className="text-center py-8">
                        <ServerIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No resources found</h3>
                        <p className="text-muted-foreground">
                            {searchQuery ? 'Try adjusting your search query.' : 'No resources are currently loaded.'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredGroups.map((group) => (
                            <ResourceGroupCard
                                key={group.divName}
                                group={group}
                                filteredResources={group.resources}
                                canManageResources={resourcesData?.canManageResources ?? false}
                                onResourceAction={handleResourceAction}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
} 