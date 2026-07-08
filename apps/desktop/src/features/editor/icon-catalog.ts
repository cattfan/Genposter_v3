export interface IconCatalogEntry {
  id: string;
  label: string;
  category: IconCategory;
  keywords: string[];
  svg: string;
}

export const ICON_CATEGORIES = [
  "Ẩm thực",
  "Du lịch",
  "Social",
  "Mũi tên",
  "Ngôi sao & tim",
  "Khác",
] as const;

export type IconCategory = (typeof ICON_CATEGORIES)[number];

function tablerSvg(body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
}

export const ICON_CATALOG: IconCatalogEntry[] = [
  // Ẩm thực
  {
    id: "cup",
    label: "Cốc",
    category: "Ẩm thực",
    keywords: ["cup", "drink", "glass", "uống"],
    svg: tablerSvg(
      '<path d="M5 11h14v-3h-14v3z"/><path d="M17.5 11l-1.5 7.5a2 2 0 0 1-2 2h-10a2 2 0 0 1-2-2l-1.5-7.5"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M7 8h10"/>',
    ),
  },
  {
    id: "coffee",
    label: "Cà phê",
    category: "Ẩm thực",
    keywords: ["coffee", "cafe", "espresso"],
    svg: tablerSvg(
      '<path d="M3 14c.83 2 2.83 3.5 4.5 3.5c1.67 0 3.67-1.5 4.5-3.5"/><path d="M8 3a2.4 2.4 0 0 0-1 2a2.4 2.4 0 0 0 1 2"/><path d="M12 3a2.4 2.4 0 0 0-1 2a2.4 2.4 0 0 0 1 2"/><path d="M3 10h17v5a3 3 0 0 1-3 3h-10a3 3 0 0 1-3-3v-5"/><path d="M12 14m-1 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0"/>',
    ),
  },
  {
    id: "wine",
    label: "Rượu vang",
    category: "Ẩm thực",
    keywords: ["wine", "glass", "alcohol"],
    svg: tablerSvg(
      '<path d="M8 22h8"/><path d="M7 10h10l-1 7.5a4 4 0 0 1-4 3.5h-2a4 4 0 0 1-4-3.5l-1-7.5"/><path d="M12 8l1.5-4.5h-3z"/><path d="M7 10l-2-6"/><path d="M17 10l2-6"/>',
    ),
  },
  {
    id: "beer",
    label: "Bia",
    category: "Ẩm thực",
    keywords: ["beer", "drink", "pub"],
    svg: tablerSvg(
      '<path d="M9 21h6"/><path d="M6 17h12v-7h-12z"/><path d="M12 17v4"/><path d="M7 8v-5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v5"/><path d="M7 14h.01"/><path d="M17 14h.01"/>',
    ),
  },
  {
    id: "pizza",
    label: "Pizza",
    category: "Ẩm thực",
    keywords: ["pizza", "food", "slice"],
    svg: tablerSvg(
      '<path d="M12 12c-2-2.667-6-4-6-4a1 1 0 0 1 0-2c0 0 4 1.333 6 4"/><path d="M12 12c2-2.667 6-4 6-4a1 1 0 0 0 0-2c0 0-4 1.333-6 4"/><path d="M12 12l-2 8"/><path d="M12 12l2 8"/><path d="M4 12c2.667 2 4 6 4 6a1 1 0 0 0 2 0c0 0-1.333-4-4-6"/><path d="M20 12c-2.667 2-4 6-4 6a1 1 0 0 1-2 0c0 0 1.333-4 4-6"/>',
    ),
  },
  {
    id: "cake",
    label: "Bánh ngọt",
    category: "Ẩm thực",
    keywords: ["cake", "birthday", "dessert"],
    svg: tablerSvg(
      '<path d="M3 14h.993c.902 0 1.634-.768 1.634-1.714v-1.572c0-.946-.732-1.714-1.634-1.714h-.993"/><path d="M21 14h-.993c-.902 0-1.634-.768-1.634-1.714v-1.572c0-.946.732-1.714 1.634-1.714h.993"/><path d="M7 14v4a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-4"/><path d="M7 10v4h10v-4"/><path d="M12 2v2"/><path d="M8 6h8"/><path d="M9 6v4"/><path d="M15 6v4"/>',
    ),
  },
  {
    id: "ice-cream",
    label: "Kem",
    category: "Ẩm thực",
    keywords: ["ice cream", "dessert", "sweet"],
    svg: tablerSvg(
      '<path d="M12 21l-3-6h6z"/><path d="M12 21v-6"/><path d="M9 15h6"/><path d="M12 3a5 5 0 0 1 5 5v4a5 5 0 0 1-10 0v-4a5 5 0 0 1 5-5z"/>',
    ),
  },
  {
    id: "apple",
    label: "Táo",
    category: "Ẩm thực",
    keywords: ["apple", "fruit", "healthy"],
    svg: tablerSvg(
      '<path d="M4 11.5c0 4.5 3.5 8 6 8s6-3.5 6-8c0-4-2-6-6-6s-6 2-6 6"/><path d="M12 4c0-1.5 1-2.5 2-3"/><path d="M12 4c0-1.5-1-2.5-2-3"/>',
    ),
  },
  {
    id: "fish",
    label: "Cá",
    category: "Ẩm thực",
    keywords: ["fish", "seafood", "hải sản"],
    svg: tablerSvg(
      '<path d="M16.69 7.44a6.97 6.97 0 0 0-1.69 4.56c0 1.75.64 3.37 1.69 4.56"/><path d="M2 9.504c7.29 1.301 9.806-1.019 11.035-1.019c1.929 0 2.984 1.444 3 3c.016 1.556-1.036 3-2.7 3c-1.664 0-2.5-1.5-2.5-1.5"/><path d="M18.5 10.5l2.5-2.5"/><path d="M4.5 13.5l-2.5 2.5"/><circle cx="10.5" cy="9.504" r=".5" fill="currentColor"/>',
    ),
  },
  {
    id: "meat",
    label: "Thịt",
    category: "Ẩm thực",
    keywords: ["meat", "steak", "bbq"],
    svg: tablerSvg(
      '<path d="M13.5 20.4c-2.7 1.5-5.5 1.5-8 0c-2.2-1.2-3.3-3.3-3.3-5.7c0-2.4 1.1-4.5 3.3-5.7c2.5-1.5 5.3-1.5 8 0c2.2 1.2 3.3 3.3 3.3 5.7c0 2.4-1.1 4.5-3.3 5.7"/><path d="M15 11l1-1"/><path d="M9 11l-1-1"/><path d="M11 15h.01"/>',
    ),
  },
  {
    id: "egg",
    label: "Trứng",
    category: "Ẩm thực",
    keywords: ["egg", "breakfast", "protein"],
    svg: tablerSvg(
      '<path d="M19 14.072c0 3.993-2.686 7.072-7 7.072s-7-3.36-7-7.072c0-3.993 2.686-8.928 7-8.928s7 4.935 7 8.928"/>',
    ),
  },
  {
    id: "bread",
    label: "Bánh mì",
    category: "Ẩm thực",
    keywords: ["bread", "bakery", "toast"],
    svg: tablerSvg(
      '<path d="M18 4a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3h-12a3 3 0 0 1-3-3v-8a3 3 0 0 1 3-3z"/><path d="M6 8h.01"/><path d="M10 8h.01"/><path d="M14 8h.01"/><path d="M18 8h.01"/>',
    ),
  },
  {
    id: "carrot",
    label: "Cà rốt",
    category: "Ẩm thực",
    keywords: ["carrot", "vegetable", "rau"],
    svg: tablerSvg(
      '<path d="M3 21s9-9 9-14"/><path d="M12 7c1.5-1.5 3-2 5-2"/><path d="M12 7c-1.5-1.5-3-2-5-2"/><path d="M12 7v14"/><path d="M9 12h6"/>',
    ),
  },
  {
    id: "lemon",
    label: "Chanh",
    category: "Ẩm thực",
    keywords: ["lemon", "citrus", "fruit"],
    svg: tablerSvg(
      '<path d="M17.536 3.393c3.905 3.906 3.905 10.237 0 14.143c-3.906 3.905-10.237 3.905-14.143 0l14.143-14.143"/><path d="M5.868 15.06a6.5 6.5 0 0 0 3.535 3.535"/><path d="M13 13l-5-5"/>',
    ),
  },
  {
    id: "cherry",
    label: "Cherry",
    category: "Ẩm thực",
    keywords: ["cherry", "fruit", "berry"],
    svg: tablerSvg(
      '<path d="M7.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="M15.5 16.5c1.5 1.26 2 5 2 5s-3.74-.5-5-2c-.71-.84-.7-2.13.09-2.91a2.18 2.18 0 0 1 2.91-.09z"/><path d="M8 8l1.5-1.5"/><path d="M16 8l-1.5-1.5"/><path d="M12 3v5"/>',
    ),
  },
  {
    id: "soup",
    label: "Súp",
    category: "Ẩm thực",
    keywords: ["soup", "bowl", "món"],
    svg: tablerSvg(
      '<path d="M4 11h16a1 1 0 0 1 1 1v.5c0 2.5-2 4.5-4.5 4.5h-9c-2.5 0-4.5-2-4.5-4.5v-.5a1 1 0 0 1 1-1z"/><path d="M12 4v3"/><path d="M6 4v1"/><path d="M18 4v1"/><path d="M4 11h16"/>',
    ),
  },
  {
    id: "salad",
    label: "Salad",
    category: "Ẩm thực",
    keywords: ["salad", "vegetable", "healthy"],
    svg: tablerSvg(
      '<path d="M4 11h16a1 1 0 0 1 1 1v.5c0 2.5-2 4.5-4.5 4.5h-9c-2.5 0-4.5-2-4.5-4.5v-.5a1 1 0 0 1 1-1z"/><path d="M8 11v-3a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v3"/><path d="M10 6v-2"/><path d="M14 6v-2"/>',
    ),
  },
  {
    id: "grill",
    label: "Nướng BBQ",
    category: "Ẩm thực",
    keywords: ["grill", "bbq", "barbecue"],
    svg: tablerSvg(
      '<path d="M3 16h18"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/><path d="M7 16v-4a5 5 0 0 1 10 0v4"/><path d="M9 12h6"/>',
    ),
  },
  {
    id: "bottle",
    label: "Chai",
    category: "Ẩm thực",
    keywords: ["bottle", "drink", "water"],
    svg: tablerSvg(
      '<path d="M10 5h4v3a1 1 0 0 1 1 1v11a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-11a1 1 0 0 1 1-1v-3"/><path d="M10 5l-1-2h6l-1 2"/>',
    ),
  },
  {
    id: "milk",
    label: "Sữa",
    category: "Ẩm thực",
    keywords: ["milk", "dairy", "drink"],
    svg: tablerSvg(
      '<path d="M8 6h8v12a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-12"/><path d="M10 6v-3h4v3"/><path d="M7 12h.01"/><path d="M17 12h.01"/>',
    ),
  },
  {
    id: "tea",
    label: "Trà",
    category: "Ẩm thực",
    keywords: ["tea", "cup", "hot"],
    svg: tablerSvg(
      '<path d="M9 17h6"/><path d="M5 6h14"/><path d="M6 6v11a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-11"/><path d="M12 2v2"/><path d="M19 10h1a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2h-1"/>',
    ),
  },
  {
    id: "tools-kitchen",
    label: "Dao nĩa",
    category: "Ẩm thực",
    keywords: ["fork", "knife", "cutlery", "ăn"],
    svg: tablerSvg(
      '<path d="M4 3v8a3 3 0 0 0 6 0v-8"/><path d="M7 3v8"/><path d="M20 3v12h-2.5"/><path d="M14 3v6h2.5"/><path d="M14 12v6"/><path d="M14 19h2.5"/>',
    ),
  },

  // Du lịch
  {
    id: "plane",
    label: "Máy bay",
    category: "Du lịch",
    keywords: ["plane", "flight", "airport"],
    svg: tablerSvg(
      '<path d="M16 10h4a2 2 0 0 1 0 4h-4l-4 7h-3l2-7h-4l-2 2h-3l2-4l-2-4h3l2 2h4l-2-7h3z"/>',
    ),
  },
  {
    id: "map",
    label: "Bản đồ",
    category: "Du lịch",
    keywords: ["map", "location", "guide"],
    svg: tablerSvg(
      '<path d="M3 7l6-3l6 3l6-3v13l-6 3l-6-3l-6 3z"/><path d="M9 4v13"/><path d="M15 7v13"/>',
    ),
  },
  {
    id: "map-pin",
    label: "Ghim vị trí",
    category: "Du lịch",
    keywords: ["pin", "location", "marker"],
    svg: tablerSvg(
      '<path d="M9 11a3 3 0 1 0 6 0a3 3 0 0 0-6 0"/><path d="M17.657 16.657l-4.243 4.243a2 2 0 0 1-2.827 0l-4.244-4.243a8 8 0 1 1 11.314 0z"/>',
    ),
  },
  {
    id: "compass",
    label: "La bàn",
    category: "Du lịch",
    keywords: ["compass", "direction", "navigate"],
    svg: tablerSvg(
      '<path d="M8 16l2-6l6-2l-2 6l-6 2"/><circle cx="12" cy="12" r="10"/>',
    ),
  },
  {
    id: "camera",
    label: "Máy ảnh",
    category: "Du lịch",
    keywords: ["camera", "photo", "travel"],
    svg: tablerSvg(
      '<path d="M5 7h1a2 2 0 0 0 2-2a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1a2 2 0 0 0 2 2h1a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-14a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2"/><circle cx="12" cy="13" r="3"/>',
    ),
  },
  {
    id: "beach",
    label: "Biển",
    category: "Du lịch",
    keywords: ["beach", "sea", "summer"],
    svg: tablerSvg(
      '<path d="M17.553 16.75a7.5 7.5 0 0 0-10.606 0"/><path d="M18 3.804a6 6 0 0 0-8.196 2.196l10.392 6a6 6 0 0 0-2.196-8.196"/><path d="M16.732 10c1.658-2.87 2.225-5.644 1.268-6.196c-.957-.552-3.075 1.266-4.732 4.136"/><path d="M15 9l-3 3l-3-3"/><path d="M12 12v9"/>',
    ),
  },
  {
    id: "sun",
    label: "Mặt trời",
    category: "Du lịch",
    keywords: ["sun", "sunny", "weather"],
    svg: tablerSvg(
      '<circle cx="12" cy="12" r="4"/><path d="M3 12h1m8-9v1m8 8h1m-9 8v1m-6.4-15.4l.7.7m12.1-.7l-.7.7m0 11.4l.7.7m-12.1-.7l-.7.7"/>',
    ),
  },
  {
    id: "mountain",
    label: "Núi",
    category: "Du lịch",
    keywords: ["mountain", "hike", "nature"],
    svg: tablerSvg(
      '<path d="M3 20h18l-6.5-9l-3.5 5l-3.5-5z"/><path d="M10.5 11l2.5 3l2.5-3"/>',
    ),
  },
  {
    id: "building",
    label: "Khách sạn",
    category: "Du lịch",
    keywords: ["hotel", "building", "stay"],
    svg: tablerSvg(
      '<path d="M3 21h18"/><path d="M9 8h1"/><path d="M9 12h1"/><path d="M9 16h1"/><path d="M14 8h1"/><path d="M14 12h1"/><path d="M14 16h1"/><path d="M5 21v-16a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/>',
    ),
  },
  {
    id: "tent",
    label: "Lều",
    category: "Du lịch",
    keywords: ["tent", "camp", "camping"],
    svg: tablerSvg(
      '<path d="M12 13v8"/><path d="M4 21h16"/><path d="M8 13v8"/><path d="M16 13v8"/><path d="M4 21l8-13l8 13"/><path d="M12 5l-2 3h4z"/>',
    ),
  },
  {
    id: "luggage",
    label: "Vali",
    category: "Du lịch",
    keywords: ["luggage", "suitcase", "travel"],
    svg: tablerSvg(
      '<path d="M6 20a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2"/><path d="M6 11h12"/><path d="M12 11v9"/><path d="M9 6v-2a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
    ),
  },
  {
    id: "passport",
    label: "Hộ chiếu",
    category: "Du lịch",
    keywords: ["passport", "visa", "id"],
    svg: tablerSvg(
      '<path d="M13 3v18"/><path d="M5 7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-10a2 2 0 0 1-2-2z"/><circle cx="9" cy="12" r="2"/>',
    ),
  },
  {
    id: "ship",
    label: "Tàu biển",
    category: "Du lịch",
    keywords: ["ship", "cruise", "boat"],
    svg: tablerSvg(
      '<path d="M2 20a2.4 2.4 0 0 0 2 1a2.4 2.4 0 0 0 2-1a2.4 2.4 0 0 1 2-1a2.4 2.4 0 0 1 2 1a2.4 2.4 0 0 0 2 1a2.4 2.4 0 0 0 2-1a2.4 2.4 0 0 1 2-1a2.4 2.4 0 0 1 2 1a2.4 2.4 0 0 0 2 1a2.4 2.4 0 0 0 2-1"/><path d="M4 18l-1-5h18l-1 5"/><path d="M5 13v-6h14v6"/><path d="M7 10v-3"/><path d="M17 10v-3"/>',
    ),
  },
  {
    id: "train",
    label: "Tàu hỏa",
    category: "Du lịch",
    keywords: ["train", "rail", "transport"],
    svg: tablerSvg(
      '<path d="M21 13c0-3.87-3.37-7-10-7h-8"/><path d="M3 15h16a2 2 0 0 0 2-2"/><path d="M3 10v11"/><path d="M21 10v11"/><path d="M8 14v.01"/><path d="M8 19v.01"/><path d="M12 19v.01"/><path d="M16 19v.01"/><path d="M16 14v.01"/>',
    ),
  },
  {
    id: "car",
    label: "Ô tô",
    category: "Du lịch",
    keywords: ["car", "drive", "road trip"],
    svg: tablerSvg(
      '<path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0"/><path d="M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0"/><path d="M5 17h-2v-6l2-5h9l4 5h1a2 2 0 0 1 2 2v4h-2m-4 0h-6m-6-6h15m-6 0v-5"/>',
    ),
  },
  {
    id: "bike",
    label: "Xe đạp",
    category: "Du lịch",
    keywords: ["bike", "bicycle", "cycle"],
    svg: tablerSvg(
      '<circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6a1 1 0 1 0 0-2a1 1 0 0 0 0 2"/><path d="M12 17.5v-6.5l-3-3"/><path d="M6 10l3-3l4 8l4-5h3"/>',
    ),
  },
  {
    id: "world",
    label: "Thế giới",
    category: "Du lịch",
    keywords: ["world", "globe", "earth"],
    svg: tablerSvg(
      '<circle cx="12" cy="12" r="9"/><path d="M3.6 9h16.8"/><path d="M3.6 15h16.8"/><path d="M11.5 3a17 17 0 0 0 0 18"/><path d="M12.5 3a17 17 0 0 1 0 18"/>',
    ),
  },
  {
    id: "route",
    label: "Lộ trình",
    category: "Du lịch",
    keywords: ["route", "path", "journey"],
    svg: tablerSvg(
      '<circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M12 19h4.5a3.5 3.5 0 0 0 0-7h-8a3.5 3.5 0 0 1 0-7h4.5"/>',
    ),
  },
  {
    id: "umbrella",
    label: "Ô dù",
    category: "Du lịch",
    keywords: ["umbrella", "rain", "beach"],
    svg: tablerSvg(
      '<path d="M12 12m-8 0a8 3 0 1 0 16 0a8 3 0 1 0-16 0"/><path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/><path d="M12 12v9"/>',
    ),
  },
  {
    id: "tree-palm",
    label: "Cây cọ",
    category: "Du lịch",
    keywords: ["palm", "tropical", "island"],
    svg: tablerSvg(
      '<path d="M12 10v10"/><path d="M12 10c-1.5-2-4-3-6-3c-2 0-3 1-3 3c0 2 2 3 4 3"/><path d="M12 10c1.5-2 4-3 6-3c2 0 3 1 3 3c0 2-2 3-4 3"/><path d="M12 10c-2-1.5-3-4-3-6c0-2 1-3 3-3c2 0 3 1 3 3c0 2-1 4.5-3 6"/>',
    ),
  },
  {
    id: "binoculars",
    label: "Ống nhòm",
    category: "Du lịch",
    keywords: ["binoculars", "sightseeing", "view"],
    svg: tablerSvg(
      '<circle cx="6" cy="15" r="4"/><circle cx="18" cy="15" r="4"/><path d="M10 15h4"/><path d="M6 11v-3a2 2 0 0 1 2-2h1"/><path d="M18 11v-3a2 2 0 0 0-2-2h-1"/>',
    ),
  },

  // Social
  {
    id: "brand-instagram",
    label: "Instagram",
    category: "Social",
    keywords: ["instagram", "ig", "social"],
    svg: tablerSvg(
      '<rect x="4" y="4" width="16" height="16" rx="4"/><circle cx="12" cy="12" r="3"/><path d="M16.5 7.5v.01"/>',
    ),
  },
  {
    id: "brand-facebook",
    label: "Facebook",
    category: "Social",
    keywords: ["facebook", "fb", "social"],
    svg: tablerSvg(
      '<path d="M7 10v4h3v7h4v-7h3l1-4h-4v-2a1 1 0 0 1 1-1h3v-4h-3a5 5 0 0 0-5 5v2z"/>',
    ),
  },
  {
    id: "brand-twitter",
    label: "Twitter / X",
    category: "Social",
    keywords: ["twitter", "x", "social"],
    svg: tablerSvg(
      '<path d="M4 4l11.733 16h4.267l-11.733-16z"/><path d="M4 20l6.768-6.768m2.46-2.46l6.772-6.772"/>',
    ),
  },
  {
    id: "brand-youtube",
    label: "YouTube",
    category: "Social",
    keywords: ["youtube", "video", "social"],
    svg: tablerSvg(
      '<rect x="3" y="5" width="18" height="14" rx="4"/><path d="M10 9l5 3l-5 3z"/>',
    ),
  },
  {
    id: "brand-tiktok",
    label: "TikTok",
    category: "Social",
    keywords: ["tiktok", "video", "social"],
    svg: tablerSvg(
      '<path d="M9 12a4 4 0 1 0 4 4v-12a5 5 0 0 0 5 5"/>',
    ),
  },
  {
    id: "share",
    label: "Chia sẻ",
    category: "Social",
    keywords: ["share", "send", "social"],
    svg: tablerSvg(
      '<circle cx="6" cy="12" r="3"/><circle cx="18" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><path d="M8.7 10.7l6.6-3.4"/><path d="M8.7 13.3l6.6 3.4"/>',
    ),
  },
  {
    id: "message",
    label: "Tin nhắn",
    category: "Social",
    keywords: ["message", "chat", "comment"],
    svg: tablerSvg(
      '<path d="M8 9h8"/><path d="M8 13h6"/><path d="M18 4a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3h-5l-5 3v-3h-2a3 3 0 0 1-3-3v-8a3 3 0 0 1 3-3h12z"/>',
    ),
  },
  {
    id: "mail",
    label: "Email",
    category: "Social",
    keywords: ["mail", "email", "contact"],
    svg: tablerSvg(
      '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6l9-6"/>',
    ),
  },
  {
    id: "phone",
    label: "Điện thoại",
    category: "Social",
    keywords: ["phone", "call", "contact"],
    svg: tablerSvg(
      '<path d="M5 4h4l2 5l-2.5 1.5a11 11 0 0 0 5 5l1.5-2.5l5 2v4a2 2 0 0 1-2 2a16 16 0 0 1-15-15a2 2 0 0 1 2-2"/>',
    ),
  },
  {
    id: "hash",
    label: "Hashtag",
    category: "Social",
    keywords: ["hashtag", "tag", "social"],
    svg: tablerSvg(
      '<path d="M5 9l14 0"/><path d="M5 15l14 0"/><path d="M11 4l-2 16"/><path d="M15 4l-2 16"/>',
    ),
  },
  {
    id: "at",
    label: "Mention @",
    category: "Social",
    keywords: ["at", "mention", "username"],
    svg: tablerSvg(
      '<circle cx="12" cy="12" r="4"/><path d="M16 12v1a3 3 0 0 0 3 3"/><path d="M16 7v4a4 4 0 0 1-4 4h-1a4 4 0 0 1-4-4v-2a4 4 0 0 1 4-4h1"/>',
    ),
  },
  {
    id: "link",
    label: "Liên kết",
    category: "Social",
    keywords: ["link", "url", "connect"],
    svg: tablerSvg(
      '<path d="M9 15l6-6"/><path d="M11 6l.463-.462a5 5 0 0 1 7.071 7.071l-.462.463"/><path d="M13 18l-.462.462a5 5 0 0 1-7.071-7.071l.462-.463"/>',
    ),
  },
  {
    id: "users",
    label: "Nhóm",
    category: "Social",
    keywords: ["users", "group", "team"],
    svg: tablerSvg(
      '<path d="M9 7m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M21 21v-2a4 4 0 0 0-3-3.85"/>',
    ),
  },
  {
    id: "user",
    label: "Người dùng",
    category: "Social",
    keywords: ["user", "profile", "account"],
    svg: tablerSvg(
      '<path d="M8 7a4 4 0 1 0 8 0a4 4 0 0 0-8 0"/><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>',
    ),
  },

  // Mũi tên
  {
    id: "arrow-up",
    label: "Mũi tên lên",
    category: "Mũi tên",
    keywords: ["arrow", "up", "top"],
    svg: tablerSvg(
      '<path d="M12 5v14"/><path d="M18 11l-6-6"/><path d="M6 11l6-6"/>',
    ),
  },
  {
    id: "arrow-down",
    label: "Mũi tên xuống",
    category: "Mũi tên",
    keywords: ["arrow", "down", "bottom"],
    svg: tablerSvg(
      '<path d="M12 5v14"/><path d="M18 13l-6 6"/><path d="M6 13l6 6"/>',
    ),
  },
  {
    id: "arrow-left",
    label: "Mũi tên trái",
    category: "Mũi tên",
    keywords: ["arrow", "left", "back"],
    svg: tablerSvg(
      '<path d="M5 12h14"/><path d="M5 12l6 6"/><path d="M5 12l6-6"/>',
    ),
  },
  {
    id: "arrow-right",
    label: "Mũi tên phải",
    category: "Mũi tên",
    keywords: ["arrow", "right", "next"],
    svg: tablerSvg(
      '<path d="M5 12h14"/><path d="M13 18l6-6"/><path d="M13 6l6 6"/>',
    ),
  },
  {
    id: "arrow-narrow-right",
    label: "Mũi tên mảnh phải",
    category: "Mũi tên",
    keywords: ["arrow", "narrow", "next"],
    svg: tablerSvg(
      '<path d="M5 12h14"/><path d="M15 16l4-4"/><path d="M15 8l4 4"/>',
    ),
  },
  {
    id: "chevron-up",
    label: "Chevron lên",
    category: "Mũi tên",
    keywords: ["chevron", "up", "collapse"],
    svg: tablerSvg('<path d="M6 15l6-6l6 6"/>'),
  },
  {
    id: "chevron-down",
    label: "Chevron xuống",
    category: "Mũi tên",
    keywords: ["chevron", "down", "expand"],
    svg: tablerSvg('<path d="M6 9l6 6l6-6"/>'),
  },
  {
    id: "chevron-left",
    label: "Chevron trái",
    category: "Mũi tên",
    keywords: ["chevron", "left", "back"],
    svg: tablerSvg('<path d="M15 6l-6 6l6 6"/>'),
  },
  {
    id: "chevron-right",
    label: "Chevron phải",
    category: "Mũi tên",
    keywords: ["chevron", "right", "next"],
    svg: tablerSvg('<path d="M9 6l6 6l-6 6"/>'),
  },
  {
    id: "arrows-right-left",
    label: "Hai chiều ngang",
    category: "Mũi tên",
    keywords: ["swap", "exchange", "horizontal"],
    svg: tablerSvg(
      '<path d="M17 3l4 4l-4 4"/><path d="M3 11h18"/><path d="M7 21l-4-4l4-4"/><path d="M21 13h-18"/>',
    ),
  },
  {
    id: "arrow-big-right",
    label: "Mũi tên lớn phải",
    category: "Mũi tên",
    keywords: ["arrow", "big", "cta"],
    svg: tablerSvg(
      '<path d="M12 9v-3.586a1 1 0 0 1 1.707-.707l6.586 6.586a1 1 0 0 1 0 1.414l-6.586 6.586a1 1 0 0 1-1.707-.707v-3.586h-6a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h6z"/>',
    ),
  },
  {
    id: "arrow-back-up",
    label: "Quay lại",
    category: "Mũi tên",
    keywords: ["back", "return", "undo"],
    svg: tablerSvg(
      '<path d="M9 14l-4-4l4-4"/><path d="M5 10h11a4 4 0 1 1 0 8h-1"/>',
    ),
  },
  {
    id: "arrow-forward-up",
    label: "Tiến tới",
    category: "Mũi tên",
    keywords: ["forward", "next", "redo"],
    svg: tablerSvg(
      '<path d="M15 14l4-4l-4-4"/><path d="M19 10h-11a4 4 0 1 0 0 8h1"/>',
    ),
  },

  // Ngôi sao & tim
  {
    id: "star",
    label: "Ngôi sao",
    category: "Ngôi sao & tim",
    keywords: ["star", "rating", "favorite"],
    svg: tablerSvg(
      '<path d="M12 17.75l-6.172 3.245l1.179-6.873l-5-4.867l6.9-1l3.086-6.253l3.086 6.253l6.9 1l-5 4.867l1.179 6.873z"/>',
    ),
  },
  {
    id: "stars",
    label: "Nhiều sao",
    category: "Ngôi sao & tim",
    keywords: ["stars", "sparkle", "premium"],
    svg: tablerSvg(
      '<path d="M17 4l1 2l2 1l-2 1l-1 2l-1-2l-2-1l2-1z"/><path d="M7 14l1.5 3l3 1.5l-3 1.5l-1.5 3l-1.5-3l-3-1.5l3-1.5z"/><path d="M17 14l1 2l2 1l-2 1l-1 2l-1-2l-2-1l2-1z"/>',
    ),
  },
  {
    id: "heart",
    label: "Trái tim",
    category: "Ngôi sao & tim",
    keywords: ["heart", "love", "like"],
    svg: tablerSvg(
      '<path d="M19.5 12.572l-7.5 7.428l-7.5-7.428a5 5 0 1 1 7.5-6.566a5 5 0 1 1 7.5 6.572"/>',
    ),
  },
  {
    id: "heart-broken",
    label: "Tim vỡ",
    category: "Ngôi sao & tim",
    keywords: ["heart", "broken", "sad"],
    svg: tablerSvg(
      '<path d="M19.5 12.572l-7.5 7.428l-2.896-2.867m-4.604-4.561a5 5 0 1 1 7.896-6.082"/><path d="M12 6l-2-2"/>',
    ),
  },
  {
    id: "award",
    label: "Huy chương",
    category: "Ngôi sao & tim",
    keywords: ["award", "medal", "best"],
    svg: tablerSvg(
      '<circle cx="12" cy="9" r="6"/><path d="M12 15v6"/><path d="M8 21h8"/><path d="M9 9h.01"/><path d="M15 9h.01"/>',
    ),
  },
  {
    id: "crown",
    label: "Vương miện",
    category: "Ngôi sao & tim",
    keywords: ["crown", "vip", "premium"],
    svg: tablerSvg(
      '<path d="M12 6l4 6l5-4l-2 10h-14l-2-10l5 4z"/>',
    ),
  },
  {
    id: "sparkles",
    label: "Lấp lánh",
    category: "Ngôi sao & tim",
    keywords: ["sparkle", "shine", "magic"],
    svg: tablerSvg(
      '<path d="M16 18a2 2 0 0 1 2 2a2 2 0 0 1 2-2a2 2 0 0 1-2-2a2 2 0 0 1-2 2z"/><path d="M7 14a2 2 0 0 1 2 2a2 2 0 0 1 2-2a2 2 0 0 1-2-2a2 2 0 0 1-2 2z"/><path d="M12 2l1.5 4.5l4.5 1.5l-4.5 1.5l-1.5 4.5l-1.5-4.5l-4.5-1.5l4.5-1.5z"/>',
    ),
  },
  {
    id: "thumb-up",
    label: "Thích",
    category: "Ngôi sao & tim",
    keywords: ["like", "thumb", "approve"],
    svg: tablerSvg(
      '<path d="M7 11v8a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h3a4 4 0 0 0 4-4v-1a2 2 0 0 1 4 0v5h3a2 2 0 0 1 2 2l-1 5a2 3 0 0 1-2 2h-7a3 3 0 0 1-3-3"/>',
    ),
  },
  {
    id: "mood-smile",
    label: "Cười",
    category: "Ngôi sao & tim",
    keywords: ["smile", "happy", "emoji"],
    svg: tablerSvg(
      '<circle cx="12" cy="12" r="9"/><path d="M9 10h.01"/><path d="M15 10h.01"/><path d="M9.5 15a3.5 3.5 0 1 0 5 0"/>',
    ),
  },
  {
    id: "star-half",
    label: "Nửa sao",
    category: "Ngôi sao & tim",
    keywords: ["star", "half", "rating"],
    svg: tablerSvg(
      '<path d="M12 17.75l-6.172 3.245l1.179-6.873l-5-4.867l6.9-1l3.086-6.253l3.086 6.253l6.9 1l-5 4.867l1.179 6.873z"/><path d="M12 2v15"/>',
    ),
  },

  // Khác
  {
    id: "clock",
    label: "Đồng hồ",
    category: "Khác",
    keywords: ["clock", "time", "hours"],
    svg: tablerSvg(
      '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
    ),
  },
  {
    id: "calendar",
    label: "Lịch",
    category: "Khác",
    keywords: ["calendar", "date", "event"],
    svg: tablerSvg(
      '<path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-12a2 2 0 0 1-2-2z"/><path d="M16 3v4"/><path d="M8 3v4"/><path d="M4 11h16"/><path d="M11 15h1"/><path d="M12 15v3"/>',
    ),
  },
  {
    id: "tag",
    label: "Thẻ giá",
    category: "Khác",
    keywords: ["tag", "price", "label"],
    svg: tablerSvg(
      '<path d="M7.5 7.5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0"/><path d="M3 7v2a6 6 0 0 0 6 6h2"/><path d="M13 5l5.5 5.5a2.121 2.121 0 0 1 0 3l-3 3a2.121 2.121 0 0 1-3 0l-5.5-5.5"/>',
    ),
  },
  {
    id: "percent",
    label: "Giảm giá",
    category: "Khác",
    keywords: ["percent", "discount", "sale"],
    svg: tablerSvg(
      '<circle cx="17" cy="17" r="1"/><circle cx="7" cy="7" r="1"/><path d="M6 18l12-12"/>',
    ),
  },
  {
    id: "check",
    label: "Tích",
    category: "Khác",
    keywords: ["check", "done", "yes"],
    svg: tablerSvg('<path d="M5 12l5 5l10-10"/>'),
  },
  {
    id: "x",
    label: "Đóng",
    category: "Khác",
    keywords: ["x", "close", "cancel"],
    svg: tablerSvg('<path d="M18 6l-12 12"/><path d="M6 6l12 12"/>'),
  },
  {
    id: "plus",
    label: "Cộng",
    category: "Khác",
    keywords: ["plus", "add", "new"],
    svg: tablerSvg('<path d="M12 5v14"/><path d="M5 12h14"/>'),
  },
  {
    id: "search",
    label: "Tìm kiếm",
    category: "Khác",
    keywords: ["search", "find", "zoom"],
    svg: tablerSvg(
      '<circle cx="10" cy="10" r="7"/><path d="M21 21l-6-6"/>',
    ),
  },
  {
    id: "music",
    label: "Nhạc",
    category: "Khác",
    keywords: ["music", "note", "audio"],
    svg: tablerSvg(
      '<circle cx="6" cy="17" r="3"/><circle cx="16" cy="17" r="3"/><path d="M9 17h7"/><path d="M19 17v-11l-8-2v13"/>',
    ),
  },
  {
    id: "flame",
    label: "Lửa hot",
    category: "Khác",
    keywords: ["flame", "hot", "trending"],
    svg: tablerSvg(
      '<path d="M12 12c2-2.96 0-7-1-8c0 3.038-1.773 3.741-3 5.5c-.875 1.25-1.5 2.5-1.5 4.5a5 5 0 1 0 10 0c0-2-1-3.5-1.5-4.5c-1.227-1.759-3-2.462-3-5.5c-1 1-3 5.04-1 8"/>',
    ),
  },
  {
    id: "bolt",
    label: "Tia sét",
    category: "Khác",
    keywords: ["bolt", "flash", "energy"],
    svg: tablerSvg('<path d="M13 3l0 7l6 0l-8 11l0-7l-6 0l8-11"/>'),
  },
  {
    id: "trophy",
    label: "Cúp",
    category: "Khác",
    keywords: ["trophy", "winner", "award"],
    svg: tablerSvg(
      '<path d="M8 21l8 0"/><path d="M12 17l0 4"/><path d="M7 4h10"/><path d="M17 4v8a5 5 0 0 1-10 0v-8"/><path d="M5 9m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0"/><path d="M19 9m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0"/>',
    ),
  },
  {
    id: "gift",
    label: "Quà tặng",
    category: "Khác",
    keywords: ["gift", "present", "bonus"],
    svg: tablerSvg(
      '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2h-10a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5a4.8 8 0 0 1 4.5 5a4.8 8 0 0 1 4.5-5a2.5 2.5 0 0 1 0 5"/>',
    ),
  },
  {
    id: "quote",
    label: "Trích dẫn",
    category: "Khác",
    keywords: ["quote", "testimonial", "review"],
    svg: tablerSvg(
      '<path d="M10 11h-4a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v3"/><path d="M19 11h-4a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v3"/>',
    ),
  },
  {
    id: "bookmark",
    label: "Bookmark",
    category: "Khác",
    keywords: ["bookmark", "save", "favorite"],
    svg: tablerSvg('<path d="M9 4h6a2 2 0 0 1 2 2v14l-5-3l-5 3v-14a2 2 0 0 1 2-2"/>'),
  },
  {
    id: "flag",
    label: "Cờ",
    category: "Khác",
    keywords: ["flag", "mark", "highlight"],
    svg: tablerSvg(
      '<path d="M5 5a5 5 0 0 1 7 0a5 5 0 0 0 7 0v9a5 5 0 0 1-7 0a5 5 0 0 0-7 0z"/><path d="M5 21v-7"/>',
    ),
  },
  {
    id: "player-play",
    label: "Phát",
    category: "Khác",
    keywords: ["play", "video", "start"],
    svg: tablerSvg('<path d="M7 4v16l13-8z"/>'),
  },
  {
    id: "eye",
    label: "Xem",
    category: "Khác",
    keywords: ["eye", "view", "watch"],
    svg: tablerSvg(
      '<path d="M10 12a2 2 0 1 0 4 0a2 2 0 0 0-4 0"/><path d="M21 12c-2.4 4-5.4 6-9 6s-6.6-2-9-6c2.4-4 5.4-6 9-6s6.6 2 9 6"/>',
    ),
  },
  {
    id: "lock",
    label: "Khóa",
    category: "Khác",
    keywords: ["lock", "secure", "private"],
    svg: tablerSvg(
      '<rect x="5" y="11" width="14" height="10" rx="2"/><circle cx="12" cy="16" r="1"/><path d="M8 11v-4a4 4 0 0 1 8 0v4"/>',
    ),
  },
  {
    id: "carousel-horizontal",
    label: "Carousel",
    category: "Khác",
    keywords: ["carousel", "slide", "swipe"],
    svg: tablerSvg(
      '<rect x="4" y="6" width="6" height="12" rx="1"/><rect x="14" y="6" width="6" height="12" rx="1"/><path d="M10 12h4"/><path d="M7 12h.01"/><path d="M17 12h.01"/>',
    ),
  },
  {
    id: "layout-grid",
    label: "Lưới",
    category: "Khác",
    keywords: ["grid", "layout", "gallery"],
    svg: tablerSvg(
      '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
    ),
  },
  {
    id: "bell",
    label: "Thông báo",
    category: "Khác",
    keywords: ["bell", "notification", "alert"],
    svg: tablerSvg(
      '<path d="M10 5a2 2 0 1 1 4 0a7 7 0 0 1 4 6v3a2 2 0 0 0 2 2h-16a2 2 0 0 0 2-2v-3a7 7 0 0 1 4-6"/><path d="M9 17v1a3 3 0 0 0 6 0v-1"/>',
    ),
  },
];

export function filterIcons(
  query: string,
  category?: IconCategory,
): IconCatalogEntry[] {
  const q = query.trim().toLowerCase();
  return ICON_CATALOG.filter((entry) => {
    if (category && entry.category !== category) return false;
    if (!q) return true;
    return (
      entry.label.toLowerCase().includes(q) ||
      entry.id.toLowerCase().includes(q) ||
      entry.keywords.some((k) => k.toLowerCase().includes(q))
    );
  });
}
