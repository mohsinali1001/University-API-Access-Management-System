/* ------------------------------------------------------------------
   Teacher dashboard (teacher.html)
   Shows teacher profile + all student records and marks.
   Uses teacher API key stored in localStorage via KeyStore.
------------------------------------------------------------------- */
$(function () {
    UI.renderNavbar('teacher');

    let allStudents  = [];
    let allSubjects  = [];
    let departmentsLoaded = false;
    let marksLoaded  = false;

    function gradeClass(grade) {
        if (!grade) return 'neutral';
        if (grade === 'A' || grade === 'B') return 'success';
        if (grade === 'C') return 'info';
        if (grade === 'D') return 'warning';
        return 'danger';
    }

    // ====================================================================
    // Check key and load profile
    // ====================================================================
    async function init() {
        const key = KeyStore.getUserKey();
        if (!key) {
            showNoKeyError();
            return;
        }

        try {
            const { data } = await Api.get('/teacher/me');
            $('#teacherWelcome').text(`Welcome, ${data.name} — ${data.department}`);
        } catch (err) {
            if (err.status === 403 || (err.status === 401 && err.code !== 'NO_KEY')) {
                showWrongRoleError();
                return;
            }
            // Non-fatal: proceed anyway
        }

        loadStudents();
    }

    function showNoKeyError() {
        const $msg = `<div class="alert alert-error">
            No API key saved. <a href="settings.html">Open Settings</a> and save your teacher API key first.
        </div>`;
        $('#studentsBox').html($msg);
        $('#marksBox').html($msg);
    }

    function showWrongRoleError() {
        const $msg = `<div class="alert alert-error">
            The saved key is not a teacher key or is no longer valid.
            <a href="settings.html">Update your key in Settings.</a>
        </div>`;
        $('#studentsBox').html($msg);
        $('#marksBox').html($msg);
    }

    // ====================================================================
    // Students tab
    // ====================================================================
    async function loadStudents(query = {}) {
        $('#studentsBox').html(UI.loadingHtml('Loading students…'));
        try {
            const params = {};
            if (query.search)     params.search     = query.search;
            if (query.department) params.department = query.department;
            if (query.semester)   params.semester   = query.semester;

            const { data } = await Api.get('/teacher/students', params);
            allStudents = data;

            if (!departmentsLoaded) {
                populateDepartments(data);
                departmentsLoaded = true;
            }

            renderStudentsTable(data);
        } catch (err) {
            if (err.status === 403) {
                showWrongRoleError();
            } else {
                UI.showError($('#studentsBox'), err);
            }
        }
    }

    function populateDepartments(students) {
        const depts = [...new Set(students.map((s) => s.department))].sort();
        const $sel  = $('#fDepartment');
        depts.forEach((d) => $sel.append(`<option value="${UI.escape(d)}">${UI.escape(d)}</option>`));
    }

    function renderStudentsTable(students) {
        $('#studentsBox').html(UI.renderTable([
            { label: 'Roll No', key: 'rollNo' },
            { label: 'Name',    key: 'name' },
            { label: 'Email',   key: 'email' },
            { label: 'Dept',    key: 'department' },
            { label: 'Sem',     key: 'semester', className: 'num' },
            { label: 'Subjects',
              render: (s) => UI.escape(s.subjectsCount ?? '—'),
              className: 'num' },
            { label: 'Avg mark',
              render: (s) => s.averageTotal !== null ? `${UI.escape(s.averageTotal)}/100` : '—',
              className: 'num' },
            { label: 'Actions', className: 'actions',
              render: (s) =>
                `<button class="btn btn-light btn-sm" data-act="marks" data-id="${s.id}"
                         data-name="${UI.escape(s.name)}" type="button">View marks</button>` }
        ], students, { emptyText: 'No students match this filter.' }));
    }

    // Filter form
    $('#filterForm').on('submit', function (e) {
        e.preventDefault();
        loadStudents({
            search:     $('#fSearch').val().trim() || undefined,
            department: $('#fDepartment').val() || undefined,
            semester:   $('#fSemester').val() || undefined
        });
    });

    $('#clearFilters').on('click', function () {
        $('#fSearch, #fDepartment, #fSemester').val('');
        loadStudents();
    });

    // View marks for a specific student
    $('#panelStudents').on('click', '[data-act="marks"]', function () {
        const id   = $(this).data('id');
        const name = $(this).data('name');
        openStudentMarksModal(id, name);
    });

    async function openStudentMarksModal(studentId, studentName) {
        UI.openModal({
            title: `Marks — ${studentName}`,
            html:  UI.loadingHtml('Loading marks…'),
            onMount($m, close) {
                $m.addClass('modal-wide');
                Api.get(`/teacher/students/${studentId}/marks`)
                    .then(({ data }) => {
                        const { student, marks, summary } = data;
                        $m.find('.modal-body').html(`
                            <div class="profile-grid" style="margin-bottom:1rem">
                                <div class="profile-field">
                                    <span class="hint">Roll No</span>
                                    <strong>${UI.escape(student.rollNo)}</strong>
                                </div>
                                <div class="profile-field">
                                    <span class="hint">Department</span>
                                    <span>${UI.escape(student.department)}</span>
                                </div>
                                <div class="profile-field">
                                    <span class="hint">Semester</span>
                                    <span>${UI.escape(student.semester)}</span>
                                </div>
                                <div class="profile-field">
                                    <span class="hint">Overall</span>
                                    <span><strong>${UI.escape(summary.percentage)}%</strong>
                                    ${summary.grade ? UI.badge(summary.grade, gradeClass(summary.grade)) : ''}</span>
                                </div>
                            </div>
                            ${UI.renderTable([
                                { label: 'Subject', render: (m) => `<strong>${UI.escape(m.subjectCode)}</strong><br><small>${UI.escape(m.subjectName)}</small>` },
                                { label: 'Assign /20', key: 'assignment', className: 'num' },
                                { label: 'Mid /30',    key: 'midterm',    className: 'num' },
                                { label: 'Final /50',  key: 'finalExam',  className: 'num' },
                                { label: 'Total /100',
                                  render: (m) => `<strong>${UI.escape(m.total)}</strong>`, className: 'num' },
                                { label: 'Grade',
                                  render: (m) => UI.badge(m.grade || '—', gradeClass(m.grade)) }
                            ], marks, { emptyText: 'No marks recorded for this student.' })}`);
                    })
                    .catch((err) => { close(); UI.handleError(err); });
            },
            footerHtml: '<button type="button" class="btn btn-primary" data-act="close">Close</button>'
        }).$el.on('click', '[data-act="close"]', function () {
            $(this).closest('.modal-backdrop').find('.modal-close').trigger('click');
        });
    }

    // ====================================================================
    // All marks tab
    // ====================================================================
    async function loadAllMarks(subjectId) {
        $('#marksBox').html(UI.loadingHtml('Loading marks…'));
        marksLoaded = true;
        try {
            const params = subjectId ? { subjectId } : {};
            const { data } = await Api.get('/teacher/marks', params);
            const { marks } = data;

            // Populate subject filter on first load
            if (allSubjects.length === 0 && marks.length > 0) {
                const seen = new Map();
                marks.forEach((m) => { if (!seen.has(m.subjectId)) seen.set(m.subjectId, m.subjectName + ' (' + m.subjectCode + ')'); });
                seen.forEach((label, id) => {
                    $('#fSubject').append(`<option value="${UI.escape(id)}">${UI.escape(label)}</option>`);
                });
            }

            $('#marksBox').html(UI.renderTable([
                { label: 'Roll No',     key: 'rollNo' },
                { label: 'Student',     key: 'studentName' },
                { label: 'Subject',
                  render: (m) => `<strong>${UI.escape(m.subjectCode)}</strong><br><small>${UI.escape(m.subjectName)}</small>` },
                { label: 'Assign /20',  key: 'assignment',  className: 'num' },
                { label: 'Mid /30',     key: 'midterm',     className: 'num' },
                { label: 'Final /50',   key: 'finalExam',   className: 'num' },
                { label: 'Total /100',
                  render: (m) => `<strong>${UI.escape(m.total)}</strong>`, className: 'num' },
                { label: 'Grade',
                  render: (m) => UI.badge(m.grade || '—', gradeClass(m.grade)) }
            ], marks, { emptyText: 'No marks recorded.' }));
        } catch (err) {
            UI.showError($('#marksBox'), err);
        }
    }

    $('#fSubject').on('change', function () {
        const subjectId = $(this).val() || undefined;
        loadAllMarks(subjectId);
    });

    $('#reloadMarks').on('click', function () {
        loadAllMarks($('#fSubject').val() || undefined);
    });

    // ====================================================================
    // Tabs
    // ====================================================================
    $('#tabStudents, #tabMarks').on('click', function () {
        const isStudents = this.id === 'tabStudents';
        $('#tabStudents').attr('aria-selected', isStudents).toggleClass('active', isStudents);
        $('#tabMarks').attr('aria-selected', !isStudents).toggleClass('active', !isStudents);
        $('#panelStudents').toggleClass('hidden', !isStudents);
        $('#panelMarks').toggleClass('hidden', isStudents);

        // Lazy load marks only when that tab is first opened
        if (!isStudents && !marksLoaded) {
            loadAllMarks();
        }
    });

    // Set first tab as visually active
    $('#tabStudents').addClass('active');

    // ====================================================================
    // Start
    // ====================================================================
    init();
});
