(function () {
	var FEED_URL = "https://dashboard.cgares.com/feed.xml";
	var ARCHIVE_URL = "https://dashboard.cgares.com/briefings/";

	function formatDate(pubDate) {
		var d = new Date(pubDate);
		if (isNaN(d.getTime())) return "";
		return new Intl.DateTimeFormat("en-US", {
			timeZone: "America/Chicago",
			weekday: "short",
			month: "short",
			day: "numeric",
			year: "numeric"
		}).format(d);
	}

	function extractEcho(html) {
		if (!html) return "";
		var text = String(html)
			.replace(/<br\s*\/?>/gi, "\n")
			.replace(/<\/(p|div|h[1-6]|li|tr)>/gi, "\n")
			.replace(/<[^>]+>/g, " ")
			.replace(/&nbsp;/gi, " ")
			.replace(/&amp;/gi, "&")
			.replace(/&ndash;/gi, "\u2013")
			.replace(/&mdash;/gi, "\u2014")
			.replace(/&#x27;|&#39;|&apos;/gi, "'")
			.replace(/&quot;/gi, "\"")
			.replace(/&#(\d+);/g, function (_, n) { return String.fromCharCode(parseInt(n, 10)); })
			.replace(/[ \t]+/g, " ");
		var current = text.match(/Current ECHO Level:\s*([^\n]+)/i);
		if (current) return ("Current ECHO Level: " + current[1]).replace(/\s+/g, " ").trim();
		var shortEcho = text.match(/Echo\s+[0-5]\s+[-\u2013\u2014]\s+[^.\n<]+/i);
		if (shortEcho) return shortEcho[0].replace(/\s+/g, " ").trim();
		return "";
	}

	function parseItems(xmlText) {
		var doc = new DOMParser().parseFromString(xmlText, "application/xml");
		if (doc.querySelector("parsererror")) throw new Error("bad feed");
		var nodes = doc.querySelectorAll("item");
		var items = [];
		for (var i = 0; i < nodes.length; i++) {
			var node = nodes[i];
			var title = node.querySelector("title");
			var link = node.querySelector("link");
			var pubDate = node.querySelector("pubDate");
			var desc = node.querySelector("description");
			items.push({
				title: title ? title.textContent.trim() : "",
				link: link ? link.textContent.trim() : "",
				date: pubDate ? formatDate(pubDate.textContent) : "",
				echo: extractEcho(desc ? desc.textContent : "")
			});
		}
		return items;
	}

	function externalLink(href, text) {
		var a = document.createElement("a");
		a.href = href;
		a.target = "_blank";
		a.rel = "noopener";
		a.textContent = text;
		return a;
	}

	function showArchiveFallback(el, prefix) {
		if (!el) return;
		el.innerHTML = "";
		if (prefix) {
			var strong = document.createElement("strong");
			strong.textContent = prefix;
			el.appendChild(strong);
			el.appendChild(document.createTextNode(" "));
		}
		el.appendChild(externalLink(ARCHIVE_URL, "View briefings archive"));
	}

	function renderLatest(items) {
		var el = document.getElementById("latest-briefing");
		if (!el) return;
		if (!items.length) {
			showArchiveFallback(el, "Latest briefing:");
			return;
		}
		var item = items[0];
		el.innerHTML = "";
		var strong = document.createElement("strong");
		var pageLink = document.createElement("a");
		pageLink.href = "briefings.html";
		pageLink.textContent = "Latest briefing";
		strong.appendChild(pageLink);
		strong.appendChild(document.createTextNode(":"));
		el.appendChild(strong);
		el.appendChild(document.createTextNode(" "));
		el.appendChild(externalLink(item.link || ARCHIVE_URL, item.title || "View briefing"));
		if (item.date) el.appendChild(document.createTextNode(" \u00b7 " + item.date));
	}

	function renderList(items) {
		var el = document.getElementById("briefings-list");
		if (!el) return;
		el.innerHTML = "";
		var recent = items.slice(0, 5);
		if (!recent.length) {
			var p = document.createElement("p");
			showArchiveFallback(p, "");
			el.appendChild(p);
			return;
		}
		for (var i = 0; i < recent.length; i++) {
			var item = recent[i];
			var article = document.createElement("article");
			var heading = document.createElement("h3");
			heading.appendChild(externalLink(item.link || ARCHIVE_URL, item.title || "Briefing"));
			article.appendChild(heading);
			var p = document.createElement("p");
			var parts = [];
			if (item.date) parts.push(item.date);
			if (item.echo) parts.push(item.echo);
			p.textContent = parts.join(" \u00b7 ");
			article.appendChild(p);
			el.appendChild(article);
		}
	}

	function fail() {
		showArchiveFallback(document.getElementById("latest-briefing"), "Latest briefing:");
		var list = document.getElementById("briefings-list");
		if (list) {
			list.innerHTML = "";
			var p = document.createElement("p");
			p.appendChild(externalLink(ARCHIVE_URL, "View briefings archive"));
			list.appendChild(p);
		}
	}

	fetch(FEED_URL, { cache: "no-store" })
		.then(function (res) {
			if (!res.ok) throw new Error("feed " + res.status);
			return res.text();
		})
		.then(parseItems)
		.then(function (items) {
			renderLatest(items);
			renderList(items);
		})
		.catch(fail);
})();
