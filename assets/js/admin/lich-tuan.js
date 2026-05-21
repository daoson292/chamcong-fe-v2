// --- LOGIC TRANG LỊCH TUẦN ---

const shiftModal = document.getElementById('shiftModal');
const modalTitle = document.getElementById('shiftModalTitle');
const modalDate = document.getElementById('shiftModalDate');

// Hàm mở Modal chỉnh sửa lịch
function openShiftModal(caName, dateStr) {
    modalTitle.innerText = `Cập nhật ${caName}`;
    modalDate.innerText = `Ngày: ${dateStr}/2026`;
    
    shiftModal.classList.remove('hidden');
    shiftModal.classList.add('flex');
}

// Hàm đóng Modal
function closeShiftModal() {
    shiftModal.classList.add('hidden');
    shiftModal.classList.remove('flex');
}

// Click ra ngoài thì tắt modal
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', function(e) {
        if (e.target === this) {
            closeShiftModal();
        }
    });
});