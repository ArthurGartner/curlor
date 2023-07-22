// Function to manipulate DOM
function replaceVisibleColorValues() {
  const hexrgbhslPattern =
    /#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})\b|(rgb|hsl)\s*\(?\s*(\d{1,3})\s*,\s*(\d{1,3}%?)\s*,\s*(\d{1,3}%?)\s*\)?/g;
  // Traverse DOM structure to find matches
  function traverse(node) {
    const nodeType = node.nodeType;

    // Ensure node is proper type
    if (nodeType === Node.TEXT_NODE) {
      const matches = node.nodeValue.match(hexrgbhslPattern);
      if (matches) {
        // Check if previously added span exists, if so remove
        if (
          node.parentNode.tagName === "SPAN" &&
          node.parentNode.classList.contains("curlor")
        ) {
          const textNode = document.createTextNode(matches[0]);
          node.parentNode.parentNode.replaceChild(textNode, node.parentNode);
          node = textNode; // Update node reference for further processing
        }

        // Assign match to color value
        var color = matches[0];

        //If hsl value then conversion to hex necessary
        if (isHSL(color)) color = convertHSLToHex(color);

        // Fetch both 'background' and 'color' values in parallel
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
                    addBackgroundColorOnHover(spanTag, color);
                  } else {
                    addBackgroundColor(spanTag, color);
                  }
                });
            }

            if (colorValue.color) {
              chrome.storage.local.get(["colorHover"]).then((hoverValue) => {
                if (hoverValue.colorHover) {
                  addTextColorOnHover(spanTag, color);
                } else {
                  addTextColor(spanTag, color);
                }
              });
            }

            // Add the text value to the span tag
            spanTag.textContent = matches[0];

            // Insert newly created span tag
            if (node.parentNode != null)
              node.parentNode.replaceChild(spanTag, node);
          }
        });
      }
    } else if (nodeType === Node.ELEMENT_NODE) {
      const style = window.getComputedStyle(node);
      const isHidden =
        style.visibility === "hidden" || style.display === "none";

      // Continue traversal if visible
      if (!isHidden) {
        const childNodes = Array.from(node.childNodes);
        for (const childNode of childNodes) {
          traverse(childNode);
        }
      }
    }
  }

  // Start traversal at top
  traverse(document.body);
}

function addTextColor(element, color) {
  element.style.color = color;
}

function addBackgroundColor(element, color) {
  element.style.backgroundColor = color;
}

function addBackgroundColorOnHover(element, color) {
  const originalBackgroundColor =
    window.getComputedStyle(element).backgroundColor;

  element.addEventListener("mouseenter", function () {
    element.style.backgroundColor = color;
  });

  element.addEventListener("mouseleave", function () {
    element.style.backgroundColor = originalBackgroundColor;
  });
}

function addTextColorOnHover(element, color) {
  const originalTextColor = window.getComputedStyle(element).color;

  element.addEventListener("mouseenter", function () {
    element.style.color = color;
  });

  element.addEventListener("mouseleave", function () {
    element.style.color = originalTextColor;
  });
}

// Update DOM for every chrome storage update
chrome.storage.onChanged.addListener(function (changes, namespace) {
  replaceVisibleColorValues();
});

function hslToRgb(h, s, l) {
  let r, g, b;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

// Convert rgb to hex
function rgbToHex(r, g, b) {
  return (
    "#" +
    ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()
  );
}

// Convert hsl to hex value
function convertHSLToHex(str) {
  const regex =
    /hsl\s*\(?\s*(\d{1,3})\s*,\s*(\d{1,3}%?)\s*,\s*(\d{1,3}%?)\s*\)?/i;
  const match = str.match(regex);

  if (match) {
    const h = parseInt(match[1]) / 360;
    const s = parseInt(match[2]) / 100;
    const l = parseInt(match[3]) / 100;

    const [r, g, b] = hslToRgb(h, s, l);
    return rgbToHex(r, g, b);
  }

  return null; // Return null if no HSL value found in the string
}

// Boolean check for string as hsl value
function isHSL(str) {
  const regex =
    /^hsl\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3}%)\s*,\s*(\d{1,3}%)\s*\)$/i;
  return regex.test(str);
}

// Main function run
replaceVisibleColorValues();
