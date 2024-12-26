export async function replaceAsync(str, regex, asyncFn) {
  const promises = [];
  str.replace(regex, (match, ...args) => {
    const promise = asyncFn(match, ...args);
    promises.push(promise);
  });
  const data = await Promise.all(promises);
  return str.replace(regex, () => data.shift());
}

export function textNodesUnder(node) {
  var all = [];
  for (node = node.firstChild; node; node = node.nextSibling) {
    if (node.nodeType == 3) all.push(node);
    else all = all.concat(textNodesUnder(node));
  }
  return all;
}

export function getAncestors(child) {
  let ancestors = [];
  let node = child.parentNode;
  while (node) {
    ancestors.push(node);
    // Traverse up to the parent
    node = node.parentNode;
  }
  return ancestors;
};

// Check if `child` is a descendant of `parent`
export function isDescendant(parent, child) {
  let node = child.parentNode;
  while (node) {
    if (node === parent) {
      return true;
    }
    // Traverse up to the parent
    node = node.parentNode;
  }

  // Go up until the root but couldn't find the `parent`
  return false;
};

export function getDescendentsByCss(parent, css, documentElement) {
  var descendents = [].slice.call(documentElement.querySelectorAll(css));
  descendents = descendents.filter(x => isDescendant(parent, x));
  return descendents;
}

export function createDetailElement(documentElement, heading) {
  let details = documentElement.createElement('details');
  let summary = documentElement.createElement("summary");
  summary.innerHTML = heading;
  details.appendChild(summary);
  return details;
}

export function getCookie(cname) {
  var name = cname + "=";
  var decodedCookie = decodeURIComponent(document.cookie);
  var ca = decodedCookie.split(';');
  for (var i = 0; i < ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return undefined;
}

export function getAjaxResponsePromise(url) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);

    xhr.onload = function() {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.responseText);
      } else {
        reject(new Error(`Request failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = function() {
      reject(new Error('Network error'));
    };

    xhr.send();
  });
}