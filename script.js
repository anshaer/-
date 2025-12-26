const { createFFmpeg, fetchFile } = FFmpeg;
const ffmpeg = createFFmpeg({ log: true });

// 全域變數存儲多個生成的影片檔案
let currentVideoFiles = [];

const convertBtn = document.getElementById('convertBtn');
const shareBtn = document.getElementById('shareBtn');
const statusDisplay = document.getElementById('statusDisplay');
const previewBox = document.getElementById('previewBox');
const videoContainer = document.getElementById('videoContainer');

// UI 事件處理 (維持原樣)
function updateVal(id) {
    const el = document.getElementById(id);
    const display = document.getElementById(id + 'Val');
    if (display) display.innerText = el.value + (id.includes('pos') ? '%' : '');
}
['fontSize', 'posX', 'posY'].forEach(id => {
    document.getElementById(id).oninput = () => updateVal(id);
});

// --- 核心功能：生成影片 ---

convertBtn.onclick = async () => {
    const uploader = document.getElementById('uploader');
    const files = uploader.files;
    
    if (files.length === 0) return alert('請先選擇圖片');
    if (files.length > 4) return alert('最多只能選擇 4 張圖片');

    const text = document.getElementById('videoText').value || ' ';
    const size = document.getElementById('fontSize').value;
    const color = document.getElementById('textColor').value;
    const xPct = document.getElementById('posX').value / 100;
    const yPct = document.getElementById('posY').value / 100;
    const h = document.getElementById('qualitySelect').value;

    convertBtn.disabled = true;
    videoContainer.innerHTML = ''; // 清空舊預覽
    currentVideoFiles = []; // 清空舊檔案
    
    try {
        if (!ffmpeg.isLoaded()) {
            statusDisplay.innerText = '⏳ 正在初始化引擎...';
            await ffmpeg.load();
        }

        // 載入字體
        statusDisplay.innerText = '⏳ 正在下載字體...';
        const fontUrl = 'https://raw.githubusercontent.com/googlefonts/noto-cjk/main/Sans/OTF/TraditionalChinese/NotoSansCJKtc-Bold.otf';
        const fontData = await fetchFile(fontUrl);
        ffmpeg.FS('writeFile', 'font.otf', fontData);

        // 逐一處理圖片
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            statusDisplay.innerText = `🚀 正在處理第 ${i + 1}/${files.length} 個影片...`;

            const imageData = await fetchFile(file);
            const inputName = `input_${i}.img`;
            const outputName = `out_${i}.mp4`;

            ffmpeg.FS('writeFile', inputName, imageData);

            await ffmpeg.run(
                '-loop', '1', '-i', inputName,
                '-t', '3',
                '-vf', `scale=-2:${h},drawtext=fontfile=font.otf:text='${text}':fontcolor=${color}:fontsize=${size}:shadowcolor=black@0.4:shadowx=2:shadowy=2:x=(w-tw)*${xPct}:y=(h-th)*${yPct}`,
                '-pix_fmt', 'yuv420p',
                outputName
            );

            const data = ffmpeg.FS('readFile', outputName);
            const videoBlob = new Blob([data.buffer], { type: 'video/mp4' });
            const videoFile = new File([videoBlob], `video_${i}_${Date.now()}.mp4`, { type: 'video/mp4' });
            currentVideoFiles.push(videoFile);

            // 建立預覽影片元素
            const url = URL.createObjectURL(videoBlob);
            const videoEl = document.createElement('video');
            videoEl.src = url;
            videoEl.controls = true;
            videoEl.style.marginBottom = "15px";
            videoContainer.appendChild(videoEl);

            // 清理檔案系統避免記憶體溢位
            ffmpeg.FS('unlink', inputName);
            ffmpeg.FS('unlink', outputName);
        }

        previewBox.style.display = 'block';
        statusDisplay.innerText = `✅ 成功完成 ${files.length} 個影片！`;
        previewBox.scrollIntoView({ behavior: 'smooth' });

    } catch (e) {
        console.error(e);
        statusDisplay.innerText = '❌ 發生錯誤，請縮小圖片或重整網頁。';
    } finally {
        convertBtn.disabled = false;
    }
};

// --- 分享功能：一次分享 4 個檔案 ---

shareBtn.onclick = async () => {
    if (currentVideoFiles.length === 0) return;

    const shareData = {
        title: '我的作品集',
        text: document.getElementById('videoText').value,
        files: currentVideoFiles // 直接放入整個陣列
    };

    if (navigator.canShare && navigator.canShare({ files: currentVideoFiles })) {
        try {
            await navigator.share(shareData);
        } catch (err) {
            if (err.name !== 'AbortError') alert('分享失敗。');
        }
    } else {
        alert('您的瀏覽器不支援多檔案分享，或超過檔案大小限制。');
    }
};
