import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import SwitchText from '@/components/SwitchText'
import InlineCode from '@/components/InlineCode'
import { AdvancedDivider, SettingItem, SettingItemDesc } from '../settingsItems'
import { useState, useEffect, useRef, useMemo, useReducer } from "react"
import { getConfigEmptyState, getConfigAccessors, SettingsCardProps, getPageConfig, configsReducer, getConfigDiff, type PageConfigReducerAction } from "../utils"
import { PlusIcon, TrashIcon, Undo2Icon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TimeInputDialog } from "@/components/TimeInputDialog"
import TxAnchor from "@/components/TxAnchor"
import { useAutoAnimate } from "@formkit/auto-animate/react"
import SettingsCardShell from "../SettingsCardShell"
import { cn } from "@/lib/utils"
import { txToast } from "@/components/TxToaster"
import { useBackendApi } from "@/hooks/fetch"
import { useAdminPerms } from "@/hooks/auth"
import { useLocation } from "wouter"
import type { ResetServerDataPathResp } from "@shared/otherTypes"
import { useOpenConfirmDialog } from "@/hooks/dialogs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { usePoolLimits } from "@/hooks/usePoolLimits"


// Remove duplicates and sort times
function sanitizeTimes(times: string[]): string[] {
    const uniqueTimes = Array.from(new Set(times));
    return uniqueTimes.sort((a, b) => {
        const [aHours, aMinutes] = a.split(':').map(Number);
        const [bHours, bMinutes] = b.split(':').map(Number);
        return aHours - bHours || aMinutes - bMinutes;
    });
}


type RestartScheduleBoxProps = {
    restartTimes: string[] | undefined;
    setRestartTimes: (val: PageConfigReducerAction<string[]|undefined>['configValue']) => void;
    disabled?: boolean;
};

function RestartScheduleBox({ restartTimes, setRestartTimes, disabled }: RestartScheduleBoxProps) {
    const [isTimeInputOpen, setIsTimeInputOpen] = useState(false);
    const [animationParent] = useAutoAnimate();

    const addTime = (time: string) => {
        if (!restartTimes || disabled) return;
        setRestartTimes(prev => sanitizeTimes([...prev ?? [], time]));
    };
    const removeTime = (index: number) => {
        if (!restartTimes || disabled) return;
        setRestartTimes(prev => sanitizeTimes((prev ?? []).filter((_, i) => i !== index)));
    };
    const applyPreset = (presetTimes: string[]) => {
        if (!restartTimes || disabled) return;
        setRestartTimes(presetTimes);
    };
    const clearTimes = () => {
        if (disabled) return;
        setRestartTimes([]);
    };

    const presetSpanClasses = cn(
        'text-muted-foreground',
        disabled && 'opacity-50 cursor-not-allowed'
    )

    return (
        <div className="py-3 px-2 min-h-[4.5rem] flex items-center border rounded-lg">
            <div className={cn("w-full flex items-center gap-2", disabled && 'cursor-not-allowed')}>
                <div className="flex flex-wrap gap-2 grow" ref={animationParent} >
                    {restartTimes && restartTimes.length === 0 && (
                        <div className="text-sm text-muted-foreground">
                            <span>
                                No schedule set. Click on the <strong>+</strong> button to add a time.
                            </span>
                            <p>
                                {'Presets: '}
                                <a
                                    onClick={() => applyPreset(['00:00'])}
                                    className="cursor-pointer text-sm text-primary hover:underline"
                                >
                                    1x<span className={presetSpanClasses}>/day</span>
                                </a>
                                {', '}
                                <a
                                    onClick={() => applyPreset(['00:00', '12:00'])}
                                    className="cursor-pointer text-sm text-primary hover:underline"
                                >
                                    2x<span className={presetSpanClasses}>/day</span>
                                </a>
                                {', '}
                                <a
                                    onClick={() => applyPreset(['00:00', '08:00', '16:00'])}
                                    className="cursor-pointer text-sm text-primary hover:underline"
                                >
                                    3x<span className={presetSpanClasses}>/day</span>
                                </a>
                                {', '}
                                <a
                                    onClick={() => applyPreset(['00:00', '06:00', '12:00', '18:00'])}
                                    className="cursor-pointer text-sm text-primary hover:underline"
                                >
                                    4x<span className={presetSpanClasses}>/day</span>
                                </a>
                            </p>
                        </div>
                    )}
                    {restartTimes && restartTimes.map((time, index) => (
                        <div key={time} className="flex items-center space-x-1 bg-secondary text-secondary-foreground px-3 py-1 rounded-md select-none">
                            <span className="font-mono">{time}</span>
                            {!disabled && <button
                                onClick={() => removeTime(index)}
                                className="ml-2 text-secondary-foreground/50 hover:text-destructive"
                                aria-label="Remove"
                                disabled={disabled}
                            >
                                <XIcon className="size-4" />
                            </button>}
                        </div>
                    ))}
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={() => setIsTimeInputOpen(true)}
                        variant="secondary"
                        size={'xs'}
                        className="w-10 hover:bg-primary hover:text-primary-foreground"
                        aria-label="Add"
                        disabled={disabled}
                    >
                        <PlusIcon className="h-4" />
                    </Button>
                    <Button
                        onClick={() => clearTimes()}
                        variant="muted"
                        size={'xs'}
                        className="w-10 hover:bg-destructive hover:text-destructive-foreground"
                        aria-label="Clear"
                        disabled={disabled || !restartTimes || restartTimes.length === 0}
                    >
                        <TrashIcon className="h-3.5" />
                    </Button>
                </div>
            </div>
            <TimeInputDialog
                title="Add Restart Time"
                isOpen={isTimeInputOpen}
                onClose={() => setIsTimeInputOpen(false)}
                onSubmit={addTime}
            />
        </div>
    )
}


const getServerDataPlaceholder = (hostSuggested?: string) => {
    if (hostSuggested) {
        const withoutTailSlash = hostSuggested.replace(/\/$/, '');
        return `${withoutTailSlash}/CFXDefault`;
    } else if (window.txConsts.isWindows) {
        return 'C:/Users/Admin/Desktop/CFXDefault';
    } else {
        return '/root/fivem/txData/CFXDefault';
    }
}

// Check if the browser timezone is different from the server timezone
function TimeZoneWarning() {
    try {
        const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (window.txConsts.serverTimezone !== browserTimezone) {
            return (
                <SettingItemDesc className="text-destructive-inline">
                    <strong>Warning:</strong> Your server timezone is set to <InlineCode>{window.txConsts.serverTimezone}</InlineCode>, but your browser timezone is <InlineCode>{browserTimezone}</InlineCode>. Make sure to configure the time according to the server timezone.
                </SettingItemDesc>
            );
        }
    } catch (error) {
        console.error(error);
    }
    return null;
}

type PoolSizeBoxProps = {
    poolSizes: Array<{poolName: string, increase: number}> | undefined;
    setPoolSizes: (val: any) => void;
    disabled?: boolean;
};

function PoolSizeBox({ poolSizes, setPoolSizes, disabled }: PoolSizeBoxProps) {
    const [isPoolDialogOpen, setIsPoolDialogOpen] = useState(false);
    const [poolName, setPoolName] = useState('');
    const [increase, setIncrease] = useState('');
    const [animationParent] = useAutoAnimate();
    const { poolLimits, isLoading: isLoadingPools } = usePoolLimits();

    const addPool = () => {
        if (!poolName || !increase || !poolSizes || disabled) return;
        const increaseNum = parseInt(increase);
        
        if (isNaN(increaseNum) || increaseNum <= 0) {
            txToast.error({
                title: 'Invalid Increase Value',
                msg: 'The increase value must be a positive number greater than 0.',
            });
            return;
        }
        
        if (poolLimits) {
            if (!poolLimits.pools[poolName]) {
                txToast.error({
                    title: 'Invalid Pool Name',
                    msg: `"${poolName}" is not a valid FiveM pool name. Please select from the available options.`,
                });
                return;
            }
        } else {
            txToast.error({
                title: 'Pool Data Loading',
                msg: 'Pool validation data is still loading. Please wait and try again.',
            });
            return;
        }
        
        if (poolSizes.some(pool => pool.poolName === poolName)) {
            txToast.error({
                title: 'Duplicate Pool',
                msg: `Pool "${poolName}" is already configured. Please choose a different pool.`,
            });
            return;
        }
        
        if (poolLimits && poolLimits.pools[poolName]) {
            const maxAllowedLimit = poolLimits.pools[poolName];
            
            if (increaseNum > maxAllowedLimit) {
                txToast.error({
                    title: 'Value Exceeds Maximum Limit',
                    msg: `The increase value for "${poolName}" is too high. Maximum allowed: ${maxAllowedLimit.toLocaleString()}, but you requested: ${increaseNum.toLocaleString()}.`,
                });
                return;
            }
        }
        
        const newPool = { poolName, increase: increaseNum };
        setPoolSizes([...poolSizes, newPool]);
        setPoolName('');
        setIncrease('');
        setIsPoolDialogOpen(false);
    };

    const removePool = (index: number) => {
        if (!poolSizes || disabled) return;
        setPoolSizes(poolSizes.filter((_, i) => i !== index));
    };

    const clearPools = () => {
        if (disabled) return;
        setPoolSizes([]);
    };

    return (
        <div className="py-3 px-2 min-h-[4.5rem] flex items-center border rounded-lg">
            <div className={cn("w-full flex items-center gap-2", disabled && 'cursor-not-allowed')}>
                <div className="flex flex-wrap gap-2 grow" ref={animationParent}>
                    {poolSizes && poolSizes.length === 0 && (
                        <div className="text-sm text-muted-foreground">
                            No pool size increases configured. Click the <strong>+</strong> button to add one.
                        </div>
                    )}
                    {poolSizes && poolSizes.map((pool, index) => (
                        <div key={`${pool.poolName}-${index}`} className="flex items-center space-x-1 bg-secondary text-secondary-foreground px-3 py-1 rounded-md select-none">
                            <span className="font-mono">{pool.poolName}</span>
                            <span className="text-xs opacity-70">+{pool.increase}</span>
                            {!disabled && <button
                                onClick={() => removePool(index)}
                                className="ml-2 text-secondary-foreground/50 hover:text-destructive"
                                aria-label="Remove"
                            >
                                <XIcon className="size-4" />
                            </button>}
                        </div>
                    ))}
                </div>
                <div className="flex gap-2">
                    <Dialog open={isPoolDialogOpen} onOpenChange={setIsPoolDialogOpen}>
                        <DialogTrigger asChild>
                            <Button
                                variant="secondary"
                                size={'xs'}
                                className="w-10 hover:bg-primary hover:text-primary-foreground"
                                aria-label="Add"
                                disabled={disabled}
                            >
                                <PlusIcon className="h-4" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add Pool Size</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="poolName">Pool Name</Label>
                                    {isLoadingPools ? (
                                        <div className="text-sm text-muted-foreground">Loading available pools...</div>
                                    ) : poolLimits && poolLimits.availablePoolNames.length > 0 ? (
                                        <Select value={poolName} onValueChange={setPoolName}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a pool..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {poolLimits.availablePoolNames.map((name: string) => (
                                                    <SelectItem key={name} value={name}>
                                                        <div className="flex justify-between items-center w-full">
                                                            <span>{name}</span>
                                                                                                        <span className="text-xs text-muted-foreground ml-2">
                                                (max: {poolLimits.pools[name]})
                                            </span>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <div>
                                            <Input
                                                id="poolName"
                                                value={poolName}
                                                onChange={(e) => setPoolName(e.target.value)}
                                                placeholder="Loading pool data..."
                                                disabled={true}
                                            />
                                            <div className="text-xs text-muted-foreground mt-1">
                                                Pool validation data is loading. Please wait...
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <Label htmlFor="increase">Pool Size</Label>
                                    <Input
                                        id="increase"
                                        type="number"
                                        min="1"
                                        value={increase}
                                        onChange={(e) => setIncrease(e.target.value)}
                                        placeholder="6000"
                                    />
                                    {poolName && poolLimits && poolLimits.pools[poolName] && (
                                        <div className="text-xs text-muted-foreground mt-1">
                                            Maximum allowed: {poolLimits.pools[poolName].toLocaleString()}
                                            {increase && !isNaN(parseInt(increase)) && (
                                                <>
                                                    {(() => {
                                                        const maxLimit = poolLimits.pools[poolName];
                                                        const increaseNum = parseInt(increase);
                                                        if (increaseNum > maxLimit) {
                                                            return (
                                                                <span className="text-destructive-inline">
                                                                    {" "}⚠️ Value exceeds maximum limit!
                                                                </span>
                                                            );
                                                        } else if (increaseNum > 0) {
                                                            return (
                                                                <span className="text-success-inline">
                                                                    {" "}✓ Valid pool size
                                                                </span>
                                                            );
                                                        }
                                                        return null;
                                                    })()}
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <Button onClick={addPool} className="w-full" disabled={!poolName || !increase}>
                                    Add Pool
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                    <Button
                        onClick={clearPools}
                        variant="muted"
                        size={'xs'}
                        className="w-10 hover:bg-destructive hover:text-destructive-foreground"
                        aria-label="Clear"
                        disabled={disabled || !poolSizes || poolSizes.length === 0}
                    >
                        <TrashIcon className="h-3.5" />
                    </Button>
                </div>
            </div>
        </div>
    );
}


export const pageConfigs = {
    dataPath: getPageConfig('server', 'dataPath'),
    restarterSchedule: getPageConfig('restarter', 'schedule'),
    quietMode: getPageConfig('server', 'quiet'),

    cfgPath: getPageConfig('server', 'cfgPath', true),
    startupArgs: getPageConfig('server', 'startupArgs', true),
    onesync: getPageConfig('server', 'onesync', true),
    autoStart: getPageConfig('server', 'autoStart', true),
    resourceTolerance: getPageConfig('restarter', 'resourceStartingTolerance', true),

    enforceGameBuild: getPageConfig('fxserver', 'enforceGameBuild', true),
    replaceExeToSwitchBuilds: getPageConfig('fxserver', 'replaceExeToSwitchBuilds', true),
    pureLevel: getPageConfig('fxserver', 'pureLevel', true),
    enableNetworkedSounds: getPageConfig('fxserver', 'enableNetworkedSounds', true),
    enableNetworkedPhoneExplosions: getPageConfig('fxserver', 'enableNetworkedPhoneExplosions', true),
    enableNetworkedScriptEntityStates: getPageConfig('fxserver', 'enableNetworkedScriptEntityStates', true),
    experimentalStateBagsHandler: getPageConfig('fxserver', 'experimentalStateBagsHandler', true),
    experimentalOnesyncPopulation: getPageConfig('fxserver', 'experimentalOnesyncPopulation', true),
    experimentalNetGameEventHandler: getPageConfig('fxserver', 'experimentalNetGameEventHandler', true),
    
    poolSizes: getPageConfig('fxserver', 'poolSizes', true),
    endpointPrivacy: getPageConfig('fxserver', 'endpointPrivacy', true),
    httpFileServerProxyOnly: getPageConfig('fxserver', 'httpFileServerProxyOnly', true),
    stateBagStrictMode: getPageConfig('fxserver', 'stateBagStrictMode', true),
    protectServerEntities: getPageConfig('fxserver', 'protectServerEntities', true),
    steamWebApiKey: getPageConfig('fxserver', 'steamWebApiKey', true),
    steamWebApiDomain: getPageConfig('fxserver', 'steamWebApiDomain', true),
    tebexSecret: getPageConfig('fxserver', 'tebexSecret', true),
    playersToken: getPageConfig('fxserver', 'playersToken', true),
    profileDataToken: getPageConfig('fxserver', 'profileDataToken', true),
    listingIpOverride: getPageConfig('fxserver', 'listingIpOverride', true),
    listingHostOverride: getPageConfig('fxserver', 'listingHostOverride', true),
    endpoints: getPageConfig('fxserver', 'endpoints', true),
    onesyncLogFile: getPageConfig('fxserver', 'onesyncLogFile', true),
    onesyncAutomaticResend: getPageConfig('fxserver', 'onesyncAutomaticResend', true),
    useAccurateSends: getPageConfig('fxserver', 'useAccurateSends', true),
} as const;

export default function ConfigCardFxserver({ cardCtx, pageCtx }: SettingsCardProps) {
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [isResettingServerData, setIsResettingServerData] = useState(false);
    const { hasPerm } = useAdminPerms();
    const setLocation = useLocation()[1];
    const openConfirmDialog = useOpenConfirmDialog();
    const [states, dispatch] = useReducer(
        configsReducer<typeof pageConfigs>,
        null,
        () => getConfigEmptyState(pageConfigs),
    );
    const cfg = useMemo(() => {
        return getConfigAccessors(cardCtx.cardId, pageConfigs, pageCtx.apiData, dispatch);
    }, [pageCtx.apiData, dispatch]);

    //Effects - handle changes and reset advanced settings
    useEffect(() => {
        updatePageState();
    }, [states]);
    useEffect(() => {
        if (showAdvanced) return;
        Object.values(cfg).forEach(c => c.isAdvanced && c.state.discard());
    }, [showAdvanced]);

    //Refs for configs that don't use state
    const dataPathRef = useRef<HTMLInputElement | null>(null);
    const cfgPathRef = useRef<HTMLInputElement | null>(null);
    const startupArgsRef = useRef<HTMLInputElement | null>(null);
    const enforceGameBuildRef = useRef<HTMLInputElement | null>(null);
    const forceQuietMode = pageCtx.apiData?.forceQuietMode;

    //Marshalling Utils
    const selectNumberUtil = {
        toUi: (num?: number) => num ? num.toString() : undefined,
        toCfg: (str?: string) => str ? parseInt(str) : undefined,
    }
    const inputArrayUtil = {
        toUi: (args?: string[]) => args ? args.join(' ') : '',
        toCfg: (str?: string) => str ? str.trim().split(/\s+/) : [],
    }
    const emptyToNull = (str?: string) => {
        if (str === undefined) return undefined;
        const trimmed = str.trim();
        return trimmed.length ? trimmed : null;
    };

    //Processes the state of the page and sets the card as pending save if needed
    const updatePageState = () => {
        let currStartupArgs;
        if (startupArgsRef.current) {
            currStartupArgs = inputArrayUtil.toCfg(startupArgsRef.current.value);
        }
        let currDataPath;
        if (dataPathRef.current?.value) {
            currDataPath = dataPathRef.current.value.replace(/\\/g, '/').replace(/\/\/+/, '/');
            if (currDataPath.endsWith('/')) {
                currDataPath = currDataPath.slice(0, -1);
            }
        }
        const overwrites = {
            dataPath: emptyToNull(dataPathRef.current?.value),
            cfgPath: cfgPathRef.current?.value,
            startupArgs: currStartupArgs,
        };

        const res = getConfigDiff(cfg, states, overwrites, showAdvanced);
        pageCtx.setCardPendingSave(res.hasChanges ? cardCtx : null);
        return res;
    }

    //Validate changes (for UX only) and trigger the save API
    const handleOnSave = () => {
        const { hasChanges, localConfigs } = updatePageState();
        if (!hasChanges) return;

        if (!localConfigs.server?.dataPath) {
            return txToast.error({
                title: 'The Server Data Folder is required.',
                md: true,
                msg: 'If you want to return to the Setup page, click on the "Reset" button instead.',
            });
        }
        if (localConfigs.server.cfgPath !== undefined && !localConfigs.server.cfgPath) {
            return txToast.error({
                title: 'The CFG File Path is required.',
                md: true,
                msg: 'The value should probably be `server.cfg`.',
            });
        }
        if (
            Array.isArray(localConfigs.server?.startupArgs)
            && localConfigs.server.startupArgs.some((arg) => arg.toLowerCase() === 'onesync')
        ) {
            return txToast.error({
                title: 'You cannot set OneSync in Startup Arguments.',
                md: true,
                msg: 'Please use the selectbox below it.',
            });
        }
        pageCtx.saveChanges(cardCtx, localConfigs);
    }

    //Card content stuff
    const serverDataPlaceholder = useMemo(
        () => getServerDataPlaceholder(pageCtx.apiData?.dataPath),
        [pageCtx.apiData]
    );

    //Reset server server data button
    const resetServerDataApi = useBackendApi<ResetServerDataPathResp>({
        method: 'POST',
        path: `/settings/resetServerDataPath`,
        throwGenericErrors: true,
    });
    const handleResetServerData = () => {
        openConfirmDialog({
            title: 'Reset Server Data Path',
            message: (<>
                Are you sure you want to reset the server data path? <br />
                <br />
                <strong>This will not delete any resource files or database</strong>, but just reset the txAdmin configuration, allowing you to go back to the Setup page. <br />
                If you want, you can set the path back to the current value later. <br />
                <br />
                <strong className="text-warning-inline">Warning:</strong> take note of the current path before proceeding, so you can set it back later if you need to. Current path:
                <Input value={cfg.dataPath.initialValue} className="mt-2" readOnly />
            </>),
            onConfirm: () => {
                setIsResettingServerData(true);
                resetServerDataApi({
                    toastLoadingMessage: 'Resetting server data path...',
                    success: (data, toastId) => {
                        if (data.type === 'success') {
                            setLocation('/server/setup');
                        }
                    },
                    finally: () => setIsResettingServerData(false),
                });
            },
        });

    }

    // cfg.restarterSchedule.state.set(['00:00', '12:00'])
    // cfg.restarterSchedule.state.set([])
    // cfg.restarterSchedule.state.set(undefined)

    return (
        <SettingsCardShell
            cardCtx={cardCtx}
            pageCtx={pageCtx}
            onClickSave={handleOnSave}
            advancedVisible={showAdvanced}
            advancedSetter={setShowAdvanced}
        >
            <SettingItem label="Server Data Folder" htmlFor={cfg.dataPath.eid} required>
                <div className="flex gap-2">
                    <Input
                        id={cfg.dataPath.eid}
                        ref={dataPathRef}
                        defaultValue={cfg.dataPath.initialValue}
                        placeholder={serverDataPlaceholder}
                        onInput={updatePageState}
                        disabled={pageCtx.isReadOnly}
                        required
                    />
                    <Button
                        className="grow border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        variant="outline"
                        disabled={pageCtx.isReadOnly || !hasPerm('all_permissions') || isResettingServerData}
                        onClick={handleResetServerData}
                    >
                        <Undo2Icon className="mr-2 h-4 w-4" /> Reset
                    </Button>
                </div>
                <SettingItemDesc>
                    The full path of the folder that <strong>contains</strong> the <InlineCode>resources</InlineCode> folder, usually it's the same place that contains your <InlineCode>server.cfg</InlineCode>. <br />
                    Resetting this value will allow you to go back to the Setup page, without deleting any files.
                    {pageCtx.apiData?.dataPath && pageCtx.apiData?.hasCustomDataPath && (<>
                        <br />
                        <span className="text-warning-inline">
                            {window.txConsts.hostConfigSource}: This path should start with <InlineCode>{pageCtx.apiData.dataPath}</InlineCode> .
                        </span>
                    </>)}
                </SettingItemDesc>
            </SettingItem>
            <SettingItem label="Restart Schedule" showOptional>
                <RestartScheduleBox
                    restartTimes={states.restarterSchedule}
                    setRestartTimes={cfg.restarterSchedule.state.set}
                    disabled={pageCtx.isReadOnly}
                />
                <TimeZoneWarning />
                <SettingItemDesc>
                    At which times of day to restart the server. <br />
                    <strong>Note:</strong> Make sure your schedule matches your server time and not your local time.
                </SettingItemDesc>
            </SettingItem>
            <SettingItem label="Quiet Mode">
                <SwitchText
                    id={cfg.quietMode.eid}
                    checkedLabel="Enabled"
                    uncheckedLabel="Disabled"
                    checked={forceQuietMode || states.quietMode}
                    onCheckedChange={cfg.quietMode.state.set}
                    disabled={pageCtx.isReadOnly || forceQuietMode}
                />
                <SettingItemDesc>
                    Do not print FXServer's output to the terminal. <br />
                    You will still be able to use the Live Console.
                    {forceQuietMode && (<>
                        <br />
                        <span className="text-warning-inline">{window.txConsts.hostConfigSource}: This setting is locked and cannot be changed.</span>
                    </>)}
                </SettingItemDesc>
            </SettingItem>

            {showAdvanced && <AdvancedDivider />}

            <SettingItem label="CFG File Path" htmlFor={cfg.cfgPath.eid} showIf={showAdvanced} required>
                <Input
                    id={cfg.cfgPath.eid}
                    ref={cfgPathRef}
                    defaultValue={cfg.cfgPath.initialValue}
                    placeholder="server.cfg"
                    onInput={updatePageState}
                    disabled={pageCtx.isReadOnly}
                    required
                />
                <SettingItemDesc>
                    The path to your server config file, probably named <InlineCode>server.cfg</InlineCode>. <br />
                    This can either be absolute, or relative to the Server Data folder.
                </SettingItemDesc>
            </SettingItem>
            <SettingItem label="Startup Arguments" htmlFor={cfg.startupArgs.eid} showIf={showAdvanced}>
                <Input
                    id={cfg.startupArgs.eid}
                    ref={startupArgsRef}
                    defaultValue={inputArrayUtil.toUi(cfg.startupArgs.initialValue)}
                    placeholder="--trace-warning"
                    onInput={updatePageState}
                    disabled={pageCtx.isReadOnly}
                />
                <SettingItemDesc>
                    Additional command-line arguments to pass to the FXServer instance such as NodeJS CLI flags. <br />
                    <strong>Warning:</strong> You almost certainly should not use this option, commands and convars should be placed in your <InlineCode>server.cfg</InlineCode> instead.
                </SettingItemDesc>
            </SettingItem>
            <SettingItem label="OneSync" htmlFor={cfg.onesync.eid} showIf={showAdvanced}>
                <Select
                    value={states.onesync}
                    onValueChange={cfg.onesync.state.set as any}
                    disabled={pageCtx.isReadOnly}
                >
                    <SelectTrigger id={cfg.onesync.eid}>
                        <SelectValue placeholder="Select OneSync option" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="on">On (recommended)</SelectItem>
                        <SelectItem value="legacy">Legacy</SelectItem>
                        <SelectItem value="off">Off</SelectItem>
                    </SelectContent>
                </Select>
                <SettingItemDesc>
                    Most servers should be using <strong>OneSync On</strong>. <br />
                    The other options are considered deprecated and should not be used unless you know what you're doing.
                    For more information, please read the <TxAnchor href="https://docs.fivem.net/docs/scripting-reference/onesync/" >documentation</TxAnchor>.
                </SettingItemDesc>
            </SettingItem>
            <SettingItem label="Autostart" showIf={showAdvanced}>
                <SwitchText
                    id={cfg.autoStart.eid}
                    checkedLabel="Enabled"
                    uncheckedLabel="Disabled"
                    checked={states.autoStart}
                    onCheckedChange={cfg.autoStart.state.set}
                    disabled={pageCtx.isReadOnly}
                />
                <SettingItemDesc>
                    Start the server automatically after <strong>txAdmin</strong> starts.
                </SettingItemDesc>
            </SettingItem>
            <SettingItem label="Resource Starting Tolerance" htmlFor={cfg.resourceTolerance.eid} showIf={showAdvanced}>
                <Select
                    value={selectNumberUtil.toUi(states.resourceTolerance)}
                    onValueChange={(val) => cfg.resourceTolerance.state.set(selectNumberUtil.toCfg(val))}
                    disabled={pageCtx.isReadOnly}
                >
                    <SelectTrigger id={cfg.resourceTolerance.eid}>
                        <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="90">1.5 minutes (default)</SelectItem>
                        <SelectItem value="180">3 minutes</SelectItem>
                        <SelectItem value="300">5 minutes</SelectItem>
                        <SelectItem value="600">10 minutes</SelectItem>
                    </SelectContent>
                </Select>
                <SettingItemDesc>
                    At server boot, how much time to wait for any single resource to start before restarting the server. <br />
                    <strong>Note:</strong> If you are getting <InlineCode>failed to start in time</InlineCode> errors, increase this value.
                </SettingItemDesc>
            </SettingItem>

            <SettingItem label="Enforce Game Build" htmlFor={cfg.enforceGameBuild.eid} showIf={showAdvanced}>
                <Input
                    id={cfg.enforceGameBuild.eid}
                    ref={enforceGameBuildRef}
                    defaultValue={cfg.enforceGameBuild.initialValue || ''}
                    placeholder="2545, h4, mptuner, etc."
                    onInput={updatePageState}
                    disabled={pageCtx.isReadOnly}
                />
                <SettingItemDesc>
                    Selects a game build for clients to use. This can only be specified at startup, and cannot be changed at runtime. <br />
                    Examples: <InlineCode>h4</InlineCode>, <InlineCode>mptuner</InlineCode>, <InlineCode>2545</InlineCode>. <br />
                    <strong>FiveM builds:</strong> 1, 1604 (xm18), 2060 (sum), 2189 (h4), 2372 (tuner), 2545 (security), 2612 (mpg9ec), 2699 (mpsum2), 2802 (mpchristmas3), 2944 (mp2023_01), 3095 (mp2023_02), 3258 (mp2024_01), 3407 (mp2024_02), 3570 (mp2025_01). <br />
                    <strong>RedM builds:</strong> 1311, 1355, 1436, 1491.
                </SettingItemDesc>
            </SettingItem>
            <SettingItem label="Replace Exe To Switch Builds" showIf={showAdvanced}>
                <SwitchText
                    id={cfg.replaceExeToSwitchBuilds.eid}
                    checkedLabel="Enabled"
                    uncheckedLabel="Disabled"
                    checked={states.replaceExeToSwitchBuilds ?? undefined}
                    onCheckedChange={cfg.replaceExeToSwitchBuilds.state.set}
                    disabled={pageCtx.isReadOnly}
                />
                <SettingItemDesc>
                    Determines how the client will run older game builds. <br />
                    <strong>True:</strong> Default for builds below 12872. Client downloads all files for the specific game build and runs old executable. <br />
                    <strong>False:</strong> Default for builds above 12871. Client runs latest stable game build executable but only loads specific DLCs.
                </SettingItemDesc>
            </SettingItem>
            <SettingItem label="Pure Level" htmlFor={cfg.pureLevel.eid} showIf={showAdvanced}>
                <Select
                    value={states.pureLevel?.toString() || 'disabled'}
                    onValueChange={(val) => cfg.pureLevel.state.set(val === 'disabled' ? null : parseInt(val) as 1 | 2)}
                    disabled={pageCtx.isReadOnly}
                >
                    <SelectTrigger id={cfg.pureLevel.eid}>
                        <SelectValue placeholder="Disabled" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="disabled">Disabled</SelectItem>
                        <SelectItem value="1">Level 1 - Block modified files (except audio & graphics)</SelectItem>
                        <SelectItem value="2">Level 2 - Block all modified files</SelectItem>
                    </SelectContent>
                </Select>
                <SettingItemDesc>
                    Prevents users from using modified client files. <br />
                    <strong>Level 1:</strong> Blocks all modified client files except audio files and known graphics mods. <br />
                    <strong>Level 2:</strong> Blocks all modified client files.
                </SettingItemDesc>
            </SettingItem>
            <SettingItem label="Enable Networked Sounds" showIf={showAdvanced}>
                <SwitchText
                    id={cfg.enableNetworkedSounds.eid}
                    checkedLabel="Enabled"
                    uncheckedLabel="Disabled"
                    checked={states.enableNetworkedSounds ?? undefined}
                    onCheckedChange={cfg.enableNetworkedSounds.state.set}
                    disabled={pageCtx.isReadOnly}
                />
                <SettingItemDesc>
                    Allow users to route NETWORK_PLAY_SOUND_EVENT through the server. <br />
                    <strong>Default:</strong> Enabled. <strong>Warning:</strong> Can be used by malicious actors.
                </SettingItemDesc>
            </SettingItem>
            <SettingItem label="Enable Networked Phone Explosions" showIf={showAdvanced}>
                <SwitchText
                    id={cfg.enableNetworkedPhoneExplosions.eid}
                    checkedLabel="Enabled"
                    uncheckedLabel="Disabled"
                    checked={states.enableNetworkedPhoneExplosions ?? undefined}
                    onCheckedChange={cfg.enableNetworkedPhoneExplosions.state.set}
                    disabled={pageCtx.isReadOnly}
                />
                <SettingItemDesc>
                    Allow users to route REQUEST_PHONE_EXPLOSION_EVENT through the server. <br />
                    <strong>Default:</strong> Disabled. <strong>Warning:</strong> Can be used by malicious actors.
                </SettingItemDesc>
            </SettingItem>
            <SettingItem label="Enable Networked Script Entity States" showIf={showAdvanced}>
                <SwitchText
                    id={cfg.enableNetworkedScriptEntityStates.eid}
                    checkedLabel="Enabled"
                    uncheckedLabel="Disabled"
                    checked={states.enableNetworkedScriptEntityStates ?? undefined}
                    onCheckedChange={cfg.enableNetworkedScriptEntityStates.state.set}
                    disabled={pageCtx.isReadOnly}
                />
                <SettingItemDesc>
                    Allow users to route SCRIPT_ENTITY_STATE_CHANGE_EVENT through the server. <br />
                    <strong>Default:</strong> Enabled. <strong>Warning:</strong> Can be used by malicious actors.
                </SettingItemDesc>
            </SettingItem>
            <SettingItem label="Experimental State Bags Handler" showIf={showAdvanced}>
                <SwitchText
                    id={cfg.experimentalStateBagsHandler.eid}
                    checkedLabel="Enabled"
                    uncheckedLabel="Disabled"
                    checked={states.experimentalStateBagsHandler ?? undefined}
                    onCheckedChange={cfg.experimentalStateBagsHandler.state.set}
                    disabled={pageCtx.isReadOnly}
                />
                <SettingItemDesc>
                    Uses the new serialization API to improve the speed of packing/unpacking state bag changes. <br />
                    <strong>Default:</strong> Enabled.
                </SettingItemDesc>
            </SettingItem>
            <SettingItem label="Experimental OneSync Population" showIf={showAdvanced}>
                <SwitchText
                    id={cfg.experimentalOnesyncPopulation.eid}
                    checkedLabel="Enabled"
                    uncheckedLabel="Disabled"
                    checked={states.experimentalOnesyncPopulation ?? undefined}
                    onCheckedChange={cfg.experimentalOnesyncPopulation.state.set}
                    disabled={pageCtx.isReadOnly}
                />
                <SettingItemDesc>
                    Fixes an oversight that incorrectly limited entity IDs to 8192 instead of 65535 when OneSync is on but population is false. <br />
                    <strong>Default:</strong> Enabled. <strong>Note:</strong> Also enables Experimental State Bags Handler.
                </SettingItemDesc>
            </SettingItem>
            <SettingItem label="Experimental Net Game Event Handler" showIf={showAdvanced}>
                <SwitchText
                    id={cfg.experimentalNetGameEventHandler.eid}
                    checkedLabel="Enabled"
                    uncheckedLabel="Disabled"
                    checked={states.experimentalNetGameEventHandler ?? undefined}
                    onCheckedChange={cfg.experimentalNetGameEventHandler.state.set}
                    disabled={pageCtx.isReadOnly}
                />
                <SettingItemDesc>
                    Uses the new serialization API to improve GTA game events, adds entity relevance checks, and improves backwards compatibility. <br />
                    <strong>Default:</strong> Disabled. <strong>Note:</strong> Also enables Experimental State Bags Handler and OneSync Population.
                </SettingItemDesc>
            </SettingItem>

            <SettingItem label="Pool Sizes" showIf={showAdvanced}>
                <PoolSizeBox
                    poolSizes={states.poolSizes}
                    setPoolSizes={cfg.poolSizes.state.set}
                    disabled={pageCtx.isReadOnly}
                />
                <SettingItemDesc>
                    Set the size of specific game pools. Examples: <InlineCode>TxdStore 50000</InlineCode>, <InlineCode>CMoveObject 600</InlineCode>. <br />
                    <strong>Common pools:</strong> TxdStore (50000 max), AnimStore (20480 max), CMoveObject (600 max), FragmentStore (14000 max). <br />
                    Values represent the total pool size and cannot exceed CFX.re maximum limits. This can only be specified at startup and cannot be changed at runtime.
                </SettingItemDesc>
            </SettingItem>
            
            <SettingItem label="Endpoint Privacy" showIf={showAdvanced}>
                <SwitchText
                    id={cfg.endpointPrivacy.eid}
                    checkedLabel="Enabled"
                    uncheckedLabel="Disabled"
                    checked={states.endpointPrivacy ?? undefined}
                    onCheckedChange={cfg.endpointPrivacy.state.set}
                    disabled={pageCtx.isReadOnly}
                />
                <SettingItemDesc>
                    If enabled, hides player IP addresses from public reports output by the server.
                </SettingItemDesc>
            </SettingItem>
            
            <SettingItem label="HTTP File Server Proxy Only" showIf={showAdvanced}>
                <SwitchText
                    id={cfg.httpFileServerProxyOnly.eid}
                    checkedLabel="Enabled"
                    uncheckedLabel="Disabled"
                    checked={states.httpFileServerProxyOnly ?? undefined}
                    onCheckedChange={cfg.httpFileServerProxyOnly.state.set}
                    disabled={pageCtx.isReadOnly}
                />
                <SettingItemDesc>
                    Restricts file server access to only IP addresses within ranges specified by sv_proxyIPRanges. <br />
                    <strong>Default:</strong> Disabled. Useful when using custom proxy servers with fileserver_add.
                </SettingItemDesc>
            </SettingItem>
            
            <SettingItem label="State Bag Strict Mode" showIf={showAdvanced}>
                <SwitchText
                    id={cfg.stateBagStrictMode.eid}
                    checkedLabel="Enabled"
                    uncheckedLabel="Disabled"
                    checked={states.stateBagStrictMode ?? undefined}
                    onCheckedChange={cfg.stateBagStrictMode.state.set}
                    disabled={pageCtx.isReadOnly}
                />
                <SettingItemDesc>
                    Enable strict mode for state bag operations. <br />
                    <strong>Default:</strong> Disabled.
                </SettingItemDesc>
            </SettingItem>
            
            <SettingItem label="Protect Server Entities" showIf={showAdvanced}>
                <SwitchText
                    id={cfg.protectServerEntities.eid}
                    checkedLabel="Enabled"
                    uncheckedLabel="Disabled"
                    checked={states.protectServerEntities ?? undefined}
                    onCheckedChange={cfg.protectServerEntities.state.set}
                    disabled={pageCtx.isReadOnly}
                />
                <SettingItemDesc>
                    Protect server-created entities from client deletion. <br />
                    <strong>Default:</strong> Disabled.
                </SettingItemDesc>
            </SettingItem>
            
            <SettingItem label="Steam Web API Key" htmlFor={cfg.steamWebApiKey.eid} showIf={showAdvanced}>
                <Input
                    id={cfg.steamWebApiKey.eid}
                    type="password"
                    defaultValue={cfg.steamWebApiKey.initialValue || ''}
                    placeholder="Steam Web API key"
                    onInput={updatePageState}
                    disabled={pageCtx.isReadOnly}
                />
                <SettingItemDesc>
                    Steam Web API key for player verification. <br />
                    <strong className="text-warning-inline">⚠️ KEEP SECURE:</strong> This key should be kept confidential.
                </SettingItemDesc>
            </SettingItem>
            
            <SettingItem label="Steam Web API Domain" htmlFor={cfg.steamWebApiDomain.eid} showIf={showAdvanced}>
                <Input
                    id={cfg.steamWebApiDomain.eid}
                    defaultValue={cfg.steamWebApiDomain.initialValue || ''}
                    placeholder="api.steampowered.com"
                    onInput={updatePageState}
                    disabled={pageCtx.isReadOnly}
                />
                <SettingItemDesc>
                    Steam API domain for requests. Change this for proxy or firewall configurations. <br />
                    <strong>Default:</strong> api.steampowered.com
                </SettingItemDesc>
            </SettingItem>
            
            <SettingItem label="Tebex Secret" htmlFor={cfg.tebexSecret.eid} showIf={showAdvanced}>
                <Input
                    id={cfg.tebexSecret.eid}
                    type="password"
                    defaultValue={cfg.tebexSecret.initialValue || ''}
                    placeholder="Tebex store integration secret"
                    onInput={updatePageState}
                    disabled={pageCtx.isReadOnly}
                />
                <SettingItemDesc>
                    Tebex store integration secret key. <br />
                    <strong className="text-warning-inline">⚠️ KEEP SECURE:</strong> This key should be kept confidential.
                </SettingItemDesc>
            </SettingItem>
            
            <SettingItem label="Players Token" htmlFor={cfg.playersToken.eid} showIf={showAdvanced}>
                <Input
                    id={cfg.playersToken.eid}
                    type="password"
                    defaultValue={cfg.playersToken.initialValue || ''}
                    placeholder="Authentication token for player endpoint"
                    onInput={updatePageState}
                    disabled={pageCtx.isReadOnly}
                />
                <SettingItemDesc>
                    Authentication token for player endpoint access. <br />
                    <strong className="text-warning-inline">⚠️ KEEP SECURE:</strong> This token should be kept confidential.
                </SettingItemDesc>
            </SettingItem>
            
            <SettingItem label="Profile Data Token" htmlFor={cfg.profileDataToken.eid} showIf={showAdvanced}>
                <Input
                    id={cfg.profileDataToken.eid}
                    type="password"
                    defaultValue={cfg.profileDataToken.initialValue || ''}
                    placeholder="Authentication token for profile data"
                    onInput={updatePageState}
                    disabled={pageCtx.isReadOnly}
                />
                <SettingItemDesc>
                    Authentication token for profile data access. <br />
                    <strong className="text-warning-inline">⚠️ KEEP SECURE:</strong> This token should be kept confidential.
                </SettingItemDesc>
            </SettingItem>
            
            <SettingItem label="Listing IP Override" htmlFor={cfg.listingIpOverride.eid} showIf={showAdvanced}>
                <Input
                    id={cfg.listingIpOverride.eid}
                    defaultValue={cfg.listingIpOverride.initialValue || ''}
                    placeholder="192.168.1.100"
                    onInput={updatePageState}
                    disabled={pageCtx.isReadOnly}
                />
                <SettingItemDesc>
                    Override IP address used in server listing. Leave empty to use auto-detected IP.
                </SettingItemDesc>
            </SettingItem>
            
            <SettingItem label="Listing Host Override" htmlFor={cfg.listingHostOverride.eid} showIf={showAdvanced}>
                <Input
                    id={cfg.listingHostOverride.eid}
                    defaultValue={cfg.listingHostOverride.initialValue || ''}
                    placeholder="my-server.example.com"
                    onInput={updatePageState}
                    disabled={pageCtx.isReadOnly}
                />
                <SettingItemDesc>
                    Override hostname used in server listing. Leave empty to use auto-detected hostname.
                </SettingItemDesc>
            </SettingItem>
            
            <SettingItem label="Endpoints" htmlFor={cfg.endpoints.eid} showIf={showAdvanced}>
                <Input
                    id={cfg.endpoints.eid}
                    defaultValue={cfg.endpoints.initialValue || ''}
                    placeholder="Custom endpoint configuration"
                    onInput={updatePageState}
                    disabled={pageCtx.isReadOnly}
                />
                <SettingItemDesc>
                    Custom endpoint configuration for advanced networking setups.
                </SettingItemDesc>
            </SettingItem>
            
            <SettingItem label="OneSync Log File" htmlFor={cfg.onesyncLogFile.eid} showIf={showAdvanced}>
                <Input
                    id={cfg.onesyncLogFile.eid}
                    defaultValue={cfg.onesyncLogFile.initialValue || ''}
                    placeholder="/path/to/onesync.log"
                    onInput={updatePageState}
                    disabled={pageCtx.isReadOnly}
                />
                <SettingItemDesc>
                    Path to OneSync debug log file. Leave empty to disable OneSync logging.
                </SettingItemDesc>
            </SettingItem>
            
            <SettingItem label="OneSync Automatic Resend" showIf={showAdvanced}>
                <SwitchText
                    id={cfg.onesyncAutomaticResend.eid}
                    checkedLabel="Enabled"
                    uncheckedLabel="Disabled"
                    checked={states.onesyncAutomaticResend ?? undefined}
                    onCheckedChange={cfg.onesyncAutomaticResend.state.set}
                    disabled={pageCtx.isReadOnly}
                />
                <SettingItemDesc>
                    Automatically resend failed OneSync packets. <br />
                    <strong>Default:</strong> Disabled.
                </SettingItemDesc>
            </SettingItem>
            
            <SettingItem label="Use Accurate Sends" showIf={showAdvanced}>
                <SwitchText
                    id={cfg.useAccurateSends.eid}
                    checkedLabel="Enabled"
                    uncheckedLabel="Disabled"
                    checked={states.useAccurateSends ?? undefined}
                    onCheckedChange={cfg.useAccurateSends.state.set}
                    disabled={pageCtx.isReadOnly}
                />
                <SettingItemDesc>
                    Use more accurate network packet sending methods. <br />
                    <strong>Default:</strong> Enabled.
                </SettingItemDesc>
            </SettingItem>
        </SettingsCardShell>
    )
}
