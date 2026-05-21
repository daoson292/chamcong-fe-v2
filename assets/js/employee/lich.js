document.addEventListener('DOMContentLoaded', () => {
    // Check user info
    const initUserInfo = () => {
        const userDataStr = localStorage.getItem('user_data');
        if (userDataStr) {
            try {
                const userData = JSON.parse(userDataStr);
            } catch (e) {
                console.error("Lỗi parse user_data:", e);
            }
        }
    };
    initUserInfo();

    const weekLabelText = document.getElementById('weekLabelText');
    const todayText = document.getElementById('todayText');
    const registeredCountVal = document.getElementById('registeredCountVal');
    
    const hotShiftBlock = document.getElementById('hotShiftBlock');
    const closedBannerBlock = document.getElementById('closedBannerBlock');
    const normalShiftsBlock = document.getElementById('normalShiftsBlock');

    // Update today's text dynamically
    const updateTodayText = () => {
        if (!todayText) return;
        const now = new Date();
        const days = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
        const dayName = days[now.getDay()];
        const dateStr = now.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
        todayText.innerHTML = `Hôm nay: <span class="text-indigo-600 font-bold">${dayName} (${dateStr})</span>`;
    };
    updateTodayText();

    let myRegistrations = [];

    const loadLichData = async () => {
        try {
            // 1. Fetch user's registered shifts
            const myScheduleRes = await ApiClient.get('/my/schedule');
            myRegistrations = (myScheduleRes && myScheduleRes.data) ? myScheduleRes.data : [];
            
            // Set registered count
            const activeRegs = myRegistrations.filter(r => r.status !== 'cancelled');
            if (registeredCountVal) {
                registeredCountVal.innerText = activeRegs.length;
            }

            // 2. Fetch published registration periods
            const periodsRes = await ApiClient.get('/registration-periods');
            if (!periodsRes || !periodsRes.data || periodsRes.data.length === 0) {
                if (weekLabelText) weekLabelText.innerText = 'Không có đợt đăng ký nào';
                return;
            }

            // Find the latest published period
            const publishedPeriods = periodsRes.data.filter(p => p.isPublished);
            if (publishedPeriods.length === 0) {
                if (weekLabelText) weekLabelText.innerText = 'Không có đợt đăng ký nào';
                return;
            }

            const activePeriod = publishedPeriods[0]; // Sort order is startDate: 'desc'
            
            // Update week label
            if (weekLabelText) {
                const startStr = new Date(activePeriod.startDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
                const endStr = new Date(activePeriod.endDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
                weekLabelText.innerText = `Tuần ${startStr} - ${endStr}`;
            }

            // Check if period is open for registration
            const allowEditUntil = new Date(activePeriod.allowEditUntil);
            const isPeriodOpen = allowEditUntil > new Date();

            if (isPeriodOpen) {
                closedBannerBlock.classList.add('hidden');
                normalShiftsBlock.classList.remove('hidden');
            } else {
                closedBannerBlock.classList.remove('hidden');
                normalShiftsBlock.classList.remove('hidden'); // We still show normal shifts but locked
            }

            // 3. Fetch shifts in this period
            const shiftsRes = await ApiClient.get(`/registration-periods/${activePeriod.id}/shifts`);
            const shifts = (shiftsRes && shiftsRes.data) ? shiftsRes.data : [];

            renderShifts(shifts, isPeriodOpen);

        } catch (err) {
            console.error('Lỗi tải dữ liệu lịch:', err);
        }
    };

    const renderShifts = (shifts, isPeriodOpen) => {
        if (!normalShiftsBlock) return;
        normalShiftsBlock.innerHTML = '';
        hotShiftBlock.classList.add('hidden');

        if (shifts.length === 0) {
            normalShiftsBlock.innerHTML = '<p class="text-xs text-slate-400 text-center py-4">Chưa có ca làm nào được cấu hình trong đợt này.</p>';
            return;
        }

        // Check if there is a hot shift
        const todayStr = new Date().toISOString().split('T')[0];
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        const hotShiftCandidates = shifts.filter(s => {
            const shiftDateStr = s.shiftDate.split('T')[0];
            const isRecent = (shiftDateStr === todayStr || shiftDateStr === tomorrowStr);
            const registeredCount = s._count?.shiftRegistrations || 0;
            return isRecent && registeredCount < s.maxWorkers;
        });

        if (hotShiftCandidates.length > 0) {
            const hotShift = hotShiftCandidates[0];
            setupHotShift(hotShift);
        }

        // Group shifts by date
        const groupedShifts = {};
        shifts.forEach(shift => {
            const dateStr = shift.shiftDate.split('T')[0];
            if (!groupedShifts[dateStr]) {
                groupedShifts[dateStr] = [];
            }
            groupedShifts[dateStr].push(shift);
        });

        // Render each date group
        Object.keys(groupedShifts).sort().forEach(dateStr => {
            const dateObj = new Date(dateStr);
            const days = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
            const dayName = days[dateObj.getDay()];
            const formattedDate = dateObj.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });

            const groupHeader = `
                <div class="text-xs font-black text-slate-400 uppercase tracking-wider mb-2 mt-4 pl-1">
                    ${dayName} (${formattedDate})
                </div>
            `;
            normalShiftsBlock.insertAdjacentHTML('beforeend', groupHeader);

            groupedShifts[dateStr].forEach(shift => {
                const registeredCount = shift._count?.shiftRegistrations || 0;
                const isFull = registeredCount >= shift.maxWorkers;

                // Check if user already registered for this shift
                const userReg = myRegistrations.find(r => r.shiftId === shift.id && r.status !== 'cancelled');
                const isRegistered = !!userReg;

                const shiftTypeMap = {
                    'morning': 'Ca Sáng',
                    'afternoon': 'Ca Chiều',
                    'night': 'Ca Tối'
                };
                const shiftTypeLabel = shiftTypeMap[shift.shiftType] || shift.shiftType;
                const shiftIcon = shift.shiftType === 'morning' ? '☀️' : shift.shiftType === 'afternoon' ? '🌤️' : '🌙';

                let actionButton = '';
                if (!isPeriodOpen) {
                    if (isRegistered) {
                        actionButton = `<button class="bg-indigo-600 text-white font-bold py-2 px-6 rounded-lg text-xs cursor-not-allowed opacity-80" disabled>✓ Đã đăng ký</button>`;
                    } else {
                        actionButton = `<button class="bg-slate-200 text-slate-400 font-bold py-2 px-6 rounded-lg text-xs cursor-not-allowed" disabled>🔒 Đã đóng</button>`;
                    }
                } else {
                    if (isRegistered) {
                        actionButton = `
                            <button onclick="cancelShift(${userReg.id}, this)" class="bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 font-bold py-2 px-6 rounded-lg text-xs transition active:scale-95">
                                Hủy đăng ký
                            </button>
                        `;
                    } else if (isFull) {
                        actionButton = `<button class="bg-slate-200 text-slate-400 font-bold py-2 px-6 rounded-lg text-xs cursor-not-allowed" disabled>FULL</button>`;
                    } else {
                        actionButton = `
                            <button onclick="registerShift(${shift.id}, this)" class="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 font-bold py-2 px-6 rounded-lg text-xs transition active:scale-95">
                                Đăng ký
                            </button>
                        `;
                    }
                }

                const spotsLeft = shift.maxWorkers - registeredCount;
                const spotsBadge = isFull 
                    ? `<span class="bg-slate-100 text-slate-500 text-[10px] font-black px-2 py-0.5 rounded">FULL</span>`
                    : `<span class="bg-emerald-50 text-emerald-700 text-[10px] font-black px-2 py-0.5 rounded border border-emerald-100">Còn ${spotsLeft} chỗ</span>`;

                const cardHtml = `
                    <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-4 relative mb-3">
                        <div class="flex justify-between items-start mb-2">
                            <div>
                                <h3 class="font-bold text-slate-800 text-base">${shiftIcon} ${shiftTypeLabel} (${shift.startTime} - ${shift.endTime})</h3>
                            </div>
                            ${spotsBadge}
                        </div>
                        <div class="flex justify-between items-center mt-3 border-t border-slate-100 pt-3">
                            <div class="text-[11px] font-bold text-slate-500">Đã đk: <span class="text-slate-800">${registeredCount}/${shift.maxWorkers} người</span></div>
                            ${actionButton}
                        </div>
                    </div>
                `;
                normalShiftsBlock.insertAdjacentHTML('beforeend', cardHtml);
            });
        });
    };

    const setupHotShift = (shift) => {
        if (!hotShiftBlock) return;
        const registeredCount = shift._count?.shiftRegistrations || 0;
        
        const shiftTypeMap = {
            'morning': 'Ca Sáng',
            'afternoon': 'Ca Chiều',
            'night': 'Ca Tối'
        };
        const shiftTypeLabel = shiftTypeMap[shift.shiftType] || shift.shiftType;
        const shiftIcon = shift.shiftType === 'morning' ? '☀️' : shift.shiftType === 'afternoon' ? '🌤️' : '🌙';

        const shiftDateObj = new Date(shift.shiftDate);
        const todayStr = new Date().toISOString().split('T')[0];
        const isToday = shift.shiftDate.split('T')[0] === todayStr;
        const dateText = isToday ? 'Hôm nay' : 'Ngày mai';

        const userReg = myRegistrations.find(r => r.shiftId === shift.id && r.status !== 'cancelled');
        
        const contentArea = hotShiftBlock.querySelector('.p-4');
        if (contentArea) {
            contentArea.innerHTML = `
                <div class="flex items-center gap-2 mb-1">
                    <span class="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded shadow-sm">${dateText}</span>
                </div>
                <h3 class="font-black text-slate-800 text-lg mb-1">${shiftIcon} ${shiftTypeLabel} (${shift.startTime} - ${shift.endTime})</h3>
                <p class="text-[11px] font-bold text-orange-600 mb-3 blink-text">👀 Sếp cần bổ sung gấp nhân sự cho ca này!</p>
                <div class="flex justify-between items-center mt-4" id="hotShiftActionArea">
                    <div class="text-[11px] font-bold text-slate-500">Đã đk: <span class="text-slate-800">${registeredCount}/${shift.maxWorkers} người</span></div>
                    ${userReg 
                        ? `<button class="bg-emerald-500 text-white font-black py-2.5 px-5 rounded-lg text-sm shadow-md cursor-default" disabled>Bạn đã đăng ký ✓</button>`
                        : `<button onclick="claimHotShift(${shift.id}, this)" class="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 text-white font-black py-2.5 px-5 rounded-lg text-sm shadow-lg shadow-red-500/30 transition-transform transform active:scale-95">
                                Giật Ca Ngay ⚡
                           </button>`
                    }
                </div>
            `;
        }
        hotShiftBlock.classList.remove('hidden');
    };

    window.claimHotShift = async (shiftId, btn) => {
        try {
            await ApiClient.post('/my/shift-registrations', { shiftId });
            
            var duration = 2 * 1000;
            var end = Date.now() + duration;
            (function frame() {
                confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#ef4444', '#f97316'] });
                confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#ef4444', '#f97316'] });
                if (Date.now() < end) requestAnimationFrame(frame);
            }());

            btn.innerHTML = 'Đã Nhận Thành Công ✅';
            btn.className = "bg-emerald-500 text-white font-black py-2.5 px-5 rounded-lg text-sm shadow-md cursor-default";
            const container = btn.closest('#hotShiftActionArea');
            if (container) {
                container.classList.remove('justify-between');
                container.classList.add('flex-col', 'items-start');
            }

            setTimeout(() => {
                UIUtils.showAlert('Giật Ca Thành Công', 'Quá đỉnh! Bạn đã nhận ca thành công. Đi làm đúng giờ nhé!', true);
                loadLichData();
            }, 500);
        } catch (err) {
            console.error('Lỗi giật ca:', err);
        }
    };

    window.registerShift = async (shiftId, btn) => {
        try {
            btn.disabled = true;
            btn.innerText = 'Đang đk...';
            await ApiClient.post('/my/shift-registrations', { shiftId });
            UIUtils.showAlert('Đăng ký thành công', 'Bạn đã đăng ký ca làm việc thành công!', true);
            loadLichData();
        } catch (err) {
            btn.disabled = false;
            btn.innerText = 'Đăng ký';
            console.error('Lỗi đăng ký ca:', err);
        }
    };

    window.cancelShift = async (registrationId, btn) => {
        try {
            btn.disabled = true;
            btn.innerText = 'Đang huỷ...';
            await ApiClient.delete(`/my/shift-registrations/${registrationId}`);
            UIUtils.showAlert('Đã huỷ đăng ký', 'Bạn đã huỷ đăng ký ca thành công!', true);
            loadLichData();
        } catch (err) {
            btn.disabled = false;
            btn.innerText = 'Hủy đăng ký';
            console.error('Lỗi huỷ ca:', err);
        }
    };

    loadLichData();
});