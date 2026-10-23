/* ------------------------------------------------------------------
   Settings page (settings.html)
   Lets a student or teacher save their assigned API key in localStorage.
   The key is verified against GET /api/auth/me before saving.
------------------------------------------------------------------- */
$(function () {
    UI.renderNavbar('settings');

    // ---- show current saved key info ----
    function renderSavedKey() {
        const key  = KeyStore.getUserKey();
        const meta = KeyStore.getUserMeta();
        const $box = $('#savedKeyBox');

        if (!key) {
            $box.html(`<div class="empty">No API key saved yet.<br>
                <a href="settings.html">Fill in the form below to save one.</a></div>`);
            return;
        }

        const maskedKey = key.slice(0, 8) + '…' + key.slice(-4);
        const roleBadge = meta ? UI.badge(meta.role, meta.role === 'teacher' ? 'info' : 'success') : '';
        const quota     = KeyStore.getQuota();
        const quotaHtml = quota
            ? `<div style="margin-top:.75rem">
                   ${UI.progress(quota.limit - quota.remaining, quota.limit)}
                   <small class="hint">${quota.remaining} of ${quota.limit} requests remaining</small>
               </div>`
            : '';

        $box.html(`
            <div class="saved-key-info">
                ${meta ? `<div class="row" style="margin-bottom:.6rem">
                    <strong>${UI.escape(meta.name)}</strong> ${roleBadge}
                </div>` : ''}
                <div class="row" style="margin-bottom:.5rem">
                    <code class="mono key-masked">${UI.escape(maskedKey)}</code>
                    <button id="copyKeyBtn" class="btn btn-light btn-sm" type="button">Copy</button>
                </div>
                ${quotaHtml}
                <div class="row" style="margin-top:1rem">
                    <button id="testSavedBtn" class="btn btn-light btn-sm" type="button">Test connection</button>
                    <button id="clearKeyBtn"  class="btn btn-danger  btn-sm" type="button">Remove key</button>
                </div>
                <div id="testResult" style="margin-top:.75rem"></div>
            </div>
            <p class="hint" style="margin-top:.75rem">
                ⚠ Your key is stored in <strong>this browser only</strong>.
                Never share it with others or paste it into untrusted websites.
            </p>`);

        $('#copyKeyBtn').on('click', async () => {
            const ok = await UI.copyText(key);
            UI.toast(ok ? 'Key copied to clipboard' : 'Could not copy the key',
                     ok ? 'success' : 'error', 2500);
        });

        $('#testSavedBtn').on('click', () => testKey(key, $('#testResult')));

        $('#clearKeyBtn').on('click', async () => {
            const ok = await UI.confirm({
                title:       'Remove saved key?',
                message:     'The key will be removed from this browser. The key itself remains active on the server until the admin revokes it.',
                confirmText: 'Remove',
                danger:      true
            });
            if (!ok) return;
            KeyStore.clearUserKey();
            renderSavedKey();
            UI.toast('API key removed from this browser', 'info');
        });
    }

    // ---- test a key value against the server ----
    async function testKey(key, $result) {
        $result.html(UI.loadingHtml('Checking with server…'));
        try {
            const { data } = await Api.get('/auth/me', undefined, { key });
            const role = data.role;
            const name = data.name;
            const usage = data.usage;

            let usageHtml = '';
            if (usage) {
                usageHtml = `<div style="margin-top:.4rem">
                    ${UI.progress(usage.used, usage.limit)}
                    <small class="hint">${usage.remaining} of ${usage.limit} requests remaining</small>
                </div>`;
            }

            $result.html(`<div class="alert alert-success">
                ✓ Valid key — connected as <strong>${UI.escape(name)}</strong> (${UI.badge(role, role === 'teacher' ? 'info' : 'success')})
                ${usageHtml}
            </div>`);
            return { role, name, usage };
        } catch (err) {
            const msg = err.status === 429
                ? 'Key is valid but the request limit has been reached (HTTP 429).'
                : err.message;
            $result.html(`<div class="alert alert-error">✗ ${UI.escape(msg)}</div>`);
            throw err;
        }
    }

    // ---- key form submission ----
    const $toggleBtn = $('#toggleKey');
    $toggleBtn.on('click', function () {
        const $inp    = $('#keyInput');
        const showing = $inp.attr('type') === 'text';
        $inp.attr('type', showing ? 'password' : 'text');
        $(this).text(showing ? 'Show' : 'Hide').attr('aria-pressed', !showing);
    });

    $('#keyForm').on('submit', async function (e) {
        e.preventDefault();
        const $btn    = $('#saveBtn');
        const $err    = $('#keyError');
        const $result = $('#saveResult');

        const rawKey = $('#keyInput').val();
        const key    = rawKey.trim();

        $err.text('');
        $result.empty();

        if (!key) {
            $err.text('Please paste your API key before saving.');
            $('#keyInput').trigger('focus');
            return;
        }
        if (key.length > 64) {
            $err.text('Key is too long. Check that you pasted it correctly.');
            return;
        }

        UI.setBusy($btn, true, 'Checking key…');
        try {
            const info = await testKey(key, $result);
            // Save only after successful verification
            const meta = { role: info.role, name: info.name };
            KeyStore.saveUserKey(key, meta);
            $('#keyInput').val('');
            renderSavedKey();
            UI.toast('API key saved', 'success');
        } catch (_err) {
            // error already shown in $result
        } finally {
            UI.setBusy($btn, false);
        }
    });

    // ---- admin key section ----
    const $adminToggle = $('#adminKeyToggle');
    const $adminInput  = $('#adminKeyInput');
    const $adminForm   = $('#adminKeyForm');

    if ($adminToggle.length) {
        $adminToggle.on('click', function () {
            const showing = $adminInput.attr('type') === 'text';
            $adminInput.attr('type', showing ? 'password' : 'text');
            $(this).text(showing ? 'Show' : 'Hide');
        });
    }

    if ($adminForm.length) {
        $adminForm.on('submit', function (e) {
            e.preventDefault();
            const key = $adminInput.val().trim();
            if (!key) return;
            KeyStore.saveAdminKey(key);
            $adminInput.val('');
            UI.toast('Admin key saved for this session', 'success');
            renderAdminKeyStatus();
        });
    }

    function renderAdminKeyStatus() {
        const $box = $('#adminKeyBox');
        if (!$box.length) return;
        const key = KeyStore.getAdminKey();
        if (!key) {
            $box.html('<span class="hint">No admin key in this session.</span>');
        } else {
            const masked = key.slice(0, 8) + '…' + key.slice(-4);
            $box.html(`<code class="mono">${UI.escape(masked)}</code>
                <button id="clearAdminBtn" class="btn btn-danger btn-sm" type="button" style="margin-left:.5rem">Clear</button>`);
            $('#clearAdminBtn').on('click', () => {
                KeyStore.clearAdminKey();
                UI.toast('Admin key cleared', 'info');
                renderAdminKeyStatus();
            });
        }
    }

    renderSavedKey();
    renderAdminKeyStatus();
});
