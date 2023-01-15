adjList = []
animalList = []

self.addEventListener('message', function () {    
    Promise.all([
        fetch("../commonRes/adjectives.txt").then(resp => resp.text()).then(data => adjList = data.split(/\r\n|\r|\n/)),
        fetch("../commonRes/animals.txt").then(resp => resp.text()).then(data => animalList = data.split(/\r\n|\r|\n/))
      ]).then(() => {
        sendLoggingMsg("lists loaded")
        workerGetValidId()
    })    
});

async function workerGetValidId() {
    var validImg = false;
    var newId = "";
    var idMime = ""

    do {
        var id = generateId()
        sendUpdateMsg(id)
        var url = getApiUrl(id)
        try {
            await testUrl(url).then(
                async function fulfilled(mime) {
                    newId = id;   
                    idMime = mime            
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
    var firstAdj = adjList[Math.round(Math.random() * (adjList.length - 1))]
    var secondAdj = adjList[Math.round(Math.random() * (adjList.length - 1))]
    var animal = animalList[Math.round(Math.random() * (animalList.length - 1))]

    return firstAdj + secondAdj + animal
}

function getApiUrl(id) {
    return "https://api.gfycat.com/v1/gfycats/" + id
}

function testUrl(url) {

    let requestPromise = new Promise(async function imgPromise(resolve, reject) {
        fetch(url)
        .then(response => {
            if (response.status != 200) {
                reject()
                return
            }
            
            response.text()
            .then(data => {
                var respData = JSON.parse(data)
                if (respData.gfyItem.hasAudio == true) {
                    resolve("mp4")
                } else {
                    resolve("gif")
                }
            })
        })
    });

    return requestPromise;
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