// `change` does not fire on <datalist> elements, only on the associated
// <input>. Listen on `document` (delegated) because the theme re-renders the
// body while processing includes, which replaces input elements and would
// drop directly attached listeners.
const dataListHandlers = new Map();
let delegatedChangeHandlerAttached = false;

function ensureDelegatedChangeHandler() {
    if (delegatedChangeHandlerAttached) {
        return;
    }
    delegatedChangeHandlerAttached = true;
    document.addEventListener('change', async (event) => {
        // Convention: datalist_x is used by input_x.
        const inputId = event.target.id || "";
        if (!inputId.startsWith("input_")) {
            return;
        }
        const handler = dataListHandlers.get("datalist_" + inputId.substring("input_".length));
        if (handler) {
            await handler(event.target.value);
        }
    });
}

export async function loadDataListFromTSV(url, dataListId, textMaker = (x) => x, valueMaker = (x) => x, handler = (x) => console.log(x), initValue = null, ignoreHeader = true) {
    console.log("Entering loadDataListFromTSV", dataListId);
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.text();
        let lines = data.split('\n');
        if (ignoreHeader) {
            lines = lines.slice(1);
        }

        const dataList = document.getElementById(dataListId);
        if (!dataList) {
            console.error("No datalist element with id", dataListId);
            return;
        }

        let fragment = document.createDocumentFragment();

        lines.forEach(line => {
            const values = line.split('\t');
            if (values[0]) {
                const option = document.createElement('option');
                option.value = valueMaker(line.trim());
                option.textContent = textMaker(line);
                if (initValue == option.value) {
                    option.setAttribute('selected', "")
                }
                fragment.appendChild(option);
            }
        });
        dataList.appendChild(fragment);
        if (initValue) {
            // Set the attribute as well: the value property alone is lost when
            // the body html is re-written while processing includes.
            const input = document.getElementById(dataListId.replace("datalist_", "input_"));
            if (input) {
                input.value = initValue;
                input.setAttribute("value", initValue);
            }
        }
        dataListHandlers.set(dataListId, handler);
        ensureDelegatedChangeHandler();

    } catch (error) {
        console.error('There was a problem with the fetch operation:', error);
    }
    console.log("Exiting loadDataListFromTSV", dataListId);
}


export async function loadDropdownFromTSV(url, dropdownId, textMaker = (x) => x, valueMaker = (x) => x, handler = (x) => console.log(x), initValue = null, ignoreHeader = true) {
    console.log("Entering loadDropdownFromTSV");
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.text();
        let lines = data.split('\n');
        if (ignoreHeader) {
            lines = lines.slice(1);
        }

        const dropdown = document.getElementById(dropdownId);
        if (!dropdown) {
            console.error("No dropdown element with id", dropdownId);
            return;
        }
        dropdown.innerHTML = ''; // Clear any existing options
        lines.forEach(line => {
            const values = line.split('\t');
            if (values[0]) {
                const option = document.createElement('option');
                option.value = valueMaker(line.trim());
                option.textContent = textMaker(line);
                if (initValue == option.value) {
                    option.setAttribute('selected', "")
                }
                dropdown.appendChild(option);
            }
        });

        dropdown.addEventListener('change', async (event) => {
            const selectedValue = event.target.value;
            await handler(selectedValue);
        });

    } catch (error) {
        console.error('There was a problem with the fetch operation:', error);
    }
}
