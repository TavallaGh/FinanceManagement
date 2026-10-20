/* Shared transaction validation and persistence for both entry points. */
(() => {
  const makeSaveHandler = ({
      supabase, headerData, itemsData, summaryStats, canTransitionTo, getExchangeRates,
      currentUserId, currentUserName, currentUserUsername, lookups, isDirty, access, securityCtx,
      formCode, requestRecord, requestLoading, currencyRates, ratesDate, savingRef, showToast, t, logAction, setIsLoading,
      setHeaderData, setAttachModal, setItemsData, setIsDirty, setHasSaved, setCopyWarning, setRequestRecord,
      requestApprovalDate
  }) => {
    const validateTransactionLogic = (targetStatus) => {
        if (targetStatus === 'DRAFT') return true;

        if (!itemsData || itemsData.length === 0) {
            showToast(t('سند باید حداقل دارای یک قلم باشد.', 'Transaction must have at least one item.'), 'warning');
            return false;
        }

        let hasZeroItem = false;
        itemsData.forEach(i => {
            const dep = parseFloat(String(i.deposit_amount || '0').replace(/,/g, '')) || 0;
            const wid = parseFloat(String(i.withdrawal_amount || '0').replace(/,/g, '')) || 0;
            if (dep === 0 && wid === 0) hasZeroItem = true;
        });

        if (hasZeroItem) {
            showToast(t('مبلغ تمام اقلام سند باید پر شود و نمی‌تواند صفر باشد.', 'All items must have a valid amount.'), 'warning');
            return false;
        }

        if (summaryStats.totalDepUsd === 0 && summaryStats.totalWidUsd === 0) {
            showToast(t('جمع مبالغ سند صفر است و قابلیت تغییر وضعیت ندارد.', 'Total transaction amount cannot be zero.'), 'warning');
            return false;
        }

        if (headerData.transaction_type === 'TRANSFER' && summaryStats.isUnbalanced) {
            showToast(t('تراکنش انتقال غیرتراز است. مجموع واریز و برداشت ارزی باید برابر باشد.', 'Transfer transactions must be balanced.'), 'warning');
            return false;
        }

        return true;
    };

    const handleSaveTransaction = async (overrideStatus) => {
      if (savingRef.current || requestLoading) return;
      const statusToSave = typeof overrideStatus === 'string' ? overrideStatus : headerData.status;
      const creating = !headerData.id;
      if (!access.canView || !(creating ? access.canCreate : access.canEdit)) {
        return showToast(t('مجوز ثبت یا ویرایش تراکنش ندارید.', 'Transaction write access is required.'), 'error');
      }
      if (typeof overrideStatus === 'string' && overrideStatus !== headerData.status &&
          !canTransitionTo(headerData.status, overrideStatus)) {
        return showToast(t('این تغییر وضعیت مجاز نیست.', 'Status transition is not allowed.'), 'warning');
      }
      if (document.getElementById('grid-inline-edit-marker')) {
        return showToast(t('ابتدا ویرایش سطر جاری را تایید کنید.', 'Save inline edits first.'), 'warning');
      }
      if (!headerData.document_date || !headerData.transaction_type || !headerData.description) {
        return showToast(t('تکمیل تاریخ، نوع و شرح سربرگ الزامی است.', 'Date, type and description are required.'), 'warning');
      }
      if (!validateTransactionLogic(statusToSave)) return;
      savingRef.current = true;
      setIsLoading(true);
      const logic = window.RequestTransactionLogic;
      let txId = headerData.id;
      let original = null;
      let touched = false;
      let itemsTouched = false;
      let committed = false;
      let linkCleared = false;
      let linkedRequest = null;
      try {
        const approvalDate = statusToSave === 'APPROVED' ? await requestApprovalDate(1) : null;
        if (statusToSave === 'APPROVED' && !approvalDate) return;
        if (!creating) {
          original = await logic.readTransaction(supabase, txId);
          logic.assertScope(original, securityCtx, formCode, currentUserId, t);
          if (original.status === 'APPROVED' || original.status !== headerData.status || (['FINAL', 'APPROVED'].includes(original.status) &&
              (isDirty || typeof overrideStatus !== 'string'))) {
            throw new Error(t('وضعیت تراکنش تغییر کرده یا اجازه ویرایش نمی‌دهد؛ دوباره باز کنید.', 'Transaction status changed or prevents editing. Reopen it.'));
          }
        }
        const requestId = original?.request_id || headerData.request_id;
        if (requestId) {
          linkedRequest = await logic.readRequest(supabase, requestId, true);
          logic.assertScope(linkedRequest, securityCtx, 'REQ_REQUEST_MNGMT', currentUserId, t);
          logic.assertInProgress(linkedRequest, t);
          if (creating) await window.RequestAssignmentLogic.assertCanCreate(supabase, linkedRequest, currentUserId, t);
          if (original && !linkedRequest.transaction_id && !logic.same(original.registrar_id, currentUserId)) {
            throw new Error(t('ثبت اولیه این تراکنش هنوز توسط ثبت‌کننده تکمیل نشده است.',
              'The registrar has not completed the initial save of this transaction yet.'));
          }
          if (original && requestRecord && !logic.same(requestRecord.transaction_id, linkedRequest.transaction_id)) {
            throw new Error(t('ارتباط درخواست تغییر کرده است؛ تراکنش را دوباره باز کنید.', 'Request link changed. Reopen the transaction.'));
          }
          const existing = await logic.findTransaction(supabase, requestId);
          if (existing && !logic.same(existing.id, txId)) {
            throw new Error(t('برای این درخواست تراکنش ثبت شده است؛ آن را از فهرست باز کنید.', 'A transaction already exists for this request. Open it from the list.'));
          }
          logic.validateItems(linkedRequest, headerData, itemsData, lookups, t);
          if (ratesDate !== headerData.document_date) throw new Error(t('نرخ‌های تاریخ تراکنش هنوز دریافت نشده‌اند.', 'Transaction-date rates have not loaded yet.'));
          logic.validateRates(currencyRates, itemsData, t);
        }
        const actorId = currentUserId || lookups.usersList.find(user =>
          user.username === currentUserUsername || user.full_name === currentUserName)?.id;
        if (!actorId) throw new Error(t('کاربر جاری مشخص نیست.', 'Current user is unavailable.'));
        const now = new Date().toISOString();
        const actorName = lookups.usersMap[actorId] || currentUserName;
        const metadata = {};
        if (statusToSave === 'FINAL' && headerData.status !== 'FINAL') {
          Object.assign(metadata, { reviewed_by: actorId, reviewed_at: now, reviewed_by_name: actorName });
        } else if (statusToSave === 'APPROVED' && headerData.status !== 'APPROVED') {
          await window.FinancialApprovalLogic.checkApproval(supabase, approvalDate, t);
          Object.assign(metadata, { approved_by: actorId, approved_at: now, approved_by_name: actorName, approval_date: approvalDate });
        } else if (statusToSave === 'TEMPORARY' && headerData.status === 'FINAL') {
          Object.assign(metadata, { reviewed_by: null, reviewed_at: null, reviewed_by_name: null });
        }
        const payload = {
          document_code: headerData.document_code,
          document_date: headerData.document_date.replace(/\//g, '-'),
          registrar_id: creating ? actorId : original.registrar_id,
          transaction_type: headerData.transaction_type,
          department_id: headerData.department_id || null,
          status: statusToSave || 'DRAFT', description: headerData.description,
          ...(requestId ? { request_id: requestId } : {}), ...metadata,
        };
        const itemPayload = itemsData.map((item, index) => {
          const dep = logic.amount(item.deposit_amount);
          const wid = logic.amount(item.withdrawal_amount);
          if (!Number.isFinite(dep) || !Number.isFinite(wid) || dep < 0 || wid < 0 || (dep > 0 && wid > 0)) {
            throw new Error(t('مبالغ اقلام معتبر نیستند.', 'Invalid item amounts.'));
          }
          const { toUsd, usdToIrr } = getExchangeRates(item.currency || 'IRR');
          const value = dep > 0 ? dep : wid;
          return {
            row_number: index + 1, account_id: item.account_id || null,
            transaction_action: item.transaction_action || 'DEPOSIT', transaction_group: item.transaction_group || null,
            cost_type_id: item.cost_type_id || null, income_type_id: item.income_type_id || null,
            center_id: item.center_id || null, currency: item.currency || 'IRR',
            deposit_amount: dep, withdrawal_amount: wid, exchange_rate_to_usd: toUsd,
            exchange_rate_usd_to_irr: usdToIrr, amount_usd: value * toUsd, amount_irr: value * toUsd * usdToIrr,
            description: item.description || null,
            ...(requestId || item.party_id !== undefined ? { party_id: item.party_id || null } : {}),
            ...(requestId || item.project_id !== undefined ? { project_id: item.project_id || null } : {}),
            ...(requestId ? { request_item_id: item.request_item_id || null } : {}),
          };
        });
        if (original && linkedRequest?.transaction_id) {
          // While replacing items, the request cannot be marked DONE with an incomplete document.
          const cleared = await supabase.from('req_requests').update({ transaction_id: null })
            .eq('id', linkedRequest.id).eq('status', 'IN_PROGRESS').eq('transaction_id', txId).select('id');
          if (cleared.error) throw cleared.error;
          if (cleared.data?.length !== 1) throw new Error(t('درخواست تغییر کرده است.', 'Request changed.'));
          linkCleared = true;
        }
        let result;
        if (creating) result = await supabase.from('fm_transactions').insert([payload]).select('*').single();
        else result = await supabase.from('fm_transactions').update(payload).eq('id', txId)
          .eq('status', original.status).select('*').single();
        if (result.error) throw result.error;
        txId = result.data.id;
        touched = true;
        let savedItems = original?.fm_transaction_items || [];
        if (isDirty || creating) {
          const removed = await supabase.from('fm_transaction_items').delete().eq('transaction_id', txId);
          if (removed.error) throw removed.error;
          itemsTouched = true;
          savedItems = [];
          if (itemPayload.length) {
            const inserted = await supabase.from('fm_transaction_items')
              .insert(itemPayload.map(item => ({ ...item, transaction_id: txId }))).select('*');
            if (inserted.error) throw inserted.error;
            if (inserted.data.length !== itemPayload.length) throw new Error(t('اقلام کامل ذخیره نشدند.', 'Items were not fully saved.'));
            savedItems = inserted.data;
          }
        }
        if (requestId) {
          // Publish the link only after all items exist. DONE checks this link.
          const linked = await supabase.from('req_requests').update({ transaction_id: txId })
            .eq('id', requestId).eq('status', 'IN_PROGRESS').is('transaction_id', null).select('id');
          if (linked.error) throw linked.error;
          if (linked.data?.length !== 1) throw new Error(t('وضعیت درخواست تغییر کرده یا دسترسی ندارید.', 'Request changed or access was denied.'));
        }
        committed = true;
        setHeaderData(previous => ({ ...previous, ...result.data }));
        setItemsData(savedItems.map(item => ({ ...item, _tempId: crypto.randomUUID(),
          deposit_amount: logic.amount(item.deposit_amount), withdrawal_amount: logic.amount(item.withdrawal_amount) })));
        setAttachModal(previous => ({ ...previous, record: result.data }));
        setIsDirty(false);
        setHasSaved(true);
        setCopyWarning(null);
        if (linkedRequest && setRequestRecord) setRequestRecord({ ...linkedRequest, transaction_id: txId });
        if (creating && window.AutoNumberingService) await window.AutoNumberingService.consumeNext('TRANSACTIONS');
        await logAction(creating ? 'create_transaction' : (statusToSave !== headerData.status ? 'status_update' : 'update_transaction'),
          txId, t('ثبت تراکنش ', 'Save transaction ') + headerData.document_code +
            (linkedRequest ? ' / ' + linkedRequest.request_code : '') + ' / ' + actorName +
            (statusToSave !== headerData.status ? ' / ' + headerData.status + ' -> ' + statusToSave : '') +
            ' / ' + itemsData.length + t(' قلم', ' items'));
        showToast(linkedRequest
          ? t('تراکنش با کد ' + headerData.document_code + ' برای درخواست ' + linkedRequest.request_code + ' ثبت شد.',
              'Transaction ' + headerData.document_code + ' saved for request ' + linkedRequest.request_code + '.')
          : t('سند با موفقیت ثبت شد.', 'Transaction saved successfully.'));
      } catch (error) {
        let recovered = true;
        if ((touched || linkCleared) && !committed) {
          try {
            if (creating && touched) {
              const deleted = await supabase.from('fm_transactions').delete().eq('id', txId).select('id');
              if (deleted.error || deleted.data?.length !== 1) recovered = false;
            } else if (touched) {
              if (itemsTouched) {
                const deleted = await supabase.from('fm_transaction_items').delete().eq('transaction_id', txId);
                if (deleted.error) throw deleted.error;
                if (original.fm_transaction_items.length) {
                  const restored = await supabase.from('fm_transaction_items').insert(original.fm_transaction_items).select('id');
                  if (restored.error || restored.data.length !== original.fm_transaction_items.length) throw restored.error || new Error('Incomplete recovery');
                }
              }
              // Keep Babel's object-rest exclusion constant out of the shared script scope.
              const originalHeader = Object.assign({}, original);
              delete originalHeader.fm_transaction_items;
              const restored = await supabase.from('fm_transactions').update(originalHeader).eq('id', txId).select('id');
              if (restored.error || restored.data?.length !== 1) recovered = false;
            }
            if (linkCleared && recovered) {
              const restored = await supabase.from('req_requests').update({ transaction_id: txId })
                .eq('id', linkedRequest.id).eq('status', 'IN_PROGRESS').is('transaction_id', null).select('id');
              if (restored.error || restored.data?.length !== 1) recovered = false;
            }
          } catch { recovered = false; }
        }
        showToast(committed
          ? t('تراکنش ذخیره شد، اما ثبت لاگ یا شماره‌گذاری کامل نشد: ', 'Transaction saved, but logging or numbering failed: ') + error.message
          : !recovered ? t('ثبت و بازگردانی کامل نشد؛ پیش از تلاش مجدد تراکنش را بررسی کنید. ', 'Save and recovery failed; inspect the transaction before retrying. ') + error.message
          : error.message || t('خطا در ثبت تراکنش.', 'Transaction save failed.'), 'error');
      } finally {
        savingRef.current = false;
        setIsLoading(false);
      }
    };
    return handleSaveTransaction;
  };
  window.TransactionPersistence = { makeSaveHandler };
})();
