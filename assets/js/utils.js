/**
 * Antigravity - UI & Formatter Utilities (Phase 4)
 * Tổng hợp các hàm tiện ích xử lý giao diện chung để giảm lặp code.
 */

const UIUtils = {
    /**
     * Format số tiền sang chuẩn VND (Ví dụ: 5.000.000đ)
     */
    formatVND: (amount) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            maximumFractionDigits: 0
        }).format(amount);
    },

    /**
     * Format ngày tháng hiển thị đẹp (Ví dụ: Thứ 2 (11/05))
     */
    formatDateToDay: (dateString) => {
        const date = new Date(dateString);
        const days = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
        const dayName = days[date.getDay()];
        const d = date.getDate().toString().padStart(2, '0');
        const m = (date.getMonth() + 1).toString().padStart(2, '0');
        return `${dayName} (${d}/${m})`;
    },

    /**
     * Tạo Modal Custom Alert thay thế cho hàm `alert()` mặc định xấu xí
     * Tự động inject Modal HTML vào body nếu chưa có.
     */
    showAlert: (title, message, isSuccess = false) => {
        let modal = document.getElementById('ag-custom-alert');
        if (!modal) {
            // Inject HTML
            const modalHTML = `
                <div class="fixed inset-0 bg-slate-900/60 hidden items-center justify-center z-[9999]" id="ag-custom-alert">
                    <div class="bg-white p-6 rounded-2xl w-[90%] max-w-[350px] shadow-xl relative text-center transform scale-95 transition-transform duration-200" id="ag-alert-box">
                        <div id="ag-alert-icon" class="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl font-bold"></div>
                        <h3 id="ag-alert-title" class="font-bold text-base mb-1 text-slate-800"></h3>
                        <p class="text-sm text-slate-500 mb-5 font-semibold leading-relaxed" id="ag-alert-message"></p>
                        <button class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition shadow-sm active:scale-95" onclick="UIUtils.closeAlert()">Đã hiểu</button>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            modal = document.getElementById('ag-custom-alert');
        }

        const box = document.getElementById('ag-alert-box');
        const icon = document.getElementById('ag-alert-icon');
        
        document.getElementById('ag-alert-title').innerText = title;
        document.getElementById('ag-alert-message').innerText = message;
        
        if (isSuccess) {
            icon.className = 'w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl font-bold';
            icon.innerText = '🎉';
        } else {
            icon.className = 'w-14 h-14 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl font-bold';
            icon.innerText = 'ℹ️';
        }

        modal.classList.remove('hidden');
        modal.classList.add('flex');
        setTimeout(() => box.classList.remove('scale-95'), 10);
    },

    closeAlert: () => {
        const box = document.getElementById('ag-alert-box');
        if (!box) return;
        box.classList.add('scale-95');
        setTimeout(() => {
            const modal = document.getElementById('ag-custom-alert');
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }, 200);
    },

    /**
     * Tạo Modal Confirm chung (Dùng cho Admin khi muốn Hủy/Đồng ý)
     */
    showConfirm: (title, message, onConfirm) => {
        let modal = document.getElementById('ag-custom-confirm');
        if (!modal) {
            const modalHTML = `
                <div class="fixed inset-0 bg-slate-900/60 hidden items-center justify-center z-[9999]" id="ag-custom-confirm">
                    <div class="bg-white p-6 rounded-2xl w-[90%] max-w-[400px] shadow-xl relative text-center transform scale-95 transition-transform duration-200" id="ag-confirm-box">
                        <div class="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl font-bold">❓</div>
                        <h3 id="ag-confirm-title" class="font-bold text-lg mb-2 text-slate-800"></h3>
                        <p class="text-sm text-slate-500 mb-6 font-semibold" id="ag-confirm-message"></p>
                        <div class="flex gap-3">
                            <button class="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-lg transition" onclick="UIUtils.closeConfirm()">Hủy</button>
                            <button class="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition shadow-sm" id="ag-btn-confirm-ok">Đồng ý</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            modal = document.getElementById('ag-custom-confirm');
        }

        document.getElementById('ag-confirm-title').innerText = title;
        document.getElementById('ag-confirm-message').innerText = message;
        
        const btnOk = document.getElementById('ag-btn-confirm-ok');
        // Xóa event listener cũ
        const newBtnOk = btnOk.cloneNode(true);
        btnOk.parentNode.replaceChild(newBtnOk, btnOk);
        
        newBtnOk.addEventListener('click', () => {
            UIUtils.closeConfirm();
            if (onConfirm) onConfirm();
        });

        const box = document.getElementById('ag-confirm-box');
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        setTimeout(() => box.classList.remove('scale-95'), 10);
    },

    closeConfirm: () => {
        const box = document.getElementById('ag-confirm-box');
        if (!box) return;
        box.classList.add('scale-95');
        setTimeout(() => {
            const modal = document.getElementById('ag-custom-confirm');
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }, 200);
    },

    /**
     * Sinh HTML thẻ Skeleton Loading
     * Dùng để hiển thị trạng thái chờ tải dữ liệu trên Dashboard hoặc Danh sách
     */
    generateSkeletonCard: () => {
        return `
            <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm animate-pulse">
                <div class="flex justify-between items-center mb-3">
                    <div class="w-24 h-4 bg-slate-200 rounded-full"></div>
                    <div class="w-16 h-4 bg-slate-200 rounded-full"></div>
                </div>
                <div class="space-y-2">
                    <div class="w-full h-8 bg-slate-100 rounded-lg"></div>
                    <div class="w-3/4 h-8 bg-slate-100 rounded-lg"></div>
                </div>
            </div>
        `;
    },

    /**
     * Hiệu ứng "Nảy Số" (Bounce) khi dữ liệu thay đổi
     * Cách dùng: Gọi hàm này truyền vào ID của Element chứa con số muốn tạo hiệu ứng.
     */
    triggerBounceUpdate: (elementId, newValue, colorClass = 'text-emerald-500') => {
        const el = document.getElementById(elementId);
        if (!el) return;
        
        // Lưu class cũ
        const oldClasses = el.className;
        
        el.innerText = newValue;
        el.classList.add('transform', 'scale-125', colorClass, 'transition-transform', 'duration-300');
        
        setTimeout(() => {
            el.className = oldClasses + ' transition-transform duration-300';
        }, 400);
    },

    /**
     * Hiển thị màn hình Loading toàn cục (Spinner overlay)
     * Ngăn user thao tác trong lúc chờ API.
     */
    showLoading: () => {
        let loadingEl = document.getElementById('ag-global-loading');
        if (!loadingEl) {
            const html = `
                <div id="ag-global-loading" class="fixed inset-0 bg-slate-900/40 hidden items-center justify-center z-[99999] backdrop-blur-sm">
                    <div class="bg-white p-4 rounded-xl shadow-2xl flex flex-col items-center gap-3">
                        <div class="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                        <span class="text-sm font-bold text-slate-700">Đang xử lý...</span>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', html);
            loadingEl = document.getElementById('ag-global-loading');
        }
        loadingEl.classList.remove('hidden');
        loadingEl.classList.add('flex');
    },

    /**
     * Tắt màn hình Loading toàn cục
     */
    hideLoading: () => {
        const loadingEl = document.getElementById('ag-global-loading');
        if (loadingEl) {
            loadingEl.classList.add('hidden');
            loadingEl.classList.remove('flex');
        }
    }
};
