/* RestaurantOS — front-end data
 * These are mutable: when the page is opened at /r/:slug the loader below
 * fetches the live restaurant from the API and replaces them. Opened as a
 * plain file (no server), the demo values below render as a fallback.
 * All prices in INR.
 */

let RESTAURANT = {
  name: "Tandoori Tales",
  handle: "tandooritales",
  table: "QR012 · Table 12",
  bio: "Modern Indian kitchen · Wood-fired · Open till 11pm",
  avatar: "https://picsum.photos/seed/tandoorilogo/200/200",
};

// Story bubbles == quick categories / specials
let STORIES = [
  { id: "specials", label: "Specials", seed: "weekendcombo", live: true },
  { id: "chef", label: "Chef's", seed: "chefspecial" },
  { id: "starters", label: "Starters", seed: "paneertikka" },
  { id: "main", label: "Mains", seed: "butterchicken" },
  { id: "pizza", label: "Pizza", seed: "margheritapizza" },
  { id: "burgers", label: "Burgers", seed: "smashburger" },
  { id: "drinks", label: "Drinks", seed: "masalasoda" },
  { id: "desserts", label: "Sweets", seed: "gulabjamun" },
];

let CATEGORIES = [
  { id: "all", label: "All" },
  { id: "starters", label: "Starters" },
  { id: "main", label: "Main Course" },
  { id: "pizza", label: "Pizza" },
  { id: "burgers", label: "Burgers" },
  { id: "drinks", label: "Beverages" },
  { id: "desserts", label: "Desserts" },
];

// availability: "available" | "limited" | "out"
let MENU = [
  {
    id: "butter-chicken",
    name: "Butter Chicken",
    cat: "main",
    price: 320,
    prep: 25,
    veg: false,
    spicy: true,
    rating: 4.8,
    likes: 1243,
    availability: "available",
    badges: ["bestseller", "chef"],
    seed: "butterchicken",
    desc: "Tandoor-charred chicken simmered in a velvety tomato-fenugreek gravy, finished with white butter.",
    pairs: ["garlic-naan", "masala-soda"],
  },
  {
    id: "paneer-tikka",
    name: "Paneer Tikka",
    cat: "starters",
    price: 260,
    prep: 18,
    veg: true,
    spicy: true,
    rating: 4.7,
    likes: 980,
    availability: "available",
    badges: ["popular"],
    seed: "paneertikka",
    desc: "Cubes of cottage cheese marinated in hung curd & spices, grilled over coals with peppers.",
    pairs: ["mint-cooler"],
  },
  {
    id: "chicken-biryani",
    name: "Hyderabadi Biryani",
    cat: "main",
    price: 290,
    prep: 30,
    veg: false,
    spicy: true,
    rating: 4.9,
    likes: 2110,
    availability: "limited",
    badges: ["bestseller"],
    seed: "chickenbiryani",
    desc: "Aged basmati layered with saffron, fried onions and slow-cooked chicken. Served with raita.",
    pairs: ["gulab-jamun"],
  },
  {
    id: "margherita",
    name: "Wood-Fired Margherita",
    cat: "pizza",
    price: 340,
    prep: 20,
    veg: true,
    spicy: false,
    rating: 4.6,
    likes: 760,
    availability: "available",
    badges: ["recommended"],
    seed: "margheritapizza",
    desc: "San Marzano tomato, fresh mozzarella di bufala and basil on a 48-hour fermented base.",
    pairs: ["garlic-bread", "masala-soda"],
  },
  {
    id: "smash-burger",
    name: "Double Smash Burger",
    cat: "burgers",
    price: 280,
    prep: 15,
    veg: false,
    spicy: false,
    rating: 4.7,
    likes: 1340,
    availability: "available",
    badges: ["popular"],
    seed: "smashburger",
    desc: "Two seared beef-style patties, molten cheddar, house pickles and burger sauce in a brioche bun.",
    pairs: ["fries", "masala-soda"],
  },
  {
    id: "garlic-naan",
    name: "Garlic Butter Naan",
    cat: "starters",
    price: 70,
    prep: 8,
    veg: true,
    spicy: false,
    rating: 4.5,
    likes: 410,
    availability: "available",
    badges: [],
    seed: "garlicnaan",
    desc: "Hand-stretched naan blistered in the tandoor, brushed with garlic and coriander butter.",
    pairs: [],
  },
  {
    id: "garlic-bread",
    name: "Cheesy Garlic Bread",
    cat: "starters",
    price: 160,
    prep: 12,
    veg: true,
    spicy: false,
    rating: 4.4,
    likes: 320,
    availability: "available",
    badges: [],
    seed: "garlicbread",
    desc: "Stone-baked baguette loaded with mozzarella, herbs and roasted garlic.",
    pairs: [],
  },
  {
    id: "fries",
    name: "Peri Peri Fries",
    cat: "starters",
    price: 140,
    prep: 10,
    veg: true,
    spicy: true,
    rating: 4.3,
    likes: 510,
    availability: "available",
    badges: [],
    seed: "periperifries",
    desc: "Skin-on fries tossed in smoky peri-peri with a side of garlic aioli.",
    pairs: [],
  },
  {
    id: "masala-soda",
    name: "Masala Jeera Soda",
    cat: "drinks",
    price: 90,
    prep: 4,
    veg: true,
    spicy: false,
    rating: 4.6,
    likes: 280,
    availability: "available",
    badges: ["recommended"],
    seed: "masalasoda",
    desc: "Chilled soda with roasted cumin, black salt and a squeeze of lime.",
    pairs: [],
  },
  {
    id: "mint-cooler",
    name: "Mint Lime Cooler",
    cat: "drinks",
    price: 110,
    prep: 5,
    veg: true,
    spicy: false,
    rating: 4.5,
    likes: 190,
    availability: "available",
    badges: [],
    seed: "mintcooler",
    desc: "Fresh mint, lime and a hint of honey over crushed ice.",
    pairs: [],
  },
  {
    id: "gulab-jamun",
    name: "Warm Gulab Jamun",
    cat: "desserts",
    price: 120,
    prep: 6,
    veg: true,
    spicy: false,
    rating: 4.8,
    likes: 870,
    availability: "available",
    badges: ["popular"],
    seed: "gulabjamun",
    desc: "Two saffron-soaked milk dumplings served warm with a scoop of rabri.",
    pairs: [],
  },
  {
    id: "brownie",
    name: "Molten Chocolate Brownie",
    cat: "desserts",
    price: 180,
    prep: 9,
    veg: true,
    spicy: false,
    rating: 4.9,
    likes: 1020,
    availability: "available",
    badges: ["chef", "recommended"],
    seed: "chocolatebrownie",
    desc: "Dark chocolate brownie with a molten centre, vanilla bean ice cream and sea salt.",
    pairs: [],
  },
];

// Home promo banners (PRD: Advertisement System)
let BANNERS = [
  { id: "b1", title: "Buy 2 Pizzas, get a Masala Soda free", tag: "Weekend offer", seed: "pizzaoffer" },
  { id: "b2", title: "20% off all desserts after 9pm", tag: "Sweet hour", seed: "dessertoffer" },
];

// Call-waiter quick requests (PRD: Waiter Assistance)
const ASSIST = [
  { id: "water", label: "Water", icon: "ph-drop" },
  { id: "cutlery", label: "Cutlery", icon: "ph-fork-knife" },
  { id: "bill", label: "Get Bill", icon: "ph-receipt" },
  { id: "clean", label: "Clean Table", icon: "ph-broom" },
  { id: "manager", label: "Manager", icon: "ph-user-circle" },
];

// Live order status pipeline (PRD: Order Tracking)
const ORDER_STAGES = [
  { id: "received", label: "Order Received", icon: "ph-check-circle" },
  { id: "accepted", label: "Accepted", icon: "ph-thumbs-up" },
  { id: "preparing", label: "Preparing", icon: "ph-cooking-pot" },
  { id: "ready", label: "Ready", icon: "ph-bell-ringing" },
  { id: "served", label: "Served", icon: "ph-confetti" },
];

const helper = (id) => MENU.find((m) => m.id === id);

/* ===========================================================
   API LOADER — turns a live restaurant (from /api/r/:slug) into
   the globals the app renders. Returns true on success.
   =========================================================== */
function buildStories(restaurant) {
  // Derive story bubbles from categories, using a representative dish image.
  const stories = [];
  if (restaurant.promo) {
    stories.push({ id: "promo", label: "Offers", image: restaurant.promo.image, live: true });
  }
  (restaurant.categories || []).forEach((c) => {
    const dish = (restaurant.menu || []).find((m) => m.cat === c.id);
    stories.push({ id: c.id, label: c.label, image: dish ? dish.image : restaurant.logo });
  });
  return stories;
}

async function loadRestaurant(slug, table) {
  try {
    const res = await fetch("/api/r/" + encodeURIComponent(slug));
    if (!res.ok) return false;
    const d = await res.json();

    MENU = (d.menu || []).map((m) => ({ ...m, badges: m.badges || [], pairs: m.pairs || [] }));
    CATEGORIES = [{ id: "all", label: "All" }, ...(d.categories || [])];
    STORIES = buildStories(d);
    BANNERS = d.promo
      ? [{ id: "promo", title: d.promo.title, tag: d.promo.tag, image: d.promo.image }]
      : [];
    RESTAURANT = {
      name: d.name,
      handle: d.handle,
      bio: d.bio,
      avatar: d.logo,
      logo: d.logo,
      slug: d.slug,
      tables: d.tables,
      table: `Table ${table || 1} of ${d.tables}`,
    };
    return true;
  } catch (e) {
    console.warn("loadRestaurant failed:", e);
    return false;
  }
}
