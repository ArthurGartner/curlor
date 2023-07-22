//Setup the options, each option correlates to an element id for the popup html
const options = ["color", "background", "colorHover", "backgroundHover"];

document.addEventListener("DOMContentLoaded", function () {
  const switches = document.querySelectorAll(".switch");
  //Iterate through each item in options to add correct eventlistener
  const promises = options.map(
    (option) =>
      new Promise((resolve) => {
        document.getElementById(option).addEventListener("click", function () {
          var toggleState = this.checked;
          chrome.storage.local.set({ [option]: toggleState });
        });

        //Query chrome storage for state of current option. This allows for persistance
        chrome.storage.local.get([option], function (data) {
          const parent = document.getElementById(option);
          parent.checked = data[option] || false;
          const hoverId = option + "Hover";
          var elem = document.getElementById(hoverId);
          if (!parent.checked && elem != null) disableCheckbox(elem);
          resolve(); // resolve the promise when done
        });
      })
  );

  //Added this to fix animated toggle swicth, animate class added after switches have event listeners added
  Promise.all(promises).then(() => {
    setTimeout(() => {
      switches.forEach((switchElement) => {
        switchElement.classList.add("animate"); // re-enable animations
      });
    }, 500);
  });
});

//Re-evaluate state of toggle upon local storage change
chrome.storage.onChanged.addListener(function (changes, namespace) {
  chrome.storage.local.get(["color"]).then((value) => {
    const colorCheckbox = document.getElementById("colorHover");
    if (value.color) enableCheckbox(colorCheckbox);
    else disableCheckbox(colorCheckbox);
  });

  chrome.storage.local.get(["background"]).then((value) => {
    const backgroundCheckbox = document.getElementById("backgroundHover");
    if (value.background) enableCheckbox(backgroundCheckbox);
    else disableCheckbox(backgroundCheckbox);
  });
});

// Disable checkbox, used for when parent switch is off
function disableCheckbox(element) {
  element.disabled = true;
}

// Enable checkbox, used for when parent switch is on
function enableCheckbox(element) {
  element.disabled = false;
}
