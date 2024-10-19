const preview = document.getElementById('preview');
const recordButton = document.getElementById('recordButton');
const opacitySlider = document.getElementById('opacitySlider');
const toggleCameraButton = document.getElementById('toggleCameraButton');
const toggleMenuButton = document.getElementById('toggleMenuButton');
const menu = document.getElementById('menu');

let mediaRecorder;
let recordedChunks = [];
let currentStream;
let cameraIsOn = true;
let isRecording = false;  // 録画中かどうかの状態を管理

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
    const opacityValue = opacitySlider.value / 100;
    preview.style.opacity = opacityValue;
});

// カメラを開始する関数
function startCamera(facingMode = "environment") {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
    }

    navigator.mediaDevices.getUserMedia({
        video: { facingMode: { exact: facingMode } }, 
        audio: true
    })
    .then(stream => {
        currentStream = stream;
        preview.srcObject = stream;
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
            recordedChunks = [];
            await convertAndDownload(recordedBlob); // 変換してダウンロード
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
            mediaRecorder.stop();
            isRecording = false;
            recordButton.textContent = '▶️';
        }

        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
        }
        preview.srcObject = null;
        cameraIsOn = false;
        toggleCameraButton.textContent = '⚫';
    } else {
        startCamera();
        cameraIsOn = true;
        toggleCameraButton.textContent = '🔵';
    }
}

// 録画を開始/停止する関数
function toggleRecording() {
    if (!cameraIsOn) {
        alert("カメラがオフになっています。カメラをオンにしてから録画を開始してください。");
        return;  // カメラがオフの場合、録画は開始しない
    }

    if (!isRecording) {
        if (!mediaRecorder || mediaRecorder.state === "inactive") {
            mediaRecorder.start();
            recordButton.textContent = '⏹️';  // 停止ボタンに切り替える
            isRecording = true;
        }
    } else {
        if (mediaRecorder && mediaRecorder.state === "recording") {
            mediaRecorder.stop();
            recordButton.textContent = '▶️';  // 開始ボタンに切り替える
            isRecording = false;
        }
    }
}

// 録画を変換してダウンロードする関数
async function convertAndDownload(blob) {
    const { createFFmpeg, fetchFile } = FFmpeg;
    const ffmpeg = createFFmpeg({ log: true });

    try {
        await ffmpeg.load();
        
        // BlobをFFmpegに書き込む
        ffmpeg.FS('writeFile', 'input.webm', await fetchFile(blob));
        
        // WebMファイルをMP4に変換
        await ffmpeg.run('-i', 'input.webm', 'output.mp4');
        
        // MP4ファイルを取得
        const data = ffmpeg.FS('readFile', 'output.mp4');
        
        // MP4ファイルをダウンロード
        downloadRecording(new Blob([data.buffer], { type: 'video/mp4' }));
        
        // メモリからファイルを削除
        ffmpeg.FS('unlink', 'input.webm');
        ffmpeg.FS('unlink', 'output.mp4');
        
    } catch (error) {
        console.error('変換中にエラーが発生しました:', error);
    }
}

// 録画をダウンロードする関数
function downloadRecording(blob) {
    const url = URL.createObjectURL(blob);
    const filename = generateFilename('mp4'); // mp4用のファイル名生成
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;  // ここでmp4ファイルとしてダウンロードされるようにする
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}

// ファイル名を生成する関数
function generateFilename(extension) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}.${extension}`; // 指定した拡張子を使用
}


// 録画ボタンのイベントリスナーを追加
recordButton.addEventListener('click', toggleRecording);

// カメラオンオフボタンのイベントリスナーを追加
toggleCameraButton.addEventListener('click', toggleCamera);

// 初期状態ではメニューを非表示にする場合は、次の行をコメントアウトしてください。
menu.style.display = 'flex';
