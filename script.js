const API = "http://lmpss3.dev.spsejecna.net/procedure.php";

const userSelect = document.getElementById("userSelect");
const drinksContainer = document.getElementById("drinksContainer");
const saveBtn = document.getElementById("saveBtn");
const message = document.getElementById("message");

let drinksList = [];

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

        loadStoredUser();

    } catch (err) {
        console.error("Chyba users:", err);
        message.textContent = "❌ Nepodařilo se načíst uživatele";
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

    } catch (err) {
        console.error("Chyba drinks:", err);
        message.textContent = "❌ Nepodařilo se načíst drinky";
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
        message.textContent = "❌ Chyba při ukládání";
    }
}

saveBtn.addEventListener("click", saveData);

loadUsers();
loadDrinks();