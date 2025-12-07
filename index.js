// index.js
const extensionName = "StatusTest";

/**
 * 在指定消息下方渲染状态栏
 */
function renderStatusBar() {
    // 稍微延迟以确保DOM已更新
    setTimeout(() => {
        const chat = document.getElementById('chat');
        if (!chat) return;

        // 获取最新的一条消息
        const lastMessage = $(chat).find('.mes').last();
        
        // 检查是否存在消息，以及是否已经插入过状态栏，避免重复
        if (lastMessage.length === 0 || lastMessage.find('.st-test-status-bar').length > 0) {
            return;
        }

        // 定义状态栏 HTML (你可以随意修改这里的数值)
        const statusBarHtml = `
            <div class="st-test-status-bar">
                <span><i class="fa-solid fa-heart st-status-icon"></i> HP: 100/100</span>
                <span><i class="fa-solid fa-bolt st-status-icon" style="color: #ffd93d;"></i> MP: 50/50</span>
                <span><i class="fa-solid fa-shield-halved st-status-icon" style="color: #6bcef5;"></i> 状态: 正常</span>
            </div>
        `;

        // 将状态栏插入到消息文本 (.mes_text) 后面
        lastMessage.find('.mes_text').after(statusBarHtml);
        console.log(`[${extensionName}] 状态栏已渲染`);
    }, 100);
}

/**
 * 将按钮注入到魔法棒菜单 (Extensions Menu)
 */
function injectWandButton() {
    const menuItemId = 'st-status-bar-trigger';
    
    // 监听魔法棒按钮的点击事件
    $(document).on('click', '#extensions_button', () => {
        // 给予菜单弹出的缓冲时间
        setTimeout(() => {
            // 尝试查找菜单列表容器
            const menuList = $('#extensions_menu .list-group, #qr-extensions-menu .list-group').first();
            
            // 如果找到了菜单且我们的按钮还没加进去
            if (menuList.length > 0 && $('#' + menuItemId).length === 0) {
                
                // 定义菜单项 HTML
                const menuItemHtml = `
                    <div id="${menuItemId}" class="list-group-item extension_menu_item">
                        <div class="extension_menu_item_icon fa-solid fa-gauge-high"></div>
                        <div class="extension_menu_item_text">生成测试状态栏</div>
                    </div>
                `;
                
                // 添加到菜单末尾
                menuList.append(menuItemHtml);
                
                // 绑定点击事件
                $('#' + menuItemId).on('click', (e) => {
                    e.stopPropagation(); // 防止冒泡
                    toastr.info("正在手动渲染状态栏...", "Status Test");
                    renderStatusBar();
                    // 点击后自动关闭菜单
                    $('#extensions_menu').hide(); 
                });
            }
        }, 100);
    });
}

// 初始化
jQuery(document).ready(function () {
    console.log(`[${extensionName}] 加载成功`);

    // 1. 注入魔法棒按钮
    injectWandButton();

    // 2. 监听消息渲染事件，自动添加状态栏
    // 监听消息已渲染事件
    if (window.eventSource) {
        window.eventSource.on(window.event_types.MESSAGE_RENDERED, () => renderStatusBar());
        // 监听生成结束事件 (流式传输结束)
        window.eventSource.on(window.event_types.GENERATION_ENDED, () => renderStatusBar());
        // 监听群组/聊天切换
        window.eventSource.on(window.event_types.chat_id_changed, () => renderStatusBar());
    }
});