// =============================================================================
// CONFIGURATION & METADATA
// =============================================================================

function getManifest() {
    return JSON.stringify({
        id: "topxx",
        name: "TopXX",
        version: "1.0.1",
        baseUrl: "https://topxx.vip",
        iconUrl: "https://topxx.vip/favicon.ico",
        isEnabled: true,
        isAdult: true,
        type: "MOVIE"
    });
}

function getHomeSections() {
    return JSON.stringify([
        { slug: 'vn', title: 'Việt Nam', type: 'Horizontal', path: 'vn' },
        { slug: 'cn', title: 'Trung Quốc', type: 'Horizontal', path: 'cn' },
        { slug: 'jp', title: 'Nhật Bản', type: 'Horizontal', path: 'jp' },
        { slug: 'us', title: 'Mỹ', type: 'Horizontal', path: 'us' },
        { slug: 'latest', title: 'Mới Nhất', type: 'Grid', path: 'latest' }
    ]);
}

function getPrimaryCategories() {
    return JSON.stringify([
        { name: 'Hôm nay', slug: 'today' },
        { name: 'Mới nhất', slug: 'latest' },
        { name: 'Diễn viên', slug: 'actors' }
    ]);
}

function getFilterConfig() {
    return JSON.stringify({
        sort: [{ name: 'Mới cập nhật', value: 'latest' }]
    });
}

// =============================================================================
// HELPERS
// =============================================================================

function safeJson(str) {
    try { return JSON.parse(str); } catch (e) { return {}; }
}

function safeArray(data) {
    return Array.isArray(data) ? data : [];
}

function getTrans(item, key) {
    if (!item) return "";
    var list = item.trans || item.translations || [];
    for (var i = 0; i < list.length; i++) {
        if (list[i].locale === 'vi' && list[i][key]) return list[i][key];
    }
    for (var j = 0; j < list.length; j++) {
        if (list[j].locale === 'en' && list[j][key]) return list[j][key];
    }
    return list[0] ? (list[0][key] || "") : "";
}

function getImage(item) {
    if (!item) return "";
    if (item.images && item.images.length) return item.images[0].path;
    return item.thumbnail || "";
}

// =============================================================================
// URLS
// =============================================================================

function getUrlList(slug, filtersJson) {
    var filters = safeJson(filtersJson);
    var page = filters.page || 1;

    var base = "https://topxx.vip/api/v1";
    var path = "";

    if (slug === 'today') path = "/movies/today";
    else if (slug === 'latest') path = "/movies/latest";
    else if (slug === 'actors') path = "/actors";
    else if (['vn', 'cn', 'jp', 'us'].indexOf(slug) !== -1)
        path = "/countries/" + slug + "/movies";
    else if (slug.indexOf("genre-") === 0)
        path = "/genres/" + slug.replace("genre-", "") + "/movies";
    else if (slug.indexOf("country-") === 0)
        path = "/countries/" + slug.replace("country-", "") + "/movies";
    else
        path = "/genres/" + slug + "/movies";

    return base + path + "?page=" + page;
}

function getUrlSearch(keyword, filtersJson) {
    var filters = safeJson(filtersJson);
    var page = filters.page || 1;

    if (!keyword) {
        return "https://topxx.vip/api/v1/movies/latest?page=" + page;
    }

    return "https://topxx.vip/api/v1/movies/latest?q=" +
        encodeURIComponent(keyword) + "&page=" + page;
}

function getUrlDetail(slug) {
    return "https://topxx.vip/api/v1/movies/" + slug;
}

function getUrlCategories() {
    return "https://topxx.vip/api/v1/genres";
}

function getUrlCountries() {
    return "https://topxx.vip/api/v1/countries";
}

// =============================================================================
// LIST PARSER
// =============================================================================

function parseListResponse(json) {
    try {
        var res = safeJson(json);

        var items =
            (res.data && res.data.items) ||
            (res.data && res.data.data) ||
            res.data ||
            res ||
            [];

        items = safeArray(items);

        var movies = [];

        for (var i = 0; i < items.length; i++) {
            var item = items[i];

            var isActor = item.gender || item.avatar;

            if (isActor) {
                var name = getTrans(item, 'name') || item.name || "";
                var code = item.code || name.toLowerCase().replace(/\s+/g, '-');

                movies.push({
                    id: "actor-" + code,
                    title: name || code,
                    posterUrl: item.avatar || "",
                    backdropUrl: item.avatar || "",
                    year: 0,
                    quality: "ACTOR",
                    episode_current: "",
                    lang: ""
                });

            } else {
                movies.push({
                    id: item.code,
                    title: getTrans(item, 'title') || item.code,
                    posterUrl: item.thumbnail || "",
                    backdropUrl: getImage(item),
                    year: item.publish_at ? parseInt(item.publish_at.substring(0, 4)) : 0,
                    quality: item.quality || "",
                    episode_current: item.duration || "",
                    lang: ""
                });
            }
        }

        var meta = res.meta || {};

        return JSON.stringify({
            items: movies,
            pagination: {
                currentPage: meta.current_page || 1,
                totalPages: meta.last_page || 1,
                totalItems: meta.total || movies.length,
                itemsPerPage: movies.length
            }
        });

    } catch (e) {
        return JSON.stringify({
            items: [],
            pagination: { currentPage: 1, totalPages: 1 }
        });
    }
}

function parseSearchResponse(json) {
    return parseListResponse(json);
}

// =============================================================================
// DETAIL
// =============================================================================

function parseMovieDetail(json) {
    try {
        var res = safeJson(json);
        var m = res.data || {};

        var title = getTrans(m, 'title') || m.code;
        var desc = getTrans(m, 'content') || getTrans(m, 'description') || "";

        var servers = [];

        if (m.sources && m.sources.length) {
            var eps = [];

            for (var i = 0; i < m.sources.length; i++) {
                var src = m.sources[i];
                var link = src.link;

                if (src.type === "embed" && link) {
                    var match = link.match(/\/player\/([^\/]+)/);
                    if (match) {
                        link = "https://embed.streamxx.net/stream/" + match[1] + "/main.m3u8";
                    }
                }

                eps.push({
                    id: link,
                    name: "Server " + (i + 1),
                    slug: "ep-" + (i + 1)
                });
            }

            servers.push({ name: "VIP", episodes: eps });
        }

        return JSON.stringify({
            id: m.code,
            title: title,
            originName: title,
            posterUrl: m.thumbnail || "",
            backdropUrl: getImage(m),
            description: desc,
            year: m.publish_at ? parseInt(m.publish_at.substring(0, 4)) : 0,
            rating: 0,
            quality: m.quality || "",
            servers: servers,
            episode_current: m.duration || "",
            lang: "",
            category: "",
            country: "",
            casts: ""
        });

    } catch (e) {
        return "null";
    }
}

// =============================================================================
// STREAM
// =============================================================================

function parseDetailResponse(input) {
    try {
        var url = "";

        if (typeof input === "string" && input.indexOf("http") === 0) {
            url = input;
        } else {
            var res = safeJson(input);

            if (res.data && res.data.sources && res.data.sources.length) {
                var s = res.data.sources[0];
                url = s.link || "";
            }
        }

        return JSON.stringify({
            url: url,
            headers: {
                "User-Agent": "Mozilla/5.0",
                "Referer": "https://embed.streamxx.net/"
            },
            subtitles: []
        });

    } catch (e) {
        return JSON.stringify({ url: input, headers: {} });
    }
}

// =============================================================================
// CATEGORIES / COUNTRIES
// =============================================================================

function parseCategoriesResponse(json) {
    try {
        var res = safeJson(json);
        var items = safeArray(res.data);

        return JSON.stringify(items.map(function (i) {
            return {
                name: getTrans(i, 'name') || i.code,
                slug: "genre-" + i.code
            };
        }));
    } catch (e) {
        return "[]";
    }
}

function parseCountriesResponse(json) {
    try {
        var res = safeJson(json);
        var items = safeArray(res.data);

        return JSON.stringify(items.map(function (i) {
            return {
                name: getTrans(i, 'name') || i.code,
                value: "country-" + i.code
            };
        }));
    } catch (e) {
        return "[]";
    }
}
