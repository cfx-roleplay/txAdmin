const modulename = 'WebServer:FXServerResources';
import path from 'node:path';
import slash from 'slash';
import slug from 'slug';
import consoleFactory from '@lib/console';
import { SYM_SYSTEM_AUTHOR } from '@lib/symbols';
import { AuthedCtx } from '@modules/WebServer/ctxTypes';
const console = consoleFactory(modulename);

//Types
export type ResourceData = {
    name: string;
    divName: string;
    status: 'started' | 'stopped' | 'error';
    statusClass: 'success' | 'danger' | 'warning';
    version: string;
    author: string;
    description: string;
};

export type ResourceGroup = {
    subPath: string;
    divName: string;
    resources: ResourceData[];
};

export type ResourcesApiResp = {
    success: true;
    resourceGroups: ResourceGroup[];
    canManageResources: boolean;
} | {
    success: false;
    error: string;
};

//Helper functions
const isUndefined = (x: any): x is undefined => (x === undefined);
const breakPath = (inPath: string) => slash(path.normalize(inPath)).split('/').filter(String);
const dynamicSort = (prop: string) => {
    let sortOrder = 1;
    if (prop[0] === '-') {
        sortOrder = -1;
        prop = prop.substr(1);
    }
    return function (a: any, b: any) {
        const result = (a[prop] < b[prop]) ? -1 : (a[prop] > b[prop]) ? 1 : 0;
        return result * sortOrder;
    };
};

const getResourceSubPath = (resPath: string): string => {
    if (resPath.indexOf('system_resources') >= 0) return 'system_resources';
    if (!path.isAbsolute(resPath)) return resPath;

    let serverDataPathArr = breakPath(`${txConfig.server.dataPath}/resources`);
    let resPathArr = breakPath(resPath);
    for (let i = 0; i < serverDataPathArr.length; i++) {
        if (isUndefined(resPathArr[i])) break;
        if (serverDataPathArr[i].toLowerCase() == resPathArr[i].toLowerCase()) {
            delete (resPathArr as any)[i];
        }
    }
    resPathArr.pop();
    resPathArr = resPathArr.filter(String);

    if (resPathArr.length) {
        return resPathArr.join('/');
    } else {
        return 'root';
    }
};

/**
 * Returns the Processed Resource list.
 */
function processResources(resList: any[]): ResourceGroup[] {
    //Clean resource data and add it so an object separated by subpaths
    const resGroupList: { [key: string]: ResourceData[] } = {};
    resList.forEach((resource) => {
        if (isUndefined(resource.name) || isUndefined(resource.status) || isUndefined(resource.path) || resource.path === '') {
            return;
        }
        const subPath = getResourceSubPath(resource.path);
        const resData: ResourceData = {
            name: resource.name,
            divName: slug(resource.name),
            status: resource.status,
            statusClass: (resource.status === 'started') ? 'success' : 'danger',
            version: (resource.version) ? `(${resource.version.trim()})` : '',
            author: (resource.author) ? `${resource.author.trim()}` : '',
            description: (resource.description) ? resource.description.trim() : '',
        };

        if (resGroupList.hasOwnProperty(subPath)) {
            resGroupList[subPath].push(resData);
        } else {
            resGroupList[subPath] = [resData];
        }
    });

    //Generate final array with subpaths and div ids
    const finalList: ResourceGroup[] = [];
    Object.keys(resGroupList).forEach((subPath) => {
        const subPathData: ResourceGroup = {
            subPath: subPath,
            divName: slug(subPath),
            resources: resGroupList[subPath].sort(dynamicSort('name')),
        };
        finalList.push(subPathData);
    });

    return finalList;
}

/**
 * Returns the resources list as JSON
 */
export default async function FXServerResources(ctx: AuthedCtx) {
    if (!txCore.fxRunner.child?.isAlive) {
        return ctx.send<ResourcesApiResp>({
            success: false,
            error: 'The server is not running.',
        });
    }

    // Check if we should force refresh or use cached data
    const forceRefresh = ctx.query.refresh === 'true';
    const maxCacheAge = forceRefresh ? 0 : 10000; // 10 seconds cache for auto-refresh, 0 for forced refresh

    // Check if we have recent cached data
    const hasRecentData = txCore.fxResources.resourceReport
        && (new Date().getTime() - txCore.fxResources.resourceReport.ts.getTime()) <= maxCacheAge
        && Array.isArray(txCore.fxResources.resourceReport.resources);

    // Only send command if we don't have recent data or if forced refresh
    if (!hasRecentData) {
        const cmdSuccess = txCore.fxRunner.sendCommand('txaReportResources', [], SYM_SYSTEM_AUTHOR);
        if (!cmdSuccess) {
            return ctx.send<ResourcesApiResp>({
                success: false,
                error: 'Failed to send command to FXServer.',
            });
        }
    }

    // If we already have recent cached data, return it immediately
    if (hasRecentData && txCore.fxResources.resourceReport) {
        const resourceGroups = processResources(txCore.fxResources.resourceReport.resources);
        return ctx.send<ResourcesApiResp>({
            success: true,
            resourceGroups,
            canManageResources: ctx.admin.hasPermission('commands.resources'),
        });
    }

    //Timer for list delivery (only when waiting for fresh data)
    let tListTimer: NodeJS.Timeout;
    let tErrorTimer: NodeJS.Timeout;
    const tList = new Promise<ResourcesApiResp>((resolve, reject) => {
        tListTimer = setInterval(() => {
            if (
                txCore.fxResources.resourceReport
                && (new Date().getTime() - txCore.fxResources.resourceReport.ts.getTime()) <= 5000
                && Array.isArray(txCore.fxResources.resourceReport.resources)
            ) {
                clearTimeout(tListTimer);
                clearTimeout(tErrorTimer);
                const resourceGroups = processResources(txCore.fxResources.resourceReport.resources);
                resolve({
                    success: true,
                    resourceGroups,
                    canManageResources: ctx.admin.hasPermission('commands.resources'),
                });
            }
        }, 100);
    });

    //Timer for timing out
    const tError = new Promise<ResourcesApiResp>((resolve, reject) => {
        tErrorTimer = setTimeout(() => {
            clearTimeout(tListTimer);
            resolve({
                success: false,
                error: 'Timeout loading resources. Make sure the server is online and has fewer than 1000 resources.',
            });
        }, 5000);
    });

    //Start race and give output
    const result = await Promise.race([tList, tError]);
    return ctx.send(result);
} 