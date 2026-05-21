document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault(); // Chặn load lại trang

    const phone = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const errorMsg = document.getElementById('errorMsg');
    const submitBtn = this.querySelector('button[type="submit"]');

    // Ẩn báo lỗi cũ nếu có
    errorMsg.classList.add('hidden');
    errorMsg.style.display = 'none';

    // Thay đổi UI nút submit
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = 'ĐANG ĐĂNG NHẬP...';
    submitBtn.disabled = true;

    try {
        // GỌI API LOGIN THÔNG QUA API CLIENT MỚI
        const response = await ApiClient.post('/auth/login', { phone, password }, {
            showLoading: false // Không dùng loading toàn màn hình cho nút Login, vì ta đã đổi chữ nút
        });

        // Backend NestJS trả về { data: { token: "...", user: { id, role, ... } } }
        if (response && response.data && response.data.token) {
            // Lưu token và thông tin user vào localStorage
            localStorage.setItem('access_token', response.data.token);
            localStorage.setItem('user_data', JSON.stringify(response.data.user));
            localStorage.setItem('role', response.data.user.role);

            // Tùy thuộc vào role để chuyển hướng
            const role = response.data.user.role;
            if (role === 'admin' || role === 'manager' || role === 'super_admin') {
                window.location.href = 'admin/index.html';
            } else {
                window.location.href = 'employee/index.html';
            }
        } else if (response && response.access_token) {
            // Fallback nếu backend trả về access_token trực tiếp
            localStorage.setItem('access_token', response.access_token);
            localStorage.setItem('user_data', JSON.stringify(response.user || {}));
            localStorage.setItem('role', response.user ? response.user.role : 'employee');

            const role = response.user ? response.user.role : 'employee';
            if (role === 'admin' || role === 'manager' || role === 'super_admin') {
                window.location.href = 'admin/index.html';
            } else {
                window.location.href = 'employee/index.html';
            }
        } else {
            throw new Error('Dữ liệu đăng nhập trả về không hợp lệ');
        }
    } catch (error) {
        // Nếu API trả về lỗi (400, 401, etc.), ApiClient đã tự ném Error ra đây
        // Đồng thời nó cũng tự show Modal Error, nên ta chỉ cần hiện lại lỗi text nếu muốn
        errorMsg.classList.remove('hidden');
        errorMsg.style.display = 'block';
        errorMsg.textContent = error.message || 'Đăng nhập thất bại!';
    } finally {
        // Khôi phục nút
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
    }
});