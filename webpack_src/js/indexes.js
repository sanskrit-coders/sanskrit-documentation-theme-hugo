export async function loadDropdownFromTSV(url, dropdownId, textMaker = (x) => x, valueMaker = (x) => x, handler = (x) => console.log(x), queryValue = null) {
    console.log("Entering loadDropdownFromTSV");
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.text();
        const lines = data.split('\n');

        const dropdown = document.getElementById(dropdownId);
        lines.forEach(line => {
            const values = line.split('\t');
            if (values[0]) {
                const option = document.createElement('option');
                option.value = valueMaker(line);
                option.textContent = textMaker(line);
                dropdown.appendChild(option);
            }
        });
        if (queryValue) {
            dropdown.value = queryValue;
            console.log(`Set dropdown ${dropdownId} to ${queryValue}`);
        } else {
            console.log(`Not setting dropdown ${dropdownId} selection.`);
        }
        dropdown.addEventListener('change', async (event) => {
            const selectedValue = event.target.value;
            await handler(selectedValue);
        });

    } catch (error) {
        console.error('There was a problem with the fetch operation:', error);
    }
}
