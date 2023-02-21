var idLen = 7
const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

self.addEventListener('message', function (msg) {
    idLen = parseInt(msg.data)
    workerGetValidId()
});

async function workerGetValidId() {
    var validImg = false;
    var newId = "";
    var idMime = ""

    do {
        var id = generateId()
        sendUpdateMsg(id)
        var url = getUrl(id, "png", true)
        try {
            await testUrl(url).then(
                async function fulfilled() {
                    var videoUrl = getUrl(id, "mp4", false)
                    newId = id;

                    await testUrl(videoUrl).then(
                        function fulfilled() {
                            idMime = "mp4"
                            //todo dont return MP4 for gifs
                        },

                        function rejected() {
                            idMime = "png"
                        }
                    )                    
                    validImg = true;
                },

                function rejected() {
                    sendLoggingMsg(id + " is not valid")
                }
            )
        } catch (e) {
            sendErrorMsg(e.message)
            self.close()
        }
    } while (!validImg)

    self.postMessage(newId + ";" + idMime)
    self.close()
}

function generateId() {
    var id = "";

    for (var i = 0; i < idLen; i++) {
        var charIndex = Math.round(Math.random() * (chars.length - 1));
        id += chars.charAt(charIndex);
    }

    return id
}

function getUrl(id, mime, asThumbnail) {
    var url = "https://i.imgur.com/" + id
    if (asThumbnail) {
        url = url + "s"
    }
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

            if (xhr.responseURL != "https://i.imgur.com/removed.png" && xhr.status == "200") {
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