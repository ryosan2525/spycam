const preview = document.getElementById('preview');
const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');
const opacitySlider = document.getElementById('opacitySlider');
const toggleCameraButton = document.getElementById('toggleCameraButton');
const toggleMenuButton = document.getElementById('toggleMenuButton');
const menu = document.getElementById('menu');

let mediaRecorder;
let recordedChunks = [];
let currentStream;
let cameraIsOn = true;  // カメラがオンかどうかの状態管理

// 初めはpreviewを透明に設定
preview.style.opacity = 0;
startCamera();

// メニューの表示/非表示を切り替える関数
toggleMenuButton.addEventListener('click', () => {
    if (menu.style.display === 'none' || menu.style.display === '') {
        menu.style.display = 'flex';  // メニューを表示
    } else {
        menu.style.display = 'none';  // メニューを非表示
    }
});

// スライダーの値を変更するたびに透過度を調整
opacitySlider.addEventListener('input', () => {
    const opacityValue = opacitySlider.value / 100;  // スライダーの値を0~1に変換
    preview.style.opacity = opacityValue;  // 透過度を設定
});

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

// カメラのオン・オフを切り替える関数
function toggleCamera() {
    if (cameraIsOn) {
        if (mediaRecorder && mediaRecorder.state === "recording") {
            mediaRecorder.stop();  // 録画を停止
            startButton.disabled = false;
            stopButton.disabled = true;
        }

        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());  // ストリームを停止
        }
        preview.srcObject = null;  // プレビューをクリア
        cameraIsOn = false;
        toggleCameraButton.textContent = '⚫';  // ボタンの表示を変更
    } else {
        startCamera();
        cameraIsOn = true;
        toggleCameraButton.textContent = '🔵';  // ボタンの表示を変更
    }
}




// 録画をダウンロードする関数
function downloadRecording(blob) {
    const url = URL.createObjectURL(blob);
    const filename = generateFilename();  // ファイル名を生成
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;  // ここでファイル名を設定
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);  // リンクを削除
        URL.revokeObjectURL(url);  // URLを解放
    }, 100);  // 少し待ってから削除
}

// ファイル名を生成する関数
function generateFilename() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}.webm`;
}

// 録画開始
startButton.addEventListener('click', () => {
    if (!mediaRecorder || mediaRecorder.state === "inactive") {
        mediaRecorder.start();  // 録画を開始
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

// カメラオンオフボタンのイベントリスナーを追加
toggleCameraButton.addEventListener('click', toggleCamera);

// 初期状態ではメニューを非表示にする場合は、次の行をコメントアウトしてください。
menu.style.display = 'flex';  // 初期表示時にメニューを表示する場合
