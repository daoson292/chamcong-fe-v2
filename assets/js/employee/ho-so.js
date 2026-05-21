document.addEventListener('DOMContentLoaded', () => {

    const nameEl = document.getElementById('empFullName');
    const roleEl = document.getElementById('empRole');
    const phoneEl = document.getElementById('empPhone');
    const avatarEl = document.getElementById('empAvatar');

    const bankNameEl = document.getElementById('empBankName');
    const bankAccountEl = document.getElementById('empBankAccount');

    const pwdModal = document.getElementById('pwdModal');
    const pwdBox = document.getElementById('pwdBox');

    const currentPasswordInput = document.getElementById('currentPasswordInput');
    const newPasswordInput = document.getElementById('newPasswordInput');
    const confirmPasswordInput = document.getElementById('confirmPasswordInput');
    const btnSubmitPwd = document.getElementById('btnSubmitPwd');
    const btnLogout = document.getElementById('btnLogout');

    // Load user info from /api/auth/me
    const loadUserInfo = async () => {
        try {
            // First load from localStorage for instant display
            const localData = localStorage.getItem('user_data');
            if (localData) {
                const user = JSON.parse(localData);
                renderUser(user);
            }

            // Fetch live data from backend
            const response = await ApiClient.get('/auth/me');
            if (response && response.data) {
                const user = response.data;
                renderUser(user);
                
                // Update local storage to keep it in sync
                localStorage.setItem('user_data', JSON.stringify(user));
            }
        } catch (error) {
            console.error("Lỗi tải thông tin cá nhân:", error);
        }
    };

    const renderUser = (user) => {
        if (nameEl) nameEl.innerText = user.fullName || 'Nhân viên';
        
        if (roleEl) {
            const roleMap = {
                'employee': 'Nhân viên',
                'admin': 'Quản lý',
                'super_admin': 'Giám đốc'
            };
            roleEl.innerText = roleMap[user.role] || user.role || 'Nhân viên';
        }

        if (phoneEl) {
            phoneEl.innerText = user.phone || 'Chưa cập nhật';
        }
        
        if (avatarEl) {
            const fullName = user.fullName || 'NV';
            avatarEl.innerText = fullName.charAt(0).toUpperCase();
        }

        if (bankNameEl) {
            bankNameEl.innerText = user.bankName || 'Chưa cập nhật';
        }

        if (bankAccountEl) {
            bankAccountEl.innerText = user.bankAccount || 'Chưa cập nhật';
        }
    };

    // Modal helpers
    const closeModal = () => {
        pwdBox.classList.replace('scale-100', 'scale-95');
        setTimeout(() => {
            pwdModal.classList.replace('flex', 'hidden');
        }, 150);
    };

    const openModal = () => {
        currentPasswordInput.value = '';
        newPasswordInput.value = '';
        confirmPasswordInput.value = '';
        pwdModal.classList.remove('hidden');
        pwdModal.classList.add('flex');
        setTimeout(() => pwdBox.classList.replace('scale-95', 'scale-100'), 10);
    };

    document.querySelector('.btn-open-pwd')?.addEventListener('click', openModal);

    document.querySelectorAll('.btn-close-modal').forEach(btn => {
        btn.addEventListener('click', closeModal);
    });

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', function(e) {
            if (e.target === this) closeModal();
        });
    });

    // Change password submission
    btnSubmitPwd?.addEventListener('click', async () => {
        const currentPassword = currentPasswordInput.value.trim();
        const newPassword = newPasswordInput.value.trim();
        const confirmPassword = confirmPasswordInput.value.trim();

        if (!currentPassword) {
            UIUtils.showAlert('Lỗi', 'Vui lòng nhập mật khẩu hiện tại.', false);
            return;
        }

        if (newPassword.length < 6) {
            UIUtils.showAlert('Lỗi', 'Mật khẩu mới phải từ 6 ký tự trở lên.', false);
            return;
        }

        if (newPassword !== confirmPassword) {
            UIUtils.showAlert('Lỗi', 'Nhập lại mật khẩu mới không khớp.', false);
            return;
        }

        try {
            btnSubmitPwd.disabled = true;
            btnSubmitPwd.innerText = 'Đang lưu...';

            await ApiClient.patch('/auth/change-password', {
                currentPassword,
                newPassword
            });

            closeModal();
            
            setTimeout(() => {
                UIUtils.showAlert('Thành công', 'Đổi mật khẩu thành công. Hãy dùng mật khẩu mới cho lần đăng nhập sau!', true);
            }, 150);

        } catch (error) {
            console.error('Lỗi đổi mật khẩu:', error);
        } finally {
            btnSubmitPwd.disabled = false;
            btnSubmitPwd.innerText = 'Cập nhật';
        }
    });

    // Handle logout click
    btnLogout?.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            await ApiClient.post('/auth/logout');
        } catch (error) {
            console.error('Lỗi đăng xuất:', error);
        } finally {
            localStorage.removeItem('token');
            localStorage.removeItem('user_data');
            window.location.href = '../login.html';
        }
    });

    loadUserInfo();
});
