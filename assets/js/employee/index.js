document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // 1. TẢI THÔNG TIN NGƯỜI DÙNG TỪ LOCALSTORAGE
    // ==========================================
    const initUserInfo = () => {
        try {
            const userDataStr = localStorage.getItem('user_data');
            if (userDataStr) {
                const user = JSON.parse(userDataStr);
                
                const nameEl = document.getElementById('empFullName');
                const roleEl = document.getElementById('empRole');
                const avatarEl = document.getElementById('empAvatar');

                if (nameEl) nameEl.innerText = user.fullName || user.phone || 'Nhân viên';
                if (roleEl) {
                    const roleMap = {
                        'employee': 'Nhân viên',
                        'admin': 'Quản lý',
                        'super_admin': 'Giám đốc'
                    };
                    roleEl.innerText = roleMap[user.role] || user.role || 'Nhân viên';
                }
                if (avatarEl) {
                    const nameForAvatar = encodeURIComponent(user.fullName || 'NV');
                    avatarEl.src = `https://ui-avatars.com/api/?name=${nameForAvatar}&background=c7d2fe&color=3730a3&bold=true`;
                }
            } else {
                // Nếu không có user_data, kick về trang chủ
                window.location.href = '../login.html';
            }
        } catch (error) {
            console.error("Lỗi parse user_data:", error);
        }
    };

    initUserInfo();

    // ==========================================
    // 2. DYNAMIC WEEK CALENDAR GENERATION
    // ==========================================
    const renderWeekCalendar = () => {
        const dateScroll = document.getElementById('dateScroll');
        if (!dateScroll) return;

        const now = new Date();
        const currentDay = now.getDay();
        const monday = new Date(now);
        const diff = currentDay === 0 ? -6 : 1 - currentDay;
        monday.setDate(now.getDate() + diff);

        const dayNames = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
        let html = '';

        for (let i = 0; i < 7; i++) {
            const date = new Date(monday);
            date.setDate(monday.getDate() + i);

            const dayName = dayNames[i];
            const dateNum = date.getDate();
            const dateStr = date.toISOString().split('T')[0];
            const todayStr = now.toISOString().split('T')[0];
            const isToday = dateStr === todayStr;

            const activeClass = isToday 
                ? 'border-indigo-600 bg-indigo-50 text-indigo-600' 
                : 'border-slate-200 bg-white text-slate-800';
            const dayTextClass = isToday ? 'text-indigo-600 font-bold' : 'text-slate-400 font-semibold';
            const numTextClass = isToday ? 'text-indigo-800' : 'text-slate-700';

            html += `
                <div class="border rounded-xl p-2.5 text-center min-w-[56px] date-card cursor-pointer transition ${activeClass}" data-date="${dateStr}">
                    <span class="text-[10px] block ${dayTextClass} day-text">${dayName}</span>
                    <span class="text-lg font-black ${numTextClass} num-text">${dateNum}</span>
                </div>
            `;
        }
        dateScroll.innerHTML = html;

        const dateCards = dateScroll.querySelectorAll('.date-card');
        dateCards.forEach(card => {
            card.addEventListener('click', function() {
                dateCards.forEach(c => {
                    c.classList.remove('border-indigo-600', 'bg-indigo-50');
                    c.classList.add('border-slate-200', 'bg-white');
                    const dayEl = c.querySelector('.day-text');
                    const numEl = c.querySelector('.num-text');
                    if (dayEl) {
                        dayEl.classList.remove('text-indigo-600', 'font-bold');
                        dayEl.classList.add('text-slate-400', 'font-semibold');
                    }
                    if (numEl) {
                        numEl.classList.remove('text-indigo-800');
                        numEl.classList.add('text-slate-700');
                    }
                });

                this.classList.remove('border-slate-200', 'bg-white');
                this.classList.add('border-indigo-600', 'bg-indigo-50');
                const dayEl = this.querySelector('.day-text');
                const numEl = this.querySelector('.num-text');
                if (dayEl) {
                    dayEl.classList.remove('text-slate-400', 'font-semibold');
                    dayEl.classList.add('text-indigo-600', 'font-bold');
                }
                if (numEl) {
                    numEl.classList.remove('text-slate-700');
                    numEl.classList.add('text-indigo-800');
                }
            });
        });
    };

    renderWeekCalendar();

    // ==========================================
    // 3. LOAD DASHBOARD DATA FROM API
    // ==========================================
    const loadDashboardData = async () => {
        try {
            // Load Payroll info
            const payrollRes = await ApiClient.get('/my/payroll');
            if (payrollRes && payrollRes.data && payrollRes.data.length > 0) {
                const latestPayroll = payrollRes.data[0];
                const netSalary = parseFloat(latestPayroll.netSalary || 0);
                const totalShifts = latestPayroll.totalShifts || 0;
                const periodLabel = latestPayroll.period ? latestPayroll.period.label : 'Tháng này';

                const salaryMonthTitle = document.getElementById('salaryMonthTitle');
                if (salaryMonthTitle) {
                    salaryMonthTitle.innerText = `Lương tạm tính (${periodLabel})`;
                }
                const tempSalaryEl = document.getElementById('tempSalary');
                if (tempSalaryEl) {
                    tempSalaryEl.innerText = netSalary.toLocaleString('vi-VN');
                }
                const streakCountEl = document.getElementById('streakCount');
                if (streakCountEl) {
                    streakCountEl.innerText = `${totalShifts} Ca`;
                }

                const target = 5000000;
                const percentage = Math.min(100, Math.round((netSalary / target) * 100));
                
                const targetPercentEl = document.getElementById('targetPercent');
                if (targetPercentEl) {
                    targetPercentEl.innerText = `${percentage}% Mục tiêu`;
                }
                const targetAmountEl = document.getElementById('targetAmount');
                if (targetAmountEl) {
                    targetAmountEl.innerText = `Mục tiêu: ${target.toLocaleString('vi-VN')}đ`;
                }
                const targetProgressBar = document.getElementById('targetProgressBar');
                if (targetProgressBar) {
                    targetProgressBar.style.width = `${percentage}%`;
                }
            }

            // Load Schedule info
            const scheduleRes = await ApiClient.get('/my/schedule');
            const container = document.getElementById('upcomingShiftsContainer');
            if (container) {
                container.innerHTML = '';
                
                if (scheduleRes && scheduleRes.data && scheduleRes.data.length > 0) {
                    const todayStr = new Date().toISOString().split('T')[0];
                    const upcomingRegs = scheduleRes.data.filter(reg => {
                        if (!reg.shift) return false;
                        const shiftDate = reg.shift.shiftDate.split('T')[0];
                        return shiftDate >= todayStr && reg.status !== 'cancelled';
                    });

                    if (upcomingRegs.length === 0) {
                        container.innerHTML = `<p class="text-xs text-slate-400 text-center py-4">Bạn chưa có ca làm sắp tới.</p>`;
                    } else {
                        upcomingRegs.forEach(reg => {
                            const shift = reg.shift;
                            const shiftDateStr = new Date(shift.shiftDate).toLocaleDateString('vi-VN', {
                                day: '2-digit',
                                month: '2-digit'
                            });
                            
                            const shiftDayOnly = new Date(shift.shiftDate).setHours(0,0,0,0);
                            const todayDayOnly = new Date().setHours(0,0,0,0);
                            const diffDays = Math.round((shiftDayOnly - todayDayOnly) / (24 * 3600 * 1000));
                            
                            let dateBadgeText = '';
                            let badgeClass = '';
                            if (diffDays === 0) {
                                dateBadgeText = 'Hôm nay';
                                badgeClass = 'text-indigo-600 bg-indigo-50';
                            } else if (diffDays === 1) {
                                dateBadgeText = `Ngày mai (${shiftDateStr})`;
                                badgeClass = 'text-indigo-600 bg-indigo-50';
                            } else {
                                dateBadgeText = `${shiftDateStr}`;
                                badgeClass = 'text-slate-500 bg-slate-100';
                            }

                            const shiftTypeMap = {
                                'morning': 'Ca Sáng',
                                'afternoon': 'Ca Chiều',
                                'night': 'Ca Tối'
                            };
                            const shiftTypeLabel = shiftTypeMap[shift.shiftType] || shift.shiftType;
                            
                            const [startH, startM] = shift.startTime.split(':').map(Number);
                            const [endH, endM] = shift.endTime.split(':').map(Number);
                            let startMin = startH * 60 + startM;
                            let endMin = endH * 60 + endM;
                            if (shift.crossesMidnight && endMin <= startMin) {
                                endMin += 24 * 60;
                            }
                            const diffHours = ((endMin - startMin) / 60).toFixed(0);

                            const statusMap = {
                                'registered': 'Chờ duyệt',
                                'approved': 'Đã duyệt',
                                'cancelled': 'Đã hủy'
                            };
                            const statusLabel = statusMap[reg.status] || reg.status;
                            const statusColorClass = reg.status === 'approved' ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50';

                            const cardHtml = `
                                <div class="bg-white rounded-xl border-l-4 border-indigo-500 shadow-sm p-4 relative overflow-hidden">
                                    <div class="flex justify-between items-start mb-2">
                                        <div>
                                            <p class="text-[10px] font-black ${badgeClass} px-2 py-0.5 rounded uppercase inline-block mb-1">${dateBadgeText}</p>
                                            <h4 class="font-bold text-slate-800 text-sm">${shiftTypeLabel} (${shift.startTime} - ${shift.endTime})</h4>
                                        </div>
                                        <span class="text-xs font-bold text-slate-400">${diffHours} tiếng</span>
                                    </div>
                                    <div class="flex items-center justify-between mt-3">
                                        <span class="text-[10px] font-black px-2 py-0.5 rounded uppercase ${statusColorClass}">${statusLabel}</span>
                                        <button class="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-bold text-[10px] px-3 py-1.5 rounded-lg transition active:scale-95 animate-btn" onclick="UIUtils.showAlert('Yêu cầu báo nghỉ', 'Vui lòng liên hệ trực tiếp Admin để báo nghỉ ca này!')">
                                            Báo nghỉ / Đổi ca
                                        </button>
                                    </div>
                                </div>
                            `;
                            container.insertAdjacentHTML('beforeend', cardHtml);
                        });
                    }
                } else {
                    container.innerHTML = `<p class="text-xs text-slate-400 text-center py-4">Bạn chưa đăng ký lịch làm nào.</p>`;
                }
            }

            const todayRes = await ApiClient.get('/dashboard/today');
            if (todayRes && todayRes.data && todayRes.data.dailyNote) {
                const adminNoteBox = document.getElementById('adminNoteBox');
                const adminNoteText = document.getElementById('adminNoteText');
                if (adminNoteBox && adminNoteText) {
                    adminNoteText.innerText = todayRes.data.dailyNote;
                    adminNoteBox.classList.remove('hidden');
                }
            }

        } catch (err) {
            console.error('Lỗi tải dữ liệu dashboard:', err);
        }
    };

    loadDashboardData();


    // ==========================================
    // 4. KÉO VUỐT THANH LỊCH (DRAG TO SCROLL)
    // ==========================================
    const slider = document.getElementById('dateScroll');
    let isDown = false;
    let startX;
    let scrollLeft;

    if(slider) {
        slider.addEventListener('mousedown', (e) => {
            isDown = true;
            startX = e.pageX - slider.offsetLeft;
            scrollLeft = slider.scrollLeft;
        });
        slider.addEventListener('mouseleave', () => { isDown = false; });
        slider.addEventListener('mouseup', () => { isDown = false; });
        slider.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - slider.offsetLeft;
            const walk = (x - startX) * 2; // Nhân 2 cho lướt nhanh hơn
            slider.scrollLeft = scrollLeft - walk;
        });
        
        // Dùng con lăn chuột
        slider.addEventListener('wheel', (evt) => {
            evt.preventDefault();
            slider.scrollLeft += evt.deltaY;
        });
    }


    // ==========================================
    // 5. MỞ POPUP ĐĂNG KÝ & ĐÓNG MODAL CHUNG
    // ==========================================
    const regModal = document.getElementById('regModal');
    const regBox = document.getElementById('regBox');

    // Bấm nút "Đăng ký ca này"
    document.querySelectorAll('.btn-open-reg').forEach(btn => {
        btn.addEventListener('click', () => {
            regModal.classList.remove('hidden');
            regModal.classList.add('flex');
            setTimeout(() => regBox.classList.replace('scale-95', 'scale-100'), 10);
        });
    });

    // Bấm Chốt Đăng Ký
    document.getElementById('btnSubmitReg')?.addEventListener('click', () => {
        regBox.classList.replace('scale-100', 'scale-95');
        setTimeout(() => { 
            regModal.classList.add('hidden'); 
            regModal.classList.remove('flex'); 
            
            UIUtils.showAlert('Đăng ký ca', '✔ Gửi đăng ký thành công! Hãy đợi Quản lý duyệt nhé.', true);
        }, 150);
    });

    // Bấm ra ngoài vùng tối hoặc bấm Hủy để đóng Modal
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', function(e) {
            if (e.target === this && this.id !== 'customConfirmModal') {
                const innerBox = this.querySelector('div[id$="Box"]');
                if(innerBox) innerBox.classList.replace('scale-100', 'scale-95');
                
                setTimeout(() => {
                    this.classList.add('hidden');
                    this.classList.remove('flex');
                }, 150);
            }
        });
    });

    document.querySelectorAll('.btn-close-modal').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal-overlay');
            if(modal) {
                const innerBox = modal.querySelector('div[id$="Box"]');
                if(innerBox) innerBox.classList.replace('scale-100', 'scale-95');
                
                setTimeout(() => {
                    modal.classList.add('hidden');
                    modal.classList.remove('flex');
                }, 150);
            }
        });
    });
});