class MusicManager {
    constructor() {
        this.baseUrl = "https://stockielchan.github.io/stocking-music/";
        this.jsonUrl = this.baseUrl + "music.json";
        this.widget = document.getElementById('musicWidget');
        this.audio = document.getElementById('bgmAudio');
        this.discWrapper = document.getElementById('discWrapper');
        this.lyricWrapper = document.getElementById('lyricWrapper');
        this.lyricList = document.getElementById('lyricList');
        this.titleEl = document.getElementById('songTitle');
        this.statusEl = document.getElementById('songStatus');
        this.progressBar = document.getElementById('progressBar');
        this.currTimeEl = document.getElementById('currTime');
        this.totalTimeEl = document.getElementById('totalTime');
        this.playPauseBtn = document.getElementById('playPauseBtn');
        this.modeBtn = document.getElementById('modeBtn');
        this.playlistPanel = document.getElementById('playlistPanel');
        
        this.floatPos = { x: 20, y: 120 };
        this.isCollapsed = false;
        this.playlist = [];
        this.currentIndex = 0;
        this.isPlaying = false;
        this.isDragging = false;
        this.showLyricsMode = false;
        this.lyrics = [];
        this.playMode = 0;
        this.isAnimating = false;
        this.enableTrans = true; // 歌词翻译开关 (默认开启)
        this.enableVis = true;    // 可视化开关
        this.audioCtx = null;
        this.analyser = null;
        this.dataArray = null;
        this.canvas = document.getElementById('visualizer');
        this.ctx = this.canvas.getContext('2d');
        this.icons = {
            play: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>',
            pause: '<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>',
            seq: '<svg viewBox="0 0 24 24"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v6z"/></svg>',
            loop: '<svg viewBox="0 0 24 24"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v6z"/><text x="12" y="15" font-size="8" text-anchor="middle" fill="currentColor" font-weight="bold">1</text></svg>',
            random: '<svg viewBox="0 0 24 24"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg>'
        };
        this.init();
        this.setupDraggable();
        this.setupVisualizer();
    }
    
    setupVisualizer() {
        // Canvas 分辨率适配
        this.canvas.width = 480;
        this.canvas.height = 480;
    }

    initAudioContext() {
        if (this.audioCtx) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioCtx = new AudioContext();
            const src = this.audioCtx.createMediaElementSource(this.audio);
            this.analyser = this.audioCtx.createAnalyser();
            this.analyser.fftSize = 128; // 降低精细度以获得更粗犷的条纹
            src.connect(this.analyser);
            this.analyser.connect(this.audioCtx.destination);
            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            this.drawVisualizer();
        } catch(e) { console.warn("Web Audio API not supported", e); }
    }

    drawVisualizer() {
        if (!this.enableVis || !this.audioCtx) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            if(this.enableVis) requestAnimationFrame(() => this.drawVisualizer());
            return;
        }
        
        requestAnimationFrame(() => this.drawVisualizer());
        this.analyser.getByteFrequencyData(this.dataArray);
        
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        ctx.clearRect(0, 0, width, height);

        if (this.showLyricsMode) {
            // === 歌词模式：使用 Player 的柱状图 (绘制在底部背景) ===
            const barWidth = (width / this.dataArray.length) * 1.5; // 加宽一点
            const gap = 2;
            let x = (width - (this.dataArray.length * (barWidth + gap))) / 2; // 居中
            if (x < 0) x = 0;

            for(let i = 0; i < this.dataArray.length; i++) {
                const value = this.dataArray[i];
                const barHeight = (value / 255) * (height * 0.4); // 占高度的 40%
                
                // 使用更柔和的颜色适配背景
                const r = 255;
                const g = 135 + (255 - value) / 2;
                const b = 171 + (255 - value) / 2;
                ctx.fillStyle = `rgba(${r},${g},${b}, 0.3)`; // 低透明度，作为背景
                
                // 从底部向上画
                ctx.fillRect(x, height - barHeight - 20, barWidth, barHeight); 
                x += barWidth + gap;
            }

        } else {
            // === 封面模式：圆形可视化 (紧贴封面边缘) ===
            const cx = width / 2;
            const cy = height / 2;
            // 核心修复：Canvas分辨率(480)是CSS尺寸(240)的2倍。
            // 封面CSS半径是70px，所以Canvas内部半径至少要 70*2 = 140px。
            // 加上边框和间隙，我们设为 150px。
            const radius = 150;
            
            const bars = this.analyser.frequencyBinCount;
            const usedBars = Math.floor(bars * 0.7);
            const step = (Math.PI * 2) / usedBars;
            
            for (let i = 0; i < usedBars; i++) {
                const val = this.dataArray[i];
                const barHeight = (val / 255) * 40; 
                
                const rad = i * step - (Math.PI / 2); 
                
                // 动态颜色
                const hue = 300 + (i / usedBars) * 60; 
                ctx.strokeStyle = `hsla(${hue}, 100%, 70%, 0.8)`;
                ctx.lineWidth = 3; // 稍微细一点
                ctx.lineCap = 'round';
                
                ctx.beginPath();
                const x1 = cx + Math.cos(rad) * radius;
                const y1 = cy + Math.sin(rad) * radius;
                const x2 = cx + Math.cos(rad) * (radius + barHeight);
                const y2 = cy + Math.sin(rad) * (radius + barHeight);
                
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }
        }
    }

    toggleVisualizer() {
        this.enableVis = !this.enableVis;
        const btn = document.getElementById('toggle-vis');
        if(btn) btn.parentElement.classList.toggle('active', this.enableVis);
        if (this.enableVis) {
            if (!this.audioCtx) this.initAudioContext();
            this.drawVisualizer(); // 核心修复：重新开启开关时，必须重启绘制循环
        }
    }

    toggleTranslation() {
        this.enableTrans = !this.enableTrans;
        const btn = document.getElementById('toggle-trans');
        if(btn) btn.parentElement.classList.toggle('active', this.enableTrans);
        // 刷新歌词显示
        const activeLine = this.lyricList.querySelector('.active');
        const currIndex = activeLine ? parseInt(activeLine.dataset.index) : 0;
        this.renderLyrics();
        // 尝试恢复位置
        setTimeout(() => {
            const lines = this.lyricList.querySelectorAll('.lyric-line[data-index]');
            if(lines[currIndex]) lines[currIndex].classList.add('active');
        }, 50);
    }

    snapToScreen() {
        if (!this.isCollapsed) return;
        const w = this.widget;
        let x = w.offsetLeft; let y = w.offsetTop;
        const maxX = window.innerWidth - w.offsetWidth;
        const maxY = window.innerHeight - w.offsetHeight;
        let newX = Math.max(0, Math.min(x, maxX));
        let newY = Math.max(0, Math.min(y, maxY));
        if (newX !== x || newY !== y) {
            w.style.transition = 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
            w.style.left = newX + 'px'; w.style.top = newY + 'px';
            this.floatPos = { x: newX, y: newY };
        }
    }
    async init() {
        try {
            const res = await fetch(this.jsonUrl); const data = await res.json();
            this.playlist = data.map(item => ({
                title: item.title, artist: item.artist || "P&S Radio",
                url: this.baseUrl + encodeURIComponent(item.file),
                cover: item.cover ? this.baseUrl + encodeURIComponent(item.cover) : null,
                lrc: item.lrc ? this.baseUrl + encodeURIComponent(item.lrc) : null
            }));
            if(this.playlist.length > 0) this.loadSong(0, false);
        } catch(e) { console.error("Music load failed", e); }
        document.getElementById('visualArea').onclick = (e) => { this.toggleLyrics(); };
        document.addEventListener('click', (e) => {
            if (this.playlistPanel.classList.contains('show')) {
                if (!this.playlistPanel.contains(e.target) && !e.target.closest('button')) { 
                    this.playlistPanel.classList.remove('show');
                }
            }
        });
        window.addEventListener('resize', () => this.snapToScreen());
        if ('mediaSession' in navigator) {
            navigator.mediaSession.setActionHandler('play', () => this.play());
            navigator.mediaSession.setActionHandler('pause', () => this.pause());
            navigator.mediaSession.setActionHandler('previoustrack', () => this.prev());
            navigator.mediaSession.setActionHandler('nexttrack', () => this.next());
        }
        this.audio.onended = () => this.next(true);
        this.audio.ontimeupdate = () => {
            if(this.isDragging) return;
            const curr = this.audio.currentTime; const total = this.audio.duration;
            this.syncLyrics(curr);
            if(total) {
                this.progressBar.value = (curr/total)*100;
                this.currTimeEl.textContent = this.formatTime(curr);
                this.totalTimeEl.textContent = this.formatTime(total);
            }
        };
        this.progressBar.oninput = () => { this.isDragging = true; };
        this.progressBar.onchange = (e) => {
            this.isDragging = false;
            this.audio.currentTime = (e.target.value/100) * this.audio.duration;
            if(!this.isPlaying) this.play();
        };
    }
    loadSong(index, autoPlay=true) {
        if(!this.playlist[index]) return;
        this.currentIndex = index; const song = this.playlist[index];
        this.audio.src = song.url;
        this.titleEl.textContent = song.title; this.statusEl.textContent = song.artist;
        if(song.cover) this.discWrapper.style.backgroundImage = `url('${song.cover}')`;
        else this.discWrapper.style.backgroundImage = 'none';
        this.loadLyrics(song.lrc); this.updateMediaSession(); this.highlightPlaylist();
        this.playlistPanel.classList.remove('show');
        if(autoPlay) this.play();
    }
    updateMediaSession() {
        if ('mediaSession' in navigator) {
            const song = this.playlist[this.currentIndex];
            navigator.mediaSession.metadata = new MediaMetadata({
                title: song.title, artist: song.artist,
                artwork: [{ src: song.cover || this.baseUrl + "musicmenu.jpg", sizes: '512x512', type: 'image/jpeg' }]
            });
        }
    }
    async loadLyrics(lrcUrl) {
        this.lyrics = []; this.hasLyrics = false;
        this.lyricList.innerHTML = '<li class="lyric-line">Loading Lyrics...</li>';
        if (!lrcUrl) { this.lyricList.innerHTML = '<li class="lyric-line">纯音乐 / 无歌词</li>'; return; }
        try {
            const res = await fetch(lrcUrl);
            if(res.ok) {
                const text = await res.text(); this.parseLyrics(text); this.renderLyrics(); this.hasLyrics = true;
            } else { this.lyricList.innerHTML = '<li class="lyric-line">歌词加载失败</li>'; }
        } catch(e) { this.lyricList.innerHTML = '<li class="lyric-line">歌词加载失败</li>'; }
    }
    parseLyrics(text) {
        const lines = text.split('\n'); 
        const regex = /^\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)$/;
        this.lyrics = [];
        let currentLyric = null;
        
        lines.forEach(line => {
            const str = line.trim();
            if (!str) return;
            const matches = str.match(regex);
            if (matches) {
                const time = parseInt(matches[1])*60 + parseInt(matches[2]) + parseInt(matches[3])/1000;
                const content = matches[4].trim();
                currentLyric = { time, content };
                this.lyrics.push(currentLyric);
            } else {
                // 支持标准 LRC 的翻译行 (下一行无时间戳)
                if (currentLyric) currentLyric.content += `<span>${str}</span>`;
            }
        });
    }
    renderLyrics() {
        this.lyricList.innerHTML = ''; 
        this.lyricList.innerHTML += '<li class="lyric-line" style="height:60px"></li>';
        this.lyrics.forEach((line, i) => {
            const li = document.createElement('li'); 
            li.className = 'lyric-line';
            li.innerHTML = line.content;
            if (this.enableTrans) li.classList.add('show-trans');
            li.dataset.index = i;
            this.lyricList.appendChild(li);
        });
        this.lyricList.innerHTML += '<li class="lyric-line" style="height:60px"></li>';
    }
    syncLyrics(curr) {
        if(!this.hasLyrics || !this.showLyricsMode) return;
        let idx = -1;
        for(let i=0; i<this.lyrics.length; i++) {
            if(curr >= this.lyrics[i].time) idx = i; else break;
        }
        if(idx !== -1) {
            const active = this.lyricList.querySelector('.active');
            if(active) active.classList.remove('active');
            const lines = this.lyricList.querySelectorAll('.lyric-line[data-index]');
            if(lines[idx]) {
                lines[idx].classList.add('active');
                const offset = lines[idx].offsetTop - this.lyricWrapper.clientHeight/2 + lines[idx].clientHeight/2;
                this.lyricList.style.transform = `translateY(-${offset}px)`;
            }
        }
    }
    toggleLyrics() {
        this.showLyricsMode = !this.showLyricsMode;
        if(this.showLyricsMode) this.widget.classList.add('show-lyrics');
        else this.widget.classList.remove('show-lyrics');
    }
    renderPlaylist() {
        this.playlistPanel.innerHTML = '';
        this.playlist.forEach((song, i) => {
            const div = document.createElement('div'); div.className = 'playlist-item';
            div.textContent = `${i + 1}. ${song.title}`;
            div.onclick = (e) => { e.stopPropagation(); this.loadSong(i, true); };
            this.playlistPanel.appendChild(div);
        });
    }
    highlightPlaylist() {
        const items = this.playlistPanel.querySelectorAll('.playlist-item');
        items.forEach((el, i) => {
            if(i === this.currentIndex) el.classList.add('active'); else el.classList.remove('active');
        });
    }
    togglePlaylist(e) { 
        if(e) e.stopPropagation();
        if(this.playlistPanel.innerHTML === '') this.renderPlaylist();
        this.playlistPanel.classList.toggle('show'); 
    }
    play() {
        if(this.enableVis && !this.audioCtx) this.initAudioContext();
        if(this.audioCtx && this.audioCtx.state === 'suspended') this.audioCtx.resume();
        
        this.audio.play().then(() => {
            this.isPlaying = true; this.discWrapper.classList.remove('paused');
            this.discWrapper.classList.add('rotate'); this.playPauseBtn.innerHTML = this.icons.pause;
            navigator.mediaSession.playbackState = 'playing';
        }).catch(()=>{});
    }
    pause() {
        this.audio.pause(); this.isPlaying = false;
        this.discWrapper.classList.add('paused'); this.playPauseBtn.innerHTML = this.icons.play;
        navigator.mediaSession.playbackState = 'paused';
    }
    togglePlay() { this.isPlaying ? this.pause() : this.play(); }
    next(isAuto = false) {
        if (isAuto && this.playMode === 1) { this.audio.currentTime = 0; this.play(); return; }
        let nextIdx;
        if (this.playMode === 2) {
            do { nextIdx = Math.floor(Math.random() * this.playlist.length); }
            while (this.playlist.length > 1 && nextIdx === this.currentIndex);
        } else { nextIdx = (this.currentIndex + 1) % this.playlist.length; }
        this.loadSong(nextIdx, true);
    }
    prev() {
        let prevIdx = (this.currentIndex - 1 + this.playlist.length) % this.playlist.length;
        this.loadSong(prevIdx, true);
    }
    toggleMode() {
        this.playMode = (this.playMode + 1) % 3;
        const icons = [this.icons.seq, this.icons.loop, this.icons.random];
        this.modeBtn.innerHTML = icons[this.playMode];
        this.modeBtn.className = `m-btn ${this.playMode !== 0 ? 'mode-active' : ''}`;
        showToast(`模式: ${['顺序播放', '单曲循环', '随机播放'][this.playMode]}`);
    }
    formatTime(s) {
        const m = Math.floor(s/60); const sec = Math.floor(s%60);
        return `${m}:${sec<10?'0'+sec:sec}`;
    }
    setupDraggable() {
        const w = this.widget;
        let isDragging = false, startX, startY, initialLeft, initialTop, hasMoved = false;
        const start = (e) => {
            if(!this.isCollapsed) return;
            isDragging = true; hasMoved = false; w.style.transition = 'none';
            const touch = e.touches ? e.touches[0] : e;
            startX = touch.clientX; startY = touch.clientY;
            initialLeft = w.offsetLeft; initialTop = w.offsetTop;
        };
        const move = (e) => {
            if(!isDragging) return;
            const touch = e.touches ? e.touches[0] : e;
            const deltaX = Math.abs(touch.clientX - startX); const deltaY = Math.abs(touch.clientY - startY);
            if(deltaX > 5 || deltaY > 5) {
                hasMoved = true; if(e.cancelable) e.preventDefault();
                let newX = initialLeft + touch.clientX - startX; let newY = initialTop + touch.clientY - startY;
                const maxX = window.innerWidth - w.offsetWidth; const maxY = window.innerHeight - w.offsetHeight;
                newX = Math.max(0, Math.min(newX, maxX)); newY = Math.max(0, Math.min(newY, maxY));
                w.style.left = newX + 'px'; w.style.top = newY + 'px';
            }
        };
        const end = (e) => { 
            if(isDragging) {
                isDragging = false; w.style.transition = 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
                if (hasMoved) { this.floatPos = { x: w.offsetLeft, y: w.offsetTop }; } 
                else { if(e.cancelable) e.preventDefault(); e.stopPropagation(); toggleMusicMinimize(); }
            }
        };
        w.addEventListener('mousedown', start); w.addEventListener('touchstart', start, {passive: false});
        document.addEventListener('mousemove', move); document.addEventListener('touchmove', move, {passive: false});
        document.addEventListener('mouseup', end); document.addEventListener('touchend', end);
    }
}

const musicPlayer = new MusicManager();

function openMusicPlayer() {
    toggleMenu();
    const widget = document.getElementById('musicWidget');
    widget.style.display = 'flex'; void widget.offsetWidth;
    
    // 每次打开都重置为展开状态，并在屏幕中心
    widget.classList.remove('collapsed'); widget.classList.add('expanded');
    musicPlayer.isCollapsed = false;
    widget.style.left = '50%'; widget.style.top = '50%';
    widget.style.transform = 'translate(-50%, -50%)';
}

function closeMusicPlayer() {
    const widget = document.getElementById('musicWidget');
    widget.style.display = 'none';
    musicPlayer.pause(); // 关闭时暂停音乐
}

function toggleMusicMinimize() {
    if (musicPlayer.isAnimating) return;
    musicPlayer.isAnimating = true;
    // 最小化时关闭设置菜单
    document.getElementById('playerSettings').classList.remove('show');
    
    const widget = document.getElementById('musicWidget');
    if(widget.classList.contains('expanded')) {
        widget.classList.remove('expanded'); widget.classList.add('collapsed');
        musicPlayer.isCollapsed = true; widget.style.transform = 'none';
        widget.style.left = musicPlayer.floatPos.x + 'px'; widget.style.top = musicPlayer.floatPos.y + 'px';
        if(musicPlayer.showLyricsMode) musicPlayer.toggleLyrics();
        document.getElementById('playlistPanel').classList.remove('show');
    } else {
        widget.classList.remove('collapsed'); widget.classList.add('expanded');
        musicPlayer.isCollapsed = false; widget.style.left = '50%'; widget.style.top = '50%';
        widget.style.transform = 'translate(-50%, -50%)';
    }
    setTimeout(() => { musicPlayer.isAnimating = false; }, 500);
}

function togglePlayerSettings() {
    document.getElementById('playerSettings').classList.toggle('show');
}