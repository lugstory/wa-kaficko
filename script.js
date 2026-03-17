const API = "http://lmpss3.dev.spsejecna.net/procedure.php";

const userSelect = document.getElementById("userSelect");
const drinksContainer = document.getElementById("drinksContainer");
const saveBtn = document.getElementById("saveBtn");
const message = document.getElementById("message");

let drinksList = [];
let isOffline = false;
let offlineInterval;
let countdown = 5;
let currentInputs = {};

function saveCurrentInputs() {
    currentInputs = {};
    document.querySelectorAll("input[type=number]").forEach(input => {
        currentInputs[input.dataset.type] = input.value;
    });
}

function restoreCurrentInputs() {
    document.querySelectorAll("input[type=number]").forEach(input => {
        if (currentInputs[input.dataset.type]) {
            input.value = currentInputs[input.dataset.type];
        }
    });
}

function startOfflineMode() {
    if (isOffline) return;
    isOffline = true;
    message.textContent = "Režim offline, znovu načítám za 5s";
    countdown = 5;
    offlineInterval = setInterval(() => {
        countdown--;
        message.textContent = `Režim offline, znovu načítám za ${countdown}s`;
        if (countdown <= 0) {
            saveCurrentInputs();
            loadUsers();
            loadDrinks().then(() => restoreCurrentInputs());
            countdown = 5;
        }
    }, 1000);
}

function stopOfflineMode() {
    if (!isOffline) return;
    isOffline = false;
    clearInterval(offlineInterval);
    message.textContent = "";
    sendPendingData();
}

window.addEventListener('offline', startOfflineMode);
window.addEventListener('online', stopOfflineMode);

// Kontrola při načtení
if (!navigator.onLine) {
    startOfflineMode();
}

async function loadUsers() {
    try {
        const res = await fetch(`${API}?cmd=getPeopleList`);
        const usersObj = await res.json();

        console.log("Users:", usersObj);

        const users = Object.values(usersObj);

        userSelect.innerHTML = "";

        users.forEach(user => {
            const option = document.createElement("option");
            option.value = user.ID;
            option.textContent = user.name;
            userSelect.appendChild(option);
        });

        // Uložit do localStorage pro offline
        localStorage.setItem("users", JSON.stringify(usersObj));

        loadStoredUser();
        stopOfflineMode();

    } catch (err) {
        console.error("Chyba users:", err);
        message.textContent = "❌ Nepodařilo se načíst uživatele";

        // Načíst z localStorage
        const storedUsers = localStorage.getItem("users");
        if (storedUsers) {
            const usersObj = JSON.parse(storedUsers);
            const users = Object.values(usersObj);

            userSelect.innerHTML = "";

            users.forEach(user => {
                const option = document.createElement("option");
                option.value = user.ID;
                option.textContent = user.name;
                userSelect.appendChild(option);
            });

            loadStoredUser();
            message.textContent = "⚠️ Načteno z cache (offline)";
        }
    }
}

async function loadDrinks() {
    try {
        const res = await fetch(`${API}?cmd=getTypesList`);
        const drinksObj = await res.json();

        console.log("Drinks:", drinksObj);

        const drinks = Object.values(drinksObj);
        drinksList = drinks;

        drinksContainer.innerHTML = "";

        drinks.forEach(drink => {
            const div = document.createElement("div");
            div.className = "drink";

            div.innerHTML = `
    <span class="drink-name">${drink.typ}</span>
    <div class="counter">
        <button class="minus">−</button>
        <input type="number" min="0" value="0" data-type="${drink.typ}" readonly>
        <button class="plus">+</button>
    </div>
`;

            drinksContainer.appendChild(div);
        });

        document.querySelectorAll(".drink").forEach(div => {
            const input = div.querySelector("input");
            div.querySelector(".plus").addEventListener("click", () => {
                input.value = parseInt(input.value) + 1;
            });
            div.querySelector(".minus").addEventListener("click", () => {
                input.value = Math.max(0, parseInt(input.value) - 1);
            });
        });

        restoreCurrentInputs();

        // Uložit do localStorage pro offline
        localStorage.setItem("drinks", JSON.stringify(drinksObj));
        stopOfflineMode();

    } catch (err) {
        console.error("Chyba drinks:", err);
        message.textContent = "❌ Nepodařilo se načíst drinky";

        // Načíst z localStorage
        const storedDrinks = localStorage.getItem("drinks");
        if (storedDrinks) {
            const drinksObj = JSON.parse(storedDrinks);
            const drinks = Object.values(drinksObj);
            drinksList = drinks;

            drinksContainer.innerHTML = "";

            drinks.forEach(drink => {
                const div = document.createElement("div");
                div.className = "drink";

                div.innerHTML = `
    <span class="drink-name">${drink.typ}</span>
    <div class="counter">
        <button class="minus">−</button>
        <input type="number" min="0" value="0" data-type="${drink.typ}" readonly>
        <button class="plus">+</button>
    </div>
`;

                drinksContainer.appendChild(div);
            });

            document.querySelectorAll(".drink").forEach(div => {
                const input = div.querySelector("input");
                div.querySelector(".plus").addEventListener("click", () => {
                    input.value = parseInt(input.value) + 1;
                });
                div.querySelector(".minus").addEventListener("click", () => {
                    input.value = Math.max(0, parseInt(input.value) - 1);
                });
            });

            message.textContent = "⚠️ Načteno z cache (offline)";
            restoreCurrentInputs();
        }
    }
}

function storeUser(userId) {
    localStorage.setItem("lastUser", userId);
    sessionStorage.setItem("lastUser", userId);
    document.cookie = `lastUser=${userId}; path=/`;
}

function loadStoredUser() {
    let user =
        localStorage.getItem("lastUser") ||
        sessionStorage.getItem("lastUser");

    if (!user) {
        const cookies = document.cookie.split("; ");
        const found = cookies.find(row => row.startsWith("lastUser="));
        if (found) user = found.split("=")[1];
    }

    if (user) userSelect.value = user;
}

async function sendPendingData() {
    const pending = JSON.parse(localStorage.getItem("pendingDrinks") || "[]");
    if (pending.length === 0) return;

    const newPending = [];
    for (const payload of pending) {
        try {
            await fetch(`${API}?cmd=saveDrinks`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });
            console.log("Odesláno pending:", payload);
        } catch (err) {
            console.error("Stále chyba odeslání pending:", err);
            newPending.push(payload);
        }
    }

    localStorage.setItem("pendingDrinks", JSON.stringify(newPending));
    if (newPending.length === 0) {
        message.textContent = "✅ Synchronizováno!";
        setTimeout(() => message.textContent = "", 2000);
    }
}

async function saveData() {

    const selectedUser = userSelect.value;
    storeUser(selectedUser);

    const inputs = document.querySelectorAll("input[type=number]");
    const drinks = [];

    inputs.forEach(input => {
        drinks.push({
            type: input.dataset.type,
            value: parseInt(input.value)
        });
    });

    const payload = {
        user: selectedUser,
        drinks: drinks
    };

    console.log("Odesílám:", payload);

    try {
        await fetch(`${API}?cmd=saveDrinks`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        message.textContent = "✅ Uloženo!";
        setTimeout(() => message.textContent = "", 2000);

        inputs.forEach(input => input.value = 0);

    } catch (err) {
        console.error("Chyba ukládání:", err);
        message.textContent = "❌ Chyba při ukládání - uloženo offline";

        // Uložit do localStorage pro pozdější odeslání
        let pending = JSON.parse(localStorage.getItem("pendingDrinks") || "[]");
        pending.push(payload);
        localStorage.setItem("pendingDrinks", JSON.stringify(pending));
    }
}

saveBtn.addEventListener("click", saveData);

window.addEventListener('online', sendPendingData);

loadUsers();
loadDrinks().then(() => sendPendingData());