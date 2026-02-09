

chrome.runtime.onInstalled.addListener(() =>
{
	chrome.storage.sync.get({primaryLang: "en", domains: [], domainParams: {}}, data =>
	{
		if (!data.primaryLang) chrome.storage.sync.set({primaryLang: "en"});
		if (!data.domains) chrome.storage.sync.set({domains: []});
		if (!data.domainParams) chrome.storage.sync.set({domainParams: {}});
	});
});

function wildcardToRegex(pattern) {
	return new RegExp("^" + pattern.replace(/\./g, "\\.").replace(/\*/g, ".*") + "$", "i");
}

function matchesDomain(host, domains) {
	return domains.find(d => wildcardToRegex(d).test(host));
}

chrome.webNavigation.onBeforeNavigate.addListener(async details =>
{

	if (details.frameId !== 0) return;

	try {
		const url = new URL(details.url);

		// Skip if already has the param set correctly to avoid loops
		const {primaryLang = "en", domains = [], domainParams = {}} =
			await chrome.storage.sync.get({primaryLang: "en", domains: [], domainParams: {}});

		const matchingPattern = matchesDomain(url.hostname, domains);
		if (!matchingPattern) return;

		const paramName = domainParams[matchingPattern];
		if (!paramName) return; // No param configured for this domain yet

		const currentValue = url.searchParams.get(paramName);

		// ENFORCE: Add or update the param if missing or wrong
		if (!currentValue || currentValue.toLowerCase() !== primaryLang.toLowerCase()) {
			url.searchParams.set(paramName, primaryLang);
			chrome.tabs.update(details.tabId, {url: url.toString()});
		}

	} catch (e) {
		console.error("Language enforcer error:", e);
	}
});
