/* Filename: workflow/WorkflowCartable.js */
(() => {
	const React = window.React;
	const { useState, useMemo, useEffect, useCallback } = React;

	function FallbackComponent() { return null; }
	const FallbackIcon = ({ size = 16 }) => React.createElement('span', { style: { display: 'inline-block', width: size, height: size } });

	const safeComp = (obj, name) => {
		const c = obj && obj[name];
		if (typeof c === 'function' || (c && c.$$typeof)) return c;
		if (c && c.default && (typeof c.default === 'function' || c.default.$$typeof)) return c.default;
		return FallbackComponent;
	};

	const safeIcon = (obj, name) => {
		const c = obj && obj[name];
		if (typeof c === 'function' || (c && c.$$typeof)) return c;
		if (c && c.default) return c.default;
		return FallbackIcon;
	};

	const DS = window.DesignSystem || {};
	const Core = window.DSCore || DS;
	const Grid = window.DSGrid || DS;
	const Forms = window.DSForms || DS;
	const Feedback = window.DSFeedback || window.DSOverlays || DS;

	const Button = safeComp(Core, 'Button');
	const Badge = safeComp(Core, 'Badge');
	const PageHeader = safeComp(Core, 'PageHeader');
	const EmptyState = safeComp(Core, 'EmptyState');
	const DataGrid = safeComp(Grid, 'DataGrid');
	const AdvancedFilter = safeComp(Grid, 'AdvancedFilter');
	const Modal = safeComp(Feedback, 'Modal');
	const Toast = safeComp(Feedback, 'Toast');
	const SelectField = safeComp(Forms, 'SelectField');
	const TextField = safeComp(Forms, 'TextField');

	const LucideIcons = window.LucideIcons || {};
	const Inbox = safeIcon(LucideIcons, 'Inbox');
	const RefreshCw = safeIcon(LucideIcons, 'RefreshCw');
	const Send = safeIcon(LucideIcons, 'Send');
	const CheckCircle2 = safeIcon(LucideIcons, 'CheckCircle2');
	const ArrowUpRight = safeIcon(LucideIcons, 'ArrowUpRight');
	const AlertTriangle = safeIcon(LucideIcons, 'AlertTriangle');
	const Sparkles = safeIcon(LucideIcons, 'Sparkles');

	const getSessionUser = () => {
		try {
			const raw = sessionStorage.getItem('fm_user_session') || localStorage.getItem('fm_user_session') || '{}';
			const parsed = JSON.parse(raw);
			return parsed && typeof parsed === 'object' ? parsed : {};
		} catch {
			return {};
		}
	};

	const normalizeRoleTokens = (rawRoles) => {
		if (!rawRoles) return [];
		if (Array.isArray(rawRoles)) return rawRoles.map(x => String(x || '').trim()).filter(Boolean);
		const raw = String(rawRoles || '').trim();
		if (!raw) return [];
		if (raw.startsWith('[') && raw.endsWith(']')) {
			try {
				const parsed = JSON.parse(raw);
				if (Array.isArray(parsed)) return parsed.map(x => String(x || '').trim()).filter(Boolean);
			} catch {}
		}
		return raw.split(',').map(x => String(x || '').trim()).filter(Boolean);
	};

	const isMissingRelation = (error) => {
		const msg = String(error?.message || '').toLowerCase();
		const details = String(error?.details || '').toLowerCase();
		const hint = String(error?.hint || '').toLowerCase();
		return error?.code === '42P01'
			|| error?.code === 'PGRST205'
			|| msg.includes('does not exist')
			|| msg.includes('could not find the table')
			|| details.includes('does not exist')
			|| hint.includes('wf_state_machine_work_items');
	};

	const ENTITY_TO_FORMS = {
		fm_transactions: ['TransactionMain', 'TransactionReview'],
		req_requests: ['RequestManagement'],
		organization_info: ['OrganizationInfo'],
		parties: ['Parties'],
		fm_coa_charts: ['ChartOfAccountsMain'],
		fm_coa_accounts: ['ChartOfAccountsMain'],
		fm_brokers: ['BrokerManagement'],
		fm_broker_contracts: ['BrokerContract'],
		bt_bugs: ['BugTracker'],
	};

	const WorkflowCartable = ({ language = 'fa', formCode = 'WF_CARTABLE' }) => {
		const isRtl = language === 'fa';
		const t = useCallback((fa, en) => (isRtl ? fa : en), [isRtl]);
		const supabase = window.supabase;
		const workflowEngine = window.WorkflowEngine;

		const sessionUser = getSessionUser();
		const currentUserId = sessionUser?.id || null;

		const [isLoading, setIsLoading] = useState(false);
		const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' });
		const [sourceWarnings, setSourceWarnings] = useState([]);
		const [roleIds, setRoleIds] = useState([]);
		const [roleCodes, setRoleCodes] = useState([]);
		const [usersMap, setUsersMap] = useState({});
		const [entitiesMap, setEntitiesMap] = useState({});
		const [wfRows, setWfRows] = useState([]);
		const [smRows, setSmRows] = useState([]);

		const [mailbox, setMailbox] = useState('INBOX');
		const [filters, setFilters] = useState({});
		const [gridState, setGridState] = useState(null);

		const [completeModal, setCompleteModal] = useState({
			isOpen: false,
			row: null,
			actionTaken: 'DONE',
			note: '',
			isSubmitting: false,
		});

		const showToast = useCallback((message, type = 'success') => {
			setToast({ isVisible: true, message, type });
			setTimeout(() => setToast(prev => ({ ...prev, isVisible: false })), 3200);
		}, []);

		const buildTaskCode = useCallback((prefix, id, assignedAt) => {
			const safePrefix = String(prefix || '').trim() || 'WK';
			const safeId = String(id || '').trim();
			const shortId = safeId.length > 8 ? safeId.slice(0, 8) : safeId || 'NA';
			const datePart = assignedAt ? String(new Date(assignedAt).getTime()).slice(-6) : '000000';
			return `${safePrefix}-${shortId}-${datePart}`;
		}, []);

		const fetchLookups = useCallback(async () => {
			if (!supabase || !currentUserId) return;

			const nextWarnings = [];

			try {
				const [rolesRes, usersRes, entitiesRes] = await Promise.all([
					supabase.from('sec_user_roles').select('role_id').eq('user_id', currentUserId),
					supabase.from('sec_users').select('id, full_name, username'),
					supabase.from('sys_entities').select('entity_code, name_fa, name_en'),
				]);

				if (!rolesRes.error) {
					const ids = (rolesRes.data || []).map(row => String(row.role_id || '')).filter(Boolean);
					setRoleIds(ids);
					if (ids.length) {
						const { data: secRoles, error: secRolesError } = await supabase
							.from('sec_roles')
							.select('id, code')
							.in('id', ids);
						if (!secRolesError) setRoleCodes((secRoles || []).map(row => String(row.code || '').trim()).filter(Boolean));
					}
				}

				if (rolesRes.error) nextWarnings.push(t('نقش‌های کاربر قابل خواندن نبود.', 'Could not load user roles.'));

				if (!usersRes.error) {
					const map = {};
					(usersRes.data || []).forEach(user => {
						map[String(user.id)] = user.full_name || user.username || String(user.id);
					});
					setUsersMap(map);
				} else {
					nextWarnings.push(t('نام کاربران برای نمایش کامل در دسترس نیست.', 'User names are not available for display.'));
				}

				if (!entitiesRes.error) {
					const map = {};
					(entitiesRes.data || []).forEach(entity => {
						map[String(entity.entity_code || '').toLowerCase()] = {
							fa: entity.name_fa || entity.entity_code,
							en: entity.name_en || entity.name_fa || entity.entity_code,
						};
					});
					setEntitiesMap(map);
				}
			} catch (error) {
				console.error('WorkflowCartable fetchLookups error:', error);
				nextWarnings.push(t('دریافت اطلاعات پایه کارتابل با خطا مواجه شد.', 'Loading cartable metadata failed.'));
			}

			setSourceWarnings(nextWarnings);
		}, [currentUserId, supabase, t]);

		const fetchWorkflowTasks = useCallback(async () => {
			if (!supabase || !currentUserId) return [];
			const { data, error } = await supabase
				.schema('wf')
				.from('wf_tasks')
				.select(`
					id,
					instance_id,
					node_id,
					task_type,
					status,
					assignee_roles,
					delegated_to,
					assigned_to,
					action_taken,
					comments,
					due_date,
					created_at,
					completed_at,
					wf_instances (
						id,
						entity_type,
						record_id,
						status,
						created_by,
						workflow_id,
						wf_definitions (id, title)
					)
				`)
				.order('created_at', { ascending: false });

			if (error) throw error;
			return data || [];
		}, [currentUserId, supabase]);

		const fetchStateMachineWorkItems = useCallback(async () => {
			if (!supabase || !currentUserId) return { rows: [], warning: '' };

			const unifiedRes = await supabase
				.from('wf_work_items')
				.select('*')
				.eq('source_type', 'STATE_MACHINE')
				.order('assigned_at', { ascending: false });

			if (!unifiedRes.error) {
				return { rows: unifiedRes.data || [], warning: '' };
			}

			if (!isMissingRelation(unifiedRes.error)) {
				throw unifiedRes.error;
			}

			// Backward-compatible fallback for environments that still use legacy table.
			const legacyRes = await supabase
				.from('wf_state_machine_work_items')
				.select('*')
				.order('created_at', { ascending: false });

			if (!legacyRes.error) {
				return { rows: legacyRes.data || [], warning: '' };
			}

			if (!isMissingRelation(legacyRes.error)) {
				throw legacyRes.error;
			}

			return {
				rows: [],
				warning: t(
					'منبع کارهای State Machine هنوز ایجاد نشده است. یکی از جدول‌های wf_work_items یا wf_state_machine_work_items را ایجاد کنید.',
					'State-machine work-item source is not ready. Create either wf_work_items or wf_state_machine_work_items.'
				),
			};
		}, [currentUserId, supabase, t]);

		const loadData = useCallback(async () => {
			if (!supabase || !currentUserId) return;
			setIsLoading(true);
			try {
				const warnings = [];
				const [wfResult, smResult] = await Promise.allSettled([
					fetchWorkflowTasks(),
					fetchStateMachineWorkItems(),
				]);

				if (wfResult.status === 'fulfilled') {
					setWfRows(wfResult.value || []);
				} else {
					setWfRows([]);
					warnings.push(t('دریافت تسک‌های Workflow با خطا مواجه شد.', 'Loading workflow tasks failed.'));
					console.error('WorkflowCartable workflow source error:', wfResult.reason);
				}

				if (smResult.status === 'fulfilled') {
					setSmRows(smResult.value.rows || []);
					if (smResult.value.warning) warnings.push(smResult.value.warning);
				} else {
					setSmRows([]);
					warnings.push(t('دریافت تسک‌های State Machine با خطا مواجه شد.', 'Loading state-machine tasks failed.'));
					console.error('WorkflowCartable state-machine source error:', smResult.reason);
				}

				setSourceWarnings(prev => {
					const base = (prev || []).filter(msg => !String(msg || '').includes('State Machine') && !String(msg || '').includes('state-machine'));
					return base.concat(warnings);
				});
			} catch (error) {
				console.error('WorkflowCartable loadData error:', error);
				showToast(t('خطا در دریافت اطلاعات کارتابل.', 'Failed to load cartable data.'), 'error');
			} finally {
				setIsLoading(false);
			}
		}, [currentUserId, fetchStateMachineWorkItems, fetchWorkflowTasks, showToast, supabase, t]);

		useEffect(() => {
			fetchLookups();
		}, [fetchLookups]);

		useEffect(() => {
			loadData();
		}, [loadData]);

		const roleTokenSet = useMemo(() => {
			const set = new Set();
			roleIds.forEach(id => set.add(String(id)));
			roleCodes.forEach(code => set.add(String(code)));
			return set;
		}, [roleCodes, roleIds]);

		const wfItems = useMemo(() => {
			return (wfRows || []).map((row) => {
				const instance = row.wf_instances || {};
				const definition = instance.wf_definitions || {};
				const entityType = String(instance.entity_type || '').toLowerCase();

				const roleTokens = normalizeRoleTokens(row.assignee_roles);
				const roleMatch = roleTokens.length === 0 || roleTokens.some(token => roleTokenSet.has(String(token)) || String(token) === String(currentUserId));

				const delegatedToMe = String(row.delegated_to || '') === String(currentUserId || '');
				const completedByMe = String(row.assigned_to || '') === String(currentUserId || '');
				const assignedByMe = String(instance.created_by || '') === String(currentUserId || '');
				const isAssignedToMe = delegatedToMe || roleMatch;

				const isClosed = String(row.status || '').toUpperCase() === 'COMPLETED';

				return {
					row_id: `WF_${row.id}`,
					work_item_code: buildTaskCode('WF', row.id, row.created_at),
					source_type: 'WORKFLOW',
					source_label: 'BPMS',
					source_badge_variant: 'indigo',
					task_id: row.id,
					instance_id: row.instance_id,
					node_id: row.node_id,
					task_status: isClosed ? 'DONE' : 'OPEN',
					task_status_raw: row.status || '-',
					action_taken: row.action_taken || '',
					due_date: row.due_date || null,
					created_at: row.created_at || null,
					completed_at: row.completed_at || null,
					assigned_to_user_id: delegatedToMe ? currentUserId : null,
					assigned_to_label: delegatedToMe ? (usersMap[currentUserId] || t('شما', 'You')) : roleTokens.join(', '),
					sender_user_id: instance.created_by || null,
					sender_label: usersMap[String(instance.created_by || '')] || String(instance.created_by || '-') || '-',
					completed_by_user_id: row.assigned_to || null,
					completed_by_label: usersMap[String(row.assigned_to || '')] || (row.assigned_to ? String(row.assigned_to) : '-'),
					subject: definition.title || t('تسک گردش کار', 'Workflow Task'),
					entity_type: entityType,
					entity_code: entityType,
					entity_label: entitiesMap[entityType] ? (isRtl ? entitiesMap[entityType].fa : entitiesMap[entityType].en) : entityType,
					entity_id: instance.record_id || '',
					record_code: instance.record_id || '-',
					record_title: `${t('رکورد', 'Record')} #${instance.record_id || '-'}`,
					form_component: (ENTITY_TO_FORMS[entityType] || [])[0] || '',
					open_payload: {
						form_component: (ENTITY_TO_FORMS[entityType] || [])[0] || '',
						entity_type: entityType,
						entity_id: instance.record_id || '',
					},
					mailbox_flags: {
						isAssignedToMe,
						assignedByMe,
						completedByMe,
						isClosed,
						isNew: !!row.created_at && (Date.now() - new Date(row.created_at).getTime()) <= (24 * 60 * 60 * 1000),
					},
				};
			});
		}, [buildTaskCode, currentUserId, entitiesMap, isRtl, roleTokenSet, t, usersMap, wfRows]);

		const smItems = useMemo(() => {
			return (smRows || []).map((row) => {
				const entityType = String(row.entity_type || row.entity_code || '').toLowerCase();
				const roleRaw = String(row?.metadata?.assigned_to_role_raw || '').trim();
				const assignedToMe = String(row.assigned_to_user_id || '') === String(currentUserId || '')
					|| (!!row.assigned_to_role_id && roleTokenSet.has(String(row.assigned_to_role_id)))
					|| (!!roleRaw && roleTokenSet.has(roleRaw));
				const rawStatus = String(row.status || row.current_status || row.to_status || '').toUpperCase();
				const isClosed = row.is_closed === true || !!row.closed_at || ['DONE', 'CLOSED', 'COMPLETED'].includes(rawStatus);
				const completedByMe = String(row.closed_by_user_id || '') === String(currentUserId || '');
				const assignedByMe = String(row.assigned_by_user_id || '') === String(currentUserId || '');

				return {
					row_id: `SM_${row.id}`,
					work_item_code: buildTaskCode('SM', row.id, row.assigned_at || row.created_at),
					source_type: 'STATE_MACHINE',
					source_label: t('روال تاییدات', 'Approval Flow'),
					source_badge_variant: 'emerald',
					task_id: row.id,
					instance_id: row.instance_id || row.state_machine_instance_id || null,
					node_id: row.node_id || null,
					task_status: isClosed ? 'DONE' : 'OPEN',
					task_status_raw: row.status || row.current_status || row.to_status || '-',
					action_taken: row.action_taken || row.close_action || '',
					due_date: row.due_at || row.due_date || null,
					created_at: row.created_at || null,
					completed_at: row.closed_at || row.completed_at || null,
					assigned_to_user_id: row.assigned_to_user_id || null,
					assigned_to_label: row.assigned_to_label || usersMap[String(row.assigned_to_user_id || '')] || '-',
					sender_user_id: row.assigned_by_user_id || null,
					sender_label: row.assigned_by_label || usersMap[String(row.assigned_by_user_id || '')] || '-',
					completed_by_user_id: row.closed_by_user_id || null,
					completed_by_label: usersMap[String(row.closed_by_user_id || '')] || '-',
					subject: row.subject || row.machine_title || row.record_title || t('تسک روال تاییدات', 'State-Machine Task'),
					entity_type: entityType,
					entity_code: entityType,
					entity_label: entitiesMap[entityType] ? (isRtl ? entitiesMap[entityType].fa : entitiesMap[entityType].en) : entityType,
					entity_id: row.entity_id || row.record_id || '',
					record_code: row.record_code || row.record_id || row.entity_id || '-',
					record_title: row.record_title || row.entity_title || `${t('رکورد', 'Record')} #${row.record_id || row.entity_id || '-'}`,
					form_component: row.form_component || (ENTITY_TO_FORMS[entityType] || [])[0] || '',
					open_payload: {
						form_component: row.form_component || (ENTITY_TO_FORMS[entityType] || [])[0] || '',
						entity_type: entityType,
						entity_id: row.entity_id || row.record_id || '',
					},
					mailbox_flags: {
						isAssignedToMe: assignedToMe,
						assignedByMe,
						completedByMe,
						isClosed,
						isNew: !!row.created_at && (Date.now() - new Date(row.created_at).getTime()) <= (24 * 60 * 60 * 1000),
					},
				};
			});
		}, [buildTaskCode, currentUserId, entitiesMap, isRtl, roleTokenSet, smRows, t, usersMap]);

		const allItems = useMemo(() => {
			const merged = [...wfItems, ...smItems];
			merged.sort((a, b) => {
				const ad = new Date(a.created_at || 0).getTime();
				const bd = new Date(b.created_at || 0).getTime();
				return bd - ad;
			});
			return merged;
		}, [smItems, wfItems]);

		const mailboxPredicates = useMemo(() => ({
			INBOX: (row) => row.mailbox_flags.isAssignedToMe && !row.mailbox_flags.isClosed,
			NEW: (row) => row.mailbox_flags.isAssignedToMe && row.mailbox_flags.isNew,
			ASSIGNED_TO_ME: (row) => row.mailbox_flags.isAssignedToMe,
			SENT_BY_ME: (row) => row.mailbox_flags.assignedByMe,
			DONE_BY_ME: (row) => row.mailbox_flags.completedByMe,
			CLOSED: (row) => row.mailbox_flags.isClosed,
		}), []);

		const mailboxCounts = useMemo(() => {
			const counts = {};
			Object.keys(mailboxPredicates).forEach(key => {
				counts[key] = allItems.filter(mailboxPredicates[key]).length;
			});
			return counts;
		}, [allItems, mailboxPredicates]);

		const entityOptions = useMemo(() => {
			const seen = new Set(allItems.map(item => String(item.entity_type || '').toLowerCase()).filter(Boolean));
			return [{ value: '', label: t('همه', 'All') }].concat(
				Array.from(seen).sort().map(value => ({
					value,
					label: entitiesMap[value] ? (isRtl ? entitiesMap[value].fa : entitiesMap[value].en) : value,
				}))
			);
		}, [allItems, entitiesMap, isRtl, t]);

		const filterFields = useMemo(() => ([
			{
				name: 'source_type',
				label: t('منبع', 'Source'),
				type: 'select',
				options: [
					{ value: '', label: t('همه', 'All') },
					{ value: 'WORKFLOW', label: 'BPMS' },
					{ value: 'STATE_MACHINE', label: t('روال تاییدات', 'Approval Flow') },
				],
			},
			{
				name: 'task_status',
				label: t('وضعیت تسک', 'Task Status'),
				type: 'select',
				options: [
					{ value: '', label: t('همه', 'All') },
					{ value: 'OPEN', label: t('باز', 'Open') },
					{ value: 'DONE', label: t('بسته/انجام‌شده', 'Done/Closed') },
				],
			},
			{
				name: 'entity_type',
				label: t('موجودیت', 'Entity'),
				type: 'select',
				options: entityOptions,
			},
			{
				name: 'search_text',
				label: t('جستجو', 'Search'),
				type: 'text',
			},
		]), [entityOptions, t]);

		const formatDateTime = useCallback((value) => {
			if (!value) return '-';
			try {
				return new Intl.DateTimeFormat(isRtl ? 'fa-IR' : 'en-US', {
					year: 'numeric', month: '2-digit', day: '2-digit',
					hour: '2-digit', minute: '2-digit',
					hour12: false,
				}).format(new Date(value));
			} catch {
				return value;
			}
		}, [isRtl]);

		const extractRecordTitle = useCallback((row) => {
			const title = String(row?.record_title || '').trim();
			if (!title) return '';

			const code = String(row?.record_code || '').trim();
			if (!code) return title;

			const escapedCode = code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			const prefixedPattern = new RegExp(`^${escapedCode}\\s*[|:\\-\\/،؛]\\s*`, 'i');
			if (prefixedPattern.test(title)) {
				const cleaned = title.replace(prefixedPattern, '').trim();
				return cleaned || title;
			}

			if (title.includes('|')) {
				const parts = title.split('|').map(part => part.trim()).filter(Boolean);
				if (parts.length > 1 && parts[0] === code) {
					return parts.slice(1).join(' | ').trim();
				}
			}

			return title;
		}, []);

		const openItemRecord = useCallback((row) => {
			if (!row) return;
			const payload = row.open_payload || {};
			const formComponent = String(payload.form_component || row.form_component || '').trim();
			if (!formComponent) {
				showToast(t('برای این آیتم فرم مقصد مشخص نشده است.', 'Target form is not configured for this item.'), 'warning');
				return;
			}

			const dispatchFilter = () => {
				window.dispatchEvent(new CustomEvent('filterToRecord', {
					detail: {
						form_component: formComponent,
						entity_type: payload.entity_type || row.entity_type,
						entity_id: payload.entity_id || row.entity_id,
					},
				}));
			};

			if (window.__navigateToForm) {
				const ok = window.__navigateToForm(formComponent);
				if (!ok) {
					showToast(t('فرم مقصد در منو پیدا نشد.', 'Target form was not found in navigation.'), 'warning');
					return;
				}
				setTimeout(dispatchFilter, 320);
			} else {
				window.dispatchEvent(new CustomEvent('navigateToForm', { detail: { formComponent } }));
				setTimeout(dispatchFilter, 500);
			}
		}, [showToast, t]);

		const openCompleteModal = useCallback((row) => {
			setCompleteModal({
				isOpen: true,
				row,
				actionTaken: 'DONE',
				note: '',
				isSubmitting: false,
			});
		}, []);

		const closeCompleteModal = useCallback(() => {
			setCompleteModal({ isOpen: false, row: null, actionTaken: 'DONE', note: '', isSubmitting: false });
		}, []);

		const completeWorkflowTask = useCallback(async () => {
			const row = completeModal.row;
			if (!row || row.source_type !== 'WORKFLOW') return;
			if (!workflowEngine || typeof workflowEngine.completeTask !== 'function') {
				showToast(t('ماژول WorkflowEngine در دسترس نیست.', 'WorkflowEngine is unavailable.'), 'error');
				return;
			}

			setCompleteModal(prev => ({ ...prev, isSubmitting: true }));
			try {
				const result = await workflowEngine.completeTask(
					row.task_id,
					completeModal.actionTaken,
					completeModal.note,
					{},
					currentUserId
				);
				if (!result || result.success !== true) {
					const errorText = result?.error || t('نامشخص', 'Unknown');
					throw new Error(errorText);
				}
				showToast(t('تسک با موفقیت ثبت و تکمیل شد.', 'Task completed successfully.'), 'success');
				closeCompleteModal();
				await loadData();
			} catch (error) {
				console.error('WorkflowCartable complete task error:', error);
				showToast(t('تکمیل تسک انجام نشد.', 'Failed to complete task.'), 'error');
				setCompleteModal(prev => ({ ...prev, isSubmitting: false }));
			}
		}, [closeCompleteModal, completeModal.actionTaken, completeModal.note, completeModal.row, currentUserId, loadData, showToast, t, workflowEngine]);

		const filteredRows = useMemo(() => {
			const mailboxPredicate = mailboxPredicates[mailbox] || mailboxPredicates.INBOX;
			return allItems
				.filter(mailboxPredicate)
				.filter((row) => {
					const sourceType = String(filters.source_type || '').trim();
					const taskStatus = String(filters.task_status || '').trim();
					const entityType = String(filters.entity_type || '').trim().toLowerCase();
					const searchText = String(filters.search_text || '').trim().toLowerCase();

					if (sourceType && String(row.source_type || '') !== sourceType) return false;
					if (taskStatus && String(row.task_status || '') !== taskStatus) return false;
					if (entityType && String(row.entity_type || '').toLowerCase() !== entityType) return false;
					if (searchText) {
						const hay = [
							row.subject,
							row.record_code,
							row.record_title,
							row.entity_label,
							row.sender_label,
							row.assigned_to_label,
						].map(x => String(x || '').toLowerCase()).join(' ');
						if (!hay.includes(searchText)) return false;
					}
					return true;
				});
		}, [allItems, filters, mailbox, mailboxPredicates]);

		const mailboxOptions = useMemo(() => ([
			{ value: 'INBOX', label: t('صندوق ورودی', 'Inbox') },
			{ value: 'NEW', label: t('جدید', 'New') },
			{ value: 'ASSIGNED_TO_ME', label: t('ارجاع به من', 'Assigned To Me') },
			{ value: 'SENT_BY_ME', label: t('ارسالی‌های من', 'Sent By Me') },
			{ value: 'DONE_BY_ME', label: t('انجام‌شده توسط من', 'Done By Me') },
			{ value: 'CLOSED', label: t('بسته‌شده‌ها', 'Closed') },
		]), [t]);

		const columns = useMemo(() => ([
			{
				field: 'work_item_code',
				header_fa: 'شناسه کار',
				header_en: 'Task Code',
				width: '180px',
				render: (value) => <span className="text-[12px] font-bold text-slate-700 dark:text-slate-200">{value || '-'}</span>,
			},
			{
				field: 'source_type',
				header_fa: 'منبع',
				header_en: 'Source',
				width: '130px',
				render: (_, row) => <Badge size="sm" variant={row.source_badge_variant || 'slate'}>{row.source_label || '-'}</Badge>,
			},
			{
				field: 'task_status',
				header_fa: 'وضعیت',
				header_en: 'Status',
				width: '120px',
				render: (value) => value === 'DONE'
					? <Badge size="sm" variant="emerald">{t('انجام شده', 'Done')}</Badge>
					: <Badge size="sm" variant="amber">{t('باز', 'Open')}</Badge>,
			},
			{
				field: 'subject',
				header_fa: 'موضوع کار',
				header_en: 'Subject',
				width: '280px',
				render: (value) => <span className="font-bold text-slate-800 dark:text-slate-100 truncate block">{value || '-'}</span>,
			},
			{
				field: 'entity_label',
				header_fa: 'موجودیت',
				header_en: 'Entity',
				width: '160px',
				render: (value) => <span>{value || '-'}</span>,
			},
			{
				field: 'record_code',
				header_fa: 'رکورد',
				header_en: 'Record',
				width: '160px',
				render: (value, row) => (
					<div className="flex flex-col gap-0.5">
						<span className="text-[12px] font-bold text-indigo-600 dark:text-indigo-400">{value || '-'}</span>
						<span className="text-[10px] text-slate-500 truncate">{extractRecordTitle(row)}</span>
					</div>
				),
			},
			{
				field: 'sender_label',
				header_fa: 'ارجاع دهنده',
				header_en: 'Sender',
				width: '150px',
				render: (value) => <span>{value || '-'}</span>,
			},
			{
				field: 'assigned_to_label',
				header_fa: 'انجام دهنده',
				header_en: 'Assignee',
				width: '170px',
				render: (value) => <span>{value || '-'}</span>,
			},
			{
				field: 'due_date',
				header_fa: 'موعد',
				header_en: 'Due Date',
				width: '145px',
				render: (value) => <span className="text-[12px]">{formatDateTime(value)}</span>,
			},
			{
				field: 'created_at',
				header_fa: 'ایجاد',
				header_en: 'Created',
				width: '145px',
				render: (value) => <span className="text-[12px] text-slate-500">{formatDateTime(value)}</span>,
			},
		]), [extractRecordTitle, formatDateTime, t]);

		const gridActions = useMemo(() => ([
			{
				icon: ArrowUpRight,
				tooltip: t('باز کردن رکورد در فرم مربوطه', 'Open record in target form'),
				onClick: (row) => openItemRecord(row),
				className: 'text-indigo-500 hover:text-indigo-700',
			},
			{
				icon: CheckCircle2,
				tooltip: t('ثبت انجام کار', 'Complete task'),
				onClick: (row) => openCompleteModal(row),
				className: (row) => row.source_type === 'WORKFLOW' && row.task_status !== 'DONE'
					? 'text-emerald-500 hover:text-emerald-700'
					: '!text-slate-300 dark:!text-slate-700 cursor-not-allowed',
			},
		]), [openCompleteModal, openItemRecord, t]);

		const viewConfig = useMemo(() => ({
			pageId: 'workflow_cartable_main',
			currentState: () => ({ mailbox, filters, gridState }),
			onApplyState: (state) => {
				if (state) {
					if (state.mailbox) setMailbox(state.mailbox);
					if (state.filters) setFilters(state.filters);
					if (Object.prototype.hasOwnProperty.call(state, 'gridState')) setGridState(state.gridState);
				} else {
					setMailbox('INBOX');
					setFilters({});
					setGridState(null);
				}
			},
		}), [filters, gridState, mailbox]);

		return (
			<div className="p-4 h-full flex flex-col bg-slate-50/60 dark:bg-slate-900" dir={isRtl ? 'rtl' : 'ltr'}>
				<PageHeader
					title={t('کارتابل من', 'My Cartable')}
					description={t('تجمیع همه کارهای ارجاعی از فرایندها و روال تاییدات', 'Unified inbox for workflow and state-machine assignments')}
					icon={Inbox}
					language={language}
					viewConfig={viewConfig}
					breadcrumbs={[{ label: t('گردش کار', 'Workflow') }, { label: t('کارتابل من', 'My Cartable') }]}
				>
					<div className="flex items-center gap-2">
						<Button size="sm" variant="outline" icon={RefreshCw} onClick={loadData}>{t('بروزرسانی', 'Refresh')}</Button>
					</div>
				</PageHeader>

				<div className="mt-2 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
					{mailboxOptions.map(item => {
						const active = mailbox === item.value;
						const count = mailboxCounts[item.value] || 0;
						return (
							<button
								key={item.value}
								onClick={() => setMailbox(item.value)}
								className={`rounded-xl border px-3 py-2.5 text-start transition-all ${active
									? 'border-indigo-300 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 shadow-sm'
									: 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'}`}
							>
								<div className="flex items-center justify-between gap-2">
									<span className={`text-[12px] font-bold ${active ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-200'}`}>{item.label}</span>
									<Badge size="sm" variant={active ? 'indigo' : 'slate'}>{count}</Badge>
								</div>
							</button>
						);
					})}
				</div>

				{sourceWarnings.length > 0 && (
					<div className="mt-2 rounded-xl border border-amber-200 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-[12px] text-amber-700 dark:text-amber-300 flex items-start gap-2">
						<AlertTriangle size={14} className="mt-0.5 shrink-0" />
						<div className="leading-6">{sourceWarnings.join(' | ')}</div>
					</div>
				)}

				<div className="mt-2 flex-1 min-h-0 overflow-hidden flex flex-col">
					<AdvancedFilter
						fields={filterFields}
						initialValues={filters}
						onFilter={setFilters}
						onClear={() => setFilters({})}
						language={language}
					/>

					<div className="flex-1 min-h-0 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col mt-1">
						{filteredRows.length === 0 && !isLoading ? (
							<div className="flex-1 flex items-center justify-center p-8">
								<EmptyState
									icon={Sparkles}
									title={t('کاری برای نمایش وجود ندارد', 'No tasks to display')}
									description={t('برای این نمای کارتابل هنوز آیتمی ثبت نشده است.', 'No items found for this mailbox view yet.')}
								/>
							</div>
						) : (
							<DataGrid
								data={filteredRows}
								columns={columns}
								language={language}
								formCode={formCode}
								isLoading={isLoading}
								hideImport={true}
								selectable={false}
								gridState={gridState}
								onGridStateChange={setGridState}
								onRowDoubleClick={(row) => openItemRecord(row)}
								actions={gridActions}
								actionWidth="130px"
							/>
						)}
					</div>
				</div>

				<Modal
					isOpen={completeModal.isOpen}
					onClose={closeCompleteModal}
					title={t('ثبت نتیجه انجام کار', 'Complete Task')}
					language={language}
					width="max-w-lg"
				>
					<div className="p-4 grid grid-cols-1 gap-3">
						<div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/50 px-3 py-2">
							<div className="text-[10px] text-slate-500 mb-1">{t('موضوع', 'Subject')}</div>
							<div className="text-[12px] font-bold text-slate-800 dark:text-slate-100">{completeModal.row?.subject || '-'}</div>
						</div>

						<SelectField
							formCode={formCode}
							size="sm"
							label={t('نتیجه عملیات', 'Action Result')}
							value={completeModal.actionTaken}
							onChange={(event) => setCompleteModal(prev => ({ ...prev, actionTaken: event.target.value }))}
							options={[
								{ value: 'DONE', label: t('انجام شد', 'Done') },
								{ value: 'APPROVE', label: t('تایید', 'Approve') },
								{ value: 'REJECT', label: t('رد', 'Reject') },
							]}
							isRtl={isRtl}
						/>

						<div>
							<TextField
								formCode={formCode}
								size="sm"
								label={t('توضیحات', 'Note')}
								value={completeModal.note}
								onChange={(event) => setCompleteModal(prev => ({ ...prev, note: event.target.value }))}
								isRtl={isRtl}
							/>
						</div>

						<div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
							<Button size="sm" variant="outline" onClick={closeCompleteModal}>{t('انصراف', 'Cancel')}</Button>
							<Button
								size="sm"
								variant="primary"
								icon={Send}
								isLoading={completeModal.isSubmitting}
								onClick={completeWorkflowTask}
							>
								{t('ثبت انجام کار', 'Submit Completion')}
							</Button>
						</div>
					</div>
				</Modal>

				<Toast
					isVisible={toast.isVisible}
					message={toast.message}
					type={toast.type}
					onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
				/>
			</div>
		);
	};

	WorkflowCartable.formCode = 'WF_CARTABLE';
	window.WorkflowCartable = WorkflowCartable;
})();
