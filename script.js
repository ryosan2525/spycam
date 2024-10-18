const preview = document.getElementById('preview');
const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');
const cameraSelect = document.getElementById('cameraSelect');
const recordedVideo = document.getElementById('recordedVideo');

let mediaRecorder;
let recordedChunks = [];
let currentStream;

// カメラを列挙して選択肢を表示する
navigator.mediaDevices.enumerateDevices().then(devices => {
    const videoDevices = devices.filter(device => device.kind === 'videoinput');
    videoDevices.forEach((device, index) => {
        const option = document.createElement('option');
        option.value = device.deviceId;
        option.text = device.label || `カメラ ${index + 1}`;
        cameraSelect.appendChild(option);
    });
    
    // デフォルトで最初のカメラ（外カメラ）を選択して表示
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

        mediaRecorder.onstop = async () => {
            const recordedBlob = new Blob(recordedChunks, { type: 'video/webm' });
            recordedVideo.src = URL.createObjectURL(recordedBlob);
            await convertToMp4(recordedBlob); // 録画をMP4形式に変換
            recordedChunks = [];  // 次の録画のためにリセット
        };
    })
    .catch(error => {
        console.error('カメラの使用に失敗しました:', error);
    });
}

// WebMをMP4に変換する関数
async function convertToMp4(webmBlob) {
    const { createFFmpeg, fetchFile } = FFmpeg;
    const ffmpeg = createFFmpeg({ log: true });
    
    await ffmpeg.load();
    ffmpeg.FS('writeFile', 'recording.webm', await fetchFile(webmBlob));
    await ffmpeg.run('-i', 'recording.webm', 'recording.mp4');
    
    const mp4Data = ffmpeg.FS('readFile', 'recording.mp4');
    const mp4Blob = new Blob([mp4Data.buffer], { type: 'video/mp4' });
    
    // MP4をダウンロードする
    downloadMp4(mp4Blob);
}

// MP4をダウンロードする関数
function downloadMp4(blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'recording.mp4'; // ダウンロードするファイル名
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
}

// 録画開始
startButton.addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state === "inactive") {
        mediaRecorder.start();
        startButton.disabled = true;
        stopButton.disabled = false;
    }
});

// 録画停止
stopButton.addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
        startButton.disabled = false;
        stopButton.disabled = true;
    }
});
