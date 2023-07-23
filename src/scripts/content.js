// Function to manipulate DOM
function replaceVisibleColorValues() {
  const hexrgbhslPattern =
    /#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})\b|(rgb|hsl)\s*\(?\s*(\d{1,3})\s*,\s*(\d{1,3}%?)\s*,\s*(\d{1,3}%?)\s*\)?/g;
  // Traverse DOM structure to find matches
  function traverse(rootNode) {
    const nodesToProcess = [rootNode];

    // Pre-fetch the necessary values from chrome.storage to avoid repeated async calls.
    let backgroundValue, colorValue, backgroundHoverValue, colorHoverValue;

    Promise.all([
      chrome.storage.local.get(["background"]),
      chrome.storage.local.get(["color"]),
      chrome.storage.local.get(["backgroundHover"]),
      chrome.storage.local.get(["colorHover"]),
    ]).then(([bgValue, clrValue, bgHoverValue, clrHoverValue]) => {
      backgroundValue = bgValue;
      colorValue = clrValue;
      backgroundHoverValue = bgHoverValue;
      colorHoverValue = clrHoverValue;

      while (nodesToProcess.length) {
        const node = nodesToProcess.shift();
        const nodeType = node.nodeType;

        if (nodeType === Node.TEXT_NODE) {
          let content = node.nodeValue;
          let offset = 0;
          let match;

          while ((match = hexrgbhslPattern.exec(content)) !== null) {
            var color = match[0];

            if (isHSL(color)) {
              color = convertHSLToHex(color);
            }

            const spanTag = document.createElement("span");
            spanTag.className = "curlor";
            spanTag.textContent = color;

            const matchStart = match.index;
            const matchEnd = match.index + match[0].length;

            if (matchStart > offset) {
              node.parentNode.insertBefore(
                document.createTextNode(content.substring(offset, matchStart)),
                node
              );
            }

            if (backgroundValue.background || colorValue.color) {
              if (backgroundValue.background) {
                if (backgroundHoverValue.backgroundHover)
                  addBackgroundColorOnHover(spanTag, color);
                else addBackgroundColor(spanTag, color);
              }

              if (colorValue.color) {
                if (colorHoverValue.colorHover)
                  addTextColorOnHover(spanTag, color);
                else addTextColor(spanTag, color);
              }

              node.parentNode.insertBefore(spanTag, node);
            } else {
              // If no color or background applied, just insert the text without the span
              node.parentNode.insertBefore(
                document.createTextNode(color),
                node
              );
            }

            offset = matchEnd;
          }

          if (offset < content.length) {
            node.parentNode.insertBefore(
              document.createTextNode(content.substring(offset)),
              node
            );
          }

          node.parentNode.removeChild(node);
        } else if (nodeType === Node.ELEMENT_NODE) {
          // For toggling off, we should check if the element is a `span.curlor` and replace it with its text content
          if (node.tagName === "SPAN" && node.classList.contains("curlor")) {
            const textNode = document.createTextNode(node.textContent);
            node.parentNode.replaceChild(textNode, node);
            nodesToProcess.push(textNode); // Add the new textNode to the processing list
          } else {
            const style = window.getComputedStyle(node);
            const isHidden =
              style.visibility === "hidden" || style.display === "none";

            if (!isHidden) {
              nodesToProcess.push(...node.childNodes);
            }
          }
        }
      }
    });
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
