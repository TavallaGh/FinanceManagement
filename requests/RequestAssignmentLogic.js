/* Transaction responsibility uses the existing active users and user groups. */
(() => {
  const same = (a, b) => a != null && b != null && String(a) === String(b);
  const fields = ['transaction_assignee_user_id', 'transaction_assignee_group_id'];
  const selection = request => request?.[fields[0]]
    ? { kind: 'USER', id: request[fields[0]] }
    : request?.[fields[1]] ? { kind: 'GROUP', id: request[fields[1]] } : null;
  const key = choice => choice ? `${choice.kind}:${choice.id}` : '';
  const readAll = async buildQuery => {
    const rows = [];
    for (let offset = 0; ; offset += 500) {
      const result = await buildQuery().range(offset, offset + 499);
      if (result.error) throw result.error;
      rows.push(...result.data);
      if (result.data.length < 500) return rows;
    }
  };
  const loadOptions = async (supabase, t) => {
    const [users, groups] = await Promise.all([
      readAll(() => supabase.from('sec_users').select('id, full_name, username')
        .eq('is_active', true).order('id')),
      readAll(() => supabase.from('sec_user_groups').select('id, title, code')
        .eq('is_active', true).order('id')),
    ]);
    return [
      ...users.map(user => ({ kind: 'USER', id: user.id, title: user.full_name || user.username,
        code: user.username, kindLabel: t('کاربر', 'User') })),
      ...groups.map(group => ({ kind: 'GROUP', id: group.id, title: group.title || group.code,
        code: group.code, kindLabel: t('گروه کاربری', 'User Group') })),
    ].map(row => ({ ...row, key: key(row) }));
  };
  const validateChoice = async (supabase, choice, t) => {
    if (!choice?.id || !['USER', 'GROUP'].includes(choice.kind)) {
      throw new Error(t('در «ارجاع به»، کاربر یا گروه مسئول ثبت تراکنش را انتخاب کنید.',
        'Select the user or group responsible for the transaction in Assign To.'));
    }
    const result = await supabase.from(choice.kind === 'USER' ? 'sec_users' : 'sec_user_groups')
      .select(choice.kind === 'USER' ? 'id, full_name, username' : 'id, title, code')
      .eq('id', choice.id).eq('is_active', true).maybeSingle();
    if (result.error) throw result.error;
    if (!result.data) throw new Error(t('کاربر یا گروه انتخاب‌شده غیرفعال یا خارج از دسترس است.',
      'The selected user or group is inactive or inaccessible.'));
    return {
      patch: { [fields[0]]: choice.kind === 'USER' ? choice.id : null,
        [fields[1]]: choice.kind === 'GROUP' ? choice.id : null },
      label: choice.kind === 'USER' ? (result.data.full_name || result.data.username)
        : `${t('گروه', 'Group')}: ${result.data.title || result.data.code}`,
      kind: choice.kind, id: choice.id,
    };
  };
  const loadActor = async (supabase, userId) => {
    if (!userId) return { id: null, active: false, groupIds: [] };
    const user = await supabase.from('sec_users').select('id, is_active').eq('id', userId).maybeSingle();
    if (user.error) throw user.error;
    if (!user.data?.is_active) return { id: userId, active: false, groupIds: [] };
    const memberships = await readAll(() => supabase.from('sec_user_group_users')
      .select('group_id').eq('user_id', userId).order('group_id'));
    const ids = [...new Set(memberships.map(row => row.group_id))];
    const activeGroups = [];
    for (let offset = 0; offset < ids.length; offset += 100) {
      const result = await supabase.from('sec_user_groups').select('id').eq('is_active', true)
        .in('id', ids.slice(offset, offset + 100));
      if (result.error) throw result.error;
      activeGroups.push(...result.data.map(row => row.id));
    }
    return { id: userId, active: true, groupIds: activeGroups };
  };
  const mayCreate = (request, actor) => {
    if (!actor?.active) return false;
    const userId = request?.[fields[0]], groupId = request?.[fields[1]];
    if (!!userId === !!groupId) return false;
    return userId ? same(userId, actor.id) : actor.groupIds.some(id => same(id, groupId));
  };
  const assertCanCreate = async (supabase, request, userId, t) => {
    if (!mayCreate(request, await loadActor(supabase, userId))) {
      throw new Error(t('فقط کاربر ارجاع‌شده یا اعضای فعال گروه ارجاع‌شده می‌توانند تراکنش این درخواست را ثبت کنند.',
        'Only the assigned user or active members of the assigned group can create this transaction.'));
    }
  };
  const useActor = (supabase, userId, showToast, t) => {
    const { useState, useEffect } = window.React;
    const [actor, setActor] = useState(null);
    useEffect(() => {
      let generation = 0, disposed = false;
      const refresh = async () => {
        const current = ++generation;
        try {
          const value = await loadActor(supabase, userId);
          if (!disposed && generation === current) setActor(value);
        } catch (error) {
          if (!disposed && generation === current) {
            setActor(null);
            showToast(t('خطا در بررسی مسئول ثبت تراکنش: ', 'Could not check transaction responsibility: ') + error.message, 'error');
          }
        }
      };
      setActor(null);
      refresh();
      window.addEventListener('focus', refresh);
      return () => { disposed = true; window.removeEventListener('focus', refresh); };
    }, [supabase, userId, showToast, t]);
    return actor;
  };
  window.RequestAssignmentLogic = { fields, selection, key, loadOptions, validateChoice,
    loadActor, mayCreate, assertCanCreate, useActor };
})();
