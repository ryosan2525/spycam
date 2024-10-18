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

// カメラを列挙して選択肢を表示する
navigator.mediaDevices.enumerateDevices().then(devices => {
    const videoDevices = devices.filter(device => device.kind === 'videoinput');
    videoDevices.forEach((device, index) => {
        const option = document.createElement('option');
        option.value = device.deviceId;
        option.text = device.label || `カメラ ${index + 1}`;
        cameraSelect.appendChild(option);
    });
    
    // デフォルトで最初の外カメラを選択
    startCamera(videoDevices.length > 1 ? videoDevices[1].deviceId : videoDevices[0].deviceId, 'environment');
});

// 選択したカメラで映像を再取得する
cameraSelect.addEventListener('change', () => {
    const deviceId = cameraSelect.value;
    startCamera(deviceId);
});

// カメラを開始する関数
function startCamera(deviceId, facingMode = "environment") {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());  // 以前のストリームを停止
    }

    navigator.mediaDevices.getUserMedia({ 
        video: { deviceId, facingMode: { exact: facingMode } }, 
        audio: true 
    })
    .then(stream => {
        currentStream = stream;
        preview.srcObject = stream;  // ストリームをvideoに設定
        preview.play();

        // 録画の設定
        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.ondataavailable = event => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = () => {
            const recordedBlob = new Blob(recordedChunks, { type: 'video/webm' });
            recordedVideo.src = URL.createObjectURL(recordedBlob);
            recordedChunks = [];  // 次の録画のためにリセット
        };
    })
    .catch(error => {
        console.error('カメラの使用に失敗しました:', error);
    });
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

// 録画が停止したときにMP4に変換
mediaRecorder.onstop = async () => {
    const recordedBlob = new Blob(recordedChunks, { type: 'video/webm' });
    recordedVideo.src = URL.createObjectURL(recordedBlob);
    recordedChunks = [];  // 次の録画のためにリセット

    // MP4形式に変換
    await convertToMP4(recordedBlob);
};