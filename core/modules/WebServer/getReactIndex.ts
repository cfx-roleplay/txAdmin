const modulename = 'WebCtxUtils';
import fsp from "node:fs/promises";
import path from "node:path";
import type { InjectedTxConsts, ThemeType } from '@shared/otherTypes';
import { txEnv, txDevEnv, txHostConfig } from "@core/globalData";
import { AuthedCtx, CtxWithVars } from "./ctxTypes";
import consts from "@shared/consts";
import consoleFactory from '@lib/console';
import { AuthedAdminType, checkRequestAuth } from "./authLogic";
import { isString } from "@modules/CacheStore";
import { getProfile } from "@core/lib/profiles";
const console = consoleFactory(modulename);

// NOTE: it's not possible to remove the hardcoded import of the entry point in the index.html file
// even if you set the entry point manually in the vite config.
// Therefore, it was necessary to tag it with `data-prod-only` so it can be removed in dev mode.

//Consts
const serverTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

//Cache the index.html file unless in dev mode
let htmlFile: string;

// NOTE: https://vitejs.dev/guide/backend-integration.html
const viteOrigin = txDevEnv.VITE_URL ?? 'doesnt-matter';
const devModulesScript = `<script type="module">
        import { injectIntoGlobalHook } from "${viteOrigin}/@react-refresh";
        injectIntoGlobalHook(window);
        window.$RefreshReg$ = () => {};
        window.$RefreshSig$ = () => (type) => type;
        window.__vite_plugin_react_preamble_installed__ = true;
    </script>
    <script type="module" src="${viteOrigin}/@vite/client"></script>
    <script type="module" src="${viteOrigin}/src/main.tsx"></script>`;


const getCurrentProfile = () => {
    try {
        const profileId = txConfig?.general?.profile || 'default';
        return getProfile(profileId);
    } catch (error) {
        return getProfile('default');
    }
};

export const tmpDefaultTheme = 'dark';
export const tmpDefaultThemes = ['dark', 'light'];
export let tmpCustomThemes: ThemeType[] = [];

export default async function getReactIndex(ctx: CtxWithVars | AuthedCtx) {
    if (txDevEnv.ENABLED || !htmlFile) {
        try {
            const indexPath = txDevEnv.ENABLED
                ? path.join(txDevEnv.SRC_PATH, '/panel/index.html')
                : path.join(txEnv.txaPath, 'panel/index.html')
            const rawHtmlFile = await fsp.readFile(indexPath, 'utf-8');

            if (txDevEnv.ENABLED) {
                htmlFile = rawHtmlFile.replaceAll(/.+data-prod-only.+\r?\n/gm, '');
            } else {
                htmlFile = rawHtmlFile.replaceAll(/.+data-dev-only.+\r?\n/gm, '');
            }
        } catch (error) {
            if ((error as any).code == 'ENOENT') {
                return `<h1>⚠ index.html not found:</h1><pre>You probably deleted the 'citizen/system_resources/monitor/panel/index.html' file, or the folders above it.</pre>`;
            } else {
                return `<h1>⚠ index.html load error:</h1><pre>${(error as Error).message}</pre>`
            }
        }
    }

    const authResult = checkRequestAuth(
        ctx.request.headers,
        ctx.ip,
        ctx.txVars.isLocalRequest,
        ctx.sessTools
    );
    let authedAdmin: AuthedAdminType | false = false;
    if (authResult.success) {
        authedAdmin = authResult.admin;
    }

    const basePath = (ctx.txVars.isWebInterface) ? '/' : consts.nuiWebpipePath;
    const currentProfile = getCurrentProfile();

    if (currentProfile.id === 'default') {
        tmpCustomThemes = [];
    } else {
        tmpCustomThemes = [currentProfile.theme];
    }

    const injectedConsts: InjectedTxConsts = {
        //env
        fxsVersion: txEnv.fxsVersionTag,
        fxsOutdated: txCore.updateChecker.fxsUpdateData,
        txaVersion: txEnv.txaVersion,
        txaOutdated: txCore.updateChecker.txaUpdateData,
        serverTimezone,
        isWindows: txEnv.isWindows,
        isWebInterface: ctx.txVars.isWebInterface,
        showAdvanced: (txDevEnv.ENABLED || console.isVerbose),
        hasMasterAccount: txCore.adminStore.hasAdmins(true),
        defaultTheme: tmpDefaultTheme,
        customThemes: tmpCustomThemes.map(({ name, isDark }) => ({ name, isDark })),
        adsData: txEnv.adsData,
        providerLogo: currentProfile.logo,
        providerName: currentProfile.name,
        hostConfigSource: txHostConfig.sourceName,

        //Login page info
        server: {
            name: txCore.cacheStore.getTyped('fxsRuntime:projectName', isString) ?? txConfig.general.serverName,
            game: txCore.cacheStore.getTyped('fxsRuntime:gameName', isString),
            icon: txCore.cacheStore.getTyped('fxsRuntime:iconFilename', isString),
        },

        //auth
        preAuth: authedAdmin && authedAdmin.getAuthData(),
    };

    //Prepare placeholders
    const replacers: { [key: string]: string } = {};
    replacers.basePath = `<base href="${basePath}">`;
    replacers.ogTitle = `txAdmin - ${txConfig.general.serverName}`;
    replacers.ogDescripttion = `Manage & Monitor your FiveM/RedM Server with txAdmin v${txEnv.txaVersion} atop FXServer ${txEnv.fxsVersion}`;
    replacers.txConstsInjection = `<script>window.txConsts = ${JSON.stringify(injectedConsts)};</script>`;
    replacers.devModules = txDevEnv.ENABLED ? devModulesScript : '';

    if (tmpCustomThemes.length) {
        const cssThemes = [];
        for (const theme of tmpCustomThemes) {
            const brandingVars = [];

            const safeBrandingKeys = [
                'background', 'foreground', 'card', 'card-foreground',
                'popover', 'popover-foreground', 'secondary', 'secondary-foreground',
                'muted', 'muted-foreground', 'accent', 'accent-foreground',
                'border', 'input', 'ring', 'radius'
            ];

            for (const [name, value] of Object.entries(theme.style)) {
                if (safeBrandingKeys.includes(name)) {
                    brandingVars.push(`    --${name}: ${value};`);
                }
            }

            const themeCSS = `
.theme-${theme.name} {
${brandingVars.join('\n')}
}
.dark.theme-${theme.name} {
${brandingVars.join('\n')}
}`;
            cssThemes.push(themeCSS);
        }
        replacers.customThemesStyle = `<style>${cssThemes.join('\n')}</style>`;
    } else {
        replacers.customThemesStyle = '';
    }

    //Setting the theme class based on profile
    if (currentProfile.id === 'default') {
        // For default profile, use the theme cookie or default to dark
        const themeCookie = ctx.cookies.get('txAdmin-theme');
        if (themeCookie && tmpDefaultThemes.includes(themeCookie)) {
            replacers.htmlClasses = themeCookie;
        } else {
            replacers.htmlClasses = tmpDefaultTheme;
        }
    } else {
        // For custom profiles, always use the profile's theme
        const profileTheme = currentProfile.theme;
        const lightDarkSelector = profileTheme.isDark ? 'dark' : 'light';
        replacers.htmlClasses = `${lightDarkSelector} theme-${profileTheme.name}`;
    }

    //Replace
    let htmlOut = htmlFile;
    for (const [placeholder, value] of Object.entries(replacers)) {
        const replacerRegex = new RegExp(`(<!--\\s*)?{{${placeholder}}}(\\s*-->)?`, 'g');
        htmlOut = htmlOut.replaceAll(replacerRegex, value);
    }

    //If in prod mode and NUI, replace the entry point with the local one
    //This is required because of how badly the WebPipe handles "large" files
    if (!txDevEnv.ENABLED) {
        const base = ctx.txVars.isWebInterface ? `./` : `nui://monitor/panel/`;
        htmlOut = htmlOut.replace(/src="\.\/index-(\w+(?:\.v\d+)?)\.js"/, `src="${base}index-$1.js"`);
        htmlOut = htmlOut.replace(/href="\.\/index-(\w+(?:\.v\d+)?)\.css"/, `href="${base}index-$1.css"`);
    }

    return htmlOut;
}
