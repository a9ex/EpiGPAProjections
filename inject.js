let gradesData = {};

function consoleLog(text) {
    console.log(`%c [Epitech GPA Extension] ${text}`, "color: cyan");
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getIntranetCookie() {
    const repsonse = await chrome.runtime.sendMessage({ command: "getIntranetCookie" });
    return repsonse.cookie ?? null;
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

async function injectTableColumn() {
    await sleep(500);
    const table = document.querySelector("#user-module > div:nth-child(1) > table");
    const tableRows = table.querySelectorAll("tr");

    if (tableRows[0].children[3].textContent.trim() === "Projection Grade") {
        consoleLog("Intranet is so bad that it already has the column... skipping...")
        return;
    }

    const newColumnHeader = document.createElement("th");
    newColumnHeader.style.width = "75px";
    newColumnHeader.innerHTML = '<div><div><span class="resizer"></span><span class="updown"></span><label>Projection Grade</label></div></div>';
    tableRows[0].insertBefore(newColumnHeader, tableRows[0].children[3]);

    const tableWhat = document.querySelector("#user-module > div.overflow > div > table");
    const tableWhatRows = tableWhat.querySelectorAll("tr");

    const newColumnHeaderWhat = document.createElement("th");
    newColumnHeaderWhat.style.width = "75px";
    tableWhatRows[0].insertBefore(newColumnHeaderWhat, tableWhatRows[0].children[3]);
}

async function injectTableData() {
    await sleep(500);
    const table = document.querySelector("#user-module > div.overflow > div > table");
    const tableRows = table.querySelectorAll("tr");

    for (let i = 2; i < tableRows.length; i++) {
        const row = tableRows[i];

        const newColumn = document.createElement("td");
        newColumn.className = "grade projection";
        newColumn.setAttribute("tabindex", "0");
        newColumn.innerHTML = `<select class="select" credit="${row.children[3].textContent.trim()}" module="${row.children[5].textContent.trim()}"> <option value="-">-</option> <option value="Acquis">Acquis</option> <option value="A">A</option> <option value="B">B</option> <option value="C">C</option> <option value="D">D</option> <option value="Echec">Echec</option> </select>`;
        row.insertBefore(newColumn, row.children[3]);
    }
}

async function injectGPA(gpa = "-") {
    const noteZone = document.querySelector("#profil > div.bloc.top > div.rzone > span");

    const gpaLabel = document.createElement("label");
    gpaLabel.innerHTML = "G.P.A. Projection";
    gpaLabel.style.color = "green";
    noteZone.appendChild(gpaLabel);

    const gpaValue = document.createElement("span");
    gpaValue.className = "value";
    gpaValue.style.color = "green";
    gpaValue.innerHTML = gpa;
    noteZone.appendChild(gpaValue);

    const studentGrades = await getStudentGrades();
    const computedGPA = computeGPA(studentGrades);
    editGPA(computedGPA);
}

function editGPA(gpa) {
    const gpaValue = document.querySelector("#profil > div.bloc.top > div.rzone > span > span:nth-child(6)");

    if (!gpaValue) {
        console.error("No custom GPA value found");
        return;
    }

    gpaValue.innerHTML = gpa;
}

function computeGPA(grades) {
    const gradeMappping = {
        "A": 4,
        "B": 3,
        "C": 2,
        "D": 1,
    };

    const gradesToBypass = ["-", "Acquis"];

    const totalAcquiredCredits = grades.modules.reduce((acc, grade) => {
        return acc + parseFloat(gradesToBypass.includes(grade.grade) ? 0 : grade.credits);
    }, 0);

    const gpa = grades.modules.reduce((acc, grade) => {
        if (gradesToBypass.includes(grade.grade)) {
            return acc;
        }

        const gradeValue = parseFloat(grade.credits);
        const gradeWeight = parseFloat(gradeMappping[grade.grade] ?? 0);

        return acc + (gradeValue * gradeWeight);
    }, 0);

    return (gpa / totalAcquiredCredits).toFixed(2);
}

async function getStudentGrades() {
    const cookie = await getIntranetCookie();
    const login = getIntranetLogin();

    if (!cookie || !login) {
        console.error("No cookie or login found");
        return;
    }

    const response = await fetch(`https://intra.epitech.eu/user/${login}/notes?format=json`, {
        headers: {
            "Cookie": `user=${cookie},${document.cookie}`
        }
    });

    const data = await response.json();
    gradesData = data;
    return data;
}

window.navigation.addEventListener("navigate", (event) => {
    const uri = event.destination.url;

    if (uri.includes("/user/#!/notes")) {
        consoleLog("Injecting table column and data...");
        injectTableColumn();
        injectTableData();
    }
});

(() => {
    if (window.location.href.includes("/user/#!/notes")) {
        consoleLog("Injecting table column and data...");
        injectTableColumn();
        injectTableData();
    }

    if (window.location.href.includes("/user")) {
        consoleLog("Injecting GPA Projection script...")

        consoleLog("Preventing intranet from adding event listeners that fucks up the extension...");

        document.addEventListener("mouseup", event => event.stopPropagation(), true);
        document.addEventListener("mousedown", event => event.stopPropagation(), true);
        document.addEventListener("mousemove", event => event.stopPropagation(), true);

        consoleLog("Injecting GPA module...");
        injectGPA();
        getStudentGrades();
    }
})();