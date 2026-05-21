// --- LOGIC TAB TỔNG QUAN (DASHBOARD) ---

document.addEventListener('DOMContentLoaded', () => {

    // --- 2. LOGIC BẢNG VIỆC CẦN XỬ LÝ (TICKETS) ---
    const ticketSection = document.getElementById('ticketSection');

    if (ticketSection) {
        const dismissButtons = ticketSection.querySelectorAll('button.bg-slate-100');
        
        dismissButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                // SỬ DỤNG CUSTOM CONFIRM THAY CHO LỆNH CŨ
                if(typeof UIUtils !== 'undefined') {
                    UIUtils.showConfirm('Xác nhận bỏ qua', 'Xác nhận bỏ qua/bác bỏ mục này? Hành động này sẽ không tính phạt hoặc bỏ qua khiếu nại.', () => {
                    
                    const ticketCard = this.closest('.p-5'); 
                    
                    // Hiệu ứng bay màu
                    ticketCard.style.transition = 'all 0.3s ease';
                    ticketCard.style.opacity = '0';
                    ticketCard.style.transform = 'translateX(30px)';
                    
                    setTimeout(() => {
                        ticketCard.remove(); 
                        updateTicketCount(); 
                    }, 300);
                });
                }
            });
        });
    }

    // Hàm đếm số lượng
    function updateTicketCount() {
        const remainingTickets = ticketSection.querySelectorAll('.divide-y > .p-5').length;
        const badge = ticketSection.querySelector('.bg-orange-100');
        
        if (badge) {
            if (remainingTickets > 0) {
                badge.innerText = `${remainingTickets} chờ xử lý`;
            } else {
                badge.innerText = `Đã xong`;
                badge.classList.replace('bg-orange-100', 'bg-emerald-100');
                badge.classList.replace('text-orange-600', 'text-emerald-600');
                
                const listContainer = ticketSection.querySelector('.divide-y');
                listContainer.innerHTML = `
                    <div class="p-10 text-center text-slate-400 font-bold flex flex-col items-center justify-center">
                        <div class="text-4xl mb-2">🎉</div>
                        Tuyệt vời! Sếp đã giải quyết xong mọi việc trong hôm nay.
                    </div>
                `;
            }
        }
        
        const statCards = document.querySelectorAll('h3.text-slate-500');
        statCards.forEach(h3 => {
            if (h3.innerText.includes('Khiếu nại đang chờ')) {
                const numberDiv = h3.nextElementSibling;
                const textDesc = numberDiv.nextElementSibling;

                if (numberDiv) {
                    numberDiv.innerText = remainingTickets;
                    if(remainingTickets === 0) {
                        numberDiv.classList.replace('text-orange-500', 'text-emerald-500');
                        textDesc.innerText = "Không có khiếu nại";
                        textDesc.classList.replace('text-orange-400', 'text-slate-400');
                        textDesc.classList.remove('animate-pulse');
                    }
                }
            }
        });
    }
});