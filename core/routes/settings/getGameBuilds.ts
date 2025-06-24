import { fetchGameBuilds, getCachedGameBuilds, type GameBuilds } from '@core/lib/gameBuilds';
import type { AuthedCtx } from '@core/modules/WebServer/ctxTypes';

export default async function getGameBuilds(ctx: AuthedCtx) {
    if (!ctx.admin.testPermission('settings.view', 'getGameBuilds')) {
        return ctx.send({
            status: 'error',
            error: 'You do not have permission to view the settings.'
        });
    }

    try {
        let gameBuilds = getCachedGameBuilds();
        
        if (!gameBuilds) {
            gameBuilds = await fetchGameBuilds();
        }

        return ctx.send({
            status: 'success',
            data: {
                fivem: gameBuilds.fivem,
                availableFiveMBuilds: gameBuilds.fivem.map(b => b.build),
                lastUpdated: Date.now(),
            }
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[getGameBuilds] Error fetching game builds: ${errorMessage}`);
        
        return ctx.send({
            status: 'error',
            error: 'Failed to fetch game builds'
        });
    }
} 