import { useApolloClient } from '@apollo/client';
import { watch } from 'fs';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { AssetBalanceInput } from '../../../../../components/Balance/AssetBalanceInput/AssetBalanceInput';
import { FormattedBalance } from '../../../../../components/Balance/FormattedBalance/FormattedBalance';
import Icon from '../../../../../components/Icon/Icon';
import { useMultiFeePaymentConversionContext } from '../../../../../containers/MultiProvider';
import { Asset } from '../../../../../generated/graphql';
import { estimateBalanceTransfer } from '../../../../../hooks/balances/resolvers/mutation/balanceTransfer';
import { useTransferBalanceMutation } from '../../../../../hooks/balances/resolvers/useTransferMutation';
import { usePolkadotJsContext } from '../../../../../hooks/polkadotJs/usePolkadotJs';
import { Notification } from '../../../WalletPage';
import './TransferForm.scss';

export const TransferForm = ({
  closeModal,
  assetId = '0',
  setNotification,
  assets
}: {
  closeModal: () => void,
  assetId?: string,
  setNotification: (notification: Notification) => void,
  assets?: Asset[]
}) => {
  const modalContainerRef = useRef<HTMLDivElement | null>(null);
  const form = useForm({
    // mode: 'all',
    defaultValues: {
      asset: assetId,
      to: undefined,
      amount: undefined,
      submit: undefined
    },
  });

  const [transferBalance] = useTransferBalanceMutation();

  const clearNotificationIntervalRef = useRef<any>();
  const handleSubmit = useCallback((data: any) => {
    // this is not ideal, but we want to show the pending status 
    // which is hidden behind the modal currently
    closeModal();
    setNotification('pending');
    transferBalance({
      variables: {
        currencyId: data.asset,
        amount: data.amount,
        to: data.to,
      },
      onCompleted: () => {
        setNotification('success');
        clearNotificationIntervalRef.current = setTimeout(() => {
          setNotification('standby');
        }, 4000);
      },
      onError: () => {
        setNotification('failed');
        clearNotificationIntervalRef.current = setTimeout(() => {
          setNotification('standby');
        }, 4000);
      },
    });
  }, [closeModal, setNotification, transferBalance]);

  console.log('form state', form.formState);

  useEffect(() => {
    form.trigger('submit');
  }, [form.watch(['submit', 'amount', 'to', 'asset'])])

  const [txFee, setTxFee] = useState<string>();
  const { apiInstance, loading: apiInstanceLoading } = usePolkadotJsContext()
  const client = useApolloClient();
  const { convertToFeePaymentAsset, feePaymentAsset } = useMultiFeePaymentConversionContext();


  useEffect(() => {
    if (!apiInstance || apiInstanceLoading) return;
    (async () => {
      console.log('reestimating', {
        from: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        to: form.getValues('to') || '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        currencyId: form.getValues('asset') || '0',
        amount: form.getValues('amount') || '0'
      });
      const estimate = await estimateBalanceTransfer(client.cache, apiInstance, {
        from: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        to: form.getValues('to') || '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        currencyId: form.getValues('asset') || '0',
        amount: form.getValues('amount') || '0'
      })
      
      setTxFee(
        convertToFeePaymentAsset(estimate.partialFee.toString())
      );
    })()
  }, [apiInstance, apiInstanceLoading, client, form.watch(['amount', 'asset', 'to'])]);

  return (
    <div className="transfer-form modal-component-wrapper">
      <div className="transfer-form__content-wrapper">
        <div ref={modalContainerRef}></div>
        <div className="modal-component-heading">
          Transfer
          <div className="close-modal-btn" onClick={() => closeModal()}>
            <Icon name="Cancel" />
          </div>
        </div>

        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <label>To: </label>
            {/* TODO: validate address */}
            <input type="text" {...form.register('to', { required: true })} />
            <AssetBalanceInput
              modalContainerRef={modalContainerRef}
              balanceInputName="amount"
              assetInputName="asset"
              assets={assets}
            />

            Form state: {form.formState.isDirty ? 'dirty': 'clean'}, {form.formState.isValid ? 'valid' : 'invalid'}
            
            <input 
              type="submit" 
              className="submit-button" 
              disabled={!form.formState.isDirty || !form.formState.isValid}
              {...form.register('submit', {
                validate: {
                  asset: () => form.getValues('asset') !== undefined,
                  amount: () => form.getValues('amount') !== undefined
                }
              })}
            />
            Tx fee: {txFee
              ? <FormattedBalance balance={{
                assetId: feePaymentAsset || '0',
                balance: txFee
              }}/> 
              : <>-</>
            }
          </form>
        </FormProvider>
      </div>
    </div>
  );
};
