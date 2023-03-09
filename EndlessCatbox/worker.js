const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
const idLen = 6
const coreImgMimes = ["jpg", "png"]
const coreVidMimes = ["mp4", "webm"]
const extImgMimes = ["gif", "webp", "jpeg", "bmp", "tiff", "ico"]
const extVidMimes = ["m4v", "avi", "mov"]
const coreAudioMimes = ["mp3", "wav"]
const extAudioMimes = ["flac", "ogg", "aac", "midi", "mid"]
const docMimes = ["txt", "pdf", "docx", "xml", "json", "csv", "xlsx", "pptx"]
const archiveMimes = ["zip", "rar", "tar.gz", "7z"]
const scaryMimes = ["exe", "swf", "msi", "sh"]

var selectedMimes = 0

self.addEventListener('message', function (msg) {
    selectedMimes = parseInt(msg.data)
    workerGetValidId()
});

async function workerGetValidId() {
    var validImg = false;
    var newId = "";
    var idMime = ""

    var mimeList = createMimeList()

    do {
        var id = generateId()
        sendUpdateMsg(id)
        for (let i = 0; i < mimeList.length; i++) {
            mime = mimeList[i]
            var url = getUrl(id, mime)

            try {

                await testUrl(url).then(
                    function fulfilled() {
                        newId = id;       
                        idMime = mime        
                        validImg = true;
                    },
    
                    function rejected() {
                        sendLoggingMsg(id+"."+ mime + " is not valid")
                    }
                )
            } catch (e) {
                sendErrorMsg(e.message)
                self.close()
            }
        };
    } while (!validImg)

    self.postMessage(newId + ";" + idMime)
    self.close()
}

function createMimeList() {
    var mimeList = []
    // | Bit 1 | Bit 2  | Bit 3 | Bit 4  | Bit 5 |  Bit 6   |   Bit 7   |  Bit 8   | Bit 9 |
    // |-------|--------|-------|--------|-------|----------|-----------|----------|-------|
    // | Img   | extImg | vid   | extVid | audio | extAudio | Documents | archives | scary |

    if (checkBit(selectedMimes, 1)) {
        mimeList = mimeList.concat(coreImgMimes)
        if (checkBit(selectedMimes, 2)) {
            mimeList = mimeList.concat(extImgMimes)
        }
    }

    if (checkBit(selectedMimes, 3)) {
        mimeList = mimeList.concat(coreVidMimes)
        if (checkBit(selectedMimes, 4)) {
            mimeList = mimeList.concat(extVidMimes)
        }
    }

    if (checkBit(selectedMimes, 5)) {
        mimeList = mimeList.concat(coreAudioMimes)
        if (checkBit(selectedMimes, 6)) {
            mimeList = mimeList.concat(extAudioMimes)
        }
    }

    if (checkBit(selectedMimes, 7)) {
        mimeList = mimeList.concat(docMimes)
    }

    if (checkBit(selectedMimes, 8)) {
        mimeList = mimeList.concat(archiveMimes)
    }

    if (checkBit(selectedMimes, 9)) {
        mimeList = mimeList.concat(scaryMimes)
    }

    return mimeList
}

function checkBit(num, bit) {
    var mask = 1 << bit-1

    if ((num & mask) == 0) {
        return false
    } else {
        return true
    }
}

function generateId() {
    var id = "";

    for (var i = 0; i < idLen; i++) {
        var charIndex = Math.round(Math.random() * (chars.length - 1));
        id += chars.charAt(charIndex);
    }
    return "v3ooyu"
    return id
}

function getUrl(id, mime) {
    var url = "https://files.catbox.moe/" + id
    return url + "." + mime
}

function testUrl(url) {

    let imgPromise = new Promise(async function imgPromise(resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.open('HEAD', url, true);

        xhr.onreadystatechange = async function () {
            if (xhr.status == "403" || xhr.status == "401" || xhr.status == "429") {
                sendErrorMsg("Imgur is unreachable, you may have been rate limited. Try changing your IP")
                self.close()
                return
            }

            if (xhr.status == "200" || xhr.status == "206") {
                resolve()
            } else {
                reject()
            }
        };

        xhr.send();
    });

    return imgPromise;
}

function sendUpdateMsg(id) {
    self.postMessage("@" + id)
}

function sendLoggingMsg(msg) {
    self.postMessage("#" + msg)
}

function sendErrorMsg(msg) {
    self.postMessage("!" + msg)
}