import { isArray } from 'lodash';
import { useCallback } from 'react';
import { useGetAccounts } from './useGetAccounts';
import { usePersistActiveAccount } from './usePersistActiveAccount';

export interface AccountsQueryResolverArgs {
    isActive?: boolean
}

export const __typename = 'Account';

export const useGetAccountsResolver = () => {
    const [persistedActiveAccount] = usePersistActiveAccount();
    const getAccounts = useGetAccounts();

    return useCallback(async (
        _obj,
        args: AccountsQueryResolverArgs 
    ) => {
        const accounts = await getAccounts(
            persistedActiveAccount?.id,
            args?.isActive,
        );

        return isArray(accounts)
            ? accounts.map(account => ({
                ...account,
                __typename
            }))
            : ({
                // just a single account
                ...accounts,
                __typename
            })
    }, [
        persistedActiveAccount,
        getAccounts
    ])
}