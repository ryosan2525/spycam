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
        recordedChunks = [];  // 録画データを初期化

        // データが利用可能になったときに保存
        mediaRecorder.ondataavailable = event => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };

        // 録画が停止したらビデオを再生
        mediaRecorder.onstop = () => {
            const recordedBlob = new Blob(recordedChunks, { type: 'video/webm' });
            recordedVideo.src = URL.createObjectURL(recordedBlob);
            recordedVideo.controls = true;  // コントロールを表示
            recordedVideo.play();
            recordedChunks = [];  // 次の録画のためにリセット
        };
    })
    .catch(error => {
        console.error('カメラの使用に失敗しました:', error);
    });
}

// 録画開始（タッチ対応）
startButton.addEventListener('touchstart', () => {
    if (mediaRecorder) {
        mediaRecorder.start();
        startButton.disabled = true;
        stopButton.disabled = false;
    }
});

startButton.addEventListener('click', () => {
    if (mediaRecorder) {
        mediaRecorder.start();
        startButton.disabled = true;
        stopButton.disabled = false;
    }
});

// 録画停止（タッチ対応）
stopButton.addEventListener('touchstart', () => {
    if (mediaRecorder) {
        mediaRecorder.stop();
        startButton.disabled = false;
        stopButton.disabled = true;
    }
});

stopButton.addEventListener('click', () => {
    if (mediaRecorder) {
        mediaRecorder.stop();
        startButton.disabled = false;
        stopButton.disabled = true;
    }
});
