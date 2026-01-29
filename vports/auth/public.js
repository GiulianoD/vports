function obterAccessToken() {
    return localStorage.getItem(accessToken) || sessionStorage.getItem(accessToken);
}