function replaceVisibleHexValues() {
  const hexPattern =
    /#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})\b|(rgb\s*)?\(?\s*(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\s*,\s*(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\s*,\s*(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\s*\)?/g;
  function traverse(node) {
    const nodeType = node.nodeType;

    if (nodeType === Node.TEXT_NODE) {
      const matches = node.nodeValue.match(hexPattern);
      if (matches) {
        // First, let's check if the matched node's parent is a span with class "curlor"
        // If it is, we remove the span and insert its content directly into the grandparent node.
        if (
          node.parentNode.tagName === "SPAN" &&
          node.parentNode.classList.contains("curlor")
        ) {
          const textNode = document.createTextNode(matches[0]);
          node.parentNode.parentNode.replaceChild(textNode, node.parentNode);
          node = textNode; // Update node reference for further processing
        }

        // Now fetch both 'background' and 'color' values in parallel
        Promise.all([
          chrome.storage.local.get(["background"]),
          chrome.storage.local.get(["color"]),
        ]).then(([backgroundValue, colorValue]) => {
          if (backgroundValue.background || colorValue.color) {
            const spanTag = document.createElement("span");
            spanTag.className = "curlor"; // Setting class to "curlor"

            if (backgroundValue.background) {
              chrome.storage.local
                .get(["backgroundHover"])
                .then((hoverValue) => {
                  if (hoverValue.backgroundHover) {
                    removeBackgroundColor(spanTag);
                    addBackgroundColorOnHover(spanTag, matches[0]);
                  } else {
                    addBackgroundColor(spanTag, matches[0]);
                  }
                });
            }

            if (colorValue.color) {
              chrome.storage.local.get(["colorHover"]).then((hoverValue) => {
                if (hoverValue.colorHover) {
                  removeTextColor(spanTag);
                  addTextColorOnHover(spanTag, matches[0]);
                } else {
                  addTextColor(spanTag, matches[0]);
                }
              });
            }

            spanTag.textContent = matches[0];
            node.parentNode.replaceChild(spanTag, node);
          }
        });
      }
    } else if (nodeType === Node.ELEMENT_NODE) {
      const style = window.getComputedStyle(node);
      const isHidden =
        style.visibility === "hidden" || style.display === "none";

      if (!isHidden) {
        const childNodes = Array.from(node.childNodes);
        for (const childNode of childNodes) {
          traverse(childNode);
        }
      }
    }
  }

  traverse(document.body);
}

function addTextColor(element, color) {
  element.style.color = color;
}

function removeTextColor(element) {
  element.style.color = "black";
}

function addBackgroundColor(element, color) {
  element.style.backgroundColor = color;
}

function removeBackgroundColor(element) {
  element.style.backgroundColor = "white";
}

function addBackgroundColorOnHover(element, color) {
  element.addEventListener("mouseenter", function () {
    this.style.backgroundColor = color;
  });
  element.addEventListener("mouseleave", function () {
    this.style.backgroundColor = "white";
  });
}

function addTextColorOnHover(element, color) {
  element.addEventListener("mouseenter", function () {
    this.style.color = color;
  });
  element.addEventListener("mouseleave", function () {
    this.style.color = "black";
  });
}

function removeOnHover(element, color) {}

chrome.storage.onChanged.addListener(function (changes, namespace) {
  replaceVisibleHexValues();
});

replaceVisibleHexValues();
