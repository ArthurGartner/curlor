const options = ["color", "background", "hover"];

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
