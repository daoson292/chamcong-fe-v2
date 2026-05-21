document.addEventListener('DOMContentLoaded', () => {

    const currentPeriodLabel = document.getElementById('currentPeriodLabel');
    const periodSelect = document.getElementById('periodSelect');
    
    const netSalaryVal = document.getElementById('netSalaryVal');
    const amountPaidVal = document.getElementById('amountPaidVal');
    const amountOwedVal = document.getElementById('amountOwedVal');
    
    const chartContainer = document.getElementById('chartContainer');
    const transactionList = document.getElementById('transactionList');

    const disputeModal = document.getElementById('disputeModal');
    const disputeBox = document.getElementById('disputeBox');
    
    const disputeReason = document.getElementById('disputeReason');
    const disputeDetail = document.getElementById('disputeDetail');
    const btnSubmitDispute = document.getElementById('btnSubmitDispute');

    let allPeriods = [];
    let myPayrollSnapshots = [];
    let mySchedule = [];
    let selectedPeriodId = null;

    const formatMoney = (amount) => {
        return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
    };

    const parseTime = (timeStr) => {
        if (!timeStr) return 0;
        const [h, m] = timeStr.split(':').map(Number);
        return h + m / 60;
    };

    // Accordion Event Delegation
    if (transactionList) {
        transactionList.addEventListener('click', (e) => {
            const header = e.target.closest('.accordion-header');
            if (!header) return;
            const item = header.closest('.accordion-item');
            const body = item.querySelector('.accordion-body');
            const isOpen = item.classList.contains('accordion-open');
            
            if(isOpen) {
                item.classList.remove('accordion-open');
                body.classList.add('hidden');
                header.classList.remove('bg-indigo-50/30');
            } else {
                item.classList.add('accordion-open');
                body.classList.remove('hidden');
                header.classList.add('bg-indigo-50/30');
            }
        });
    }

    // Modal helpers
    const closeModal = (modal, box) => {
        box.classList.replace('scale-100', 'scale-95');
        setTimeout(() => {
            modal.classList.replace('flex', 'hidden');
        }, 150);
    };

    const openModal = (modal, box) => {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        setTimeout(() => {
            box.classList.replace('scale-95', 'scale-100');
        }, 10);
    };

    // Open dispute modal
    document.getElementById('btnOverallDispute')?.addEventListener('click', () => {
        if (!selectedPeriodId) {
            UIUtils.showAlert('Lỗi', 'Vui lòng chọn kỳ lương trước khi khiếu nại.', false);
            return;
        }
        disputeReason.value = '';
        disputeDetail.value = '';
        openModal(disputeModal, disputeBox);
    });

    // Close buttons
    document.querySelectorAll('.btn-close-modal').forEach(btn => {
        btn.addEventListener('click', () => closeModal(disputeModal, disputeBox));
    });

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal(this, disputeBox);
            }
        });
    });

    // Submit dispute
    btnSubmitDispute?.addEventListener('click', async () => {
        const reasonType = disputeReason.value;
        const detailsText = disputeDetail.value.trim();

        if (!reasonType) {
            UIUtils.showAlert('Lỗi', 'Vui lòng chọn vấn đề cần khiếu nại.', false);
            return;
        }

        if (!detailsText) {
            UIUtils.showAlert('Lỗi', 'Vui lòng nhập mô tả chi tiết.', false);
            return;
        }

        const reasonLabels = {
            '1': 'Sai mức lương cơ bản',
            '2': 'Thiếu tiền thưởng / Phụ cấp',
            '3': 'Phạt trừ tiền vô lý',
            '4': 'Đã bank nhưng chưa nhận được'
        };

        try {
            btnSubmitDispute.disabled = true;
            btnSubmitDispute.innerText = 'Đang gửi...';

            await ApiClient.post('/my/requests', {
                type: 'COMPLAINT_MONEY',
                message: `[Khiếu nại: ${reasonLabels[reasonType]}] ${detailsText}`,
                payrollPeriodId: selectedPeriodId,
                details: {
                    reasonType: reasonType,
                    reasonLabel: reasonLabels[reasonType]
                }
            });

            closeModal(disputeModal, disputeBox);
            
            setTimeout(() => {
                UIUtils.showAlert('Gửi thành công', 'Sếp đã nhận được khiếu nại của bạn và sẽ phản hồi sớm.', true);
            }, 150);

        } catch (err) {
            console.error('Lỗi gửi khiếu nại:', err);
        } finally {
            btnSubmitDispute.disabled = false;
            btnSubmitDispute.innerText = 'Gửi Khiếu Nại';
        }
    });

    // Calculate payroll dynamically for a period
    const calculatePayrollForPeriod = (period, schedule, snapshot) => {
        const startDate = new Date(period.startDate);
        const endDate = new Date(period.endDate);

        const periodRegs = schedule.filter(reg => {
            const shiftDate = new Date(reg.shift.shiftDate);
            return shiftDate >= startDate && shiftDate <= endDate;
        });

        if (snapshot) {
            return {
                netSalary: Number(snapshot.netSalary),
                amountPaid: Number(snapshot.amountPaid),
                amountOwed: Number(snapshot.amountOwed),
                totalShifts: snapshot.totalShifts,
                totalHours: Number(snapshot.totalHours),
                baseSalary: Number(snapshot.baseSalary),
                totalBonus: Number(snapshot.totalBonus),
                totalPenalty: Number(snapshot.totalPenalty),
                isFinalized: snapshot.isFinalized,
                registrations: periodRegs
            };
        }

        let baseSalary = 0;
        let totalBonus = 0;
        let totalPenalty = 0;
        let totalHours = 0;
        let totalShifts = 0;

        periodRegs.forEach(reg => {
            const att = reg.attendances && reg.attendances.length > 0 ? reg.attendances[0] : null;
            if (att && ['present', 'late', 'early_leave'].includes(att.status)) {
                totalShifts++;
                const hours = Number(att.actualHours || 0);
                totalHours += hours;
                const rate = Number(att.customRate || att.wagePerHour || 0);
                baseSalary += hours * rate;
                totalBonus += Number(att.bonusAmount || 0);
                totalPenalty += Number(att.penaltyAmount || 0);
            }
        });

        const netSalary = baseSalary + totalBonus - totalPenalty;

        return {
            netSalary,
            amountPaid: 0,
            amountOwed: netSalary,
            totalShifts,
            totalHours,
            baseSalary,
            totalBonus,
            totalPenalty,
            isFinalized: false,
            registrations: periodRegs
        };
    };

    // Render bar chart
    const renderChart = (periods, schedule, payrollSnapshots) => {
        if (!chartContainer) return;
        
        const staticLines = `
            <div class="absolute top-4 left-4 right-4 border-t border-dashed border-emerald-300 z-0"></div>
            <div class="absolute top-2 right-4 text-[9px] text-emerald-500 font-bold z-0 font-sans">Mục tiêu 5tr</div>
        `;
        chartContainer.innerHTML = staticLines;

        // Take last 3 periods, chronological order (left to right)
        const recentPeriods = [...periods].slice(0, 3).reverse();

        recentPeriods.forEach((period, idx) => {
            const snapshot = payrollSnapshots.find(s => s.payrollPeriodId === period.id);
            const data = calculatePayrollForPeriod(period, schedule, snapshot);
            
            const salaryInM = (data.netSalary / 1000000).toFixed(2) + 'tr';
            const heightPercent = Math.min(100, Math.max(10, (data.netSalary / 5000000) * 100));

            const startDateObj = new Date(period.startDate);
            const monthLabel = `T${String(startDateObj.getMonth() + 1).padStart(2, '0')}`;

            const isCurrent = idx === recentPeriods.length - 1;

            const barClass = isCurrent
                ? 'w-8 bg-gradient-to-t from-emerald-400 to-emerald-500 rounded-t-md bar-chart-col shadow-lg shadow-emerald-200'
                : 'w-8 bg-indigo-200 rounded-t-md bar-chart-col';
            
            const labelClass = isCurrent
                ? 'text-[10px] font-black text-emerald-600 mt-2 font-sans'
                : 'text-[10px] font-bold text-slate-600 mt-2 font-sans';

            const amountClass = isCurrent
                ? 'text-[10px] font-bold text-emerald-600 mb-1 font-sans'
                : 'text-[10px] font-bold text-slate-500 mb-1 font-sans';

            const barHtml = `
                <div class="flex flex-col items-center z-10 w-1/3">
                    <div class="${amountClass}">${salaryInM}</div>
                    <div class="${barClass}" style="height: ${heightPercent}%"></div>
                    <div class="${labelClass}">${monthLabel}</div>
                </div>
            `;
            chartContainer.insertAdjacentHTML('beforeend', barHtml);
        });
    };

    // Render active period data
    const renderActivePeriod = () => {
        if (!selectedPeriodId) return;

        const period = allPeriods.find(p => p.id === selectedPeriodId);
        if (!period) return;

        const snapshot = myPayrollSnapshots.find(s => s.payrollPeriodId === selectedPeriodId);
        const data = calculatePayrollForPeriod(period, mySchedule, snapshot);

        // Update Dashboard
        if (currentPeriodLabel) {
            currentPeriodLabel.innerText = `Kỳ lương: ${period.label}`;
        }
        if (netSalaryVal) {
            netSalaryVal.innerHTML = `${formatMoney(data.netSalary)}`;
        }
        if (amountPaidVal) {
            amountPaidVal.innerText = `+ ${formatMoney(data.amountPaid)}`;
        }
        if (amountOwedVal) {
            amountOwedVal.innerText = `${formatMoney(data.amountOwed)}`;
        }

        // Render Transaction List
        if (!transactionList) return;
        transactionList.innerHTML = '';

        if (data.registrations.length === 0) {
            transactionList.innerHTML = '<p class="text-xs text-slate-400 text-center py-8">Chưa có ca làm việc nào được ghi nhận trong kỳ này.</p>';
            return;
        }

        // Sort registrations by shift date desc (newest first)
        const sortedRegs = [...data.registrations].sort((a, b) => new Date(b.shift.shiftDate) - new Date(a.shift.shiftDate));

        sortedRegs.forEach(reg => {
            const shift = reg.shift;
            const att = reg.attendances && reg.attendances.length > 0 ? reg.attendances[0] : null;

            const shiftDateObj = new Date(shift.shiftDate);
            const days = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
            const dayName = days[shiftDateObj.getDay()];
            const formattedDate = shiftDateObj.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });

            const shiftTypeMap = {
                'morning': 'Ca Sáng',
                'afternoon': 'Ca Chiều',
                'night': 'Ca Tối'
            };
            const shiftTypeLabel = shiftTypeMap[shift.shiftType] || shift.shiftType;

            let statusLabel = '';
            let statusColor = '';
            let amountText = '';
            let borderClass = 'border-slate-200';
            let detailBody = '';

            if (!att || att.status === 'pending') {
                statusLabel = 'Chưa làm / Chờ chấm';
                statusColor = 'text-slate-400';
                amountText = 'Chờ chốt';
            } else if (att.status === 'absent') {
                statusLabel = 'Vắng mặt';
                statusColor = 'text-red-500';
                borderClass = 'border-red-200';
                const penalty = Number(att.penaltyAmount || 0);
                amountText = penalty > 0 ? `-${formatMoney(penalty)}` : '0đ';

                detailBody = `
                    <div class="flex justify-between items-start text-red-600">
                        <div>
                            <span class="text-xs font-bold block">Không đi làm</span>
                            ${att.penaltyReason ? `<span class="text-[10px] text-slate-400 font-semibold italic">Lý do: ${att.penaltyReason}</span>` : ''}
                        </div>
                        <span class="text-xs font-black">${penalty > 0 ? `-${formatMoney(penalty)}` : '0đ'}</span>
                    </div>
                `;
            } else {
                // present, late, early_leave
                statusLabel = att.status === 'present' ? 'Đã chốt xong' : (att.status === 'late' ? 'Đi muộn' : 'Về sớm');
                statusColor = att.status === 'present' ? 'text-emerald-500' : 'text-orange-500';
                
                const rate = Number(att.customRate || att.wagePerHour || 0);
                const hours = Number(att.actualHours || 0);
                const baseEarnings = hours * rate;
                const bonus = Number(att.bonusAmount || 0);
                const penalty = Number(att.penaltyAmount || 0);
                const total = baseEarnings + bonus - penalty;

                amountText = `+ ${formatMoney(total)}`;

                detailBody = `
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-xs text-slate-500 font-semibold italic">Lương ${hours}h x ${formatMoney(rate)}/h</span>
                        <span class="text-xs font-bold text-slate-700">${formatMoney(baseEarnings)}</span>
                    </div>
                `;

                if (bonus > 0) {
                    detailBody += `
                        <div class="flex justify-between items-center text-emerald-600 mb-2">
                            <span class="text-xs font-bold uppercase tracking-tighter">Thưởng: ${att.bonusReason || 'Chuyên cần'}</span>
                            <span class="text-xs font-black">+ ${formatMoney(bonus)}</span>
                        </div>
                    `;
                }

                if (penalty > 0) {
                    detailBody += `
                        <div class="flex justify-between items-center text-red-600 mb-2">
                            <span class="text-xs font-bold uppercase tracking-tighter">Trực phạt: ${att.penaltyReason || 'Vi phạm nội quy'}</span>
                            <span class="text-xs font-black">- ${formatMoney(penalty)}</span>
                        </div>
                    `;
                }
            }

            const accordionItemHtml = `
                <div class="bg-white rounded-xl border ${borderClass} shadow-sm accordion-item">
                    <button class="w-full flex justify-between items-center p-4 accordion-header transition-all outline-none">
                        <div class="text-left">
                            <span class="font-bold text-slate-800 block text-sm">${dayName}, ${formattedDate} (${shiftTypeLabel})</span>
                            <span class="text-[10px] font-bold ${statusColor} uppercase tracking-tighter">${statusLabel}</span>
                        </div>
                        <div class="flex items-center gap-3">
                            <span class="font-black text-indigo-600 text-sm">${amountText}</span>
                            <div class="text-slate-300 chevron-icon text-xs">▼</div>
                        </div>
                    </button>
                    <!-- Detail -->
                    <div class="px-4 pb-4 hidden accordion-body border-t border-slate-50 pt-3">
                        ${detailBody || '<p class="text-xs text-slate-400 italic">Không có chi tiết phát sinh.</p>'}
                    </div>
                </div>
            `;
            transactionList.insertAdjacentHTML('beforeend', accordionItemHtml);
        });
    };

    const loadData = async () => {
        try {
            // Fetch periods, my schedule and my payroll snapshots in parallel
            const [periodsRes, myPayrollRes, scheduleRes] = await Promise.all([
                ApiClient.get('/payroll-periods'),
                ApiClient.get('/my/payroll'),
                ApiClient.get('/my/schedule')
            ]);

            allPeriods = (periodsRes && periodsRes.data) ? periodsRes.data : [];
            myPayrollSnapshots = (myPayrollRes && myPayrollRes.data) ? myPayrollRes.data : [];
            mySchedule = (scheduleRes && scheduleRes.data) ? scheduleRes.data : [];

            if (allPeriods.length === 0) {
                if (currentPeriodLabel) currentPeriodLabel.innerText = 'Chưa có kỳ lương nào';
                return;
            }

            // Populate period select dropdown
            if (periodSelect) {
                periodSelect.innerHTML = '';
                allPeriods.forEach(p => {
                    const option = document.createElement('option');
                    option.value = p.id;
                    option.innerText = p.label;
                    periodSelect.appendChild(option);
                });

                // Select the first (latest) period
                selectedPeriodId = allPeriods[0].id;
                periodSelect.value = selectedPeriodId;

                periodSelect.addEventListener('change', (e) => {
                    selectedPeriodId = Number(e.target.value);
                    renderActivePeriod();
                });
            }

            renderChart(allPeriods, mySchedule, myPayrollSnapshots);
            renderActivePeriod();

        } catch (err) {
            console.error('Lỗi tải dữ liệu bảng lương:', err);
        }
    };

    loadData();
});