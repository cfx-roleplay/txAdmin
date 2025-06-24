import { z } from "zod";
import { typeDefinedConfig, typeNullableConfig } from "./utils";
import { SYM_FIXER_DEFAULT } from "@lib/symbols";
import { isValidPoolName, getPoolMaxLimit } from "@core/lib/poolSizeLimits";

// TODO: find a automatic way to get all builds
const fivemBuilds = [
    '1', '1604', '2060', '2189', '2372', '2545', '2612', '2699', '2802', '2944', '3095', '3258', '3407', '3570',
    'xm18', 'christmas2018', 'mpchristmas2018', 'sum', 'mpsum', 'h4', 'heist4', 'mpheist4', 
    'tuner', 'mptuner', 'security', 'mpsecurity', 'mpg9ec', 'mpsum2', 'mpchristmas3', 
    'mp2023_01', 'mp2023_02', 'mp2024_01', 'mp2024_02', 'mp2025_01'
] as const;

// We don't really care for RedM
const redmBuilds = ['1311', '1355', '1436', '1491'] as const;

const enforceGameBuild = typeNullableConfig({
    name: 'Enforce Game Build',
    default: null,
    validator: z.string().nullable(),
    fixer: SYM_FIXER_DEFAULT,
});

const replaceExeToSwitchBuilds = typeNullableConfig({
    name: 'Replace Exe To Switch Builds',
    default: null,
    validator: z.boolean().nullable(),
    fixer: SYM_FIXER_DEFAULT,
});

const pureLevel = typeNullableConfig({
    name: 'Pure Level',
    default: null,
    validator: z.union([z.literal(1), z.literal(2)]).nullable(),
    fixer: SYM_FIXER_DEFAULT,
});

const enableNetworkedSounds = typeNullableConfig({
    name: 'Enable Networked Sounds',
    default: null,
    validator: z.boolean().nullable(),
    fixer: SYM_FIXER_DEFAULT,
});

const enableNetworkedPhoneExplosions = typeNullableConfig({
    name: 'Enable Networked Phone Explosions',
    default: null,
    validator: z.boolean().nullable(),
    fixer: SYM_FIXER_DEFAULT,
});

const enableNetworkedScriptEntityStates = typeNullableConfig({
    name: 'Enable Networked Script Entity States',
    default: null,
    validator: z.boolean().nullable(),
    fixer: SYM_FIXER_DEFAULT,
});

const experimentalStateBagsHandler = typeNullableConfig({
    name: 'Experimental State Bags Handler',
    default: null,
    validator: z.boolean().nullable(),
    fixer: SYM_FIXER_DEFAULT,
});

const experimentalOnesyncPopulation = typeNullableConfig({
    name: 'Experimental OneSync Population',
    default: null,
    validator: z.boolean().nullable(),
    fixer: SYM_FIXER_DEFAULT,
});

const experimentalNetGameEventHandler = typeNullableConfig({
    name: 'Experimental Net Game Event Handler',
    default: null,
    validator: z.boolean().nullable(),
    fixer: SYM_FIXER_DEFAULT,
});

const PoolSizeConfigSchema = z.object({
    poolName: z.string().min(1).refine(async (poolName) => {
        return await isValidPoolName(poolName);
    }, {
        message: "Invalid pool name. Pool must exist in FiveM's pool size limits.",
    }),
    increase: z.number().int().positive(), // Note: "increase" but now represents total pool size
}).refine(async (data) => {
    const maxLimit = await getPoolMaxLimit(data.poolName);
    if (maxLimit === null) return true; // Pool doesn't exist, will be caught by poolName validation
    
    return data.increase <= maxLimit;
}, {
    message: "The pool size exceeds the maximum allowed limit from CFX.re.",
    path: ['increase'], // Point the error to the increase field
});

const poolSizes = typeDefinedConfig({
    name: 'Pool Sizes',
    default: [],
    validator: PoolSizeConfigSchema.array(),
    fixer: SYM_FIXER_DEFAULT,
});

const endpointPrivacy = typeNullableConfig({
    name: 'Endpoint Privacy',
    default: null,
    validator: z.boolean().nullable(),
    fixer: SYM_FIXER_DEFAULT,
});

const httpFileServerProxyOnly = typeNullableConfig({
    name: 'HTTP File Server Proxy Only',
    default: null,
    validator: z.boolean().nullable(),
    fixer: SYM_FIXER_DEFAULT,
});

const stateBagStrictMode = typeNullableConfig({
    name: 'State Bag Strict Mode',
    default: null,
    validator: z.boolean().nullable(),
    fixer: SYM_FIXER_DEFAULT,
});

const protectServerEntities = typeNullableConfig({
    name: 'Protect Server Entities',
    default: null,
    validator: z.boolean().nullable(),
    fixer: SYM_FIXER_DEFAULT,
});

const steamWebApiKey = typeNullableConfig({
    name: 'Steam Web API Key',
    default: null,
    validator: z.string().min(1).nullable(),
    fixer: SYM_FIXER_DEFAULT,
});

const steamWebApiDomain = typeNullableConfig({
    name: 'Steam Web API Domain',
    default: null,
    validator: z.string().min(1).nullable(),
    fixer: SYM_FIXER_DEFAULT,
});

const tebexSecret = typeNullableConfig({
    name: 'Tebex Secret',
    default: null,
    validator: z.string().min(1).nullable(),
    fixer: SYM_FIXER_DEFAULT,
});

const playersToken = typeNullableConfig({
    name: 'Players Token',
    default: null,
    validator: z.string().min(1).nullable(),
    fixer: SYM_FIXER_DEFAULT,
});

const profileDataToken = typeNullableConfig({
    name: 'Profile Data Token',
    default: null,
    validator: z.string().min(1).nullable(),
    fixer: SYM_FIXER_DEFAULT,
});

const listingIpOverride = typeNullableConfig({
    name: 'Listing IP Override',
    default: null,
    validator: z.string().min(1).nullable(),
    fixer: SYM_FIXER_DEFAULT,
});

const listingHostOverride = typeNullableConfig({
    name: 'Listing Host Override',
    default: null,
    validator: z.string().min(1).nullable(),
    fixer: SYM_FIXER_DEFAULT,
});

const endpoints = typeNullableConfig({
    name: 'Endpoints',
    default: null,
    validator: z.string().nullable(),
    fixer: SYM_FIXER_DEFAULT,
});

const onesyncLogFile = typeNullableConfig({
    name: 'OneSync Log File',
    default: null,
    validator: z.string().min(1).nullable(),
    fixer: SYM_FIXER_DEFAULT,
});

const onesyncAutomaticResend = typeNullableConfig({
    name: 'OneSync Automatic Resend',
    default: null,
    validator: z.boolean().nullable(),
    fixer: SYM_FIXER_DEFAULT,
});

const useAccurateSends = typeNullableConfig({
    name: 'Use Accurate Sends',
    default: null,
    validator: z.boolean().nullable(),
    fixer: SYM_FIXER_DEFAULT,
});

export default {
    enforceGameBuild,
    replaceExeToSwitchBuilds,
    pureLevel,
    enableNetworkedSounds,
    enableNetworkedPhoneExplosions,
    enableNetworkedScriptEntityStates,
    experimentalStateBagsHandler,
    experimentalOnesyncPopulation,
    experimentalNetGameEventHandler,
    poolSizes,
    endpointPrivacy,
    httpFileServerProxyOnly,
    stateBagStrictMode,
    protectServerEntities,
    steamWebApiKey,
    steamWebApiDomain,
    tebexSecret,
    playersToken,
    profileDataToken,
    listingIpOverride,
    listingHostOverride,
    endpoints,
    onesyncLogFile,
    onesyncAutomaticResend,
    useAccurateSends,
} as const;

export { fivemBuilds, redmBuilds }; 