
const mongoose = require('mongoose');
const Product = require('../models/Product');
require('dotenv').config();

const products = [
    // --- MEN'S SECTION (10 Items) ---
    {
        name: "Nike Air Max 270",
        brand: "Nike",
        price: 150,
        rating: 4.8,
        category: "Running",
        gender: "Men",
        images: {
            primary: "https://static.nike.com/a/images/t_PDP_1280_v1/f_auto,q_auto:eco/awj68x77u6o3j5b8q9w2/air-max-270-mens-shoes-KkLcGR.png",
            secondary: "https://static.nike.com/a/images/t_PDP_1280_v1/f_auto,q_auto:eco/b1f9f257-2e1d-4f05-89e4-c9c0r3e8f8c2/air-max-270-mens-shoes-KkLcGR.png"
        },
        description: "Nike's first lifestyle Air Max brings you style, comfort and big attitude in the Nike Air Max 270. The design draws inspiration from Air Max icons.",
        stock: 45,
        inStock: true
    },
    {
        name: "Adidas Ultraboost Light",
        brand: "Adidas",
        price: 190,
        rating: 4.9,
        category: "Running",
        gender: "Men",
        images: {
            primary: "https://assets.adidas.com/images/h_840,f_auto,q_auto,fl_lossy,c_fill,g_auto/09c5ea6df1bd4be6baaaac5e003e7047_9366/Ultraboost_Light_Shoes_White_HQ6351_01_standard.jpg",
            secondary: "https://assets.adidas.com/images/h_840,f_auto,q_auto,fl_lossy,c_fill,g_auto/f4039893d56b46188a3dac5e003e7a02_9366/Ultraboost_Light_Shoes_White_HQ6351_41_detail.jpg"
        },
        description: "Experience epic energy with the new Ultraboost Light, our lightest Ultraboost ever. The magic lies in the Light BOOST midsole.",
        stock: 30,
        inStock: true
    },
    {
        name: "Jordan 1 Retro High OG",
        brand: "Jordan",
        price: 180,
        rating: 5.0,
        category: "Basketball",
        gender: "Men",
        images: {
            primary: "https://static.nike.com/a/images/t_PDP_1280_v1/f_auto,q_auto:eco/6e348984-7a91-4e45-8f6a-44243628c688/air-jordan-1-retro-high-og-mens-shoes-JHpxkn.png",
            secondary: "https://static.nike.com/a/images/t_PDP_1280_v1/f_auto,q_auto:eco/8e9c4033-017e-468f-a7b3-82672d56a36f/air-jordan-1-retro-high-og-mens-shoes-JHpxkn.png"
        },
        description: "Familiar but always fresh, the iconic Air Jordan 1 is remastered for today's sneakerhead culture. This Retro High OG version goes all in with full-grain leather.",
        stock: 10,
        inStock: true
    },
    {
        name: "Nike Dunk Low Retro",
        brand: "Nike",
        price: 110,
        rating: 4.7,
        category: "Lifestyle",
        gender: "Men",
        images: {
            primary: "https://static.nike.com/a/images/t_PDP_1280_v1/f_auto,q_auto:eco/044033be-2940-4131-893f-561b17b203e0/dunk-low-retro-mens-shoes-87q0hf.png",
            secondary: "https://static.nike.com/a/images/t_PDP_1280_v1/f_auto,q_auto:eco/32777b7e-e5a5-4923-8120-7f28731383be/dunk-low-retro-mens-shoes-87q0hf.png"
        },
        description: "Created for the hardwood but taken to the streets, the '80s b-ball icon returns with perfectly sheened overlays and original university colors.",
        stock: 20,
        inStock: true
    },
    {
        name: "Puma Suede Classic XXI",
        brand: "Puma",
        price: 75,
        rating: 4.5,
        category: "Casual",
        gender: "Men",
        images: {
            primary: "https://images.puma.com/image/upload/f_auto,q_auto,b_rgb:fafafa,w_2000,h_2000/global/352634/03/sv01/fnd/IND/fmt/png/Suede-Classic-XXI-Sneakers",
            secondary: "https://images.puma.com/image/upload/f_auto,q_auto,b_rgb:fafafa,w_2000,h_2000/global/352634/03/sv03/fnd/IND/fmt/png/Suede-Classic-XXI-Sneakers"
        },
        description: "The Suede hit the scene in 1968 and has been changing the game ever since. It's been worn by the icons of every generation, and it's stayed classic through it all.",
        stock: 50,
        inStock: true
    },
    {
        name: "New Balance 9060",
        brand: "New Balance",
        price: 150,
        rating: 4.8,
        category: "Lifestyle",
        gender: "Men",
        images: {
            primary: "https://nb.scene7.com/is/image/NB/u9060eea_nb_02_i?$pdpflexf2$&wid=440&hei=440",
            secondary: "https://nb.scene7.com/is/image/NB/u9060eea_nb_04_i?$pdpflexf2$&wid=440&hei=440"
        },
        description: "The 9060 reinterprets familiar elements derived from the classic 99X series with a warped sensibility inspired by the futuristic, visible tech aesthetic of the Y2K era.",
        stock: 18,
        inStock: true
    },
    {
        name: "Asics Gel-Kayano 14",
        brand: "Asics",
        price: 160,
        rating: 4.6,
        category: "Running",
        gender: "Men",
        images: {
            primary: "https://images.asics.com/is/image/asics/1201A019_107_SR_RT_GLB?$zoom$",
            secondary: "https://images.asics.com/is/image/asics/1201A019_107_SB_FR_GLB?$zoom$"
        },
        description: "Reimagining the franchise's retro running shape, the GEL-KAYANO 14 running shoe resurfaces with its late 2000s aesthetic.",
        stock: 22,
        inStock: true
    },
    {
        name: "Reebok Club C 85 Vintage",
        brand: "Reebok",
        price: 90,
        rating: 4.7,
        category: "Casual",
        gender: "Men",
        images: {
            primary: "https://images.reebok.eu/reebok-club-c-85-vintage_14721471_44704386_2048.jpg?c=1",
            secondary: "https://images.reebok.eu/reebok-club-c-85-vintage_14721455_44704391_2048.jpg?c=1"
        },
        description: "Join the club with a new rendition of our classic Club C kick. The soft leather upper doles out superior support and quality.",
        stock: 40,
        inStock: true
    },
    {
        name: "Vans Old Skool",
        brand: "Vans",
        price: 70,
        rating: 4.8,
        category: "Skate",
        gender: "Men",
        images: {
            primary: "https://images.vans.com/is/image/Vans/VN000D3HY28-HERO?$583x583$",
            secondary: "https://images.vans.com/is/image/Vans/VN000D3HY28-ALT1?$583x583$"
        },
        description: "The Old Skool was our first footwear design to showcase the famous Vans Sidestripe—although back then, it was just a simple doodle drawn by founder Paul Van Doren.",
        stock: 65,
        inStock: true
    },
    {
        name: "Timberland 6-Inch Premium Boot",
        brand: "Timberland",
        price: 198,
        rating: 4.9,
        category: "Boots",
        gender: "Men",
        images: {
            primary: "https://images.timberland.com/is/image/timberland/10061713-HERO?$583x583$",
            secondary: "https://images.timberland.com/is/image/timberland/10061713-ALT1?$583x583$"
        },
        description: "Inspired by our original 6-Inch Waterproof Boot, this all-season style gives you tireless waterproof performance and instantly recognizable work-boot styling.",
        stock: 15,
        inStock: true
    },

    // --- WOMEN'S SECTION (10 Items) ---
    {
        name: "Puma RS-X 3D",
        brand: "Puma",
        price: 110,
        rating: 4.6,
        category: "Lifestyle",
        gender: "Women",
        images: {
            primary: "https://images.puma.com/image/upload/f_auto,q_auto,b_rgb:fafafa,w_2000,h_2000/global/390025/03/sv01/fnd/IND/fmt/png/RS-X-3D-Unisex-Sneakers",
            secondary: "https://images.puma.com/image/upload/f_auto,q_auto,b_rgb:fafafa,w_2000,h_2000/global/390025/03/sv02/fnd/IND/fmt/png/RS-X-3D-Unisex-Sneakers"
        },
        description: "The RS-X is back. The future-retro silhouette of this sneaker returns with a progressive aesthetic and angular details.",
        stock: 25,
        inStock: true
    },
    {
        name: "New Balance 550",
        brand: "New Balance",
        price: 120,
        rating: 4.7,
        category: "Lifestyle",
        gender: "Women",
        images: {
            primary: "https://nb.scene7.com/is/image/NB/bb550wt1_nb_02_i?$pdpflexf2$&wid=440&hei=440",
            secondary: "https://nb.scene7.com/is/image/NB/bb550wt1_nb_04_i?$pdpflexf2$&wid=440&hei=440"
        },
        description: "The 550s debuted in 1989 and made their mark on basketball courts from coast to coast. After a hiatus, they returned in late 2020 and have quickly become a global fashion favorite.",
        stock: 15,
        inStock: true
    },
    {
        name: "Nike Air Force 1 '07",
        brand: "Nike",
        price: 115,
        rating: 4.8,
        category: "Casual",
        gender: "Women",
        images: {
            primary: "https://static.nike.com/a/images/t_PDP_1280_v1/f_auto,q_auto:eco/b7d9211c-26e7-431a-ac24-b0540fb3c00f/air-force-1-07-womens-shoes-b19lqD.png",
            secondary: "https://static.nike.com/a/images/t_PDP_1280_v1/f_auto,q_auto:eco/4531de21-1b6c-4b61-9f2d-741fab9a27c0/air-force-1-07-womens-shoes-b19lqD.png"
        },
        description: "The radiance lives on in the Nike Air Force 1 '07, the b-ball icon that puts a fresh spin on what you know best: crisp leather, bold colors and the perfect amount of flash.",
        stock: 40,
        inStock: true
    },
    {
        name: "Adidas NMD_R1",
        brand: "Adidas",
        price: 130,
        rating: 4.6,
        category: "Running",
        gender: "Women",
        images: {
            primary: "https://assets.adidas.com/images/h_840,f_auto,q_auto,fl_lossy,c_fill,g_auto/202d0800cb81427a9df7af5e00fb3828_9366/NMD_R1_Shoes_White_HQ4276_01_standard.jpg",
            secondary: "https://assets.adidas.com/images/h_840,f_auto,q_auto,fl_lossy,c_fill,g_auto/700a89d7b93847e3a9f0af5e00fb4011_9366/NMD_R1_Shoes_White_HQ4276_41_detail.jpg"
        },
        description: "Pack your bag, lace up and get going. City adventures beckon in these NMD_R1 shoes. An update to an acclaimed '80s runner.",
        stock: 35,
        inStock: true
    },
    {
        name: "Converse Run Star Hike",
        brand: "Converse",
        price: 110,
        rating: 4.9,
        category: "Lifestyle",
        gender: "Women",
        images: {
            primary: "https://www.converse.in/media/catalog/product/1/6/166800c_a_107x1.jpg?quality=80&bg-color=255,255,255&fit=bounds&height=940&width=940&canvas=940:940",
            secondary: "https://www.converse.in/media/catalog/product/1/6/166800c_c_107x1.jpg?quality=80&bg-color=255,255,255&fit=bounds&height=940&width=940&canvas=940:940"
        },
        description: "A chunky platform and jagged rubber sole put an unexpected twist on your everyday Chucks. Details like a canvas build, rubber toe cap and Chuck Taylor ankle patch stay true to the original.",
        stock: 22,
        inStock: true
    },
    {
        name: "Hoka Bondi 8",
        brand: "Hoka",
        price: 165,
        rating: 4.8,
        category: "Running",
        gender: "Women",
        images: {
            primary: "https://www.hoka.com/dw/image/v2/BDWW_PRD/on/demandware.static/-/Sites-deckers-hoka-master/default/dw76949b25/images/en_US/1127952-BBLC_1.jpg?sw=1900&sh=1900&sm=fit",
            secondary: "https://www.hoka.com/dw/image/v2/BDWW_PRD/on/demandware.static/-/Sites-deckers-hoka-master/default/dw18579d4b/images/en_US/1127952-BBLC_2.jpg?sw=1900&sh=1900&sm=fit"
        },
        description: "One of the hardest working shoes in the HOKA lineup, the Bondi takes a bold step forward this season reworked with softer, lighter foams and a brand-new extended heel geometry.",
        stock: 12,
        inStock: true
    },
    {
        name: "Dr. Martens Jadon Boot",
        brand: "Dr. Martens",
        price: 200,
        rating: 4.8,
        category: "Boots",
        gender: "Women",
        images: {
            primary: "https://i1.adis.ws/i/drmartens/15265001.80.jpg?$medium$",
            secondary: "https://i1.adis.ws/i/drmartens/15265001.82.jpg?$medium$"
        },
        description: "A loud evolution of our 8-eye boot, the Jadon retains all our original details—grooved edges, yellow stitching and a heel-loop—and adds a chunky, empowering platform sole.",
        stock: 20,
        inStock: true
    },
    {
        name: "Crocs Classic Platform Clog",
        brand: "Crocs",
        price: 60,
        rating: 4.5,
        category: "Clogs",
        gender: "Women",
        images: {
            primary: "https://media.crocs.com/images/t_pdph/f_auto%2Cq_auto/products/206750_100_ALT100/crocs",
            secondary: "https://media.crocs.com/images/t_pdph/f_auto%2Cq_auto/products/206750_100_ALT110/crocs"
        },
        description: "The Classic Clog, reimagined with an extra dose of height, attitude, and style. Introducing the Crocs Classic Platform, featuring a heightened, contoured outsole.",
        stock: 50,
        inStock: true
    },
    {
        name: "Birkenstock Arizona Soft Footbed",
        brand: "Birkenstock",
        price: 140,
        rating: 4.9,
        category: "Sandals",
        gender: "Women",
        images: {
            primary: "https://www.birkenstock.com/on/demandware.static/-/Sites-master-catalog/default/dw73380c85/550231/550231_1.jpg",
            secondary: "https://www.birkenstock.com/on/demandware.static/-/Sites-master-catalog/default/dw73380c85/550231/550231_3.jpg"
        },
        description: "The often imitated, never duplicated, category-defining, two-strap wonder from Birkenstock. A comfort legend and a fashion staple.",
        stock: 30,
        inStock: true
    },
    {
        name: "UGG Classic Mini II",
        brand: "UGG",
        price: 160,
        rating: 4.8,
        category: "Boots",
        gender: "Women",
        images: {
            primary: "https://images.ugg.com/is/image/Deckers/1016222-CHE_1",
            secondary: "https://images.ugg.com/is/image/Deckers/1016222-CHE_2"
        },
        description: "Our Classic Boot was originally worn by surfers to keep warm after early-morning sessions, and has since become iconic for its soft sheepskin and enduring design.",
        stock: 25,
        inStock: true
    }
];

const seedProducts = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Clear existing products
        await Product.deleteMany({});
        console.log('Cleared existing products');

        // Insert new products
        await Product.insertMany(products);
        console.log(`Inserted ${products.length} sample products`);

        mongoose.disconnect();
    } catch (error) {
        console.error('Error seeding products:', error);
        process.exit(1);
    }
};

seedProducts();
