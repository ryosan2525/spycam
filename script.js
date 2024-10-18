const preview = document.getElementById('preview');
const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');
const cameraSelect = document.getElementById('cameraSelect');
const recordedVideo = document.getElementById('recordedVideo');
const opacitySlider = document.getElementById('opacitySlider');

// 動画を非表示にする
recordedVideo.style.display = 'none';

// スライダーの値を変更するたびに透過度を調整
opacitySlider.addEventListener('input', () => {
    const opacityValue = opacitySlider.value / 100;  // スライダーの値を0~1に変換
    preview.style.opacity = opacityValue;  // 透過度を設定
});




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
            await downloadRecording(recordedBlob); // 録画をダウンロード
            recordedChunks = [];  // 次の録画のためにリセット
        };
        
    })
    .catch(error => {
        console.error('カメラの使用に失敗しました:', error);
    });
}

// 録画をダウンロードする関数
function downloadRecording(blob) {
    const url = URL.createObjectURL(blob);
    const filename = generateFilename(); // ファイル名を生成
    const a = document.createElement('a');
    a.href = url;
    a.download = filename; // ここでファイル名を設定
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a); // リンクを削除
        URL.revokeObjectURL(url); // URLを解放
    }, 100); // 少し待ってから削除
}

// ファイル名を生成する関数
function generateFilename() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0'); // 月は0から始まるため+1
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}.webm`;
}

// 録画開始
startButton.addEventListener('click', () => {
    if (!mediaRecorder || mediaRecorder.state === "inactive") {
        const deviceId = cameraSelect.value; // 選択されたカメラのIDを取得
        
        mediaRecorder.start(); // 録画を開始
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
