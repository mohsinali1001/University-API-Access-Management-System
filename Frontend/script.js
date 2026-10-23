/* Landing page: navbar + live server status (public /api/health, no key needed) */
$(function () {
    UI.renderNavbar('home');

    function loadStatus() {
        const $box = $('#statusBox').html(UI.loadingHtml('Checking server…'));

        Api.get('/health', undefined, { as: 'none' })
            .then(({ data }) => {
                const t = data.tables;
                const stat = (value, label) =>
                    `<div class="card stat"><div class="stat-value">${UI.escape(value)}</div><div class="stat-label">${UI.escape(label)}</div></div>`;
                $box.html(`
                    <div class="alert alert-success">
                        Server is running and the database is <strong>${UI.escape(data.database)}</strong>.
                    </div>
                    <div class="grid grid-4">
                        ${stat(t.students, 'Students')}
                        ${stat(t.teachers, 'Teachers')}
                        ${stat(t.subjects, 'Subjects')}
                        ${stat(t.marks, 'Mark records')}
                        ${stat(t.api_keys, 'API keys')}
                    </div>`);
            })
            .catch((err) => UI.showError($box, err));
    }

    $('#refreshStatus').on('click', loadStatus);
    loadStatus();
});
