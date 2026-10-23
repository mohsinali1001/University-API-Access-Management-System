/* ------------------------------------------------------------------
   Student dashboard (student.html)
   Shows the authenticated student's own profile and marks.
   Identity comes ONLY from the saved API key — never from a URL param.
------------------------------------------------------------------- */
$(function () {
    UI.renderNavbar('student');

    const $content = $('#studentContent');

    function gradeClass(grade) {
        if (!grade) return 'neutral';
        if (grade === 'A') return 'success';
        if (grade === 'B') return 'success';
        if (grade === 'C') return 'info';
        if (grade === 'D') return 'warning';
        return 'danger';
    }

    async function loadData() {
        const key = KeyStore.getUserKey();
        if (!key) {
            $content.html(`<div class="alert alert-error">
                No API key saved. <a href="settings.html">Open Settings</a> and save your student API key first.
            </div>`);
            return;
        }

        $content.html(UI.loadingHtml('Loading your academic record…'));

        try {
            const [profileResp, marksResp] = await Promise.all([
                Api.get('/student/me'),
                Api.get('/student/me/marks')
            ]);

            const student  = profileResp.data;
            const { marks, summary } = marksResp.data;

            // --- Profile card ---
            const profileHtml = `
                <section class="card profile-card" style="margin-bottom:1rem">
                    <h2 class="card-title">My Profile</h2>
                    <div class="profile-grid">
                        <div class="profile-field">
                            <span class="hint">Name</span>
                            <strong>${UI.escape(student.name)}</strong>
                        </div>
                        <div class="profile-field">
                            <span class="hint">Roll No</span>
                            <strong>${UI.escape(student.rollNo)}</strong>
                        </div>
                        <div class="profile-field">
                            <span class="hint">Email</span>
                            <span>${UI.escape(student.email)}</span>
                        </div>
                        <div class="profile-field">
                            <span class="hint">Department</span>
                            <span>${UI.escape(student.department)}</span>
                        </div>
                        <div class="profile-field">
                            <span class="hint">Semester</span>
                            <span>${UI.escape(student.semester)}</span>
                        </div>
                    </div>
                </section>`;

            // --- Summary card ---
            const summaryHtml = summary.subjects === 0 ? '' : `
                <section class="card summary-card" style="margin-bottom:1rem">
                    <h2 class="card-title">Academic Summary</h2>
                    <div class="grid grid-4">
                        <div class="card stat">
                            <div class="stat-value">${UI.escape(summary.subjects)}</div>
                            <div class="stat-label">Subjects</div>
                        </div>
                        <div class="card stat">
                            <div class="stat-value">${UI.escape(summary.totalObtained)}</div>
                            <div class="stat-label">Marks obtained</div>
                        </div>
                        <div class="card stat">
                            <div class="stat-value">${UI.escape(summary.percentage)}%</div>
                            <div class="stat-label">Overall %</div>
                        </div>
                        <div class="card stat">
                            <div class="stat-value">
                                <span class="badge badge-${gradeClass(summary.grade)}" style="font-size:1.4rem;padding:.2rem .8rem">
                                    ${UI.escape(summary.grade || '—')}
                                </span>
                            </div>
                            <div class="stat-label">Overall grade</div>
                        </div>
                    </div>
                </section>`;

            // --- Marks table ---
            const marksHtml = `
                <section class="card">
                    <h2 class="card-title">Subject Marks</h2>
                    ${UI.renderTable([
                        { label: 'Subject code', key: 'subjectCode' },
                        { label: 'Subject name', key: 'subjectName' },
                        { label: 'Credits', key: 'creditHours', className: 'num' },
                        { label: 'Assignment /20',
                          render: (m) => `<span class="num-cell">${UI.escape(m.assignment)}</span>`,
                          className: 'num' },
                        { label: 'Midterm /30',
                          render: (m) => `<span class="num-cell">${UI.escape(m.midterm)}</span>`,
                          className: 'num' },
                        { label: 'Final /50',
                          render: (m) => `<span class="num-cell">${UI.escape(m.finalExam)}</span>`,
                          className: 'num' },
                        { label: 'Total /100',
                          render: (m) => `<strong>${UI.escape(m.total)}</strong>`,
                          className: 'num' },
                        { label: 'Grade',
                          render: (m) => UI.badge(m.grade || '—', gradeClass(m.grade)) }
                    ], marks, { emptyText: 'No marks recorded yet.' })}
                </section>`;

            $content.html(profileHtml + summaryHtml + marksHtml);

        } catch (err) {
            if (err.code === 'NO_KEY' || err.status === 401) {
                $content.html(`<div class="alert alert-error">
                    ${UI.escape(err.message)}
                    <a href="settings.html">Open Settings</a>
                </div>`);
            } else if (err.status === 403) {
                $content.html(`<div class="alert alert-error">
                    ${UI.escape(err.message)}<br>
                    This key is not a student key. Check your key on the <a href="settings.html">Settings</a> page.
                </div>`);
            } else if (err.status === 429) {
                $content.html(`<div class="alert alert-warning">
                    Request limit reached (${err.rateLimit ? err.rateLimit.used + '/' + err.rateLimit.limit : ''}). 
                    Ask your administrator to raise your limit.
                </div>`);
            } else {
                UI.showError($content, err);
            }
        }
    }

    $('#refreshBtn').on('click', loadData);
    loadData();
});
