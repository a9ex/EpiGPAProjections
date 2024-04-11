function getIntranetCookie(sendResponse) {
    chrome.cookies.getAll({}, function (cookies) {
        const cookie = cookies.find(cookie => cookie.name === 'user');
        if (cookie) {
            sendResponse({ cookie: cookie.value });
        } else {
            sendResponse({ error: "No intranet cookie found" });
        }
    });
}


chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.command === "getIntranetCookie") {
        getIntranetCookie(sendResponse);
        return true;
    }
});