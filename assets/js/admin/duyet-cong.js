// --- LOGIC TAB DUYỆT CÔNG ---

let timesheetData = [];
let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
    // Khởi tạo ngày hôm nay
    document.getElementById('dateSelect').value = new Date().toISOString().slice(0, 10);
    
    // Nút chọn ngày
    document.getElementById('dateSelect').addEventListener('change', loadAttendances);
    
    // Filter tabs
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            currentFilter = e.currentTarget.dataset.filter;
            renderAll();
        });
    });

    // Bulk approve
    document.getElementById('btnBulkApprove').addEventListener('click', async () => {
        const pendingIds = timesheetData.filter(x => x.status === 'pending').map(x => x.id);
        if (pendingIds.length > 0) {
            if(typeof UIUtils !== 'undefined') {
                UIUtils.showConfirm('Chốt hàng loạt', 'Chốt toàn bộ các ca đang chờ duyệt? (Dùng giờ thực tế admin đã nhập)', async () => {
                    UIUtils.showLoading();
                    for (const id of pendingIds) {
                        const row = timesheetData.find(x => x.id === id);
                        await ApiClient.patch(`/attendances/${id}`, {
                            status: 'present',
                            version: row.version
                        });
                    }
                    UIUtils.hideLoading();
                    loadAttendances();
                    UIUtils.showToast('🎉 Đã chốt toàn bộ ca hợp lệ!');
                });
            }
        }
    });

    // Close Modals
    document.querySelectorAll('.btn-close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById('rejectModal').classList.add('hidden');
            document.getElementById('rejectModal').classList.remove('flex');
        });
    });

    // Initial load
    loadAttendances();
});

// Helper for UI status mapping
function statusConfig(status) {
    if (status === 'present' || status === 'late' || status === 'early_leave') 
        return { cls: 'border-emerald-200 text-emerald-600 bg-emerald-50', label: '✅ Đã chốt', done: 'Đã duyệt' };
    if (status === 'absent' || status === 'no_show') 
        return { cls: 'border-red-200 text-red-600 bg-red-50', label: '❌ Từ chối', done: 'Đã từ chối' };
    return { cls: 'border-amber-200 text-amber-600 bg-amber-50', label: '⏳ Chờ duyệt', done: '' };
}

// ── GET DATA VÀ MAP ───────────────────────────────────────
async function loadAttendances() {
    const date = document.getElementById('dateSelect').value;
    if (!date) return;

    try {
        const res = await ApiClient.get(`/attendances?date=${date}`);
        if (res && res.data) {
            timesheetData = res.data.map(item => {
                const isApproved = ['present', 'late', 'early_leave'].includes(item.status);
                const isRejected = ['absent', 'no_show'].includes(item.status);
                let displayStatus = 'pending';
                if (isApproved) displayStatus = 'approved';
                if (isRejected) displayStatus = 'rejected';

                let reportIn = '--';
                let reportOut = '--';
                let adminIn = '';
                let adminOut = '';

                // Parser logic for timeEvents
                if (item.timeEvents && item.timeEvents.length > 0) {
                    const sorted = [...item.timeEvents].sort((a,b) => new Date(a.clientTime) - new Date(b.clientTime));
                    
                    const firstIn = sorted.find(e => e.actionType === 'clock_in');
                    if (firstIn) reportIn = new Date(firstIn.clientTime).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'});

                    const lastOut = sorted.slice().reverse().find(e => e.actionType === 'clock_out');
                    if (lastOut) reportOut = new Date(lastOut.clientTime).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'});

                    const lastAdminIn = sorted.slice().reverse().find(e => e.actionType === 'admin_override_in');
                    if (lastAdminIn) adminIn = new Date(lastAdminIn.clientTime).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'});
                    
                    const lastAdminOut = sorted.slice().reverse().find(e => e.actionType === 'admin_override_out');
                    if (lastAdminOut) adminOut = new Date(lastAdminOut.clientTime).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'});
                }

                // Nếu admin chưa override, hiển thị value của reportIn/Out trên input
                if (!adminIn && reportIn !== '--') adminIn = reportIn;
                if (!adminOut && reportOut !== '--') adminOut = reportOut;

                const shiftLabel = item.shift.shiftType === 'morning' ? 'Sáng' : item.shift.shiftType === 'afternoon' ? 'Chiều' : 'Tối';
                const timeSpan = `${item.shift.startTime.slice(0,5)}-${item.shift.endTime.slice(0,5)}`;

                return {
                    id: item.id,
                    version: item.version,
                    name: item.user.fullName || 'Chưa cập nhật',
                    avatar: item.user.fullName ? item.user.fullName.charAt(0).toUpperCase() : '?',
                    shift: `${shiftLabel} (${timeSpan})`,
                    date: new Date(item.shift.shiftDate).toLocaleDateString('vi-VN'),
                    reportIn: reportIn,
                    reportOut: reportOut,
                    adminIn: adminIn,
                    adminOut: adminOut,
                    status: displayStatus,
                    note: item.absentReason || '',
                    shiftDate: item.shift.shiftDate // for creating time events with correct date
                };
            });

            renderAll();
        }
    } catch (err) {
        console.error("Lỗi tải duyệt công", err);
    }
}

// ── RENDER ───────────────────────────────────────
function renderTable(data) {
    const tbody = document.getElementById('tbodyDesktop');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if(data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="py-10 text-center text-slate-500 font-semibold">Không có dữ liệu phù hợp.</td></tr>`;
        return;
    }

    data.forEach(row => {
        const isApproved = row.status === 'approved';
        const isRejected = row.status === 'rejected';
        const isPending  = row.status === 'pending';

        const sc = statusConfig(row.status);
        
        let statusBadge = '';
        if(isApproved) statusBadge = `<span class="bg-emerald-100 text-emerald-600 px-3 py-1 rounded-lg text-xs font-bold border border-emerald-200">✅ Đã chốt</span>`;
        if(isRejected) statusBadge = `<span class="bg-red-100 text-red-600 px-3 py-1 rounded-lg text-xs font-bold border border-red-200">❌ Từ chối</span>`;
        if(isPending)  statusBadge = `<span class="bg-amber-100 text-amber-600 px-3 py-1 rounded-lg text-xs font-bold border border-amber-200">⏳ Chờ duyệt</span>`;

        const inputClass = `w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none text-center font-bold font-mono transition ${(isApproved || isRejected) ? 'opacity-50 cursor-not-allowed bg-slate-100 border-transparent' : ''}`;
        const timeInClass = (row.adminIn !== row.reportIn && !isApproved && !isRejected) ? '!bg-amber-50 !border-amber-300 !text-amber-700' : '';
        const timeOutClass = (row.adminOut !== row.reportOut && !isApproved && !isRejected) ? '!bg-amber-50 !border-amber-300 !text-amber-700' : '';

        const actions = isPending ? `
            <div class="flex items-center justify-center gap-2">
                <button class="bg-emerald-50 hover:bg-emerald-500 text-emerald-600 hover:text-white border border-emerald-200 hover:border-emerald-500 font-bold px-3 py-1.5 rounded-lg transition text-xs btn-approve" data-id="${row.id}">
                    ✅ Chốt ca
                </button>
                <button class="bg-red-50 hover:bg-red-500 text-red-600 hover:text-white border border-red-200 hover:border-red-500 font-bold px-3 py-1.5 rounded-lg transition text-xs btn-reject" data-id="${row.id}">
                    ❌ Từ chối
                </button>
            </div>
        ` : `
            <div class="text-center">
                <button class="text-slate-400 hover:text-indigo-600 text-xs font-semibold underline btn-undo" data-id="${row.id}">↩️ Hoàn tác</button>
            </div>
        `;

        const tr = document.createElement('tr');
        tr.className = `hover:bg-slate-50 transition border-b border-slate-100 ${isRejected ? 'bg-red-50/30' : ''} ${isApproved ? 'bg-emerald-50/20' : ''}`;
        tr.innerHTML = `
            <td class="py-4 px-4">
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-sm shrink-0">${row.avatar}</div>
                    <div>
                        <div class="font-bold text-slate-800 text-sm">${row.name}</div>
                        <div class="text-[11px] text-slate-500 font-semibold mt-0.5">${row.shift}</div>
                    </div>
                </div>
            </td>
            <td class="py-4 px-3 text-center">
                <div class="inline-flex bg-slate-100 text-slate-600 font-mono text-xs font-bold px-2 py-1 rounded-md border border-slate-200 shadow-inner">
                    ${row.reportIn} <span class="mx-1 text-slate-400">→</span> ${row.reportOut}
                </div>
            </td>
            <td class="py-4 px-3">
                <div class="flex items-center gap-2 max-w-[180px] mx-auto">
                    <input type="time" class="${inputClass} ${timeInClass} time-input-in" data-id="${row.id}" ${isApproved || isRejected ? 'disabled' : ''} value="${row.adminIn || ''}" placeholder="HH:MM">
                    <span class="text-slate-300 font-bold">-</span>
                    <input type="time" class="${inputClass} ${timeOutClass} time-input-out" data-id="${row.id}" ${isApproved || isRejected ? 'disabled' : ''} value="${row.adminOut || ''}" placeholder="HH:MM">
                </div>
            </td>
            <td class="py-4 px-3 text-center">
                ${statusBadge}
                ${row.note ? `<div class="text-[10px] text-red-500 font-bold mt-1">Lý do: ${row.note}</div>` : ''}
            </td>
            <td class="py-4 px-4 text-center">
                ${actions}
            </td>
        `;
        tbody.appendChild(tr);
    });

    attachRowEvents();
}

// (Tương tự có thể render Mobile nếu cần, ở đây viết gọn tập trung logic API)

function updateUI() {
    const pending = timesheetData.filter(x => x.status === 'pending').length;
    const approved = timesheetData.filter(x => x.status === 'approved').length;
    const rejected = timesheetData.filter(x => x.status === 'rejected').length;

    document.getElementById('sumPending').innerText = pending;
    document.getElementById('sumApproved').innerText = approved;
    document.getElementById('sumRejected').innerText = rejected;

    const btnBulk = document.getElementById('btnBulkApprove');
    if (btnBulk) {
        if(pending > 0) {
            btnBulk.disabled = false;
            btnBulk.classList.remove('opacity-50', 'cursor-not-allowed');
        } else {
            btnBulk.disabled = true;
            btnBulk.classList.add('opacity-50', 'cursor-not-allowed');
        }
    }

    document.querySelectorAll('.filter-tab').forEach(t => {
        t.classList.remove('bg-indigo-100', 'text-indigo-700', 'border-indigo-200');
        t.classList.add('bg-white', 'text-slate-600', 'border-slate-200', 'hover:bg-slate-50');
    });
    const activeTab = document.querySelector(`.filter-tab[data-filter="${currentFilter}"]`);
    if(activeTab) {
        activeTab.classList.remove('bg-white', 'text-slate-600', 'border-slate-200', 'hover:bg-slate-50');
        activeTab.classList.add('bg-indigo-100', 'text-indigo-700', 'border-indigo-200');
    }
}

function renderAll() {
    let filtered = timesheetData;
    if(currentFilter !== 'all') {
        filtered = timesheetData.filter(x => x.status === currentFilter);
    }
    renderTable(filtered);
    updateUI();
}

// ── EVENTS ───────────────────────────────────────
let rejectTargetId = null;

function attachRowEvents() {
    // Approve
    document.querySelectorAll('.btn-approve').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = parseInt(e.currentTarget.dataset.id);
            const row = timesheetData.find(x => x.id === id);
            if(row) {
                try {
                    await ApiClient.patch(`/attendances/${id}`, {
                        status: 'present',
                        version: row.version
                    });
                    loadAttendances();
                    if(typeof UIUtils !== 'undefined') UIUtils.showToast('✅ Đã chốt ca cho ' + row.name);
                } catch(err) {
                    console.error("Lỗi khi chốt ca", err);
                }
            }
        });
    });

    // Reject (Open Modal)
    document.querySelectorAll('.btn-reject').forEach(btn => {
        btn.addEventListener('click', (e) => {
            rejectTargetId = parseInt(e.currentTarget.dataset.id);
            document.getElementById('rejectReason').value = '';
            document.getElementById('rejectModal').classList.remove('hidden');
            document.getElementById('rejectModal').classList.add('flex');
        });
    });

    // Undo
    document.querySelectorAll('.btn-undo').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = parseInt(e.currentTarget.dataset.id);
            const row = timesheetData.find(x => x.id === id);
            if(row) {
                try {
                    await ApiClient.patch(`/attendances/${id}`, {
                        status: 'pending',
                        version: row.version
                    });
                    loadAttendances();
                } catch(err) {
                    console.error("Lỗi undo", err);
                }
            }
        });
    });

    // Change Time
    document.querySelectorAll('.time-input-in, .time-input-out').forEach(inp => {
        inp.addEventListener('change', async (e) => {
            const id = parseInt(e.target.dataset.id);
            const row = timesheetData.find(x => x.id === id);
            if(row && e.target.value) {
                // Construct Date object combining shiftDate and new time
                const [hh, mm] = e.target.value.split(':');
                const dt = new Date(row.shiftDate);
                dt.setHours(parseInt(hh), parseInt(mm), 0, 0);
                
                const actionType = e.target.classList.contains('time-input-in') ? 'admin_override_in' : 'admin_override_out';
                try {
                    await ApiClient.post(`/attendances/${id}/time-event`, {
                        actionType: actionType,
                        clientTime: dt.toISOString(),
                        note: 'Admin sửa giờ'
                    });
                    loadAttendances();
                } catch (err) {
                    console.error("Lỗi sửa giờ", err);
                }
            }
        });
    });
}

// Confirm Reject inside Modal
document.getElementById('confirmReject').addEventListener('click', async () => {
    const reason = document.getElementById('rejectReason').value.trim();
    if(!reason) {
        document.getElementById('rejectReason').style.borderColor = '#ef4444';
        return;
    }
    if(rejectTargetId) {
        const row = timesheetData.find(x => x.id === rejectTargetId);
        if(row) {
            try {
                await ApiClient.patch(`/attendances/${rejectTargetId}`, {
                    status: 'absent',
                    absentReason: reason,
                    version: row.version
                });
                document.getElementById('rejectModal').classList.add('hidden');
                document.getElementById('rejectModal').classList.remove('flex');
                loadAttendances();
                if(typeof UIUtils !== 'undefined') UIUtils.showToast('❌ Đã từ chối ca');
            } catch (err) {
                console.error("Lỗi từ chối ca", err);
            }
        }
    }
});
