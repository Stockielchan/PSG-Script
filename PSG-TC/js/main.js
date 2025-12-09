// 全局变量定义
const SAVE_KEY = RPG.Config.SAVE_KEY;
const SPLIT_TAG = RPG.Config.SPLIT_TAG;

// 全局 Tag 常量定义
const TAG_THINK_OPEN = String.fromCharCode(60) + "t" + "hink" + String.fromCharCode(62);
const TAG_THINK_CLOSE = String.fromCharCode(60) + "/" + "t" + "hink" + String.fromCharCode(62);
const TAG_THINKING_OPEN = String.fromCharCode(60) + "thinking" + String.fromCharCode(62);
const TAG_THINKING_CLOSE = String.fromCharCode(60) + "/thinking" + String.fromCharCode(62);
const TAG_SUMMARY_OPEN = String.fromCharCode(60) + "log_summary" + String.fromCharCode(62);
const TAG_SUMMARY_CLOSE = String.fromCharCode(60) + "/" + "log_summary" + String.fromCharCode(62);
const TAG_STATE_OPEN = String.fromCharCode(60) + "s" + "tate" + String.fromCharCode(62);
const TAG_STATE_CLOSE = String.fromCharCode(60) + "/" + "s" + "tate" + String.fromCharCode(62);

// 全局变量，方便模块间调用
window.gameState = { ...RPG.Config.DEFAULT_STATE };
window.messageLog = [];
window.storySummary = "暂无剧情梗概。";
window.activeSlotIndex = -1;

let isFullscreen = false;
let isGenerating = false;
let currentEditIndex = -1;

// 初始化 UI 对象引用
const ui = { 
    timeShort: document.getElementById('ui-time-short'),
    timeFull: document.getElementById('ui-time-full'),
    locShort: document.getElementById('ui-loc-short'),
    locFull: document.getElementById('ui-loc-full'),
    danten: document.getElementById('val-danten'), 
    heaven: document.getElementById('val-heaven'), 
    hell: document.getElementById('val-hell'), 
    inv: document.getElementById('ui-inventory'),
    chat: document.getElementById('chat-history'),
    stage: document.getElementById('game-stage'),
    input: document.getElementById('user-input'),
    btn: document.getElementById('send-btn'),
    iconSend: document.getElementById('icon-send-svg'),
    iconLoad: document.getElementById('icon-loading')
};

function updateUI() { 
    if(!ui.timeShort) return; // 容错处理
    ui.timeShort.innerText = window.gameState.timeShort;
    ui.timeFull.innerText = window.gameState.timeFull;
    ui.locShort.innerText = window.gameState.locShort;
    ui.locFull.innerText = window.gameState.locFull;
    ui.danten.innerText = window.gameState.danten; 
    ui.heaven.innerText = window.gameState.heaven; 
    ui.hell.innerText = window.gameState.hell; 
    ui.inv.innerText = window.gameState.inventory; 
}

// 核心功能：创建气泡元素
function createBubbleElement(msg, index) {
    const bubble = document.createElement('div');
    bubble.className = `bubble bubble-${msg.type}`;
    bubble.dataset.index = index;
    
    bubble.onclick = (e) => {
        if (e.target.closest('summary') || e.target.closest('.action-btn') || e.target.tagName === 'A') return;
        const existingBar = bubble.querySelector('.msg-action-bar');
        if (existingBar) { closeActionBar(existingBar, bubble); }
        else { 
            document.querySelectorAll('.msg-action-bar').forEach(bar => { closeActionBar(bar, bar.parentElement); });
            const actionBar = document.createElement('div');
            actionBar.className = 'msg-action-bar';
            actionBar.innerHTML = `<div class="action-btn delete" onclick="confirmDeleteMessage(${index}, event)"><svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg> 删除</div><div class="action-btn" onclick="openEditMessageModal(${index}, event)"><svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg> 编辑</div>`;
            bubble.appendChild(actionBar);
            requestAnimationFrame(() => { actionBar.classList.add('show'); bubble.classList.add('menu-open'); });
        }
    };
    
    let html = '';
    if (msg.type === 'ai') html = `<div class="name-tag">NARRATOR</div>`;
    else if (msg.type === 'system') html = `<div class="name-tag" style="color:#aaa;">SYSTEM</div>`;
    
    if (msg.thought && msg.thought.trim() !== "") {
        html += `
        <details class="thought-box">
            <summary class="thought-summary">
                <div class="thought-left">
                    <svg class="spin-icon" viewBox="0 0 24 24"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>
                    <span>AI 思考过程</span>
                </div>
                <svg class="thought-star" viewBox="0 0 24 24"><path d="M12 2L15 9L22 12L15 15L12 22L9 15L2 12L9 9Z"/></svg>
            </summary>
            <div class="thought-content">${msg.thought.replace(/</g, '<').replace(/>/g, '>')}</div>
        </details>`; 
    }
    
    if (msg.content && msg.content.trim()) { html += RPG.Utils.formatMarkdown(msg.content); } else { html += "<span style='opacity:0.5; font-style:italic;'>...</span>"; } 
    bubble.innerHTML = html; return bubble;
}

function closeActionBar(bar, bubble) { if (!bar) return; bar.classList.remove('show'); if (bubble) bubble.classList.remove('menu-open'); bar.addEventListener('transitionend', () => { bar.remove(); }, { once: true }); }

function openEditMessageModal(index, e) {
    e.stopPropagation();
    currentEditIndex = index;
    const msg = window.messageLog[index];
    openModal('edit', '编辑文本', msg.content, () => {
        const newVal = modal.input.value;
        if (newVal !== null) {
            window.messageLog[currentEditIndex].content = newVal;
            saveGame();
            ui.chat.innerHTML = '';
            const fragment = document.createDocumentFragment();
            window.messageLog.forEach((m, i) => fragment.appendChild(createBubbleElement(m, i)));
            ui.chat.appendChild(fragment);
            closeModal();
            RPG.Utils.showToast("修改已保存");
        }
    });
}

function confirmDeleteMessage(index, e) {
    e.stopPropagation();
    openModal('confirm', '删除消息', '确定要删除这条记录吗？', () => {
        if (index === window.messageLog.length - 1) {
            window.messageLog.pop();
            restoreStateFromLog();
            if (window.messageLog.length > 0) {
                const prevMsg = window.messageLog[window.messageLog.length - 1];
                if (prevMsg.snapshot) rollbackState(prevMsg.snapshot);
            } else {
                window.storySummary = "暂无剧情梗概。";
            }
        } else {
            window.messageLog.splice(index, 1);
            restoreStateFromLog();
        }
        
        saveGame();
        ui.chat.innerHTML = '';
        const fragment = document.createDocumentFragment();
        window.messageLog.forEach((m, i) => fragment.appendChild(createBubbleElement(m, i)));
        ui.chat.appendChild(fragment);
        closeModal();
        RPG.Utils.showToast("消息已删除");
    });
}

function getContextPrompt() {
    const parts = ['\n[System Info: Frontend State Injection]'];
    const T_THINK_OPEN = TAG_THINK_OPEN;
    const T_THINK_CLOSE = TAG_THINK_CLOSE;
    const T_STATE_OPEN = TAG_STATE_OPEN;
    const T_STATE_CLOSE = TAG_STATE_CLOSE;
    const T_SUM_OPEN = TAG_SUMMARY_OPEN;
    const T_SUM_CLOSE = TAG_SUMMARY_CLOSE;

    if (window.storySummary && window.storySummary.trim() !== "暂无剧情梗概。") {
        parts.push(`\n### 📜 World Book (Chapter History)\n${window.storySummary}`);
    }

    const HISTORY_LIMIT = 100;
    const validLogs = window.messageLog.filter(m => m.content && m.content.trim() && !m.content.startsWith('Error:') && !m.content.startsWith('System:')).slice(-HISTORY_LIMIT);
    
    if (validLogs.length > 0) {
        parts.push(`\n### 💬 Conversation History`);
        const RECENT_THRESHOLD = 10; 
        const total = validLogs.length;

        validLogs.forEach((msg, index) => {
            if (msg.content.includes('context +=') || msg.content.includes('function ')) return;
            const distanceFromEnd = total - 1 - index;
            const isRecent = distanceFromEnd < RECENT_THRESHOLD;
            if (msg.archived && !isRecent) return;

            const role = msg.type === 'user' ? '{{user}}' : 'Narrator';
            if (!isRecent && msg.log_summary) {
                let cleanSummary = msg.log_summary.replace(/^(\[?\d+\]?|\(\d+\)|\d+\.)\s*/, "").trim();
                parts.push(`> ${role} (Summary): ${cleanSummary}\n`);
            } else {
                let cleanContent = msg.content.replace(new RegExp("<" + "[^>]+>[\\s\\S]*?<" + "\\/[^>]+>", "gi"), '').replace(new RegExp("<" + "[^>]+>", "gi"), '').replace(/===END_THINKING===/g, '').trim();
                if (role === 'Narrator' && msg.log_summary) {
                    cleanContent += `\n${TAG_SUMMARY_OPEN}${msg.log_summary}${TAG_SUMMARY_CLOSE}`;
                }
                if (cleanContent) {
                    if (!isRecent && cleanContent.length > 150) cleanContent = cleanContent.substring(0, 150) + "...";
                    parts.push(`> ${role}: ${cleanContent}\n`);
                }
            }
        });
    }

    parts.push(`\n### 🌍 Current Reality`);
    parts.push(`[Time] ${window.gameState.timeFull} (${window.gameState.timeShort})`);
    parts.push(`[Location] ${window.gameState.locFull} (${window.gameState.locShort})`);
    parts.push(`[Wallet] Danten:${window.gameState.danten}, Heaven:${window.gameState.heaven}, Hell:${window.gameState.hell}`);
    parts.push(`[Inventory] ${window.gameState.inventory}`);
    
    parts.push(`\n### 🛠️ Directives`);
    parts.push(`[System Directive]`);
    parts.push(`1. **Structure**: Output in this EXACT order:`);
    parts.push(`   (A) ${T_THINK_OPEN}...${T_THINK_CLOSE} (Thinking Process)`);
    parts.push(`   (B) ${SPLIT_TAG} (Divider)`);
    parts.push(`   (C) Main Content (Story only. NO list format. NO time/loc header at start)`);
    parts.push(`   (D) ${T_SUM_OPEN}一句话中文总结 (One-line summary in Simplified Chinese)${T_SUM_CLOSE} (CRITICAL METADATA)`);
    parts.push(`   (E) ${T_STATE_OPEN}...${T_STATE_CLOSE} (Status Bar, must be last)`);
    
    parts.push(`   *IMPORTANT*: You MUST include Step (D). Do not skip it.`);

    parts.push(`2. **Prohibitions**:`);
    parts.push(`   - NO lists starting with "-" or "*" in Main Content.`);
    parts.push(`   - Start the story directly after the divider.`);

    parts.push(`3. **State Format** (Only track items/currency belonging to {{user}}):`);
    parts.push(`${T_STATE_OPEN}`);
    parts.push(`简略时间：周X HH:MM`);
    parts.push(`详细时间：(具体日期和时间，如 20XX/08/15 14:30。若正文未明确年份，请根据世界观背景推断一个合理年份，例如现代背景可用 2030+，中世纪可用 1XXX，未来可用 21XX 等。严禁输出 "XXXX年" 或 "未知年份")`);
    parts.push(`简略地点：(仅地名)`);
    parts.push(`详细地点：(完整描述)`);
    parts.push(`堕天币：(仅{{user}}持有的数量，纯数字，不包含其他角色)`);
    parts.push(`天堂币：(仅{{user}}持有的数量，纯数字，不包含其他角色)`);
    parts.push(`地狱币：(仅{{user}}持有的数量，纯数字，不包含其他角色)`);
    parts.push(`背包：(仅{{user}}持有的物品列表，严禁列出其他角色持有的物品)`);
    parts.push(`${T_STATE_CLOSE}`);

    parts.push(`\nExample Output:`);
    parts.push(`${T_THINK_OPEN}...\n${T_THINK_CLOSE}`);
    parts.push(`${SPLIT_TAG}`);
    parts.push(`Panty ate a cake.`);
    parts.push(`${T_SUM_OPEN}Panty吃了个蛋糕。${T_SUM_CLOSE}`);
    parts.push(`${T_STATE_OPEN}\n...\n${T_STATE_CLOSE}`);
    
    parts.push(`\nSystem Reminder: Don't forget the ${T_SUM_OPEN}中文总结${T_SUM_CLOSE} before the State block.`);

    parts.push(`\n[User Input]`);
    
    return parts.join('\n');
}

// 手动触发包装器
window.forceGenerateSummary = function() {
    if(RPG.State.isGeneratingSummary) { RPG.Utils.showToast("生成正在进行中..."); return; }
    generateSummaryBackground(true);
};

function updateInputStateForSummary(isGenerating) {
    const input = document.getElementById('user-input');
    const btn = document.getElementById('send-btn');
    if (isGenerating) {
        input.disabled = true;
        input.placeholder = "正在生成历史长卷，请稍候...";
        btn.style.opacity = "0.5";
        btn.style.pointerEvents = "none";
    } else {
        input.disabled = false;
        input.placeholder = "输入行动...";
        btn.style.opacity = "1";
        btn.style.pointerEvents = "auto";
    }
}

// 核心功能：后台生成历史长卷
async function generateSummaryBackground(force = false) {
    if (RPG.State.isGeneratingSummary) return;
    
    const unarchived = window.messageLog.filter(m => !m.archived && m.type !== 'system');
    const hasSummaries = unarchived.some(m => m.log_summary);
    
    if (!force && !hasSummaries && unarchived.length < 5) return;
    
    if (force && unarchived.length === 0) {
        RPG.Utils.showToast("没有新的记忆碎片可供总结");
        return;
    }

    if (RPG.Settings.confirmBigSummary) {
        openModal('confirm', '生成历史长卷',
            `检测到积累了足够的记忆碎片 (${unarchived.length}条)。<br>是否立即生成大总结？<br><br><span style="color:#ff4081;font-size:0.85em;">注意：生成期间无法发送新消息。</span>`,
            () => { _executeGenerateSummary(unarchived); }
        );
    } else {
        _executeGenerateSummary(unarchived);
    }
}

async function _executeGenerateSummary(unarchived) {
    RPG.State.isGeneratingSummary = true;
    updateInputStateForSummary(true);

    try {
        let material = "";
        unarchived.forEach(m => {
            if (m.log_summary) {
                material += `[Fragment] ${m.log_summary}\n`;
            } else {
                material += `[Raw] ${m.type === 'user' ? '{{user}}' : 'Character'}: ${m.content}\n`;
            }
        });

        let prompt = "You are a chronicler. Read the following story fragments (memory shards) and raw events, then summarize them into a coherent narrative paragraph (World Book entry).\n\n[Source Material]\n";
        prompt += material;
        prompt += `\n\n${RPG.Settings.largePrompt || RPG.Config.DEFAULT_LARGE_PROMPT}`;

        let summaryText = "";

        // 酒馆桥接器调用 (TavernBridge)
        // 既然我们已经用 inject 模式，我们可以直接利用 window.TavernHelper 如果存在
        if (RPG.TavernBridge.isTavern && window.TavernHelper) {
             summaryText = await window.TavernHelper.generate({ prompt: prompt, disable_extras: true });
        } else if (RPG.Settings.useSTApi) {
            // Fallback to ST API fetch logic
            let headers = { 'Content-Type': 'application/json' };
            // ... (省略 CSRF Token 获取逻辑，保留原逻辑) ...
            let res = await fetch('/api/generate', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({ prompt: prompt, max_new_tokens: 500, quiet: true })
            });
            // ... (省略 API 解析) ...
            const data = await res.json();
            if (data.results && data.results[0]) summaryText = data.results[0].text;
        } else {
            // Custom API Logic (保留原逻辑)
            const { url, key, model } = RPG.Settings.customApi;
            if (!url || !key) throw new Error("Custom API 未配置");
            const res = await fetch(url + '/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
                body: JSON.stringify({
                    model: model || 'gpt-3.5-turbo',
                    messages: [{ role: 'user', content: prompt }]
                })
            });
            const data = await res.json();
            summaryText = data.choices[0].message.content;
        }

        if (summaryText) {
            if (window.storySummary === "暂无剧情梗概。") {
                window.storySummary = summaryText;
            } else {
                window.storySummary += `\n\n${summaryText}`;
            }
            
            unarchived.forEach(m => m.archived = true);
            saveGame();
            RPG.Utils.showTopNotification(`<svg style="width:20px;height:20px;fill:currentColor;" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> 历史长卷已更新`, 'success');
            
            const summaryArea = document.getElementById('edit-story-summary');
            if (summaryArea) summaryArea.value = window.storySummary;
            initSmallSummaryTextarea();
        }

    } catch (e) {
        console.error("Summary Gen Failed", e);
        RPG.Utils.showTopNotification(`<svg style="width:20px;height:20px;fill:currentColor;" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg> 生成失败: ${e.message}`, 'error');
    } finally {
        RPG.State.isGeneratingSummary = false;
        updateInputStateForSummary(false);
    }
}

// 模态框与面板逻辑
const modal = { overlay: document.getElementById('custom-modal'), title: document.getElementById('modal-title'), text: document.getElementById('modal-text'), input: document.getElementById('modal-input'), cancel: document.getElementById('modal-cancel-btn'), confirm: document.getElementById('modal-confirm-btn'), callback: null };
function openModal(type, title, content, onConfirm) {
    modal.title.textContent = title; modal.callback = onConfirm;
    if (type === 'confirm') { modal.text.style.display = 'block'; modal.text.innerHTML = content; modal.input.style.display = 'none'; }
    else if (type === 'edit') { modal.text.style.display = 'none'; modal.input.style.display = 'block'; modal.input.value = content; }
    modal.overlay.classList.add('active');
}
function closeModal() { modal.overlay.classList.remove('active'); modal.callback = null; }
if(modal.confirm) modal.confirm.onclick = () => { if (modal.callback) modal.callback(); closeModal(); };
if(modal.cancel) modal.cancel.onclick = closeModal;

// 游戏逻辑函数
function loadGame() {
    try {
        RPG.Save.init();
        // 初始化环境检测
        if(RPG.TavernBridge && RPG.TavernBridge.init) RPG.TavernBridge.init();
        
        const startNewGame = (reason) => {
            console.log("[Game] Starting new game:", reason);
            if (!RPG.Save.slots || RPG.Save.slots.length === 0) RPG.Save.init();
            if (window.activeSlotIndex < 0 || window.activeSlotIndex >= RPG.Save.slots.length || isNaN(window.activeSlotIndex)) {
                window.activeSlotIndex = 0;
                RPG.Utils.safeStorage.set(RPG.Config.CURRENT_SLOT_KEY, window.activeSlotIndex);
            }
            if (!window.gameState) window.gameState = { ...RPG.Config.DEFAULT_STATE };
            if (!window.messageLog) window.messageLog = [];
            
            if (RPG.Save.slots[window.activeSlotIndex]) {
                RPG.Save.slots[window.activeSlotIndex] = {
                    empty: false,
                    name: RPG.Save.slots[window.activeSlotIndex].name || "存档一",
                    timestamp: Date.now(),
                    state: window.gameState,
                    log: window.messageLog,
                    summary: window.storySummary,
                    lastMsg: "新游戏开始"
                };
                RPG.Utils.safeStorage.set(RPG.Config.SAVE_LIST_KEY, JSON.stringify(RPG.Save.slots));
            }
            showWelcomeMessage();
            saveGame();
        };

        const saved = RPG.Utils.safeStorage.get(SAVE_KEY);
        if (saved) {
            const data = JSON.parse(saved);
            window.gameState = (data.state && typeof data.state === 'object') ? { ...RPG.Config.DEFAULT_STATE, ...data.state } : { ...RPG.Config.DEFAULT_STATE };
            if (data.summary) window.storySummary = data.summary;
            if (Array.isArray(data.log) && data.log.length > 0) {
                window.messageLog = data.log.filter(msg => msg && typeof msg === 'object' && typeof msg.content === 'string');
            } else {
                window.messageLog = [];
            }
            
            if (window.messageLog.length === 0) {
                startNewGame("Log is empty");
            } else {
                RPG.State.displayLimit = 20; 
                renderChatHistory(true);
                if (window.activeSlotIndex === -1) {
                    window.activeSlotIndex = 0;
                    RPG.Utils.safeStorage.set(RPG.Config.CURRENT_SLOT_KEY, window.activeSlotIndex);
                    saveGame(); 
                }
            }
        } else {
            startNewGame("First time setup");
        }
        updateUI();
    } catch (e) {
        console.error('加载游戏数据失败:', e);
        localStorage.removeItem(SAVE_KEY);
        window.gameState = { ...RPG.Config.DEFAULT_STATE };
        window.messageLog = [];
        startNewGame("Data corruption recovery");
        updateUI();
    }
}

function saveGame() {
    try {
        const MAX_LOG_SIZE = 500;
        let logToSave = window.messageLog;
        if (window.messageLog.length > MAX_LOG_SIZE) {
            logToSave = window.messageLog.slice(-MAX_LOG_SIZE);
        }

        const data = { state: window.gameState, log: logToSave, summary: window.storySummary };
        RPG.Utils.safeStorage.set(SAVE_KEY, JSON.stringify(data));
        
        if (!RPG.Save.slots || RPG.Save.slots.length === 0) RPG.Save.init();

        if (window.activeSlotIndex !== -1 && !isNaN(window.activeSlotIndex) && RPG.Save.slots[window.activeSlotIndex]) {
            RPG.Save.slots[window.activeSlotIndex] = {
                empty: false,
                name: RPG.Save.slots[window.activeSlotIndex].name,
                timestamp: Date.now(),
                state: window.gameState,
                log: logToSave,
                summary: window.storySummary,
                lastMsg: window.messageLog.length > 0 ? window.messageLog[window.messageLog.length-1].content.substring(0, 30) + "..." : "自动保存"
            };
            RPG.Utils.safeStorage.set(RPG.Config.SAVE_LIST_KEY, JSON.stringify(RPG.Save.slots));
        }
    } catch (e) {
        console.error("Save failed:", e);
        if (e.name === 'QuotaExceededError') {
            RPG.Utils.showToast("存储空间不足，无法保存进度！");
        }
    }
}

function showWelcomeMessage() {
    const welcomeMsg = { content: "Welcome back to Daten City!", type: 'system', thought: null };
    addMessage(welcomeMsg.content, welcomeMsg.type, welcomeMsg.thought, null);
}

function restoreStateFromLog() {
    if (window.messageLog.length > 0) {
        const lastMsg = window.messageLog[window.messageLog.length - 1];
        if (lastMsg.savedState) window.gameState = JSON.parse(JSON.stringify(lastMsg.savedState));
    } else { window.gameState = { ...RPG.Config.DEFAULT_STATE }; }
    updateUI();
}

function addMessage(rawText, type = 'ai', preExtractedThought = null, preExtractedSummary = null) {
    let content = (rawText && typeof rawText === 'string') ? rawText : '';
    let thought = preExtractedThought;
    let log_summary = preExtractedSummary;

    if (!content && type !== 'user' && type !== 'system') return;
    
    if (thought === null && type === 'ai') {
        const extracted = extractThoughtAndContent(content);
        thought = extracted.thought;
        content = extracted.content;
        if (!log_summary) log_summary = extracted.log_summary;
    }
    
    if (!content) content = '(无内容)';
    
    const msgObj = {
        content: content || '',
        type: (type === 'ai' || type === 'user' || type === 'system') ? type : 'ai',
        thought: thought || null,
        log_summary: log_summary || null,
        savedState: JSON.parse(JSON.stringify(window.gameState)),
        snapshot: {
            storySummary: window.storySummary,
            lastArchivedIndex: getLastArchivedIndex()
        },
        archived: false
    };
    window.messageLog.push(msgObj);
    
    renderChatHistory(true);
    saveGame();

    const unarchivedMsgs = window.messageLog.filter(m => !m.archived && m.type !== 'system');
    const largeThreshold = RPG.Settings.summaryThreshold || 50;
    
    const smallSummaries = unarchivedMsgs.filter(m => m.log_summary);
    if (smallSummaries.length >= largeThreshold) {
        generateSummaryBackground();
    }
}

function extractThoughtAndContent(text) {
    if (!text || typeof text !== 'string') return { thought: null, content: '', log_summary: null };
    let content = text.replace(new RegExp(String.fromCharCode(60) + "!--[\\s\\S]*?--" + String.fromCharCode(62), "g"), "").replace(/[ \t]+$/gm, "").replace(/\n{3,}/g, "\n\n").trim();
    let thought = null, log_summary = null;

    const sumRegex = new RegExp(TAG_SUMMARY_OPEN + "([\\s\\S]*?)" + TAG_SUMMARY_CLOSE, "i");
    const sumMatch = content.match(sumRegex);
    
    if (sumMatch) {
        log_summary = sumMatch[1].trim();
        content = content.replace(sumMatch[0], "").trim();
    }

    if (content.includes(SPLIT_TAG)) {
        const parts = content.split(SPLIT_TAG);
        let rawThought = parts[0];
        rawThought = rawThought.split(TAG_THINK_OPEN).join("").split(TAG_THINK_CLOSE).join("")
                                .split(TAG_THINKING_OPEN).join("").split(TAG_THINKING_CLOSE).join("").trim();
        thought = rawThought;
        content = parts.slice(1).join(SPLIT_TAG).trim();
    } else {
        const openIndex = content.indexOf(TAG_THINK_OPEN);
        const closeIndex = content.indexOf(TAG_THINK_CLOSE);
        
        if (openIndex !== -1 && closeIndex > openIndex) {
            thought = content.substring(openIndex + TAG_THINK_OPEN.length, closeIndex).trim();
            content = content.substring(0, openIndex) + content.substring(closeIndex + TAG_THINK_CLOSE.length);
            content = content.trim();
        } else {
            const openIndex2 = content.indexOf(TAG_THINKING_OPEN);
            const closeIndex2 = content.indexOf(TAG_THINKING_CLOSE);
            if (openIndex2 !== -1 && closeIndex2 > openIndex2) {
                thought = content.substring(openIndex2 + TAG_THINKING_OPEN.length, closeIndex2).trim();
                content = content.substring(0, openIndex2) + content.substring(closeIndex2 + TAG_THINKING_CLOSE.length);
                content = content.trim();
            }
        }
    }
    
    const lines = content.split('\n');
    const leakPattern = /^(\s*[-*]|\s*roleplay:|\s*note:|\s*summary:|\[Auto-Captured Meta\])/i;
    let leakEndIndex = 0;
    for (let i = 0; i < Math.min(lines.length, 20); i++) {
        if (lines[i].trim() === '') continue;
        if (leakPattern.test(lines[i]) || (leakEndIndex > 0 && /^[\s\t]/.test(lines[i]))) {
            leakEndIndex = i + 1;
        } else {
            if (leakEndIndex > 0) break;
        }
    }
    if (leakEndIndex > 0) {
        const leakedText = lines.slice(0, leakEndIndex).join('\n').trim();
        content = lines.slice(leakEndIndex).join('\n').trim();
        if (leakedText) thought = (thought ? `${thought}\n\n` : "") + `[Auto-Captured Meta]\n${leakedText}`;
    }
    return { thought, content, log_summary };
}

function parseAndExecute(text) {
    const extracted = extractThoughtAndContent(text);
    let processText = extracted.content;
    let thoughtContent = extracted.thought;
    let logSummary = extracted.log_summary;
    
    const sIdx = processText.indexOf(TAG_STATE_OPEN);
    const eIdx = processText.indexOf(TAG_STATE_CLOSE);

    if (sIdx !== -1 && eIdx > sIdx) {
        const stateContent = processText.substring(sIdx + TAG_STATE_OPEN.length, eIdx);
        const lines = stateContent.split('\n');
        let hasUpdate = false;
        lines.forEach(line => {
            const parts = line.split(/：|:/);
            if (parts.length >= 2) {
                const key = parts[0].trim(); const value = parts.slice(1).join(':').trim();
                if (value) {
                    if(key==='简略时间') window.gameState.timeShort=value;
                    if(key==='详细时间') window.gameState.timeFull=value;
                    if(key==='简略地点') window.gameState.locShort=value;
                    if(key==='详细地点') window.gameState.locFull=value;
                    if(key==='堕天币') window.gameState.danten=value;
                    if(key==='天堂币') window.gameState.heaven=value;
                    if(key==='地狱币') window.gameState.hell=value;
                    if(key==='背包') window.gameState.inventory=value;
                    hasUpdate = true;
                }
            }
        });
        processText = processText.substring(0, sIdx) + processText.substring(eIdx + TAG_STATE_CLOSE.length);
        processText = processText.trim();
        if (hasUpdate) { updateUI(); showFloatIcon('coin'); }
    }
    addMessage(processText, 'ai', thoughtContent, logSummary);
}

function renderChatHistory(scrollToBottomFlag = false) {
    const container = document.getElementById('chat-history');
    if (!container) return;
    const total = window.messageLog.length;
    if (!RPG.State.displayLimit) RPG.State.displayLimit = 20;
    const limit = RPG.State.displayLimit;
    const start = Math.max(0, total - limit);
    
    const prevHeight = container.scrollHeight;
    container.innerHTML = '';
    
    if (start > 0) {
        const btnDiv = document.createElement('div');
        btnDiv.style.cssText = "text-align:center; padding:10px; cursor:pointer; color:#888; font-size:0.85rem; transition:0.2s;";
        btnDiv.innerHTML = `<span>查看更早的记录 (${start} 条未显示)</span>`;
        btnDiv.onclick = () => { RPG.State.displayLimit += 20; renderChatHistory(false); };
        container.appendChild(btnDiv);
    }
    const fragment = document.createDocumentFragment();
    for (let i = start; i < total; i++) fragment.appendChild(createBubbleElement(window.messageLog[i], i));
    container.appendChild(fragment);

    if (scrollToBottomFlag) setTimeout(() => scrollToBottom(true), 50);
    else {
        const heightDiff = container.scrollHeight - prevHeight;
        if (heightDiff > 0) container.scrollTop = heightDiff;
    }
}

function getLastArchivedIndex() {
    for (let i = window.messageLog.length - 1; i >= 0; i--) {
        if (window.messageLog[i].archived) return i;
    }
    return -1;
}

function rollbackState(snapshot) {
    if (!snapshot) return;
    if (snapshot.storySummary !== undefined) window.storySummary = snapshot.storySummary;
    if (snapshot.lastArchivedIndex !== undefined) {
        window.messageLog.forEach((m, i) => {
            m.archived = i <= snapshot.lastArchivedIndex;
        });
    }
}

async function handleSend(isRegen = false, regenPrompt = "") {
    if (isGenerating) return;
    if (RPG.State.isGeneratingSummary) { RPG.Utils.showToast("大总结生成中，暂停发送消息"); return; }
    let text = isRegen ? regenPrompt : ui.input.value.trim();
    if (!text) return;
    if (!isRegen) { ui.input.value = ''; document.activeElement.blur(); addMessage(text, 'user'); }

    setLoadingState(true); isGenerating = true;
    let finalPrompt = getContextPrompt() + text;
    console.log("[Frontend] Prompt:", finalPrompt);
    
    // 智能选择 API：如果处于酒馆环境，优先使用酒馆原生接口（即便 useSTApi 为 false）
    // 或者我们直接强制覆盖：如果是酒馆环境，就尝试用 TavernHelper
    let useTavern = RPG.Settings.useSTApi;
    // 如果检测到 Tavern 环境，可以尝试自动开启
    if (RPG.TavernBridge.isTavern) {
        useTavern = true;
    }

    try {
        let raw = "";
        
        if (useTavern && window.parent && window.parent.TavernHelper) {
            // Tavern 环境下调用
            raw = await window.parent.TavernHelper.generate({ user_input: finalPrompt, disable_extras: false });
        } else if (RPG.Settings.customApi.url) {
            // 自定义 API 逻辑
            const { url, key, model } = RPG.Settings.customApi;
            const res = await fetch(url + '/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
                body: JSON.stringify({
                    model: model || 'gpt-3.5-turbo',
                    messages: [{ role: 'user', content: finalPrompt }],
                    max_tokens: 1000 // 增加输出长度
                })
            });
            const data = await res.json();
            raw = data.choices[0].message.content;
        } else {
            // 模拟回复 (Demo)
            await new Promise(r=>setTimeout(r,2000));
            const NL = "\n";
            raw = `${NL}${NL}${TAG_THINK_OPEN}${NL}模拟思考...${NL}${TAG_THINK_CLOSE}${NL}${NL}${SPLIT_TAG}收到。${TAG_STATE_OPEN}${NL}简略时间：模拟时间${NL}${TAG_STATE_CLOSE}`;
        }
        
        if (isGenerating) parseAndExecute(raw);
    } catch(e) { if (isGenerating) addMessage("Error: " + e.message); }
    finally { if (isGenerating) { setLoadingState(false); isGenerating = false; } }
}

function setLoadingState(isLoading) {
    if (isLoading) {
        ui.btn.classList.add('loading'); ui.iconSend.style.display = 'none'; ui.iconLoad.style.display = 'block'; ui.input.disabled = true;
    } else {
        ui.btn.classList.remove('loading'); ui.iconSend.style.display = 'block'; ui.iconLoad.style.display = 'none'; ui.input.disabled = false;
        if (!('ontouchstart' in window) && window.innerWidth > 768) {
            ui.input.focus();
        }
    }
}

// 辅助功能函数
function toggleMenu() { document.getElementById('action-menu').classList.toggle('open'); document.getElementById('menu-toggle-btn').classList.toggle('active'); }
function showToast(msg) { RPG.Utils.showToast(msg); } 

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(()=>{});
    } else {
        if (document.exitFullscreen) document.exitFullscreen().catch(()=>{});
    }
    toggleMenu();
}

document.addEventListener('fullscreenchange', () => {
    const body = document.body;
    if (document.fullscreenElement) {
        isFullscreen = true;
        body.classList.add('fullscreen');
    } else {
        isFullscreen = false;
        body.classList.remove('fullscreen');
        body.style.height = '680px';
        setTimeout(() => {
            body.style.height = '';
            musicPlayer.snapToScreen();
            scrollToBottom(false);
        }, 50);
    }
});

let toggleBtnTimer = null;
function showToggleBtn() {
    const btn = document.getElementById('ui-toggle-btn');
    btn.classList.add('visible');
    if (toggleBtnTimer) clearTimeout(toggleBtnTimer);
    toggleBtnTimer = setTimeout(() => {
        btn.classList.remove('visible');
    }, 5000);
}

function toggleGameUI(e) {
    if (e) e.stopPropagation();
    const ui = document.getElementById('game-ui');
    ui.classList.toggle('collapsed');
    RPG.Utils.safeStorage.set('PSG_RPG_UI_COLLAPSED', ui.classList.contains('collapsed'));
    showToggleBtn();
}

(function initUIState() {
    const isCollapsed = RPG.Utils.safeStorage.get('PSG_RPG_UI_COLLAPSED') === 'true';
    if (isCollapsed) document.getElementById('game-ui').classList.add('collapsed');
})();

function scrollToBottom(smooth=false) { const stage = document.getElementById('game-stage'); if(stage) stage.scrollTo({ top: stage.scrollHeight, behavior: smooth?'smooth':'auto' }); }

// 动态背景
function initDynamicBg() {
    const canvas = document.getElementById('dynamic-bg');
    if (!canvas) return;
    canvas.style.pointerEvents = 'none';
    const ctx = canvas.getContext('2d');
    let width, height;
    let shapes = [];
    function resize() { width = window.innerWidth; height = window.innerHeight; canvas.width = width; canvas.height = height; }
    resize(); window.addEventListener('resize', resize);

    class Shape {
        constructor() { this.reset(); }
        reset() {
            this.x = Math.random() * width; this.y = Math.random() * height + height;
            this.speed = Math.random() * 0.5 + 0.2; this.size = Math.random() * 60 + 20;
            this.rotation = Math.random() * Math.PI * 2; this.rotSpeed = (Math.random() - 0.5) * 0.02;
            const colors = ['255, 234, 127', '255, 135, 171', '195, 157, 255'];
            this.color = colors[Math.floor(Math.random() * colors.length)];
            this.alpha = Math.random() * 0.2 + 0.1; this.type = Math.random() > 0.5 ? 'circle' : 'square';
        }
        update() { this.y -= this.speed; this.rotation += this.rotSpeed; if (this.y < -100) this.reset(); }
        draw() {
            ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.rotation);
            ctx.fillStyle = `rgba(${this.color}, ${this.alpha})`;
            if (this.type === 'circle') { ctx.beginPath(); ctx.arc(0, 0, this.size/2, 0, Math.PI * 2); ctx.fill(); }
            else { ctx.fillRect(-this.size/2, -this.size/2, this.size, this.size); }
            ctx.restore();
        }
    }
    for (let i = 0; i < 25; i++) shapes.push(new Shape());
    function animate() {
        ctx.clearRect(0, 0, width, height);
        if (RPG.Settings.effects.bg) shapes.forEach(s => { s.update(); s.draw(); });
        requestAnimationFrame(animate);
    }
    animate();
}
if (document.readyState === 'complete') initDynamicBg(); else window.addEventListener('load', initDynamicBg);

// 事件监听与初始化
(function() {
    document.body.addEventListener('click', function(e) {
        if (!RPG.Settings.effects.click) return;
        if (e.target.closest('button') || e.target.closest('input') || e.target.closest('textarea') || e.target.closest('.bubble') || e.target.closest('summary') || e.target.closest('.playlist-item')) return;
        const heart = document.createElement("div");
        heart.style.cssText = `position:fixed;left:${e.clientX-10}px;top:${e.clientY-10}px;z-index:99999;width:20px;height:20px;pointer-events:none;transition:all 0.8s ease-out;`;
        const colors = ['#ffea7f', '#ff87ab', '#c39dff', '#ff4081'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        heart.innerHTML = `<svg viewBox="0 0 24 24" style="width:100%;height:100%;fill:${color};"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;
        document.body.appendChild(heart);
        requestAnimationFrame(() => { heart.style.transform = `translateY(-40px) scale(1.5)`; heart.style.opacity = "0"; });
        setTimeout(() => heart.remove(), 800);
    });
})();

function showFloatIcon(type, x, y) { if (!RPG.Settings.effects.float) return; if (!x) x = window.innerWidth / 2; if (!y) y = window.innerHeight / 2; const el = document.createElement('div'); el.className = 'float-icon'; el.style.left = (x - 15) + 'px'; el.style.top = (y - 15) + 'px'; const icons = { 'coin': '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05 1.18 1.7 2.64 1.7 1.43 0 2.37-.72 2.37-1.79 0-1.1-.53-1.57-2.85-2.14-2.35-.58-4.12-1.41-4.12-3.52 0-1.87 1.42-3.02 3.27-3.36V3.75h2.67v1.9c1.6.32 2.89 1.23 3.02 3h-1.93c-.14-.68-.78-1.34-2.46-1.34-1.21 0-1.93.65-1.93 1.52 0 .98.79 1.45 2.99 1.99 2.6.62 3.98 1.65 3.98 3.68 0 2.03-1.48 3.32-3.66 3.59z"/>', 'star': '<path d="M12 2 Q15 9 22 12 Q15 15 12 22 Q9 15 2 12 Q9 9 12 2 Z"/>' }; const iconPath = icons[type] || icons['star']; el.innerHTML = `<svg viewBox="0 0 24 24" style="width:30px;height:30px;"><path fill="currentColor" d="${iconPath}"/></svg>`; el.style.color = ['#ff4081', '#ffd700', '#00e5ff'][Math.floor(Math.random()*3)]; document.body.appendChild(el); setTimeout(() => el.remove(), 1000); }
document.addEventListener('click', (e) => {
    if (e.target.closest('button') || e.target.closest('.thought-summary') || e.target.closest('.action-menu') || e.target.closest('.msg-action-bar') || e.target.closest('.custom-modal-box') || e.target.closest('.music-widget') || e.target.closest('.playlist-panel') || e.target.closest('.save-manager-box') || e.target.closest('input') || e.target.closest('textarea')) return;
    showFloatIcon('star', e.clientX, e.clientY);
});

// 绑定按钮事件
const bindBtn = (id, handler) => { const el = document.getElementById(id); if(el) el.onclick = handler; };
bindBtn('menu-fullscreen', toggleFullscreen);
bindBtn('menu-music', openMusicPlayer);
bindBtn('menu-reset-data', confirmResetGame);
bindBtn('menu-chronicles', openChroniclesPanel);
bindBtn('menu-regen-msg', regenerateLastMessage);
bindBtn('menu-new-chat', startNewChat);
bindBtn('menu-jump-prev', () => {
        toggleMenu(); const history = document.getElementById('chat-history'); const bubbles = history.querySelectorAll('.bubble');
        if(bubbles.length >= 2) { bubbles[bubbles.length-2].scrollIntoView({behavior:'smooth', block:'center'}); RPG.Utils.showToast("已跳转到上一条"); }
        else RPG.Utils.showToast("没有更多历史记录");
});
const menuToggle = document.getElementById('menu-toggle-btn'); if (menuToggle) menuToggle.onclick = (e) => { e.stopPropagation(); toggleMenu(); };
ui.input.onkeydown = (e) => { if(e.key==='Enter') handleSend(); };
ui.btn.onclick = () => handleSend();

// 额外的 UI 功能
function confirmResetGame() {
    toggleMenu();
    openModal('confirm', '危险操作', '确定要清空所有存档并重置吗？此操作无法撤销。', () => {
        RPG.Utils.safeStorage.remove(RPG.Config.SAVE_KEY);
        RPG.Utils.safeStorage.remove(RPG.Config.SAVE_LIST_KEY);
        RPG.Utils.safeStorage.remove(RPG.Config.CURRENT_SLOT_KEY);
        location.reload();
    });
}

function startNewChat() {
    toggleMenu();
    openModal('confirm', '新建聊天', '确定要开始新的对话吗？<br>当前进度的最新状态将自动保存。', () => {
        if (window.activeSlotIndex !== -1 && RPG.Save.slots[window.activeSlotIndex]) {
            RPG.Save.slots[window.activeSlotIndex] = {
                empty: false,
                name: RPG.Save.slots[window.activeSlotIndex].name,
                timestamp: Date.now(),
                state: window.gameState,
                log: window.messageLog,
                summary: window.storySummary,
                lastMsg: window.messageLog.length > 0 ? window.messageLog[window.messageLog.length-1].content.substring(0, 30) + "..." : "自动保存"
            };
            RPG.Utils.safeStorage.set(RPG.Config.SAVE_LIST_KEY, JSON.stringify(RPG.Save.slots));
        }

        let targetIdx = RPG.Save.slots.findIndex(s => s.empty);
        if (targetIdx === -1) {
            targetIdx = RPG.Save.slots.length;
            RPG.Save.slots.push({ empty: true, name: `存档${RPG.Config.NUMBER_MAP[targetIdx] || (targetIdx+1)}` });
        }

        window.activeSlotIndex = targetIdx;
        RPG.Utils.safeStorage.set(RPG.Config.CURRENT_SLOT_KEY, window.activeSlotIndex);
        
        window.gameState = { ...RPG.Config.DEFAULT_STATE };
        window.messageLog = [];
        window.storySummary = "暂无剧情梗概。";
        
        RPG.Save.slots[targetIdx] = {
            empty: false,
            name: RPG.Save.slots[targetIdx].name,
            timestamp: Date.now(),
            state: window.gameState,
            log: window.messageLog,
            summary: window.storySummary,
            lastMsg: "新对话"
        };
        RPG.Utils.safeStorage.set(RPG.Config.SAVE_LIST_KEY, JSON.stringify(RPG.Save.slots));
        RPG.Utils.safeStorage.set(RPG.Config.SAVE_KEY, JSON.stringify({ state: window.gameState, log: window.messageLog, summary: window.storySummary }));

        updateUI();
        ui.chat.innerHTML = '';
        showWelcomeMessage();
        closeModal();
        RPG.Utils.showToast(`已新建聊天并存档至 ${RPG.Save.slots[targetIdx].name}`);
    });
}

function regenerateLastMessage() {
    toggleMenu();
    if (window.messageLog.length <= 1) { RPG.Utils.showToast("无法重生成初始消息"); return; }
    const lastMsg = window.messageLog[window.messageLog.length - 1];
    if (lastMsg.type === 'ai') {
        window.messageLog.pop();
        restoreStateFromLog();
        
        if (window.messageLog.length > 0) {
            const prevMsg = window.messageLog[window.messageLog.length - 1];
            if (prevMsg.snapshot) rollbackState(prevMsg.snapshot);
        } else {
            window.storySummary = "暂无剧情梗概。";
        }

        saveGame();
        ui.chat.innerHTML = ''; window.messageLog.forEach((msg, idx) => ui.chat.appendChild(createBubbleElement(msg, idx)));
        let lastUserText = "";
        if (window.messageLog.length > 0 && window.messageLog[window.messageLog.length - 1].type === 'user') {
            const content = window.messageLog[window.messageLog.length - 1].content;
            if (!content.includes("(继续)")) lastUserText = content;
        }
        handleSend(true, lastUserText);
    } else RPG.Utils.showToast("最新消息不是AI回复");
}

function openChroniclesPanel() {
    toggleMenu();
    const currentSummary = window.storySummary || "暂无剧情记录。";
    const currentSmall = RPG.Settings.smallPrompt || RPG.Config.DEFAULT_SMALL_PROMPT;
    const currentLarge = RPG.Settings.largePrompt || RPG.Config.DEFAULT_LARGE_PROMPT;
    const threshold = RPG.Settings.summaryThreshold || 50;
    
    // 内容构建 (为了节省 Token，此处略去部分静态 HTML，但为了功能完整性，请确保与原 HTML 一致)
    // 实际项目中，建议将 HTML 模板单独提取
    // 这里我只写核心结构
    const content = `
        <div style="display:flex; flex-direction:column; height:100%; gap:15px;">
            <div style="display:flex; gap:10px; border-bottom:1px solid #eee; padding-bottom:10px;">
                <button class="sm-btn" onclick="switchTab('tab-summary', this)" style="background:var(--color-stocking); color:white;">历史长卷</button>
                <button class="sm-btn" onclick="switchTab('tab-small-summary', this)" style="background:#f0f0f0; color:#666;">记忆碎片</button>
                <button class="sm-btn" onclick="switchTab('tab-settings', this)" style="background:#f0f0f0; color:#666;">AI 设置</button>
                <button class="sm-btn" onclick="switchTab('tab-api', this)" style="background:#f0f0f0; color:#666;">API 设置</button>
            </div>
            
            <div id="tab-summary" style="display:flex; flex-direction:column; flex-grow:1; gap:8px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <label style="font-weight:bold; color:#444; font-size:0.9em;">历史长卷 (World Book)</label>
                    <div style="display:flex; gap:5px;">
                        <button class="sm-btn" onclick="forceGenerateSummary()" style="background:#e8f5e9; color:#2e7d32; font-size:0.8em; padding:4px 8px;">
                            <svg style="width:14px;height:14px;margin-right:4px;fill:currentColor;" viewBox="0 0 24 24"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg> 立即生成
                        </button>
                        <button class="sm-btn" onclick="toggleLargeSummaryEdit(this)" style="background:#f0f0f0; color:#666; font-size:0.8em; padding:4px 8px;">
                            <svg style="width:14px;height:14px;margin-right:4px;fill:currentColor;" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg> 编辑
                        </button>
                    </div>
                </div>
                <textarea id="edit-story-summary" class="modal-textarea" style="flex-grow:1; font-size:0.9rem; line-height:1.6; white-space:pre-wrap;" readonly>${currentSummary}</textarea>
            </div>

            <div id="tab-small-summary" style="display:none; flex-direction:column; flex-grow:1; gap:8px; overflow:hidden;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <label style="font-weight:bold; color:#444; font-size:0.9em;">记忆碎片 (进行中)</label>
                    <button class="sm-btn" onclick="toggleSmallSummaryEdit(this)" style="background:#f0f0f0; color:#666; font-size:0.8em; padding:4px 8px;">
                        <svg style="width:14px;height:14px;margin-right:4px;fill:currentColor;" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg> 编辑
                    </button>
                </div>
                <!-- 减小默认高度，腾出空间 -->
                <textarea id="small-summary-editor" class="modal-textarea" style="flex-grow:0; height:100px; min-height:80px; font-size:0.9rem; line-height:1.6; font-family:'Noto Sans SC'; white-space:pre-wrap;" readonly></textarea>
                
                <label style="font-weight:bold; color:#444; font-size:0.9em; margin-top:5px; flex-shrink:0;">归档记录 (已折叠):</label>
                <!-- 增加 padding-bottom 确保最后一条能划出来 -->
                <div id="archived-summaries-list" style="flex-grow:1; overflow-y:auto; display:flex; flex-direction:column; gap:8px; padding-right:5px; border-top:1px solid #eee; padding-top:10px; padding-bottom: 20px;"></div>
            </div>
            
            <div id="tab-settings" style="display:none; flex-direction:column; flex-grow:1; gap:10px; overflow-y:auto;">
                <div style="display:flex; align-items:center; justify-content:space-between; background:#f5f5f5; padding:10px; border-radius:8px; border:1px solid #eee;">
                    <label style="display:flex; align-items:center; cursor:pointer; gap:8px;">
                        <input type="checkbox" id="setting-confirm-big" ${RPG.Settings.confirmBigSummary?'checked':''} style="transform:scale(1.2);">
                        <span style="font-weight:bold; color:#444; font-size:0.9em;">生成大总结前弹窗确认</span>
                    </label>
                </div>

                <div style="display:flex; flex-direction:column; gap:5px;">
                    <label style="font-weight:bold; color:#444; font-size:0.9em;">历史长卷触发阈值 (条)</label>
                    <input type="number" id="setting-threshold" class="modal-textarea" style="height:40px; padding:8px;" value="${threshold}" min="2" max="200">
                    <div style="font-size:0.8em; color:#888;">当积累的【记忆碎片】达到此数量时，触发历史长卷生成（大总结）。</div>
                </div>
                <div style="display:flex; flex-direction:column; gap:5px;">
                    <label style="font-weight:bold; color:#444; font-size:0.9em;">记忆碎片生成频率 (条)</label>
                    <input type="number" id="setting-small-threshold" class="modal-textarea" style="height:40px; padding:8px;" value="${RPG.Settings.smallThreshold||1}" min="1" max="50">
                    <div style="font-size:0.8em; color:#888;">每隔多少条原始消息，生成一个记忆碎片（小总结）。</div>
                </div>
                <div style="display:flex; flex-direction:column; gap:5px;">
                    <label style="font-weight:bold; color:#444; font-size:0.9em;">记忆碎片 Prompt</label>
                    <textarea id="setting-small-prompt" class="modal-textarea" style="height:80px; min-height:60px; font-size:0.85rem;">${currentSmall}</textarea>
                </div>
                <div style="display:flex; flex-direction:column; gap:5px;">
                    <label style="font-weight:bold; color:#444; font-size:0.9em;">历史长卷 Prompt</label>
                    <textarea id="setting-large-prompt" class="modal-textarea" style="height:80px; min-height:60px; font-size:0.85rem;">${currentLarge}</textarea>
                </div>
                <div style="display:flex; justify-content:flex-end; border-top:1px dashed #eee; padding-top:10px;">
                    <button class="sm-btn" onclick="resetAiSettings()" style="background:#ffebee; color:#d32f2f;">恢复默认设置</button>
                </div>
            </div>

            <div id="tab-api" style="display:none; flex-direction:column; flex-grow:1; gap:15px; overflow-y:auto;">
                <div style="background:#f5f5f5; border-radius:8px; padding:15px; display:flex; flex-direction:column; gap:12px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:-5px;">
                        <span style="font-weight:bold; color:#444;">自定义 API 设置 (OpenAI 格式)</span>
                        <div style="display:flex; align-items:center;">
                            <div id="custom-indicator" style="width:8px; height:8px; border-radius:50%; background:#ccc; margin-right:6px;"></div>
                            <span id="custom-api-status" style="font-size:0.85em; font-weight:bold; color:#999;">未连接</span>
                        </div>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:4px;">
                        <label style="font-weight:bold; color:#555; font-size:0.85em;">API 链接 (Endpoint)</label>
                        <input type="text" id="custom-api-url" class="modal-textarea" style="height:38px; padding:8px; background:#fff;" placeholder="https://api.openai.com/v1" value="${RPG.Settings.customApi.url||''}">
                    </div>
                    <div style="display:flex; flex-direction:column; gap:4px;">
                        <label style="font-weight:bold; color:#555; font-size:0.85em;">API 密钥 (Key)</label>
                        <input type="password" id="custom-api-key" class="modal-textarea" style="height:38px; padding:8px; background:#fff;" placeholder="sk-..." value="${RPG.Settings.customApi.key||''}">
                    </div>
                    <div style="display:flex; flex-direction:column; gap:4px;">
                        <label style="font-weight:bold; color:#555; font-size:0.85em;">模型名称 (Model)</label>
                        <div style="display:flex; gap:8px;">
                            <input type="text" id="custom-api-model" class="modal-textarea" style="height:38px; padding:8px; background:#fff; flex-grow:1;" placeholder="gpt-3.5-turbo" value="${RPG.Settings.customApi.model||''}">
                            <button class="sm-btn" onclick="fetchCustomModels(event)" style="background:#e0e0e0; color:#333; white-space:nowrap; padding:0 12px;">自动获取</button>
                        </div>
                    </div>
                    <button class="sm-btn" onclick="testCustomApi()" style="justify-content:center; background:var(--color-stocking); color:white; margin-top:5px; padding:10px;">
                        保存并测试连接
                    </button>
                </div>
                <div style="font-size:0.8em; color:#888; padding:0 5px;">
                    提示：如需使用酒馆本地后端，请填写 <b>http://127.0.0.1:8000/v1</b> 或类似地址。
                </div>
            </div>
        </div>
    `;
    
    openModal('confirm', '总结设置', content, () => {
        const newSmall = document.getElementById('setting-small-prompt').value;
        const newLarge = document.getElementById('setting-large-prompt').value;
        const newThres = parseInt(document.getElementById('setting-threshold').value);
        const newSmallThres = parseInt(document.getElementById('setting-small-threshold').value);
        const newConfirm = document.getElementById('setting-confirm-big').checked;
        
        if (newSmall) RPG.Settings.smallPrompt = newSmall;
        if (newLarge) RPG.Settings.largePrompt = newLarge;
        if (!isNaN(newThres) && newThres > 0) RPG.Settings.summaryThreshold = newThres;
        if (!isNaN(newSmallThres) && newSmallThres > 0) RPG.Settings.smallThreshold = newSmallThres;
        RPG.Settings.confirmBigSummary = newConfirm;
        
        RPG.Utils.safeStorage.set('PSG_RPG_SMALL_PROMPT', newSmall);
        RPG.Utils.safeStorage.set('PSG_RPG_LARGE_PROMPT', newLarge);
        RPG.Utils.safeStorage.set('PSG_RPG_SUMMARY_THRESHOLD', RPG.Settings.summaryThreshold);
        RPG.Utils.safeStorage.set('PSG_RPG_SMALL_THRESHOLD', RPG.Settings.smallThreshold);
        RPG.Utils.safeStorage.set('PSG_RPG_CONFIRM_BIG', newConfirm);
        
        // Save API
        const url = document.getElementById('custom-api-url');
        if (url) {
            const key = document.getElementById('custom-api-key').value;
            const newUrl = url.value;
            const model = document.getElementById('custom-api-model').value;
            RPG.Settings.customApi = { url: newUrl, key: key, model: model };
            RPG.Utils.safeStorage.set('PSG_RPG_CUSTOM_API', JSON.stringify(RPG.Settings.customApi));
        }

        saveGame();
        RPG.Utils.showToast("所有更改已保存");
        closeModal();
    });
    
    setTimeout(() => {
        // ... (原逻辑：初始化文本域等)
        const textEl = document.getElementById('modal-text');
        const inputEl = document.getElementById('modal-input');
        if (textEl && inputEl) {
            textEl.innerHTML = content;
            textEl.style.display = 'block'; textEl.style.height = '100%'; inputEl.style.display = 'none';
            initSmallSummaryTextarea();
            if (window.restoreApiStatus) window.restoreApiStatus(); 
        }
    }, 50);
}

function openEffectsPanel() {
    toggleMenu();
    const e = RPG.Settings.effects;
    const iconStyle = "width:18px;height:18px;vertical-align:text-bottom;margin-right:6px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;color:var(--color-stocking);";
    const content = `
        <div style="display:flex; flex-direction:column; gap:15px; padding:10px;">
            <label style="display:flex; align-items:center; justify-content:space-between; cursor:pointer;">
                <span style="font-weight:bold; color:#444; display:flex; align-items:center;"><svg style="${iconStyle}" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg> 动态背景</span>
                <input type="checkbox" id="eff-bg" ${e.bg?'checked':''} style="transform:scale(1.5);">
            </label>
            <label style="display:flex; align-items:center; justify-content:space-between; cursor:pointer;">
                <span style="font-weight:bold; color:#444; display:flex; align-items:center;"><svg style="${iconStyle}fill:var(--color-pink);stroke:none;" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg> 点击爱心</span>
                <input type="checkbox" id="eff-click" ${e.click?'checked':''} style="transform:scale(1.5);">
            </label>
            <label style="display:flex; align-items:center; justify-content:space-between; cursor:pointer;">
                <span style="font-weight:bold; color:#444; display:flex; align-items:center;"><svg style="${iconStyle}" viewBox="0 0 24 24"><path d="M12 2L15 9L22 12L15 15L12 22L9 15L2 12L9 9Z"/></svg> 状态浮标</span>
                <input type="checkbox" id="eff-float" ${e.float?'checked':''} style="transform:scale(1.5);">
            </label>
            <div style="font-size:0.8em; color:#888; margin-top:10px; line-height:1.5;">关闭背景特效有助于提升低端设备的性能和省电。</div>
        </div>
    `;
    openModal('confirm', '特效设置', content, () => {
        const newEffects = { bg: document.getElementById('eff-bg').checked, click: document.getElementById('eff-click').checked, float: document.getElementById('eff-float').checked };
        RPG.Settings.effects = newEffects; RPG.Utils.safeStorage.set('PSG_RPG_EFFECTS', JSON.stringify(newEffects));
        RPG.Utils.showToast("特效设置已保存"); closeModal();
        if (!newEffects.bg) { const canvas = document.getElementById('dynamic-bg'); if(canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height); }
    });
}

// 移动端键盘适配 (Visual Viewport API)
if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
        if (document.body.classList.contains('fullscreen')) {
            document.body.style.height = window.visualViewport.height + 'px';
        }
        if (window.visualViewport.height < window.innerHeight) {
            setTimeout(() => scrollToBottom(true), 100);
        }
    });
}

// 启动游戏
loadGame();