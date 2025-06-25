import fsp from 'node:fs/promises';
import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { Readable, Writable } from "node:stream";
import { txEnv, txHostConfig } from "@core/globalData";
import { redactStartupSecrets } from "@lib/misc";
import path from "path";


/**
 * Blackhole event logger
 */
let lastBlackHoleSpewTime = 0;
const blackHoleSpillMaxInterval = 5000;
export const childProcessEventBlackHole = (...args: any[]) => {
    const currentTime = Date.now();
    if (currentTime - lastBlackHoleSpewTime > blackHoleSpillMaxInterval) {
        //Let's call this "hawking radiation"
        console.verbose.error('ChildProcess unexpected event:');
        console.verbose.dir(args);
        lastBlackHoleSpewTime = currentTime;
    }
};


/**
 * Returns a tuple with the convar name and value, formatted for the server command line
 */
export const getMutableConvars = (isCmdLine = false) => {
    const checkPlayerJoin = txConfig.banlist.enabled || txConfig.whitelist.mode !== 'disabled';
    const convars: RawConvarSetTuple[] = [
        ['setr', 'locale', txConfig.general.language ?? 'en'],
        ['set', 'serverName', txConfig.general.serverName ?? 'txAdmin'],
        ['set', 'checkPlayerJoin', checkPlayerJoin],
        ['set', 'menuAlignRight', txConfig.gameFeatures.menuAlignRight],
        ['set', 'menuPageKey', txConfig.gameFeatures.menuPageKey],
        ['set', 'playerModePtfx', txConfig.gameFeatures.playerModePtfx],
        ['set', 'hideAdminInPunishments', txConfig.gameFeatures.hideAdminInPunishments],
        ['set', 'hideAdminInMessages', txConfig.gameFeatures.hideAdminInMessages],
        ['set', 'hideDefaultAnnouncement', txConfig.gameFeatures.hideDefaultAnnouncement],
        ['set', 'hideDefaultDirectMessage', txConfig.gameFeatures.hideDefaultDirectMessage],
        ['set', 'hideDefaultWarning', txConfig.gameFeatures.hideDefaultWarning],
        ['set', 'hideDefaultScheduledRestartWarning', txConfig.gameFeatures.hideDefaultScheduledRestartWarning],

        // //NOTE: no auto update, maybe we shouldn't tie core and server verbosity anyways
        // ['setr', 'verbose', console.isVerbose],
    ];
    
    if (txConfig.fxserver.enforceGameBuild !== null) {
        convars.push(['set', 'sv_enforceGameBuild', txConfig.fxserver.enforceGameBuild]);
    }
    if (txConfig.fxserver.replaceExeToSwitchBuilds !== null) {
        convars.push(['set', 'sv_replaceExeToSwitchBuilds', txConfig.fxserver.replaceExeToSwitchBuilds]);
    }
    if (txConfig.fxserver.pureLevel !== null) {
        convars.push(['set', 'sv_pureLevel', txConfig.fxserver.pureLevel]);
    }
    if (txConfig.fxserver.enableNetworkedSounds !== null) {
        convars.push(['set', 'sv_enableNetworkedSounds', txConfig.fxserver.enableNetworkedSounds]);
    }
    if (txConfig.fxserver.enableNetworkedPhoneExplosions !== null) {
        convars.push(['set', 'sv_enableNetworkedPhoneExplosions', txConfig.fxserver.enableNetworkedPhoneExplosions]);
    }
    if (txConfig.fxserver.enableNetworkedScriptEntityStates !== null) {
        convars.push(['set', 'sv_enableNetworkedScriptEntityStates', txConfig.fxserver.enableNetworkedScriptEntityStates]);
    }
    if (txConfig.fxserver.experimentalStateBagsHandler !== null) {
        convars.push(['set', 'sv_experimentalStateBagsHandler', txConfig.fxserver.experimentalStateBagsHandler]);
    }
    if (txConfig.fxserver.experimentalOnesyncPopulation !== null) {
        convars.push(['set', 'sv_experimentalOnesyncPopulation', txConfig.fxserver.experimentalOnesyncPopulation]);
    }
    if (txConfig.fxserver.experimentalNetGameEventHandler !== null) {
        convars.push(['set', 'sv_experimentalNetGameEventHandler', txConfig.fxserver.experimentalNetGameEventHandler]);
    }

    for (const poolConfig of txConfig.fxserver.poolSizes) {
        convars.push(['set', 'increase_pool_size', `"${poolConfig.poolName}" ${poolConfig.increase}`]);
    }

    if (txConfig.fxserver.endpointPrivacy !== null) {
        convars.push(['set', 'sv_endpointPrivacy', txConfig.fxserver.endpointPrivacy]);
    }
    if (txConfig.fxserver.httpFileServerProxyOnly !== null) {
        convars.push(['set', 'sv_httpFileServerProxyOnly', txConfig.fxserver.httpFileServerProxyOnly]);
    }
    if (txConfig.fxserver.stateBagStrictMode !== null) {
        convars.push(['set', 'sv_stateBagStrictMode', txConfig.fxserver.stateBagStrictMode]);
    }
    if (txConfig.fxserver.protectServerEntities !== null) {
        convars.push(['set', 'sv_protectServerEntities', txConfig.fxserver.protectServerEntities]);
    }

    if (txConfig.fxserver.steamWebApiKey !== null) {
        convars.push(['set', 'steam_webApiKey', txConfig.fxserver.steamWebApiKey]);
    }
    if (txConfig.fxserver.steamWebApiDomain !== null) {
        convars.push(['set', 'steam_webApiDomain', txConfig.fxserver.steamWebApiDomain]);
    }

    if (txConfig.fxserver.tebexSecret !== null) {
        convars.push(['set', 'sv_tebexSecret', txConfig.fxserver.tebexSecret]);
    }

    if (txConfig.fxserver.playersToken !== null) {
        convars.push(['set', 'sv_playersToken', txConfig.fxserver.playersToken]);
    }
    if (txConfig.fxserver.profileDataToken !== null) {
        convars.push(['set', 'sv_profileDataToken', txConfig.fxserver.profileDataToken]);
    }

    if (txConfig.fxserver.listingIpOverride !== null) {
        convars.push(['set', 'sv_listingIpOverride', txConfig.fxserver.listingIpOverride]);
    }
    if (txConfig.fxserver.listingHostOverride !== null) {
        convars.push(['set', 'sv_listingHostOverride', txConfig.fxserver.listingHostOverride]);
    }

    if (txConfig.fxserver.endpoints !== null) {
        convars.push(['set', 'sv_endpoints', txConfig.fxserver.endpoints]);
    }
    if (txConfig.fxserver.onesyncLogFile !== null) {
        convars.push(['set', 'onesync_logFile', txConfig.fxserver.onesyncLogFile]);
    }

    if (txConfig.fxserver.onesyncAutomaticResend !== null) {
        convars.push(['set', 'onesync_automaticResend', txConfig.fxserver.onesyncAutomaticResend]);
    }
    if (txConfig.fxserver.useAccurateSends !== null) {
        convars.push(['set', 'sv_useAccurateSends', txConfig.fxserver.useAccurateSends]);
    }

    for (const eventHash of txConfig.fxserver.blockedNetGameEvents) {
        convars.push(['set', 'block_net_game_event', eventHash]);
    }

    return convars.map((c) => polishConvarSetTuple(c, isCmdLine));
};

type RawConvarSetTuple = [setter: string, name: string, value: any];
type ConvarSetTuple = [setter: string, name: string, value: string];

// Native FiveM convars that should not have the txAdmin prefix
const NATIVE_CONVARS = new Set([
    // Server convars
    'sv_enforceGameBuild',
    'sv_replaceExeToSwitchBuilds', 
    'sv_pureLevel',
    'sv_enableNetworkedSounds',
    'sv_enableNetworkedPhoneExplosions',
    'sv_enableNetworkedScriptEntityStates',
    'sv_experimentalStateBagsHandler',
    'sv_experimentalOnesyncPopulation',
    'sv_experimentalNetGameEventHandler',
    'sv_endpointPrivacy',
    'sv_httpFileServerProxyOnly',
    'sv_stateBagStrictMode',
    'sv_protectServerEntities',
    'sv_tebexSecret',
    'sv_playersToken',
    'sv_profileDataToken',
    'sv_listingIpOverride',
    'sv_listingHostOverride',
    'sv_endpoints',
    'sv_useAccurateSends',
    
    // Steam convars
    'steam_webApiKey',
    'steam_webApiDomain',
    
    // OneSync convars
    'onesync_logFile',
    'onesync_automaticResend',
    
    // Pool size convar
    'increase_pool_size',
    
    // Net game event blocking (the main fix)
    'block_net_game_event',
    
    // Locale convar
    'locale',
]);

const polishConvarSetTuple = ([setter, name, value]: RawConvarSetTuple, isCmdLine = false): ConvarSetTuple => {
    const convarName = NATIVE_CONVARS.has(name) ? name : 'txAdmin-' + name;
    
    return [
        isCmdLine ? `+${setter}` : setter,
        convarName,
        value.toString(),
    ];
}

export const mutableConvarConfigDependencies = [
    'general.*',
    'gameFeatures.*',
    'banlist.enabled',
    'whitelist.mode',
    'fxserver.*',
];


/**
 * Pre calculating HOST dependent spawn variables
 */
const txCoreEndpoint = txHostConfig.netInterface
    ? `${txHostConfig.netInterface}:${txHostConfig.txaPort}`
    : `127.0.0.1:${txHostConfig.txaPort}`;
let osSpawnVars: OsSpawnVars;
if (txEnv.isWindows) {
    osSpawnVars = {
        bin: `${txEnv.fxsPath}/FXServer.exe`,
        args: [],
    };
} else {
    const alpinePath = path.resolve(txEnv.fxsPath, '../../');
    osSpawnVars = {
        bin: `${alpinePath}/opt/cfx-server/ld-musl-x86_64.so.1`,
        args: [
            '--library-path', `${alpinePath}/usr/lib/v8/:${alpinePath}/lib/:${alpinePath}/usr/lib/`,
            '--',
            `${alpinePath}/opt/cfx-server/FXServer`,
            '+set', 'citizen_dir', `${alpinePath}/opt/cfx-server/citizen/`,
        ],
    };
}

type OsSpawnVars = {
    bin: string;
    args: string[];
}


/**
 * Returns the variables needed to spawn the server
 */
export const getFxSpawnVariables = (): FxSpawnVariables => {
    if (!txConfig.server.dataPath) throw new Error('Missing server data path');

    const cmdArgs = [
        ...osSpawnVars.args,
        getMutableConvars(true), //those are the ones that can change without restart
        txConfig.server.startupArgs,
        '+set', 'onesync', txConfig.server.onesync,
        '+sets', 'txAdmin-version', txEnv.txaVersion,
        '+setr', 'txAdmin-menuEnabled', txConfig.gameFeatures.menuEnabled,
        '+set', 'txAdmin-luaComHost', txCoreEndpoint,
        '+set', 'txAdmin-luaComToken', txCore.webServer.luaComToken,
        '+set', 'txAdminServerMode', 'true', //Can't change this one due to fxserver code compatibility
        '+exec', txConfig.server.cfgPath,
    ].flat(2).map(String);

    return {
        bin: osSpawnVars.bin,
        args: cmdArgs,
        serverName: txConfig.general.serverName,
        dataPath: txConfig.server.dataPath,
        cfgPath: txConfig.server.cfgPath,
    }
}

type FxSpawnVariables = OsSpawnVars & {
    dataPath: string;
    cfgPath: string;
    serverName: string;
}


/**
 * Print debug information about the spawn variables
 */
export const debugPrintSpawnVars = (fxSpawnVars: FxSpawnVariables) => {
    if (!console.verbose) return; //can't console.verbose.table

    console.debug('Spawn Bin:', fxSpawnVars.bin);
    const args = redactStartupSecrets(fxSpawnVars.args)
    console.debug('Spawn Args:');
    const argsTable = [];
    let currArgs: string[] | undefined;
    for (const arg of args) {
        if (arg.startsWith('+')) {
            if (currArgs) argsTable.push(currArgs);
            currArgs = [arg];
        } else {
            if (!currArgs) currArgs = [];
            currArgs.push(arg);
        }
    }
    if (currArgs) argsTable.push(currArgs);
    console.table(argsTable);
}


/**
 * Type guard for a valid child process
 */
export const isValidChildProcess = (p: any): p is ValidChildProcess => {
    if (!p) return false;
    if (typeof p.pid !== 'number') return false;
    if (!Array.isArray(p.stdio)) return false;
    if (p.stdio.length < 4) return false;
    if (!(p.stdio[3] instanceof Readable)) return false;
    return true;
};
export type ValidChildProcess = ChildProcessWithoutNullStreams & {
    pid: number;
    readonly stdio: [
        Writable,
        Readable,
        Readable,
        Readable,
        Readable | Writable | null | undefined, // extra
    ];
};


/**
 * Sanitizes an argument for console input.
 */
export const sanitizeConsoleArgString = (arg: string) => {
    if (typeof arg !== 'string') throw new Error('unexpected type');
    return arg.replaceAll(/(?<!\\)"/g, '\"')
        .replaceAll(/;/g, '\u037e')
        .replaceAll(/\n/g, ' ');
}


/**
 * Stringifies the command arguments for console output.  
 * Arguments are wrapped in double quotes.
 * Double quotes are replaced by unicode equivalent.
 * Objects are JSON.stringified.  
 *   
 * NOTE: We expect the other side to know they have to parse non-string arguments.  
 *   
 * NOTE: Escaping double quotes is working, but escaping semicolon is bugged
 * and doesn't happen when there is an odd number of escaped double quotes in the argument.
 */
export const stringifyConsoleArgs = (args: (string | number | object)[]) => {
    const cleanArgs: string[] = [];
    for (const arg of args) {
        if (typeof arg === 'string') {
            cleanArgs.push(sanitizeConsoleArgString(JSON.stringify(arg)));
        } else if (typeof arg === 'number') {
            cleanArgs.push(sanitizeConsoleArgString(JSON.stringify(arg.toString())));
        } else if (typeof arg === 'object' && arg !== null) {
            const json = JSON.stringify(arg);
            const escaped = json.replaceAll(/"/g, '\\"');
            cleanArgs.push(`"${sanitizeConsoleArgString(escaped)}"`);
        } else {
            throw new Error('arg expected to be string or object');
        }
    }

    return cleanArgs.join(' ');
}


/**
 * Copies the custom locale file from txData to the 'monitor' path, due to sandboxing.
 * FIXME: move to core/lib/fxserver/runtimeFiles.ts
 */
export const setupCustomLocaleFile = async () => {
    if (txConfig.general.language !== 'custom') return;
    const srcPath = txCore.translator.customLocalePath;
    const destRuntimePath = path.resolve(txEnv.txaPath, '.runtime');
    const destFilePath = path.resolve(destRuntimePath, 'locale.json');
    try {
        await fsp.mkdir(destRuntimePath, { recursive: true });
        await fsp.copyFile(srcPath, destFilePath);
    } catch (error) {
        console.tag('FXRunner').error(`Failed to copy custom locale file: ${(error as any).message}`);
    }
}
