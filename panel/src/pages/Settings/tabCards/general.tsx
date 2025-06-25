import { Input } from "@/components/ui/input"
import { SettingItem, SettingItemDesc } from '../settingsItems'
import { useEffect, useRef, useMemo, useReducer } from "react"
import { getConfigEmptyState, getConfigAccessors, SettingsCardProps, getPageConfig, configsReducer, getConfigDiff } from "../utils"
import SettingsCardShell from "../SettingsCardShell"
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select"
import InlineCode from "@/components/InlineCode"
import TxAnchor from "@/components/TxAnchor"
import { txToast } from "@/components/TxToaster"
import { useAdminPerms } from "@/hooks/auth"


const detectBrowserLanguage = () => {
    const txTopLocale = Array.isArray(window.txBrowserLocale)
        ? window.txBrowserLocale[0]
        : window.txBrowserLocale;
    try {
        return new Intl.Locale(txTopLocale).language
    } catch (error) { }
    try {
        if (txTopLocale.includes('-')) {
            return txTopLocale.split('-')[0];
        }
    } catch (error) { }
    return undefined;
}


export const pageConfigs = {
    serverName: getPageConfig('general', 'serverName'),
    language: getPageConfig('general', 'language'),
    profile: getPageConfig('general', 'profile'),
} as const;

export default function ConfigCardGeneral({ cardCtx, pageCtx }: SettingsCardProps) {
    const { hasPerm } = useAdminPerms();
    const [states, dispatch] = useReducer(
        configsReducer<typeof pageConfigs>,
        null,
        () => getConfigEmptyState(pageConfigs),
    );
    const cfg = useMemo(() => {
        return getConfigAccessors(cardCtx.cardId, pageConfigs, pageCtx.apiData, dispatch);
    }, [pageCtx.apiData, dispatch]);

    //Effects - handle changes and reset advanced settings
    useEffect(() => {
        updatePageState();
    }, [states]);

    //Refs for configs that don't use state
    const serverNameRef = useRef<HTMLInputElement | null>(null);

    //Processes the state of the page and sets the card as pending save if needed
    const updatePageState = () => {
        const overwrites = {
            serverName: serverNameRef.current?.value,
        };

        const res = getConfigDiff(cfg, states, overwrites, false);
        pageCtx.setCardPendingSave(res.hasChanges ? cardCtx : null);
        return res;
    }

    //Validate changes (for UX only) and trigger the save API
    const handleOnSave = () => {
        const { hasChanges, localConfigs } = updatePageState();
        if (!hasChanges) return;

        if (!localConfigs.general?.serverName) {
            return txToast.error('The Server Name is required.');
        }
        if (localConfigs.general?.serverName?.length > 18) {
            return txToast.error('The Server Name is too big.');
        }
        
        // Check if profile was changed before saving
        const profileChanged = localConfigs.general?.profile && localConfigs.general.profile !== cfg.profile.initialValue;
        
        // Save the changes
        pageCtx.saveChanges(cardCtx, localConfigs);
        
        // If profile was changed, refresh the page to apply the new theme
        if (profileChanged) {
            setTimeout(() => {
                txToast.success('Profile saved! The page will refresh to apply the new theme.');
                setTimeout(() => window.location.reload(), 1500);
            }, 500);
        }
    }

    //Small QOL to hoist the detected browser language to the top of the list
    const localeData = useMemo(() => {
        if (!pageCtx.apiData?.locales) return null;
        const browserLanguage = detectBrowserLanguage();
        let enData;
        let browserData;
        let otherData = [];
        for (const lang of pageCtx.apiData?.locales) {
            if (lang.code === 'en') {
                enData = lang;
            } else if (lang.code === browserLanguage) {
                browserData = {
                    code: lang.code,
                    label: `${lang.label} (browser)`
                };
            } else {
                otherData.push(lang);
            }
        }
        return [
            enData,
            browserData,
            'sep1',
            ...otherData,
            'sep2',
            { code: 'custom', label: 'Custom (txData/locale.json)' }
        ].filter(Boolean);
    }, [pageCtx.apiData]);

    return (
        <SettingsCardShell
            cardCtx={cardCtx}
            pageCtx={pageCtx}
            onClickSave={handleOnSave}
        >
            <SettingItem label="Server Name" htmlFor={cfg.serverName.eid} required>
                <Input
                    id={cfg.serverName.eid}
                    ref={serverNameRef}
                    defaultValue={cfg.serverName.initialValue}
                    placeholder={'Example RP'}
                    onInput={updatePageState}
                    disabled={pageCtx.isReadOnly}
                />
                <SettingItemDesc>
                    A <strong>short</strong> server name to be used in the txAdmin interface and Server/Discord messages. <br />
                    The name must be between 1 and 18 characters.
                </SettingItemDesc>
            </SettingItem>
            <SettingItem label="Language" htmlFor={cfg.language.eid} required>
                {/* TODO: add a "Edit xxx" button besides the language for easy custom.json locale */}
                <Select
                    value={states.language}
                    onValueChange={cfg.language.state.set as any}
                    disabled={pageCtx.isReadOnly}
                >
                    <SelectTrigger id={cfg.language.eid}>
                        <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                        {localeData?.map((locale) => (
                            typeof locale === 'object'
                                ? <SelectItem key={locale.code} value={locale.code}>{locale.label}</SelectItem>
                                : <SelectSeparator key={locale} />
                        ))}
                    </SelectContent>
                </Select>
                <SettingItemDesc>
                    The language to use on Chat/Discord messages. <br />
                    You can customize the phrases/words by using the <InlineCode>Custom</InlineCode> option. <br />
                    For more information, please read the <TxAnchor href="https://github.com/tabarra/txAdmin/blob/master/docs/translation.md">documentation</TxAnchor>.
                </SettingItemDesc>
            </SettingItem>

            {hasPerm('settings.write') && (
                <SettingItem label="UI Profile" htmlFor={cfg.profile.eid}>
                    <Select
                        value={states.profile}
                        onValueChange={cfg.profile.state.set as any}
                        disabled={pageCtx.isReadOnly}
                    >
                        <SelectTrigger id={cfg.profile.eid}>
                            <SelectValue placeholder="Select profile..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="rylegames">
                                <div className="flex items-center gap-3">
                                    <img 
                                        src="/img/rylegames-logo.png" 
                                        alt="RyleGames"
                                        className="w-6 h-6 rounded"
                                    />
                                    <div className="flex flex-col">
                                        <span>RyleGames</span>
                                        <span className="text-xs text-muted-foreground">Black theme with purple accents</span>
                                    </div>
                                </div>
                            </SelectItem>
                            <SelectItem value="zerod">
                                <div className="flex items-center gap-3">
                                    <img 
                                        src="/img/zerod-logo.png" 
                                        alt="Zerod"
                                        className="w-6 h-6 rounded"
                                    />
                                    <div className="flex flex-col">
                                        <span>Zerod</span>
                                        <span className="text-xs text-muted-foreground">Modern indigo, pink, and orange theme</span>
                                    </div>
                                </div>
                            </SelectItem>
                        </SelectContent>
                    </Select>
                    <SettingItemDesc>
                        Choose between RyleGames or Zerod UI profiles to customize the appearance of txAdmin. <br />
                        <strong>Note:</strong> This setting affects all users and requires administrator permissions. <br />
                        Changes will be applied after saving and refreshing the page.
                    </SettingItemDesc>
                </SettingItem>
            )}
        </SettingsCardShell>
    )
}
