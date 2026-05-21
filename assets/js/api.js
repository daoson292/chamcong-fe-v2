// Frontend/assets/js/api.js

const API_BASE_URL = 'http://localhost:3001/api';

const ApiClient = {
    /**
     * Hàm gọi API cốt lõi dùng chung (wrapper của fetch)
     * Tự động đính kèm JWT Token và xử lý lỗi global
     */
    async fetch(endpoint, options = {}) {
        // 1. Tích hợp Loading State
        if (options.showLoading !== false) {
            UIUtils.showLoading();
        }

        // 2. Interceptor: Lấy token từ localStorage
        const token = localStorage.getItem('access_token');
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            // 3. Gọi Fetch API
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                ...options,
                headers
            });

            // 4. Xử lý Lỗi Global
            if (!response.ok) {
                // 4.1. Lỗi 401 Unauthorized (Token hết hạn / Không hợp lệ)
                if (response.status === 401) {
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('user_data');
                    // Không redirect nếu đang ở trang login
                    if (!window.location.pathname.includes('login.html')) {
                        window.location.href = '../login.html'; // Tùy vị trí file
                    }
                    return null;
                }

                // 4.2. Lỗi 400, 403, 500 (Lỗi nghiệp vụ hoặc server)
                const errorData = await response.json().catch(() => ({}));
                const errorMsg = errorData.message || errorData.error || 'Có lỗi xảy ra khi kết nối máy chủ.';
                
                UIUtils.showAlert('error', 'Lỗi Hệ Thống', errorMsg);
                throw new Error(errorMsg);
            }

            // 5. Trả về data (Nếu gọi thành công)
            return await response.json();

        } catch (error) {
            console.error('API Error:', error);
            throw error; // Quăng lỗi ra ngoài
        } finally {
            // 6. Tắt Loading State
            if (options.showLoading !== false) {
                UIUtils.hideLoading(); 
            }
        }
    },

    // Các hàm helper gọi nhanh:
    get(endpoint, options) { return this.fetch(endpoint, { ...options, method: 'GET' }); },
    post(endpoint, body, options) { return this.fetch(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) }); },
    put(endpoint, body, options) { return this.fetch(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) }); },
    patch(endpoint, body, options) { return this.fetch(endpoint, { ...options, method: 'PATCH', body: JSON.stringify(body) }); },
    delete(endpoint, options) { return this.fetch(endpoint, { ...options, method: 'DELETE' }); }
};
