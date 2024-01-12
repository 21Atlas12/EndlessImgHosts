var imgHolder = null
var vidHolder = null
var audioHolder = null
var downloadLink = null
var currentId = ""
var currentMime = ""
const imgMimes = ["jpg", "png", "gif", "webp", "jpeg", "bmp", "tiff", "ico"]
const vidMimes = ["mp4", "webm", "m4v", "avi", "mov"]
const audioMimes = ["mp3", "wav", "flac", "ogg", "aac", "midi", "mid"]
const docMimes = ["txt", "pdf", "docx", "xml", "json", "csv", "xlsx", "pptx"]
const archiveMimes = ["zip", "rar", "tar.gz", "7z"]
const scaryMimes = ["exe", "swf", "msi", "sh"]

function setup() {
    //load settings
    var threadPicker = document.getElementById("threadCountPicker")

    threadCookieVal = readCookie("threadCount")
    if (!isNaN(threadCookieVal) && !!threadCookieVal) {
        threadCount = threadCookieVal
        threadPicker.value = threadCount
    } else {
        threadCount = 1
        threadPicker.value = threadCount
        writeCookie("threadCount", threadCount)
    }

    var notifyCheckbox = document.getElementById("notifToggle")
    var playNotifCookieVal = readCookie("playNotif")

    if (playNotifCookieVal) {
        playNotif = true
        notifyCheckbox.checked = true
    } else {
        playNotif = false
        notifyCheckbox.checked = false
    }

    if (getQueryVariable("inframe")) {
        document.documentElement.style.setProperty('--body', "rgb(0, 0, 0, 0");
        document.documentElement.style.setProperty('--background', "rgb(0, 0, 0, 0");
    }

    //setup listeners
    document.addEventListener('touchstart', handleTouchStart, false);        
    document.addEventListener('touchmove', handleTouchMove, false);
    
    threadPicker.addEventListener("input", readThreadCount)
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === "visible") {
            setFavicon(false)
        }
    })

    imgHolder = document.getElementById("currentImage");
    imgHolder.crossOrigin = "anonymous";

    imgHolder.addEventListener("load", () => {
        setupScaling()
    })

    vidHolder = document.getElementById("currentVideo")
    audioHolder = document.getElementById("currentAudio")
    downloadLink = document.getElementById("currentDownload")

    document.onkeyup = function (e) {
        if (!controlsDisabled) {
            if (e.key == " " ||
                e.code == "Space" ||
                e.keyCode == 32
            ) {
                getNewImage()
            }
        }
    }

    const slider = document.getElementById("historyWheel")
    let isDown = false;
    let startX;
    let scrollLeft;

    slider.addEventListener('mousedown', (e) => {
        e.preventDefault()
        isDown = true;
        startX = e.pageX - slider.offsetLeft;
        scrollLeft = slider.scrollLeft;
    });
    slider.addEventListener('mouseleave', () => {
        isDown = false;
    });
    slider.addEventListener('mouseup', () => {
        isDown = false;
    });
    slider.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - slider.offsetLeft;
        const walk = (x - startX);
        slider.scrollLeft = scrollLeft - walk;
        console.log(walk);
    });
}

//#region fetching images

async function getNewImage() {
    disableControls(true)
    var label = document.getElementById("copyPrompt")
    label.innerHTML = "searching..."

    var selectedMimes = getSelections()
    if (selectedMimes == 0) {
        alert("You must select at least 1 file type")
        disableControls(false)
        return
    }

    var pool = []
    let idLabel = document.getElementById("idLabel")
    for (let i = 0; i < (threadCount); i++) {
        var newWorker = new Worker("worker.js")
        newWorker.addEventListener("message", function (msg) {
            var data = msg.data            

            switch (true) {
                case data.startsWith("@"):
                    idLabel.innerHTML = "ID: " + data.replace("@", "")
                    break;
                case data.startsWith("!"):
                    msg = data.replace("!", "")
                    showErrorToUser(msg)
                    pool.forEach((worker) => {
                        worker.terminate()
                    })
                    break;
                case data.startsWith("#"):
                    msg = data.replace("#", "")
                    console.log(msg)
                    break;
                default:
                    pool.forEach((worker) => {
                        worker.terminate()
                    })

                    var contentInfo = data.split(";")

                    disableControls(false)
                    label.innerHTML = "click to copy"
                    pushContent(contentInfo[0], contentInfo[1])         

                    if (playNotif) {
                        notify()
                    }
                    if (auto) {
                        getNewImage()
                    }
            }
        })
        pool.push(newWorker)
    }
    pool.forEach((worker) => {
        worker.postMessage(selectedMimes)
    })
}

// | Bit 1 | Bit 2  | Bit 3 | Bit 4  | Bit 5 |  Bit 6   |   Bit 7   |  Bit 8   | Bit 9 |
// |-------|--------|-------|--------|-------|----------|-----------|----------|-------|
// | Img   | extImg | vid   | extVid | audio | extAudio | Documents | archives | scary |
function getSelections() {
    var imgToggle = document.getElementById("imgToggle")
    var allImgToggle = document.getElementById("extImg")
    var vidToggle = document.getElementById("vidToggle")
    var allVidToggle = document.getElementById("extVid")
    var audioToggle = document.getElementById("audioToggle")
    var allAudioToggle = document.getElementById("extAudio")
    var docToggle = document.getElementById("docToggle")
    var arcToggle = document.getElementById("arcToggle")
    var scaryToggle = document.getElementById("scaryToggle")


    var bitGroup = 0

    if (imgToggle.checked) {
        bitGroup = setBit(bitGroup, 1)
        if (allImgToggle.checked) {
            bitGroup = setBit(bitGroup, 2)
        }
    }

    if (vidToggle.checked) {
        bitGroup = setBit(bitGroup, 3)
        if (allVidToggle.checked) {
            bitGroup = setBit(bitGroup, 4)
        }
    }

    if (audioToggle.checked) {
        bitGroup = setBit(bitGroup, 5)
        if (allAudioToggle.checked) {
            bitGroup = setBit(bitGroup, 6)
        }
    }

    if (docToggle.checked) {
        bitGroup = setBit(bitGroup, 7)
    }

    if (arcToggle.checked) {
        bitGroup = setBit(bitGroup, 8)
    }

    if (scaryToggle.checked) {
        bitGroup = setBit(bitGroup, 9)
    }

    return bitGroup
}

function getUrl(id, mime) {
    var url = "https://files.catbox.moe/" + id
    if (mime) {
        return url + "." + mime
    } 

    return url   
}

//#endregion

//#region manage current image
const scalingTypes = {
    fit: "fit",
    stretch: "stretch",
    nearestNeighbour: "nearestNeighbour"
}
var currentScaling = scalingTypes.fit

function pushContent(id, mime) {
    currentId = id
    currentMime = mime
    idLabel.innerHTML = "ID: " + currentId + "." + currentMime

    switch (true) {     
        case imgMimes.includes(currentMime):
            audioHolder.style.display = "none"
            downloadLink.style.display = "none"    
            vidHolder.style.display = "none"
            vidHolder.pause()    
            imgHolder.setAttribute("src", getUrl(currentId, currentMime)) 
            imgHolder.style.display = ""
            break;

        case vidMimes.includes(currentMime):
            imgHolder.style.display = "none"
            audioHolder.style.display = "none"
            downloadLink.style.display = "none"
            vidHolder.setAttribute("src", getUrl(currentId, currentMime)) 
            vidHolder.style.display = ""
            break;
        
        case audioMimes.includes(currentMime):
            downloadLink.style.display = "none"
            imgHolder.style.display = "none"    
            vidHolder.style.display = "none"
            vidHolder.pause()   
            audioHolder.setAttribute("src", getUrl(currentId, currentMime))
            audioHolder.style.display = ""
            break;

        default: 
            audioHolder.style.display = "none"
            imgHolder.style.display = "none"    
            vidHolder.style.display = "none"
            vidHolder.pause()  
            downloadLink.setAttribute("href", getUrl(currentId, currentMime))
            downloadLink.style.display = ""
            break;
    }

    pushHistory(currentId, currentMime)
}

function setupScaling() {
    imgHolder.removeAttribute("style")
    imgHolder.style.width = "100%"

    switch (currentScaling) {
        case scalingTypes.fit:
            imgHolder.style.maxWidth = imgHolder.naturalWidth + "px"
            break;

        case scalingTypes.stretch:
            imgHolder.style.imageRendering = "auto"
            break;

        case scalingTypes.nearestNeighbour:
            imgHolder.style.imageRendering = "pixelated"
            break;

        default:
    }
}

//#endregion

//#region manage history
const historyBuffer = []

function pushHistory(id, mime) {
    historyBuffer.unshift(id + ";" + mime)
    if (historyBuffer.length > 30) {
        historyBuffer.pop()
    }
    renderHistory()
}

function loadHistory(historyIndex) {
    var contentdata = historyBuffer[historyIndex].split(";")
    historyBuffer.splice(historyIndex, 1)
    pushContent(contentdata[0], contentdata[1])   
}

function renderHistory() {
    historyBuffer.forEach(function (contentInfo, index) {
        var elementId = "pastImg" + (index + 1)
        var historyButton = document.getElementById(elementId)
        var contentId = (contentInfo.split(";"))[0]
        var contentMime = contentInfo.split(";")[1]
        if (imgMimes.includes(contentMime)) {            
            historyButton.removeAttribute("style")
            historyButton.setAttribute("src", getUrl(contentId, contentMime))
        } else {
            historyButton.style.backgroundColor = getColourFromId(contentId)
            historyButton.style.padding = "10px"
            switch (true) {
        
                case vidMimes.includes(currentMime):
                    historyButton.src = "res/video.svg"
                    break;
                
                case audioMimes.includes(currentMime):
                    historyButton.src = "res/music.svg"
                    break;

                case docMimes.includes(currentMime):
                    historyButton.src = "res/document.svg"
                    break;

                case archiveMimes.includes(currentMime):
                    historyButton.src = "res/zip.svg"
                    break;

                case scaryMimes.includes(currentMime):
                    historyButton.src = "res/virus.svg"
                    break;
        
                default: 
                    historyButton.src = "res/idk.svg"
                    break;
            }
        }
        
    })
}
//#endregion

//#region manage settings
var controlsDisabled = false
var playNotif = false
var auto = false
var threadCount = 1

function disableControls(disable) {
    if (disable) {
        controlsDisabled = true
        document.getElementById("newImgButton").disabled = true;
    } else {
        controlsDisabled = false
        document.getElementById("newImgButton").disabled = false;
    }
}

function setThreadCount(num) {
    if (num % 1 == 0) {
        threadCount = num
        writeCookie("threadCount", threadCount)
    }
}

function toggleNotif() {
    playNotif = document.getElementById("notifToggle").checked
    writeCookie("playNotif", playNotif)
}
function toggleAuto() {
    auto = document.getElementById("autoToggle").checked
}

function showHistory(visible) {
    var divider = document.getElementById("historyExpander")
    var historyHolder = document.getElementById("historyWheel")
    var expandIcon = document.getElementById("expandIcon")
    if (visible) {
        historyHolder.style.display = "initial"
        expandIcon.style.transform = "rotate(180deg)"
        divider.setAttribute("onclick", "showHistory(false)")
        renderHistory()
    } else {
        historyHolder.style.display = "none"
        expandIcon.style.transform = "rotate(0deg)"
        divider.setAttribute("onclick", "showHistory(true)")
    }
}

function selectScaling() {
    switch (true) {
        case document.getElementById("fitRadio").checked:
            currentScaling = scalingTypes.fit
            break;
        case document.getElementById("stretchRadio").checked:
            currentScaling = scalingTypes.stretch
            break;
        case document.getElementById("NnRadio").checked:
            currentScaling = scalingTypes.nearestNeighbour
            break;
        default:
            currentScaling = scalingTypes.fit
    }

    setupScaling()
}

//#endregion

//#region UI functions
function setFavicon(isAlert) {
    var link = document.querySelector("link[rel~='icon']");
    if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
    }

    if (isAlert) {
        link.href = '../commonRes/alertFavicon.ico';
    } else {
        link.href = '../commonRes/favicon.ico'
    }
}

function notify() {
    var notifSound = ((Math.floor(Math.random() * 11)) == 1 ? "../commonRes/scorn.mp3" : "../commonRes/notif.wav")
    var audio = new Audio(notifSound);
    audio.play();

    if (document.visibilityState !== "visible") {
        setFavicon(true)
    }
}

function readThreadCount() {
    var threadPicker = document.getElementById("threadCountPicker")
    threadPicker.value = threadPicker.value.replace(/\D+/g, '');
    if (threadPicker.value > 32) {
        threadPicker.value = 32
    };
    if (threadPicker.value < 1) {
        threadPicker.value = 1
    }
    if (!threadPicker.value) {
        threadPicker.value = 1
    }

    setThreadCount(threadPicker.value)
}

function copyCurrentUrl() {
    if (!controlsDisabled) {
        var label = document.getElementById("copyPrompt")
        var success = true
        var urlToCopy = getUrl(currentId, currentMime)

        try {
            navigator.clipboard.writeText(urlToCopy)
            label.style.color = "greenyellow"
            label.innerHTML = "copied!"
        } catch (error) {
            label.style.color = "tomato"
            label.innerHTML = "error!"
            success = false
        }

        setTimeout(function () {
            label.removeAttribute("style")
            label.innerHTML = "click to copy"
        }, 300);

        return success
    }
}

function reportImage() {
    if (currentId == "") {
        alert("No image to report")
        return
    }
    
    var response = confirm("Are you sure you want to report this image? If you press \"OK\" the current images URL will be copied to your clipboard, and you will be redirected to imgurs removal request page.")

    if (response) {
        if (copyCurrentUrl()) {
            window.open("https://imgur.com/removalrequest", '_blank')
        } else {
            alert("Failed to copy current URL");
        }

    }
}

function getColourFromId(id) {
    //impossible to create colours with a 0 in anyt position, even if their saturation is above 50
    var components = []

    components.push(parseInt(id.substring(0,2), 36) % 256)
    components.push(parseInt(id.substring(2,4), 36) % 256)
    components.push(parseInt(id.substring(4,6), 36) % 256)

    console.log(components)

    var scale = (255 - 90) / (255 - 0)
    var hex= "#"

    for (var i = 0; i < components.length; i++) {
        var adjusted = Math.ceil(90 + (components[i] * scale))
        hex += adjusted.toString(16)
    }

    return hex
}

//#endregion

//#region cookies

function writeCookie(key, val) {
    document.cookie = key + "=" + val
}

function readCookie(key) {
    var nameEQ = key + "=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

//#endregion

//#region helpers

function arraysIdentical(a, b) {
    var i = a.length;
    if (i != b.length) return false;
    while (i--) {
        if (a[i] !== b[i]) return false;
    }
    return true;
};

function showErrorToUser(msg) {
    window.alert(msg);
    throw new Error(msg);
}

function getQueryVariable(variable)
{
       var query = window.location.search.substring(1);
       var vars = query.split("&");
       for (var i=0;i<vars.length;i++) {
               var pair = vars[i].split("=");
               if(pair[0] == variable){return pair[1];}
       }
       return(false);
}

function setBit(num, bit) {
    var mask = 1 << bit-1

    var result = num | mask
    return result
}

//#endregion

//#region gesture functions
var xDown = null;
var yDown = null;

function getTouches(evt) {
    return evt.touches
}

function handleTouchStart(evt) {
    const firstTouch = getTouches(evt)[0];
    xDown = firstTouch.clientX;
    yDown = firstTouch.clientY;

    setMobileMode(true)
};

function handleTouchMove(evt) {
    if (!controlsDisabled) {
        if (!xDown || !yDown) {
            return;
        }

        if (yDown < document.getElementById("header").clientHeight) {
            return;
        }

        var xUp = evt.touches[0].clientX;
        var yUp = evt.touches[0].clientY;

        var xDiff = xDown - xUp;
        var yDiff = yDown - yUp;

        if (Math.abs(xDiff) > Math.abs(yDiff)) {/*most significant*/
            if (xDiff > 0) {
                /* right swipe */
                getNewImage()
            } else {
                /* left swipe */
            }
        } else {
            if (yDiff > 0) {
                /* down swipe */
            } else {
                /* up swipe */
            }
        }
        /* reset values */
        xDown = null;
        yDown = null;
    }
};

function setMobileMode(enabled) {
    var section = document.getElementById("section")

    var children = section.querySelectorAll("*")
    children.forEach((child) => {
        if (enabled) {
            child.classList.add("mobile")
        } else {
            child.classList.remove("mobile")
        }
    })

}
//#endregion