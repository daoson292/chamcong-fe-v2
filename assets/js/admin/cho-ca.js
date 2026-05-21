// --- LOGIC CHỢ CA & XỬ LÝ KHIẾU NẠI ---

// 1. LOGIC MỞ CẤU HÌNH & PHÁT HÀNH ĐĂNG KÝ
const btnCreateRegistration = document.getElementById('btnCreateRegistration');
const createRegistrationModal = document.getElementById('createRegistrationModal');
const btnOpenRegistration = document.getElementById('btnOpenRegistration');

// Bấm nút "+ Tạo Đợt Đăng Ký Mới" ở ngoài -> Nảy popup Cấu hình
if (btnCreateRegistration && createRegistrationModal) {
    btnCreateRegistration.addEventListener('click', () => {
        createRegistrationModal.classList.remove('hidden');
        createRegistrationModal.classList.add('flex');
    });
}

// Bấm nút "Phát hành ngay" trong cấu hình -> Đóng cấu hình, Nảy popup Thành công
if (btnOpenRegistration && createRegistrationModal) {
    btnOpenRegistration.addEventListener('click', () => {
        createRegistrationModal.classList.add('hidden');
        createRegistrationModal.classList.remove('flex');
        
        if (typeof UIUtils !== 'undefined') {
            UIUtils.showAlert('Đã mở đăng ký!', 'Nhân viên hiện đã có thể vào App Mobile để đăng ký lịch làm việc cho tuần mới.', true);
        }
    });
}

// 2. LOGIC MỞ MODAL "CHỈNH SỬA CA" CỦA TỪNG NGÀY
const editModal = document.getElementById('editModal');
document.querySelectorAll('.btn-edit-shift').forEach(btn => {
    btn.addEventListener('click', () => {
        if (editModal) {
            editModal.classList.remove('hidden');
            editModal.classList.add('flex');
        }
    });
});

// 3. CHUYỂN TAB ĐƠN TỪ & KHIẾU NẠI (Chờ xử lý / Đã duyệt / Đã hủy)
const tabBtns = document.querySelectorAll('.tab-btn');
tabBtns.forEach(btn => {
    btn.addEventListener('click', function() {
        // Tắt trạng thái active của tất cả các tab
        tabBtns.forEach(b => {
            b.className = "tab-btn px-6 py-2 rounded-lg text-sm font-bold text-slate-500 hover:bg-slate-50 transition";
        });
        // Bật trạng thái active cho tab được bấm
        this.className = "tab-btn px-6 py-2 rounded-lg text-sm font-bold bg-indigo-50 text-indigo-600 transition";
    });
});

// 4. XỬ LÝ DUYỆT / TỪ CHỐI KHIẾU NẠI
const reqCards = document.querySelectorAll('.req-card');
const rejectModal = document.getElementById('rejectModal');
const successModal = document.getElementById('successModal');
const successMsg = document.getElementById('successMsg');
const rejectEmpName = document.getElementById('rejectEmpName');
const confirmRejectBtn = document.getElementById('confirmReject');

let currentCard = null; // Lưu tạm thẻ khiếu nại đang chọn để từ chối

reqCards.forEach(card => {
    const btnApprove = card.querySelector('.btn-approve');
    const btnReject = card.querySelector('.btn-reject');
    const empNameElement = card.querySelector('.font-bold.text-base');
    
    if (!empNameElement) return;
    const empName = empNameElement.innerText;

    // Bấm Duyệt sửa khiếu nại
    if (btnApprove) {
        btnApprove.addEventListener('click', () => {
            if (typeof UIUtils !== 'undefined') {
                UIUtils.showAlert('Thành công!', `Đã DUYỆT và cập nhật dữ liệu sửa đổi cho ${empName}!`, true);
                removeCard(card);
            }
        });
    }

    // Bấm Từ chối khiếu nại -> Hiện form nhập lý do
    if (btnReject) {
        btnReject.addEventListener('click', () => {
            currentCard = card;
            if (rejectEmpName && rejectModal) {
                rejectEmpName.innerText = `Nhân viên: ${empName}`;
                rejectModal.classList.remove('hidden');
                rejectModal.classList.add('flex');
            }
        });
    }
});

// Xác nhận Từ chối trong Modal nhập lý do
if (confirmRejectBtn) {
    confirmRejectBtn.addEventListener('click', () => {
        if (currentCard && rejectModal) {
            rejectModal.classList.add('hidden');
            rejectModal.classList.remove('flex');
            
            if (typeof UIUtils !== 'undefined') {
                UIUtils.showAlert('Thành công!', `Đã TỪ CHỐI đơn khiếu nại thành công!`, true);
            }
            
            removeCard(currentCard);
        }
    });
}

// Hàm xóa thẻ mượt mà có hiệu ứng biến mất
function removeCard(card) {
    card.style.transition = "0.3s ease";
    card.style.opacity = "0";
    card.style.transform = "scale(0.95)";
    setTimeout(() => {
        card.remove();
        updateRequestBoardCounter();
    }, 300);
}

// Cập nhật hoặc hiển thị thông báo khi hết đơn khiếu nại
function updateRequestBoardCounter() {
    const remainingCards = document.querySelectorAll('.req-card').length;
    const pendingTab = document.querySelectorAll('.tab-btn')[0];
    
    if (pendingTab) {
        if (remainingCards > 0) {
            pendingTab.innerText = `Chờ xử lý (${remainingCards})`;
        } else {
            pendingTab.innerText = `Chờ xử lý`;
            const board = document.getElementById('requestBoard');
            if (board) {
                board.innerHTML = `
                    <div class="col-span-full py-12 text-center text-slate-400 font-bold text-lg bg-white rounded-xl border border-dashed border-slate-300 animate-fade-in">
                        🎉 Tuyệt vời! Đã xử lý xong toàn bộ khiếu nại lương và giờ giấc.
                    </div>
                `;
            }
        }
    }
}

// 5. LOGIC ĐÓNG TẤT CẢ CÁC MODALS (Bấm ra ngoài nền đen hoặc bấm nút đóng)
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', function(e) {
        if (e.target === this) {
            this.classList.add('hidden');
            this.classList.remove('flex');
        }
    });
});

document.querySelectorAll('.btn-close-modal').forEach(btn => {
    btn.addEventListener('click', function() {
        const modal = this.closest('.modal-overlay');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    });
});
