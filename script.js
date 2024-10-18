const preview = document.getElementById('preview');
const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');
const opacitySlider = document.getElementById('opacitySlider');

let mediaRecorder;
let recordedChunks = [];
let currentStream;

// スライダーの値を変更するたびに透過度を調整
opacitySlider.addEventListener('input', () => {
    const opacityValue = opacitySlider.value / 100;  // スライダーの値を0~1に変換
    preview.style.opacity = opacityValue;  // 透過度を設定
});


// 初めから外カメラ（環境カメラ）を選んで表示
startCamera();

// カメラを開始する関数
function startCamera(facingMode = "environment") {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());  // 以前のストリームを停止
    }

    navigator.mediaDevices.getUserMedia({
        video: { facingMode: { exact: facingMode } }, 
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
