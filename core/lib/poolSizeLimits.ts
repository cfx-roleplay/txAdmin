import https from 'https';

export type PoolSizeLimits = Record<string, number>;

let cachedPoolLimits: PoolSizeLimits | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 1000 * 60 * 60 * 24; // 24 hours

function fetchPoolLimitsFromAPI(): Promise<PoolSizeLimits> {
    return new Promise((resolve, reject) => {
        const url = 'https://content.cfx.re/mirrors/client/pool-size-limits/fivem.json';
        
        const request = https.get(url, { timeout: 10000 }, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
                return;
            }

            let data = '';
            response.on('data', (chunk) => {
                data += chunk;
            });

            response.on('end', () => {
                try {
                    const limits: PoolSizeLimits = JSON.parse(data);
                    resolve(limits);
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    reject(new Error(`Failed to parse JSON: ${errorMessage}`));
                }
            });
        });

        request.on('error', (error) => {
            reject(error);
        });

        request.on('timeout', () => {
            request.destroy();
            reject(new Error('Request timeout'));
        });
    });
}

export async function fetchPoolSizeLimits(): Promise<PoolSizeLimits> {
    const now = Date.now();
    
    if (cachedPoolLimits && (now - lastFetchTime) < CACHE_DURATION) {
        return cachedPoolLimits;
    }

    try {
        const limits = await fetchPoolLimitsFromAPI();
        
        if (typeof limits !== 'object' || limits === null) {
            throw new Error('Invalid response format');
        }

        for (const [poolName, limit] of Object.entries(limits)) {
            if (typeof limit !== 'number' || limit < 0) {
                throw new Error(`Invalid limit for pool ${poolName}: ${limit}`);
            }
        }

        cachedPoolLimits = limits;
        lastFetchTime = now;
        
        console.log(`[PoolSizeLimits] Fetched ${Object.keys(limits).length} pool limits from CFX.re`);

        return limits;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn(`[PoolSizeLimits] Failed to fetch pool limits: ${errorMessage}`);

        const fallbackLimits: PoolSizeLimits = {
            "CMoveObject": 600,
            "FragmentStore": 14000,
            "LightEntity": 1000,
            "OcclusionInteriorInfo": 20,
            "OcclusionPathNode": 5000,
            "OcclusionPortalEntity": 750,
            "OcclusionPortalInfo": 750,
            "PortalInst": 225,
            "ScaleformStore": 200,
            "StaticBounds": 5000,
            "TxdStore": 50000,
            "InteriorProxy": 450,
            "netGameEvent": 400,
            "Object": 2000,
            "AttachmentExtension": 430,
            "EntityDescPool": 20480,
            "ObjectIntelligence": 512,
            "AnimStore": 20480,
            "Building": 20000,
            "CWeaponComponentInfo": 2048,
            "fragInstGta": 2000,
            "CNetObjDoor": 20,
            "CDoorSyncData": 20
        };

        if (!cachedPoolLimits) {
            cachedPoolLimits = fallbackLimits;
            lastFetchTime = now;
        }

        return cachedPoolLimits;
    }
}

export async function getAvailablePoolNames(): Promise<string[]> {
    const limits = await fetchPoolSizeLimits();
    return Object.keys(limits).sort();
}

export async function getPoolMaxLimit(poolName: string): Promise<number | null> {
    const limits = await fetchPoolSizeLimits();
    return limits[poolName] ?? null;
}

export async function isValidPoolName(poolName: string): Promise<boolean> {
    const limits = await fetchPoolSizeLimits();
    return poolName in limits;
}

export function getCachedPoolLimits(): PoolSizeLimits | null {
    return cachedPoolLimits;
} 