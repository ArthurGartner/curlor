const options = ["color", "background", "colorHover", "backgroundHover"];

document.addEventListener("DOMContentLoaded", function () {
  const switches = document.querySelectorAll(".switch");
  const promises = options.map(
    (option) =>
      new Promise((resolve) => {
        document.getElementById(option).addEventListener("click", function () {
          var toggleState = this.checked;
          chrome.storage.local.set({ [option]: toggleState });
        });

        chrome.storage.local.get([option], function (data) {
          document.getElementById(option).checked = data[option] || false;
          resolve(); // resolve the promise when done
        });
      })
  );

  Promise.all(promises).then(() => {
    setTimeout(() => {
      switches.forEach((switchElement) => {
        switchElement.classList.add("animate"); // re-enable animations
      });
    }, 500);
  });
});

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

function disableCheckbox(element) {
  element.disabled = true;
}

function enableCheckbox(element) {
  element.disabled = false;
}
