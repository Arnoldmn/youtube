'use strict';
// Catalogue structure for IPHIX COMMUNICATIONS: sections, categories, brands and starter products.

const SECTIONS = [
  { key: 'accessories', name: 'Accessories', icon: '🎧' },
  { key: 'spares', name: 'Phone Spares', icon: '🔧' },
  { key: 'services', name: 'Repair Services', icon: '🛠️' },
];

// [slug, name, icon]
const CATEGORIES = {
  accessories: [
    ['phone-covers-cases', 'Phone covers & cases', '📱'],
    ['tempered-glass', 'Tempered glass / screen protectors', '🛡️'],
    ['uv-full-glue-glass', 'UV glass & full-glue glass', '💎'],
    ['privacy-glass', 'Privacy glass', '🕶️'],
    ['camera-lens-protectors', 'Camera lens protectors', '🔍'],
    ['chargers-adapters', 'Chargers & adapters', '🔌'],
    ['usb-cables', 'USB cables — Type-C, Lightning, Micro-USB', '🔗'],
    ['fast-chargers', 'Fast chargers', '⚡'],
    ['wireless-chargers', 'Wireless chargers', '🌀'],
    ['power-banks', 'Power banks', '🔋'],
    ['car-chargers', 'Car chargers', '🚗'],
    ['earphones-earbuds', 'Earphones & earbuds', '🎧'],
    ['bluetooth-speakers', 'Bluetooth speakers', '🔊'],
    ['phone-holders-stands', 'Phone holders & stands', '📐'],
    ['selfie-sticks', 'Selfie sticks', '🤳'],
    ['otg-adapters', 'OTG adapters', '🔄'],
    ['phone-cleaning-kits', 'Phone cleaning kits', '🧽'],
    ['smart-watches-bands', 'Smart watches & bands', '⌚'],
    ['memory-cards', 'Memory cards', '💾'],
    ['sim-card-accessories', 'SIM card accessories', '📶'],
  ],
  spares: [
    ['lcd-screens', 'LCD screens / display assemblies', '🖥️'],
    ['oled-amoled-screens', 'OLED & AMOLED screens', '✨'],
    ['touch-screens', 'Touch screens', '👆'],
    ['screen-frames', 'Screen frames', '🖼️'],
    ['batteries', 'Batteries', '🔋'],
    ['charging-ports', 'Charging ports / charging flexes', '🔌'],
    ['power-buttons', 'Power buttons', '🔘'],
    ['volume-buttons', 'Volume buttons', '🔉'],
    ['fingerprint-flexes', 'Fingerprint flexes', '🔏'],
    ['earpiece-speakers', 'Earpiece speakers', '👂'],
    ['loudspeakers-buzzers', 'Loudspeakers / buzzers', '📢'],
    ['microphones', 'Microphones', '🎙️'],
    ['camera-modules', 'Camera modules', '📸'],
    ['front-cameras', 'Front cameras', '🤳'],
    ['back-cameras', 'Back cameras', '📷'],
    ['camera-glass-lenses', 'Camera glass / lenses', '🔎'],
    ['vibration-motors', 'Vibration motors', '📳'],
    ['antenna-flexes', 'Antenna flexes', '📡'],
    ['sim-trays', 'SIM trays', '🗂️'],
    ['back-covers', 'Back covers / battery covers', '🔲'],
    ['middle-frames', 'Middle frames / chassis', '🧱'],
    ['motherboard-components', 'Motherboard components', '🧩'],
    ['flash-led-flexes', 'Flash / LED flexes', '💡'],
    ['proximity-light-sensors', 'Proximity / light sensors', '🌗'],
    ['face-id-parts', 'Face ID-related parts', '🙂'],
  ],
  services: [
    ['screen-replacement', 'Screen replacement', '🛠️'],
    ['battery-replacement', 'Battery replacement', '🔋'],
    ['charging-port-replacement', 'Charging-port replacement', '🔌'],
    ['back-glass-replacement', 'Back-glass replacement', '🔲'],
    ['camera-replacement', 'Camera replacement', '📷'],
    ['speaker-microphone-replacement', 'Speaker / microphone replacement', '🎙️'],
    ['phone-diagnostics', 'Phone diagnostics', '🩺'],
    ['software-services', 'Software services', '💻'],
    ['water-damage-diagnostics', 'Water-damage diagnostics', '💧'],
  ],
};

const PART_LABELS = {
  screen: 'Screens',
  battery: 'Batteries',
  'charging-port': 'Charging ports',
  'back-cover': 'Back covers',
  camera: 'Cameras',
  flex: 'Flex cables',
  housing: 'Housing',
};

const STD_PARTS = [['screen', 'Screens'], ['battery', 'Batteries'], ['charging-port', 'Charging ports'], ['back-cover', 'Back covers'], ['flex', 'Flexes']];

// [slug, name, parts, models, featured]
const BRANDS = [
  ['samsung', 'Samsung', [['screen', 'Screens'], ['battery', 'Batteries'], ['charging-port', 'Charging ports'], ['back-cover', 'Back covers'], ['camera', 'Cameras'], ['flex', 'Flex cables']],
    ['Galaxy A14', 'Galaxy A24', 'Galaxy A34', 'Galaxy A54', 'Galaxy S21', 'Galaxy S22 Ultra'], 1],
  ['iphone', 'iPhone', [['screen', 'Screens'], ['battery', 'Batteries'], ['charging-port', 'Charging ports'], ['back-cover', 'Back glass'], ['camera', 'Cameras'], ['flex', 'Flex cables'], ['housing', 'Housing']],
    ['iPhone X', 'iPhone XR', 'iPhone 11', 'iPhone 12', 'iPhone 13', 'iPhone 14 Pro'], 1],
  ['tecno', 'Tecno', STD_PARTS, ['Spark 10', 'Spark Go 2023', 'Camon 20', 'Pova 5'], 1],
  ['infinix', 'Infinix', STD_PARTS, ['Hot 30', 'Smart 7', 'Note 30', 'Zero 30'], 1],
  ['xiaomi-redmi', 'Xiaomi/Redmi', STD_PARTS, ['Redmi 12C', 'Redmi A2', 'Redmi Note 11', 'Redmi Note 12'], 1],
  ['oppo', 'Oppo', STD_PARTS, ['A17', 'A57', 'Reno 8'], 1],
  ['vivo', 'Vivo', STD_PARTS, ['Y16', 'Y22', 'Y35'], 1],
  ['realme', 'Realme', STD_PARTS, [], 0],
  ['nokia', 'Nokia', STD_PARTS, [], 0],
  ['huawei', 'Huawei', STD_PARTS, [], 0],
  ['honor', 'Honor', STD_PARTS, [], 0],
  ['motorola', 'Motorola', STD_PARTS, [], 0],
  ['oneplus', 'OnePlus', STD_PARTS, [], 0],
];

// Accessory starter stock: [name, price, brandSlug|null, model]
const ACCESSORIES = {
  'phone-covers-cases': [
    ['Shockproof Clear Case', 450, 'iphone', 'iPhone 13'],
    ['Silicone Soft Case', 350, 'samsung', 'Galaxy A14'],
    ['Leather Flip Wallet Case', 650, 'tecno', 'Spark 10'],
    ['Rugged Armor Case with Kickstand', 600, 'infinix', 'Hot 30'],
    ['MagSafe Frosted Case', 900, 'iphone', 'iPhone 14 Pro'],
  ],
  'tempered-glass': [
    ['9H Tempered Glass Screen Protector', 200, 'samsung', 'Galaxy A24'],
    ['9H Tempered Glass Screen Protector', 200, 'tecno', 'Camon 20'],
    ['Anti-Blue-Light Tempered Glass', 350, 'iphone', 'iPhone 12'],
  ],
  'uv-full-glue-glass': [
    ['UV Full-Glue Curved Glass Kit', 1200, 'samsung', 'Galaxy S22 Ultra'],
    ['Full-Glue 21D Edge-to-Edge Glass', 300, 'infinix', 'Note 30'],
  ],
  'privacy-glass': [
    ['Anti-Spy Privacy Glass', 600, 'iphone', 'iPhone 13'],
    ['Anti-Spy Privacy Glass', 550, 'samsung', 'Galaxy A54'],
  ],
  'camera-lens-protectors': [
    ['Metal Ring Camera Lens Protector', 300, 'iphone', 'iPhone 14 Pro'],
    ['Clear Camera Lens Glass (2 pack)', 200, 'samsung', 'Galaxy A34'],
  ],
  'chargers-adapters': [
    ['Original 25W USB-C Travel Adapter', 1500, 'samsung', ''],
    ['20W USB-C Power Adapter', 1800, 'iphone', ''],
    ['Dual-USB 2.4A Wall Charger', 450, null, ''],
  ],
  'usb-cables': [
    ['Braided Type-C to Type-C Cable 1m (60W)', 450, null, ''],
    ['Lightning to USB-C Cable 1m', 700, 'iphone', ''],
    ['Micro-USB Fast Charge Cable 1m', 250, null, ''],
    ['3-in-1 Multi Cable (Type-C, Lightning, Micro)', 600, null, ''],
  ],
  'fast-chargers': [
    ['Oraimo 33W Super-Fast Charger Kit', 1900, null, ''],
    ['Tecno 18W Flash Charger', 1200, 'tecno', ''],
    ['Infinix 45W Super Charge Kit', 2500, 'infinix', ''],
  ],
  'wireless-chargers': [
    ['15W Qi Wireless Charging Pad', 1500, null, ''],
    ['3-in-1 Wireless Stand (Phone, Watch, Earbuds)', 4200, null, ''],
  ],
  'power-banks': [
    ['10,000mAh Slim Power Bank', 1800, null, ''],
    ['20,000mAh 22.5W Fast-Charge Power Bank', 3200, null, ''],
    ['30,000mAh Power Bank with LED Display', 4500, null, ''],
  ],
  'car-chargers': [
    ['Dual-Port 38W Car Charger (USB-C + USB-A)', 900, null, ''],
    ['Car Charger with Coiled Type-C Cable', 750, null, ''],
  ],
  'earphones-earbuds': [
    ['Wireless Earbuds with Charging Case (BT 5.3)', 2200, null, ''],
    ['Oraimo FreePods Lite', 2900, null, ''],
    ['Wired Earphones with Mic (3.5mm)', 300, null, ''],
    ['Type-C Wired Earphones', 600, null, ''],
  ],
  'bluetooth-speakers': [
    ['Portable Waterproof Bluetooth Speaker 10W', 2500, null, ''],
    ['Mini Bluetooth Speaker with FM Radio', 1200, null, ''],
  ],
  'phone-holders-stands': [
    ['Magnetic Car Air-Vent Phone Holder', 650, null, ''],
    ['Adjustable Aluminium Desk Stand', 800, null, ''],
    ['Motorbike Handlebar Phone Mount', 1100, null, ''],
  ],
  'selfie-sticks': [
    ['Bluetooth Selfie Stick Tripod with Remote', 1300, null, ''],
    ['Ring Light Tripod Stand 10"', 2800, null, ''],
  ],
  'otg-adapters': [
    ['USB-A to Type-C OTG Adapter', 150, null, ''],
    ['USB-A to Micro-USB OTG Adapter', 100, null, ''],
  ],
  'phone-cleaning-kits': [
    ['Screen Cleaning Spray & Microfibre Kit', 350, null, ''],
    ['Port & Speaker Cleaning Brush Set', 250, null, ''],
  ],
  'smart-watches-bands': [
    ['Smart Watch with Call Function', 3500, null, ''],
    ['Fitness Band with Heart-Rate Monitor', 1800, null, ''],
    ['Silicone Watch Strap 22mm', 400, null, ''],
  ],
  'memory-cards': [
    ['32GB microSD Card Class 10', 650, null, ''],
    ['64GB microSD Card U3', 1000, null, ''],
    ['128GB microSD Card A2', 1800, null, ''],
  ],
  'sim-card-accessories': [
    ['SIM Card Adapter Set (Nano/Micro/Standard)', 100, null, ''],
    ['SIM Ejector Pins (10 pack)', 100, null, ''],
  ],
};

// Repair services: [name, labour price, description]
const SERVICES = {
  'screen-replacement': ['Screen Replacement (labour)', 800, 'Professional screen replacement fitted while you wait (most models within 1 hour). Price is for labour — choose a screen from Phone Spares or ask us for a quote.'],
  'battery-replacement': ['Battery Replacement (labour)', 500, 'Swap a weak or swollen battery. Includes calibration and a quick health check.'],
  'charging-port-replacement': ['Charging-Port Replacement (labour)', 500, 'Fix loose or non-charging ports. Charging flex or board priced separately.'],
  'back-glass-replacement': ['Back-Glass Replacement (labour)', 1000, 'Laser/heat removal of cracked back glass and fitting of new glass.'],
  'camera-replacement': ['Camera Replacement (labour)', 600, 'Front or back camera module replacement and testing.'],
  'speaker-microphone-replacement': ['Speaker / Microphone Replacement (labour)', 500, 'Fix low or no sound on calls, music and recordings.'],
  'phone-diagnostics': ['Full Phone Diagnostics', 300, 'Complete hardware and software check with a written report. Fee is waived if you repair with us.'],
  'software-services': ['Software Services — flashing, updates, FRP & data backup', 1000, 'Firmware flashing, OS updates, virus removal, data backup and transfer.'],
  'water-damage-diagnostics': ['Water-Damage Diagnostics & Cleaning', 1000, 'Ultrasonic cleaning, corrosion treatment and full diagnostics after water exposure.'],
};

// Extra spares for categories not covered by the brand matrix: [category, partName, brand, model, price]
const MISC_SPARES = [
  ['touch-screens', 'Touch Screen Digitizer', 'tecno', 'Spark Go 2023', 1200],
  ['touch-screens', 'Touch Screen Digitizer', 'infinix', 'Smart 7', 1200],
  ['screen-frames', 'Screen Frame / Bezel', 'samsung', 'Galaxy A14', 600],
  ['screen-frames', 'Screen Frame / Bezel', 'xiaomi-redmi', 'Redmi Note 12', 650],
  ['volume-buttons', 'Volume Button Flex', 'samsung', 'Galaxy A24', 450],
  ['volume-buttons', 'Volume Button Set', 'iphone', 'iPhone 12', 550],
  ['earpiece-speakers', 'Earpiece Speaker', 'iphone', 'iPhone 11', 700],
  ['earpiece-speakers', 'Earpiece Speaker', 'tecno', 'Camon 20', 400],
  ['loudspeakers-buzzers', 'Loudspeaker / Buzzer', 'samsung', 'Galaxy A54', 650],
  ['loudspeakers-buzzers', 'Loudspeaker / Buzzer', 'infinix', 'Hot 30', 400],
  ['microphones', 'Microphone', 'oppo', 'A57', 300],
  ['microphones', 'Microphone', 'vivo', 'Y22', 300],
  ['camera-modules', 'Complete Camera Module', 'xiaomi-redmi', 'Redmi Note 11', 2600],
  ['front-cameras', 'Front Camera', 'iphone', 'iPhone 13', 2500],
  ['front-cameras', 'Front Camera', 'samsung', 'Galaxy A34', 1500],
  ['camera-glass-lenses', 'Back Camera Glass Lens', 'iphone', 'iPhone 14 Pro', 600],
  ['camera-glass-lenses', 'Back Camera Glass Lens', 'samsung', 'Galaxy S21', 450],
  ['vibration-motors', 'Vibration Motor', 'iphone', 'iPhone XR', 650],
  ['vibration-motors', 'Vibration Motor', 'tecno', 'Spark 10', 300],
  ['antenna-flexes', 'Antenna Signal Flex', 'samsung', 'Galaxy A14', 400],
  ['antenna-flexes', 'Antenna Signal Flex', 'oppo', 'A17', 350],
  ['sim-trays', 'SIM Card Tray', 'iphone', 'iPhone 12', 350],
  ['sim-trays', 'SIM Card Tray', 'infinix', 'Note 30', 250],
  ['motherboard-components', 'Charging IC (Tristar/PMIC)', 'iphone', 'iPhone 11', 1200],
  ['motherboard-components', 'Power IC', 'samsung', 'Galaxy A24', 900],
  ['flash-led-flexes', 'Flash / LED Flex', 'tecno', 'Camon 20', 350],
  ['flash-led-flexes', 'Flash Light Flex', 'iphone', 'iPhone XR', 600],
  ['proximity-light-sensors', 'Proximity / Light Sensor Flex', 'iphone', 'iPhone 12', 900],
  ['proximity-light-sensors', 'Proximity Sensor Flex', 'samsung', 'Galaxy S21', 700],
  ['face-id-parts', 'Face ID Dot Projector Flex', 'iphone', 'iPhone X', 2500],
  ['face-id-parts', 'Face ID Flood Illuminator Flex', 'iphone', 'iPhone 12', 2200],
];

module.exports = { SECTIONS, CATEGORIES, PART_LABELS, BRANDS, ACCESSORIES, SERVICES, MISC_SPARES };
