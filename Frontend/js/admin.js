/* ------------------------------------------------------------------
   Admin panel (admin/index.html)
   Uses the shared Api wrapper with { as: 'admin' } so the predefined
   admin key is sent in the x-api-key header.

   Endpoints used:
     GET   /admin/students            GET   /admin/teachers
     GET   /admin/keys                POST  /admin/keys
     GET   /admin/keys/:id/usage      PATCH /admin/keys/:id/limit
     PATCH /admin/keys/:id/revoke     PATCH /admin/keys/:id/reset
------------------------------------------------------------------- */
$(function () {
    UI.renderNavbar('admin');

    const AS_ADMIN = { as: 'admin' };
    const state = { students: [], teachers: [], keys: [] };

    // ====================================================================
    // Admin key gate
    // ====================================================================
    function showGate(message) {
        $('#panel, #lockBtn').addClass('hidden');
        $('#gate').removeClass('hidden');
        $('#gateError').toggleClass('hidden', !message).text(message || '');
        $('#adminKeyInput').val('').trigger('focus');
    }

    function showPanel() {
        $('#gate').addClass('hidden');
        $('#panel, #lockBtn').removeClass('hidden');
    }

    $('#gateForm').on('submit', async function (e) {
        e.preventDefault();
        const key = $('#adminKeyInput').val().trim();
        if (!key) return;
        const $btn = $('#gateBtn');
        UI.setBusy($btn, true, 'Checking…');
        KeyStore.saveAdminKey(key);
        try {
            await loadAll();          // a wrong key fails here with 401
            showPanel();
            UI.toast('Admin panel unlocked', 'success', 2500);
        } catch (err) {
            KeyStore.clearAdminKey();
            showGate(err.status === 401 || err.status === 403
                ? 'That admin key is not valid.' : UI.errorMessage(err));
        } finally {
            UI.setBusy($btn, false);
        }
    });

    $('#lockBtn').on('click', () => {
        KeyStore.clearAdminKey();
        showGate();
        UI.toast('Panel locked', 'info', 2000);
    });

    // Any admin call that comes back 401/403 sends the user back to the gate
    function handleError(err) {
        if (err && (err.status === 401 || err.status === 403) && err.code !== 'KEY_REVOKED') {
            KeyStore.clearAdminKey();
            showGate('Your admin session is no longer valid. Enter the key again.');
            return;
        }
        UI.handleError(err);
    }

    // ====================================================================
    // Loading + rendering
    // ====================================================================
    async function loadAll() {
        const [students, teachers, keys] = await Promise.all([
            Api.get('/admin/students', undefined, AS_ADMIN),
            Api.get('/admin/teachers', undefined, AS_ADMIN),
            Api.get('/admin/keys', undefined, AS_ADMIN)
        ]);
        state.students = students.data;
        state.teachers = teachers.data;
        state.keys = keys.data;
        renderAll();
    }

    async function refresh() {
        try { await loadAll(); } catch (err) { handleError(err); }
    }

    function renderAll() {
        renderOverview();
        renderKeys();
        renderStudents();
        renderTeachers();
    }

    function renderOverview() {
        const active = state.keys.filter((k) => k.status === 'active');
        const atLimit = active.filter((k) => k.remaining === 0).length;
        const totalRequests = state.keys.reduce((sum, k) => sum + k.requestCount, 0);
        const stat = (value, label) =>
            `<div class="card stat"><div class="stat-value">${UI.escape(value)}</div><div class="stat-label">${UI.escape(label)}</div></div>`;
        $('#overview').html([
            stat(state.students.length, 'Students'),
            stat(state.teachers.length, 'Teachers'),
            stat(active.length, 'Active keys'),
            stat(state.keys.length - active.length, 'Revoked keys'),
            stat(atLimit, 'Keys at limit'),
            stat(totalRequests, 'Total requests used')
        ].join(''));
    }

    function statusBadge(key) {
        if (key.status === 'revoked') return UI.badge('Revoked', 'danger');
        if (key.remaining === 0) return UI.badge('Limit reached', 'warning');
        return UI.badge('Active', 'success');
    }

    const maskKey = (value) => `${value.slice(0, 8)}…${value.slice(-4)}`;

    function renderKeys() {
        const status = $('#filterStatus').val();
        const owner = $('#filterOwner').val();
        const rows = state.keys.filter((k) =>
            (!status || k.status === status) && (!owner || k.ownerType === owner));

        $('#keysTable').html(UI.renderTable([
            { label: 'ID', key: 'id', className: 'num' },
            {
                label: 'Owner',
                render: (k) => `<strong>${UI.escape(k.ownerName)}</strong><br>${UI.badge(k.ownerType, 'info')}`
            },
            {
                label: 'Key',
                render: (k) => `<code>${UI.escape(maskKey(k.keyValue))}</code>
                    <button class="btn btn-light btn-sm" data-act="copy" data-id="${k.id}" type="button" title="Copy full key">Copy</button>`
            },
            {
                label: 'Usage',
                render: (k) => `${UI.progress(k.requestCount, k.requestLimit)}
                    <small class="hint">${k.requestCount} / ${k.requestLimit} used</small>`
            },
            { label: 'Status', render: statusBadge },
            { label: 'Last used', render: (k) => UI.escape(UI.formatDate(k.lastUsedAt)) },
            {
                label: 'Actions', className: 'actions',
                render: (k) => {
                    const live = k.status === 'active';
                    return `<button class="btn btn-light btn-sm" data-act="usage" data-id="${k.id}" type="button">Usage</button>
                        ${live ? `<button class="btn btn-light btn-sm" data-act="limit" data-id="${k.id}" type="button">Limit</button>
                        <button class="btn btn-light btn-sm" data-act="reset" data-id="${k.id}" type="button">Reset</button>
                        <button class="btn btn-danger btn-sm" data-act="revoke" data-id="${k.id}" type="button">Revoke</button>` : ''}`;
                }
            }
        ], rows, { emptyText: 'No API keys match this filter.' }));
    }

    function keyCell(person, ownerType) {
        if (person.activeKeyId) return UI.badge('Has active key', 'success');
        return `<button class="btn btn-primary btn-sm" data-act="gen" data-type="${ownerType}" data-id="${person.id}" type="button">Generate key</button>`;
    }

    function renderStudents() {
        $('#studentsTable').html(UI.renderTable([
            { label: 'ID', key: 'id', className: 'num' },
            { label: 'Roll no', key: 'rollNo' },
            { label: 'Name', key: 'name' },
            { label: 'Email', key: 'email' },
            { label: 'Department', key: 'department' },
            { label: 'Sem', key: 'semester', className: 'num' },
            { label: 'API key', className: 'actions', render: (s) => keyCell(s, 'student') }
        ], state.students, { emptyText: 'No students found.' }));
    }

    function renderTeachers() {
        $('#teachersTable').html(UI.renderTable([
            { label: 'ID', key: 'id', className: 'num' },
            { label: 'Name', key: 'name' },
            { label: 'Email', key: 'email' },
            { label: 'Department', key: 'department' },
            { label: 'API key', className: 'actions', render: (t) => keyCell(t, 'teacher') }
        ], state.teachers, { emptyText: 'No teachers found.' }));
    }

    // ====================================================================
    // Tabs + filters
    // ====================================================================
    $('.tab').on('click', function () {
        const name = $(this).data('tab');
        $('.tab').removeClass('active').attr('aria-selected', 'false');
        $(this).addClass('active').attr('aria-selected', 'true');
        $('.tab-panel').addClass('hidden');
        $(`#tab-${name}`).removeClass('hidden');
    });
    $('#filterStatus, #filterOwner').on('change', renderKeys);
    $('#refreshBtn').on('click', async function () {
        UI.setBusy($(this), true, 'Refreshing…');
        await refresh();
        UI.setBusy($(this), false);
    });

    // ====================================================================
    // Row actions (event delegation: tables are re-rendered often)
    // ====================================================================
    const findKey = (id) => state.keys.find((k) => k.id === Number(id));

    $('#panel').on('click', '[data-act]', async function () {
        const $b = $(this);
        const id = Number($b.data('id'));
        switch ($b.data('act')) {
            case 'copy': {
                const key = findKey(id);
                const ok = key && await UI.copyText(key.keyValue);
                UI.toast(ok ? 'Key copied to clipboard' : 'Could not copy the key', ok ? 'success' : 'error', 2500);
                break;
            }
            case 'gen':    openGenerateModal({ ownerType: $b.data('type'), ownerId: id }); break;
            case 'usage':  openUsageModal(id); break;
            case 'limit':  openLimitModal(findKey(id)); break;
            case 'reset':  doReset(findKey(id), $b); break;
            case 'revoke': doRevoke(findKey(id), $b); break;
        }
    });
    $('#newKeyBtn').on('click', () => openGenerateModal({}));

    // ====================================================================
    // Generate key
    // ====================================================================
    function openGenerateModal({ ownerType = 'student', ownerId = null }) {
        UI.openModal({
            title: 'Generate API key',
            html: `
                <form id="genForm" autocomplete="off">
                    <div class="form-group">
                        <label class="label" for="genType">Owner type</label>
                        <select id="genType" class="input">
                            <option value="student">Student</option>
                            <option value="teacher">Teacher</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="label" for="genOwner">Owner</label>
                        <select id="genOwner" class="input" required></select>
                        <div class="hint">Only people without an active key are listed.</div>
                    </div>
                    <div class="form-group">
                        <label class="label" for="genLimit">Request limit</label>
                        <input id="genLimit" class="input" type="number" min="1" max="1000000" step="1" value="100" required>
                        <div class="hint">Total requests this key may make before it is blocked (HTTP 429).</div>
                    </div>
                    <div id="genError" class="form-error hidden"></div>
                </form>`,
            footerHtml: `<button type="button" class="btn btn-light" data-act="cancel">Cancel</button>
                         <button type="button" class="btn btn-primary" data-act="submit">Generate</button>`,
            onMount($m, close) {
                const fillOwners = (type, selected) => {
                    const list = (type === 'student' ? state.students : state.teachers).filter((p) => !p.activeKeyId);
                    $m.find('#genOwner').html(list.length
                        ? list.map((p) => `<option value="${p.id}">${UI.escape(p.name)}${p.rollNo ? ` (${UI.escape(p.rollNo)})` : ''}</option>`).join('')
                        : '<option value="">Everyone already has an active key</option>');
                    if (selected) $m.find('#genOwner').val(String(selected));
                };
                $m.find('#genType').val(ownerType).on('change', function () { fillOwners(this.value); });
                fillOwners(ownerType, ownerId);

                async function submit() {
                    const $btn = $m.find('[data-act="submit"]');
                    const payload = {
                        ownerType: $m.find('#genType').val(),
                        ownerId: Number($m.find('#genOwner').val()),
                        requestLimit: Number($m.find('#genLimit').val())
                    };
                    if (!payload.ownerId) return showFormError($m, '#genError', 'Choose an owner first.');
                    if (!Number.isInteger(payload.requestLimit) || payload.requestLimit < 1) {
                        return showFormError($m, '#genError', 'Request limit must be a whole number of at least 1.');
                    }
                    UI.setBusy($btn, true, 'Generating…');
                    try {
                        const { data } = await Api.post('/admin/keys', payload, AS_ADMIN);
                        close();
                        await refresh();
                        openCreatedKeyModal(data);
                    } catch (err) {
                        UI.setBusy($btn, false);
                        if (err.status === 401 || err.status === 403) { close(); handleError(err); }
                        else showFormError($m, '#genError', UI.errorMessage(err));
                    }
                }
                $m.find('[data-act="cancel"]').on('click', close);
                $m.find('[data-act="submit"]').on('click', submit);
                $m.find('#genForm').on('submit', (e) => { e.preventDefault(); submit(); });
            }
        });
    }

    function showFormError($m, selector, message) {
        $m.find(selector).removeClass('hidden').text(message);
    }

    function openCreatedKeyModal(key) {
        UI.openModal({
            title: 'API key generated',
            html: `<p>Give this key to <strong>${UI.escape(key.ownerName)}</strong>
                      (${UI.escape(key.ownerType)}). They paste it on the <a href="../settings.html">Settings</a> page.</p>
                   <div class="key-box" id="newKeyValue">${UI.escape(key.keyValue)}</div>
                   <p class="hint" style="margin-top:.5rem">Request limit: ${UI.escape(key.requestLimit)}</p>`,
            footerHtml: `<button type="button" class="btn btn-light" data-act="copy">Copy key</button>
                         <button type="button" class="btn btn-primary" data-act="done">Done</button>`,
            onMount($m, close) {
                $m.find('[data-act="copy"]').on('click', async () => {
                    const ok = await UI.copyText(key.keyValue);
                    UI.toast(ok ? 'Key copied to clipboard' : 'Could not copy the key', ok ? 'success' : 'error', 2500);
                });
                $m.find('[data-act="done"]').on('click', close);
            }
        });
    }

    // ====================================================================
    // Update request limit
    // ====================================================================
    function openLimitModal(key) {
        if (!key) return;
        UI.openModal({
            title: 'Update request limit',
            html: `<p><strong>${UI.escape(key.ownerName)}</strong> has used
                      <strong>${UI.escape(key.requestCount)}</strong> of <strong>${UI.escape(key.requestLimit)}</strong> requests.</p>
                   <form id="limitForm" autocomplete="off">
                       <div class="form-group">
                           <label class="label" for="limitInput">New request limit</label>
                           <input id="limitInput" class="input" type="number" min="1" max="1000000" step="1"
                                  value="${UI.escape(key.requestLimit)}" required>
                           <div class="hint">Set it above ${UI.escape(key.requestCount)} to unblock a key that hit its limit.</div>
                       </div>
                       <div id="limitError" class="form-error hidden"></div>
                   </form>`,
            footerHtml: `<button type="button" class="btn btn-light" data-act="cancel">Cancel</button>
                         <button type="button" class="btn btn-primary" data-act="submit">Save</button>`,
            onMount($m, close) {
                async function submit() {
                    const requestLimit = Number($m.find('#limitInput').val());
                    if (!Number.isInteger(requestLimit) || requestLimit < 1) {
                        return showFormError($m, '#limitError', 'Enter a whole number of at least 1.');
                    }
                    const $btn = $m.find('[data-act="submit"]');
                    UI.setBusy($btn, true, 'Saving…');
                    try {
                        await Api.patch(`/admin/keys/${key.id}/limit`, { requestLimit }, AS_ADMIN);
                        close();
                        UI.toast('Request limit updated', 'success');
                        await refresh();
                    } catch (err) {
                        UI.setBusy($btn, false);
                        if (err.status === 401 || err.status === 403) { close(); handleError(err); }
                        else showFormError($m, '#limitError', UI.errorMessage(err));
                    }
                }
                $m.find('[data-act="cancel"]').on('click', close);
                $m.find('[data-act="submit"]').on('click', submit);
                $m.find('#limitForm').on('submit', (e) => { e.preventDefault(); submit(); });
                $m.find('#limitInput').trigger('select');
            }
        });
    }

    // ====================================================================
    // Revoke + reset usage
    // ====================================================================
    async function doRevoke(key, $btn) {
        if (!key) return;
        const ok = await UI.confirm({
            title: 'Revoke API key?',
            message: `${key.ownerName}'s key will stop working immediately. This cannot be undone, but you can generate a new key afterwards.`,
            confirmText: 'Revoke key', danger: true
        });
        if (!ok) return;
        UI.setBusy($btn, true, 'Revoking…');
        try {
            await Api.patch(`/admin/keys/${key.id}/revoke`, undefined, AS_ADMIN);
            UI.toast('API key revoked', 'success');
            await refresh();
        } catch (err) {
            UI.setBusy($btn, false);
            handleError(err);
        }
    }

    async function doReset(key, $btn) {
        if (!key) return;
        const ok = await UI.confirm({
            title: 'Reset usage counter?',
            message: `${key.ownerName}'s used-requests counter will go back to 0 (currently ${key.requestCount}). The usage log is kept.`,
            confirmText: 'Reset usage'
        });
        if (!ok) return;
        UI.setBusy($btn, true, 'Resetting…');
        try {
            await Api.patch(`/admin/keys/${key.id}/reset`, undefined, AS_ADMIN);
            UI.toast('Usage counter reset', 'success');
            await refresh();
        } catch (err) {
            UI.setBusy($btn, false);
            handleError(err);
        }
    }

    // ====================================================================
    // Usage details
    // ====================================================================
    function codeBadge(code) {
        const type = code >= 500 ? 'danger' : code === 429 ? 'warning' : code >= 400 ? 'danger' : code >= 200 && code < 300 ? 'success' : 'neutral';
        return UI.badge(code ?? '—', type);
    }

    function openUsageModal(id) {
        UI.openModal({
            title: 'API key usage',
            html: UI.loadingHtml('Loading usage…'),
            onMount($m, close) {
                $m.addClass('modal-wide');
                Api.get(`/admin/keys/${id}/usage`, { limit: 20 }, AS_ADMIN)
                    .then(({ data }) => {
                        const { key, usage, byStatus, recent } = data;
                        $m.find('.modal-body').html(`
                            <div class="row row-between">
                                <div><strong>${UI.escape(key.ownerName)}</strong> ${UI.badge(key.ownerType, 'info')}</div>
                                ${statusBadge(key)}
                            </div>
                            <div style="margin:.75rem 0">
                                ${UI.progress(usage.used, usage.limit)}
                                <small class="hint">${UI.escape(usage.used)} of ${UI.escape(usage.limit)} used
                                    · ${UI.escape(usage.remaining)} remaining (${UI.escape(usage.percentUsed)}%)</small>
                            </div>
                            <div class="meta-grid">
                                <div><span class="hint">Created</span><br>${UI.escape(UI.formatDate(key.createdAt))}</div>
                                <div><span class="hint">Last used</span><br>${UI.escape(UI.formatDate(key.lastUsedAt))}</div>
                                <div><span class="hint">Revoked</span><br>${UI.escape(UI.formatDate(key.revokedAt))}</div>
                            </div>
                            <h4 class="sub-title">Responses by status code</h4>
                            <div class="row">${byStatus.length
                                ? byStatus.map((s) => `${codeBadge(s.statusCode)} <span class="hint">× ${UI.escape(s.count)}</span>`).join(' &nbsp; ')
                                : '<span class="hint">No requests logged yet.</span>'}</div>
                            <h4 class="sub-title">Most recent requests</h4>
                            ${UI.renderTable([
                                { label: 'Time', render: (r) => UI.escape(UI.formatDate(r.requestedAt)) },
                                { label: 'Method', render: (r) => UI.badge(r.method, 'neutral') },
                                { label: 'Endpoint', render: (r) => `<code>${UI.escape(r.endpoint)}</code>` },
                                { label: 'Status', render: (r) => codeBadge(r.statusCode) }
                            ], recent, { emptyText: 'No requests logged yet.' })}`);
                    })
                    .catch((err) => {
                        close();
                        handleError(err);
                    });
            },
            footerHtml: '<button type="button" class="btn btn-primary" data-act="close">Close</button>'
        }).$el.on('click', '[data-act="close"]', function () { $(this).closest('.modal-backdrop').find('.modal-close').trigger('click'); });
    }

    // ====================================================================
    // Start: reuse the saved admin key for this tab, otherwise show the gate
    // ====================================================================
    if (KeyStore.getAdminKey()) {
        loadAll().then(showPanel).catch((err) => {
            KeyStore.clearAdminKey();
            showGate(err.status === 401 || err.status === 403
                ? 'Your admin session is no longer valid. Enter the key again.' : UI.errorMessage(err));
        });
    } else {
        showGate();
    }
});