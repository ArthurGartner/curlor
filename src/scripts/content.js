// Function to check if the element should be processed
function shouldProcessElement(element) {
  // Ensure element exists and is an ELEMENT_NODE
  if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;

  const tagName = element.tagName.toLowerCase();
  const avoidTags = [
    "script",
    "style",
    "noscript",
    "iframe",
    "canvas",
    "svg",
    "audio",
    "video",
    "source",
    "track",
    "embed",
    "object",
    "picture",
    "map",
    "area",
    "param",
    "button",
    "select",
    "datalist",
    "optgroup",
    "option",
    "textarea",
    "keygen",
    "output",
    "progress",
    "meter",
  ];

  //Ensure current element tag name is not included in list of tags to avoid
  if (avoidTags.includes(tagName)) return false;

  //Get the styling of the current element
  const style = window.getComputedStyle(element);

  //Determine whether element is visible
  const isHidden = style.visibility === "hidden" || style.display === "none";

  //Return visibility result
  return !isHidden;
}

//Function to attain the current domain from the url
function getDomainFromUrl(url) {
  const urlObject = new URL(url);
  return urlObject.hostname;
}

//Entry function of the extension, gets domain and checks if it is in the whitelist
function runExtension() {
  //Get th domain
  const currentDomain = getDomainFromUrl(window.location.href);

  //Retrieve whitelist from Chrome local storage
  chrome.storage.local.get("whitelistedSites", function (result) {
    //Get array result, if null then return just an empty array
    const whitelistedSites = result.whitelistedSites || [];

    // Check if current domain is not in the whitelist
    if (!whitelistedSites.includes(currentDomain)) {
      //Run main function if domain is not found in the whitelist
      replaceVisibleColorValues();
    }
  });
}

// Main function of extension to manipulate DOM
function replaceVisibleColorValues() {
  // This is the combined regex pattern for rgb, hsl and hex color values
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

      //Continue while there are nodes to process
      while (nodesToProcess.length) {
        //Proceed through array, remove and return first item in array
        const node = nodesToProcess.shift();

        //Get the type of node
        const nodeType = node.nodeType;

        //Ensure node is of type text, this is an int
        if (nodeType === Node.TEXT_NODE) {
          //Get the style of the element node and ensure it is visible
          const parentStyle = window.getComputedStyle(node.parentElement);
          const isParentVisible =
            parentStyle &&
            parentStyle.visibility !== "hidden" &&
            parentStyle.display !== "none";

          if (isParentVisible) {
            let content = node.nodeValue;
            let offset = 0;
            let match;

            //Iterate through all matches found in the content of the current node
            while ((match = hexrgbhslPattern.exec(content)) !== null) {
              var color = match[0];

              //Check if match is an hsl value, if so it is processed differently
              if (isHSL(color)) {
                color = convertHSLToHex(color);
              }

              //Create span element, this is used to apply special classes and styling
              const spanTag = document.createElement("span");
              spanTag.className = "curlor";
              spanTag.textContent = color;

              //Update index int for beginning of match and end of match
              const matchStart = match.index;
              const matchEnd = match.index + match[0].length;

              //Create new text node for content before current match found in current node
              if (matchStart > offset) {
                node.parentNode.insertBefore(
                  document.createTextNode(
                    content.substring(offset, matchStart)
                  ),
                  node
                );
              }

              //Check which settings are on in chrome storage and apply them appropriately
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

                //Add the newly updated span tag to the DOM right after the previously generated new text node.
                node.parentNode.insertBefore(spanTag, node);
              } else {
                // If no color or background applied, just insert the text without the span
                node.parentNode.insertBefore(
                  document.createTextNode(color),
                  node
                );
              }

              //Update offset so it is at the end of the last matched text index. This allows for further processing of content to the right if needed.
              offset = matchEnd;
            }

            //Check if there is still text content remaining after the offset, if so add the remaining text content as bulk to new text node.
            if (offset < content.length) {
              node.parentNode.insertBefore(
                document.createTextNode(content.substring(offset)),
                node
              );
            }

            //The original node is removed. If additional processing is needed for the remaining content it will be processed as it is added to the array.
            node.parentNode.removeChild(node);
          }
        } else if (nodeType === Node.ELEMENT_NODE) {
          // If one of the special styles has already been replyed, then just take raw text content and remove node with new styling. Add new node with raw text to array for iterative processing.
          if (node.tagName === "SPAN" && node.classList.contains("curlor")) {
            const textNode = document.createTextNode(node.textContent);
            node.parentNode.replaceChild(textNode, node);
            nodesToProcess.push(textNode); // Add the new textNode to the processing list
          } else {
            //Standard processing if node does not already have special styling applied
            const style = window.getComputedStyle(node);
            const isHidden =
              style.visibility === "hidden" || style.display === "none";

            if (!isHidden) {
              //Evaluate which nodes should be processed, then send for process check
              const childNodes = [...node.childNodes].filter((child) => {
                return (
                  child.nodeType === Node.TEXT_NODE ||
                  shouldProcessElement(child)
                );
              });
              //Nodes that meet criteria are passed to the processing array.
              nodesToProcess.push(...childNodes);
            }
          }
        }
      }
    });
  }

  // Start traversal at top, but only if it should be processed
  if (shouldProcessElement(document.body)) {
    traverse(document.body);
  }
}

//Adds the required styling for text color
function addTextColor(element, color) {
  element.style.color = color;
}

//Adds the required styling for background color
function addBackgroundColor(element, color) {
  element.style.backgroundColor = color;
}

//Adds the required styling to only show background color on cursor hover
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

//Adds the required styling to only show text color on cursor hover
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
  for (let key in changes) {
    if (
      key === "background" ||
      key === "color" ||
      key === "backgroundHover" ||
      key === "colorHover"
    ) {
      runExtension();
      break; // Once we know one of the keys changed, exit loop
    }
  }
});

//Convert hsl to rgb
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

// On every page load
function onEveryPageLoad() {
  runExtension();
}

//Event listener for optimization
window.addEventListener("load", onEveryPageLoad);
