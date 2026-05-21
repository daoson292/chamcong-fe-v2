/**
 * mobile-nav.js — Shared Mobile Navigation for Admin
 * Inject hamburger + drawer dynamically to avoid repeating HTML in every file
 */
(function () {
    // Xác định trang hiện tại (dùng để highlight active link)
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    const NAV_LINKS = [
        { href: 'index.html',      icon: '📊', label: 'Tổng Quan' },
        { href: 'lich-tuan.html',  icon: '📅', label: 'Lịch Tuần' },
        { href: 'cham-cong.html',  icon: '📋', label: 'Điểm Danh' },
        { href: 'duyet-cong.html', icon: '✅', label: 'Chốt Ca' },
        { href: 'cho-ca.html',     icon: '🛒', label: 'Chợ Ca' },
        { href: 'chot-luong.html', icon: '💰', label: 'Lương' },
        { href: 'nhan-su.html',    icon: '👥', label: 'Nhân Sự' },
    ];

    // Tạo nút Hamburger và inject vào navbar
    function injectHamburger() {
        const rightSide = document.querySelector('nav > div:last-child, nav .flex:last-child');
        if (!rightSide) return;

        const btn = document.createElement('button');
        btn.id = 'btnHamburger';
        btn.className = 'md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition';
        btn.setAttribute('aria-label', 'Mở menu');
        btn.innerHTML = `
            <svg id="iconHamburger" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
            <svg id="iconClose" class="w-6 h-6 hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>`;
        btn.addEventListener('click', toggleMobileNav);
        rightSide.appendChild(btn);
    }

    // Tạo Drawer
    function injectDrawer() {
        const linksHTML = NAV_LINKS.map(link => {
            const isActive = currentPage === link.href;
            const activeClass = isActive
                ? 'text-indigo-600 bg-indigo-50'
                : 'text-slate-600 hover:bg-slate-50';
            return `<a href="${link.href}" class="flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm ${activeClass} transition">${link.icon} ${link.label}</a>`;
        }).join('');

        const overlay = document.createElement('div');
        overlay.id = 'mobileNavOverlay';
        overlay.className = 'fixed inset-0 bg-slate-900/50 z-[998] hidden md:hidden';
        overlay.addEventListener('click', toggleMobileNav);

        const drawer = document.createElement('div');
        drawer.id = 'mobileNavDrawer';
        drawer.className = 'fixed top-0 left-0 h-full w-72 bg-white z-[999] shadow-2xl transform -translate-x-full transition-transform duration-300 ease-in-out md:hidden flex flex-col';
        drawer.innerHTML = `
            <div class="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div class="text-lg font-black text-indigo-600">⚡ XƯỞNG CÁP</div>
                <button id="btnCloseDrawer" class="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>
            <nav class="flex flex-col p-4 gap-1 flex-1 overflow-y-auto">${linksHTML}</nav>
            <div class="p-4 border-t border-slate-100">
                <div class="text-xs font-bold text-slate-400 mb-2">Chào, Sếp Sơn</div>
                <a href="../login.html" class="flex items-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 px-4 py-3 rounded-xl font-bold text-sm transition">🚪 Đăng xuất</a>
            </div>`;

        document.body.appendChild(overlay);
        document.body.appendChild(drawer);

        document.getElementById('btnCloseDrawer').addEventListener('click', toggleMobileNav);
    }

    // Toggle open/close
    window.toggleMobileNav = function () {
        const drawer  = document.getElementById('mobileNavDrawer');
        const overlay = document.getElementById('mobileNavOverlay');
        const iconH   = document.getElementById('iconHamburger');
        const iconC   = document.getElementById('iconClose');
        if (!drawer) return;
        const isOpen = !drawer.classList.contains('-translate-x-full');
        drawer.classList.toggle('-translate-x-full', isOpen);
        overlay.classList.toggle('hidden', isOpen);
        if (iconH) iconH.classList.toggle('hidden', !isOpen);
        if (iconC) iconC.classList.toggle('hidden', isOpen);
    };

    // Init sau khi DOM sẵn sàng
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        injectHamburger();
        injectDrawer();
    }
})();
