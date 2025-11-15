/**
 * Creates a Bootstrap dropdown and sets up change event handling.
 * @param {string} dropdown_button_id - ID of the dropdown toggle button.
 * @param {string[]} options - Array of option strings.
 * @param {function} dropdownChangeHandler - Callback when an option is selected.
 */
function dropdownCreator(dropdown_button_id, options, dropdownChangeHandler) {
  const dropdownButton = document.getElementById(dropdown_button_id);
  const dropdownMenu = dropdownButton.nextElementSibling;

  // Clear previous menu items if any
  dropdownMenu.innerHTML = '';

  // Populate the dropdown
  options.forEach(option => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.className = 'dropdown-item';
    a.href = '#';
    a.textContent = option;
    a.addEventListener('click', (event) => {
      event.preventDefault();
      dropdownButton.textContent = option; // Update button text
      dropdownChangeHandler(option); // Trigger callback
    });
    li.appendChild(a);
    dropdownMenu.appendChild(li);
  });
}

let EDIT_STATES =  ['Edit Mode', 'Move Mode', 'Delete Mode'];

function stateChangeHandler(selectedState) {
  alert(`State changed to: ${selectedState}`);
}

dropdownCreator('stateSelectDropdown',EDIT_STATES,stateChangeHandler);
