import { AuthedCtx } from '@core/modules/WebServer/ctxTypes';
import { fetchPoolSizeLimits, getCachedPoolLimits } from '@core/lib/poolSizeLimits';

export default async function getPoolLimits(ctx: AuthedCtx) {
    if (!ctx.admin.testPermission('settings.view', 'getPoolLimits')) {
        return ctx.send({
            status: 'error',
            error: 'You do not have permission to view the settings.'
        });
    }

    try {
        let poolLimits = getCachedPoolLimits();
        
        if (!poolLimits) {
            poolLimits = await fetchPoolSizeLimits();
        }

        return ctx.send({
            status: 'success',
            data: {
                pools: poolLimits,
                availablePoolNames: Object.keys(poolLimits).sort(),
                lastUpdated: Date.now(),
            }
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[getPoolLimits] Error fetching pool limits: ${errorMessage}`);
        
        return ctx.send({
            status: 'error',
            error: 'Failed to fetch pool limits'
        });
    }
} 