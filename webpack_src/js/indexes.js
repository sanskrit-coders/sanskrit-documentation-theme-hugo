export async function loadDropdownFromTSV(url, dropdownId, textMaker = (x) => x, valueMaker = (x) => x, handler = (x) => console.log(x), queryValue = null, ignoreHeader=true) {
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
        dropdown.innerHTML = ''; // Clear any existing options
        lines.forEach(line => {
            const values = line.split('\t');
            if (values[0]) {
                const option = document.createElement('option');
                option.value = valueMaker(line.trim());
                option.textContent = textMaker(line);
                if (queryValue == option.value) {
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
