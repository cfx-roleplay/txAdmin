import { z } from "zod";
import { typeDefinedConfig, typeNullableConfig } from "./utils";
import { SYM_FIXER_DEFAULT } from "@lib/symbols";
import { isValidPoolName, getPoolMaxLimit } from "@core/lib/poolSizeLimits";
import { isValidFiveMBuild } from "@core/lib/gameBuilds";

const enforceGameBuild = typeNullableConfig({
    name: 'Enforce Game Build',
    default: null,
    validator: z.string().min(1).refine(async (build) => {
        return await isValidFiveMBuild(build);
    }, {
        message: "Invalid game build. Build must exist in FiveM supported builds.",
    }).nullable(),
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

// Game builds are now fetched dynamically from CFX.re repository 