/* Shared dish-photo resolver (customer site + owner panel).
   Honors a real owner image URL; else a keyword-matched real food photo. */
const MEAL = (id) => `https://www.themealdb.com/images/media/meals/${id}.jpg`;
const FOOD_BY_KW = [
  [/naan|bread|fries|paratha|roti|samosa|pakora|wrap/i, null], // no stock match -> keyword photo
  [/pizza|margherita|calzone/i, MEAL("x0lk931587671540")],
  [/burger|sandwich|slider/i, MEAL("lgmnff1763789847")],
  [/biryani|pulao|fried rice|rice|pilaf/i, MEAL("xrttsx1487339558")],
  [/paneer|tikka|tandoori/i, MEAL("xxpqsy1511452222")],
  [/brownie|cake|dessert|chocolate|jamun|kheer|halwa|ice ?cream|pudding/i, MEAL("yypvst1511386427")],
  [/soda|lassi|cooler|juice|drink|shake|mojito|lemonade|coffee|tea|beverage|mocktail/i, MEAL("0sd7ac1764787957")],
  [/chicken|curry|masala|korma|makhani|gravy|\bdal\b|mutton|lamb|fish/i, MEAL("sstssx1487349585")],
];
const foodLock = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % 100000; };
const foodImg = (name, w = 800, h = 1000) => {
  const tags = String(name || "food").replace(/[^a-z0-9 ]/gi, "").trim().split(/\s+/).slice(0, 3).join(",") || "food";
  return `https://loremflickr.com/${w}/${h}/${encodeURIComponent(tags)},food?lock=${foodLock(name)}`;
};
const mediaUrl = (m, w = 800, h = 1000) => {
  const url = m && m.image;
  if (url && !url.includes("picsum.photos")) return url;
  const name = (m && m.name) || "";
  for (const [re, photo] of FOOD_BY_KW) if (re.test(name)) return photo || foodImg(name, w, h);
  return foodImg(name, w, h);
};
