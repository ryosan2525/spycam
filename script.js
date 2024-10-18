const preview = document.getElementById('preview');
const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');
const recordedVideo = document.getElementById('recordedVideo');
const downloadLink = document.getElementById('downloadLink');

let mediaRecorder;
let recordedChunks = [];
let currentStream;

// カメラ映像を取得する関数
function startCamera() {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then(stream => {
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
        mediaRecorder.onstop = () => {
            const recordedBlob = new Blob(recordedChunks, { type: 'video/webm' });
            recordedVideo.src = URL.createObjectURL(recordedBlob);
            recordedVideo.controls = true;
            recordedVideo.play();

            // ダウンロードリンクを生成
            const downloadUrl = URL.createObjectURL(recordedBlob);
            downloadLink.href = downloadUrl;
            downloadLink.style.display = 'block';
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

// ページ読み込み時にカメラを起動
window.onload = () => {
    startCamera();
};
