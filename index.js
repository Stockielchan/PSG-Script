// index.js [DEBUG VERSION 1.4]
const extensionName = "StatusTest";

function renderStatusBar() {
    // 渲染状态栏的逻辑保持不变
    setTimeout(() => {
        const chat = document.getElementById('chat');
        if (!chat) return;
        const lastMessage = $(chat).find('.mes').last();
        if (lastMessage.length === 0 || lastMessage.find('.st-test-status-bar').length > 0) return;

        const statusBarHtml = `
            <div class="st-test-status-bar">
                <span><i class="fa-solid fa-heart st-status-icon"></i> HP: 100/100</span>
                <span><i class="fa-solid fa-bolt st-status-icon" style="color: #ffd93d;"></i> MP: 50/50</span>
                <span><i class="fa-solid fa-shield-halved st-status-icon" style="color: #6bcef5;"></i> 状态: 正常</span>
            </div>
        `;
        lastMessage.find('.mes_text').after(statusBarHtml);
    }, 100);
}

function injectWandButton() {
    const menuItemId = 'st-status-bar-trigger';

    const addBtn = (container, name) => {
        if (container.find('#' + menuItemId).length > 0) return;

        console.log(`[${extensionName}] 正在尝试注入到: ${name}`, container);
        
        const btn = `
            <div id="${menuItemId}" class="list-group-item extension_menu_item" style="cursor:pointer; display:flex; align-items:center; gap:10px; background: rgba(0, 100, 0, 0.2); border: 1px solid lime;">
                <span class="extension_menu_item_icon fa-solid fa-bug" style="color: lime;"></span>
                <span class="extension_menu_item_text">测试状态栏 (Debug)</span>
            </div>
        `;
        
        container.append(btn);
        
        container.find('#' + menuItemId).on('click', (e) => {
            e.stopPropagation(); e.preventDefault();
            renderStatusBar();
            // 尝试关闭菜单
            container.closest('.drawer-content').hide();
            $('#extensions_menu').hide();
        });
        
        toastr.success(`按钮已注入到 ${name}!`, "Debug Success");
    };

    // 核心逻辑：监听点击，并在点击后的一段时间内疯狂搜索 DOM
    $(document).on('click', '#extensions_button', () => {
        console.log(`[${extensionName}] 魔法棒被点击！开始搜索目标...`);
        
        let attempts = 0;
        const maxAttempts = 20; // 尝试20次 (约2秒)
        
        const interval = setInterval(() => {
            attempts++;
            
            // 1. 尝试标准选择器
            const standardList = $('#extensions_menu .list-group');
            if (standardList.length) addBtn(standardList, "Standard List");

            // 2. 尝试寻找包含“生成图片”的列表
            const genImgBtn = $("div:contains('生成图片'), div:contains('Generate Image'), div:contains('关闭前端渲染')").last();
            if (genImgBtn.length) {
                const parentList = genImgBtn.closest('.list-group');
                if (parentList.length) addBtn(parentList, "Sibling List (via Text)");
            }

            // 3. 暴力搜索所有可见的 list-group
            $('.list-group:visible').each(function() {
                addBtn($(this), "Visible List-Group");
            });

            if (attempts >= maxAttempts) clearInterval(interval);
        }, 100);
    });
}

jQuery(document).ready(function () {
    console.log(`[${extensionName}] Debug 版本加载完毕`);
    injectWandButton();
    
    // 自动挂载消息事件
    if (window.eventSource) {
        window.eventSource.on(window.event_types.MESSAGE_RENDERED, renderStatusBar);
        window.eventSource.on(window.event_types.GENERATION_ENDED, renderStatusBar);
        window.eventSource.on(window.event_types.chat_id_changed, renderStatusBar);
    }
});