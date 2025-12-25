const { createFFmpeg, fetchFile } = FFmpeg;
const ffmpeg = createFFmpeg({ log: false }); // 關閉冗長日誌提升效能

let currentVideoFile = null;

const convertBtn = document.getElementById('convertBtn');
const statusDisplay = document.getElementById('statusDisplay');
const previewBox = document.getElementById('previewBox');
const videoPreview = document.getElementById('videoPreview');
const downloadLink = document.getElementById('downloadLink');
const shareBtn = document.getElementById('shareBtn');
const twitterBtn = document.getElementById('twitterBtn');

// --- UI 輔助功能 ---
function updateVal(id) {
    const el = document.getElementById(id);
    const display = document.getElementById(id + 'Val');
    if (display) display.innerText = el.value + (id.includes('pos') ? '%' : '');
}
['fontSize', 'posX', 'posY'].forEach(id => {
    document.getElementById(id).oninput = () => updateVal(id);
});
document.getElementById('textColor').oninput = (e) => {
    document.getElementById('colorHex').innerText = e.target.value.toUpperCase();
};

// --- 核心：影片生成 ---
convertBtn.onclick = async () => {
    const uploader = document.getElementById('uploader');
    if (uploader.files.length === 0) return alert('請先選擇圖片');
    
    const file = uploader.files[0];
    const text = document.getElementById('videoText').value || ' ';
    const size = document.getElementById('fontSize').value;
    const color = document.getElementById('textColor').value;
    const xPct = document.getElementById('posX').value / 100;
    const yPct = document.getElementById('posY').value / 100;
    const h = document.getElementById('qualitySelect').value;

    convertBtn.disabled = true;
    previewBox.style.display = 'none';
    
    try {
        if (!ffmpeg.isLoaded()) {
            statusDisplay.innerText = '⏳ 引擎啟動中...';
            await ffmpeg.load();
        }

        statusDisplay.innerText = '⏳ 處理素材中...';
        const fontUrl = 'https://raw.githubusercontent.com/googlefonts/noto-cjk/main/Sans/OTF/TraditionalChinese/NotoSansCJKtc-Bold.otf';
        const [fData, iData] = await Promise.all([fetchFile(fontUrl), fetchFile(file)]);
        
        ffmpeg.FS('writeFile', 'f.otf', fData);
        ffmpeg.FS('writeFile', 'i.img', iData);

        statusDisplay.innerText = `🚀 正在轉碼 ${h}p 影片...`;
        await ffmpeg.run(
            '-loop', '1', '-i', 'i.img', '-t', '3',
            '-vf', `scale=-2:${h},drawtext=fontfile=f.otf:text='${text}':fontcolor=${color}:fontsize=${size}:shadowcolor=black@0.4:shadowx=2:shadowy=2:x=(w-tw)*${xPct}:y=(h-th)*${yPct}`,
            '-pix_fmt', 'yuv420p', 'out.mp4'
        );

        const data = ffmpeg.FS('readFile', 'out.mp4');
        const videoBlob = new Blob([data.buffer], { type: 'video/mp4' });
        const url = URL.createObjectURL(videoBlob);
        
        currentVideoFile = new File([videoBlob], `video_${Date.now()}.mp4`, { type: 'video/mp4' });

        videoPreview.src = url;
        downloadLink.href = url;
        downloadLink.download = `watermark_video.mp4`;
        previewBox.style.display = 'block';
        statusDisplay.innerText = '✅ 生成完畢！';
        
    } catch (e) {
        statusDisplay.innerText = '❌ 發生錯誤，請重試。';
    } finally {
        convertBtn.disabled = false;
    }
};

// --- 分享功能 1：系統分享 (包含檔案) ---
shareBtn.onclick = async () => {
    if (!currentVideoFile) return;
    const text = document.getElementById('videoText').value;
    
    if (navigator.canShare && navigator.canShare({ files: [currentVideoFile] })) {
        try {
            await navigator.share({
                title: '我的影片作品',
                text: `這是我製作的影片：${text}`,
                files: [currentVideoFile]
            });
        } catch (e) { console.log('分享取消'); }
    } else {
        alert('此環境不支援檔案分享，請先下載影片。');
    }
};

// --- 分享功能 2：𝕏 (Twitter) 文字分享 ---
twitterBtn.onclick = () => {
    const text = document.getElementById('videoText').value;
    const shareText = encodeURIComponent(`這是我製作的浮水印影片：${text}\n#圖片轉影片`);
    window.open(`https://twitter.com/intent/tweet?text=${shareText}`, '_blank');
};
