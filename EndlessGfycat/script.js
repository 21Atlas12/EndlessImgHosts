var imgHolder = null
var vidHolder = null
var currentId = ""
var currentMime = ""

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

    var mp4OnlyCheckbox = document.getElementById("mp4OnlyToggle")
    mp4Only = readCookie("mp4Only")
    mp4OnlyCheckbox.checked = mp4Only

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
                    if (mp4Only) {
                        contentInfo[1] = "mp4"
                    }
                    
                    pushContent(contentInfo[0], contentInfo[1])

                    if (playNotif) {
                        notify()
                    }
            }
        })
        pool.push(newWorker)
    }
    pool.forEach((worker) => {
        worker.postMessage("start")
    })
}

function getUrl(id, mime, asThumbnail) {
    if (asThumbnail) {
        return "https://thumbs.gfycat.com/" + id + "-poster.jpg"
    }
    if (mime == "mp4") {
        return "https://giant.gfycat.com/"+ id + ".mp4"
    }
    if (mime == "page") {
        return "https://gfycat.com/" + id
    }
    
    return "https://thumbs.gfycat.com/" + id + "-size_restricted.gif"
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
    idLabel.innerHTML = "ID: " + currentId

    if(currentMime == "mp4") {
        imgHolder.style.display = "none"
        vidHolder.setAttribute("src", getUrl(currentId, "mp4")) 
        vidHolder.style.display = ""
    } else {
        vidHolder.style.display = "none"
        vidHolder.pause()    
        imgHolder.setAttribute("src", getUrl(currentId, "png")) 
        imgHolder.style.display = ""
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
    var contentData = historyBuffer[historyIndex].split(";")
    historyBuffer.splice(historyIndex, 1)
    pushContent(contentData[0], contentData[1])      
}

function renderHistory() {
    historyBuffer.forEach(function (contentInfo, index) {
        var elementId = "pastImg" + (index + 1)
        var contentId = (contentInfo.split(";"))[0]
        document.getElementById(elementId).setAttribute("src", getUrl(contentId, "png", true))
    })
}
//#endregion

//#region manage settings
var controlsDisabled = false
var playNotif = false
var threadCount = 1
var mp4Only = false

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

function toggleMp4Only() {
    if (document.getElementById("mp4OnlyToggle").checked) {
        mp4Only = true
    } else {
        mp4Only = false
    }
    writeCookie("mp4Only", mp4Only)
}

function toggleNotif() {
    playNotif = document.getElementById("notifToggle").checked
    writeCookie("playNotif", playNotif)
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
    var response = confirm("Are you sure you want to report this image? If you press \"OK\" you will be redirected to the gfycat page for this image, once there, click the 3 dots below the gif to report it")

    if (response) {
        window.open(getUrl(currentId, "page"))
    }
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