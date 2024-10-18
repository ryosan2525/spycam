const { createFFmpeg, fetchFile } = FFmpeg;
const preview = document.getElementById('preview');
const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');
const recordedVideo = document.getElementById('recordedVideo');
const downloadLink = document.getElementById('downloadLink');
const cameraSelect = document.getElementById('cameraSelect');

let mediaRecorder;
let recordedChunks = [];
let currentStream;
let ffmpeg;

// 利用可能なカメラデバイスを取得
async function getCameraDevices() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(device => device.kind === 'videoinput');

    videoDevices.forEach(device => {
        const option = document.createElement('option');
        option.value = device.deviceId;
        option.textContent = device.label || `Camera ${cameraSelect.length + 1}`;
        cameraSelect.appendChild(option);
    });
}

// カメラ映像を取得する関数
async function startCamera(deviceId) {
    const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { deviceId: deviceId ? { exact: deviceId } : undefined },
        audio: true 
    });

    preview.srcObject = stream;
    currentStream = stream;

    // MediaRecorderの設定
    mediaRecorder = new MediaRecorder(stream);
    
    // 録画データを収集
    mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) {
            recordedChunks.push(event.data);
        }
    };

    // 録画が停止したときに、動画ファイルを作成
    mediaRecorder.onstop = async () => {
        const recordedBlob = new Blob(recordedChunks, { type: 'video/webm' });
        const webMUrl = URL.createObjectURL(recordedBlob);
        
        recordedVideo.src = webMUrl;
        recordedVideo.controls = true;
        recordedVideo.play();

        // ffmpeg.jsを使用してwebMをMP4に変換
        await convertToMP4(recordedBlob);
    };
}

// 録画開始
startButton.addEventListener('click', () => {
    if (mediaRecorder) {
        recordedChunks = []; // 前回の録画データをリセット
        mediaRecorder.start();
        console.log("録画開始");

        startButton.disabled = true;
        stopButton.disabled = false;
    }
});

// 録画停止
stopButton.addEventListener('click', () => {
    if (mediaRecorder) {
        mediaRecorder.stop();
        console.log("録画停止");

        startButton.disabled = false;
        stopButton.disabled = true;
    }
});

// MP4形式に変換
async function convertToMP4(blob) {
    ffmpeg = createFFmpeg({ log: true });
    await ffmpeg.load();
    
    // Blobをffmpeg.jsに渡す
    ffmpeg.FS('writeFile', 'video.webm', await fetchFile(blob));
    
    // WebMをMP4に変換
    await ffmpeg.run('-i', 'video.webm', 'output.mp4');
    
    // 変換後のファイルを取得
    const data = ffmpeg.FS('readFile', 'output.mp4');
    
    // MP4ファイルをダウンロードリンクに設定
    const mp4Blob = new Blob([data.buffer], { type: 'video/mp4' });
    const mp4Url = URL.createObjectURL(mp4Blob);

    downloadLink.href = mp4Url;
    downloadLink.style.display = 'block'; // ダウンロードリンクを表示
}

// デバイス選択時にカメラを起動
cameraSelect.addEventListener('change', () => {
    const selectedDeviceId = cameraSelect.value;
    startCamera(selectedDeviceId);
});

// ページ読み込み時にカメラデバイスを取得
window.onload = async () => {
    await getCameraDevices();
    const firstCamera = cameraSelect.value;
    startCamera(firstCamera);
};