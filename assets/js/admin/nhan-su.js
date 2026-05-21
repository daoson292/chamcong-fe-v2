// --- LOGIC TAB NHÂN SỰ ---

let usersData = [];

document.addEventListener('DOMContentLoaded', () => {
    // Gọi API để tải danh sách nhân viên
    loadUsers();

    // ==========================================
    // LOGIC NGHIỆP VỤ NHÂN SỰ
    // ==========================================
    const userModal = document.getElementById('userModal');
    const lockModal = document.getElementById('lockModal');
    const securityModal = document.getElementById('securityModal');
    const modalTitle = document.getElementById('modalTitle');
    const salaryHistory = document.getElementById('salaryHistory');

    // 1. Thêm NV
    const btnAddUser = document.getElementById('btnAddUser');
    if (btnAddUser) {
        btnAddUser.addEventListener('click', () => {
            modalTitle.innerText = "Thêm nhân viên mới";
            if (salaryHistory) salaryHistory.classList.add('hidden');
            
            // Reset form
            document.getElementById('nameInput').value = '';
            document.getElementById('phoneInput').value = '';
            
            userModal.classList.remove('hidden');
            userModal.classList.add('flex');
        });
    }

    // 4. Khóa/Ẩn
    document.getElementById('confirmLock')?.addEventListener('click', async () => {
        const userId = document.getElementById('confirmLock').dataset.id;
        if (!userId) return;

        try {
            // Đảo trạng thái active (giả sử đang mở thì khóa, đang khóa thì mở)
            const user = usersData.find(u => u.id == userId);
            const newStatus = !(user.isActive);

            await ApiClient.patch(`/users/${userId}/status`, {
                isActive: newStatus
            });
            
            if (typeof UIUtils !== 'undefined') {
                UIUtils.showAlert('Thành công', newStatus ? "Đã mở khóa nhân viên!" : "Đã ẩn nhân viên và gỡ khỏi các lịch tuần chưa làm!", true);
            }
            lockModal.classList.add('hidden');
            lockModal.classList.remove('flex');
            
            loadUsers();
        } catch (e) {
            console.error(e);
        }
    });

    // 5. Debounce SĐT (Giữ nguyên)
    const phoneInput = document.getElementById('phoneInput');
    const phoneError = document.getElementById('phoneError');
    if(phoneInput && phoneError) {
        phoneInput.addEventListener('input', (e) => {
            if(e.target.value === '0987654321' || e.target.value === '0987.654.321') {
                phoneError.classList.remove('hidden');
            } else {
                phoneError.classList.add('hidden');
            }
        });
    }

    // Đóng Modal chung
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', function(e) {
            if (e.target === this && this.id !== 'ag-custom-confirm') {
                this.classList.add('hidden');
                this.classList.remove('flex');
            }
        });
    });
    document.querySelectorAll('.btn-close-modal').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal-overlay');
            if(modal) {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            }
        });
    });
    
    // Logic Tab
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.tab-btn').forEach(b => {
                b.classList.remove('text-indigo-600', 'border-b-2', 'border-indigo-600');
                b.classList.add('text-slate-400');
            });

            this.classList.remove('text-slate-400');
            this.classList.add('text-indigo-600', 'border-b-2', 'border-indigo-600');
            
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.add('hidden');
                content.classList.remove('block');
            });

            const targetId = this.getAttribute('data-target');
            document.getElementById(targetId).classList.remove('hidden');
            document.getElementById(targetId).classList.add('block');
        });
    });
});

async function loadUsers() {
    try {
        const response = await ApiClient.get('/users?pageSize=100');
        if (response && response.data) {
            usersData = response.data;
            renderUsers(usersData);
        }
    } catch (error) {
        console.error('Lỗi khi tải danh sách nhân viên:', error);
    }
}

function renderUsers(users) {
    const tbody = document.getElementById('userTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';
    
    users.forEach(user => {
        const avatar = user.fullName ? user.fullName.charAt(0).toUpperCase() : '?';
        const roleName = user.position || (user.role === 'manager' ? 'Quản lý' : 'Nhân viên');
        const isActive = user.isActive;
        const statusClass = isActive ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600';
        const statusText = isActive ? 'Đang làm' : 'Đã nghỉ/Khóa';
        const lockText = isActive ? '🚫 Khóa tài khoản' : '🔓 Mở khóa tài khoản';
        
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 transition';
        tr.innerHTML = `
            <td class="py-5 px-4 md:py-4 md:px-6 flex items-center gap-3">
                <div class="w-10 h-10 shrink-0 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-lg">${avatar}</div>
                <span class="text-base text-slate-800">${user.fullName || 'Chưa cập nhật'}</span>
            </td>
            <td class="py-5 px-4 md:py-4 md:px-6">${user.phone}</td>
            <td class="py-5 px-4 md:py-4 md:px-6"><span class="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs">${roleName}</span></td>
            <td class="py-5 px-4 md:py-4 md:px-6 text-indigo-600 font-bold">-</td>
            <td class="py-5 px-4 md:py-4 md:px-6 text-center"><span class="${statusClass} px-3 py-1 rounded-md text-xs">${statusText}</span></td>
            <td class="py-5 px-4 md:py-4 md:px-6 text-right relative">
                <div class="flex items-center justify-end gap-2">
                    <button data-id="${user.id}" class="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold px-4 py-1.5 rounded-lg transition text-sm btn-edit flex items-center gap-1">
                        <span>✏️</span> Sửa
                    </button>
                    
                    <div class="action-dropdown" onclick="toggleDropdown(this)">
                        <button class="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 px-2 py-1.5 rounded-lg transition focus:outline-none" title="Thêm thao tác">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path></svg>
                        </button>
                        <div class="action-dropdown-menu flex flex-col py-2">
                            <button data-id="${user.id}" class="text-left px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition btn-view-as">👁️ Xem bằng góc nhìn NV</button>
                            <button data-id="${user.id}" class="text-left px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-amber-50 hover:text-amber-600 transition btn-security">🔒 Quản lý Bảo mật</button>
                            <div class="h-px bg-slate-100 my-1"></div>
                            <button data-id="${user.id}" class="text-left px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 transition btn-lock">${lockText}</button>
                        </div>
                    </div>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Gắn lại sự kiện cho các nút vừa tạo
    attachRowEvents();
}

function attachRowEvents() {
    const userModal = document.getElementById('userModal');
    const modalTitle = document.getElementById('modalTitle');
    const salaryHistory = document.getElementById('salaryHistory');
    const lockModal = document.getElementById('lockModal');
    const securityModal = document.getElementById('securityModal');

    // Nút Sửa
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', () => {
            const userId = btn.getAttribute('data-id');
            const user = usersData.find(u => u.id == userId);
            
            modalTitle.innerText = "Sửa hồ sơ nhân viên";
            if (salaryHistory) salaryHistory.classList.remove('hidden');
            
            // Điền form
            if (user) {
                document.getElementById('nameInput').value = user.fullName || '';
                document.getElementById('phoneInput').value = user.phone || '';
            }
            
            userModal.classList.remove('hidden');
            userModal.classList.add('flex');
        });
    });

    // Nút Bảo mật
    document.querySelectorAll('.btn-security').forEach(btn => {
        btn.addEventListener('click', () => {
            securityModal.classList.remove('hidden');
            securityModal.classList.add('flex');
        });
    });

    // Nút Khóa
    document.querySelectorAll('.btn-lock').forEach(btn => {
        btn.addEventListener('click', () => {
            const userId = btn.getAttribute('data-id');
            document.getElementById('confirmLock').dataset.id = userId;
            
            lockModal.classList.remove('hidden');
            lockModal.classList.add('flex');
        });
    });

    // Nút View As
    document.querySelectorAll('.btn-view-as').forEach(btn => {
        btn.addEventListener('click', function() {
            if (typeof UIUtils !== 'undefined') {
                UIUtils.showConfirm('Chuyển giao diện', 'Chuyển sang giao diện App Nhân viên dưới tư cách của người này?', () => {
                    window.location.href = '../employee/index.html'; 
                });
            }
        });
    });
}