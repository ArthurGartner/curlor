//Main function to render extension side
function render() {
  //These option correspond to html element ids
  var options = ["color", "background", "colorHover", "backgroundHover"];

  //Adding listeners to each input to establish click functionality
  document.addEventListener("DOMContentLoaded", function () {
    const switches = document.querySelectorAll(".switch");
    //Iterate through each item in options to add correct eventlistener
    const promises = options.map(
      (option) =>
        new Promise((resolve) => {
          document
            .getElementById(option)
            .addEventListener("click", function () {
              var toggleState = this.checked;
              chrome.storage.local.set({ [option]: toggleState });
            });

          //Query chrome storage for state of current option. This allows for persistance through browser uses
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

    const domainInput = document.getElementById("domainInput");

    // Set the placeholder value
    domainInput.placeholder = "Enter a domain here";

    // Get the current domain and populate the input
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const url = new URL(tabs[0].url);
      const domain = url.hostname;

      if (domain) {
        domainInput.value = domain;
      } else {
        domainInput.value = "";
      }
    });

    // Clear the placeholder text when input is focused
    domainInput.addEventListener("focus", function () {
      if (domainInput.value === "Enter a domain here") {
        domainInput.value = "";
      }
    });

    // Reset the placeholder text if the input is empty on blur
    domainInput.addEventListener("blur", function () {
      if (!domainInput.value.trim()) {
        domainInput.value = "Enter a domain here";
      }
    });

    //Setup of return button
    var returnButton = document.getElementById("btn-return");
    returnButton.addEventListener("click", function () {
      hideWhitelist();
      render();
    });

    //Setup of show whitelist domains button
    var whitelistButton = document.getElementById("btn-show-whitelist");
    whitelistButton.addEventListener("click", function () {
      showWhitelist();
    });

    const addButton = document.querySelector(".add-domain-btn");

    //Setup for button that adds content in text input box to whitelist array
    addButton.addEventListener("click", function () {
      const domain = domainInput.value;

      // Ensure the domain is not an empty string before proceeding
      if (domain.trim() === "") return;

      // Get the current list of whitelisted sites
      chrome.storage.local.get("whitelistedSites", function (result) {
        let sites = result.whitelistedSites || [];

        // Add the domain to the list if it's not already there
        if (sites.indexOf(domain) === -1) {
          sites.push(domain);
        }

        // Save the updated list back to Chrome's storage
        chrome.storage.local.set({ whitelistedSites: sites }, function () {
          // Clear the input box
          domainInput.value = "";
        });

        //Reload whitelist
        loadWhitelistedSites();
      });
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

  //Run check to ensure that options are disabled if on whitelisted site
  mainViewDisableCheck();
}

// Disable checkbox, used for when parent switch is off
function disableCheckbox(element) {
  element.disabled = true;
}

// Enable checkbox, used for when parent switch is on
function enableCheckbox(element) {
  element.disabled = false;
}

//Shows whitelist view in popup html
function showWhitelist() {
  const main = document.getElementById("main-content");
  const whitelist = document.getElementById("whitelist");
  loadWhitelistedSites();

  main.classList.add("hide");
  main.classList.add("hide");
  whitelist.classList.remove("hide");
}

//Hides whitelist view in popup html
function hideWhitelist() {
  const main = document.getElementById("main-content");
  const whitelist = document.getElementById("whitelist");

  whitelist.classList.add("hide");
  main.classList.remove("hide");
}

//Loads the list of whitelist sites from chrome storage
function loadWhitelistedSites() {
  chrome.storage.local.get("whitelistedSites", function (result) {
    let sites = result.whitelistedSites || [];
    const count = sites.length;

    document.getElementById("whitelist-site-count").innerText =
      "Whitelisted Sites (" + count.toString() + ")";

    const listContainer = document.getElementById("whitelistedSitesList");

    // Clear any existing items first
    listContainer.innerHTML = "";

    sites.forEach((site) => {
      const listItem = document.createElement("li");

      // Create domain text node
      const domainTextNode = document.createTextNode(site);
      const textDiv = document.createElement("div");
      textDiv.appendChild(domainTextNode);
      textDiv.classList.add("domain-item");
      listItem.appendChild(textDiv);

      // Create remove button
      const removeButton = document.createElement("button");
      removeButton.textContent = "Remove";
      removeButton.addEventListener("click", function () {
        // Remove the site from the storage and refresh the list
        removeSiteFromWhitelist(site);
      });
      removeButton.classList.add("btn");
      removeButton.classList.add("remove-btn");

      listItem.appendChild(removeButton);
      listContainer.appendChild(listItem);
    });
  });
}

//Remove the specified domain from the whitelist within chrome storage and reload view
function removeSiteFromWhitelist(site) {
  chrome.storage.local.get("whitelistedSites", function (result) {
    let sites = result.whitelistedSites || [];

    // Remove the site from the array
    const index = sites.indexOf(site);
    if (index > -1) {
      sites.splice(index, 1);
    }

    // Update the storage with the modified list
    chrome.storage.local.set({ whitelistedSites: sites }, function () {
      // Refresh the list
      loadWhitelistedSites();
    });
  });
}

//Used to determine current domain
function extractDomain(url) {
  let domain;
  //find & remove protocol (http, ftp, etc.) and get domain
  if (url.indexOf("://") > -1) {
    domain = url.split("/")[2];
  } else {
    domain = url.split("/")[0];
  }

  //find & remove port number
  domain = domain.split(":")[0];

  return domain;
}

//Checks whether the toggles should be disabled if on a current whitelisted domain
function mainViewDisableCheck() {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const domain = extractDomain(tabs[0].url);
    const toggleButtons = document.querySelectorAll(".toggle-btn");
    const descriptions = document.querySelectorAll(".desc");
    const labels = document.querySelectorAll(".label-desc");
    const checkboxes = document.querySelectorAll(".hover-checkbox");
    // Check if the domain is in the whitelist
    chrome.storage.local.get(["whitelistedSites"], function (result) {
      if (result.whitelistedSites && result.whitelistedSites.includes(domain)) {
        toggleButtons.forEach((btn) => {
          btn.disabled = true;
        });
        checkboxes.forEach((btn) => {
          btn.disabled = true;
        });
        descriptions.forEach((desc) => {
          desc.classList.add("disabled-text");
        });
        labels.forEach((label) => {
          label.classList.add("disabled-text");
        });
        document.getElementById("whitelisted-site").classList.remove("hide");
      } else {
        toggleButtons.forEach((btn) => {
          btn.disabled = false;
        });
        descriptions.forEach((desc) => {
          desc.classList.remove("disabled-text");
        });
        labels.forEach((label) => {
          label.classList.remove("disabled-text");
        });
      }
    });
  });
}

//Generates the html text showing the total count of whitelisted domains
function updateWhitelistCount() {
  chrome.storage.local.get("whitelistedSites", function (result) {
    const whitelist = result.whitelist || [];
    const count = whitelist.length;

    document.getElementById("whitelist-site-count").innerText =
      "Whitelisted Sites (" + count.toString() + ")";
  });
}

//Calling render function to run on load
render();
