let previousPage = 1;

function selectPage(desiredPage){
    if (document.body.classList.contains("blockAnim")) {
        document.body.removeAttribute("class")
    }
    console.log(previousPage," to ",desiredPage)
    assignTabClasses(desiredPage);
    theSlider(desiredPage);
    assignPageOrder(desiredPage);
    assignBackgroundColor(desiredPage);
    previousPage = desiredPage;
}

function assignTabClasses(desiredPage){
    var bladeTabs = document.querySelectorAll(".bladeTab")
    for(let i = 0; i < bladeTabs.length; i++){
        bladeTabs[i].classList.remove("left","right","active")
        if (i < desiredPage){
            bladeTabs[i].classList.add("left");
        }
        if (i === desiredPage){
            bladeTabs[i].classList.add("left","active");
        }
        if (i > desiredPage){
            bladeTabs[i].classList.add("right");
        }
    }
}
function theSlider(desiredPage){
    sliders = document.querySelectorAll(".slider");
    for(let i = 0; i < sliders.length; i++){
        sliders[i].classList.remove("left","right")
        if (i <= desiredPage){
            sliders[i].classList.add("left");
        }
        if (i > desiredPage){
            sliders[i].classList.add("right");
        }
    }
}
function assignPageOrder(desiredPage){
    selectedPageName = 'page'+desiredPage
    var pages = document.querySelectorAll(".page")
    var pageViewBox = document.querySelector("#pageViewBox");
    pageViewBox.className = "";
    pageViewBox.classList.add(selectedPageName);
    pages.forEach(page => {
        if (page.id != selectedPageName) {
            page.setAttribute("style", "display: none;")
        } else {
            page.removeAttribute("style")
        }
    })
}

function assignBackgroundColor(desiredPage){
    backgroundColor = document.querySelector("#backgroundColor");
    backgroundColor.className= "";
    backgroundColor.classList.add('page'+desiredPage);
}