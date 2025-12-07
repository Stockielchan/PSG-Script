// index.js
const extensionName = "StatusTest";

/**
 * 在指定消息下方渲染状态栏
 */
function renderStatusBar() {
    setTimeout(() => {
        const chat = document.getElementById('chat');
        if (!chat) return;

        // 获取最新的一条消息
        const lastMessage = $(chat).find('.mes').last();
        
        if (lastMessage.length === 0 || lastMessage.find('.st-test-status-bar').length > 0) {
            return;
        }

        const statusBarHtml = `
            <div class="st-test-status-bar">
                <span><i class="fa-solid fa-heart st-status-icon"></i> HP: 100/100</span>
                <span><i class="fa-solid fa-bolt st-status-icon" style="color: #ffd93d;"></i> MP: 50/50</span>
                <span><i class="fa-solid fa-shield-halved st-status-icon" style="color: #6bcef5;"></i> 状态: 正常</span>
            </div>
        `;

        lastMessage.find('.mes_text').after(statusBarHtml);
        console.log(`[${extensionName}] 状态栏已渲染`);
    }, 100);
}

/**
 * 强力注入：查找任何包含 "list-group" 的菜单容器
 */
function injectWandButton() {
    const menuItemId = 'st-status-bar-trigger';

    // 辅助函数：尝试添加按钮
    const tryAddButton = () => {
        // 查找所有可能的菜单容器
        // #extensions_menu: 旧版/标准版
        // #qr-extensions-menu: 某些移动端优化版或主题
        // .list-group: 最通用的类名
        const potentialMenus = $('#extensions_menu .list-group, #qr-extensions-menu .list-group, #extensions_menu');

        potentialMenus.each(function() {
            const menu = $(this);
            // 避免重复添加
            if (menu.find('#' + menuItemId).length === 0) {
                // 定义按钮 HTML
                const menuItemHtml = `
                    <div id="${menuItemId}" class="list-group-item extension_menu_item" style="cursor:pointer; display:flex; align-items:center; gap:10px;">
                        <span class="extension_menu_item_icon fa-solid fa-gauge-high"></span>
                        <span class="extension_menu_item_text">生成测试状态栏</span>
                    </div>
                `;
                
                // 插入到菜单末尾
                menu.append(menuItemHtml);
                
                // 绑定点击事件
                menu.find('#' + menuItemId).on('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault(); // 阻止默认行为
                    toastr.info("正在手动渲染状态栏...", "Status Test");
                    renderStatusBar();
                    
                    // 关闭菜单
                    $('#extensions_menu').hide();
                    $('#qr-extensions-menu').hide();
                });
                
                console.log(`[${extensionName}] 按钮已注入到`, menu);
            }
        });
    };

    // 策略 1: 页面加载时尝试注入
    setTimeout(tryAddButton, 1000);

    // 策略 2: 监听魔法棒按钮点击，再次尝试注入（防止菜单是动态生成的）
    $(document).on('click', '#extensions_button', () => {
        setTimeout(tryAddButton, 50);  // 快速尝试
        setTimeout(tryAddButton, 200); // 慢速重试
    });
    
    // 策略 3: 监听 DOM 变化 (MutationObserver) - 最强力的保障
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            // 如果有节点被添加到页面上
            if (mutation.addedNodes.length) {
                // 检查是否是扩展菜单被打开了
                const target = $(mutation.target);
                if (target.is('#extensions_menu') || target.find('#extensions_menu').length > 0) {
                    tryAddButton();
                }
            }
        }
    });
    
    // 开始观察 body 变化
    observer.observe(document.body, { childList: true, subtree: true });
}

// 初始化
jQuery(document).ready(function () {
    console.log(`[${extensionName}] 加载成功 v1.1`);

    injectWandButton();

    if (window.eventSource) {
        window.eventSource.on(window.event_types.MESSAGE_RENDERED, () => renderStatusBar());
        window.eventSource.on(window.event_types.GENERATION_ENDED, () => renderStatusBar());
        window.eventSource.on(window.event_types.chat_id_changed, () => renderStatusBar());
    }
});