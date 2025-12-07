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
 * 终极注入：不靠 ID，靠兄弟节点定位
 */
function injectWandButton() {
    const menuItemId = 'st-status-bar-trigger';

    // 辅助函数：寻找可靠的锚点
    const findAnchor = () => {
        // 尝试找到“生成图片”或者“关闭前端渲染”这些肯定存在的按钮
        // 通过文本内容来找
        const anchors = $("div.extension_menu_item_text:contains('生成图片'), div.extension_menu_item_text:contains('Generate Image'), div.extension_menu_item_text:contains('关闭前端渲染')");
        return anchors.first().parent(); // 返回找到的第一个按钮的父元素 (也就是那个 <li> 或 <div>)
    };

    const tryAddButton = () => {
        // 1. 如果按钮已经存在，就别加了
        if ($('#' + menuItemId).length > 0) return;

        // 2. 寻找锚点
        const anchor = findAnchor();

        if (anchor.length > 0) {
            // 3. 找到了锚点，插在它所在的列表最后面
            const container = anchor.parent(); // 获取列表容器 (通常是 .list-group)
            
            const menuItemHtml = `
                <div id="${menuItemId}" class="list-group-item extension_menu_item" style="cursor:pointer; display:flex; align-items:center; gap:10px;">
                    <span class="extension_menu_item_icon fa-solid fa-gauge-high"></span>
                    <span class="extension_menu_item_text">生成测试状态栏</span>
                </div>
            `;
            
            container.append(menuItemHtml);

            // 4. 绑定事件
            container.find('#' + menuItemId).on('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                toastr.info("正在手动渲染状态栏...", "Status Test");
                renderStatusBar();
                
                // 尝试关闭所有可能的菜单
                $('.list-group').parent().hide();
            });
            
            console.log(`[${extensionName}] 按钮通过锚点注入成功！`);
        }
    };

    // 监听魔法棒点击，疯狂尝试注入
    $(document).on('click', '#extensions_button', () => {
        let attempts = 0;
        const interval = setInterval(() => {
            tryAddButton();
            attempts++;
            if (attempts > 20 || $('#' + menuItemId).length > 0) {
                clearInterval(interval);
            }
        }, 100); // 每100ms尝试一次，共2秒
    });
}

// 初始化
jQuery(document).ready(function () {
    console.log(`[${extensionName}] 加载成功 v1.2 (Anchor Mode)`);

    injectWandButton();

    if (window.eventSource) {
        window.eventSource.on(window.event_types.MESSAGE_RENDERED, () => renderStatusBar());
        window.eventSource.on(window.event_types.GENERATION_ENDED, () => renderStatusBar());
        window.eventSource.on(window.event_types.chat_id_changed, () => renderStatusBar());
    }
});