export function setParamsAndGo(paramValueDict) {
    let url = new URL(document.URL);
    for (const param in paramValueDict) {
        url.searchParams.set(param, paramValueDict[param]);
    }
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
