export async function loadDropdownFromTSV(url, dropdownId, handler = (x) => console.log(x)) {
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
                option.value = values;
                option.textContent = values[0];
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
