"use strict";
/* Initial demo content. Mirrors the original front-end demo so the
   seeded "Tandoori Tales" restaurant looks identical, now served from the DB. */

const pic = (seed, w = 800, h = 1000) => `https://picsum.photos/seed/${seed}/${w}/${h}`;

const SEED_CATEGORIES = [
  { id: "starters", label: "Starters" },
  { id: "main", label: "Main Course" },
  { id: "pizza", label: "Pizza" },
  { id: "burgers", label: "Burgers" },
  { id: "drinks", label: "Beverages" },
  { id: "desserts", label: "Desserts" },
];

const SEED_MENU = [
  { id: "butter-chicken", name: "Butter Chicken", cat: "main", price: 320, prep: 25, veg: false, spicy: true, rating: 4.8, likes: 1243, availability: "available", badges: ["bestseller", "chef"], image: pic("butterchicken"), desc: "Tandoor-charred chicken simmered in a velvety tomato-fenugreek gravy, finished with white butter.", pairs: ["garlic-naan", "masala-soda"] },
  { id: "paneer-tikka", name: "Paneer Tikka", cat: "starters", price: 260, prep: 18, veg: true, spicy: true, rating: 4.7, likes: 980, availability: "available", badges: ["popular"], image: pic("paneertikka"), desc: "Cubes of cottage cheese marinated in hung curd & spices, grilled over coals with peppers.", pairs: ["mint-cooler"] },
  { id: "chicken-biryani", name: "Hyderabadi Biryani", cat: "main", price: 290, prep: 30, veg: false, spicy: true, rating: 4.9, likes: 2110, availability: "limited", badges: ["bestseller"], image: pic("chickenbiryani"), desc: "Aged basmati layered with saffron, fried onions and slow-cooked chicken. Served with raita.", pairs: ["gulab-jamun"] },
  { id: "margherita", name: "Wood-Fired Margherita", cat: "pizza", price: 340, prep: 20, veg: true, spicy: false, rating: 4.6, likes: 760, availability: "available", badges: ["recommended"], image: pic("margheritapizza"), desc: "San Marzano tomato, fresh mozzarella di bufala and basil on a 48-hour fermented base.", pairs: ["garlic-bread", "masala-soda"] },
  { id: "smash-burger", name: "Double Smash Burger", cat: "burgers", price: 280, prep: 15, veg: false, spicy: false, rating: 4.7, likes: 1340, availability: "available", badges: ["popular"], image: pic("smashburger"), desc: "Two seared patties, molten cheddar, house pickles and burger sauce in a brioche bun.", pairs: ["fries", "masala-soda"] },
  { id: "garlic-naan", name: "Garlic Butter Naan", cat: "starters", price: 70, prep: 8, veg: true, spicy: false, rating: 4.5, likes: 410, availability: "available", badges: [], image: pic("garlicnaan"), desc: "Hand-stretched naan blistered in the tandoor, brushed with garlic and coriander butter.", pairs: [] },
  { id: "garlic-bread", name: "Cheesy Garlic Bread", cat: "starters", price: 160, prep: 12, veg: true, spicy: false, rating: 4.4, likes: 320, availability: "available", badges: [], image: pic("garlicbread"), desc: "Stone-baked baguette loaded with mozzarella, herbs and roasted garlic.", pairs: [] },
  { id: "fries", name: "Peri Peri Fries", cat: "starters", price: 140, prep: 10, veg: true, spicy: true, rating: 4.3, likes: 510, availability: "available", badges: [], image: pic("periperifries"), desc: "Skin-on fries tossed in smoky peri-peri with a side of garlic aioli.", pairs: [] },
  { id: "masala-soda", name: "Masala Jeera Soda", cat: "drinks", price: 90, prep: 4, veg: true, spicy: false, rating: 4.6, likes: 280, availability: "available", badges: ["recommended"], image: pic("masalasoda"), desc: "Chilled soda with roasted cumin, black salt and a squeeze of lime.", pairs: [] },
  { id: "mint-cooler", name: "Mint Lime Cooler", cat: "drinks", price: 110, prep: 5, veg: true, spicy: false, rating: 4.5, likes: 190, availability: "available", badges: [], image: pic("mintcooler"), desc: "Fresh mint, lime and a hint of honey over crushed ice.", pairs: [] },
  { id: "gulab-jamun", name: "Warm Gulab Jamun", cat: "desserts", price: 120, prep: 6, veg: true, spicy: false, rating: 4.8, likes: 870, availability: "available", badges: ["popular"], image: pic("gulabjamun"), desc: "Two saffron-soaked milk dumplings served warm with a scoop of rabri.", pairs: [] },
  { id: "brownie", name: "Molten Chocolate Brownie", cat: "desserts", price: 180, prep: 9, veg: true, spicy: false, rating: 4.9, likes: 1020, availability: "available", badges: ["chef", "recommended"], image: pic("chocolatebrownie"), desc: "Dark chocolate brownie with a molten centre, vanilla bean ice cream and sea salt.", pairs: [] },
];

const SEED_RESTAURANT = {
  name: "Tandoori Tales",
  handle: "tandooritales",
  bio: "Modern Indian kitchen · Wood-fired · Open till 11pm",
  logo: pic("tandoorilogo", 200, 200),
  tables: 12,
  promo: { tag: "Weekend offer", title: "Buy 2 Pizzas, get a Masala Soda free", image: pic("pizzaoffer", 800, 400) },
};

module.exports = { SEED_CATEGORIES, SEED_MENU, SEED_RESTAURANT };
