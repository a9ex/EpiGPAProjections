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
    const divOuter = document.createElement('div');
    const divInner = document.createElement('div');
    const spanResizer = document.createElement('span');
    const spanUpDown = document.createElement('span');
    const label = document.createElement('label');

    divOuter.appendChild(divInner);
    divInner.appendChild(spanResizer);
    divInner.appendChild(spanUpDown);
    divInner.appendChild(label);

    spanResizer.classList.add('resizer');
    spanUpDown.classList.add('updown');
    label.textContent = 'Projection Grade';
    label.style.color = 'green';

    newColumnHeader.appendChild(divOuter);
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

        const select = document.createElement('select');
        select.classList.add('select');
        select.setAttribute('credit', row.children[3].textContent.trim());
        select.setAttribute('module', row.children[5].textContent.trim());
        select.setAttribute('instance', row.children[0].children[0].getAttribute("href").split("/")[4]);
        select.setAttribute('year', row.children[4].textContent.trim());

        const optionDefault = document.createElement('option');
        optionDefault.value = '-';
        optionDefault.textContent = '-';
        select.appendChild(optionDefault);

        const optionAcquis = document.createElement('option');
        optionAcquis.value = 'Acquis';
        optionAcquis.textContent = 'Acquis';
        select.appendChild(optionAcquis);

        if (row.children[5].textContent.trim() !== "G-EPI-030") {
            const optionA = document.createElement('option');
            optionA.value = 'A';
            optionA.textContent = 'A';
            select.appendChild(optionA);

            const optionB = document.createElement('option');
            optionB.value = 'B';
            optionB.textContent = 'B';
            select.appendChild(optionB);

            const optionC = document.createElement('option');
            optionC.value = 'C';
            optionC.textContent = 'C';
            select.appendChild(optionC);

            const optionD = document.createElement('option');
            optionD.value = 'D';
            optionD.textContent = 'D';
            select.appendChild(optionD);

            const optionEchec = document.createElement('option');
            optionEchec.value = 'Echec';
            optionEchec.textContent = 'Echec';
            select.appendChild(optionEchec);
        }

        newColumn.appendChild(select);

        select.addEventListener("mouseup", event => event.stopPropagation(), true);
        select.addEventListener("mousedown", event => event.stopPropagation(), true);

        row.insertBefore(newColumn, row.children[3]);

        // We need to compare the year AND the instance because the same module can be taken multiple times (e.g. JAM / English)
        // If we don't compare the instance, we might end up changing the grade of all the instances of the JAM / English module
        const currentGrade = gradesData.modules.find(grade => grade.codemodule === row.children[6].textContent.trim() && grade.scolaryear == row.children[5].textContent.trim() && grade.codeinstance === row.children[0].children[0].getAttribute("href").split("/")[4]).grade;
        const selectSelector = newColumn.querySelector("select");
        const options = selectSelector.querySelectorAll("option");
        let found = false;

        for (let j = 0; j < options.length; j++) {
            if (options[j].value === currentGrade) {
                options[j].setAttribute("selected", "selected");
                found = true;
            }
        }
        if (!found) {
            options[5].setAttribute("selected", "selected");
            consoleLog("Could not find grade in select options");
        }

        selectSelector.addEventListener("change", onChangeGPA);
    }
}

function onChangeGPA() {
    const table = document.querySelector("#user-module > div.overflow > div > table");
    const tableRows = table.querySelectorAll("tr");

    for (let i = 2; i < tableRows.length; i++) {
        const row = tableRows[i];
        const select = row.children[3].querySelector("select");
        const newGrade = select.options[select.selectedIndex].value;
        const module = select.getAttribute("module");

        gradesData.modules = gradesData.modules.map(grade => {
            // We need to compare the year AND the instance because the same module can be taken multiple times (e.g. JAM / English)
            // If we don't compare the instance, we might end up changing the grade of all the instances of the JAM / English module
            if (grade.codemodule === module && grade.codeinstance === select.getAttribute("instance") && grade.scolaryear == select.getAttribute("year")) {
                grade.grade = newGrade;
            }
            return grade;
        });
    }

    const computedGPA = computeGPA(gradesData);
    editGPA(computedGPA);
}

async function injectGPA(gpa = "-") {
    const noteZone = document.querySelector("#profil > div.bloc.top > div.rzone > span");

    const gpaLabel = document.createElement("label");
    gpaLabel.textContent = "G.P.A. Projection";
    gpaLabel.style.color = "green";

    noteZone.appendChild(gpaLabel);

    const gpaValue = document.createElement("span");
    gpaValue.className = "value";
    gpaValue.style.color = "green";

    const textNode = document.createTextNode(gpa);

    while (gpaValue.firstChild) {
        gpaValue.removeChild(gpaValue.firstChild);
    }

    gpaValue.appendChild(textNode);

    noteZone.appendChild(gpaValue);

    const studentGrades = await getStudentGrades();
    const computedGPA = computeGPA(studentGrades);
    editGPA(computedGPA);
}

function editGPA(gpa) {
    const gpaValue = document.querySelector("#profil > div.bloc.top > div.rzone > span > span:nth-child(6)");

    if (!gpaValue) {
        consoleLog("No custom GPA value found");
        return;
    }

    const textNode = document.createTextNode(gpa);

    while (gpaValue.firstChild) {
        gpaValue.removeChild(gpaValue.firstChild);
    }

    gpaValue.appendChild(textNode);

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
        consoleLog("No cookie or login found");
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
        consoleLog(`- v${chrome.runtime.getManifest().version}`);
        consoleLog("Injecting GPA Projection script...")

        injectGPA();
        getStudentGrades();
    }
})();
