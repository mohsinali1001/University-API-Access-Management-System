/* ------------------------------------------------------------------
   UI: small reusable components shared by every page.
   Everything that puts text into the page goes through UI.escape()
   so data coming from the API can never inject HTML/JS (XSS safe).
------------------------------------------------------------------- */
const UI = (() => {
    // Pages inside a sub-folder (admin/) declare <body data-root="../">
    const root = () => document.body.dataset.root || '';

    // ---------------- helpers ----------------
    function escape(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function formatDate(iso) {
        if (!iso) return '—';
        const d = new Date(iso);
        return isNaN(d) ? '—' : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    }

    function badge(text, type = 'neutral') {
        return `<span class="badge badge-${type}">${escape(text)}</span>`;
    }

    // used / limit  ->  progress bar (turns amber, then red, as the quota runs out)
    function progress(used, limit) {
        const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
        const level = pct >= 100 ? 'danger' : pct >= 80 ? 'warning' : 'ok';
        return `<div class="progress" title="${used} of ${limit} used">
                    <div class="progress-bar progress-${level}" style="width:${pct}%"></div>
                </div>`;
    }

    function setBusy($button, busy, busyText = 'Please wait…') {
        if (busy) {
            $button.data('label', $button.html()).prop('disabled', true)
                   .html(`<span class="spinner spinner-sm"></span> ${escape(busyText)}`);
        } else {
            $button.prop('disabled', false).html($button.data('label') ?? $button.html());
        }
    }

    function loadingHtml(text = 'Loading…') {
        return `<div class="loading"><span class="spinner"></span> ${escape(text)}</div>`;
    }

    async function copyText(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch {
            const ta = document.createElement('textarea');   // fallback for http:// pages
            ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
            document.body.appendChild(ta); ta.select();
            let ok = false;
            try { ok = document.execCommand('copy'); } catch { ok = false; }
            ta.remove();
            return ok;
        }
    }

    // ---------------- toast ----------------
    function toast(message, type = 'info', ms = 4000) {
        let $box = $('#toastBox');
        if (!$box.length) $box = $('<div id="toastBox" class="toast-box" aria-live="polite"></div>').appendTo('body');
        const $t = $(`<div class="toast toast-${type}" role="status">${escape(message)}</div>`).appendTo($box);
        setTimeout(() => $t.addClass('toast-hide'), ms);
        setTimeout(() => $t.remove(), ms + 300);
    }

    // ---------------- errors ----------------
    // Turns an ApiError into friendly text + the right kind of toast
    function errorMessage(err) {
        if (!(err instanceof ApiError)) return 'Something went wrong. Please try again.';
        return err.message;
    }

    function handleError(err) {
        const type = err && err.status === 429 ? 'warning' : 'error';
        const message = errorMessage(err);
        toast(message, type, 6000);
        return message;
    }

    // Shows a full-width alert inside a container (used when a whole page section fails)
    function showError($container, err) {
        const needsKey = err && (err.code === 'NO_KEY' || err.status === 401);
        const link = needsKey && err.code !== 'ADMIN_KEY_NEEDED'
            ? ` <a href="${root()}settings.html">Open Settings</a>` : '';
        const type = err && err.status === 429 ? 'warning' : 'error';
        $container.html(`<div class="alert alert-${type}" role="alert">${escape(errorMessage(err))}${link}</div>`);
    }

    // ---------------- modal ----------------
    // UI.openModal({ title, html, footerHtml, onMount($modal, close) }) -> { $el, close }
    function openModal({ title, html = '', footerHtml = '', onMount } = {}) {
        const $backdrop = $(`
            <div class="modal-backdrop">
                <div class="modal" role="dialog" aria-modal="true" aria-label="${escape(title)}">
                    <div class="modal-header">
                        <h3>${escape(title)}</h3>
                        <button type="button" class="modal-close" aria-label="Close">&times;</button>
                    </div>
                    <div class="modal-body">${html}</div>
                    ${footerHtml ? `<div class="modal-footer">${footerHtml}</div>` : ''}
                </div>
            </div>`).appendTo('body');

        const onKey = (e) => { if (e.key === 'Escape') close(); };
        function close() {
            $(document).off('keydown', onKey);
            $backdrop.remove();
            $('body').removeClass('modal-open');
        }

        $('body').addClass('modal-open');
        $(document).on('keydown', onKey);
        $backdrop.on('click', (e) => { if (e.target === $backdrop[0]) close(); });
        $backdrop.find('.modal-close').on('click', close);
        $backdrop.find('input, select, button.btn-primary').first().trigger('focus');
        if (onMount) onMount($backdrop.find('.modal'), close);
        return { $el: $backdrop, close };
    }

    // await UI.confirm({ title, message, confirmText, danger }) -> true / false
    function confirm({ title = 'Are you sure?', message = '', confirmText = 'Confirm', danger = false } = {}) {
        return new Promise((resolve) => {
            let answered = false;
            const answer = (value, close) => { answered = true; close(); resolve(value); };
            const modal = openModal({
                title,
                html: `<p>${escape(message)}</p>`,
                footerHtml: `<button type="button" class="btn btn-light" data-act="cancel">Cancel</button>
                             <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-act="ok">${escape(confirmText)}</button>`,
                onMount($m, close) {
                    $m.find('[data-act="cancel"]').on('click', () => answer(false, close));
                    $m.find('[data-act="ok"]').on('click', () => answer(true, close)).trigger('focus');
                }
            });
            // closing with X / Esc / backdrop counts as "cancel"
            const observer = new MutationObserver(() => {
                if (!document.body.contains(modal.$el[0])) {
                    observer.disconnect();
                    if (!answered) resolve(false);
                }
            });
            observer.observe(document.body, { childList: true });
        });
    }

    // ---------------- table ----------------
    // columns: [{ label, key?, render?(row) -> trusted HTML, className? }]
    // Plain `key` values are escaped automatically; `render` output is used as-is,
    // so inside render() always wrap API data with UI.escape().
    function renderTable(columns, rows, { emptyText = 'No records found.' } = {}) {
        if (!rows || rows.length === 0) return `<div class="empty">${escape(emptyText)}</div>`;
        const head = columns.map((c) => `<th class="${c.className || ''}">${escape(c.label)}</th>`).join('');
        const body = rows.map((row) => `<tr>${columns.map((c) => {
            const cell = c.render ? c.render(row) : escape(row[c.key] ?? '—');
            return `<td class="${c.className || ''}" data-label="${escape(c.label)}">${cell}</td>`;
        }).join('')}</tr>`).join('');
        return `<div class="table-wrap"><table class="table table-stack"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
    }

    // ---------------- navbar ----------------
    const NAV_LINKS = [
        { id: 'home',     label: 'Home',     href: 'index.html' },
        { id: 'student',  label: 'Student',  href: 'student.html' },
        { id: 'teacher',  label: 'Teacher',  href: 'teacher.html' },
        { id: 'settings', label: 'Settings', href: 'settings.html' },
        { id: 'admin',    label: 'Admin',    href: 'admin/index.html' }
    ];

    function renderQuota(quota) {
        const $pill = $('#quotaPill');
        if (!$pill.length) return;
        if (!quota) { $pill.addClass('hidden'); return; }
        const level = quota.remaining === 0 ? 'danger' : quota.remaining <= Math.ceil(quota.limit * 0.2) ? 'warning' : 'ok';
        $pill.removeClass('hidden pill-ok pill-warning pill-danger').addClass(`pill-${level}`)
             .text(`Requests left: ${quota.remaining}/${quota.limit}`);
    }

    function renderNavbar(active) {
        const links = NAV_LINKS.map((l) =>
            `<a href="${root()}${l.href}" class="nav-link${l.id === active ? ' active' : ''}"${l.id === active ? ' aria-current="page"' : ''}>${l.label}</a>`
        ).join('');
        const meta = KeyStore.getUserMeta();

        $('#navbar').html(`
            <div class="container nav-inner">
                <a class="brand" href="${root()}index.html">
                    <span class="brand-mark">AU</span>
                    <span class="brand-text">University API Access</span>
                </a>
                <button class="nav-toggle" type="button" aria-label="Toggle menu" aria-expanded="false">&#9776;</button>
                <nav class="nav-links" id="navLinks">
                    ${links}
                    <span class="nav-extra">
                        ${meta ? `<span class="user-pill">${escape(meta.name)}</span>` : ''}
                        <span id="quotaPill" class="quota-pill hidden"></span>
                    </span>
                </nav>
            </div>`).addClass('navbar');

        $('#navbar .nav-toggle').on('click', function () {
            const open = $('#navLinks').toggleClass('open').hasClass('open');
            $(this).attr('aria-expanded', open);
        });

        renderQuota(KeyStore.getUserKey() ? KeyStore.getQuota() : null);
        $(document).off('api:ratelimit.navbar')
                   .on('api:ratelimit.navbar', (_e, quota) => renderQuota(KeyStore.getUserKey() ? quota : null));
    }

    return {
        escape, formatDate, badge, progress, setBusy, loadingHtml, copyText,
        toast, handleError, showError, errorMessage,
        openModal, confirm, renderTable, renderNavbar, renderQuota
    };
})();
