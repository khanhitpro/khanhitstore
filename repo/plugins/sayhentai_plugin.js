// =============================================================================
// CONFIGURATION & METADATA
// =============================================================================

var BASE = "https://sayhentai.sh";

function getManifest() {
    return JSON.stringify({
        id: "sayhentai",
        name: "SayHentai",
        version: "1.0.5",
        baseUrl: BASE,
        iconUrl: BASE + "/favicon-32x32.png",
        isEnabled: true,
        isAdult: true,
        type: "MANGA",
        layoutType: "VERTICAL"
    });
}

function getHomeSections() {
    return JSON.stringify([
        { slug: "", title: "Truyện Mới Cập Nhật", type: "Grid", path: "" }
    ]);
}

function getPrimaryCategories() {
    return JSON.stringify([
        { name: "Mới Nhất", slug: "" },
        { name: "Manhwa", slug: "genre/manhwa" },
        { name: "Truyện Full", slug: "genre/completed" },
        { name: "Romance", slug: "genre/romance" },
        { name: "Drama", slug: "genre/drama" },
        { name: "Học Đường", slug: "genre/hoc-duong" }
    ]);
}

function getFilterConfig() {
    return JSON.stringify({
        sort: [
            { name: "Mới cập nhật", value: "latest" },
            { name: "A-Z", value: "alphabet" },
            { name: "Lượt xem", value: "views" }
        ],
        category: [
            { name: "Manhwa", value: "manhwa" },
            { name: "Truyện Màu", value: "truyen-mau" },
            { name: "Yuri", value: "yuri" },
            { name: "NTR", value: "ntr" }
        ]
    });
}

// =============================================================================
// URL GENERATION
// =============================================================================

function getUrlList(slug, filtersJson) {
    var filters = JSON.parse(filtersJson || "{}");
    var page = filters.page || 1;

    if (filters.category) {
        return BASE + "/genre/" + filters.category + "?page=" + page;
    }

    if (slug && slug.indexOf("genre/") === 0) {
        return BASE + "/" + slug + "?page=" + page;
    }

    return page > 1 ? BASE + "?page=" + page : BASE + "/";
}

function getUrlSearch(keyword, filtersJson) {
    var filters = JSON.parse(filtersJson || "{}");
    var page = filters.page || 1;

    return BASE + "/page/" + page + "/?s=" +
        encodeURIComponent(keyword) +
        "&post_type=wp-manga";
}

function getUrlDetail(slug) {
    if (!slug) return "";
    if (/^https?:\/\//.test(slug)) return slug;

    return BASE + "/" + slug.replace(/^\/+/, "").replace(/\/$/, "") +
        (slug.endsWith(".html") ? "" : ".html");
}

function getUrlCategories() { return BASE; }
function getUrlCountries() { return ""; }
function getUrlYears() { return ""; }

// =============================================================================
// UTILS
// =============================================================================

var PluginUtils = {
    cleanText: function (text) {
        if (!text) return "";
        return text
            .replace(/<[^>]*>/g, "")
            .replace(/&amp;/g, "&")
            .replace(/&quot;/g, '"')
            .replace(/&#039;/g, "'")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/\s+/g, " ")
            .trim();
    }
};

// =============================================================================
// LIST PARSER (FIXED STABLE VERSION)
// =============================================================================

function parseListResponse(html) {
    var items = [];
    var found = {};

    // FIX: regex ổn định hơn, không bị vỡ div
    var itemRegex =
        /<div[^>]*class="[^"]*page-item-detail[^"]*"[^>]*>([\s\S]*?)(?=<div[^>]*class="[^"]*page-item-detail|$)/gi;

    var match;

    while ((match = itemRegex.exec(html)) !== null) {
        var item = match[1];

        var linkMatch =
            item.match(/<h3[^>]*>\s*<a[^>]+href="([^"]+)"/i) ||
            item.match(/item-thumb[^>]*>\s*<a[^>]+href="([^"]+)"/i);

        if (!linkMatch) continue;

        var url = linkMatch[1];
        var slug = url.replace(/^https?:\/\/[^/]+\//, "").replace(/\/$/, "");

        var titleMatch =
            item.match(/title="([^"]+)"/i) ||
            item.match(/<a[^>]*>([^<]+)<\/a>/i);

        var title = PluginUtils.cleanText(titleMatch ? titleMatch[1] : "Unknown");

        var imgMatch =
            item.match(/data-src="([^"]+)"/i) ||
            item.match(/data-lazy-src="([^"]+)"/i) ||
            item.match(/src="([^"]+)"/i);

        var thumb = imgMatch ? imgMatch[1] : "";

        if (thumb && !/^https?:\/\//.test(thumb)) {
            thumb = BASE + "/" + thumb.replace(/^\/+/, "");
        }

        var chapterMatch =
            item.match(/class="chapter[^"]*"[^>]*>\s*<a[^>]*>([\s\S]*?)<\/a>/i);

        var chapter = chapterMatch ? PluginUtils.cleanText(chapterMatch[1]) : "";

        if (!found[slug]) {
            found[slug] = true;

            items.push({
                id: slug,
                title: title,
                posterUrl: thumb,
                backdropUrl: thumb,
                description: "",
                episode_current: chapter,
                quality: "HD",
                lang: "Vietsub"
            });
        }
    }

    // =============================================================================
    // PAGINATION FIX (SAFE MAX DETECTION)
    // =============================================================================

    var totalPages = 1;
    var currentPage = 1;

    var currentMatch =
        html.match(/class="current">(\d+)<\/span>/i) ||
        html.match(/class="page-numbers current[^"]*">(\d+)<\/span>/i);

    if (currentMatch) currentPage = parseInt(currentMatch[1]);

    var pageMatches = html.match(/page\/(\d+)/g) || [];
    for (var i = 0; i < pageMatches.length; i++) {
        var num = parseInt(pageMatches[i].replace("page/", ""));
        if (num > totalPages) totalPages = num;
    }

    return JSON.stringify({
        items: items,
        pagination: {
            currentPage: currentPage,
            totalPages: totalPages,
            totalItems: items.length * totalPages,
            itemsPerPage: items.length
        }
    });
}

function parseSearchResponse(html) {
    return parseListResponse(html);
}

// =============================================================================
// DETAIL PARSER
// =============================================================================

function parseMovieDetail(html) {
    try {
        var titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
        var title = titleMatch ? PluginUtils.cleanText(titleMatch[1]) : "";

        var descMatch = html.match(/description-summary[^>]*>([\s\S]*?)<\/div>/i);
        var description = descMatch ? PluginUtils.cleanText(descMatch[1]) : "";

        var posterMatch =
            html.match(/og:image" content="([^"]+)"/i) ||
            html.match(/summary_image[^>]*src="([^"]+)"/i);

        var poster = posterMatch ? posterMatch[1] : "";

        var chapters = [];
        var cRegex = /wp-manga-chapter[^>]*>\s*<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
        var m;

        while ((m = cRegex.exec(html)) !== null) {
            chapters.push({
                id: m[1],
                name: PluginUtils.cleanText(m[2])
            });
        }

        // giữ nguyên order (an toàn hơn reverse)
        var servers = [{
            name: "Server 1",
            episodes: chapters
        }];

        return JSON.stringify({
            id: "",
            title: title,
            posterUrl: poster,
            backdropUrl: poster,
            description: description,
            servers: servers,
            status: "Đang tiến hành",
            quality: "HD",
            lang: "Vietsub"
        });

    } catch (e) {
        return "null";
    }
}

// =============================================================================
// CHAPTER PARSER
// =============================================================================

function parseDetailResponse(html) {
    try {
        var images = [];

        var imgRegex =
            /class="page-break[^"]*"[\s\S]*?<img[^>]+(?:src|data-src|data-lazy-src)="([^"]+)"/gi;

        var m;

        while ((m = imgRegex.exec(html)) !== null) {
            images.push(m[1].replace(/&amp;/g, "&"));
        }

        if (images.length === 0) {
            var content = html.match(/reading-content[^>]*>([\s\S]*?)<\/div>/i);
            if (content) {
                var r = /<img[^>]+(?:src|data-src|data-lazy-src)="([^"]+)"/gi;
                var mm;
                while ((mm = r.exec(content[1])) !== null) {
                    images.push(mm[1]);
                }
            }
        }

        return JSON.stringify({
            images: images
        });

    } catch (e) {
        return "{}";
    }
}
