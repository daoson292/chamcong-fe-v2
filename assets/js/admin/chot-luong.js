// --- LOGIC TRANG CHỐT LƯƠNG & ĐỐI SOÁT ---

let allPeriods = [];
let currentPeriod = null;
let currentSnapshots = [];
let currentEmpId = null;
let currentEmpName = "";
let currentSnapshotId = null;
let currentAttendances = [];

const formatMoney = (amount) => {
    return new Intl.NumberFormat('vi-VN').format(Number(amount)) + 'đ';
};

document.addEventListener('DOMContentLoaded', () => {
    // Tải kỳ lương lần đầu
    loadPeriods();

    // Event listener khi thay đổi Kỳ Lương
    const selectPeriod = document.getElementById('selectPeriod');
    if (selectPeriod) {
        selectPeriod.addEventListener('change', async (e) => {
            const periodId = Number(e.target.value);
            currentPeriod = allPeriods.find(p => p.id === periodId);
            if (currentPeriod) {
                await loadSnapshots(currentPeriod.id);
                updateUIForPeriodLock();
            }
        });
    }

    // Nút Tính lại lương
    const btnRecalculate = document.getElementById('btnRecalculate');
    if (btnRecalculate) {
        btnRecalculate.addEventListener('click', async () => {
            if (!currentPeriod) return;
            if (currentPeriod.isLocked) {
                UIUtils.showAlert('warning', 'Không thể tính lại', 'Kỳ lương này đã bị chốt sổ và không thể thay đổi.');
                return;
            }
            try {
                UIUtils.showLoading();
                const res = await ApiClient.post(`/payroll-periods/${currentPeriod.id}/calculate`);
                UIUtils.showAlert('success', 'Thành công', res?.data?.message || 'Đã tính toán lại quỹ lương.');
                await loadSnapshots(currentPeriod.id);
            } catch (err) {
                console.error("Lỗi khi tính lại lương", err);
            } finally {
                UIUtils.hideLoading();
            }
        });
    }

    // Nút Chốt kỳ lương
    const btnFinalize = document.getElementById('btnFinalize');
    if (btnFinalize) {
        btnFinalize.addEventListener('click', async () => {
            if (!currentPeriod) return;
            if (currentPeriod.isLocked) {
                UIUtils.showAlert('info', 'Thông báo', 'Kỳ lương này đã được chốt sổ trước đó.');
                return;
            }
            const confirmLock = confirm(`Bạn có chắc chắn muốn chốt sổ kỳ lương này?\nSau khi chốt sổ, mọi dữ liệu giờ làm và lương sẽ bị khóa vĩnh viễn.`);
            if (!confirmLock) return;
            try {
                UIUtils.showLoading();
                await ApiClient.post(`/payroll-periods/${currentPeriod.id}/finalize`);
                UIUtils.showAlert('success', 'Thành công', 'Đã chốt sổ kỳ lương thành công.');
                await loadPeriods(); // Load lại để cập nhật trạng thái khoá
            } catch (err) {
                console.error("Lỗi khi chốt sổ", err);
            } finally {
                UIUtils.hideLoading();
            }
        });
    }

    // Nút Xuất Excel Tổng
    const btnExportTotal = document.getElementById('btnExportTotal');
    if (btnExportTotal) {
        btnExportTotal.addEventListener('click', async () => {
            if (!currentPeriod) {
                UIUtils.showAlert('error', 'Lỗi', 'Vui lòng chọn kỳ lương trước.');
                return;
            }
            try {
                UIUtils.showLoading();
                const token = localStorage.getItem('access_token');
                const response = await fetch(`http://localhost:3001/api/payroll-periods/${currentPeriod.id}/export`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (!response.ok) throw new Error('Không thể xuất file Excel.');
                
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `luong_ky_${currentPeriod.id}.xlsx`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                UIUtils.showAlert('success', 'Thành công', 'Đã tải xuống file Excel tổng quát.');
            } catch (err) {
                console.error("Lỗi khi xuất file Excel", err);
                UIUtils.showAlert('error', 'Lỗi', err.message || 'Có lỗi xảy ra khi xuất file Excel.');
            } finally {
                UIUtils.hideLoading();
            }
        });
    }

    // Nút Xuất Phiếu Cá Nhân (Đã chọn)
    const btnExportPersonal = document.getElementById('btnExportPersonal');
    if (btnExportPersonal) {
        btnExportPersonal.addEventListener('click', () => {
            const checkedBoxes = document.querySelectorAll('.row-export-check:checked');
            if (checkedBoxes.length === 0) {
                UIUtils.showAlert('warning', 'Chưa chọn nhân viên', 'Vui lòng chọn ít nhất một nhân viên để xuất phiếu.');
                return;
            }
            const selectedIds = Array.from(checkedBoxes).map(chk => chk.getAttribute('data-id'));
            exportSelectedToCSV(selectedIds);
        });
    }

    // Đóng modal khi click ra ngoài hoặc bấm nút đóng
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal(this);
            }
        });
    });

    document.querySelectorAll('.btn-close-modal').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal-overlay');
            if (modal) closeModal(modal);
        });
    });
});

function closeModal(modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

async function loadPeriods() {
    try {
        const res = await ApiClient.get('/payroll-periods');
        if (res && res.data) {
            allPeriods = res.data;
            const select = document.getElementById('selectPeriod');
            
            if (allPeriods.length === 0) {
                select.innerHTML = '<option value="">(Không có kỳ lương nào)</option>';
                return;
            }
            
            // Format labels for select options
            const prevSelectedVal = select.value;
            select.innerHTML = allPeriods.map(p => {
                const lockStatus = p.isLocked ? ' [🔒 Đã chốt]' : ' [Mở]';
                return `<option value="${p.id}">${p.label}${lockStatus}</option>`;
            }).join('');
            
            // Restore selection if exists, else select first
            if (prevSelectedVal && allPeriods.some(p => p.id === Number(prevSelectedVal))) {
                select.value = prevSelectedVal;
            } else {
                select.value = allPeriods[0].id;
            }
            
            const periodId = Number(select.value);
            currentPeriod = allPeriods.find(p => p.id === periodId);
            
            await loadSnapshots(currentPeriod.id);
            updateUIForPeriodLock();
        }
    } catch (err) {
        console.error("Lỗi khi tải kỳ lương", err);
    }
}

function updateUIForPeriodLock() {
    if (!currentPeriod) return;
    const isLocked = currentPeriod.isLocked;
    
    const recalculateBtn = document.getElementById('btnRecalculate');
    const finalizeBtn = document.getElementById('btnFinalize');
    
    if (isLocked) {
        if (recalculateBtn) {
            recalculateBtn.disabled = true;
            recalculateBtn.classList.add('opacity-50', 'cursor-not-allowed');
        }
        if (finalizeBtn) {
            finalizeBtn.disabled = true;
            finalizeBtn.classList.add('opacity-50', 'cursor-not-allowed');
        }
    } else {
        if (recalculateBtn) {
            recalculateBtn.disabled = false;
            recalculateBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
        if (finalizeBtn) {
            finalizeBtn.disabled = false;
            finalizeBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    }
}

async function loadSnapshots(periodId) {
    try {
        const res = await ApiClient.get(`/payroll-periods/${periodId}/snapshots?pageSize=200`);
        if (res && res.data) {
            currentSnapshots = res.data;
            renderSnapshotsTable(currentSnapshots);
            renderSummaryCards(currentSnapshots);
        }
    } catch (err) {
        console.error("Lỗi khi tải bảng lương", err);
    }
}

function renderSnapshotsTable(snapshots) {
    const tbody = document.getElementById('payrollTableBody');
    if (snapshots.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="py-8 text-center text-slate-400">Không có dữ liệu lương trong kỳ này. Nhấn "Tính lại lương" để cập nhật.</td></tr>';
        return;
    }
    
    tbody.innerHTML = snapshots.map(item => {
        const user = item.user || {};
        const fullName = user.fullName || 'Chưa rõ';
        const position = user.position || 'Nhân viên';
        
        const totalShifts = item.totalShifts || 0;
        const totalHours = Number(item.totalHours || 0);
        const baseSalary = Number(item.baseSalary || 0);
        const bonusPenalty = Number(item.totalBonus || 0) - Number(item.totalPenalty || 0);
        const netSalary = Number(item.netSalary || 0);
        const amountPaid = Number(item.amountPaid || 0);
        const amountOwed = Number(item.amountOwed || 0);
        
        const bpText = bonusPenalty >= 0 ? `+${formatMoney(bonusPenalty)}` : `-${formatMoney(Math.abs(bonusPenalty))}`;
        const bpClass = bonusPenalty > 0 ? 'text-emerald-600' : (bonusPenalty < 0 ? 'text-red-500' : 'text-slate-500');

        return `
            <tr class="hover:bg-slate-50 transition">
                <td class="py-4 px-4 text-center">
                    <input type="checkbox" class="row-export-check w-4 h-4 accent-indigo-600 cursor-pointer" data-id="${item.id}">
                </td>
                <td class="py-4 px-2">
                    <div class="font-bold text-slate-800 text-base">${fullName}</div>
                    <div class="text-xs text-slate-400">${position}</div>
                </td>
                <td class="py-4 px-3 text-center">${totalShifts}</td>
                <td class="py-4 px-3 text-center text-slate-800 font-bold">${totalHours}h</td>
                <td class="py-4 px-4 text-right">${formatMoney(baseSalary)}</td>
                <td class="py-4 px-4 text-right font-bold ${bpClass}">${bpText}</td>
                <td class="py-4 px-4 text-right font-black text-indigo-600 text-lg bg-indigo-50/20">${formatMoney(netSalary)}</td>
                <td class="py-4 px-4 text-right text-slate-500">
                    <div class="flex items-center justify-end gap-1">
                        <span>${formatMoney(amountPaid)}</span>
                        ${!currentPeriod.isLocked ? `
                            <button onclick="editPaidAmount(${item.id}, ${netSalary}, ${amountPaid})" class="text-indigo-400 hover:text-indigo-600 transition ml-1" title="Cập nhật tiền đã ứng/trả">🖊️</button>
                        ` : ''}
                    </div>
                </td>
                <td class="py-4 px-4 text-right ${amountOwed > 0 ? 'text-red-500 font-bold' : 'text-slate-400 font-normal'}">${formatMoney(amountOwed)}</td>
                <td class="py-4 px-5 text-center">
                    <button onclick="openDetailModal(${user.id}, '${fullName}', ${item.id})" class="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-lg transition text-xs shadow-sm">Chi tiết ca</button>
                </td>
            </tr>
        `;
    }).join('');
    
    bindRowChecks();
}

function bindRowChecks() {
    const checkAllExport = document.getElementById('checkAllExport');
    const rowExportChecks = document.querySelectorAll('.row-export-check');
    if (checkAllExport) {
        checkAllExport.checked = false;
        checkAllExport.onchange = (e) => {
            rowExportChecks.forEach(chk => chk.checked = e.target.checked);
        };
    }
}

function renderSummaryCards(snapshots) {
    let totalSalary = 0;
    let totalPaid = 0;
    let totalOwed = 0;
    
    snapshots.forEach(s => {
        totalSalary += Number(s.netSalary || 0);
        totalPaid += Number(s.amountPaid || 0);
        totalOwed += Number(s.amountOwed || 0);
    });
    
    document.getElementById('totalSalary').innerText = formatMoney(totalSalary);
    document.getElementById('totalPaid').innerText = formatMoney(totalPaid);
    document.getElementById('totalOwed').innerText = formatMoney(totalOwed);
}

async function editPaidAmount(snapshotId, netSalary, currentPaid) {
    const input = prompt(`Nhập số tiền đã trả cho nhân viên (Tổng thực nhận: ${formatMoney(netSalary)}):`, currentPaid);
    if (input === null) return;
    
    const val = Number(input.replace(/[^0-9]/g, ''));
    if (isNaN(val) || val < 0) {
        UIUtils.showAlert('error', 'Lỗi', 'Số tiền không hợp lệ.');
        return;
    }
    
    try {
        UIUtils.showLoading();
        await ApiClient.patch(`/payroll-snapshots/${snapshotId}`, {
            amountPaid: val
        });
        UIUtils.showAlert('success', 'Thành công', 'Đã cập nhật số tiền đã trả.');
        await loadSnapshots(currentPeriod.id);
    } catch (err) {
        console.error("Lỗi khi cập nhật số tiền đã trả", err);
    } finally {
        UIUtils.hideLoading();
    }
}

async function openDetailModal(userId, fullName, snapshotId) {
    currentEmpId = userId;
    currentEmpName = fullName;
    currentSnapshotId = snapshotId;
    
    document.getElementById('detailEmpName').innerText = `Bảng Kê Chi Tiết: ${fullName}`;
    document.getElementById('detailPeriodLabel').innerText = `Kỳ lương: ${currentPeriod.label}`;
    
    const tbody = document.getElementById('detailTableBody');
    tbody.innerHTML = '<tr><td colspan="6" class="py-4 text-center text-slate-500">Đang tải chi tiết...</td></tr>';
    
    const detailModal = document.getElementById('detailModal');
    detailModal.classList.remove('hidden');
    detailModal.classList.add('flex');
    
    try {
        const res = await ApiClient.get(`/attendances?userId=${userId}&pageSize=100`);
        if (res && res.data) {
            const start = new Date(currentPeriod.startDate);
            const end = new Date(currentPeriod.endDate);
            end.setHours(23, 59, 59, 999);
            
            const filtered = res.data.filter(item => {
                const shiftDate = new Date(item.shift.shiftDate);
                return shiftDate >= start && shiftDate <= end;
            });
            
            currentAttendances = filtered;
            renderDetailShifts(filtered);
        }
    } catch (err) {
        console.error("Lỗi khi tải chi tiết ca", err);
        tbody.innerHTML = '<tr><td colspan="6" class="py-4 text-center text-red-500">Lỗi khi tải dữ liệu</td></tr>';
    }
}

function renderDetailShifts(attendances) {
    const tbody = document.getElementById('detailTableBody');
    if (attendances.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="py-4 text-center text-slate-500">Không có ca làm nào trong kỳ lương này.</td></tr>';
        return;
    }
    
    attendances.sort((a, b) => new Date(a.shift.shiftDate) - new Date(b.shift.shiftDate));
    
    tbody.innerHTML = attendances.map(item => {
        const rate = Number(item.customRate ?? item.wagePerHour);
        const hours = Number(item.actualHours ?? 0);
        const subtotal = hours * rate + Number(item.bonusAmount ?? 0) - Number(item.penaltyAmount ?? 0);
        
        const dateObj = new Date(item.shift.shiftDate);
        const dayOfWeek = ['CN', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'][dateObj.getDay()];
        const dateStr = `${dayOfWeek} (${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')})`;
        
        let details = `<span class="bg-slate-100 px-2 py-1 rounded text-slate-600">${item.shift.startTime.slice(0,5)} - ${item.shift.endTime.slice(0,5)}</span>`;
        if (Number(item.bonusAmount) > 0) {
            details += `<div class="text-[11px] text-emerald-600 mt-1 font-bold">Thưởng: ${item.bonusNote || 'Thưởng ca'} (+${formatMoney(item.bonusAmount)})</div>`;
        }
        if (Number(item.penaltyAmount) > 0) {
            details += `<div class="text-[11px] text-red-500 mt-1 font-bold">Phạt: ${item.penaltyNote || 'Phạt ca'} (-${formatMoney(item.penaltyAmount)})</div>`;
        }

        const isChecked = item.isPaid ? 'checked disabled class="w-5 h-5 accent-emerald-500 cursor-not-allowed"' : 'class="w-5 h-5 accent-emerald-500 cursor-pointer shadow-sm detail-pay-check" data-id="' + item.id + '"';

        return `
            <tr>
                <td class="py-3 px-4">${dateStr}</td>
                <td class="py-3 px-4">${details}</td>
                <td class="py-3 px-4 text-center font-bold">${hours}h</td>
                <td class="py-3 px-4 text-right">${formatMoney(rate)}</td>
                <td class="py-3 px-4 text-right font-black text-indigo-600">${formatMoney(subtotal)}</td>
                <td class="py-3 px-4 text-center">
                    <input type="checkbox" ${isChecked}>
                </td>
            </tr>
        `;
    }).join('');
    
    // Check All Payment behavior
    const checkAll = document.getElementById('checkAllPayment');
    if (checkAll) {
        checkAll.checked = false;
        checkAll.onchange = (e) => {
            document.querySelectorAll('.detail-pay-check').forEach(chk => {
                if (!chk.disabled) chk.checked = e.target.checked;
            });
        };
    }
}

// Lưu trạng thái thanh toán chi tiết các ca
const btnSavePaymentDetails = document.getElementById('btnSavePaymentDetails');
if (btnSavePaymentDetails) {
    btnSavePaymentDetails.onclick = async () => {
        if (currentPeriod.isLocked) {
            UIUtils.showAlert('warning', 'Không thể thay đổi', 'Kỳ lương này đã bị chốt.');
            closeModal(document.getElementById('detailModal'));
            return;
        }
        const checkedBoxes = document.querySelectorAll('.detail-pay-check:checked');
        if (checkedBoxes.length === 0) {
            closeModal(document.getElementById('detailModal'));
            return;
        }
        
        try {
            UIUtils.showLoading();
            for (const chk of checkedBoxes) {
                const attId = chk.getAttribute('data-id');
                await ApiClient.patch(`/attendances/${attId}/mark-paid`, {
                    payrollPeriodId: currentPeriod.id
                });
            }
            UIUtils.showAlert('success', 'Thành công', 'Đã lưu trạng thái thanh toán các ca làm.');
            closeModal(document.getElementById('detailModal'));
            await loadSnapshots(currentPeriod.id);
        } catch (err) {
            console.error("Lỗi khi cập nhật thanh toán", err);
        } finally {
            UIUtils.hideLoading();
        }
    };
}

function exportSelectedToCSV(selectedIds) {
    const selectedSnaps = currentSnapshots.filter(s => selectedIds.includes(String(s.id)));
    if (selectedSnaps.length === 0) return;
    
    let csvContent = "\ufeff"; // Add UTF-8 BOM
    csvContent += "Họ tên,Vị trí,Số ca,Tổng giờ,Lương gốc,Thưởng,Phạt,Thực nhận,Đã trả,Còn nợ,Ngân hàng,Số TK\n";
    
    selectedSnaps.forEach(s => {
        const u = s.user || {};
        const row = [
            `"${u.fullName || ''}"`,
            `"${u.position || ''}"`,
            s.totalShifts || 0,
            s.totalHours || 0,
            s.baseSalary || 0,
            s.totalBonus || 0,
            s.totalPenalty || 0,
            s.netSalary || 0,
            s.amountPaid || 0,
            s.amountOwed || 0,
            `"${u.bankName || ''}"`,
            `"${u.bankAccount || ''}"`
        ];
        csvContent += row.join(",") + "\n";
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `phieu_luong_chi_tiet_${currentPeriod.id}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
}