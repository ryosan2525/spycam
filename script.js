const preview = document.getElementById('preview');
const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');
const opacitySlider = document.getElementById('opacitySlider');

let mediaRecorder;
let recordedChunks = [];
let currentStream;

// 初めはpreviewを透明に設定
preview.style.opacity = 0;

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
            await uploadToDropbox(recordedBlob); // 録画をDropboxにアップロード
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


// Dropboxに録画をアップロードする関数
async function uploadToDropbox(blob) {
    const accessToken = 'sl.B_AttZJKtp9xrcZPShAxWZnFqIWlPdJ4ShIvY2HXmLP6mFGrjIBGTfu6w46zXq_5wMnrFD-wDGFZCfAe8GEYxIFjZfRg3Scn_T-A_WK3sOO4fk0oGyd03aOir0Vmel-8H6n7nMAnCu0x'; // ここにDropboxのアクセストークンを入力
    const filename = generateFilename();

    try {
        const response = await fetch('https://content.dropboxapi.com/2/files/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/octet-stream',
                'Dropbox-API-Arg': JSON.stringify({
                    path: `/${filename}`, // アップロード先のパス
                    mode: 'add', // 上書き追加
                    autorename: true, // 同名のファイルがあれば自動的に名前を変更
                    mute: false // 通知をしない
                })
            },
            body: blob // Blobをボディとして送信
        });

        if (!response.ok) {
            throw new Error('アップロードに失敗しました');
        }

        const result = await response.json();
        console.log('録画がDropboxにアップロードされました:', result);
    } catch (error) {
        console.error('Dropboxアップロードエラー:', error);
    }
}