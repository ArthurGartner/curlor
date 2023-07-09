function replaceVisibleHexValues() {
  const hexPattern = /#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})\b/g;
  function traverse(node) {
    const nodeType = node.nodeType;

    if (nodeType === Node.TEXT_NODE) {
      const matches = node.nodeValue.match(hexPattern);
      if (matches) {
        const spanTag = document.createElement("span");
        chrome.storage.local.get(["background"]).then((value) => {
          if (value.background) spanTag.style.backgroundColor = matches[0];
          else spanTag.style.backgroundColor = "white";
        });
        chrome.storage.local.get(["color"]).then((value) => {
          if (value.color) spanTag.style.color = matches[0];
          else spanTag.style.color = "black";
        });
        spanTag.textContent = matches[0];
        node.parentNode.replaceChild(spanTag, node);
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

chrome.storage.onChanged.addListener(function (changes, namespace) {
  replaceVisibleHexValues();
  console.log("RAN");
});

replaceVisibleHexValues();
