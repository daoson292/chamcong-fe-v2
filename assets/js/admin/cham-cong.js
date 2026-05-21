// --- LOGIC TAB CHẤM CÔNG ---

let shiftData = [
    { shift:'sang',  label:'☀️ Ca Sáng',  time:'08:00 - 12:00', color:'indigo',  startH:8,  endH:12, employees:[] },
    { shift:'chieu', label:'🌤️ Ca Chiều', time:'13:30 - 17:30', color:'amber',   startH:13, endH:18, employees:[] },
    { shift:'toi',   label:'🌙 Ca Tối',   time:'18:00 - 22:00', color:'violet',  startH:18, endH:22, employees:[] },
];

let pendingAbsentId = null;
let pendingAbsentShift = null;
const lockedShifts = {};

document.addEventListener('DOMContentLoaded', () => {
    // Khởi tạo ngày hôm nay
    document.getElementById('selectedDate').value = new Date().toISOString().slice(0,10);
    
    // Nút Tải danh sách
    document.getElementById('btnLoad').addEventListener('click', loadAttendances);
    
    // Tải lần đầu tiên
    loadAttendances();
});

async function loadAttendances() {
    const date = document.getElementById('selectedDate').value;
    if (!date) return;

    try {
        const res = await ApiClient.get(`/attendances?date=${date}`);
        if (res && res.data) {
            // Khởi tạo lại employees array cho mỗi ca
            shiftData.forEach(block => block.employees = []);

            // Phân loại data vào shiftData
            res.data.forEach(item => {
                const shiftType = item.shift.shiftType; // morning, afternoon, night, custom
                let blockId = '';
                if (shiftType === 'morning') blockId = 'sang';
                else if (shiftType === 'afternoon') blockId = 'chieu';
                else if (shiftType === 'night') blockId = 'toi';
                else return; // Bỏ qua custom cho UI hiện tại hoặc xử lý sau

                const block = shiftData.find(b => b.shift === blockId);
                if (block) {
                    block.employees.push({
                        id: item.id, // Lưu ý: dùng attendance.id cho thao tác
                        userId: item.user.id,
                        name: item.user.fullName || 'Chưa có tên',
                        av: item.user.fullName ? item.user.fullName.charAt(0).toUpperCase() : '?',
                        role: item.user.position || 'Nhân viên',
                        status: item.status, // 'pending', 'present', 'absent', 'late', 'early_leave', 'no_show'
                        reason: item.absentReason || '',
                        version: item.version
                    });
                }
            });

            // Tùy chọn: Gán cứng thời gian từ DB nếu muốn
            // Nhưng hiện tại UI đang fix cứng UI blocks

            renderAll();
            
            const bar = document.getElementById('summaryBar');
            bar.classList.remove('hidden');
            bar.classList.add('flex');
            updateSummary();
        }
    } catch (err) {
        console.error("Lỗi khi tải chấm công", err);
    }
}

// ── RENDER TẤT CẢ CA ─────────────────────────────────────────
function renderAll() {
    const now = new Date();
    const nowH = now.getHours() + now.getMinutes()/60;

    document.getElementById('mainContent').innerHTML = shiftData.map(block => {
        const total   = block.employees.length;
        const present = block.employees.filter(e => e.status === 'present' || e.status === 'late' || e.status === 'early_leave').length;
        const absent  = block.employees.filter(e => e.status === 'absent' || e.status === 'no_show').length;
        const pct     = total ? Math.round(present/total*100) : 0;
        const isActive= nowH >= block.startH && nowH < block.endH;
        const isDone  = present + absent === total && total > 0;
        const isLocked= !!lockedShifts[block.shift];

        const colorMap = {indigo:'bg-indigo-600',amber:'bg-amber-500',violet:'bg-violet-600'};
        const lightMap = {indigo:'bg-indigo-50 border-indigo-200',amber:'bg-amber-50 border-amber-200',violet:'bg-violet-50 border-violet-200'};
        const textMap  = {indigo:'text-indigo-700',amber:'text-amber-700',violet:'text-violet-700'};

        const activeBadge = isActive ? `<span class="animate-pulse text-[10px] font-black bg-indigo-600 text-white px-2 py-0.5 rounded-full">● Đang diễn ra</span>` : '';
        const lockBadge   = isLocked ? `<span class="text-[10px] font-black bg-slate-700 text-white px-2 py-0.5 rounded-full">🔒 Đã khoá</span>` : '';
        const doneBadge   = isDone && !isLocked ? `<span class="text-[10px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">✅ Đã điểm đủ</span>` : '';

        const empRows = block.employees.map(emp => {
            const isPresent = emp.status === 'present' || emp.status === 'late' || emp.status === 'early_leave';
            const isAbsent = emp.status === 'absent' || emp.status === 'no_show';
            const stC = isPresent ? 'present' : isAbsent ? 'absent' : '';
            const note = isAbsent && emp.reason
                ? `<div class="mt-2 bg-red-50 border border-red-100 rounded-lg px-3 py-1.5 text-xs text-red-700 font-semibold">📝 ${emp.reason}</div>` : '';
            return `
            <div class="emp-row ${stC} border-2 border-slate-200 rounded-xl p-3 bg-white" id="row-${block.shift}-${emp.id}">
                <div class="flex items-center gap-3 flex-wrap">
                    <div class="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-base shrink-0">${emp.av}</div>
                    <div class="flex-1 min-w-[100px]">
                        <div class="font-black text-slate-800 text-sm">${emp.name}</div>
                        <div class="text-[11px] text-slate-400 font-semibold">${emp.role}</div>
                    </div>
                    <div class="flex gap-2 ml-auto shrink-0">
                        <button class="btn-present bg-emerald-50 hover:bg-emerald-500 hover:text-white border-2 border-emerald-300 text-emerald-700 font-black py-2 px-4 rounded-xl transition text-sm"
                                data-shift="${block.shift}" data-id="${emp.id}" data-version="${emp.version}">✅ Có Mặt</button>
                        <button class="btn-absent bg-red-50 hover:bg-red-500 hover:text-white border-2 border-red-300 text-red-600 font-black py-2 px-4 rounded-xl transition text-sm"
                                data-shift="${block.shift}" data-id="${emp.id}" data-name="${emp.name}" data-version="${emp.version}">❌ Vắng</button>
                    </div>
                </div>
                ${note}
            </div>`;
        }).join('');

        if (total === 0) {
            return `
            <div class="shift-block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-5 ${isActive?'is-active':''} ${isDone?'is-done':''} ${isLocked?'is-locked':''}" id="block-${block.shift}">
                <div class="shift-header px-5 py-4 border-b border-slate-100 ${lightMap[block.color]} flex flex-wrap items-center justify-between gap-3">
                    <div class="flex items-center gap-3 flex-wrap">
                        <h3 class="font-black text-lg ${textMap[block.color]}">${block.label}</h3>
                        <span class="text-xs font-bold text-slate-500 bg-white px-2 py-1 rounded-full border border-slate-200">${block.time}</span>
                    </div>
                </div>
                <div class="p-4 text-center text-slate-500 text-sm font-semibold">Chưa có nhân viên nào trong ca này</div>
            </div>`;
        }

        return `
        <div class="shift-block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-5 ${isActive?'is-active':''} ${isDone?'is-done':''} ${isLocked?'is-locked':''}" id="block-${block.shift}">
            <!-- Header ca -->
            <div class="shift-header px-5 py-4 border-b border-slate-100 ${lightMap[block.color]} flex flex-wrap items-center justify-between gap-3">
                <div class="flex items-center gap-3 flex-wrap">
                    <h3 class="font-black text-lg ${textMap[block.color]}">${block.label}</h3>
                    <span class="text-xs font-bold text-slate-500 bg-white px-2 py-1 rounded-full border border-slate-200">${block.time}</span>
                    ${activeBadge}${doneBadge}${lockBadge}
                </div>
                <div class="flex items-center gap-3">
                    <span class="text-sm font-black text-slate-700">Có mặt <span class="text-emerald-600">${present}</span>/${total}</span>
                    ${!isLocked ? `
                    <button class="btn-all-present bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-slate-600 hover:text-emerald-700 font-bold text-xs py-1.5 px-3 rounded-lg transition" data-shift="${block.shift}">✅ Tất cả có mặt</button>
                    ${isDone ? `<button class="btn-lock bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs py-1.5 px-3 rounded-lg transition" data-shift="${block.shift}">🔒 Khoá ca</button>` : ''}
                    ` : `<button class="btn-unlock bg-amber-100 hover:bg-amber-200 border border-amber-200 text-amber-700 font-bold text-xs py-1.5 px-3 rounded-lg transition" data-shift="${block.shift}">🔓 Mở khoá</button>`}
                </div>
            </div>

            <!-- Progress bar -->
            <div class="px-5 py-2 bg-slate-50 border-b border-slate-100">
                <div class="flex items-center gap-3">
                    <div class="flex-1 bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div class="progress-fill h-2 rounded-full ${pct===100?'bg-emerald-500':'bg-indigo-500'}" style="width:${pct}%"></div>
                    </div>
                    <span class="text-[11px] font-black ${pct===100?'text-emerald-600':'text-slate-500'} w-8 text-right">${pct}%</span>
                </div>
            </div>

            <!-- Danh sách NV -->
            <div class="p-4 space-y-2">${empRows}</div>
        </div>`;
    }).join('');
}

// ── CẬP NHẬT SUMMARY ─────────────────────────────────────────
function updateSummary() {
    const all = shiftData.flatMap(b => b.employees);
    document.getElementById('sTotal').textContent   = all.length;
    document.getElementById('sPresent').textContent = all.filter(e => e.status === 'present' || e.status === 'late' || e.status === 'early_leave').length;
    document.getElementById('sAbsent').textContent  = all.filter(e => e.status === 'absent' || e.status === 'no_show').length;
    
    const p = all.filter(e => e.status === 'pending').length;
    document.getElementById('sPending').textContent = p;
    
    const btn = document.getElementById('btnSaveAll');
    if (btn) {
        btn.disabled = p > 0;
        btn.classList.toggle('opacity-40', p > 0);
        btn.classList.toggle('cursor-not-allowed', p > 0);
    }
}

// ── EVENT DELEGATION ──────────────────────────────────────────
document.getElementById('mainContent').addEventListener('click', async function(e){
    // CÓ MẶT
    const pb = e.target.closest('.btn-present');
    if (pb) {
        const attendanceId = pb.dataset.id;
        const version = parseInt(pb.dataset.version);
        
        try {
            await ApiClient.patch(`/attendances/${attendanceId}`, {
                status: 'present',
                version: version
            });
            // Tải lại sau khi thao tác
            loadAttendances();
        } catch (err) {
            console.error('Lỗi khi check có mặt', err);
        }
        return;
    }

    // VẮNG
    const ab = e.target.closest('.btn-absent');
    if (ab) {
        pendingAbsentId    = +ab.dataset.id;
        pendingAbsentShift = ab.dataset.shift;
        document.getElementById('absentEmpName').textContent = 'Nhân viên: ' + ab.dataset.name;
        document.getElementById('absentReason').value = '';
        document.getElementById('applyPenalty').checked = false;
        document.querySelectorAll('.qr').forEach(b => b.classList.remove('bg-indigo-600','text-white','border-indigo-600'));
        const m = document.getElementById('absentModal');
        m.classList.remove('hidden'); m.classList.add('flex');
        return;
    }

    // TẤT CẢ CÓ MẶT
    const allBtn = e.target.closest('.btn-all-present');
    if (allBtn) {
        const shiftId = allBtn.dataset.shift;
        const block = shiftData.find(b => b.shift === shiftId);
        if (block) {
            const pendingIds = block.employees
                .filter(emp => emp.status === 'pending')
                .map(emp => emp.id);
            
            if (pendingIds.length > 0) {
                try {
                    await ApiClient.post('/attendances/bulk-present', {
                        attendanceIds: pendingIds
                    });
                    loadAttendances();
                } catch (err) {
                    console.error('Lỗi khi bulk present', err);
                }
            }
        }
        return;
    }

    // KHOÁ CA
    const lockBtn = e.target.closest('.btn-lock');
    if (lockBtn) { 
        lockedShifts[lockBtn.dataset.shift] = true; 
        renderAll(); 
        return; 
    }

    // MỞ KHOÁ
    const unlockBtn = e.target.closest('.btn-unlock');
    if (unlockBtn) { 
        delete lockedShifts[unlockBtn.dataset.shift]; 
        renderAll(); 
    }
});

// ── MODAL VẮng ───────────────────────────────────────────────
const quickReasons = document.getElementById('quickReasons');
if (quickReasons) {
    quickReasons.addEventListener('click', e => {
        const b = e.target.closest('.qr');
        if (!b) return;
        document.querySelectorAll('.qr').forEach(x => x.classList.remove('bg-indigo-600','text-white','border-indigo-600'));
        b.classList.add('bg-indigo-600','text-white','border-indigo-600');
        document.getElementById('absentReason').value = b.textContent.trim();
    });
}

function closeModal(){
    document.getElementById('absentModal').classList.add('hidden');
    document.getElementById('absentModal').classList.remove('flex');
}

const cancelAbsent = document.getElementById('cancelAbsent');
if (cancelAbsent) cancelAbsent.addEventListener('click', closeModal);

const absentModal = document.getElementById('absentModal');
if (absentModal) {
    absentModal.addEventListener('click', e => { 
        if(e.target === e.currentTarget) closeModal(); 
    });
}

const confirmAbsent = document.getElementById('confirmAbsent');
if (confirmAbsent) {
    confirmAbsent.addEventListener('click', async () => {
        const reason = document.getElementById('absentReason').value.trim();
        if (!reason) {
            document.getElementById('absentReason').style.borderColor='#ef4444';
            document.getElementById('absentReason').focus();
            return;
        }
        
        const block = shiftData.find(b => b.shift === pendingAbsentShift);
        const emp = block?.employees.find(r => r.id === pendingAbsentId);
        
        if (emp) {
            try {
                await ApiClient.patch(`/attendances/${emp.id}`, {
                    status: 'absent',
                    absentReason: reason + (document.getElementById('applyPenalty').checked ? ' [GHI PHẠT]' : ''),
                    version: emp.version
                });
                closeModal();
                loadAttendances(); // Reload data
            } catch (err) {
                console.error('Lỗi khi set vắng mặt', err);
            }
        }
    });
}

// ── LƯU TOÀN BỘ ──────────────────────────────────────────────
const btnSaveAll = document.getElementById('btnSaveAll');
if (btnSaveAll) {
    btnSaveAll.addEventListener('click', function(){
        const all     = shiftData.flatMap(b => b.employees);
        const present = all.filter(e => e.status === 'present' || e.status === 'late' || e.status === 'early_leave').length;
        const absent  = all.filter(e => e.status === 'absent' || e.status === 'no_show').length;
        
        if (typeof UIUtils !== 'undefined')
            UIUtils.showAlert('💾 Đã Lưu Điểm Danh ✅',
                `✅ Có mặt: ${present} người\n❌ Vắng: ${absent} người\n\nDữ liệu đồng bộ sang "Chốt Ca" cuối ngày.`, true);
        
        this.innerHTML = '✅ Đã Lưu!';
        this.classList.replace('bg-indigo-600','bg-emerald-600');
        this.disabled = true;
    });
}