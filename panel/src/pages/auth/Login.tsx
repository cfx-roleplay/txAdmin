import { useEffect, useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, LogInIcon } from "lucide-react";
import { ApiOauthRedirectResp, ApiVerifyPasswordReq, ApiVerifyPasswordResp } from '@shared/authApiTypes';
import { useAuth } from '@/hooks/auth';
import './cfxreLoginButton.css';
import { useLocation } from "wouter";
import { fetchWithTimeout } from '@/hooks/fetch';
import { processFetchError } from './errors';


function HeaderProfileInfo() {
    return (
        <div className="text-center">
            <div className="text-xl xs:text-2xl text-primary/85 font-semibold line-clamp-1">
                {window.txConsts.providerName}
            </div>
            <div className="text-sm xs:text-base font-normal tracking-wide text-muted-foreground">
                Login to continue
            </div>
        </div>
    )
}


export enum LogoutReasonHash {
    NONE = '',
    LOGOUT = '#logout',
    EXPIRED = '#expired',
    UPDATED = '#updated',
    MASTER_ALREADY_SET = '#master_already_set',
    SHUTDOWN = '#shutdown',
}

export default function Login() {
    const { setAuthData } = useAuth();
    const usernameRef = useRef<HTMLInputElement>(null);
    const passwordRef = useRef<HTMLInputElement>(null);
    const [errorMessage, setErrorMessage] = useState<string | undefined>();
    const [isFetching, setIsFetching] = useState(false);
    const setLocation = useLocation()[1];

    const onError = (error: any) => {
        const { errorTitle, errorMessage } = processFetchError(error);
        setErrorMessage(`${errorTitle}:\n${errorMessage}`);
    }

    const onErrorResponse = (error: string) => {
        if (error === 'no_admins_setup') {
            setErrorMessage('No admins set up.\nRedirecting...');
            setLocation('/addMaster/pin');
        } else {
            setErrorMessage(error);
        }
    }

    const handleLogin = async () => {
        try {
            setIsFetching(true);
            const data = await fetchWithTimeout<ApiVerifyPasswordResp, ApiVerifyPasswordReq>(
                `/auth/password?uiVersion=${encodeURIComponent(window.txConsts.txaVersion)}`,
                {
                    method: 'POST',
                    body: {
                        username: usernameRef.current?.value ?? '',
                        password: passwordRef.current?.value ?? '',
                    },
                }
            );
            if ('error' in data) {
                if (data.error === 'refreshToUpdate') {
                    window.location.href = `/login${LogoutReasonHash.UPDATED}`;
                    window.location.reload();
                } else {
                    onErrorResponse(data.error);
                }
            } else {
                setAuthData(data);
            }
        } catch (error) {
            onError(error);
        } finally {
            setIsFetching(false);
        }
    }

    const handleRedirect = async () => {
        try {
            setIsFetching(true);
            const data = await fetchWithTimeout<ApiOauthRedirectResp>(
                `/auth/cfxre/redirect?origin=${encodeURIComponent(window.location.origin)}`
            );
            if ('error' in data) {
                onErrorResponse(data.error);
                setIsFetching(false);
            } else {
                console.log('Redirecting to', data.authUrl);
                window.location.href = data.authUrl;
            }
        } catch (error) {
            onError(error);
            setIsFetching(false);
        }
    }

    //Prefill username/password if dev pass enabled
    useEffect(() => {
        try {
            const rawLocalStorageStr = localStorage.getItem('authCredsAutofill');
            if (rawLocalStorageStr) {
                const [user, pass] = JSON.parse(rawLocalStorageStr);
                usernameRef.current!.value = user ?? '';
                passwordRef.current!.value = pass ?? '';
            }
        } catch (error) {
            console.error('Username/Pass autofill failed', error);
        }
    }, []);

    //Gets the message from the hash and clears it
    useEffect(() => {
        const hash = window.location.hash;
        if (!hash) return;
        if (hash === LogoutReasonHash.LOGOUT) {
            setErrorMessage('Logged Out.');
        } else if (hash === LogoutReasonHash.EXPIRED) {
            setErrorMessage('Session Expired.');
        } else if (hash === LogoutReasonHash.UPDATED) {
            setErrorMessage('txAdmin updated!\nPlease login again.');
        } else if (hash === LogoutReasonHash.MASTER_ALREADY_SET) {
            setErrorMessage('Master account already configured.');
        } else if (hash === LogoutReasonHash.SHUTDOWN) {
            setErrorMessage('The txAdmin server shut down.\nPlease start it again to be able to login.');
        }
        window.location.hash = '';
    }, []);

    return (
        <form
            onSubmit={(e) => { e.preventDefault(); handleLogin();}}
            className='w-full rounded-[inherit]'
        >
            <CardHeader className="rounded-t-[inherit]">
                <CardTitle className="h-14 xs:h-16 flex justify-center items-center">
                    <HeaderProfileInfo />
                </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col pt-4 gap-4 border-t rounded-b-[inherit] bg-card">
                {/* Error message */}
                {errorMessage && <div className="text-center text-sm whitespace-pre-wrap text-destructive-inline">
                    {errorMessage}
                </div>}

                {/* Form */}
                <div className="flex flex-col xs:grid grid-cols-8 gap-2 xs:gap-4 items-baseline">
                    <Label className="col-span-2" htmlFor="frm-login">
                        Username
                    </Label>
                    <Input
                        id="frm-login"
                        ref={usernameRef}
                        type="text"
                        placeholder="username"
                        autoCapitalize='off'
                        autoComplete='off'
                        className="col-span-6"
                        required
                    />
                </div>
                <div className="flex flex-col xs:grid grid-cols-8 gap-2 xs:gap-4 items-baseline">
                    <Label className="col-span-2" htmlFor="frm-password">
                        Password
                    </Label>
                    <Input
                        id="frm-password"
                        ref={passwordRef}
                        type="password"
                        placeholder='password'
                        autoCapitalize='off'
                        autoComplete='off'
                        className="col-span-6"
                        required
                    />
                </div>

                {/* Buttons */}
                <Button variant='outline' disabled={isFetching}>
                    {isFetching ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <LogInIcon className="inline mr-2 h-4 w-4" />
                    )} Login
                </Button>
                <Button
                    className="cfxrebtn"
                    variant='outline'
                    disabled={isFetching}
                    onClick={handleRedirect}
                    style={{
                        borderColor: 'hsl(var(--accent))',
                        backgroundColor: 'hsl(var(--accent) / 0.1)',
                        boxShadow: '0 0 5px 0 hsl(var(--accent) / 0.75)',
                        '--hover-bg': 'hsl(var(--accent))',
                        '--hover-color': 'hsl(var(--accent-foreground))'
                    } as React.CSSProperties}
                >
                    {isFetching ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <LogInIcon className="inline mr-2 h-4 w-4" />
                    )} Login with Cfx.re
                </Button>
            </CardContent>
        </form>
    );
}
