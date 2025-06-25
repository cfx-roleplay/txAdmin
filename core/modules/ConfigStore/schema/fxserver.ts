import { z } from "zod";
import { typeDefinedConfig, typeNullableConfig } from "./utils";
import { SYM_FIXER_DEFAULT } from "@lib/symbols";
import { isValidPoolName, getPoolMaxLimit } from "@core/lib/poolSizeLimits";
import { isValidFiveMBuild } from "@core/lib/gameBuilds";

const enforceGameBuild = typeNullableConfig({
    name: 'Enforce Game Build',
    default: null,
    validator: z.string().min(1).refine((build) => {
        // Handle numeric builds - check if it's a valid positive integer string
        const trimmedBuild = build.trim();
        if (/^\d+$/.test(trimmedBuild)) {
            const buildNumber = parseInt(trimmedBuild, 10);
            return buildNumber > 0 && buildNumber <= 50000;
        }
        
        return false;
    }, {
        message: "Invalid game build. Build must be a positive number (e.g., 1, 2545, 3570).",
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
    poolName: z.string().min(1),
    increase: z.number().int().positive(), // Note: "increase" but now represents total pool size
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

export const NET_GAME_EVENTS = {
    SCRIPT_ARRAY_DATA_VERIFY_EVENT: 1730958349,
    REQUEST_CONTROL_EVENT: 1820250855,
    GIVE_CONTROL_EVENT: 687566035,
    WEAPON_DAMAGE_EVENT: 2748207869,
    REQUEST_PICKUP_EVENT: 3782416237,
    REQUEST_MAP_PICKUP_EVENT: 3928219380,
    CLOCK_EVENT: 3079108984,
    WEATHER_EVENT: 3148411772,
    RESPAWN_PLAYER_PED_EVENT: 3172160967,
    GIVE_WEAPON_EVENT: 4104187801,
    REMOVE_WEAPON_EVENT: 4179709316,
    REMOVE_ALL_WEAPONS_EVENT: 2520815120,
    VEHICLE_COMPONENT_CONTROL_EVENT: 717602669,
    FIRE_EVENT: 3948523338,
    EXPLOSION_EVENT: 4198153742,
    START_PROJECTILE_EVENT: 3267150665,
    UPDATE_PROJECTILE_TARGET_EVENT: 2507583651,
    REMOVE_PROJECTILE_ENTITY_EVENT: 3283140059,
    BREAK_PROJECTILE_TARGET_LOCK_EVENT: 1713145201,
    ALTER_WANTED_LEVEL_EVENT: 2633540100,
    CHANGE_RADIO_STATION_EVENT: 3576015615,
    RAGDOLL_REQUEST_EVENT: 935852904,
    PLAYER_TAUNT_EVENT: 1537535389,
    PLAYER_CARD_STAT_EVENT: 2798439786,
    DOOR_BREAK_EVENT: 2553465338,
    SCRIPTED_GAME_EVENT: 3454306802,
    REMOTE_SCRIPT_INFO_EVENT: 85329215,
    REMOTE_SCRIPT_LEAVE_EVENT: 1654373130,
    MARK_AS_NO_LONGER_NEEDED_EVENT: 3054950343,
    CONVERT_TO_SCRIPT_ENTITY_EVENT: 1241890355,
    SCRIPT_WORLD_STATE_EVENT: 3221982901,
    CLEAR_AREA_EVENT: 4062296815,
    CLEAR_RECTANGLE_AREA_EVENT: 2197156095,
    NETWORK_REQUEST_SYNCED_SCENE_EVENT: 2142044892,
    NETWORK_START_SYNCED_SCENE_EVENT: 1604652605,
    NETWORK_STOP_SYNCED_SCENE_EVENT: 1063659153,
    NETWORK_UPDATE_SYNCED_SCENE_EVENT: 2215091827,
    INCIDENT_ENTITY_EVENT: 4021719864,
    NETWORK_GIVE_PED_SCRIPTED_TASK_EVENT: 3973203441,
    NETWORK_GIVE_PED_SEQUENCE_TASK_EVENT: 1012266942,
    NETWORK_CLEAR_PED_TASKS_EVENT: 415781040,
    NETWORK_START_PED_ARREST_EVENT: 552023685,
    NETWORK_START_PED_UNCUFF_EVENT: 831708973,
    NETWORK_CAR_HORN_EVENT: 1147093925,
    NETWORK_ENTITY_AREA_STATUS_EVENT: 1495383267,
    NETWORK_GARAGE_OCCUPIED_STATUS_EVENT: 1345841801,
    PED_CONVERSATION_LINE_EVENT: 1903032648,
    SCRIPT_ENTITY_STATE_CHANGE_EVENT: 1545835842,
    NETWORK_PLAY_SOUND_EVENT: 4040062190,
    NETWORK_STOP_SOUND_EVENT: 3431447592,
    NETWORK_PLAY_AIRDEFENSE_FIRE_EVENT: 2639765290,
    NETWORK_BANK_REQUEST_EVENT: 1530228680,
    NETWORK_AUDIO_BARK_EVENT: 2249486071,
    REQUEST_DOOR_EVENT: 970650185,
    NETWORK_TRAIN_REPORT_EVENT: 1962569870,
    NETWORK_TRAIN_REQUEST_EVENT: 1007350692,
    NETWORK_INCREMENT_STAT_EVENT: 3602478279,
    MODIFY_VEHICLE_LOCK_WORD_STATE_DATA: 2432787716,
    MODIFY_PTFX_WORD_STATE_DATA_SCRIPTED_EVOLVE_EVENT: 2896239538,
    NETWORK_REQUEST_PHONE_EXPLOSION_EVENT: 2265396733,
    NETWORK_REQUEST_DETACHMENT_EVENT: 118953737,
    NETWORK_KICK_VOTES_EVENT: 3769612997,
    NETWORK_GIVE_PICKUP_REWARDS_EVENT: 3002107268,
    NETWORK_CRC_HASH_CHECK_EVENT: 2747488440,
    BLOW_UP_VEHICLE_EVENT: 3963643731,
    NETWORK_SPECIAL_FIRE_EQUIPPED_WEAPON: 2654380799,
    NETWORK_RESPONDED_TO_THREAT_EVENT: 2889296252,
    NETWORK_SHOUT_TARGET_POSITION_EVENT: 125548511,
    VOICE_DRIVEN_MOUTH_MOVEMENT_FINISHED_EVENT: 805012862,
    PICKUP_DESTROYED_EVENT: 977838733,
    UPDATE_PLAYER_SCARS_EVENT: 1077309409,
    NETWORK_CHECK_EXE_SIZE_EVENT: 1416963374,
    NETWORK_PTFX_EVENT: 2882561097,
    NETWORK_PED_SEEN_DEAD_PED_EVENT: 176966066,
    REMOVE_STICKY_BOMB_EVENT: 3240652126,
    NETWORK_CHECK_CODE_CRCS_EVENT: 2461070298,
    INFORM_SILENCED_GUNSHOT_EVENT: 2047067558,
    PED_PLAY_PAIN_EVENT: 1766803851,
    CACHE_PLAYER_HEAD_BLEND_DATA_EVENT: 3636351542,
    REMOVE_PED_FROM_PEDGROUP_EVENT: 712414675,
    REPORT_MYSELF_EVENT: 2665966883,
    REPORT_CASH_SPAWN_EVENT: 1584425050,
    ACTIVATE_VEHICLE_SPECIAL_ABILITY_EVENT: 1337403024,
    BLOCK_WEAPON_SELECTION: 1992295566,
} as const;

// Get all valid event hashes
const validEventHashes = Object.values(NET_GAME_EVENTS);

const blockedNetGameEvents = typeDefinedConfig({
    name: 'Blocked Net Game Events',
    default: [],
    validator: z.array(z.number().int().positive().refine((hash) => {
        return validEventHashes.includes(hash as any);
    }, {
        message: "Invalid net game event hash. Hash must be from the known events list.",
    })),
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
    blockedNetGameEvents,
} as const;

// Game builds are now fetched dynamically from CFX.re repository 