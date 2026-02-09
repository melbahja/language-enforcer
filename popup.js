const domainInput = document.getElementById("domainInput");
const paramSelect = document.getElementById("paramSelect");
const addDomainBtn = document.getElementById("addDomainBtn");
const addCurrentBtn = document.getElementById("addCurrentBtn");
const domainList = document.getElementById("domainList");
const langInput = document.getElementById("langInput");
const saveLangBtn = document.getElementById("saveLangBtn");

// Common params to check on current site
const COMMON_PARAMS = ['hl', 'lang', 'locale', 'language', 'l', 'lng'];

// Load primary language
chrome.storage.sync.get({primaryLang: "en"}, data =>
{
	langInput.value = data.primaryLang;
});

saveLangBtn.onclick = () =>
{
	const lang = langInput.value.trim().toLowerCase();
	if (lang.length === 2) {

		chrome.storage.sync.set({primaryLang: lang}, () =>
		{
			saveLangBtn.textContent = "Saved!";
			setTimeout(() => saveLangBtn.textContent = "Save", 1000);
		});

	} else {

		langInput.style.borderColor = "red";
		setTimeout(() => langInput.style.borderColor = "#ccc", 1000);
	}
};

function renderList(domains, domainParams)
{
	domainList.innerHTML = "";

	if (domains.length === 0) {
		domainList.innerHTML = '<div class="empty-state">No domains configured.<br>Add sites to enforce language.</div>';
		return;
	}

	domains.forEach(pattern =>
	{
		const li = document.createElement("li");

		const info = document.createElement("div");
		info.className = "domain-info";

		const patternSpan = document.createElement("span");
		patternSpan.className = "domain-pattern";
		patternSpan.textContent = pattern;

		const paramSpan = document.createElement("span");
		paramSpan.className = "domain-param";
		const param = domainParams[pattern] || "not set";
		paramSpan.textContent = `?${param}=${langInput.value || 'en'}`;

		info.appendChild(patternSpan);
		info.appendChild(paramSpan);

		const delBtn = document.createElement("button");
		delBtn.className = "danger";
		delBtn.textContent = "x";
		delBtn.title = "Remove";
		delBtn.onclick = () => removeDomain(pattern);

		li.appendChild(info);
		li.appendChild(delBtn);
		domainList.appendChild(li);
	});
}

function loadAndRender()
{
	chrome.storage.sync.get({domains: [], domainParams: {}}, data =>
	{
		renderList(data.domains, data.domainParams);
	});
}

function removeDomain(pattern)
{
	chrome.storage.sync.get({domains: [], domainParams: {}}, data =>
	{
		const domains = data.domains.filter(d => d !== pattern);
		const domainParams = {...data.domainParams};
		delete domainParams[pattern];
		chrome.storage.sync.set({domains, domainParams}, () => loadAndRender());
	});
}

addDomainBtn.onclick = () =>
{
	const domain = domainInput.value.trim();
	const param = paramSelect.value;

	if (!domain) return;

	chrome.storage.sync.get({domains: [], domainParams: {}}, data =>
	{
		const domains = data.domains;
		const domainParams = data.domainParams || {};

		if (!domains.includes(domain)) {
			domains.push(domain);
		}
		// Always update the param (allows changing param for existing domain)
		domainParams[domain] = param;

		chrome.storage.sync.set({domains, domainParams}, () =>
		{
			loadAndRender();
			domainInput.value = "";
		});
	});
};

addCurrentBtn.onclick = () =>
{

	chrome.tabs.query({active: true, currentWindow: true}, tabs =>
	{
		if (!tabs.length) return;
		const url = new URL(tabs[0].url);
		const host = url.hostname;

		// Create wildcard
		const parts = host.split(".");
		const wildcard = parts.length > 2 ? "*." + parts.slice(-2).join(".") : "*." + host;

		// Detect param from current URL or default to 'hl'
		let detectedParam = paramSelect?.value ? paramSelect.value : 'hl'; // Google default
		for (const param of COMMON_PARAMS)
		{
			if (url.searchParams.has(param)) {
				detectedParam = param;
				break;
			}
		}

		// Set the select to show what we found
		paramSelect.value = detectedParam;
		chrome.storage.sync.get({domains: [], domainParams: {}}, data =>
		{
			const domains = data.domains;
			const domainParams = data.domainParams || {};

			if (!domains.includes(wildcard)) {
				domains.push(wildcard);
			}
			domainParams[wildcard] = detectedParam;

			chrome.storage.sync.set({domains, domainParams}, () =>
			{
				loadAndRender();
				// Visual feedback
				addCurrentBtn.textContent = "Added!";
				setTimeout(() => addCurrentBtn.textContent = "Add Current Site", 1500);
			});
		});
	});
};

loadAndRender();
