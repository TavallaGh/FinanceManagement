/* Filename: workflow/StateMachineSettings.js */
(() => {
  const ASSIGNEE_TYPES = ['USER', 'ROLE', 'DYNAMIC'];
  const ASSIGNEE_TYPE_LABELS = {
    USER: { fa: 'کاربر سیستم', en: 'System User' },
    ROLE: { fa: 'سمت سازمانی', en: 'Organizational Role' },
    DYNAMIC: { fa: 'فرد مشخص', en: 'Specific Person' },
  };

  const DYNAMIC_ASSIGNEES = [
    { value: 'DIRECT_MANAGER', fa: 'مدیر مستقیم', en: 'Direct Manager' },
    { value: 'REQUESTER', fa: 'ثبت کننده درخواست', en: 'Requester' },
  ];

  const CONDITION_OPERATORS = ['=', '!=', '>', '>=', '<', '<=', 'contains'];
  const MAX_ASSIGNEE_CONDITIONS = 2;

  const DATA_ENTRY_FORMS = [
    { value: '', fa: 'هیچ کدام', en: 'None' },
    { value: 'AMOUNT_APPROVAL', fa: 'تعیین و تایید مبالغ', en: 'Amount Approval Form' },
    { value: 'ACCOUNT_SELECTION', fa: 'تعیین حساب ها', en: 'Account Selection Form' },
    { value: 'APPROVER_NOTE', fa: 'توضیحات انجام دهنده', en: 'Approver Note Form' },
    { value: 'REQUEST_COMMENT', fa: 'کامنت روی درخواست', en: 'Request Comment Form' },
  ];

  const CONDITION_FIELDS = [
    { value: 'request_type', fa: 'نوع درخواست', en: 'Request Type' },
    { value: 'status', fa: 'وضعیت درخواست', en: 'Request Status' },
    { value: 'payment_type', fa: 'نوع پرداخت', en: 'Payment Type' },
    { value: 'description', fa: 'شرح درخواست', en: 'Description' },
    { value: 'need_date', fa: 'تاریخ نیاز', en: 'Need Date' },
    { value: 'total_usd_amount', fa: 'جمع دلاری اقلام', en: 'Total USD Amount' },
    { value: 'items.description', fa: 'شرح اقلام', en: 'Item Description' },
    { value: 'items.currency', fa: 'ارز اقلام', en: 'Item Currency' },
    { value: 'items.transaction_action', fa: 'نوع تراکنش اقلام', en: 'Item Transaction Action' },
    { value: 'items.amount', fa: 'مبلغ اقلام', en: 'Item Amount' },
    { value: 'items.approved_amount', fa: 'مبلغ تایید شده اقلام', en: 'Item Approved Amount' },
  ];

  const createAssigneeCondition = () => ({
    id: crypto.randomUUID(),
    joinWithPrev: 'AND',
    field: 'total_usd_amount',
    operator: '>',
    value: '',
  });

  const createAssigneeBlock = () => ({
    id: crypto.randomUUID(),
    conditions: [],
    assignee_type: 'USER',
    assignee_value: '',
    fallback_assignee_type: '',
    fallback_assignee_value: '',
  });

  const normalizeAssigneeConditions = (conditions) => {
    const list = Array.isArray(conditions) ? conditions.slice(0, MAX_ASSIGNEE_CONDITIONS) : [];
    return list.map((condition, index) => ({
      ...condition,
      id: condition.id || crypto.randomUUID(),
      joinWithPrev: index === 0 ? 'AND' : (condition.joinWithPrev === 'OR' ? 'OR' : 'AND'),
      field: condition.field || 'total_usd_amount',
      operator: condition.operator || '>',
      value: condition.value ?? '',
    }));
  };

  const normalizeAssigneeBlocks = (blocks) => {
    const list = Array.isArray(blocks) && blocks.length ? blocks : [createAssigneeBlock()];
    return list.map((block) => ({
      ...block,
      id: block.id || crypto.randomUUID(),
      conditions: normalizeAssigneeConditions(block.conditions),
      assignee_type: block.assignee_type || 'USER',
      assignee_value: block.assignee_value || '',
      fallback_assignee_type: block.fallback_assignee_type || '',
      fallback_assignee_value: block.fallback_assignee_value || '',
    }));
  };

  const getAssigneeSettings = (node) => {
    const existing = node?.settings?.assignee;
    if (existing && Array.isArray(existing.blocks) && existing.blocks.length) {
      return {
        ...existing,
        blocks: normalizeAssigneeBlocks(existing.blocks),
      };
    }
    return {
      blocks: [createAssigneeBlock()],
      note: '',
    };
  };

  const getEdgeDataEntrySettings = (edge) => {
    const existing = edge?.settings?.data_entry;
    const validValues = new Set(DATA_ENTRY_FORMS.map(item => item.value).filter(Boolean));
    const forms = Array.isArray(existing?.forms)
      ? existing.forms.filter(value => validValues.has(value))
      : [];
    const selectedForm = forms[0] || '';
    return {
      selectedForm,
    };
  };

  const renderStateMachineSettingsModals = (props) => {
    const {
      language,
      isRtl,
      t,
      formCode,
      Modal,
      Button,
      SelectField,
      TextField,
      LOVField,
      Save,
      Plus,
      Trash2,
      Sparkles,
      nodeSettingsModal,
      modalDraft,
      closeNodeSettingsModal,
      activeModalNode,
      labelByValue,
      statusList,
      addAssigneeBlock,
      addConditionToBlock,
      getBlockExpression,
      removeAssigneeBlock,
      conditionFieldOptions,
      updateConditionInBlock,
      removeConditionFromBlock,
      assigneeTypeOptions,
      updateAssigneeBlock,
      usersLovData,
      usersLovColumns,
      resolveAssigneeLabel,
      rolesLovData,
      rolesLovColumns,
      byLanguage,
      fallbackAssigneeTypeOptions,
      resolveFallbackLabel,
      saveNodeSettingsModal,
      nodeDataEntryModal,
      closeNodeDataEntryModal,
      activeDataEntryModalNode,
      activeGraph,
      nodeById,
      nodeEdgeFormsDraft,
      selectNodeEdgeDataEntryForm,
      saveNodeDataEntryModal,
    } = props;

    return (
      <>
        <Modal
          isOpen={nodeSettingsModal.isOpen}
          onClose={closeNodeSettingsModal}
          title={`${t('تنظیم انجام‌دهنده', 'Status Assignee Settings')} | ${t('وضعیت انتخاب‌شده', 'Selected Status')}: ${activeModalNode ? labelByValue(statusList, activeModalNode.status) : '-'}`}
          language={language}
          width="max-w-5xl"
        >
          {nodeSettingsModal.isOpen && modalDraft && (
            <div className="p-4 space-y-3 max-h-[78vh] overflow-y-auto custom-scrollbar" dir={isRtl ? 'rtl' : 'ltr'}>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-[12px] font-bold text-slate-700 dark:text-slate-200">
                    {t('قوانین تعیین انجام‌دهنده', 'Assignee Routing Rules')}
                  </div>
                  <Button size="sm" variant="outline" icon={Plus} onClick={addAssigneeBlock}>{t('افزودن بلوک', 'Add Block')}</Button>
                </div>

                {(modalDraft.assignee.blocks || []).map((block, blockIndex) => (
                  <div key={block.id} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
                    <div className="px-2.5 py-1.5 border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/40 flex flex-wrap gap-1.5 items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="text-[12px] font-bold text-slate-700 dark:text-slate-200">
                          {t('بلوک', 'Block')} {blockIndex + 1}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          icon={Plus}
                          className="!h-7 !py-0 !px-2.5 !text-[11px]"
                          onClick={() => addConditionToBlock(block.id)}
                          disabled={(block.conditions || []).length >= MAX_ASSIGNEE_CONDITIONS}
                        >
                          {t('افزودن شرط', 'Add Condition')}
                        </Button>
                        <button
                          type="button"
                          className="h-7 w-7 inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-200 hover:border-indigo-300 hover:text-indigo-700 cursor-help"
                          title={getBlockExpression(block)}
                          aria-label={t('نمایش عبارت شرط', 'Show condition expression')}
                        >
                          <Sparkles size={14} />
                        </button>
                        <Button size="sm" variant="ghost" icon={Trash2} className="!h-7 !py-0 !px-2 !text-[11px]" onClick={() => removeAssigneeBlock(block.id)}>{t('حذف بلوک', 'Remove Block')}</Button>
                      </div>
                    </div>

                    <div className="p-3 space-y-3">
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center gap-2 px-1">
                          <span className="h-2 w-2 rounded-full bg-sky-500" aria-hidden="true" />
                          <div className="text-[11px] font-extrabold tracking-wide uppercase text-sky-700 dark:text-sky-300">
                            {t('شرط‌ها', 'Conditions')}
                          </div>
                        </div>
                        {(block.conditions || []).map((condition, conditionIndex) => (
                          <div key={condition.id} className="grid grid-cols-1 md:grid-cols-[1fr_1.6fr_1fr_1.6fr_44px] gap-2 items-end">
                            <SelectField
                              formCode={formCode}
                              size="sm"
                              label={t('منطق', 'Logic')}
                              value={conditionIndex === 0 ? 'AND' : (condition.joinWithPrev || 'AND')}
                              onChange={(event) => updateConditionInBlock(block.id, condition.id, { joinWithPrev: event.target.value })}
                              options={[{ value: 'AND', label: 'AND' }, { value: 'OR', label: 'OR' }]}
                              isRtl={isRtl}
                              disabled={conditionIndex === 0}
                            />
                            <SelectField
                              formCode={formCode}
                              size="sm"
                              label={t('فیلد', 'Field')}
                              value={condition.field}
                              onChange={(event) => updateConditionInBlock(block.id, condition.id, { field: event.target.value })}
                              options={conditionFieldOptions}
                              isRtl={isRtl}
                            />
                            <SelectField
                              formCode={formCode}
                              size="sm"
                              label={t('عملگر', 'Operator')}
                              value={condition.operator}
                              onChange={(event) => updateConditionInBlock(block.id, condition.id, { operator: event.target.value })}
                              options={CONDITION_OPERATORS.map(op => ({ value: op, label: op }))}
                              isRtl={isRtl}
                            />
                            <TextField
                              formCode={formCode}
                              size="sm"
                              label={t('مقدار', 'Value')}
                              value={condition.value || ''}
                              onChange={(event) => updateConditionInBlock(block.id, condition.id, { value: event.target.value })}
                              isRtl={isRtl}
                            />
                            <Button size="sm" variant="ghost" icon={Trash2} onClick={() => removeConditionFromBlock(block.id, condition.id)} />
                          </div>
                        ))}
                      </div>

                      <div className="space-y-2 pt-2">
                        <div className="flex items-center gap-2 px-1">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
                          <div className="text-[11px] font-extrabold tracking-wide uppercase text-emerald-700 dark:text-emerald-300">
                            {t('انجام‌دهنده و جانشین', 'Assignee and Fallback')}
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.6fr_1fr_1.6fr_44px] gap-2 items-end">
                          <SelectField
                            formCode={formCode}
                            size="sm"
                            label={t('نوع انجام‌دهنده', 'Assignee Type')}
                            value={block.assignee_type || 'USER'}
                            onChange={(event) => updateAssigneeBlock(block.id, { assignee_type: event.target.value, assignee_value: '' })}
                            options={assigneeTypeOptions}
                            isRtl={isRtl}
                          />

                          {block.assignee_type === 'USER' ? (
                            <LOVField
                              size="sm"
                              label={t('کاربر سیستم', 'System User')}
                              data={usersLovData}
                              columns={usersLovColumns}
                              displayValue={resolveAssigneeLabel('USER', block.assignee_value)}
                              onChange={(row) => updateAssigneeBlock(block.id, { assignee_value: row?.id || '' })}
                              dropdownWidth="min-w-[460px]"
                              isRtl={isRtl}
                            />
                          ) : block.assignee_type === 'ROLE' ? (
                            <LOVField
                              size="sm"
                              label={t('سمت سازمانی', 'Organizational Role')}
                              data={rolesLovData}
                              columns={rolesLovColumns}
                              displayValue={resolveAssigneeLabel('ROLE', block.assignee_value)}
                              onChange={(row) => updateAssigneeBlock(block.id, { assignee_value: row?.id || '' })}
                              dropdownWidth="min-w-[460px]"
                              isRtl={isRtl}
                            />
                          ) : (
                            <SelectField
                              formCode={formCode}
                              size="sm"
                              label={t('فرد مشخص', 'Specific Person')}
                              value={block.assignee_value || ''}
                              onChange={(event) => updateAssigneeBlock(block.id, { assignee_value: event.target.value })}
                              options={DYNAMIC_ASSIGNEES.map(item => ({ value: item.value, label: byLanguage(item.fa, item.en) }))}
                              isRtl={isRtl}
                            />
                          )}

                          <SelectField
                            formCode={formCode}
                            size="sm"
                            label={t('نوع جانشین', 'Fallback Type')}
                            value={block.fallback_assignee_type || ''}
                            onChange={(event) => updateAssigneeBlock(block.id, { fallback_assignee_type: event.target.value, fallback_assignee_value: '' })}
                            options={fallbackAssigneeTypeOptions}
                            isRtl={isRtl}
                          />

                          {block.fallback_assignee_type === 'USER' ? (
                            <LOVField
                              size="sm"
                              label={t('جانشین (کاربر سیستم)', 'Fallback (System User)')}
                              data={usersLovData}
                              columns={usersLovColumns}
                              displayValue={resolveFallbackLabel('USER', block.fallback_assignee_value)}
                              onChange={(row) => updateAssigneeBlock(block.id, { fallback_assignee_value: row?.id || '' })}
                              dropdownWidth="min-w-[460px]"
                              isRtl={isRtl}
                            />
                          ) : block.fallback_assignee_type === 'ROLE' ? (
                            <LOVField
                              size="sm"
                              label={t('جانشین (سمت)', 'Fallback (Role)')}
                              data={rolesLovData}
                              columns={rolesLovColumns}
                              displayValue={resolveFallbackLabel('ROLE', block.fallback_assignee_value)}
                              onChange={(row) => updateAssigneeBlock(block.id, { fallback_assignee_value: row?.id || '' })}
                              dropdownWidth="min-w-[460px]"
                              isRtl={isRtl}
                            />
                          ) : block.fallback_assignee_type === 'DYNAMIC' ? (
                            <SelectField
                              formCode={formCode}
                              size="sm"
                              label={t('جانشین (فرد مشخص)', 'Fallback (Specific Person)')}
                              value={block.fallback_assignee_value || ''}
                              onChange={(event) => updateAssigneeBlock(block.id, { fallback_assignee_value: event.target.value })}
                              options={DYNAMIC_ASSIGNEES.map(item => ({ value: item.value, label: byLanguage(item.fa, item.en) }))}
                              isRtl={isRtl}
                            />
                          ) : (
                            <div />
                          )}
                          <div />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-200 dark:border-slate-700 pt-3">
                <Button size="sm" variant="outline" onClick={closeNodeSettingsModal}>{t('انصراف', 'Cancel')}</Button>
                <Button size="sm" variant="primary" icon={Save} onClick={saveNodeSettingsModal}>{t('ذخیره انجام‌دهنده', 'Save Assignee Rules')}</Button>
              </div>
            </div>
          )}
        </Modal>

        <Modal
          isOpen={nodeDataEntryModal.isOpen}
          onClose={closeNodeDataEntryModal}
          title={`${t('فرم‌های خطوط خروجی', 'Outgoing Edge Forms')} | ${t('وضعیت انتخاب‌شده', 'Selected Status')}: ${activeDataEntryModalNode ? labelByValue(statusList, activeDataEntryModalNode.status) : '-'}`}
          language={language}
          width="max-w-lg"
        >
          {nodeDataEntryModal.isOpen && activeDataEntryModalNode && (
            <div className="p-4 space-y-4" dir={isRtl ? 'rtl' : 'ltr'}>
              <div className="grid grid-cols-12 gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-400 pb-1 border-b border-slate-200 dark:border-slate-700">
                <div className="col-span-5">{t('وضعیت مقصد', 'Target Status')}</div>
                <div className="col-span-7">{t('فرم اطلاعاتی', 'Data-entry Form')}</div>
              </div>

              <div className="space-y-2">
                {activeGraph.edges.filter(edge => edge.source === activeDataEntryModalNode.id).length === 0 && (
                  <div className="text-[12px] text-slate-500 dark:text-slate-400">
                    {t('هیچ خط خروجی از این وضعیت وجود ندارد.', 'No outgoing edge exists for this status.')}
                  </div>
                )}
                {activeGraph.edges.filter(edge => edge.source === activeDataEntryModalNode.id).map(edge => {
                  const targetNode = nodeById[edge.target];
                  const targetLabel = targetNode ? labelByValue(statusList, targetNode.status) : '-';
                  const selectedForm = nodeEdgeFormsDraft[edge.id] ?? '';
                  return (
                    <div key={edge.id} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-5 text-[12px] font-medium text-slate-700 dark:text-slate-200">
                        {targetLabel}
                      </div>
                      <div className="col-span-7">
                        <SelectField
                          formCode={formCode}
                          size="sm"
                          label=""
                          value={selectedForm}
                          onChange={(event) => selectNodeEdgeDataEntryForm(edge.id, event.target.value)}
                          options={DATA_ENTRY_FORMS.map(item => ({ value: item.value, label: byLanguage(item.fa, item.en) }))}
                          isRtl={isRtl}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-200 dark:border-slate-700 pt-3">
                <Button size="sm" variant="outline" onClick={closeNodeDataEntryModal}>{t('انصراف', 'Cancel')}</Button>
                <Button size="sm" variant="primary" icon={Save} onClick={saveNodeDataEntryModal}>{t('ذخیره تنظیم اطلاعات', 'Save Data Settings')}</Button>
              </div>
            </div>
          )}
        </Modal>
      </>
    );
  };

  window.StateMachineSettingsModule = {
    ASSIGNEE_TYPES,
    ASSIGNEE_TYPE_LABELS,
    DYNAMIC_ASSIGNEES,
    CONDITION_OPERATORS,
    MAX_ASSIGNEE_CONDITIONS,
    DATA_ENTRY_FORMS,
    CONDITION_FIELDS,
    createAssigneeCondition,
    createAssigneeBlock,
    normalizeAssigneeConditions,
    normalizeAssigneeBlocks,
    getAssigneeSettings,
    getEdgeDataEntrySettings,
    renderStateMachineSettingsModals,
  };
})();