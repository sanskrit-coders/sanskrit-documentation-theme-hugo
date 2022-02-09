export function setParamAndGo(key, value) {
    let url = new URL(document.URL)
    url.searchParams.set(key, value);
    document.location = url.href;
}

export function deleteParamAndGo(key) {
    let url = new URL(document.URL)
    url.searchParams.delete(key);
    document.location = url.href;
}

export function getParam(variable) {
    let url = new URL(document.URL)
    let value = url.searchParams.get(variable);
    if (!value) {
        return null;
    }
    return decodeURIComponent(value);
    // console.debug('Query variable %s not found', variable);
}
