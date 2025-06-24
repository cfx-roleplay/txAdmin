import https from 'https';

export interface GameBuild {
    build: string;
    dlcName: string;
}

export interface GameBuilds {
    fivem: GameBuild[];
}

let cachedGameBuilds: GameBuilds | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 1000 * 60 * 60 * 24; // 24 hours


function fetchGameBuildsFromAPI(): Promise<string> {
    return new Promise((resolve, reject) => {
        const url = 'https://raw.githubusercontent.com/citizenfx/fivem/refs/heads/master/ext/cfx-ui/src/cfx/base/game.ts';
        
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
                resolve(data);
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

function parseGameBuilds(fileContent: string): GameBuilds {
    const builds: GameBuild[] = [];
    
    const functionMatch = fileContent.match(/export function getGameBuildDLCName\(gameBuild: string\): string \{([\s\S]*?)\}/);
    if (!functionMatch) {
        throw new Error('Could not find getGameBuildDLCName function');
    }
    
    const functionContent = functionMatch[1];
    
    const caseMatches = functionContent.matchAll(/case '(\d+)':\s*return '([^']+)';/g);
    
    for (const match of caseMatches) {
        const build = match[1];
        const dlcName = match[2];
        builds.push({ build, dlcName });
    }
    
    const multipleCaseMatches = functionContent.matchAll(/case '(\d+)':\s*case '(\d+)':\s*(?:case '(\d+)':\s*)?return '([^']+)';/g);
    
    for (const match of multipleCaseMatches) {
        const dlcName = match[4];
        
        for (let i = 1; i <= 3; i++) {
            if (match[i]) {
                builds.push({ build: match[i], dlcName });
            }
        }
    }
    
    builds.sort((a, b) => parseInt(a.build) - parseInt(b.build));
    
    const highestBuild = Math.max(...builds.map(b => parseInt(b.build)));
    
    const fivemBuilds: GameBuild[] = [];
    
    for (let i = 1; i <= highestBuild; i++) {
        const buildStr = i.toString();
        const namedBuild = builds.find(b => b.build === buildStr);
        fivemBuilds.push({
            build: buildStr,
            dlcName: namedBuild ? namedBuild.dlcName : ''
        });
    }
    
    return { fivem: fivemBuilds };
}


export async function fetchGameBuilds(): Promise<GameBuilds> {
    const now = Date.now();
    
    if (cachedGameBuilds && (now - lastFetchTime) < CACHE_DURATION) {
        return cachedGameBuilds;
    }

    try {
        const fileContent = await fetchGameBuildsFromAPI();
        const builds = parseGameBuilds(fileContent);
        
        cachedGameBuilds = builds;
        lastFetchTime = now;
        
        console.log(`[GameBuilds] Fetched ${builds.fivem.length} FiveM builds from CitizenFX`);

        return builds;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn(`[GameBuilds] Failed to fetch game builds: ${errorMessage}`);

        const fallbackBuilds: GameBuilds = {
            fivem: [
                { build: '1', dlcName: '' },
                { build: '2060', dlcName: 'Los Santos Summer Special' },
                { build: '2189', dlcName: 'Cayo Perico Heist' },
                { build: '2215', dlcName: 'Cayo Perico Heist' },
                { build: '2245', dlcName: 'Cayo Perico Heist' },
                { build: '2372', dlcName: 'Los Santos Tuners' },
                { build: '2545', dlcName: 'The Contract' },
                { build: '2612', dlcName: 'The Contract' },
                { build: '2699', dlcName: 'The Criminal Enterprises' },
                { build: '2802', dlcName: 'Los Santos Drug Wars' },
                { build: '2944', dlcName: 'San Andreas Mercenaries' },
                { build: '3095', dlcName: 'The Chop Shop' },
                { build: '3258', dlcName: 'Bottom Dollar Bounties' },
                { build: '3323', dlcName: 'Bottom Dollar Bounties' },
                { build: '3407', dlcName: 'Agents of Sabotage' },
                { build: '3570', dlcName: 'Money Fronts' }
            ]
        };

        for (let i = 1; i <= 3570; i++) {
            const buildStr = i.toString();
            const existingBuild = fallbackBuilds.fivem.find(b => b.build === buildStr);
            if (!existingBuild) {
                fallbackBuilds.fivem.push({ build: buildStr, dlcName: '' });
            }
        }

        // Sort builds
        fallbackBuilds.fivem.sort((a, b) => parseInt(a.build) - parseInt(b.build));

        if (!cachedGameBuilds) {
            cachedGameBuilds = fallbackBuilds;
            lastFetchTime = now;
        }

        return cachedGameBuilds;
    }
}

export async function getFiveMBuilds(): Promise<GameBuild[]> {
    const builds = await fetchGameBuilds();
    return builds.fivem;
}

export async function getBuildDLCName(build: string): Promise<string> {
    const builds = await fetchGameBuilds();
    const fivemBuild = builds.fivem.find(b => b.build === build);
    
    return fivemBuild?.dlcName || '';
}

export async function isValidFiveMBuild(build: string): Promise<boolean> {
    const builds = await fetchGameBuilds();
    return builds.fivem.some(b => b.build === build);
}

export function getCachedGameBuilds(): GameBuilds | null {
    return cachedGameBuilds;
} 