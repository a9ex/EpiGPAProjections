console.log("Extension loaded!")

console.log("Injecting script...")

async function getIntranetCookie() {
    const repsonse = await chrome.runtime.sendMessage({ command: "getIntranetCookie" });
    return repsonse;
}

function getIntranetLogin() {
    const uri = window.location.href;

    if (!uri.includes("/user")) {
        return null;
    }

    const login = document.evaluate(
        '//*[@id="profil"]/div[3]/div/div[3]/div[1]/span',
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
    ).singleNodeValue;
    return login ? login.textContent.trim() : null;
}

console.log(getIntranetLogin());