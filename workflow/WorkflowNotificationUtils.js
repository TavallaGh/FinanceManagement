/* Filename: workflow/WorkflowNotificationUtils.js */
(() => {
  const normalizeRecipientRows = (recipients) => {
    if (!Array.isArray(recipients)) return [];
    const seen = new Set();
    const rows = [];

    recipients.forEach((item) => {
      if (!item) return;
      const userId = typeof item === 'string'
        ? item
        : (item.user_id || item.userId || item.id || '');
      const safeUserId = String(userId || '').trim();
      if (!safeUserId || seen.has(safeUserId)) return;
      seen.add(safeUserId);
      rows.push({
        user_id: safeUserId,
        label: typeof item === 'object' ? String(item.label || item.name || '').trim() : '',
      });
    });

    return rows;
  };

  const buildOpenRecordPayload = ({
    entityType,
    entityId,
    entityTitle,
    formComponent,
    action = 'open_record',
    extra = {},
  }) => {
    return {
      action,
      entity_type: String(entityType || '').toLowerCase(),
      entity_id: String(entityId || ''),
      entity_title: entityTitle || '',
      form_component: formComponent || '',
      ...extra,
    };
  };

  const sendWorkflowAssignmentNotifications = async ({
    supabase,
    recipients,
    actorUserId = null,
    titleFa = 'ارجاع تایید',
    titleEn = 'Approval Assignment',
    messageFa = '',
    messageEn = '',
    type = 'info',
    entityType,
    entityId,
    entityTitle,
    formComponent,
    action = 'open_record',
    actionPayloadExtra = {},
  }) => {
    if (!supabase) return 0;

    const actorId = actorUserId == null ? '' : String(actorUserId);
    const targetRows = normalizeRecipientRows(recipients).filter((row) => String(row.user_id) !== actorId);
    if (!targetRows.length) return 0;

    const actionPayload = buildOpenRecordPayload({
      entityType,
      entityId,
      entityTitle,
      formComponent,
      action,
      extra: actionPayloadExtra,
    });

    const message = {
      fa: String(messageFa || '').trim(),
      en: String(messageEn || '').trim(),
    };

    const rowsToInsert = targetRows.map((row) => ({
      user_id: row.user_id,
      title: titleFa || titleEn || 'Notification',
      message: message.fa || message.en || `${titleEn || 'Approval Assignment'}: ${entityTitle || entityId || ''}`,
      type,
      action_payload: {
        ...actionPayload,
        assignee_label: row.label || null,
      },
    }));

    const { error } = await supabase.from('system_notifications').insert(rowsToInsert);
    if (error) throw error;
    return rowsToInsert.length;
  };

  window.WorkflowNotificationUtils = {
    normalizeRecipientRows,
    buildOpenRecordPayload,
    sendWorkflowAssignmentNotifications,
  };
})();
